import {NextRequest,NextResponse} from "next/server";

/**
 * Guard the weekly-reason Q4 -> Q1 rollover at the request boundary.
 *
 * The current client can temporarily ask for the same week on both sides when
 * Week 1 Q1 follows Week 13 Q4. Until all clients use the API's chronological
 * week metadata, normalize that invalid comparison here so every weekly data
 * endpoint receives the correct previous week.
 */
export function middleware(request:NextRequest){
  const url=request.nextUrl.clone();
  const from=url.searchParams.get("from")?.trim()||"";
  const to=url.searchParams.get("to")?.trim()||"";

  if(from===to && /^Week\s*1\s*Q1$/i.test(to)){
    url.searchParams.set("from","Week 13 Q4");
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config={
  matcher:[
    "/api/weekly",
    "/api/weekly-reason-metrics",
  ],
};
