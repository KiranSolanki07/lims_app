export default function InternHome() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Welcome Card */}
        <div className="col-span-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-8 shadow-lg">
          <h1 className="text-4xl font-bold mb-2">Welcome, Intern!</h1>
          <p className="text-blue-100 text-lg">Here's your dashboard overview</p>
        </div>

        {/* Stats Cards */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Tasks</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">24</h3>
            </div>
            <div className="text-blue-600 text-4xl opacity-20">
              <i className="lni lni-list"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Completed</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">18</h3>
            </div>
            <div className="text-green-600 text-4xl opacity-20">
              <i className="lni lni-checkmark-circle"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">In Progress</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">6</h3>
            </div>
            <div className="text-orange-600 text-4xl opacity-20">
              <i className="lni lni-hourglass"></i>
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div className="col-span-full bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <p className="text-gray-700">Started working on Project X</p>
              <p className="text-gray-400 text-sm ml-auto">2 hours ago</p>
            </div>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <p className="text-gray-700">Completed Task: Design mockups</p>
              <p className="text-gray-400 text-sm ml-auto">5 hours ago</p>
            </div>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
              <p className="text-gray-700">Submitted review for feedback</p>
              <p className="text-gray-400 text-sm ml-auto">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
