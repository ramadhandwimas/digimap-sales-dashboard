import SpvWorkspace from "@/components/spv-workspace";
import {cookies} from "next/headers";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import "./petty-cash.css";
import "./spv.css";
export default async function SpvPage(){
 const session=verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
 return <SpvWorkspace initialAllowed={Boolean(session?.isSpv)}/>;
}
