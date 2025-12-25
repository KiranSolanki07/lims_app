import type { User } from "../types"

export default function AdminDashboard({ user }: { user: User }) {
  return (
    <div>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p>Welcome, {user.first_name}</p>
    </div>
  )
}
