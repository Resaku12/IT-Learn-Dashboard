export const isoToday=()=>new Date().toISOString().slice(0,10);
export const germanDate=(value:string)=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value+'T12:00:00'));
export const daysUntil=(value:string)=>Math.ceil((new Date(value+'T12:00:00').getTime()-Date.now())/86400000);
export const weekNumber=(d=new Date())=>{const date=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));date.setUTCDate(date.getUTCDate()+4-(date.getUTCDay()||7));const start=new Date(Date.UTC(date.getUTCFullYear(),0,1));return Math.ceil((((date.getTime()-start.getTime())/86400000)+1)/7)};
export const statusWeight={not_started:0,learning:35,review:70,confident:100} as const;
