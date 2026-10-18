const DAY=86_400_000;
const dateFormatter=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"});

export function isStokanPosition(position:unknown){
 const role=String(position??"").toUpperCase().replace(/[^A-Z]/g,"");
 return ["SALESASSISTANT","SA","STORETRAINER","SALESTRAINEE","ST","MANAGEMENTTRAINEE","MT"].includes(role);
}

function fiscalYearEnd(year:number){
 const last=new Date(Date.UTC(year,8,30));
 last.setUTCDate(30-(last.getUTCDay()+1)%7);
 return last.getTime();
}

// Apple fiscal years end on September's last Saturday. The extra week in a
// 53-week year belongs to Q1; all remaining quarters have 13 weeks.
export function currentStokanContext(now:Date=new Date()){
 const stockDate=dateFormatter.format(now),day=new Date(`${stockDate}T00:00:00Z`).getTime(),year=Number(stockDate.slice(0,4));
 const fiscalYear=day<=fiscalYearEnd(year)?year:year+1;
 const start=fiscalYearEnd(fiscalYear-1)+DAY,totalWeeks=Math.round((fiscalYearEnd(fiscalYear)+DAY-start)/(7*DAY));
 const elapsed=Math.floor((day-start)/(7*DAY)),firstQuarterWeeks=totalWeeks-39;
 const quarter=elapsed<firstQuarterWeeks?1:2+Math.floor((elapsed-firstQuarterWeeks)/13);
 const week=elapsed<firstQuarterWeeks?elapsed+1:(elapsed-firstQuarterWeeks)%13+1;
 return{stockDate,period:`Week ${week} Q${quarter}`,week,quarter,fiscalYear};
}
