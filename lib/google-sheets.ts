const TOKEN_URL="https://oauth2.googleapis.com/token"
const SCOPE="https://www.googleapis.com/auth/spreadsheets"
const TOKEN_TTL=50*60*1000

type TokenCache={email:string;accessToken:string;expiresAt:number}
let tokenCache:TokenCache|undefined
let tokenRequest:Promise<string>|undefined

function base64Url(input:string|Uint8Array){const raw=typeof input==="string"?new TextEncoder().encode(input):input;let binary="";raw.forEach(byte=>{binary+=String.fromCharCode(byte)});return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
function pemBuffer(pem:string){const clean=pem.replace(/\\n/g,"\n").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"");const binary=atob(clean);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes.buffer}

async function requestToken(email:string,privateKey:string){const now=Math.floor(Date.now()/1000);const header=base64Url(JSON.stringify({alg:"RS256",typ:"JWT"}));const claims=base64Url(JSON.stringify({iss:email,scope:SCOPE,aud:TOKEN_URL,exp:now+3600,iat:now}));const unsigned=`${header}.${claims}`;const key=await crypto.subtle.importKey("pkcs8",pemBuffer(privateKey),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);const signature=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(unsigned));const assertion=`${unsigned}.${base64Url(new Uint8Array(signature))}`;const response=await fetch(TOKEN_URL,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});if(!response.ok)throw new Error(`Google OAuth gagal (${response.status})`);return((await response.json())as{access_token:string}).access_token}

async function token(email:string,privateKey:string){
  const now=Date.now()
  if(tokenCache?.email===email&&tokenCache.expiresAt>now)return tokenCache.accessToken
  if(tokenRequest)return tokenRequest
  tokenRequest=requestToken(email,privateKey).then(accessToken=>{
    tokenCache={email,accessToken,expiresAt:Date.now()+TOKEN_TTL}
    return accessToken
  }).finally(()=>{tokenRequest=undefined})
  return tokenRequest
}

export async function getSheetRanges(id:string,ranges:string[],email:string,privateKey:string){const access=await token(email,privateKey);const url=new URL(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchGet`);ranges.forEach(range=>url.searchParams.append("ranges",range));url.searchParams.set("valueRenderOption","UNFORMATTED_VALUE");const response=await fetch(url,{headers:{authorization:`Bearer ${access}`},cache:"no-store"});if(!response.ok)throw new Error(`Google Sheets gagal (${response.status})`);const json=await response.json()as{valueRanges?:Array<{values?:unknown[][]}>};return(json.valueRanges??[]).map(x=>x.values??[])}

export async function clearAndWrite(id:string,clearRange:string|null,writeRange:string,values:unknown[][],email:string,privateKey:string,valueInputOption:"RAW"|"USER_ENTERED"="USER_ENTERED"){
  const access=await token(email,privateKey),headers={authorization:`Bearer ${access}`,"content-type":"application/json"}
  const clearRequest=clearRange?fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(clearRange)}:clear`,{method:"POST",headers,body:"{}"}):Promise.resolve(null)
  const writeRequest=fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(writeRange)}?valueInputOption=${valueInputOption}`,{method:"PUT",headers,body:JSON.stringify({range:writeRange,majorDimension:"ROWS",values})})
  const[cleared,written]=await Promise.all([clearRequest,writeRequest])
  if(cleared&&!cleared.ok)throw new Error(`Gagal membersihkan data lama (${cleared.status})`)
  if(!written.ok)throw new Error(`Gagal mengunggah SPW (${written.status})`)
  return written.json()
}

export async function appendSheetValues(id:string,range:string,values:unknown[][],email:string,privateKey:string){
  const access=await token(email,privateKey)
  const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=OVERWRITE`,{method:"POST",headers:{authorization:`Bearer ${access}`,"content-type":"application/json"},body:JSON.stringify({range,majorDimension:"ROWS",values})})
  if(!response.ok)throw new Error(`Gagal menyimpan invoice (${response.status})`)
  return response.json()
}
