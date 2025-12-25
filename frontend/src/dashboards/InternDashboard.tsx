import type { DashboardProfile } from "../types"

type Props = {
  profile: DashboardProfile
}

export default function InternDashboard({ profile }: Props) {
  return (
    <div>
      <h1>Intern Dashboard</h1>
      <p>Welcome, {profile.first_name}</p>
    </div>
  )
}
