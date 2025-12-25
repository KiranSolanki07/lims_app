import type { Profile } from "../types"

export default function EmployeeDashboard({ profile }: { profile: Profile }) {
  return (
    <div>
      <h1>Employee Dashboard</h1>
      <p>Welcome, {profile.first_name}</p>
    </div>
  )
}
