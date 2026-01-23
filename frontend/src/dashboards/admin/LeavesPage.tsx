import { useState, useEffect, useMemo, useRef } from "react";
import Select from "react-select";
import { supabase } from "../../supabaseClient";
import { getAllLeaves, approveLeave, rejectLeave } from "../../api";

type LeaveRecord = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export default function LeavesPage() {
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingLeave, setRejectingLeave] = useState<LeaveRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRejectionRecord, setSelectedRejectionRecord] = useState<LeaveRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const startDatePickerRef = useRef<HTMLDivElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Add outside click handler for date pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startDatePickerRef.current && !startDatePickerRef.current.contains(event.target as Node)) {
        setShowStartDatePicker(false);
      }
      if (endDatePickerRef.current && !endDatePickerRef.current.contains(event.target as Node)) {
        setShowEndDatePicker(false);
      }
    };

    if (showStartDatePicker || showEndDatePicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStartDatePicker, showEndDatePicker]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role")
        .in('role', ['Employee', 'Intern'])
        .order("first_name");

      if (!error && data) {
        const formatted = data.map((emp) => ({
          id: emp.id,
          name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
        }));
        setEmployees(formatted);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const data = await getAllLeaves();
      setLeaveRecords(data || []);
    } catch (err) {
      console.error("Error fetching leaves:", err);
      setLeaveRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all leaves and employees on mount
  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, []);

  // Real-time subscription for leave changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-leaves-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaves'
        },
        (_payload) => {
          // Refresh leaves when changes occur
          fetchLeaves();
        }
      )
      .subscribe((_status) => {
        // Real-time subscription active
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (leave: LeaveRecord) => {
    if (!leave.id) return;

    setActionLoading(true);
    try {
      await approveLeave(leave.id);
      // Update local state
      setLeaveRecords(
        leaveRecords.map((l) =>
          l.id === leave.id ? { ...l, status: "approved", rejection_reason: null } : l
        )
      );
    } catch (err) {
      console.error("Error approving leave:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingLeave || !rejectionReason.trim()) {
      return;
    }

    setActionLoading(true);
    try {
      await rejectLeave(rejectingLeave.id, rejectionReason);
      // Update local state
      setLeaveRecords(
        leaveRecords.map((l) =>
          l.id === rejectingLeave.id
            ? { ...l, status: "rejected", rejection_reason: rejectionReason }
            : l
        )
      );
      setShowRejectModal(false);
      setRejectingLeave(null);
      setRejectionReason("");
    } catch (err) {
      console.error("Error rejecting leave:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
            ✓ Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
            ✗ Rejected
          </span>
        );
      case "pending":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
            ⏳ Pending
          </span>
        );
      default:
        return null;
    }
  };

  // Filter records based on status, search, employee, and dates
  const filteredRecords = useMemo(() => {
    let records = leaveRecords;

    // Filter by status
    if (filterStatus !== "all") {
      records = records.filter((l) => l.status === filterStatus);
    }

    // Filter by search term (employee name or email)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      records = records.filter(
        (l) =>
          l.employee_name.toLowerCase().includes(term) ||
          l.employee_email.toLowerCase().includes(term)
      );
    }

    // Filter by selected employee
    if (selectedEmployee) {
      records = records.filter((l) => l.employee_id === selectedEmployee);
    }

    // Filter by start date range
    if (startDateFilter) {
      records = records.filter((l) => l.start_date >= startDateFilter);
    }

    // Filter by end date range
    if (endDateFilter) {
      records = records.filter((l) => l.end_date <= endDateFilter);
    }

    return records;
  }, [leaveRecords, filterStatus, searchTerm, selectedEmployee, startDateFilter, endDateFilter]);

  // Pagination
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const statistics = useMemo(() => {
    return {
      total: leaveRecords.length,
      approved: leaveRecords.filter((l) => l.status === "approved").length,
      pending: leaveRecords.filter((l) => l.status === "pending").length,
      rejected: leaveRecords.filter((l) => l.status === "rejected").length,
    };
  }, [leaveRecords]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calendar helper functions for date picker
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInPickerMonth = getDaysInMonth(pickerMonth);
  const firstDayOfPickerMonth = getFirstDayOfMonth(pickerMonth);

  const pickerDays: (number | null)[] = [
    ...Array.from({ length: firstDayOfPickerMonth }, () => null),
    ...Array.from({ length: daysInPickerMonth }, (_, i) => i + 1),
  ];

  const handleDateSelect = (day: number | null, setDateFilter: (date: string) => void) => {
    if (day) {
      const dateStr = `${pickerMonth.getFullYear()}-${String(pickerMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setDateFilter(dateStr);
      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
      setCurrentPage(1);
    }
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 lg:p-8 w-full">
      <div className="w-full mx-auto px-1 sm:px-2 md:px-4 lg:px-6">
        {/* Header */}
        <div className="mb-6 md:mb-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-blue-600 to-indigo-600"></div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Leave Management
              </h1>
            </div>
            <p className="text-gray-600 ml-5 mt-2">Manage and review employee leave requests</p>
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 font-semibold group-hover:text-gray-700">Total Requests</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mt-2">{statistics.total}</p>
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
                <p className="text-xs sm:text-sm text-yellow-600 font-semibold group-hover:text-yellow-700">Pending</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-600 mt-2">{statistics.pending}</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-yellow-100 flex items-center justify-center group-hover:bg-yellow-200 transition flex-shrink-0">
                <span className="text-lg sm:text-xl">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-red-100 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-red-600 font-semibold group-hover:text-red-700">Rejected</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-600 mt-2">{statistics.rejected}</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition flex-shrink-0">
                <span className="text-lg sm:text-xl">✗</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilterPanel && (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 mb-8 animate-in fade-in duration-200">
          <label className="text-sm font-bold text-gray-700 block mb-4">Advanced Filters</label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Search */}
            <div>
              <label className="text-xs sm:text-sm font-semibold text-gray-600 block mb-2">Search</label>
              <input
                type="text"
                placeholder="Name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              />
            </div>

            {/* Employee Dropdown */}
            <div>
              <label className="text-xs sm:text-sm font-semibold text-gray-600 block mb-2">Employee</label>
              <Select
                options={[
                  { value: "", label: "All Employees" },
                  ...employees.map((emp) => ({ value: emp.id, label: emp.name }))
                ]}
                value={
                  selectedEmployee === "" || selectedEmployee === ""
                    ? { value: "", label: "All Employees" }
                    : employees.find((emp) => emp.id === selectedEmployee)
                    ? { value: selectedEmployee, label: employees.find((emp) => emp.id === selectedEmployee)?.name || "" }
                    : { value: "", label: "All Employees" }
                }
                onChange={(selectedOption) => {
                  if (selectedOption) {
                    setSelectedEmployee(selectedOption.value === "" ? "" : selectedOption.value);
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

            {/* Start Date Filter - Custom Date Picker */}
            <div className="relative" ref={startDatePickerRef}>
              <label className="text-xs sm:text-sm font-semibold text-gray-600 block mb-2">From Date</label>
              <div className="relative">
                <button
                  onClick={() => {
                    setPickerMonth(startDateFilter ? new Date(startDateFilter) : new Date());
                    setShowStartDatePicker(!showStartDatePicker);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left hover:border-blue-500 transition"
                >
                  {startDateFilter ? formatDate(startDateFilter) : "Select date"}
                </button>
                {showStartDatePicker && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
                    <div className="flex items-center justify-between mb-3">
                      <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1))} className="px-2 py-1 hover:bg-gray-100 rounded text-lg font-bold">‹</button>
                      <div className="text-sm font-bold">{monthNames[pickerMonth.getMonth()]} {pickerMonth.getFullYear()}</div>
                      <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1))} className="px-2 py-1 hover:bg-gray-100 rounded text-lg font-bold">›</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {dayNames.map((d) => (
                        <div key={d} className="text-center text-xs font-bold text-gray-600 py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {pickerDays.map((d, idx) => (
                        <button key={idx} type="button" onClick={() => handleDateSelect(d, setStartDateFilter)} disabled={!d} className={`aspect-square text-xs rounded ${!d ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'} ${startDateFilter === `${pickerMonth.getFullYear()}-${String(pickerMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` ? 'bg-blue-600 text-white font-bold' : ''}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* End Date Filter - Custom Date Picker */}
            <div className="relative" ref={endDatePickerRef}>
              <label className="text-xs sm:text-sm font-semibold text-gray-600 block mb-2">To Date</label>
              <div className="relative">
                <button
                  onClick={() => {
                    setPickerMonth(endDateFilter ? new Date(endDateFilter) : new Date());
                    setShowEndDatePicker(!showEndDatePicker);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left hover:border-blue-500 transition"
                >
                  {endDateFilter ? formatDate(endDateFilter) : "Select date"}
                </button>
                {showEndDatePicker && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
                    <div className="flex items-center justify-between mb-3">
                      <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1))} className="px-2 py-1 hover:bg-gray-100 rounded text-lg font-bold">‹</button>
                      <div className="text-sm font-bold">{monthNames[pickerMonth.getMonth()]} {pickerMonth.getFullYear()}</div>
                      <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1))} className="px-2 py-1 hover:bg-gray-100 rounded text-lg font-bold">›</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {dayNames.map((d) => (
                        <div key={d} className="text-center text-xs font-bold text-gray-600 py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {pickerDays.map((d, idx) => (
                        <button key={idx} type="button" onClick={() => handleDateSelect(d, setEndDateFilter)} disabled={!d} className={`aspect-square text-xs rounded ${!d ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'} ${endDateFilter === `${pickerMonth.getFullYear()}-${String(pickerMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` ? 'bg-blue-600 text-white font-bold' : ''}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterStatus("all");
                  setSearchTerm("");
                  setSelectedEmployee("");
                  setStartDateFilter("");
                  setEndDateFilter("");
                  setCurrentPage(1);
                  setShowStartDatePicker(false);
                  setShowEndDatePicker(false);
                }}
                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-semibold transition"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Status Filter Buttons */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="text-xs sm:text-sm font-semibold text-gray-600 block mb-3">Status</label>
            <div className="flex gap-2 flex-wrap">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilterStatus(status);
                    setCurrentPage(1);
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all transform hover:scale-105 ${
                    filterStatus === status
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 font-semibold">
            Showing {paginatedRecords.length} of {filteredRecords.length} requests
          </div>
        </div>
        )}

        <div className="p-3 sm:p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 bg-gray-50">
          <p className="text-xs sm:text-sm text-gray-600 font-semibold">
            Showing {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-spin" style={{WebkitMaskImage: 'conic-gradient(transparent 0deg 270deg, black 270deg)'}}></div>
              </div>
            </div>
            <p className="text-gray-500 font-semibold">Loading leave requests...</p>
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
                      Leave Type
                    </th>
                    <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-bold text-gray-700">
                      From
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      To
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);
                    return paginatedRecords.map((leave) => (
                      <tr key={leave.id} className="border-b border-gray-200 hover:bg-gray-50 transition text-sm">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <div>
                            <p className="font-semibold">{leave.employee_name}</p>
                            <p className="text-xs text-gray-500">{leave.employee_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 whitespace-nowrap">
                            {leave.leave_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(leave.start_date)}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(leave.end_date)}
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-xs">
                          <span className="text-left truncate max-w-xs inline-block">
                            {leave.reason || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2 items-start">
                            {getStatusBadge(leave.status)}
                            {leave.rejection_reason && (
                              <button
                                onClick={() => {
                                  setSelectedRejectionRecord(leave);
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
                        <td className="px-6 py-4">
                          {leave.status === "pending" ? (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleApprove(leave)}
                                disabled={actionLoading}
                                className="text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                title="Approve"
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
                                  setRejectingLeave(leave);
                                  setShowRejectModal(true);
                                }}
                                disabled={actionLoading}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                title="Reject"
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
                          ) : (
                            <span className="text-xs text-gray-400 font-semibold">No actions</span>
                          )}
                        </td>
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
                return paginatedRecords.map((leave) => (
                  <div key={leave.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    {/* Header: Employee name and date */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{leave.employee_name}</p>
                        <p className="text-xs text-gray-500">{leave.employee_email}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ml-2 ${getStatusBadge(
                          leave.status
                        )}`}
                      >
                        {leave.status}
                      </span>
                    </div>

                    {/* Leave Type */}
                    <div className="mb-2 pb-2 border-b border-gray-100">
                      <p className="text-xs text-gray-600">
                        <strong>Type:</strong> {leave.leave_type}
                      </p>
                    </div>

                    {/* Date Info Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-2 pb-2 border-b border-gray-100 text-xs">
                      <div>
                        <p className="text-gray-600 text-xs">From</p>
                        <p className="font-semibold text-gray-900 text-sm">{formatDate(leave.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs">To</p>
                        <p className="font-semibold text-gray-900 text-sm">{formatDate(leave.end_date)}</p>
                      </div>
                    </div>

                    {/* Reason */}
                    {leave.reason && (
                      <div className="mb-2 pb-2 border-b border-gray-100">
                        <p className="text-xs text-gray-600 mb-1">Reason</p>
                        <p className="text-xs text-gray-700 line-clamp-2">{leave.reason}</p>
                      </div>
                    )}

                    {/* Rejection Info */}
                    {leave.rejection_reason && (
                      <div className="mb-2 pb-2 border-b border-gray-100">
                        <button
                          onClick={() => {
                            setSelectedRejectionRecord(leave);
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
                    {leave.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleApprove(leave)}
                          disabled={actionLoading}
                          className="p-2 text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-green-50 rounded"
                          title="Approve"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setRejectingLeave(leave);
                            setShowRejectModal(true);
                          }}
                          disabled={actionLoading}
                          className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-red-50 rounded"
                          title="Reject"
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
              No leave requests found.
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

      {/* Reject Modal */}
      {showRejectModal && rejectingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full transform transition-all">
            <div className="p-6 md:p-8 border-b-2 border-red-100 bg-gradient-to-r from-red-50 to-rose-50">
              <h2 className="text-2xl font-bold text-gray-900">Reject Leave Request</h2>
              <p className="text-sm text-gray-600 mt-2">
                Employee: <span className="font-semibold text-gray-900">{rejectingLeave.employee_name}</span>
              </p>
            </div>
            <div className="p-6 md:p-8 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none font-medium"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingLeave(null);
                    setRejectionReason("");
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all transform hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-bold hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
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
              <p><strong>From:</strong> {formatDate(selectedRejectionRecord.start_date)}</p>
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
