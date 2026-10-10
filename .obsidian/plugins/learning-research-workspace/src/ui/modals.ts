import { App, FuzzySuggestModal, Modal, Notice, Setting, TFile } from 'obsidian';
import { Entry, LABELS, ObjectType, STATUSES, STATUS_LABELS, TYPES, safeStem } from '../domain';
import type { WorkspaceHost } from '../contracts';
import type { CreateInput } from '../data/actions';
import { button, picker, run } from './components';

class FilePicker extends FuzzySuggestModal<TFile> {
  constructor(app:App,private items:TFile[],private choose:(file:TFile)=>void) {super(app);this.setPlaceholder('搜尋檔案 · Search files');}
  getItems() {return this.items;}
  getItemText(file:TFile) {return file.basename+'  ·  '+file.parent?.path;}
  onChooseItem(file:TFile) {this.choose(file);}
}
function relation(parent:HTMLElement,host:WorkspaceHost,label:string,type:'project'|'course',values:string[],multiple:boolean,change:(values:string[])=>void) {
  const setting=new Setting(parent).setName(label).setDesc(multiple?'選填，可連結多個研究專案。':'選填，連結所屬課程。');
  const chips=setting.controlEl.createDiv({cls:'lr-link-chips'});
  const draw=()=>{chips.empty(); for(const value of values) button(chips,value.replace(/^\[\[|\]\]$/g,''),()=>{values=values.filter(v=>v!==value);change(values);draw();},{icon:'x',cls:'lr-chip',title:`移除 ${value}`});};draw();
  setting.addButton(b=>b.setButtonText('選擇').onClick(()=>{
    const files=host.index.ofType(type).flatMap(e=>{const f=host.app.vault.getFileByPath(e.path);return f?[f]:[];});
    if(!files.length) {new Notice(type==='course'?'尚無課程，之後可再加入。':'尚無研究專案，之後可再加入。');return;}
    new FilePicker(host.app,files,file=>{const value=`[[${file.path.replace(/\.md$/,'')}]]`;values=multiple?[...new Set([...values,value])]:[value];change(values);draw();}).open();
  }));
}
export class NewObjectModal extends Modal {
  private title=''; private projects:string[]; private course:string; private pdf=''; private source=''; private pending?:File;
  constructor(private host:WorkspaceHost,private type:ObjectType,private context:Partial<CreateInput>={}) {
    super(host.app);this.projects=context.projects ?? [];this.course=context.course ?? '';this.setTitle(`新增 ${LABELS[type]}`);
  }
  onOpen() {
    this.contentEl.addClass('lr-modal');
    this.contentEl.createEl('p',{cls:'lr-modal-intro',text:'先命名，就可以開始。其他資料隨時補充。'});
    let titleInput:HTMLInputElement;
    new Setting(this.contentEl).setName('標題 Title').addText(t=>{titleInput=t.inputEl;t.setPlaceholder('輸入標題').onChange(v=>this.title=v);});
    if(this.type==='paper') {
      const selected=this.contentEl.createDiv({cls:'lr-selection',text:'PDF 為選填，也可以先建立閱讀筆記。'});
      const controls=this.contentEl.createDiv({cls:'lr-modal-actions'});
      button(controls,'選擇 Vault 內的 PDF',()=>new FilePicker(this.app,this.app.vault.getFiles().filter(f=>f.extension.toLowerCase()==='pdf'),f=>{
        this.pdf=`[[${f.path}]]`;this.pending=undefined;selected.setText(f.path);
        if(!this.title) {this.title=f.basename;titleInput.value=this.title;}
      }).open(),{icon:'file-search'});
      const input=picker(controls,'.pdf',false,files=>{this.pending=files[0];this.pdf='';selected.setText(`匯入：${files[0].name}`);if(!this.title){this.title=safeStem(files[0].name.replace(/\.pdf$/i,''));titleInput.value=this.title;}});
      button(controls,'匯入 PDF',()=>input.click(),{icon:'upload'});
      button(controls,'清除 PDF 選擇',()=>{this.pdf='';this.pending=undefined;selected.setText('PDF 為選填，也可以先建立閱讀筆記。');},{icon:'x'});
    }
    const details=this.contentEl.createEl('details',{cls:'lr-more'});details.createEl('summary',{text:'關聯與來源 · Optional'});
    if(!['course','project'].includes(this.type)) {
      relation(details,this.host,'研究專案 Projects','project',this.projects,true,v=>this.projects=v);
      relation(details,this.host,'課程 Course','course',this.course?[this.course]:[],false,v=>this.course=v[0] ?? '');
    }
    if(this.type==='paper'||this.type==='resource') new Setting(details).setName('來源 URL').addText(t=>t.setPlaceholder('https://…').onChange(v=>this.source=v));
    const error=this.contentEl.createDiv({cls:'lr-form-error',attr:{role:'alert'}});
    const footer=this.contentEl.createDiv({cls:'lr-modal-actions'});
    button(footer,'取消',()=>this.close());
    const submit=button(footer,'建立並開啟',async()=>{
      if(submit.disabled) return;
      error.empty();
      if(!safeStem(this.title)) {error.setText('請先輸入標題。');return;}
      if(this.source && !/^https?:\/\//i.test(this.source.trim())) {error.setText('來源請使用 http 或 https 網址。');return;}
      submit.disabled=true;
      try {
        // Check the source before importing a binary to avoid an orphan duplicate PDF.
        if(this.type==='paper'&&this.pending&&this.host.actions.findPaper('',this.source))throw new Error('此來源已有主筆記。請取消匯入 PDF 再開啟原筆記；新版本請使用含版本號的來源。');
        if(this.pending) {
          const [file]=await this.host.actions.importFiles([this.pending],this.host.settings.folders.attachments);
          this.pdf=`[[${file.path}]]`;this.pending=undefined;
        }
        const file=await this.host.actions.create({...this.context,type:this.type,title:this.title,projects:this.projects,course:this.course,pdf:this.pdf,source:this.source.trim()});
        this.close();await this.host.openFile(file.path);
      }catch(e){error.setText(e instanceof Error?e.message:String(e));submit.disabled=false;}
    },{icon:'plus',cls:'lr-primary'});
    this.contentEl.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();submit.click();}});
    titleInput!.focus();
  }
  onClose() {this.contentEl.empty();}
}
export class CaptureModal extends Modal {
  constructor(private host:WorkspaceHost,private idea=false) {super(host.app);this.setTitle(idea?'捕捉想法 Capture idea':'快速收集 Quick capture');}
  onOpen() {
    this.contentEl.addClass('lr-modal');this.contentEl.createEl('p',{cls:'lr-modal-intro',text:'寫下想法、貼上連結或 AI 回覆，先放進 Inbox。'});
    const area=this.contentEl.createEl('textarea',{cls:'lr-capture',attr:{placeholder:'從這裡開始…','aria-label':'捕捉內容'}});
    const error=this.contentEl.createDiv({cls:'lr-form-error',attr:{role:'alert'}});
    const footer=this.contentEl.createDiv({cls:'lr-modal-actions'});button(footer,'取消',()=>this.close());
    const submit=button(footer,'存入 Inbox',async()=>{
      if(submit.disabled)return;submit.disabled=true;
      try {await this.host.actions.capture(area.value,this.idea);this.close();new Notice('已存入 Inbox。');}
      catch(e){error.setText(String(e));submit.disabled=false;}
    },{icon:'inbox',cls:'lr-primary'});
    area.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();submit.click();}});area.focus();
  }
  onClose(){this.contentEl.empty();}
}
export class MetadataModal extends Modal {
  private type:ObjectType;private status:string;private projects:string[];private course:string;private kind:string;private topics:string;
  constructor(private host:WorkspaceHost,private entry:Entry,private organizing=false) {
    super(host.app);this.type=entry.type ?? (entry.ext==='pdf'?'paper':entry.ext==='md'?'note':'resource');
    this.status=organizing?(this.type==='paper'?'reference':['course','project'].includes(this.type)?'active':this.type==='experiment'?'planned':''):entry.status;
    this.projects=[...entry.projects];this.course=entry.course;this.kind=entry.kind;this.topics=entry.topics.join(', ');
    this.setTitle(`${organizing?'整理 Organize':'編輯屬性'} · ${entry.name}`);
  }
  onOpen() {
    this.contentEl.addClass('lr-modal');
    if(this.organizing) this.contentEl.createEl('p',{cls:'lr-modal-intro',text:this.entry.ext==='md'?'選擇類型與歸屬，保留全文並移至對應資料夾。':'原始附件完整保留；建立一份說明筆記，並把附件移至 Attachments。'});
    let statusArea:HTMLElement;
    new Setting(this.contentEl).setName('類型 Type').addDropdown(d=>{
      for(const type of TYPES.filter(t=>this.entry.ext==='md'||t==='resource'||(t==='paper'&&this.entry.ext==='pdf'))) d.addOption(type,LABELS[type]);
      d.setValue(this.type).onChange(v=>{this.type=v as ObjectType;this.status=this.type==='paper'?'reference':['course','project'].includes(this.type)?'active':this.type==='experiment'?'planned':'';drawStatus();});
      if(!this.organizing) d.setDisabled(true);
    });
    statusArea=this.contentEl.createDiv();
    const drawStatus=()=>{statusArea.empty();new Setting(statusArea).setName('狀態 Status').addDropdown(d=>{
      d.addOption('','未指定');for(const status of STATUSES[this.type]) d.addOption(status,`${STATUS_LABELS[status] ?? status} · ${status}`);
      if(this.status&&!STATUSES[this.type].includes(this.status)) d.addOption(this.status,this.status);
      d.setValue(this.status).onChange(v=>this.status=v);
    });};drawStatus();
    relation(this.contentEl,this.host,'研究專案 Projects','project',this.projects,true,v=>this.projects=v);
    relation(this.contentEl,this.host,'課程 Course','course',this.course?[this.course]:[],false,v=>this.course=v[0] ?? '');
    const more=this.contentEl.createEl('details',{cls:'lr-more'});more.createEl('summary',{text:'分類 · Optional'});
    new Setting(more).setName('筆記用途 Kind').addDropdown(d=>d.addOptions({'':'一般','concept':'可重用概念 Concept','lecture':'講義 Lecture','assignment':'作業 Assignment','review':'複習 Review'}).setValue(this.kind).onChange(v=>this.kind=v));
    new Setting(more).setName('主題 Topics').setDesc('以逗號分隔，無需預先建立分類。').addText(t=>t.setValue(this.topics).onChange(v=>this.topics=v));
    const error=this.contentEl.createDiv({cls:'lr-form-error',attr:{role:'alert'}});
    const footer=this.contentEl.createDiv({cls:'lr-modal-actions'});button(footer,'取消',()=>this.close());
    const submit=button(footer,this.organizing?'儲存並整理':'儲存',async()=>{
      if(submit.disabled)return;submit.disabled=true;
      try {
        const file=this.app.vault.getFileByPath(this.entry.path);if(!file)throw new Error('原始檔案已不存在，請重新整理工作區。');
        const values={status:this.status,projects:this.projects,course:this.course,kind:this.kind,topics:this.topics.split(/[,，]/).map(t=>t.trim()).filter(Boolean)};
        if(this.organizing) await this.host.actions.organize(file,this.type,values);else await this.host.actions.update(file,values);
        this.close();new Notice('已儲存。');
      }catch(e){error.setText(e instanceof Error?e.message:String(e));submit.disabled=false;}
    },{icon:'check',cls:'lr-primary'});
  }
  onClose(){this.contentEl.empty();}
}
