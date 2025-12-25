import type { Profile } from "../types"

export default function InternDashboard({ profile }: { profile: Profile }) {
  return (
    <div>
      <h1>Intern Dashboard</h1>
      <p>Welcome, {profile.first_name}</p>
    </div>
  )
}
