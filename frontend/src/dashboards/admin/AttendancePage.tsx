import { useState, useMemo, useEffect, useRef } from "react";
import Select from "react-select";
import { getAttendanceRecords, approveAttendance, rejectAttendance } from "../../api";
import { supabase } from "../../supabaseClient";

type AttendanceRecord = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  break_time?: number | null;
  total_hours: string | null;
  task_description: string | null;
  status: "present" | "absent" | "late" | "half-day";
  is_approved: boolean;
  rejection_reason?: string | null;
};

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // Format: YYYY-MM
  );
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [activeTab, setActiveTab] = useState<"approved" | "not-approved">("not-approved");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRecord, setRejectingRecord] = useState<AttendanceRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskRecord, setSelectedTaskRecord] = useState<AttendanceRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRejectionRecord, setSelectedRejectionRecord] = useState<AttendanceRecord | null>(null);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleDateSelect = (monthIndex: number) => {
    const dateStr = `${pickerMonth.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}`;
    setSelectedMonth(dateStr);
    setShowMonthPicker(false);
    setCurrentPage(1);
  };

  // Add outside click handler for month picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setShowMonthPicker(false);
      }
    };

    if (showMonthPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMonthPicker]);

  // Fetch attendance records from API for the entire month
  useEffect(() => {
    let isMounted = true;
    
    const fetchAttendance = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Get all records for the selected month
        const data = await getAttendanceRecords(selectedEmployee || undefined);
        clearTimeout(timeoutId);
        
        if (!isMounted) return;
        
        // Filter by selected month
        const filtered = data.filter((record: AttendanceRecord) => {
          const recordMonth = record.date.slice(0, 7); // Extract YYYY-MM
          return recordMonth === selectedMonth;
        });
        
        // Filter by status if needed
        let finalFiltered = filtered;
        if (filterStatus !== "all") {
          finalFiltered = filtered.filter((record: AttendanceRecord) => record.status === filterStatus);
        }
        
        if (isMounted) {
          setAttendanceRecords(finalFiltered || []);
        }
      } catch (err) {
        console.error("Error fetching attendance:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch attendance records");
          setAttendanceRecords([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAttendance();
    
    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedEmployee, filterStatus]);

  // Fetch employees list
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Since we don't have a backend endpoint for employees, we fetch from Supabase
        // In production, this should also go through backend API
        const { supabase } = await import("../../supabaseClient");
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, role")
          .in('role', ['Employee', 'Intern'])
          .order("first_name");

        if (!error && data) {
          const formatted = data.map((emp) => ({
            id: emp.id,
            name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
            role: emp.role,
          }));
          setEmployees(formatted);
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };

    fetchEmployees();
  }, []);

  // Helper function to refresh attendance data
  const handleRefreshAttendance = async () => {
    try {
      const data = await getAttendanceRecords(selectedEmployee || undefined);
      const filtered = data.filter((record: AttendanceRecord) => {
        const recordMonth = record.date.slice(0, 7);
        return recordMonth === selectedMonth;
      });

      let finalFiltered = filtered;
      if (filterStatus !== "all") {
        finalFiltered = filtered.filter((record: AttendanceRecord) => record.status === filterStatus);
      }

      setAttendanceRecords(finalFiltered || []);
    } catch (err) {
      console.error("Error refreshing attendance:", err);
    }
  };

  // Real-time subscription for attendance changes
  useEffect(() => {
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance'
        },
        (_payload) => {
          // Refresh data when changes occur
          handleRefreshAttendance();
        }
      )
      .subscribe((_status) => {
        // Real-time subscription active
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMonth, selectedEmployee, filterStatus]);



  // Calculate statistics
  const statistics = useMemo(() => {
    const presentCount = attendanceRecords.filter(
      (r) => r.status === "present" || r.status === "late"
    ).length;
    const absentCount = attendanceRecords.filter(
      (r) => r.status === "absent"
    ).length;

    return {
      total: attendanceRecords.length,
      present: presentCount,
      absent: absentCount,
      approved: attendanceRecords.filter((r) => r.is_approved).length,
      notApproved: attendanceRecords.filter((r) => !r.is_approved).length,
    };
  }, [attendanceRecords]);

  const formatTime = (time: string | null) => {
    if (!time) return "—";
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      present: "bg-green-100 text-green-700",
      absent: "bg-red-100 text-red-700",
      late: "bg-yellow-100 text-yellow-700",
      "half-day": "bg-blue-100 text-blue-700",
    };
    return statusClasses[status] || "bg-gray-100 text-gray-700";
  };

  // Approve all attendance
  const handleApproveAll = async () => {
    const recordsToApprove = filteredRecords.filter((r) => !r.rejection_reason);
    if (recordsToApprove.length === 0) {
      return;
    }

    if (!window.confirm(`Approve all ${recordsToApprove.length} attendance records?`)) {
      return;
    }

    setActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const record of recordsToApprove) {
      try {
        await approveAttendance(record.id);
        successCount++;
      } catch (err) {
        console.error(`Failed to approve ${record.id}:`, err);
        failCount++;
      }
    }

    setAttendanceRecords(
      attendanceRecords.map((r) => {
        if (recordsToApprove.find((ra) => ra.id === r.id)) {
          return { ...r, is_approved: true, rejection_reason: null };
        }
        return r;
      })
    );

    setActionLoading(false);
  };

  // Approve attendance
  const handleApprove = async (record: AttendanceRecord) => {
    if (!record.id) {
      console.warn("No record ID provided");
      return;
    }
    
    setActionLoading(true);
    try {
      console.log("Approving record:", record.id);
      const result = await approveAttendance(record.id);

      console.log("Approval successful, updated data:", result);

      // Update local state
      setAttendanceRecords(
        attendanceRecords.map((r) =>
          r.id === record.id ? { ...r, is_approved: true, rejection_reason: null } : r
        )
      );
    } catch (err) {
      console.error("Error approving attendance:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject attendance
  const handleRejectSubmit = async () => {
    if (!rejectingRecord || !rejectionReason.trim()) {
      return;
    }

    setActionLoading(true);
    try {
      console.log("Rejecting record:", rejectingRecord.id, "Reason:", rejectionReason);
      const result = await rejectAttendance(rejectingRecord.id, rejectionReason);

      console.log("Rejection successful, updated data:", result);

      // Update local state
      setAttendanceRecords(
        attendanceRecords.map((r) =>
          r.id === rejectingRecord.id
            ? { ...r, is_approved: false, rejection_reason: rejectionReason }
            : r
        )
      );

      setShowRejectModal(false);
      setRejectingRecord(null);
      setRejectionReason("");
    } catch (err) {
      console.error("Error rejecting attendance:", err);

    } finally {
      setActionLoading(false);
    }
  };

  // Filter records based on active tab
  const filteredRecords = useMemo(() => {
    if (activeTab === "approved") {
      return attendanceRecords.filter((r) => r.is_approved);
    } else {
      return attendanceRecords.filter((r) => !r.is_approved);
    }
  }, [attendanceRecords, activeTab]);

  return (
    <div className="p-2 sm:p-4 md:p-6 lg:p-8 w-full">
      {/* Header */}
      <div className="mb-6 md:mb-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-blue-600 to-indigo-600"></div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Attendance Management
            </h1>
          </div>
          <p className="text-gray-600 ml-5 mt-2">Manage and approve employee attendance records</p>
        </div>
        <button
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg text-white rounded-lg text-sm font-bold transition-all transform hover:scale-105"
          title="Toggle filters"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 9.414V17a1 1 0 01-1.447.894l-4-2A1 1 0 017 15v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
          Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilterPanel && (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-bold text-gray-700">Filters</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative" ref={monthPickerRef}>
                <label className="text-xs sm:text-sm font-semibold text-gray-600 block mb-2">Month</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setPickerMonth(selectedMonth ? new Date(selectedMonth + "-01") : new Date());
                      setShowMonthPicker(!showMonthPicker);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left hover:border-blue-500 transition"
                  >
                    {selectedMonth ? monthNames[new Date(selectedMonth + "-01").getMonth()] + " " + selectedMonth.split("-")[0] : "Select month"}
                  </button>
                  {showMonthPicker && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 w-80" onClick={(e) => e.stopPropagation()}>
                      {/* Year Selection */}
                      <div className="flex items-center justify-between mb-6">
                        <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear() - 1, 0))} className="px-3 py-1 hover:bg-gray-100 rounded text-lg font-bold">‹</button>
                        <div className="text-lg font-bold text-center flex-1">{pickerMonth.getFullYear()}</div>
                        <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear() + 1, 0))} className="px-3 py-1 hover:bg-gray-100 rounded text-lg font-bold">›</button>
                      </div>
                      
                      {/* Month Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {monthNames.map((month, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleDateSelect(idx); }}
                            className={`py-3 px-2 rounded text-sm font-semibold transition ${selectedMonth === `${pickerMonth.getFullYear()}-${String(idx + 1).padStart(2, '0')}` ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                          >
                            {month.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-600 block mb-2">Employee</label>
                <Select
                  options={[
                    { value: "", label: "All Employees" },
                    ...employees.map((emp) => ({ value: emp.id, label: emp.name }))
                  ]}
                  value={
                    selectedEmployee === null || selectedEmployee === ""
                      ? { value: "", label: "All Employees" }
                      : employees.find((emp) => emp.id === selectedEmployee)
                      ? { value: selectedEmployee, label: employees.find((emp) => emp.id === selectedEmployee)?.name || "" }
                      : { value: "", label: "All Employees" }
                  }
                  onChange={(selectedOption) => {
                    if (selectedOption) {
                      setSelectedEmployee(selectedOption.value === "" ? null : selectedOption.value);
                      setCurrentPage(1);
                    }
                  }}
                  className="w-full text-xs sm:text-sm"
                  menuPlacement="bottom"
                  menuShouldScrollIntoView={false}
                  isSearchable={true}
                  styles={{
                    control: (base) => ({ 
                      ...base, 
                      minHeight: "40px", 
                      height: "40px",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem"
                    }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 })
                  }}
                  menuPortalTarget={document.body}
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-600 block mb-2">Status</label>
                <Select
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "present", label: "Present" },
                    { value: "absent", label: "Absent" },
                    { value: "late", label: "Late" },
                    { value: "half-day", label: "Half Day" },
                  ] as Array<{ value: string; label: string }>}
                  value={
                    filterStatus === "all" || filterStatus === ""
                      ? { value: "all", label: "All Status" }
                  : { value: filterStatus, label: filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1) }
              }
              onChange={(selectedOption) => {
                if (selectedOption) {
                  setFilterStatus(selectedOption.value);
                  setCurrentPage(1);
                }
              }}
              className="w-full text-xs sm:text-sm"
              menuPlacement="bottom"
              menuShouldScrollIntoView={false}
              isSearchable={false}
              styles={{
                control: (base) => ({ 
                  ...base, 
                  minHeight: "40px", 
                  height: "40px",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem"
                }),
                menuPortal: (base) => ({ ...base, zIndex: 9999 })
              }}
              menuPortalTarget={document.body}
            />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 7);
                    setSelectedMonth(today);
                    setSelectedEmployee(null);
                    setFilterStatus("all");
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-semibold transition"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-blue-600 font-semibold group-hover:text-blue-700">Total Records</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600 mt-2">{statistics.total}</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition flex-shrink-0">
                <span className="text-lg sm:text-xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-green-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-green-600 font-semibold group-hover:text-green-700">Approved</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600 mt-2">{statistics.approved}</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition flex-shrink-0">
                <span className="text-lg sm:text-xl">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-yellow-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-yellow-600 font-semibold group-hover:text-yellow-700">Not Approved</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-600 mt-2">{statistics.notApproved}</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-yellow-100 flex items-center justify-center group-hover:bg-yellow-200 transition flex-shrink-0">
                <span className="text-lg sm:text-xl">⏳</span>
              </div>
            </div>
          </div>
        </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <button
            onClick={() => {
              setActiveTab("not-approved");
              setCurrentPage(1);
            }}
            className={`flex-1 px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm md:text-base font-semibold transition ${
              activeTab === "not-approved"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-100/50"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Not Approved ({statistics.notApproved})
          </button>
          <button
            onClick={() => {
              setActiveTab("approved");
              setCurrentPage(1);
            }}
            className={`flex-1 px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm md:text-base font-semibold transition ${
              activeTab === "approved"
                ? "text-green-600 border-b-2 border-green-600 bg-green-100/50"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Approved ({statistics.approved})
          </button>
        </div>

        <div className="p-3 sm:p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 bg-gray-50">
          <p className="text-xs sm:text-sm text-gray-600 font-semibold">
            Showing {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}
          </p>
          {activeTab === "not-approved" && filteredRecords.length > 0 && (
            <button
              onClick={handleApproveAll}
              disabled={actionLoading || filteredRecords.filter((r) => !r.rejection_reason).length === 0}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg text-white rounded-lg text-xs sm:text-sm font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              ✓ Approve All
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-spin" style={{WebkitMaskImage: 'conic-gradient(transparent 0deg 270deg, black 270deg)'}}></div>
              </div>
            </div>
            <p className="text-gray-500 font-semibold">Loading attendance records...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <p className="text-gray-700 font-semibold mb-2">Error Loading Records</p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
              <p className="text-gray-600 text-xs sm:text-sm font-semibold mb-2">Troubleshooting:</p>
              <ul className="text-gray-600 text-xs space-y-1">
                <li>✓ Backend running on port 4000</li>
                <li>✓ API: {import.meta.env.VITE_API_URL}</li>
                <li>✓ Click Reset Filters</li>
              </ul>
            </div>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="w-full">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                    <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-bold text-gray-700">
                      Employee
                    </th>
                    <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-bold text-gray-700">
                      Date
                    </th>
                    <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-bold text-gray-700">
                      Check-In
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Check-Out
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Break Time
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Total Hours
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    {activeTab === "not-approved" && (
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);
                    return paginatedRecords.map((record, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition text-sm">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div>
                          <p className="font-semibold">{record.employee_name}</p>
                          <p className="text-xs text-gray-500">{record.employee_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(record.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {formatTime(record.check_in_time)}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {formatTime(record.check_out_time)}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {record.break_time ? `${record.break_time} min` : "—"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {record.total_hours || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs">
                        <button
                          onClick={() => {
                            setSelectedTaskRecord(record);
                            setShowTaskModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left truncate max-w-xs"
                          title="Click to view full task"
                        >
                          {record.task_description || "—"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 items-start">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(
                              record.status
                            )}`}
                          >
                            {record.status}
                          </span>
                          {record.rejection_reason && (
                            <button
                              onClick={() => {
                                setSelectedRejectionRecord(record);
                                setShowRejectionModal(true);
                              }}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition"
                              title="View rejection reason"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                      {activeTab === "not-approved" && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleApprove(record)}
                              disabled={actionLoading || !!record.rejection_reason}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              title={record.rejection_reason ? "Waiting for employee to resubmit" : "Approve"}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setRejectingRecord(record);
                                setShowRejectModal(true);
                              }}
                              disabled={actionLoading || !!record.rejection_reason}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              title={record.rejection_reason ? "Waiting for employee to resubmit" : "Reject"}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2 p-3">
              {(() => {
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);
                return paginatedRecords.map((record, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    {/* Header: Employee name and date */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{record.employee_name}</p>
                        <p className="text-xs text-gray-500">{record.employee_email}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ml-2 ${getStatusBadge(
                          record.status
                        )}`}
                      >
                        {record.status}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="mb-2 pb-2 border-b border-gray-100">
                      <p className="text-xs text-gray-600">
                        <strong>Date:</strong> {new Date(record.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Timing Info Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-2 pb-2 border-b border-gray-100 text-xs">
                      <div>
                        <p className="text-gray-600 text-xs">Check-In</p>
                        <p className="font-semibold text-gray-900 text-sm">{formatTime(record.check_in_time)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs">Check-Out</p>
                        <p className="font-semibold text-gray-900 text-sm">{formatTime(record.check_out_time)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs">Break Time</p>
                        <p className="font-semibold text-gray-900 text-sm">{record.break_time ? `${record.break_time} min` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs">Total Hours</p>
                        <p className="font-semibold text-gray-900 text-sm">{record.total_hours || "—"}</p>
                      </div>
                    </div>

                    {/* Task Description */}
                    {record.task_description && (
                      <div className="mb-2 pb-2 border-b border-gray-100">
                        <p className="text-xs text-gray-600 mb-1">Task</p>
                        <button
                          onClick={() => {
                            setSelectedTaskRecord(record);
                            setShowTaskModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs line-clamp-2 text-left hover:underline"
                        >
                          {record.task_description}
                        </button>
                      </div>
                    )}

                    {/* Rejection Info */}
                    {record.rejection_reason && (
                      <div className="mb-2 pb-2 border-b border-gray-100">
                        <button
                          onClick={() => {
                            setSelectedRejectionRecord(record);
                            setShowRejectionModal(true);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-red-600 hover:text-red-800 hover:bg-red-100 transition text-xs font-semibold"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          View Rejection Reason
                        </button>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {activeTab === "not-approved" && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleApprove(record)}
                          disabled={actionLoading || !!record.rejection_reason}
                          className="p-2 text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-green-50 rounded"
                          title={record.rejection_reason ? "Waiting for employee to resubmit" : "Approve"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setRejectingRecord(record);
                            setShowRejectModal(true);
                          }}
                          disabled={actionLoading || !!record.rejection_reason}
                          className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-red-50 rounded"
                          title={record.rejection_reason ? "Waiting for employee to resubmit" : "Reject"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">
              No {activeTab === "approved" ? "approved" : "not approved"} attendance records found.
            </p>
          </div>
        )}

        {/* Pagination and Rows Per Page */}
        {filteredRecords.length > 0 && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 md:p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-xs md:text-sm">
              <label className="font-medium text-gray-700 whitespace-nowrap">Rows per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="text-xs md:text-sm text-gray-600 whitespace-nowrap">
              Page {currentPage} of {Math.ceil(filteredRecords.length / itemsPerPage)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 md:p-2 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                title="Previous page"
              >
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(filteredRecords.length / itemsPerPage), currentPage + 1))}
                disabled={currentPage === Math.ceil(filteredRecords.length / itemsPerPage)}
                className="p-1.5 md:p-2 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                title="Next page"
              >
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task Description Modal */}
      {showTaskModal && selectedTaskRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => { setShowTaskModal(false); setSelectedTaskRecord(null); }}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Description</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Employee:</strong> {selectedTaskRecord.employee_name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Date:</strong> {new Date(selectedTaskRecord.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg mb-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {selectedTaskRecord.task_description || "No task description provided"}
              </p>
            </div>
            <button
              onClick={() => {
                setShowTaskModal(false);
                setSelectedTaskRecord(null);
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Attendance</h3>
            <p className="text-sm text-gray-600 mb-4">
              Employee: <strong>{rejectingRecord?.employee_name}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Date: <strong>{rejectingRecord?.date}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejecting this attendance record"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingRecord(null);
                  setRejectionReason("");
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                {actionLoading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectionModal && selectedRejectionRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => { setShowRejectionModal(false); setSelectedRejectionRecord(null); }}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Rejection Reason
            </h3>
            <div className="text-sm text-gray-600 mb-4">
              <p><strong>Employee:</strong> {selectedRejectionRecord.employee_name}</p>
              <p><strong>Date:</strong> {new Date(selectedRejectionRecord.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
            </div>
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4 overflow-y-auto flex-1">
              <p className="text-sm text-red-800 whitespace-pre-wrap">
                {selectedRejectionRecord.rejection_reason}
              </p>
            </div>
            <button
              onClick={() => {
                setShowRejectionModal(false);
                setSelectedRejectionRecord(null);
              }}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
