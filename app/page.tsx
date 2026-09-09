import DashboardV3 from "@/components/dashboard-v3"
import DashboardFetchGuard from "@/components/dashboard-fetch-guard"
import InlineDashboardViews from "@/components/inline-dashboard-views"
import M238AppleUI from "@/components/m238-apple-ui"
import DailySalesAlerts from "@/components/daily-sales-alerts"
import M238SettingsEnhancer from "@/components/m238-settings-enhancer"
import ManualTargetFocus from "@/components/manual-target-focus"

export default function Home() {
  return <DashboardFetchGuard>
    <DashboardV3 />
    <InlineDashboardViews />
    <M238AppleUI />
    <DailySalesAlerts />
    <M238SettingsEnhancer />
    <ManualTargetFocus />
  </DashboardFetchGuard>
}
