import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import { submitLeave, getEmployeeLeaves } from "../../api";

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

type LeaveForm = {
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string;
};

export default function EmployeeLeavesPage() {
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [employeeEmail, setEmployeeEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const [form, setForm] = useState<LeaveForm>({
    start_date: "",
    end_date: "",
    leave_type: "Casual Leave",
    reason: "",
  });

  const leaveTypes = ["Sick Leave", "Personal Leave", "Casual Leave", "Annual Leave"];

  // Get current user's ID and email
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user?.id) {
          console.warn("No active session found");
          return;
        }

        setEmployeeId(session.user.id);
        if (session.user.email) {
          setEmployeeEmail(session.user.email);
        }

        // Get name from user metadata
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
        console.error("Error getting user:", err);
      }
    };

    getUser();
  }, []);

  // Fetch leaves for current employee
  useEffect(() => {
    if (!employeeId) return;
    fetchLeaves();
  }, [employeeId]);

  const fetchLeaves = async () => {
    if (!employeeId) return;

    setLoading(true);
    try {
      const data = await getEmployeeLeaves(employeeId);
      setLeaveRecords(data || []);
    } catch (err) {
      console.error("Error fetching leaves:", err);
      setLeaveRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription for leave changes
  useEffect(() => {
    if (!employeeId) return;

    const channel = supabase
      .channel(`employee-leaves-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaves',
          filter: `employee_id=eq.${employeeId}`
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
  }, [employeeId]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.start_date || !form.end_date) {
      setMessageType("error");
      setMessage("Please select start and end dates");
      return;
    }

    if (new Date(form.start_date) > new Date(form.end_date)) {
      setMessageType("error");
      setMessage("End date must be after start date");
      return;
    }

    if (!form.leave_type) {
      setMessageType("error");
      setMessage("Please select a leave type");
      return;
    }

    setSubmitting(true);
    try {
      await submitLeave({
        employee_id: employeeId!,
        employee_name: employeeName,
        employee_email: employeeEmail,
        start_date: form.start_date,
        end_date: form.end_date,
        leave_type: form.leave_type,
        reason: form.reason,
      });

      setMessageType("success");
      setMessage("Leave request submitted successfully! Admin will review it soon.");
      setForm({
        start_date: "",
        end_date: "",
        leave_type: "Casual Leave",
        reason: "",
      });
      setShowModal(false);

      // Refresh leaves
      fetchLeaves();
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Failed to submit leave request");
    } finally {
      setSubmitting(false);
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

  const statistics = useMemo(() => {
    return {
      total: leaveRecords.length,
      approved: leaveRecords.filter((r) => r.status === "approved").length,
      pending: leaveRecords.filter((r) => r.status === "pending").length,
      rejected: leaveRecords.filter((r) => r.status === "rejected").length,
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

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Leave Management</h1>
          <p className="text-gray-600 mt-1">Request and manage your leaves</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg border ${
              messageType === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600 font-semibold">Total Requests</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">
              {statistics.total}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
            <p className="text-sm text-green-600 font-semibold">Approved</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600 mt-1">
              {statistics.approved}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-yellow-200 shadow-sm">
            <p className="text-sm text-yellow-600 font-semibold">Pending</p>
            <p className="text-2xl md:text-3xl font-bold text-yellow-600 mt-1">
              {statistics.pending}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
            <p className="text-sm text-red-600 font-semibold">Rejected</p>
            <p className="text-2xl md:text-3xl font-bold text-red-600 mt-1">
              {statistics.rejected}
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mb-6 md:mb-8">
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 md:py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            + Request Leave
          </button>
        </div>

        {/* Leave Requests Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading leave requests...</div>
          ) : leaveRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No leave requests yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">
                      Leave Type
                    </th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">
                      Start Date
                    </th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">
                      End Date
                    </th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaveRecords.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-800 font-medium">
                        {leave.leave_type}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-600">
                        {formatDate(leave.start_date)}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-600">
                        {formatDate(leave.end_date)}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        {getStatusBadge(leave.status)}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-600">
                        <div className="max-w-xs truncate">
                          {leave.reason || (
                            leave.rejection_reason ? (
                              <span className="text-red-600">
                                Rejection: {leave.rejection_reason}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Submit Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 md:p-6 pb-3 md:pb-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold text-gray-800">Request Leave</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="p-4 md:p-6 space-y-4">
              {/* Leave Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Leave Type *
                </label>
                <select
                  value={form.leave_type}
                  onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {leaveTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Enter reason for leave request..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-3 mt-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Leave Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
