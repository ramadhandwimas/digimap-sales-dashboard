import Jakarta1DashboardV2 from "@/components/jakarta1-dashboard-v2";
import Jakarta1DailyFocus from "@/components/jakarta1-daily-focus";
import Jakarta1WeeklyM238 from "@/components/jakarta1-weekly-m238";
import Jakarta1Soh from "@/components/jakarta1-soh-v2";
import Jakarta1SohUpdateTrigger from "@/components/jakarta1-soh-update-trigger";

export default function Home(){
  return <><Jakarta1DashboardV2/><Jakarta1DailyFocus/><Jakarta1WeeklyM238/><Jakarta1Soh/><Jakarta1SohUpdateTrigger/><script src="/jakarta1-enhancer.js" defer /></>;
}
