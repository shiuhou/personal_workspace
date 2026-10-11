import type { WorkspaceSettings } from '../domain';
import { PortableStore, Snapshot, newId } from './portable';
import { rangeValid } from './dates';
export interface Arrangement extends Snapshot {title:string;start:string;end:string;timezone:string;task:string;projects:string[];course:string;archived:boolean}
export function arrangement(snapshot:Snapshot):Arrangement {
  const {fm}=snapshot;
  if(typeof fm.start!=='string'||typeof fm.end!=='string'||!rangeValid(fm.start,fm.end)||typeof fm.title!=='string')throw new Error(`${snapshot.path}：安排缺少有效 title/start/end。`);
  return {...snapshot,title:fm.title,start:fm.start,end:fm.end,timezone:String(fm.timezone??'UTC'),task:String(fm.task??''),projects:Array.isArray(fm.projects)?fm.projects.filter(v=>typeof v==='string'):[],course:String(fm.course??''),archived:fm.status==='archived'};
}
export class CalendarStore {
  constructor(readonly files:PortableStore,private settings:()=>WorkspaceSettings){}
  async list(){const data=await this.files.list('schedule');const items:Arrangement[]=[];for(const snapshot of data.items){try{items.push(arrangement(snapshot));}catch(e){data.errors.push(String(e));}}return {items,errors:data.errors};}
  async save(values:{title:string;start:string;end:string;timezone:string;task?:string;projects?:string[];course?:string},body:string,snapshot?:Snapshot,id=newId()){
    if(!values.title.trim()||!rangeValid(values.start,values.end))throw new Error('請填標題，結束時間須晚於開始時間。');
    const fm={...values,title:values.title.trim(),kind:'schedule'};
    return arrangement(snapshot?await this.files.update(snapshot,fm,body):await this.files.create(`${this.settings().folders.note}/Schedule`,values.title,fm,body,id));
  }
  async archive(snapshot:Snapshot){return this.files.update(snapshot,{status:'archived'});}
  async restore(snapshot:Snapshot){return this.files.update(snapshot,{status:undefined});}
  async duplicate(item:Arrangement){return arrangement(await this.files.create(`${this.settings().folders.note}/Schedule`,item.title+'（副本）',{...item.fm,created:new Date().toISOString(),title:item.title+'（副本）'},item.body,newId()));}
}
/** Connected overlap groups share a column count, so intersecting items never cover each other. */
export function layoutEvents<T extends {path:string;start:string;end:string}>(events:T[]){
  const sorted=[...events].sort((a,b)=>a.start.localeCompare(b.start)||a.path.localeCompare(b.path));
  const result=new Map<string,{column:number;columns:number}>();let group:T[]=[],end=0;
  const flush=()=>{group.forEach((e,i)=>result.set(e.path,{column:i,columns:group.length}));group=[];};
  for(const event of sorted){if(group.length&&Date.parse(event.start)>=end)flush();group.push(event);end=Math.max(group.length===1?0:end,Date.parse(event.end));}flush();return result;
}
