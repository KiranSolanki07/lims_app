// Full MatDash-style Admin Layout with correct responsive sidebar behavior
import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import DashboardSvg from "../../icons/DashboardSvg";
import logo from "../../assets/mbt-logo.png";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);


  const links = [
    { to: "/admin", label: "Dashboard Home", svg: DashboardSvg },
    { to: "/admin/users", label: "Users", icon: "lni-users" },
    { to: "/admin/settings", label: "Settings", icon: "lni-cog" },
    { to: "/admin/reports", label: "Reports", icon: "lni-stats-up" },
  ];


  return (
    <div className="flex h-screen bg-[#f5f7fb]">

      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-30 lg:hidden transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
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
          <h1 className="flex items-center justify-center" style={{width:"100%",}}>
            <img
              src={logo}
              alt="MBT Logo"
              className="h-10 w-auto"
            />
          </h1>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <nav className="p-4 text-gray-600 text-sm space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md transition ${isActive ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-700"
                }`
              }
            >
              <i className={`lni ${link.icon} text-lg`}></i>
              <span>{link.label}</span>
            </NavLink>

          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#fff]">

        {/* Navbar */}
        <header className=" bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>☰</button>
          </div>

          <div className="flex items-center gap-6">
            <button><i className="lni lni-alarm text-xl"></i></button>
            <button><i className="lni lni-night text-xl"></i></button>
            <button><i className="lni lni-flag-alt text-xl"></i></button>

            <img src="https://i.pravatar.cc/40" className="w-9 h-9 rounded-full border" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex justify-center h-screen overflow-y-auto p-6" style={{ backgroundColor: "#f4f7fb", borderRadius: 20 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// AdminHome
export function AdminHome() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div className="bg-blue-600 text-white rounded-xl p-6 shadow-md">
        <h1 className="text-xl font-bold">Welcome Back</h1>
        <p className="mt-2 opacity-80">Your dashboard overview</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-md">
        <p className="text-gray-400 text-sm">Customers</p>
        <h2 className="text-3xl font-bold text-gray-800 mt-2">36,358</h2>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-md">
        <p className="text-gray-400 text-sm">Projects</p>
        <h2 className="text-3xl font-bold text-gray-800 mt-2">78,298</h2>
      </div>
    </div>
  );
}
