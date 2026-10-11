import { Component, ItemView, MarkdownRenderer, Menu, WorkspaceLeaf, ViewStateResult, getFrontMatterInfo } from 'obsidian';
import type { WorkspaceHost } from '../contracts';
import { Entry, ICONS, LABELS, ObjectType, Route, Section, STATUS_LABELS, TYPES, courseGroup, displayDate, isInbox, matches, recent } from '../domain';
import { button, empty, heading, icon, picker, run } from '../ui/components';

import { TaskStore } from '../data/tasks';
import { PortableStore, wiki } from '../data/portable';
import { renderTaskPanel } from '../ui/task-panel';
import { renderCalendar, CalendarState } from '../ui/calendar';
import { renderRecords, renderContinue, RecordModal, RecordDetailModal } from '../ui/records';
import { localStamp } from '../data/dates';
import { ProgressModal } from '../ui/planning';

export const VIEW_TYPE='learning-research-workspace';
const NAV: [Section,string,string,string][]=[['home','首頁','Home','house'],['tasks','待辦','Tasks','list-checks'],['records','記錄','Records','notebook-pen'],['courses','課程','Courses','graduation-cap'],['research','研究','Research','flask-conical'],['papers','論文','Papers','file-text'],['experiments','實驗','Experiments','test-tubes'],['ideas','想法','Ideas','lightbulb'],['inbox','收件匣','Inbox','inbox']];
const SECTION_TYPES: Partial<Record<Section,ObjectType>>={courses:'course',research:'project',papers:'paper',experiments:'experiment',ideas:'idea'};
const GROUPS: [string,string][]=[['lecture','講義 Lectures'],['note','筆記 Notes'],['assignment','作業 Assignments'],['resource','資源 Resources'],['review','複習 Review']];

export class WorkspaceView extends ItemView {
  private route:Route={section:'home'};
  private body!:HTMLElement;
  private main!:HTMLElement;
  private trail:Route[]=[];
  private unsubscribe?:()=>void;
  private rendered?:Component;
  private epoch=0;
  private closed=false;
  private taskDraft={text:''};
  private calendarState:CalendarState={day:''};
  private goalsOpen=false;
  constructor(leaf:WorkspaceLeaf,private host:WorkspaceHost){super(leaf);}
  getViewType(){return VIEW_TYPE;}
  getDisplayText(){return 'Learning & Research';}
  getIcon(){return 'panels-top-left';}
  getState(){return {...this.route};}
  async setState(state:Record<string,unknown>,result:ViewStateResult) {
    const valid=['home','courses','research','papers','experiments','ideas','inbox','recent','library','detail','tasks','records'];
    this.route={section:valid.includes(String(state.section))?state.section as Section:'home',path:typeof state.path==='string'?state.path:undefined,filter:typeof state.filter==='string'?state.filter:undefined,query:typeof state.query==='string'?state.query:undefined};
    if(this.body)this.render();
    await super.setState(state,result);
  }
  async onOpen(){
    this.closed=false;this.contentEl.empty();this.contentEl.addClass('lr-workspace');
    this.unsubscribe=this.host.index.subscribe(()=>{if(!this.closed)this.render();});
    this.registerEvent(this.app.vault.on('rename',(file,oldPath)=>{
      if(this.route.path===oldPath || this.route.path?.startsWith(oldPath+'/'))this.route.path=file.path+this.route.path.slice(oldPath.length);
      this.trail=this.trail.map(r=>r.path===oldPath?{...r,path:file.path}:r);
    }));
    this.body=this.contentEl.createDiv({cls:'lr-shell'});this.render();
  }
  async onClose(){this.closed=true;this.epoch++;this.unsubscribe?.();if(this.rendered)this.removeChild(this.rendered);this.contentEl.empty();}
  private navigate(route:Route,back=false){
    if(!back)this.trail.push({...this.route});
    if(this.main)this.main.scrollTop=0;
    this.route=route;this.render();this.app.workspace.requestSaveLayout();
    this.main?.querySelector<HTMLElement>('h1')?.focus();
  }
  private render(){
    if(!this.body||this.closed)return;
    const oldScroll=this.main?.scrollTop ?? 0;
    const focused=this.contentEl.ownerDocument.activeElement as HTMLInputElement|null;
    const searching=focused?.classList.contains('lr-search-input');
    const capturing=focused?.classList.contains('lr-task-input');
    const selection=searching||capturing?focused?.selectionStart:null;
    this.epoch++;if(this.rendered)this.removeChild(this.rendered);
    this.rendered=new Component();this.addChild(this.rendered);
    this.body.empty();this.renderSidebar();
    const workspace=this.body.createDiv({cls:'lr-work-area'});this.renderToolbar(workspace);
    this.main=workspace.createEl('main',{cls:'lr-main',attr:{'aria-label':'工作區內容'}});
    if(this.host.index.error) {empty(this.main,'triangle-alert','無法讀取工作區',this.host.index.error,{label:'重新建立索引',run:()=>this.host.index.rebuild()});return;}
    if(!this.host.index.ready){empty(this.main,'loader-circle','正在讀取檔案','索引會從 Vault 自動建立。');this.main.setAttribute('aria-busy','true');return;}
    if(this.route.section==='home')this.renderHome();
    else if(this.route.section==='tasks'){heading(this.main,'待辦','TASKS','一份清單，所有頁面共用。');this.renderTasks();}
    else if(this.route.section==='records'){heading(this.main,'工作記錄','RECORDS','目標、過程、結果與未來計劃，保留原文。');const epoch=this.epoch;renderRecords(this.main,this.host,this.rendered!,()=>epoch===this.epoch&&!this.closed);}
    else if(this.route.section==='detail')this.renderDetail();
    else this.renderListing();
    this.main.querySelector('h1')?.setAttribute('tabindex','-1');
    this.main.scrollTop=oldScroll;
    if(capturing){const input=this.body.querySelector<HTMLInputElement>('.lr-task-input');input?.focus();if(selection!=null)input?.setSelectionRange(selection,selection);}
    if(searching){const input=this.body.querySelector<HTMLInputElement>('.lr-search-input');input?.focus();if(selection!=null)input?.setSelectionRange(selection,selection);}
  }
  private renderSidebar(){
    const rail=this.body.createEl('aside',{cls:'lr-sidebar',attr:{'aria-label':'主要導覽'}});
    const brand=rail.createDiv({cls:'lr-brand'});icon(brand,'book-open','lr-brand-mark');
    const name=brand.createDiv();name.createEl('strong',{text:'Learning'});name.createEl('small',{text:'& Research'});
    const nav=rail.createEl('nav');
    for(const [section,zh,en,glyph] of NAV){
      if(section==='home'||section==='courses')nav.createDiv({cls:'lr-nav-group-label',text:section==='home'?'日常工作':'學習與研究'});
      const active=this.route.section===section || (this.route.section==='detail' && SECTION_TYPES[section]===this.host.index.entries.get(this.route.path ?? '')?.type);
      const b=button(nav,'',()=>this.navigate({section}),{icon:glyph,cls:`lr-nav ${active?'is-active':''}`,title:`${zh} ${en}`});
      if(active)b.setAttribute('aria-current','page');
      const labels=b.createSpan({cls:'lr-nav-label'});labels.createSpan({text:zh});labels.createEl('small',{text:en});
      if(section==='inbox') {const count=this.host.index.all().filter(e=>isInbox(e,this.host.settings)).length;if(count)b.createSpan({cls:'lr-nav-count',text:String(count)});}
    }
    const secondary=rail.createDiv({cls:'lr-nav-secondary'});
    button(secondary,'最近 Recent',()=>this.navigate({section:'recent'}),{icon:'history',cls:`lr-nav ${this.route.section==='recent'?'is-active':''}`});
    button(secondary,'置頂 Pinned',()=>this.navigate({section:'library',filter:'pinned'}),{icon:'pin',cls:'lr-nav'});
    button(secondary,'資料 Library',()=>this.navigate({section:'library'}),{icon:'library',cls:`lr-nav ${this.route.section==='library'?'is-active':''}`});
    const foot=rail.createDiv({cls:'lr-sidebar-foot'});
    button(foot,'檔案瀏覽器',()=>this.app.workspace.leftSplit.expand(),{icon:'folder-open',cls:'lr-nav'});
    button(foot,'使用指南',()=>this.host.openFile('99 System/Documentation/README.md'),{icon:'circle-help',cls:'lr-nav'});
    foot.createDiv({cls:'lr-local',text:'LOCAL WORKSPACE'});
  }
  private renderToolbar(parent:HTMLElement){
    const top=parent.createEl('header',{cls:'lr-topbar'});
    const crumb=top.createDiv({cls:'lr-breadcrumb'});
    const back=button(crumb,'',()=>{const r=this.trail.pop();if(r)this.navigate(r,true);},{icon:'arrow-left',cls:'lr-icon-button',title:'返回上一頁'});back.disabled=!this.trail.length;
    crumb.createSpan({text:'Personal workspace'});icon(crumb,'chevron-right');
    crumb.createSpan({text:NAV.find(n=>n[0]===this.route.section)?.[2] ?? (this.route.section==='detail'?'Detail':this.route.section==='recent'?'Recent':'Library')});
    const actions=top.createDiv({cls:'lr-top-actions'});
    button(actions,'搜尋',()=>this.host.nativeSearch(),{icon:'search',cls:'lr-quiet',title:'搜尋整個 Vault · Obsidian Search'});
    button(actions,'收集',()=>this.host.capture(),{icon:'inbox',cls:'lr-quiet'});
    const create=button(actions,'新增',()=>{
      const menu=new Menu();
      menu.addItem(i=>i.setTitle('工作記錄').setIcon('notebook-pen').onClick(()=>new RecordModal(this.host).open()));
      menu.addItem(i=>i.setTitle('快速收集 Quick capture').setIcon('inbox').onClick(()=>this.host.capture()));menu.addSeparator();
      for(const type of TYPES)menu.addItem(i=>i.setTitle(LABELS[type]).setIcon(ICONS[type]).onClick(()=>type==='idea'?this.host.capture(true):this.host.newObject(type)));
      const r=create.getBoundingClientRect();menu.showAtPosition({x:r.left,y:r.bottom});
    },{icon:'plus',cls:'lr-primary'});
  }
  private section(parent:HTMLElement,title:string,subtitle:string,more?:Route){
    const block=parent.createEl('section',{cls:'lr-section'});
    const head=block.createDiv({cls:'lr-section-head'});const names=head.createDiv();
    names.createEl('h2',{text:title});if(subtitle)names.createEl('p',{text:subtitle});
    if(more)button(head,'查看全部',()=>this.navigate(more),{icon:'arrow-up-right',cls:'lr-quiet'});
    return block;
  }
  private renderHome(){
    const epoch=this.epoch,alive=()=>epoch===this.epoch&&!this.closed;
    if(!this.calendarState.day)this.calendarState.day=localStamp(Date.now(),this.host.settings.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0,10);
    const calendar=this.main.createEl('section',{cls:'lr-calendar'});
    renderCalendar(calendar,this.host,this.calendarState,this.rendered!,alive,()=>this.render());
    const columns=this.main.createDiv({cls:'lr-home-columns lr-daily-columns'});
    const tasks=this.section(columns,'優先與接下來 Tasks','日期與優先級選填；不每天複製。',{section:'tasks'});
    renderTaskPanel(tasks,this.host,{component:this.rendered!,alive,compact:true,draft:this.taskDraft});
    const resume=this.section(columns,'繼續上次工作','引用已有記錄，不推測進展。',{section:'records'});
    renderContinue(resume,this.host,this.rendered!,alive);
    const goals=this.main.createEl('details',{cls:'lr-home-goals'});goals.open=this.goalsOpen;
    goals.createEl('summary',{text:'近期方向 · Courses / Research'});goals.addEventListener('toggle',()=>this.goalsOpen=goals.open);
    const courses=this.section(goals,'課程 Courses','',{section:'courses'});
    const current=this.host.index.ofType('course').filter(e=>!['archived','completed'].includes(e.status));
    if(current.length){const grid=courses.createDiv({cls:'lr-card-grid'});for(const entry of recent(current,6))this.card(grid,entry);}
    else empty(courses,'graduation-cap','尚無課程','從一門課開始。',{label:'建立課程',run:()=>this.host.newObject('course')});
    const research=this.section(goals,'研究 Research','',{section:'research'});
    const active=this.host.index.ofType('project').filter(e=>!['completed','archived'].includes(e.status));
    if(active.length)for(const entry of recent(active,4))this.projectCard(research,entry);
    else empty(research,'flask-conical','尚無研究專案','從一個問題開始。',{label:'建立專案',run:()=>this.host.newObject('project')});
  }
  private renderProgress(parent:HTMLElement,entry:Entry){
    const box=parent.createDiv({cls:'lr-project-progress'});
    const label=box.createDiv({cls:'lr-progress-label'});
    label.createSpan({text:entry.progress==null?'進度尚未設定':`專案進度 ${entry.progress}%`});
    button(label,entry.progress==null?'設定進度':'更新進度',()=>new ProgressModal(this.host,entry).open(),{cls:'lr-quiet',title:`更新 ${entry.name} 的進度`});
    if(entry.progress!=null)box.createEl('progress',{attr:{value:String(entry.progress),max:'100','aria-label':`${entry.name} 的專案進度`, 'aria-valuetext':`${entry.progress}%`}});
    else box.createDiv({cls:'lr-progress-unset',attr:{'aria-hidden':'true'}});
  }
  private renderTasks(){
    const epoch=this.epoch;
    renderTaskPanel(this.main,this.host,{component:this.rendered!,alive:()=>epoch===this.epoch&&!this.closed,draft:this.taskDraft});
  }
  private card(parent:HTMLElement,entry:Entry){
    const el=parent.createEl('article',{cls:`lr-card lr-type-${entry.type}`});
    const top=el.createDiv({cls:'lr-card-top'});icon(top,ICONS[entry.type ?? 'note'],'lr-card-icon');this.badge(top,entry.status);
    button(el,entry.name,()=>this.openEntry(entry),{cls:'lr-card-title'});
    const related=this.host.index.related(entry.path,entry.type==='course'?'course':'project');
    el.createEl('p',{text:related.length?`${related.length} 份相關資料`:'等待第一份資料',cls:'lr-card-summary'});
    const foot=el.createDiv({cls:'lr-card-foot'});foot.createSpan({text:displayDate(entry.mtime)});
    button(foot,'',()=>this.host.openFile(entry.path),{icon:'file-pen-line',cls:'lr-icon-button',title:`開啟原始筆記：${entry.name}`});
  }
  private projectCard(parent:HTMLElement,entry:Entry){
    const el=parent.createEl('article',{cls:'lr-project-card lr-type-project'});icon(el,'flask-conical','lr-card-icon');
    const info=el.createDiv({cls:'lr-project-info'});button(info,entry.name,()=>this.openEntry(entry),{cls:'lr-card-title'});
    const related=this.host.index.related(entry.path,'project');
    info.createEl('p',{text:[['paper','papers'],['note','notes'],['experiment','experiments'],['idea','ideas']].map(([type,label])=>`${related.filter(e=>e.type===type).length} ${label}`).join(' · ')});
    this.renderProgress(info,entry);
    this.badge(el,entry.status);button(el,'',()=>this.host.openFile(entry.path),{icon:'file-pen-line',cls:'lr-icon-button',title:`開啟原始筆記：${entry.name}`});
  }
  private badge(parent:HTMLElement,status:string){if(status)parent.createSpan({cls:`lr-badge ${status==='failed'?'is-failed':''}`,text:STATUS_LABELS[status] ?? status});}
  private openEntry(entry:Entry){if(['course','project','paper'].includes(entry.type ?? ''))this.navigate({section:'detail',path:entry.path});else if(entry.kind==='work-log')run(async()=>new RecordDetailModal(this.host,await new PortableStore(this.app,()=>this.host.settings).read(entry.path)).open());else run(()=>this.host.openFile(entry.path));}
  private row(parent:HTMLElement,entry:Entry){
    const row=parent.createEl('article',{cls:`lr-row lr-type-${entry.type ?? 'file'}`});
    icon(row,entry.type?ICONS[entry.type]:entry.ext==='pdf'?'file-text':['png','jpg','jpeg','webp','svg'].includes(entry.ext)?'image':'file','lr-row-icon');
    const info=row.createDiv({cls:'lr-row-info'});button(info,entry.name,()=>this.openEntry(entry),{cls:'lr-row-title'});
    info.createDiv({cls:'lr-row-meta',text:`${entry.type?LABELS[entry.type]:entry.ext.toUpperCase()} · ${displayDate(entry.mtime)}`});
    this.badge(row,entry.status);
    const actions=row.createDiv({cls:'lr-row-actions'});
    if(isInbox(entry,this.host.settings))button(actions,'整理',()=>this.host.organize(entry),{cls:'lr-quiet'});
    if(entry.ext==='md'&&isInbox(entry,this.host.settings)){
      const task=button(actions,'轉待辦',async()=>{if(task.disabled)return;task.disabled=true;try{await new TaskStore(this.app,`${this.host.settings.folders.note}/Tasks.md`).add(`${entry.name} ${wiki(entry.path)}`);task.setText('已加入');}catch(e){task.disabled=false;throw e;}},{cls:'lr-quiet'});
      button(actions,'封存',async()=>{const file=this.app.vault.getFileByPath(entry.path);if(!file)throw new Error('檔案已移動或刪除。');await this.host.actions.update(file,{status:'archived'});},{cls:'lr-quiet',title:'保存原文並標記 archived；仍可在 Library 找到'});
    }
    if(entry.ext==='md')button(actions,'',async()=>{const f=this.app.vault.getFileByPath(entry.path);if(!f)throw new Error('檔案已移動或刪除。');await this.host.actions.update(f,{pinned:entry.pinned?undefined:true});},{icon:entry.pinned?'pin-off':'pin',cls:'lr-icon-button',title:entry.pinned?'取消置頂':'置頂'});
    button(actions,'',()=>this.host.openFile(entry.path),{icon:'arrow-up-right',cls:'lr-icon-button',title:`在原生分頁開啟：${entry.name}`});
  }
  private rows(parent:HTMLElement,entries:Entry[],title='尚無內容',description='加入相關檔案後，會自動出現在這裡。'){
    if(!entries.length){empty(parent,'files',title,description);return;}
    const rows=parent.createDiv({cls:'lr-rows'});for(const entry of entries)this.row(rows,entry);
  }
  private renderListing(){
    const section=this.route.section;const type=SECTION_TYPES[section];
    const titles:Partial<Record<Section,[string,string,string]>>={courses:['課程','COURSES','從講義到複習，保留完整的學習脈絡。'],research:['研究專案','RESEARCH','串起論文、實驗與下一個問題。'],papers:['論文','PAPERS','閱讀、理解，再連回你的研究。'],experiments:['實驗','EXPERIMENTS','保留方法、結果與證據，包括失敗的嘗試。'],ideas:['想法','IDEAS','先記下來，讓連結慢慢形成。'],inbox:['收件匣','INBOX','不必現在決定所有分類。'],recent:['最近修改','RECENT','回到你最近編輯或匯入的檔案。'],library:['全部資料','LIBRARY','筆記、資源與附件，都可以在這裡找到。']};
    const t=titles[section]!;const h=heading(this.main,t[0],t[1],t[2]);
    if(type)button(h,type==='idea'?'捕捉想法':`新增${t[0]}`,()=>type==='idea'?this.host.capture(true):this.host.newObject(type),{icon:'plus',cls:'lr-primary'});
    if(section==='research')this.renderResearchMap();
    if(section==='library'&&this.route.filter==='note')button(h,'新增概念筆記',()=>this.host.newObject('note',{kind:'concept'}),{icon:'notebook-pen',cls:'lr-primary'});
    if(section==='inbox')this.renderDropzone(this.main);
    const toolbar=this.main.createDiv({cls:'lr-list-toolbar'});
    const searchWrap=toolbar.createDiv({cls:'lr-search'});icon(searchWrap,'search');
    const input=searchWrap.createEl('input',{cls:'lr-search-input',attr:{type:'search',placeholder:'篩選標題、主題、作者…','aria-label':'篩選目前列表'}});input.value=this.route.query ?? '';
    const scope=toolbar.createEl('select',{attr:{'aria-label':'選擇檢視'}});
    let options:[string,string][]=[['all','全部 All']];
    if(section==='papers')options=[...options,['inbox','待整理 Inbox'],['skimming','略讀 Skimming'],['reading','閱讀中 Reading'],['synthesized','已整合 Synthesized'],['read','已讀 Read'],['recent','最近加入'],['by-project','依研究專案'],['by-topic','依主題'],['reference','參考 Reference'],['archived','封存']];
    else if(type)options=[...options,...(type==='course'?['active','planned','completed','archived']:type==='project'?['active','paused','completed','archived']:type==='experiment'?['planned','running','completed','failed','paused']:['inbox','archived']).map(s=>[s,STATUS_LABELS[s] ?? s] as [string,string])];
    else if(section==='inbox')options=[...options,['md','筆記'],['pdf','PDF'],['images','圖片']];
    else if(section==='library')options=[...options,['note','知識與筆記 Notes'],['concept','可重用概念 Concepts'],['resource','資源 Resources'],['attachments','附件'],['pinned','置頂 Pinned']];
    for(const [value,label] of options)scope.createEl('option',{value,text:label});
    scope.value=options.some(o=>o[0]===this.route.filter)?this.route.filter!:'all';
    const count=this.main.createDiv({cls:'lr-results-count',attr:{'aria-live':'polite'}});
    const list=this.main.createDiv();let limit=50;
    const draw=()=>{
      list.empty();let entries=this.host.index.all();const filter=scope.value;
      if(type)entries=entries.filter(e=>e.type===type);
      if(section==='inbox')entries=entries.filter(e=>isInbox(e,this.host.settings));
      if(type && !['all','recent','by-project','by-topic'].includes(filter))entries=entries.filter(e=>e.status===filter);
      if(section==='inbox'&&filter!=='all')entries=entries.filter(e=>filter==='images'?['png','jpg','jpeg','webp','gif','svg'].includes(e.ext):e.ext===filter);
      if(section==='library'&&filter!=='all')entries=entries.filter(e=>filter==='pinned'?e.pinned:filter==='attachments'?e.ext!=='md':filter==='concept'?e.type==='note'&&e.kind==='concept':e.type===filter);
      entries=entries.filter(e=>matches(e,input.value));
      entries=filter==='recent'?[...entries].sort((a,b)=>b.ctime-a.ctime):recent(entries);
      count.setText(`${entries.length} 個檔案${entries.length>limit?` · 顯示前 ${limit} 個`:''}`);
      const visible=entries.slice(0,limit);
      if(!visible.length){empty(list,section==='inbox'?'inbox':type?ICONS[type]:'files',input.value||filter!=='all'?'沒有符合的內容':section==='inbox'?'沒有待整理的內容':'這裡準備好了',input.value||filter!=='all'?'試試其他篩選條件。':'建立或匯入第一份資料，工作區就會開始連結它們。',type?{label:type==='idea'?'捕捉想法':`建立 ${LABELS[type]}`,run:()=>type==='idea'?this.host.capture(true):this.host.newObject(type)}:undefined);return;}
      if(filter==='by-project'||filter==='by-topic'){
        const groups=new Map<string,Entry[]>();for(const e of visible){const keys=filter==='by-project'?e.projects:e.topics;for(const key of keys.length?keys:['未分類']){if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(e);}}
        for(const [key,values] of [...groups].sort(([a],[b])=>a.localeCompare(b))){const g=this.section(list,key.replace(/^\[\[|\]\]$/g,''),'');this.rows(g,values);}
      }else if(type==='course'){const grid=list.createDiv({cls:'lr-card-grid'});for(const e of visible)this.card(grid,e);}
      else if(type==='project')for(const e of visible)this.projectCard(list,e);
      else this.rows(list,visible);
      if(entries.length>limit)button(list,'載入更多',()=>{limit+=50;draw();},{cls:'lr-load-more'});
    };
    input.addEventListener('input',()=>{this.route.query=input.value;limit=50;draw();});
    scope.addEventListener('change',()=>{this.route.filter=scope.value;limit=50;draw();this.app.workspace.requestSaveLayout();});draw();
  }
  private renderResearchMap(){
    const grid=this.main.createDiv({cls:'lr-research-map',attr:{'aria-label':'研究資料入口'}});
    const areas:[string,string,string,string,Route,ObjectType][]=[
      ['知識與理解','Knowledge','保留完整思路；需要重用時再拆成概念。','notebook-pen',{section:'library',filter:'note'},'note'],
      ['論文與來源','Sources','每篇一份主筆記，理解與原文互相連結。','file-text',{section:'papers'},'paper'],
      ['實踐與證據','Practice','保存設定、結果與失敗，連回研究問題。','test-tubes',{section:'experiments'},'experiment']
    ];
    for(const [title,en,description,glyph,route,type] of areas){
      const card=grid.createEl('article',{cls:`lr-research-area lr-type-${type}`});
      icon(card,glyph,'lr-card-icon');card.createEl('small',{text:en});
      button(card,title,()=>this.navigate(route),{cls:'lr-card-title'});
      card.createEl('p',{text:description});card.createSpan({cls:'lr-muted',text:`${this.host.index.ofType(type).length} 份檔案`});
    }
  }
  private renderDropzone(parent:HTMLElement){
    const zone=parent.createDiv({cls:'lr-dropzone'});icon(zone,'inbox','lr-drop-icon');
    const copy=zone.createDiv();copy.createEl('strong',{text:'放下檔案，留住想法。'});copy.createEl('p',{text:'拖入 PDF、圖片或文字；也可以直接記下一段內容。'});
    const actions=zone.createDiv({cls:'lr-drop-actions'});const input=picker(actions,'',true,files=>run(()=>this.host.importInbox(files)));
    button(actions,'匯入檔案',()=>input.click(),{icon:'upload'});button(actions,'快速收集',()=>this.host.capture(),{icon:'plus',cls:'lr-primary'});
    zone.addEventListener('dragover',e=>{e.preventDefault();zone.addClass('is-dragover');});zone.addEventListener('dragleave',()=>zone.removeClass('is-dragover'));
    zone.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();zone.removeClass('is-dragover');const files=Array.from(e.dataTransfer?.files ?? []);if(files.length)run(()=>this.host.importInbox(files));else{const text=e.dataTransfer?.getData('text/plain');if(text)run(()=>this.host.actions.capture(text,false));}});
  }
  private renderDetail(){
    const entry=this.host.index.entries.get(this.route.path ?? '');
    if(!entry){empty(this.main,'file-question','找不到這份內容','檔案可能已移動或刪除，可回到列表重新尋找。',{label:'回到首頁',run:()=>this.navigate({section:'home'})});return;}
    const h=heading(this.main,entry.name,entry.type?LABELS[entry.type].toUpperCase():entry.ext.toUpperCase());
    const actions=h.createDiv({cls:'lr-detail-actions'});this.badge(actions,entry.status);
    button(actions,'開啟原始筆記',()=>this.host.openFile(entry.path),{icon:'file-pen-line',cls:'lr-primary'});
    if(entry.ext==='md')button(actions,'編輯屬性',()=>this.host.edit(entry),{icon:'sliders-horizontal'});
    button(actions,entry.pinned?'已置頂':'置頂',async()=>{const file=this.app.vault.getFileByPath(entry.path);if(!file)throw new Error('檔案已移動或刪除。');await this.host.actions.update(file,{pinned:entry.pinned?undefined:true});},{icon:'pin',cls:'lr-quiet'});
    if(entry.issues.length) {const warning=this.main.createDiv({cls:'lr-warning',attr:{role:'status'}});for(const issue of entry.issues)warning.createEl('p',{text:issue});}
    const links=this.main.createDiv({cls:'lr-detail-links'});
    for(const value of [...entry.projects,...(entry.course?[entry.course]:[])]){
      const file=this.host.index.resolve(value,entry.path);
      const link=button(links,file?.basename ?? value,()=>{if(file){const target=this.host.index.entries.get(file.path);if(target)this.openEntry(target);else run(()=>this.host.openFile(file.path));}},{icon:file?'link':'unlink',cls:'lr-chip',title:file?file.path:`連結尚未找到：${value}`});link.disabled=!file;
    }
    for(const topic of entry.topics)links.createSpan({cls:'lr-topic',text:topic});
    if(entry.type==='paper')this.renderPaper(entry);
    else if(entry.type==='course')this.renderCourse(entry);
    else if(entry.type==='project')this.renderProject(entry);
    else this.renderMarkdown(this.main,entry);
  }
  private renderCourse(entry:Entry){
    const epoch=this.epoch;const tasks=this.section(this.main,'相關待辦 Tasks','明確連結此課程的事項。');renderTaskPanel(tasks,this.host,{component:this.rendered!,alive:()=>epoch===this.epoch&&!this.closed,project:entry.path,draft:this.taskDraft});
    const overview=this.section(this.main,'概覽 Overview','');this.renderMarkdown(overview,entry);
    const related=this.host.index.related(entry.path,'course');
    for(const [kind,label] of GROUPS){const block=this.section(this.main,label,'');
      button(block,`新增${label.split(' ')[0]}`,()=>this.host.newObject(kind==='resource'?'resource':'note',{course:`[[${entry.path.replace(/\.md$/,'')}]]`,kind:['lecture','assignment','review'].includes(kind)?kind:''}),{icon:'plus',cls:'lr-section-add'});
      this.rows(block,recent(related.filter(e=>courseGroup(e)===kind)));}
  }
  private renderProject(entry:Entry){
    this.renderProgress(this.main,entry);
    const epoch=this.epoch;
    const tasks=this.section(this.main,'相關待辦 Tasks','只列出明確連到此專案的待辦。');renderTaskPanel(tasks,this.host,{component:this.rendered!,alive:()=>epoch===this.epoch&&!this.closed,project:entry.path,draft:this.taskDraft});
    const resume=this.section(this.main,'繼續此專案','');renderContinue(resume,this.host,this.rendered!,()=>epoch===this.epoch&&!this.closed,entry.path);
    const records=this.main.createEl('details',{cls:'lr-more'});records.createEl('summary',{text:'工作記錄 Records'});renderRecords(records,this.host,this.rendered!,()=>epoch===this.epoch&&!this.closed,entry.path);
    const overview=this.section(this.main,'研究備忘 Research brief','研究問題、當前重點與重要決策。');this.renderMarkdown(overview,entry);
    const related=this.host.index.related(entry.path,'project');
    for(const type of ['paper','experiment','note','idea','resource'] as ObjectType[]){
      const block=this.section(this.main,type==='note'?'知識與筆記 Notes':LABELS[type],'');button(block,'新增',()=>this.host.newObject(type,{projects:[`[[${entry.path.replace(/\.md$/,'')}]]`]}),{icon:'plus',cls:'lr-section-add'});
      this.rows(block,recent(related.filter(e=>e.type===type)));}
    this.rows(this.section(this.main,'最近修改 Recent',''),recent(related,5));
  }
  private renderPaper(entry:Entry){
    const meta=this.main.createDiv({cls:'lr-paper-meta'});if(entry.authors.length)meta.createSpan({text:entry.authors.join(' · ')});if(entry.year)meta.createSpan({text:entry.year});
    const pdf=this.host.index.resolve(entry.pdf,entry.path);
    const tools=this.main.createDiv({cls:'lr-paper-tools'});
    if(pdf){button(tools,'開啟 PDF',()=>this.host.openFile(pdf.path),{icon:'file-text',cls:'lr-primary'});button(tools,'PDF ＋ 閱讀筆記',async()=>{const note=this.app.vault.getFileByPath(entry.path);if(note)await this.host.openPaperPair(note,pdf);},{icon:'columns-2'});}
    else tools.createEl('p',{cls:'lr-muted',text:entry.pdf?'PDF 連結尚未找到，請在原始筆記修正 pdf 屬性。':'尚未連結 PDF。可在原始筆記的 pdf 屬性加入檔案連結。'});
    if(/^https?:\/\//i.test(entry.source))tools.createEl('a',{text:'開啟來源 ↗',href:entry.source,attr:{target:'_blank',rel:'noopener noreferrer'}});
    const connect=this.section(this.main,'連結理解與實踐 Connect','從閱讀中留下概念或實驗線索；來源連結會自動保留。');
    const context={projects:entry.projects,course:entry.course,body:`\n## 來源 Source\n\n[[${entry.path.replace(/\.md$/,'')}]]\n`};
    const actions=connect.createDiv({cls:'lr-paper-tools'});
    button(actions,'建立概念筆記',()=>this.host.newObject('note',{...context,kind:'concept'}),{icon:'notebook-pen'});
    button(actions,'記下實驗線索',()=>this.host.newObject('experiment',context),{icon:'test-tubes'});
    this.renderMarkdown(this.section(this.main,'閱讀筆記 Reading notes','逐頁引用留在主筆記；原文與自己的解讀分開寫。'),entry);
    const epoch=this.epoch;const tasks=this.section(this.main,'相關待辦 Tasks','明確引用這篇論文的待辦。');renderTaskPanel(tasks,this.host,{component:this.rendered!,alive:()=>epoch===this.epoch&&!this.closed,project:entry.path,draft:this.taskDraft});
    const related=this.host.index.connected(entry.path);
    this.rows(this.section(this.main,'相關筆記與實驗 Related','與這篇論文互相連結的筆記與實驗。'),recent(related));
  }
  private renderMarkdown(parent:HTMLElement,entry:Entry){
    const el=parent.createDiv({cls:'lr-note-preview markdown-rendered'});const epoch=this.epoch;const component=this.rendered!;
    run(async()=>{
      const file=this.app.vault.getFileByPath(entry.path);if(!file)return;
      const content=await this.app.vault.cachedRead(file);if(this.closed||epoch!==this.epoch)return;
      const body=content.slice(getFrontMatterInfo(content).contentStart).replace(/^\s*# [^\n]+\n/,'').trim();
      if(!body.replace(/<!--[\s\S]*?-->/g,'').replace(/^#+[^\n]*$/gm,'').trim())el.createEl('p',{cls:'lr-muted',text:'在原始筆記中寫下內容，這裡會同步顯示。'});
      else await MarkdownRenderer.render(this.app,body,el,entry.path,component);
    });
  }
}
