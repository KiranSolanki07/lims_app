import { NavLink, useNavigate, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardSvg from "../../icons/DashboardSvg";
import AttendanceSvg from "../../icons/AttendanceSvg";
import LeavesSvg from "../../icons/LeavesSvg";
import logo from "../../assets/mbt-logo.png";
import EmployeeHome from "./EmployeeHome";
import EmployeeAttendancePage from "./EmployeeAttendancePage";
import EmployeeLeavesPage from "./EmployeeLeavesPage";

export default function EmployeeLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const links = [
    { to: "/employee", label: "Dashboard", icon: DashboardSvg, isSvg: true },
    { to: "/employee/attendance", label: "Attendance", icon: AttendanceSvg, isSvg: true },
    { to: "/employee/leaves", label: "Leaves", icon: LeavesSvg, isSvg: true },
  ];

  const handleLogout = async () => {
    try {
      // Close menu first
      setShowLogoutMenu(false);
      setSidebarOpen(false);
      
      // Call logout which clears auth state
      await logout();
      
      // Add a small delay to ensure state is cleared and subscriptions are unsubscribed
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 200);
    } catch (err) {
      console.error("Logout error:", err);
      // Force navigate even if logout fails
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 200);
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7fb]">
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-30 lg:hidden transition-opacity ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static
          top-0 left-0
          z-40 lg:z-auto
          h-full lg:h-auto
          w-64 bg-white
          transition-transform
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex items-center justify-between p-5">
          <h1 className="flex items-center justify-center" style={{ width: "100%" }}>
            <img src={logo} alt="MBT Logo" className="h-10 w-auto" />
          </h1>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
        </div>

        <nav className="p-4 text-gray-600 text-sm space-y-1">
          {links.map((link) => {
            const IconComponent = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-100 text-gray-700"
                  }`
                }
              >
                {link.isSvg ? (
                  <IconComponent className="w-5 h-5 flex-shrink-0 text-current" />
                ) : (
                  <i className={`lni ${link.icon} text-lg`}></i>
                )}
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#fff]">
        {/* Navbar */}
        <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
          </div>

          <div className="flex items-center gap-6">
            <button>
              <i className="lni lni-alarm text-xl"></i>
            </button>
            <button>
              <i className="lni lni-night text-xl"></i>
            </button>
            <button>
              <i className="lni lni-flag-alt text-xl"></i>
            </button>
            
            {/* User Info and Logout Button */}
            <div className="relative">
              <button
                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                className="p-2 hover:bg-gray-100 rounded-full transition-all flex items-center gap-2"
                title="User menu"
              >
                <i className="lni lni-user text-xl"></i>
                {user && (
                  <span className="text-sm text-gray-700 font-medium">
                    {user.first_name} {user.last_name}
                  </span>
                )}
              </button>
              
              {showLogoutMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {user && (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">{user.role}</p>
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowLogoutMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 font-semibold rounded-lg transition-all flex items-center gap-2"
                  >
                    <i className="lni lni-exit text-lg"></i>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route index element={<EmployeeHome />} />
            <Route path="attendance" element={<EmployeeAttendancePage />} />
            <Route path="leaves" element={<EmployeeLeavesPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
