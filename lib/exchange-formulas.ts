// The RAW report uses Indonesian-locale separators. Gross qty is retained in
// AT, gross amount in AU; AV is an item/price key and AW allocates the deduction
// across duplicate report lines exactly once.
export function rawExchangeFormulas(row:number){
 const r=row,n=r+1,p=r-1;
 const base=`IF(AND(ISNUMBER(T${n});T${n}>R${n});ROUNDUP(T${n}/R${n};0);IF((100-(T${n}/R${n})*100)>49;ROUNDUP((100/(100-(T${n}/R${n})*100)*T${n})/R${n};0);ROUNDDOWN((R${n}/T${n});0)))`;
 return{
  article:`=IFERROR(IF(AND(ISNUMBER(R${n});ISNUMBER(R${r}));E${p};IF(IF(ISNUMBER(T${r});"";IF(ISNUMBER(S${r});"";S${r}))=0;"";IF(ISNUMBER(T${r});"";IF(ISNUMBER(S${r});"";S${r}))));"")`,
  grossQty:`=IFERROR(${base};"")`,
  grossAmount:`=IF(OR(AT${r}="";AT${r}=0);"";IF(ISNUMBER(T${n});T${n};""))`,
  key:`=IF(OR(AT${r}="";AT${r}=0);"";TEXT(DATEVALUE(A${r});"yyyy-mm-dd")&"|"&B${r}&"|"&S${n}&"|"&UPPER(E${r})&"|"&SUBSTITUTE(TEXT(ROUND(AU${r}/AT${r};6);"0.000000");",";"."))`,
  deduction:`=IF(AV${r}="";"";LET(total;SUMIFS('Detail Exchange'!$N$2:$N;'Detail Exchange'!$Q$2:$Q;AV${r};'Detail Exchange'!$D$2:$D;"CONFIRMED");IF(total<=0;0;MIN(AT${r};MAX(0;total-(SUMIF($AV$3:AV${r};AV${r};$AT$3:AT${r})-AT${r}))))))`,
  qty:`=IF(AT${r}="";"";IF(OR(COUNTIF($Y$2:$Y;S${n})>0;COUNTIFS('Exchange Monthly Archive'!$A$2:$A;TEXT(DATEVALUE(A${r});"yyyy-mm");'Exchange Monthly Archive'!$B$2:$B;TO_TEXT(S${n}))>0);0;MAX(0;AT${r}-AW${r})))`,
  amount:`=IF(OR(H${r}="";H${r}=0);"";ROUND(AU${r}*H${r}/AT${r};2))`,
 };
}
export const grossSalesFormula=`=IFNA(QUERY(HSTACK('RAW SalesPerson'!A2:G65535;'RAW SalesPerson'!AT2:AU65535;'RAW SalesPerson'!J2:Q65535);"select * where Col8 > 0";0);"")`;
