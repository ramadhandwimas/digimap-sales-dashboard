import DashboardV3 from "@/components/dashboard-v3"
import DashboardEnhancements from "@/components/dashboard-enhancements"
import DashboardFetchGuard from "@/components/dashboard-fetch-guard"
import InlineDashboardViews from "@/components/inline-dashboard-views"
import StaffPerformanceRange from "@/components/staff-performance-range"

export default function Home() {
  return <DashboardFetchGuard>
    <DashboardV3 />
    <DashboardEnhancements />
    <InlineDashboardViews />
    <StaffPerformanceRange />
  </DashboardFetchGuard>
}
