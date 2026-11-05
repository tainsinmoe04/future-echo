export const LIVE_CONNECTION_KEY = "future-echo.live-connection.v1";
export interface LiveConnectionConsent { identityId:string; userId:string; provider:"SEA-LION"|"Gemini" }
export function parseLiveConnectionConsent(raw:string|null):LiveConnectionConsent|null {
  if(!raw||raw.length>1024)return null;
  try{const v=JSON.parse(raw);return v&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).every(k=>["identityId","userId","provider"].includes(k))&&typeof v.identityId==="string"&&/^[A-Za-z0-9_-]{1,160}$/.test(v.identityId)&&typeof v.userId==="string"&&/^[0-9a-f-]{36}$/i.test(v.userId)&&["SEA-LION","Gemini"].includes(v.provider)?v:null;}catch{return null;}
}
