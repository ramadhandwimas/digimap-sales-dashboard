import DashboardV3 from "@/components/dashboard-v3"
import DashboardEnhancements from "@/components/dashboard-enhancements"
import DashboardFetchGuard from "@/components/dashboard-fetch-guard"
import DashboardStaffInline from "@/components/dashboard-staff-inline"

export default function Home() {
  return <DashboardFetchGuard>
    <DashboardV3 />
    <DashboardEnhancements />
    <DashboardStaffInline />
  </DashboardFetchGuard>
}
