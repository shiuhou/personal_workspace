/** Civil dates are independent of the machine's locale and OS. Instants use ISO UTC. */
export function validZone(zone:string){try{new Intl.DateTimeFormat('en',{timeZone:zone}).format();return true;}catch{return false;}}
export function localStamp(instant:string|number,zone:string):string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
  const get=(name:string)=>parts.find(p=>p.type===name)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function validDay(day:string){return /^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;}
export function shiftDay(day:string,n:number){if(!validDay(day))throw new Error('日期格式錯誤。');const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10);}
export function weekStart(day:string){const dow=new Date(day+'T12:00:00Z').getUTCDay();return shiftDay(day,-((dow+6)%7));}
export function clock(minutes:number){return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
export function minuteOf(stamp:string){return Number(stamp.slice(11,13))*60+Number(stamp.slice(14,16));}
export function snapMinute(value:number){return Math.max(0,Math.min(1425,Math.round(value/15)*15));}
/** Reject DST gaps/ambiguous times instead of silently shifting an arrangement. */
export function toInstant(stamp:string,zone:string):string {
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(stamp)||!validDay(stamp.slice(0,10))||minuteOf(stamp)>1439||Number(stamp.slice(14,16))>59||!validZone(zone))throw new Error('請使用有效日期、時間及 IANA 時區。');
  const naive=Date.parse(stamp+'Z'),offsets=new Set<number>();
  for(const delta of [-36,-12,0,12,36]){const time=naive+delta*3600000;offsets.add(Date.parse(localStamp(time,zone)+'Z')-time);}
  const candidates=[...offsets].map(offset=>naive-offset).filter(time=>localStamp(time,zone)===stamp);
  if(candidates.length!==1)throw new Error('此時間遇到夏令時間跳轉或重複，請選擇無歧義的時間；原安排未更改。');
  return new Date(candidates[0]).toISOString();
}
export function rangeValid(start:string,end:string){return Number.isFinite(Date.parse(start))&&Number.isFinite(Date.parse(end))&&Date.parse(end)>Date.parse(start);}
export function overlaps(a:{start:string;end:string},b:{start:string;end:string}){return Date.parse(a.start)<Date.parse(b.end)&&Date.parse(b.start)<Date.parse(a.end);}
