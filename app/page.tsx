import DashboardV3 from "@/components/dashboard-v3"
import DashboardEnhancements from "@/components/dashboard-enhancements"
import DashboardFetchGuard from "@/components/dashboard-fetch-guard"
import InlineDashboardViews from "@/components/inline-dashboard-views"
import StaffPerformanceRange from "@/components/staff-performance-range"
import CvrEnhancer from "@/components/cvr-enhancer"
import M238AppleUI from "@/components/m238-apple-ui"
import M238RevisionSep8 from "@/components/m238-revision-sep8"
import M238VasInlineFormat from "@/components/m238-vas-inline-format"
import DailySalesAlerts from "@/components/daily-sales-alerts"
import OverviewFilterResync from "@/components/overview-filter-resync"
import M238SettingsEnhancer from "@/components/m238-settings-enhancer"
import ManualTargetFocus from "@/components/manual-target-focus"

export default function Home() {
  return <DashboardFetchGuard>
    <DashboardV3 />
    <DashboardEnhancements />
    <InlineDashboardViews />
    <StaffPerformanceRange />
    <CvrEnhancer />
    <M238AppleUI />
    <M238RevisionSep8 />
    <M238VasInlineFormat />
    <DailySalesAlerts />
    <OverviewFilterResync />
    <M238SettingsEnhancer />
    <ManualTargetFocus />
  </DashboardFetchGuard>
}
