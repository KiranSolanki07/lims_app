import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../supabaseClient";

type AttendanceRecord = {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  break_time?: number | null;
  total_hours: string | null;
  task_description: string | null;
  status: string;
  created_at: string;
  is_approved: boolean;
  rejection_reason?: string | null;
};

type AttendanceForm = {
  date: string;
  check_in_time: string;
  check_out_time: string;
  break_time: number;
  task_description: string;
  status: string;
};

type AttendanceFormErrors = {
  [K in keyof AttendanceForm]?: string;
};

type ModalProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

function Modal({ title, children, onClose }: ModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 md:p-4">
      <div className="w-full max-w-md rounded-2xl md:rounded-3xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] md:max-h-[calc(100vh-2rem)] overflow-y-auto animate-in fade-in zoom-in duration-200 flex flex-col">
        <div className="flex items-start justify-between sticky top-0 bg-white p-4 md:p-6 pb-3 md:pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-base md:text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all flex-shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default function EmployeeAttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7)
  );
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<AttendanceFormErrors>({});
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date(selectedMonth));
  const [employeeEmail, setEmployeeEmail] = useState<string>("");
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  
  const [form, setForm] = useState<AttendanceForm>({
    date: "",
    check_in_time: "",
    check_out_time: "",
    break_time: 0,
    task_description: "",
    status: "present",
  });

  // Get current user's ID and email from session
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          return;
        }
        
        if (!session?.user?.id) {
          console.warn("No active session found");
          return;
        }
        
        setEmployeeId(session.user.id);
        if (session.user.email) {
          setEmployeeEmail(session.user.email);
        }

        // Get name from user metadata (set during OAuth or signup)
        const metadata = session.user.user_metadata;
        if (metadata) {
          const firstName = metadata.given_name || metadata.firstName || metadata.first_name || '';
          const lastName = metadata.family_name || metadata.lastName || metadata.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          if (fullName) {
            setEmployeeName(fullName);
          }
        }
      } catch (err) {
        console.error("Error in getUser:", err);
      }
    };
    
    getUser();
  }, []);

  // Function to fetch attendance records
  const handleFetchAttendance = async (month: string = selectedMonth) => {
    if (!employeeId) {
      return;
    }

    setLoading(true);
    try {
      const [year, monthNum] = month.split("-").map(Number);
      const startDate = new Date(year, monthNum - 1, 1).toISOString().split("T")[0];
      const endDate = new Date(year, monthNum, 0).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) {
        console.error("Error fetching attendance:", error);
        setAttendanceRecords([]);
        return;
      }
      
      setAttendanceRecords(data || []);
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance records for current employee
  useEffect(() => {
    handleFetchAttendance(selectedMonth);
  }, [selectedMonth, employeeId]);

  // Real-time subscription for attendance changes (for admin approvals/rejections)
  useEffect(() => {
    if (!employeeId) return;

    const channel = supabase
      .channel(`employee-attendance-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `employee_id=eq.${employeeId}`
        },
        (_payload) => {
          // Refresh attendance data when changes occur
          handleFetchAttendance(selectedMonth);
        }
      )
      .subscribe((_status) => {
        // Real-time subscription active
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, selectedMonth]);



  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const currentDate = new Date(selectedMonth + "-01");
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const calendarDays: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getAttendanceForDate = (day: number): AttendanceRecord | undefined => {
    const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    return attendanceRecords.find((r) => r.date === dateStr);
  };

  // Check if date is allowed for NEW submissions (within 2 days before to today)
  const isDateAllowedForSubmission = (day: number): boolean => {
    const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    const checkDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
    // Allow dates from 2 days before to today for new submissions
    return diffDays >= 0 && diffDays <= 2;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      present: "bg-green-100 border-green-400 text-green-700 shadow-md",
      absent: "bg-red-100 border-red-400 text-red-700 shadow-md",
      late: "bg-yellow-100 border-yellow-400 text-yellow-700 shadow-md",
      "half-day": "bg-blue-100 border-blue-400 text-blue-700 shadow-md",
    };
    return colors[status] || "bg-gray-100 border-gray-400 text-gray-700";
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthDisplay = `${monthNames[month - 1]} ${year}`;

  // Calculate total minutes (subtract break time) - returns minutes, not hours
  const calculateTotalMinutes = (checkIn: string, checkOut: string, breakTime: number = 0): number | null => {
    if (!checkIn || !checkOut) return null;

    const [inHour, inMin] = checkIn.split(":").map(Number);
    const [outHour, outMin] = checkOut.split(":").map(Number);

    const inMinutes = inHour * 60 + inMin;
    let outMinutes = outHour * 60 + outMin;

    if (outMinutes < inMinutes) {
      outMinutes += 24 * 60;
    }

    // breakTime is already in minutes, so don't multiply by 60
    const totalMinutes = outMinutes - inMinutes - breakTime;
    return totalMinutes;
  };

  // Format total minutes to display as "8h 30m"
  const formatTotalHours = (minutes: number | null): string => {
    if (!minutes || minutes < 0) return "0h 0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  // Auto-select status based on total minutes
  const getAutoStatus = (minutes: number | null): string => {
    if (!minutes) return "present";
    if (minutes < 240) return "absent"; // less than 4 hours (240 minutes)
    if (minutes >= 240 && minutes < 420) return "half-day"; // 4-7 hours (240-420 minutes)
    return "present";
  };

  const totalMinutes = calculateTotalMinutes(form.check_in_time, form.check_out_time, form.break_time);
  const autoStatus = getAutoStatus(totalMinutes);

  const statistics = useMemo(() => {
    return {
      total: attendanceRecords.length,
      present: attendanceRecords.filter((r) => r.status === "present").length,
      absent: attendanceRecords.filter((r) => r.status === "absent").length,
      late: attendanceRecords.filter((r) => r.status === "late").length,
      halfDay: attendanceRecords.filter((r) => r.status === "half-day").length,
      totalHours: attendanceRecords
        .filter((r) => r.check_in_time && r.check_out_time)
        .reduce((sum, r) => {
          const minutes = calculateTotalMinutes(r.check_in_time!, r.check_out_time!, 0);
          return sum + (minutes || 0);
        }, 0) / 60,
    };
  }, [attendanceRecords]);

  const validateForm = (): boolean => {
    const newErrors: AttendanceFormErrors = {};
    
    // Check-in time validation
    if (!form.check_in_time) {
      newErrors.check_in_time = "Check-in time is required";
    }
    
    // Check-out time validation
    if (!form.check_out_time) {
      newErrors.check_out_time = "Check-out time is required";
    }

    // Check if check-out is after check-in
    if (form.check_in_time && form.check_out_time) {
      const [inHour, inMin] = form.check_in_time.split(":").map(Number);
      const [outHour, outMin] = form.check_out_time.split(":").map(Number);
      const inMinutes = inHour * 60 + inMin;
      let outMinutes = outHour * 60 + outMin;

      // Allow next-day checkout
      if (outMinutes < inMinutes) {
        outMinutes += 24 * 60;
      }

      if (outMinutes <= inMinutes) {
        newErrors.check_out_time = "Check-out time must be after check-in time";
      }

      // Validate minimum 1 hour work duration
      if (outMinutes > inMinutes && (outMinutes - inMinutes) < 60) {
        newErrors.check_out_time = "Work duration must be at least 1 hour";
      }

      // Validate maximum 12 hour work duration (without break)
      if (outMinutes > inMinutes && (outMinutes - inMinutes) > 720) {
        newErrors.check_out_time = "Work duration cannot exceed 12 hours";
      }
    }

    // Break time validation
    if (form.break_time < 0) {
      newErrors.break_time = "Break time cannot be negative";
    }
    if (form.break_time > 300) {
      newErrors.break_time = "Break time cannot exceed 5 hours";
    }

    // Task description validation
    if (!form.task_description.trim()) {
      newErrors.task_description = "Task description is required";
    } else if (form.task_description.trim().length < 5) {
      newErrors.task_description = "Task description must be at least 5 characters";
    }

    // Validation rules:
    // 1. New submissions: only within 2 days before today (0-2 days ago)
    // 2. Existing records: only rejected records can be edited
    if (selectedDate) {
      const recordDate = new Date(selectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      recordDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((today.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
      const isRejected = currentAttendance?.rejection_reason ? true : false;
      
      // Block new submissions outside 0-2 days window
      if (!currentAttendance && (diffDays < 0 || diffDays > 2)) {
        newErrors.date = "You can only submit attendance up to 2 days before today";
      }
      // Block editing non-rejected records
      else if (currentAttendance && !isRejected) {
        newErrors.date = "You can only edit rejected attendance";
      }
    }

    // Total hours validation (must have some working hours after break)
    if (totalMinutes && totalMinutes <= 0) {
      newErrors.check_out_time = "Working hours cannot be zero or negative after break time";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !selectedDate || !employeeId) return;

    setSubmitting(true);
    try {
      // Auto-set status based on total minutes
      const finalStatus = getAutoStatus(totalMinutes);
      const totalHoursFormatted = totalMinutes ? formatTotalHours(totalMinutes) : null;
      
      // When resubmitting rejected attendance, clear rejection_reason and reset approval status
      const upsertData: any = {
        employee_id: employeeId,
        employee_name: employeeName,
        employee_email: employeeEmail,
        date: selectedDate,
        check_in_time: form.check_in_time,
        check_out_time: form.check_out_time,
        break_time: form.break_time,
        total_hours: totalHoursFormatted,
        task_description: form.task_description,
        status: finalStatus,
        is_approved: false,
      };
      
      // If this is a resubmission of a rejected record, clear rejection_reason
      if (currentAttendance?.rejection_reason) {
        upsertData.rejection_reason = null;
      }
      
      const { error } = await supabase
        .from("attendance")
        .upsert(upsertData, {
          onConflict: "date,employee_id",
        });

      if (error) throw error;

      // Refresh attendance records
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];

      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("date", startDate)
        .lte("date", endDate);

      setAttendanceRecords(data || []);
      handleCloseModal();
    } catch (err) {
      console.error("Failed to submit attendance:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const openDateModal = (day: number) => {
    const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    const attendance = getAttendanceForDate(day);
    const isSubmissionAllowed = isDateAllowedForSubmission(day);
    
    // Rule: Only allow editing if attendance is rejected
    // Allow viewing all records
    // Only allow NEW submissions within 2 days before today
    
    // For NEW submissions: only allow within submission window
    if (!attendance && !isSubmissionAllowed) {
      setCurrentAttendance(null);
      setForm({
        date: dateStr,
        check_in_time: "",
        check_out_time: "",
        break_time: 0,
        task_description: "",
        status: "present",
      });
      setShowModal(true);
      return;
    }
    
    // For EXISTING records: allow viewing all
    if (attendance) {
      setCurrentAttendance(attendance);
      setForm({
        date: attendance.date,
        check_in_time: attendance.check_in_time || "",
        check_out_time: attendance.check_out_time || "",
        break_time: attendance.break_time || 0,
        task_description: attendance.task_description || "",
        status: attendance.status,
      });
    } else {
      setCurrentAttendance(null);
      setForm({
        date: dateStr,
        check_in_time: "",
        check_out_time: "",
        break_time: 0,
        task_description: "",
        status: "present",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setCurrentAttendance(null);
    setForm({
      date: "",
      check_in_time: "",
      check_out_time: "",
      break_time: 0,
      task_description: "",
      status: "present",
    });
    setErrors({});
  };

  // Month Picker Functions
  const handleMonthSelect = (day: number) => {
    const selected = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day);
    setSelectedMonth(selected.toISOString().substring(0, 7));
    setShowMonthPicker(false);
  };

  const pickerDaysInMonth = getDaysInMonth(pickerMonth);
  const pickerFirstDay = getFirstDayOfMonth(pickerMonth);
  const pickerDays = [];
  
  for (let i = 0; i < pickerFirstDay; i++) {
    pickerDays.push(null);
  }
  for (let i = 1; i <= pickerDaysInMonth; i++) {
    pickerDays.push(i);
  }

  // SVG Icon Components
  const getStatusSvg = (status: string | undefined) => {
    switch (status) {
      case "present":
        return (
          <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
          </svg>
        );
      case "absent":
        return (
          <svg className="w-6 h-6 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
          </svg>
        );
      case "late":
        return (
          <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd"></path>
          </svg>
        );
      case "half-day":
        return (
          <svg className="w-6 h-6 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V10M10.5 1.5v9m0-9h9m-9 9h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
    }
  };

  const CalendarDayIcon = (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white rounded-xl shadow-md border border-gray-200">
                <svg className="w-6 h-6" style={{ color: "#0074ba" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Attendance</h1>
                <p style={{ color: "#0074ba" }} className="text-sm mt-0.5 font-medium">Track your work journey</p>
              </div>
            </div>
          </div>
          
          {/* Custom Month Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="px-6 py-3 text-white rounded-xl text-sm font-bold focus:outline-none transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              style={{ backgroundColor: "#0074ba" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </button>

            {showMonthPicker && createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowMonthPicker(false)}>
                <div 
                  className="bg-white rounded-2xl shadow-2xl p-6 w-80"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Month Picker Header */}
                  <div className="flex items-center justify-between mb-6">
                    <button
                      type="button"
                      onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1))}
                      className="px-3 py-1 rounded-lg hover:bg-gray-100 text-2xl font-bold text-gray-700"
                    >
                      ‹
                    </button>
                    <div className="flex gap-2">
                      <select
                        value={pickerMonth.getMonth()}
                        onChange={(e) => setPickerMonth(new Date(pickerMonth.getFullYear(), parseInt(e.target.value)))}
                        className="px-3 py-1 rounded-lg border border-gray-300 text-sm focus:outline-none font-medium"
                      >
                        {monthNames.map((m, idx) => (
                          <option key={idx} value={idx}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={pickerMonth.getFullYear()}
                        onChange={(e) => setPickerMonth(new Date(parseInt(e.target.value), pickerMonth.getMonth()))}
                        className="px-3 py-1 rounded-lg border border-gray-300 text-sm focus:outline-none font-medium"
                      >
                        {Array.from({ length: new Date().getFullYear() - 1950 + 11 }, (_, i) => 1950 + i).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1))}
                      className="px-3 py-1 rounded-lg hover:bg-gray-100 text-2xl font-bold text-gray-700"
                    >
                      ›
                    </button>
                  </div>

                  {/* Day Name Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((d) => (
                      <div key={d} className="text-center text-xs font-bold text-gray-600 py-2">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {pickerDays.map((d, idx) => {
                      const isSelected = d && selectedMonth === `${pickerMonth.getFullYear()}-${String(pickerMonth.getMonth() + 1).padStart(2, '0')}`;
                      
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => d && handleMonthSelect(d)}
                          disabled={!d}
                          className={`
                            aspect-square rounded-lg font-medium text-sm transition-all
                            ${!d ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}
                            ${isSelected ? 'bg-blue-600 text-white font-bold hover:bg-blue-700' : ''}
                          `}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>

                  {/* Today Button */}
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        setPickerMonth(today);
                        setSelectedMonth(today.toISOString().substring(0, 7));
                        setShowMonthPicker(false);
                      }}
                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm font-medium text-blue-700 transition-all"
                    >
                      Today
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-3 md:p-5 shadow-xl hover:shadow-2xl transition-all hover:scale-105 group cursor-pointer border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">Total Days</p>
                <p className="text-2xl md:text-3xl font-black text-white">{statistics.total}</p>
              </div>
              <svg className="w-10 md:w-12 h-10 md:h-12 text-blue-400/30 group-hover:text-blue-300/50 transition-all" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 100 2H4v10a2 2 0 002 2h8a2 2 0 002-2V7h2a1 1 0 100-2h-1V4a2 2 0 00-2-2H6a2 2 0 00-2 2v1H4zm0 5a1 1 0 000 2h10a1 1 0 100-2H4z" clipRule="evenodd"></path>
              </svg>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-3 md:p-5 shadow-xl hover:shadow-2xl transition-all hover:scale-105 group cursor-pointer border border-emerald-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-1">Present</p>
                <p className="text-2xl md:text-3xl font-black text-white">{statistics.present}</p>
              </div>
              <svg className="w-10 md:w-12 h-10 md:h-12 text-emerald-300/30 group-hover:text-emerald-200/50 transition-all" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-3 md:p-5 shadow-xl hover:shadow-2xl transition-all hover:scale-105 group cursor-pointer border border-rose-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-rose-200 text-xs font-bold uppercase tracking-widest mb-1">Absent</p>
                <p className="text-2xl md:text-3xl font-black text-white">{statistics.absent}</p>
              </div>
              <svg className="w-10 md:w-12 h-10 md:h-12 text-rose-300/30 group-hover:text-rose-200/50 transition-all" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-3 md:p-5 shadow-xl hover:shadow-2xl transition-all hover:scale-105 group cursor-pointer border border-amber-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-1">Half Day</p>
                <p className="text-2xl md:text-3xl font-black text-white">{statistics.halfDay}</p>
              </div>
              <svg className="w-10 md:w-12 h-10 md:h-12 text-amber-300/30 group-hover:text-amber-200/50 transition-all" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V10M10.5 1.5v9m0-9h9m-9 9h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-3 md:p-5 shadow-xl hover:shadow-2xl transition-all hover:scale-105 group cursor-pointer border border-purple-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-1">Total Hours</p>
                <p className="text-2xl md:text-3xl font-black text-white">{statistics.totalHours}h</p>
              </div>
              <svg className="w-10 md:w-12 h-10 md:h-12 text-purple-300/30 group-hover:text-purple-200/50 transition-all" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Calendar Container */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-200 p-4 md:p-8">
          <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
            <div className="h-6 md:h-8 w-1 rounded-full" style={{ backgroundColor: "#0074ba" }}></div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">{monthDisplay}</h2>
          </div>

          {loading ? (
            <div>
              {/* Skeleton Day Headers */}
              <div className="grid grid-cols-7 gap-1 md:gap-3 mb-2 md:mb-4 px-1 md:px-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={`skeleton-header-${i}`} className="h-8 md:h-10 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>

              {/* Skeleton Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 md:gap-3">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={`skeleton-day-${i}`} className="h-16 md:h-20 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <div>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 md:gap-3 mb-2 md:mb-4 px-1 md:px-2">
                {dayNames.map((d) => (
                  <div
                    key={d}
                    className="text-center font-bold text-gray-700 py-2 md:py-3 text-xs md:text-sm uppercase tracking-widest bg-gray-100 rounded-lg"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 md:gap-3">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="h-16 md:h-20" />;
                  }

                  const attendance = getAttendanceForDate(day);
                  const isToday = new Date().toDateString() === new Date(`${selectedMonth}-${String(day).padStart(2, "0")}`).toDateString();
                  const isApproved = attendance?.is_approved;
                  const isPending = attendance && !attendance.is_approved && !attendance.rejection_reason;
                  const isRejected = attendance && !attendance.is_approved && attendance.rejection_reason;
                  const isSubmissionAllowed = isDateAllowedForSubmission(day);
                  
                  // Can always click to view existing records
                  // Can click to submit new if: within submission window
                  // Can edit if: rejected record
                  const canClickButton = attendance || isSubmissionAllowed;
                  const canEdit = isRejected;

                  return (
                    <button
                      key={day}
                      onClick={() => openDateModal(day)}
                      disabled={!canClickButton}
                      className={`h-16 md:h-20 flex flex-col items-center justify-center rounded-lg md:rounded-2xl border-2 transition-all font-bold relative group ${
                        !canClickButton
                          ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-30"
                          : isApproved
                          ? "border-green-400 bg-green-50 text-green-700 cursor-pointer opacity-70 hover:shadow-md"
                          : isPending
                          ? "border-blue-300 bg-blue-50 text-blue-700 cursor-pointer opacity-70 hover:shadow-md"
                          : isRejected
                          ? `${getStatusColor(attendance.status)} hover:shadow-lg hover:-translate-y-1 cursor-pointer`
                          : `border-gray-300 bg-white hover:bg-blue-50 hover:border-blue-400 cursor-pointer ${
                              isToday ? "ring-2 ring-blue-400 ring-inset shadow-md" : "hover:shadow-md"
                            }`
                      }`}
                      title={
                        isApproved
                          ? "Approved - View Only"
                          : isPending
                          ? "Submitted - View Only"
                          : isRejected
                          ? "Rejected - Click to resubmit"
                          : !isSubmissionAllowed && !attendance
                          ? "You can only submit up to 2 days before today"
                          : undefined
                      }
                    >
                      <div className="text-lg md:text-xl">
                        {attendance ? getStatusSvg(attendance.status) : CalendarDayIcon}
                      </div>
                      <span className="text-xs md:text-sm font-bold mt-0.5 md:mt-1" style={{color: !canClickButton ? "#aaa" : isApproved ? "#16a34a" : isPending ? "#1e40af" : "inherit"}}>{day}</span>
                      {isToday && canEdit && (
                        <span className="text-xs font-bold text-blue-500 animate-pulse">NOW</span>
                      )}
                      {isApproved && (
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-1 rounded">✓</span>
                      )}
                      {isRejected && (
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-1 rounded">⚠</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3 md:mb-4">Status Guide</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl bg-green-50 border border-green-200 hover:shadow-md transition-all">
                <svg className="w-5 md:w-6 h-5 md:h-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="text-xs font-bold text-green-700">Present</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl bg-red-50 border border-red-200 hover:shadow-md transition-all">
                <svg className="w-5 md:w-6 h-5 md:h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
                <span className="text-xs font-bold text-red-700">Absent</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl bg-yellow-50 border border-yellow-200 hover:shadow-md transition-all">
                <svg className="w-5 md:w-6 h-5 md:h-6 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd"></path>
                </svg>
                <span className="text-xs font-bold text-yellow-700">Late</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl bg-blue-50 border border-blue-200 hover:shadow-md transition-all">
                <svg className="w-5 md:w-6 h-5 md:h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V10M10.5 1.5v9m0-9h9m-9 9h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <span className="text-xs font-bold text-blue-700">Half Day</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={`${selectedDate ? new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : ""}`} onClose={handleCloseModal}>
          {(() => {
            // isViewOnly when:
            // 1. Record is approved (cannot edit)
            // 2. Record is pending/submitted (cannot edit)
            // 3. Only rejected records can be edited
            const isApproved = currentAttendance?.is_approved ?? false;
            const isRejected = currentAttendance?.rejection_reason ? true : false;
            const isPending = currentAttendance && !isApproved && !isRejected;
            const isViewOnly = isApproved || isPending ? true : false;
            return (
              <form onSubmit={handleSubmit} className="space-y-3">
            {/* Rejection Reason Display */}
            {currentAttendance?.rejection_reason && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-red-700 mb-1">❌ Attendance Rejected</p>
                <p className="text-xs text-red-600"><strong>Reason:</strong> {currentAttendance.rejection_reason}</p>
                <p className="text-xs text-red-600 mt-2">Please update and resubmit your attendance.</p>
              </div>
            )}

            {/* Approval Status Display */}
            {currentAttendance?.is_approved && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-green-700">✓ Attendance Approved</p>
              </div>
            )}

            {/* View Only Info */}
            {isPending && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-blue-700">ℹ View Only</p>
                <p className="text-xs text-blue-600">This attendance has been submitted. You can view it but cannot edit it until admin reviews.</p>
              </div>
            )}

            {/* Employee Name */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Employee</label>
              <input
                type="text"
                value={employeeName}
                disabled
                className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm cursor-not-allowed text-slate-600"
              />
            </div>

            {/* Check-In Time */}
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Check-In Time</label>
              <input
                type="time"
                value={form.check_in_time}
                onChange={(e) => {
                  setForm({ ...form, check_in_time: e.target.value });
                  setErrors({ ...errors, check_in_time: undefined });
                }}
                disabled={isViewOnly}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition-all font-medium ${
                  errors.check_in_time
                    ? "border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                } ${isViewOnly ? "bg-slate-100 cursor-not-allowed" : ""}`}
              />
              {errors.check_in_time && <p className="text-red-600 text-xs mt-2 font-semibold">⚠️ {errors.check_in_time}</p>}
            </div>

            {/* Check-Out Time */}
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Check-Out Time</label>
              <input
                type="time"
                value={form.check_out_time}
                onChange={(e) => {
                  setForm({ ...form, check_out_time: e.target.value });
                  setErrors({ ...errors, check_out_time: undefined });
                }}
                disabled={isViewOnly}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition-all font-medium ${
                  errors.check_out_time
                    ? "border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                } ${isViewOnly ? "bg-slate-100 cursor-not-allowed" : ""}`}
              />
              {errors.check_out_time && <p className="text-red-600 text-xs mt-2 font-semibold">⚠️ {errors.check_out_time}</p>}
            </div>

            {/* Break Time */}
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Break Time (Minutes)</label>
              <select
                value={form.break_time}
                onChange={(e) => {
                  setForm({ ...form, break_time: parseInt(e.target.value) || 0 });
                  setErrors({ ...errors, break_time: undefined });
                }}
                disabled={isViewOnly}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition-all font-medium cursor-pointer ${
                  errors.break_time
                    ? "border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                } ${isViewOnly ? "bg-slate-100 cursor-not-allowed" : ""}`}
              >
                {Array.from({ length: 13 }, (_, i) => i * 5).map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
              {errors.break_time && <p className="text-red-600 text-xs mt-2 font-semibold">⚠️ {errors.break_time}</p>}
            </div>

            {/* Total Hours */}
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Total Hours</label>
              <input
                type="text"
                value={totalMinutes ? formatTotalHours(totalMinutes) : ""}
                disabled
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl text-sm cursor-not-allowed font-bold text-blue-700"
              />
            </div>

            {/* Status - Auto-Selected */}
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Status (Auto-Selected)</label>
              <div className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-sm font-medium bg-white text-slate-700 flex items-center">
                {autoStatus === "present" && "✓ Present"}
                {autoStatus === "absent" && "✗ Absent"}
                {autoStatus === "late" && "⏱ Late"}
                {autoStatus === "half-day" && "⊡ Half Day"}
              </div>
              
            </div>

            {/* Task Description */}
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">Task Description</label>
              <textarea
                value={form.task_description}
                onChange={(e) => {
                  setForm({ ...form, task_description: e.target.value });
                  setErrors({ ...errors, task_description: undefined });
                }}
                disabled={isViewOnly}
                placeholder="What were you working on today? Share your accomplishments..."
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none focus:ring-2 transition-all resize-none font-medium ${
                  errors.task_description
                    ? "border-red-500 focus:ring-red-200 bg-red-50"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-200 bg-white"
                } ${isViewOnly ? "bg-slate-100 cursor-not-allowed" : ""}`}
                rows={4}

              />
              {errors.task_description && <p className="text-red-600 text-xs mt-2 font-semibold">⚠️ {errors.task_description}</p>}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-bold transition-all hover:shadow-md"
              >
                Cancel
              </button>
              {!isViewOnly && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg hover:scale-105"
                >
                  {submitting ? "Submitting..." : currentAttendance ? "Update Attendance" : "Submit Attendance"}
                </button>
              )}
            </div>
          </form>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
