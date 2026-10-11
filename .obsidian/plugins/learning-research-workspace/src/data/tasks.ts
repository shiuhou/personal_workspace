import type { App } from 'obsidian';

export interface TaskLine { line:number; raw:string; text:string; done:boolean; id?:string; priority?:string; due?:string; suggested?:boolean }
export function taskFields(text:string){
  const id=text.match(/\s\^(task-[a-zA-Z0-9-]+)\s*$/)?.[1];
  const priority=text.match(/\[priority:: (high|normal|low)\]/)?.[1];
  const due=text.match(/\[due:: (\d{4}-\d{2}-\d{2})\]/)?.[1];
  const suggested=text.includes('[state:: suggested]');
  return {id,priority,due,suggested,text:text.replace(/\s*\[priority:: (?:high|normal|low)\]/g,'').replace(/\s*\[due:: \d{4}-\d{2}-\d{2}\]/g,'').replace(/\s*\[state:: suggested\]/g,'').replace(/\s\^task-[a-zA-Z0-9-]+\s*$/,'').trim()};
}
export function editTask(content:string,task:TaskLine,values:{text:string;priority?:string;due?:string;suggested?:boolean;id?:string}){
  if(!values.text.trim()||/[\r\n]/.test(values.text))throw new Error('請輸入一行待辦。');
  const lines=content.split('\n');if(lines[task.line]?.replace(/\r$/,'')!==task.raw)throw new Error('待辦已被其他編輯更新，請重新查看。');
  const prefix=task.raw.match(/^(\s*[-*+] \[[ xX]\]\s+)/)![1];
  // Preserve unknown inline fields/links by editing the display text, not the entire document.
  lines[task.line]=prefix+values.text.trim()+(values.priority?' [priority:: '+values.priority+']':'')+(values.due?' [due:: '+values.due+']':'')+(values.suggested?' [state:: suggested]':'')+((values.id||task.id)?' ^'+(values.id||task.id):'')+(content.split('\n')[task.line].endsWith('\r')?'\r':'');
  return lines.join('\n');
}
/** Plain Markdown checkboxes, including nested lists; fenced examples are not tasks. */
export function parseTasks(content:string):TaskLine[] {
  const tasks:TaskLine[]=[];let fence='';
  for(const [line,raw] of content.split(/\r?\n/).entries()) {
    const marker=raw.match(/^\s*(`{3,}|~{3,})/);
    if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length)fence='';continue;}
    if(fence)continue;
    const match=raw.match(/^\s*[-*+] \[([ xX])\]\s+(.+)$/);
    if(match)tasks.push({line,raw,...taskFields(match[2]),done:match[1].toLowerCase()==='x'});
  }
  return tasks;
}
export function toggleTask(content:string,task:TaskLine):string {
  const lines=content.split('\n');
  if(lines[task.line]?.replace(/\r$/,'')!==task.raw)throw new Error('待辦已被其他編輯更新，請重新查看後再勾選。');
  lines[task.line]=lines[task.line].replace(/\[([ xX])\]/,task.done?'[ ]':'[x]');
  return lines.join('\n');
}
export function appendTask(content:string,text:string):string {
  const title=text.trim();
  if(!title||/[\r\n]/.test(title))throw new Error('請輸入一行待辦；多行內容可開啟原始清單編輯。');
  return content+(content.endsWith('\n')?'':'\n')+'- [ ] '+title+'\n';
}
export class TaskStore {
  constructor(private app:App,private preferredPath:string){}
  get path(){
    if(this.app.vault.getFileByPath(this.preferredPath))return this.preferredPath;
    const root=this.preferredPath.slice(0,this.preferredPath.lastIndexOf('/')+1);
    const candidates=this.app.vault.getMarkdownFiles().filter(file=>file.path.startsWith(root)&&this.app.metadataCache.getFileCache(file)?.frontmatter?.kind==='tasks');
    if(candidates.length>1)throw new Error('找到多份 tasks 清單，請核對檔案；未建立另一份待辦。');
    return candidates[0]?.path||this.preferredPath;
  }
  async read(){const file=this.app.vault.getFileByPath(this.path);return file?this.app.vault.read(file):'';}
  async add(text:string){
    // Validate before creating a file. Vault.process protects concurrent body edits.
    appendTask('',text);
    let file=this.app.vault.getFileByPath(this.path);
    if(!file){
      const parts=this.path.split('/');parts.pop();let folder='';
      for(const part of parts){folder=folder?folder+'/'+part:part;if(!this.app.vault.getAbstractFileByPath(folder))await this.app.vault.createFolder(folder);}
      try {file=await this.app.vault.create(this.path,'---\ntype: note\nkind: tasks\n---\n# 待辦 Tasks\n\n');}
      catch(error){file=this.app.vault.getFileByPath(this.path);if(!file)throw error;}
    }
    await this.app.vault.process(file,content=>appendTask(content,text));
  }
  async edit(task:TaskLine,values:Parameters<typeof editTask>[2]){const file=this.app.vault.getFileByPath(this.path);if(!file)throw new Error('待辦檔案已移動或刪除。');await this.app.vault.process(file,content=>editTask(content,task,values));}
  async identify(task:TaskLine){
    if(task.id){const current=parseTasks(await this.read()).find(t=>t.id===task.id);if(!current||current.raw!==task.raw)throw new Error('待辦已在其他位置修改或刪除，請重新開啟。');return current;}
    const id='task-'+crypto.randomUUID().replace(/-/g,'').slice(0,12);await this.edit(task,{...task,id});
    return parseTasks(await this.read()).find(t=>t.id===id)!;
  }
  async toggle(task:TaskLine){const file=this.app.vault.getFileByPath(this.path);if(!file)throw new Error('待辦檔案已移動或刪除。');await this.app.vault.process(file,content=>toggleTask(content,task));}
}
export function progressValue(value:unknown):number|undefined {
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:undefined;
}
