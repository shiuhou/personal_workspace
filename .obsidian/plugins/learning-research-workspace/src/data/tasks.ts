import type { App } from 'obsidian';

export interface TaskLine { line:number; raw:string; text:string; done:boolean }
/** Plain Markdown checkboxes, including nested lists; fenced examples are not tasks. */
export function parseTasks(content:string):TaskLine[] {
  const tasks:TaskLine[]=[];let fence='';
  for(const [line,raw] of content.split(/\r?\n/).entries()) {
    const marker=raw.match(/^\s*(`{3,}|~{3,})/);
    if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length)fence='';continue;}
    if(fence)continue;
    const match=raw.match(/^\s*[-*+] \[([ xX])\]\s+(.+)$/);
    if(match)tasks.push({line,raw,text:match[2],done:match[1].toLowerCase()==='x'});
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
  constructor(private app:App,readonly path:string){}
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
  async toggle(task:TaskLine){const file=this.app.vault.getFileByPath(this.path);if(!file)throw new Error('待辦檔案已移動或刪除。');await this.app.vault.process(file,content=>toggleTask(content,task));}
}
export function progressValue(value:unknown):number|undefined {
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:undefined;
}
