import DashboardV3 from "@/components/dashboard-v3"
import SettingsGuard from "@/components/settings-guard"

export default function Home() {
  return <>
    <DashboardV3 />
    <SettingsGuard />
  </>
}
