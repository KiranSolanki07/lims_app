import type { User } from "../types"

export default function InternDashboard({ user }: { user: User }) {
  return (
    <div>
      <h1>Intern Dashboard</h1>
      <p>Welcome, {user.first_name}</p>
    </div>
  )
}
