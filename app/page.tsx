import DashboardV3 from "@/components/dashboard-v3"
import DashboardEnhancements from "@/components/dashboard-enhancements"
import DashboardFetchGuard from "@/components/dashboard-fetch-guard"
import InlineDashboardViews from "@/components/inline-dashboard-views"
import StaffPerformanceRange from "@/components/staff-performance-range"
import CvrEnhancer from "@/components/cvr-enhancer"
import M238AppleUI from "@/components/m238-apple-ui"
import M238VasInlineFormat from "@/components/m238-vas-inline-format"
import DailySalesAlerts from "@/components/daily-sales-alerts"
import M238SettingsEnhancer from "@/components/m238-settings-enhancer"
import M238ThemePersistence from "@/components/m238-theme-persistence"
import M238StokanMenu from "@/components/m238-stokan-menu"
import ManualTargetFocus from "@/components/manual-target-focus"
import StaffPerformanceLiveEnhancer from "@/components/staff-performance-live-enhancer"

export default function Home() {
  return <DashboardFetchGuard>
    <DashboardV3 />
    <DashboardEnhancements />
    <InlineDashboardViews />
    <StaffPerformanceRange />
    <CvrEnhancer />
    <M238AppleUI />
    <M238VasInlineFormat />
    <DailySalesAlerts />
    <M238SettingsEnhancer />
    <M238ThemePersistence />
    <M238StokanMenu />
    <ManualTargetFocus />
    <StaffPerformanceLiveEnhancer />
  </DashboardFetchGuard>
}
