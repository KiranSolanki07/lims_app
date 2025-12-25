import type { Profile } from "../types"

export default function AdminDashboard({ profile }: { profile: Profile }) {
  return (
    <div>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p>Welcome, {profile.first_name}</p>
    </div>
  )
}
