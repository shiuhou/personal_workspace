import { Component, MarkdownRenderer, Modal, Notice } from 'obsidian';
import type { WorkspaceHost } from '../contracts';
import { PortableStore, Snapshot, newId, wiki } from '../data/portable';
import { RecordStore, continuation, diaryPreview } from '../data/records';
import { localStamp } from '../data/dates';
import { button, empty } from './components';
import { area, field, fold, submit, copyText, downloadMarkdown } from './fields';
import { relation } from './modals';
export interface RecordContext {projects?:string[];task?:string;source?:string;course?:string;raw?:string}
const filesFor=(host:WorkspaceHost)=>new PortableStore(host.app,()=>host.settings);
export class RecordModal extends Modal {
  private id=newId();
  constructor(private host:WorkspaceHost,private context:RecordContext={}){super(host.app);this.setTitle('留下工作記錄');}
  onOpen(){
    this.contentEl.addClass('lr-modal');this.contentEl.createEl('p',{cls:'lr-modal-intro',text:'一句簡記或長段對話都可以。原始輸入保留；一般文字放入「過程」，其餘段落留空，不猜測成果。'});
    const raw=area(this.contentEl,'原始輸入',this.context.raw||'',9);
    const more=fold(this.contentEl,'日期、關聯與來源 · 選填');const title=field(more,'標題');
    const date=field(more,'日期',localStamp(Date.now(),this.host.settings.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0,10),'date');
    let projects=[...(this.context.projects||[])],course=this.context.course||'';
    relation(more,this.host,'研究專案','project',projects,true,v=>projects=v);relation(more,this.host,'課程','course',course?[course]:[],false,v=>course=v[0]||'');
    const task=field(more,'任務連結（選填）',this.context.task||'');const source=field(more,'來源連結或 URL（未知留空）',this.context.source||'');
    submit(this,'保存草稿',async()=>{
      const record=await new RecordStore(filesFor(this.host),()=>this.host.settings).capture({title:title.value,raw:raw.value,date:date.value,projects,course,task:task.value,source:source.value},this.id);
      this.close();new Notice(`已保存：${record.path}`);
    });raw.focus();
  }
  onClose(){this.contentEl.empty();}
}
export class TextPreviewModal extends Modal {
  constructor(host:WorkspaceHost,title:string,private text:string){super(host.app);this.setTitle(title);}
  onOpen(){this.contentEl.addClass('lr-modal');const text=area(this.contentEl,'預覽／可選取複製',this.text,15);button(this.contentEl,'複製',async()=>{await copyText(text.value);new Notice('已複製。');});button(this.contentEl,'匯出 Markdown',()=>downloadMarkdown('工作記錄匯出',text.value,this.contentEl.ownerDocument));}
  onClose(){this.contentEl.empty();}
}
export class RecordDetailModal extends Modal {
  constructor(private host:WorkspaceHost,private snapshot:Snapshot){super(host.app);this.setTitle(String(snapshot.fm.title||'工作記錄'));}
  onOpen(){
    this.contentEl.addClass('lr-modal');const rawIndex=this.snapshot.body.indexOf('<details>\n<summary>原始輸入（保留）</summary>');
    const original=rawIndex<0?'':this.snapshot.body.slice(rawIndex);
    const draft=area(this.contentEl,'記錄正文',rawIndex<0?this.snapshot.body:this.snapshot.body.slice(0,rawIndex),14);
    if(original){const raw=fold(this.contentEl,'原始輸入與來源（保留）');const input=area(raw,'原文',original,5);input.readOnly=true;}
    const body=()=>draft.value+(original?'\n\n'+original:'');
    const tools=this.contentEl.createDiv({cls:'lr-modal-actions'});
    button(tools,'開啟原檔',()=>this.host.openFile(this.snapshot.path));
    const source=this.snapshot.fm.source;
    if(typeof source==='string'&&source){const f=this.host.index.resolve(source,this.snapshot.path);if(f)button(tools,'開啟來源',()=>this.host.openFile(f.path));else if(/^https?:\/\//i.test(source))tools.createEl('a',{text:'開啟來源 ↗',href:source,attr:{target:'_blank',rel:'noopener noreferrer'}});else this.contentEl.createEl('p',{cls:'lr-muted',text:'來源尚未找到：'+source});}
    button(tools,'複製整理指令',async()=>{await copyText(`請先讀取 ${this.snapshot.path} 和其中明確引用的來源。保留原始輸入與使用者修正，依目標、過程、結果、未來計劃增量整理；區分來源事實、使用者陳述與 AI 建議。不推斷完成率。修改前重讀，最後回報實際修改的檔案和待確認事項。\n\n${wiki(this.snapshot.path)}`);new Notice('已複製指令；尚未執行 AI。');});
    button(tools,'複製／匯出',()=>new TextPreviewModal(this.host,'匯出預覽',body()).open());
    submit(this,'儲存修正',async()=>{await filesFor(this.host).update(this.snapshot,{},body());this.close();new Notice('已儲存修正。');});
  }
  onClose(){this.contentEl.empty();}
}
export class DiaryModal extends Modal {
  private closed=false;
  constructor(private host:WorkspaceHost,private records:Snapshot[],private day:string){super(host.app);this.setTitle('日記 Journal');}
  onOpen(){
    this.contentEl.addClass('lr-modal');const date=field(this.contentEl,'日期',this.day,'date');
    this.contentEl.createEl('p',{cls:'lr-muted',text:'只組合此日期的已有工作記錄。已有日記會先載入修正內容；「重新組合」提供對照，需明確套用。'});
    const editor=area(this.contentEl,'日記（可編輯）','',15);
    const error=this.contentEl.createDiv({cls:'lr-form-error',attr:{role:'alert'}});
    let snapshot:Snapshot|undefined,loaded=false,generation=0,dirty=false;
    editor.addEventListener('input',()=>dirty=true);
    const load=async()=>{if(dirty){error.setText('目前有未保存修正，請先儲存或關閉再切換日期。');date.value=this.day;return;}
      loaded=false;const epoch=++generation;this.day=date.value;snapshot=undefined;
      try{const path=`${this.host.settings.folders.note}/Journal/${date.value}.md`;const old=this.app.vault.getFileByPath(path);const current=old?await filesFor(this.host).read(path):undefined;if(this.closed||epoch!==generation)return;snapshot=current;editor.value=current?.body||diaryPreview(date.value,this.records);loaded=true;error.empty();}catch(e){error.setText(String(e));}};
    date.addEventListener('change',()=>void load());void load();
    const tools=this.contentEl.createDiv({cls:'lr-modal-actions'});
    button(tools,'重新組合／對照',async()=>{const latest=await filesFor(this.host).list('work-log');if(latest.errors.length)throw new Error(latest.errors.join('\n'));this.records=latest.items;const proposed=diaryPreview(date.value,this.records);const modal=new TextPreviewModal(this.host,'重新組合預覽（尚未套用）',`<!-- 目前內容 -->\n${editor.value}\n\n<!-- 新組合 -->\n${proposed}`);modal.open();button(modal.contentEl,'套用新組合到草稿',()=>{editor.value=proposed;dirty=true;modal.close();new Notice('已套用到草稿，尚未保存。');});});
    button(tools,'複製',async()=>{await copyText(editor.value);new Notice('已複製日記。');});
    button(tools,'匯出 Markdown',()=>downloadMarkdown(date.value+' 日記',editor.value,this.contentEl.ownerDocument));
    submit(this,'儲存日記',async()=>{if(!loaded)throw new Error('日記仍在讀取。');snapshot=await new RecordStore(filesFor(this.host),()=>this.host.settings).diary(date.value,editor.value,snapshot);dirty=false;new Notice('日記已保存。');});
  }
  onClose(){this.closed=true;this.contentEl.empty();}
}
export function renderRecords(parent:HTMLElement,host:WorkspaceHost,component:Component,alive:()=>boolean,context?:string){
  const tools=parent.createDiv({cls:'lr-list-toolbar'});
  button(tools,'留下記錄',()=>new RecordModal(host,context?{projects:[wiki(context)]}:{}).open(),{icon:'notebook-pen',cls:'lr-primary'});
  const search=field(tools,'查找記錄');search.type='search';
  const day=field(tools,'日期範圍：從','','date'),until=field(tools,'至','','date');
  const list=parent.createDiv();const error=parent.createDiv({cls:'lr-form-error',attr:{role:'alert'}});let selected=new Set<string>();
  void (async()=>{try{
    const data=await filesFor(host).list('work-log');if(!alive())return;
    if(data.errors.length)error.setText(data.errors.join('\n'));
    let records=data.items.filter(r=>!context||(Array.isArray(r.fm.projects)&&r.fm.projects.some(value=>typeof value==='string'&&host.index.resolve(value,r.path)?.path===context)));
    button(tools,'日記',async()=>{const latest=await filesFor(host).list('work-log');if(latest.errors.length)throw new Error(latest.errors.join('\n'));new DiaryModal(host,latest.items,localStamp(Date.now(),host.settings.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0,10)).open();},{icon:'book-open'});
    button(tools,'預覽選定記錄',()=>{const chosen=records.filter(r=>selected.has(r.path));if(!chosen.length)throw new Error('請先勾選記錄。');new TextPreviewModal(host,'選定記錄匯出',chosen.map(r=>`來源：${wiki(r.path)}\n\n${r.body}`).join('\n\n---\n\n')).open();});
    const draw=()=>{list.empty();const filtered=records.filter(r=>r.fm.status!=='archived'&&(!day.value||String(r.fm.date)>=day.value)&&(!until.value||String(r.fm.date)<=until.value)&&[r.fm.title,r.body].join(' ').toLocaleLowerCase().includes(search.value.toLocaleLowerCase())).sort((a,b)=>String(b.fm.date).localeCompare(String(a.fm.date))||String(b.fm.created).localeCompare(String(a.fm.created)));
      if(!filtered.length){empty(list,'notebook-pen','尚無符合的記錄','貼一段文字即可保存原文、日期與關聯，之後再整理。');return;}
      for(const record of filtered.slice(0,50)){
        const row=list.createDiv({cls:'lr-record-row'});const check=row.createEl('input',{attr:{type:'checkbox','aria-label':'選擇 '+String(record.fm.title)}});check.checked=selected.has(record.path);check.addEventListener('change',()=>{if(check.checked)selected.add(record.path);else selected.delete(record.path);});
        const info=row.createDiv({cls:'lr-row-info'});button(info,String(record.fm.title||record.path),()=>new RecordDetailModal(host,record).open(),{cls:'lr-row-title',title:record.path});info.createDiv({cls:'lr-row-meta',text:`${String(record.fm.date||'日期未設定')} · ${String(record.fm.status||'未指定')}`});
        const result=continuation(record);if(result.result)info.createEl('p',{cls:'lr-muted',text:result.result.slice(0,150)});
        button(row,'原檔',()=>host.openFile(record.path),{cls:'lr-quiet'});
      }
      if(filtered.length>50)list.createEl('p',{cls:'lr-muted',text:'顯示前 50 項；請縮小日期範圍或搜尋。'});
    };for(const input of [search,day,until])input.addEventListener('input',draw);draw();
  }catch(e){if(alive())error.setText(String(e));}})();
}
export function renderContinue(parent:HTMLElement,host:WorkspaceHost,component:Component,alive:()=>boolean,context?:string){
  void (async()=>{try{const data=await filesFor(host).list('work-log');if(!alive())return;
    const records=data.items.filter(r=>r.fm.status!=='archived'&&(!context||(Array.isArray(r.fm.projects)&&r.fm.projects.some(p=>typeof p==='string'&&host.index.resolve(p,r.path)?.path===context)))).sort((a,b)=>String(b.fm.date).localeCompare(String(a.fm.date))||String(b.fm.created).localeCompare(String(a.fm.created)));
    if(!records.length){empty(parent,'rotate-ccw','尚未留下續接記錄','先記下結果、問題或下一步，這裡會引用原始記錄。',{label:'留下記錄',run:()=>new RecordModal(host,context?{projects:[wiki(context)]}:{}).open()});return;}
    const record=records[0],value=continuation(record);parent.createDiv({cls:'lr-row-meta',text:String(record.fm.date)+' · '+String(record.fm.title)});
    for(const [label,text] of [['上次結果',value.result],['下一步／未解問題',value.next]]){parent.createEl('h3',{text:label});if(text){const el=parent.createDiv({cls:'lr-continuation markdown-rendered'});void MarkdownRenderer.render(host.app,text,el,record.path,component);}else parent.createEl('p',{cls:'lr-muted',text:'尚未記錄。'});}
    const tools=parent.createDiv({cls:'lr-detail-actions'});button(tools,'上次記錄',()=>new RecordDetailModal(host,record).open());button(tools,'原始筆記',()=>host.openFile(record.path));
    button(tools,'新增本次記錄',()=>new RecordModal(host,{projects:Array.isArray(record.fm.projects)?record.fm.projects:[],task:String(record.fm.task||''),source:wiki(record.path)}).open());
    button(tools,'複製續接上下文',async()=>{await copyText(`來源：${wiki(record.path)}\n\n目前目標：\n${value.goal||'尚未記錄'}\n\n上次結果：\n${value.result||'尚未記錄'}\n\n下一步／未解問題：\n${value.next||'尚未記錄'}\n\n相關材料：${String(record.fm.source||'尚未記錄')}\n\n請先讀來源再續接，保留原文與修正，不推斷完成狀態。`);new Notice('已複製來源與續接內容。');});
    if(data.errors.length)parent.createDiv({cls:'lr-form-error',text:data.errors.join('\n')});
  }catch(e){if(alive())parent.createDiv({cls:'lr-form-error',text:String(e)});}})();
}
