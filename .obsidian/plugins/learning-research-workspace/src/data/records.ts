import type { WorkspaceSettings } from '../domain';
import { PortableStore, Snapshot, newId, wiki } from './portable';
import { validDay } from './dates';
export const RECORD_HEADINGS=['目標','過程','結果','未來計劃'] as const;
export function recordBody(raw:string){
  // Existing four-section text remains exactly as supplied; no inference/model is involved.
  const structured=RECORD_HEADINGS.every(label=>new RegExp(`^## ${label}(?: |$)`,'m').test(raw));
  const draft=structured?raw:RECORD_HEADINGS.map(label=>`## ${label}\n\n${label==='過程'?raw:''}`).join('\n\n');
  return `${draft}\n\n<details>\n<summary>原始輸入（保留）</summary>\n\n<!-- lr:raw-start -->\n${raw}\n<!-- lr:raw-end -->\n\n</details>\n`;
}
export function sectionText(body:string,label:string){
  const draft=body.split('<!-- lr:raw-start -->')[0].split('<details>')[0];
  const matches=[...draft.matchAll(/^## (.+)\r?$/gm)];
  const index=matches.findIndex(m=>m[1]===label||m[1].startsWith(label+' '));
  if(index<0)return '';const match=matches[index];return draft.slice(match.index!+match[0].length,index+1<matches.length?matches[index+1].index:draft.length).trim();
}
export function continuation(snapshot:Snapshot){return {result:sectionText(snapshot.body,'結果'),next:sectionText(snapshot.body,'未來計劃'),goal:sectionText(snapshot.body,'目標')};}
export function diaryPreview(day:string,records:Snapshot[]){
  const selected=records.filter(r=>r.fm.date===day&&r.fm.status!=='archived').sort((a,b)=>String(a.fm.created).localeCompare(String(b.fm.created)));
  if(!selected.length)return `# ${day} 日記\n\n尚未記錄。\n`;
  return `# ${day} 日記\n\n> 由已有記錄按段落組合，未經模型分析。\n\n`+RECORD_HEADINGS.map(label=>`## ${label}\n\n`+selected.map(r=>{const value=sectionText(r.body,label);return value?`### ${String(r.fm.title??r.path)}\n\n來源：${wiki(r.path)}\n\n${value}\n`:'';}).filter(Boolean).join('\n')).join('\n')+'\n';
}
export class RecordStore {
  constructor(readonly files:PortableStore,private settings:()=>WorkspaceSettings){}
  async capture(input:{title:string;raw:string;date:string;projects:string[];task:string;source:string;course?:string},id=newId()){
    if(!input.raw.trim())throw new Error('寫一句簡記或貼上內容即可。');if(!validDay(input.date))throw new Error('請選擇有效日期。');
    return this.files.create(`${this.settings().folders.note}/Records`,input.title||input.raw.trim().split('\n')[0].slice(0,50),{kind:'work-log',status:'draft',title:input.title||'工作記錄',date:input.date,projects:input.projects,task:input.task,source:input.source,course:input.course||undefined},recordBody(input.raw),id);
  }
  async diary(day:string,preview:string,snapshot?:Snapshot){
    if(!validDay(day))throw new Error('日期格式錯誤。');
    const path=`${this.settings().folders.note}/Journal/${day}.md`;
    if(snapshot)return this.files.update(snapshot,{},preview);
    if(this.files.app.vault.getFileByPath(path))throw new Error('日記已存在，請先開啟並讀取最新版。');
    // Fixed daily path; the stored diary is an editable compilation, not another task database.
    const {FileActions}=await import('./actions');await new FileActions(this.files.app,this.settings).ensureFolder(`${this.settings().folders.note}/Journal`);
    const {patchDocument}=await import('./portable');
    await this.files.app.vault.create(path,patchDocument({path,raw:'',fm:{},body:''},{type:'note',kind:'journal',date:day},preview));
    return this.files.read(path);
  }
}
