import DashboardV3 from "@/components/dashboard-v3"
import DashboardEnhancements from "@/components/dashboard-enhancements"
import DashboardFetchGuard from "@/components/dashboard-fetch-guard"
import InlineDashboardViews from "@/components/inline-dashboard-views"
import StaffPerformanceRange from "@/components/staff-performance-range"
import CvrEnhancer from "@/components/cvr-enhancer"
import M238AppleUI from "@/components/m238-apple-ui"
import M238BusinessEnhancer from "@/components/m238-business-enhancer"
import M238RevisionSep8 from "@/components/m238-revision-sep8"

export default function Home() {
  return <DashboardFetchGuard>
    <DashboardV3 />
    <DashboardEnhancements />
    <InlineDashboardViews />
    <StaffPerformanceRange />
    <CvrEnhancer />
    <M238AppleUI />
    <M238BusinessEnhancer />
    <M238RevisionSep8 />
  </DashboardFetchGuard>
}
