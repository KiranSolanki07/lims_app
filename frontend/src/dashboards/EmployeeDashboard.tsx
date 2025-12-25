import type { DashboardProfile } from "../types"

type Props = {
  profile: DashboardProfile
}

export default function EmployeeDashboard({ profile }: Props) {
  return (
    <div>
      <h1>Employee Dashboard</h1>
      <p>Welcome, {profile.first_name}</p>
    </div>
  )
}