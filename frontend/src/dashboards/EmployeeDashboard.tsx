import type { User } from "../types"

export default function EmployeeDashboard({ user }: { user: User }) {
  return (
    <div>
      <h1>Employee Dashboard</h1>
      <p>Welcome, {user.first_name}</p>
    </div>
  )
}
