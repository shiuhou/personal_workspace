import { Component, MarkdownRenderer, Modal, Notice } from 'obsidian';
import type { WorkspaceHost } from '../contracts';
import { parseTasks, TaskLine, TaskStore } from '../data/tasks';
import { wiki } from '../data/portable';
import { validDay } from '../data/dates';
import { button, empty } from './components';
import { field, select, submit, copyText } from './fields';
import { RecordModal } from './records';
export class TaskModal extends Modal {
  constructor(private host:WorkspaceHost,private store:TaskStore,private task:TaskLine){super(host.app);this.setTitle('待辦詳情');}
  onOpen(){
    this.contentEl.addClass('lr-modal');const title=field(this.contentEl,'內容（可含 Wikilinks）',this.task.text);
    const priority=select(this.contentEl,'優先級',[['','未指定'],['high','優先'],['normal','一般'],['low','稍後']],this.task.priority||'');
    const due=field(this.contentEl,'日期（選填）',this.task.due||'','date');
    this.contentEl.createEl('p',{cls:'lr-muted',text:this.task.suggested?'AI 候選事項，採納前不會排入日曆。':'完成狀態由清單核取方塊決定；安排時間不會完成待辦。'});
    const tools=this.contentEl.createDiv({cls:'lr-modal-actions'});
    button(tools,'開啟原始清單',()=>this.host.openFile(this.store.path),{icon:'file-pen-line'});
    button(tools,'複製任務連結',async()=>{this.task=await this.store.identify(this.task);await copyText(wiki(this.store.path,this.task.id));new Notice('已複製任務連結。');});
    button(tools,'新增相關記錄',async()=>{this.task=await this.store.identify(this.task);new RecordModal(this.host,{task:wiki(this.store.path,this.task.id)}).open();});
    if(this.task.id){
      const target=wiki(this.store.path,this.task.id);const linked=this.host.index.all().filter(e=>e.links.some(l=>l.includes('#^'+this.task.id)));
      if(linked.length){this.contentEl.createEl('h3',{text:'明確相關的安排與記錄'});for(const entry of linked)button(this.contentEl,entry.name,()=>this.host.openFile(entry.path),{cls:'lr-quiet',title:target+' · '+entry.path});}
    }
    submit(this,this.task.suggested?'採納並儲存':'儲存',async()=>{
      if(due.value&&!validDay(due.value))throw new Error('日期格式錯誤。');
      await this.store.edit(this.task,{text:title.value,priority:priority.value,due:due.value,suggested:false});this.close();new Notice('已儲存待辦。');
    });title.focus();
  }
  onClose(){this.contentEl.empty();}
}
export interface TaskPanelOptions {component:Component;alive:()=>boolean;project?:string;compact?:boolean;draft:{text:string;query?:string;mode?:string};}
export function renderTaskPanel(parent:HTMLElement,host:WorkspaceHost,options:TaskPanelOptions){
  const store=new TaskStore(host.app,`${host.settings.folders.note}/Tasks.md`);
  const form=parent.createDiv({cls:'lr-task-capture'});
  const input=form.createEl('input',{cls:'lr-task-input',attr:{type:'text',placeholder:'一句話新增待辦…','aria-label':'新增待辦內容'}});input.value=options.draft.text;input.addEventListener('input',()=>options.draft.text=input.value);
  const error=parent.createDiv({cls:'lr-form-error',attr:{role:'alert'}});
  const add=button(form,'新增待辦',async()=>{if(add.disabled)return;add.disabled=true;try{await store.add(input.value+(options.project?' '+wiki(options.project):''));options.draft.text='';input.value='';await draw();}catch(e){error.setText(String(e));}finally{add.disabled=false;}},{icon:'plus',cls:'lr-primary'});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();add.click();}});
  const tools=parent.createDiv({cls:'lr-task-tools'});
  const search=tools.createEl('input',{cls:'lr-search-input',attr:{type:'search',placeholder:'查找待辦','aria-label':'查找待辦'}});
  search.value=options.draft.query||'';
  const mode=select(tools,'狀態',[['open','未完成'],['all','含已完成'],['suggested','AI 候選']],options.draft.mode||'open');
  button(tools,'原始清單',async()=>{if(!host.app.vault.getFileByPath(store.path))throw new Error('新增第一項待辦後才建立清單。');await host.openFile(store.path);},{cls:'lr-quiet'});
  const list=parent.createDiv();let generation=0;let limit=options.compact?6:30;
  const draw=async()=>{const current=++generation;try{
    const content=await store.read();if(!options.alive()||current!==generation)return;
    let tasks=parseTasks(content).filter(t=>mode.value==='suggested'?t.suggested:!t.suggested&&(mode.value==='all'||!t.done));
    if(options.project)tasks=tasks.filter(t=>[...t.text.matchAll(/\[\[([^\]]+)\]\]/g)].some(m=>host.index.resolve(m[0],store.path)?.path===options.project));
    tasks=tasks.filter(t=>t.text.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()));
    tasks.sort((a,b)=>(a.priority==='high'?0:1)-(b.priority==='high'?0:1)||(a.due||'9999').localeCompare(b.due||'9999')||a.line-b.line);
    list.empty();if(!tasks.length){empty(list,'list-checks','目前沒有符合的待辦','待辦在同一份 Markdown 中保存；候選建議需先採納。');return;}
    for(const task of tasks.slice(0,limit)){
      const row=list.createDiv({cls:`lr-task-row ${task.done?'is-done':''}`});
      const check=row.createEl('input',{attr:{type:'checkbox','aria-label':`${task.done?'重新開啟':'完成'} ${task.text}`}});check.checked=task.done;check.disabled=!!task.suggested;
      const text=row.createDiv({cls:'lr-task-text'});void MarkdownRenderer.render(host.app,task.text,text,store.path,options.component);
      const meta=text.createDiv({cls:'lr-row-meta',text:[task.priority==='high'?'優先':'',task.due||'',task.suggested?'候選':''].filter(Boolean).join(' · ')});
      if(!meta.textContent)meta.remove();
      button(row,task.suggested?'檢視／採納':'詳情',()=>new TaskModal(host,store,task).open(),{cls:'lr-quiet'});
      check.addEventListener('change',()=>{void (async()=>{check.disabled=true;try{await store.toggle(task);await draw();}catch(e){check.checked=task.done;error.setText(String(e));}finally{check.disabled=false;}})();});
    }
    if(tasks.length>limit)button(list,'顯示更多',()=>{limit+=30;return draw();},{cls:'lr-quiet'});
  }catch(e){error.setText(String(e));}};
  search.addEventListener('input',()=>{options.draft.query=search.value;void draw();});mode.addEventListener('change',()=>{options.draft.mode=mode.value;void draw();});void draw();
}
