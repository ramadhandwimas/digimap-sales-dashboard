export type PresentationWeek={label:string;year:string;firstDate:string};
export const presentationWeekId=(week:PresentationWeek)=>`${week.year}|${week.label}`;
export function presentationMonthWeeks(weeks:PresentationWeek[],period:string){return weeks.filter(week=>week.firstDate.slice(0,7)===period).sort((a,b)=>a.firstDate.localeCompare(b.firstDate))}
export function presentationDefaultWeeks(weeks:PresentationWeek[],period:string){const sorted=[...weeks].sort((a,b)=>a.firstDate.localeCompare(b.firstDate)),current=presentationMonthWeeks(sorted,period).at(-1);if(!current)return null;const index=sorted.findIndex(w=>presentationWeekId(w)===presentationWeekId(current)),previous=sorted[index-1];return previous?{previous,current}:null}
export function presentationCompareUrl(previous:PresentationWeek,current:PresentationWeek){const params=new URLSearchParams({from:previous.label,to:current.label,fromYear:previous.year,toYear:current.year});return `/api/weekly-stable?${params}`}
