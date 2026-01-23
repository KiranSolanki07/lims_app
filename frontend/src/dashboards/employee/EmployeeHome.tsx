import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { checkIn, checkOut, getTodayAttendance } from "../../api";

interface AttendanceStatus {
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number | null;
}

export default function EmployeeHome() {
  const { user } = useAuth();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  // Fetch today's attendance status on mount
  useEffect(() => {
    if (user?.id) {
      fetchTodayStatus();
    }
  }, [user?.id]);

  const fetchTodayStatus = async () => {
    try {
      if (!user?.id) return;
      const data = await getTodayAttendance(user.id);
      setAttendanceStatus(data);
    } catch (err) {
      console.error("Error fetching today's status:", err);
    }
  };

  const handleCheckIn = async () => {
    try {
      setLoading(true);
      setMessage("");

      if (!user?.id) {
        setMessageType("error");
        setMessage("User ID not found");
        return;
      }

      await checkIn(user.id, taskDescription || undefined);
      setMessageType("success");
      setMessage("✓ Check-in successful!");
      setTaskDescription("");
      await fetchTodayStatus();
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);
      setMessage("");

      if (!user?.id) {
        setMessageType("error");
        setMessage("User ID not found");
        return;
      }

      await checkOut(user.id);
      setMessageType("success");
      setMessage("✓ Check-out successful!");
      await fetchTodayStatus();
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "—";
    const [hours, minutes] = timeString.split(":").slice(0, 2);
    return `${hours}:${minutes}`;
  };

  const isCheckedIn = attendanceStatus?.check_in_time && !attendanceStatus?.check_out_time;

  return (
    <div className="p-6 w-full">
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Welcome, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mb-6">
          Here you can manage your attendance and track your work hours.
        </p>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              messageType === "success"
                ? "bg-green-50 border-green-300 text-green-800"
                : "bg-red-50 border-red-300 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        {/* Today's Attendance Section */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200 mb-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4">Today's Attendance</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-gray-600 mb-1">Check-In Time</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatTime(attendanceStatus?.check_in_time)}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-gray-600 mb-1">Check-Out Time</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatTime(attendanceStatus?.check_out_time)}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-gray-600 mb-1">Total Hours</p>
              <p className="text-2xl font-bold text-blue-600">
                {attendanceStatus?.total_hours ? attendanceStatus.total_hours : "—"}
              </p>
            </div>
          </div>

          {/* Check-In/Check-Out Section */}
          <div className="bg-white rounded-lg p-6 border border-blue-200">
            {!isCheckedIn ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Check-In</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Description (Optional)
                  </label>
                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="What will you be working on today?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    disabled={loading || !!attendanceStatus?.check_in_time}
                  />
                </div>
                <button
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-all"
                >
                  {loading ? "Processing..." : "✓ Check-In"}
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">You are checked in</h3>
                <p className="text-gray-600 mb-4">
                  Checked in at {formatTime(attendanceStatus?.check_in_time)}
                </p>
                <button
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-all"
                >
                  {loading ? "Processing..." : "✗ Check-Out"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <p className="text-sm text-blue-600 font-semibold mb-2">Quick Access</p>
            <p className="text-gray-700 text-sm">
              View your detailed attendance records by clicking on the "Attendance" menu.
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <p className="text-sm text-green-600 font-semibold mb-2">Track Hours</p>
            <p className="text-gray-700 text-sm">
              Monitor your daily check-in, check-out times and total hours worked.
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <p className="text-sm text-purple-600 font-semibold mb-2">Monthly View</p>
            <p className="text-gray-700 text-sm">
              Select any month to view your attendance summary and statistics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
