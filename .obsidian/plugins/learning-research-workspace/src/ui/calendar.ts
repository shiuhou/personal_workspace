import { Component, Modal, Notice } from 'obsidian';
import type { WorkspaceHost } from '../contracts';
import { CalendarStore, Arrangement, layoutEvents } from '../data/calendar';
import { PortableStore, Snapshot, newId, wiki } from '../data/portable';
import { clock, localStamp, minuteOf, overlaps, shiftDay, snapMinute, toInstant, weekStart } from '../data/dates';
import { TaskStore, parseTasks, TaskLine } from '../data/tasks';
import { button, empty } from './components';
import { field, area, select, fold, submit } from './fields';
import { relation } from './modals';
import { RecordModal } from './records';
export interface CalendarState {day:string;scroll?:number;undo?:{current:Snapshot;old:Arrangement;archive?:boolean};}
const storeFor=(host:WorkspaceHost)=>new CalendarStore(new PortableStore(host.app,()=>host.settings),()=>host.settings);
export class ArrangementModal extends Modal {
  private id=newId();
  private closed=false;
  constructor(private host:WorkspaceHost,private state:CalendarState,private change:()=>void,private initial:{start:string;end:string;task?:string},private entry?:Arrangement){super(host.app);this.setTitle(entry?'安排詳情':'新增安排');}
  onOpen(){
    this.contentEl.addClass('lr-modal');const zone=this.host.settings.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
    const title=field(this.contentEl,'標題',this.entry?.title||'');
    const times=this.contentEl.createDiv({cls:'lr-fields-row'});
    const start=field(times,'開始',localStamp(this.initial.start,zone),'datetime-local');
    const end=field(times,'結束',localStamp(this.initial.end,zone),'datetime-local');
    const warning=this.contentEl.createDiv({cls:'lr-warning lr-hidden',attr:{role:'status'}});
    this.contentEl.createEl('p',{cls:'lr-muted',text:`時區 ${zone} · 安排是計劃，不表示已完成工作。`});
    const note=area(this.contentEl,'簡記（選填）',this.entry?.body||'',3);
    const details=fold(this.contentEl,'關聯 · 選填');
    let projects=[...(this.entry?.projects||[])],course=this.entry?.course||'';
    relation(details,this.host,'研究專案','project',projects,true,v=>projects=v);
    relation(details,this.host,'課程','course',course?[course]:[],false,v=>course=v[0]||'');
    const taskSelect=select(details,'待辦',[['','不連結待辦']],this.entry?.task||this.initial.task||'');
    const tasks=new TaskStore(this.app,`${this.host.settings.folders.note}/Tasks.md`);let choices:TaskLine[]=[];let loaded=false;
    void (async()=>{try{choices=parseTasks(await tasks.read()).filter(t=>!t.suggested);if(this.closed)return;for(const task of choices)taskSelect.createEl('option',{value:String(task.line),text:`${task.done?'✓ ':''}${task.text}`});const value=this.entry?.task||this.initial.task||'';const linked=choices.find(t=>t.id&&wiki(tasks.path,t.id)===value);if(linked)taskSelect.value=String(linked.line);else if(value){taskSelect.createEl('option',{value,text:value});taskSelect.value=value;}loaded=true;}catch(e){warning.removeClass('lr-hidden');warning.setText('待辦讀取失敗：'+String(e));}})();

    const store=storeFor(this.host);
    const checkOverlap=async()=>{try{const range={start:toInstant(start.value,zone),end:toInstant(end.value,zone)};const data=await store.list();if(this.closed)return;const count=data.items.filter(e=>!e.archived&&e.path!==this.entry?.path&&overlaps(e,range)).length;warning.toggleClass('lr-hidden',!count);warning.setText(count?`與 ${count} 項安排重疊；可照常保存，不會移動其他安排。`:'');}catch{/* Validation is shown on save. */}};
    start.addEventListener('change',()=>void checkOverlap());end.addEventListener('change',()=>void checkOverlap());void checkOverlap();
    if(this.entry){const entry=this.entry,tools=this.contentEl.createDiv({cls:'lr-modal-actions'});
      button(tools,'開啟原檔',()=>this.host.openFile(entry.path));
      button(tools,'相關工作記錄',()=>new RecordModal(this.host,{projects:entry.projects,task:entry.task,source:wiki(entry.path),course:entry.course}).open());
      const duplicate=button(tools,'複製安排',async()=>{if(duplicate.disabled)return;duplicate.disabled=true;try{await store.duplicate(entry);this.close();this.change();new Notice('已建立獨立副本。');}finally{duplicate.disabled=false;}});
      const remove=button(tools,'刪除（可恢復）',async()=>{if(remove.disabled)return;remove.disabled=true;try{const current=await store.archive(entry);this.state.undo={current,old:entry,archive:true};this.close();this.change();new Notice('已封存安排。可在日曆撤銷，或從 Library 恢復 status。');}finally{remove.disabled=false;}});
    }
    submit(this,'儲存安排',async()=>{
      if(!loaded)throw new Error('待辦仍在讀取；請稍候。');
      let task=this.entry?.task||this.initial.task||'';
      const selected=choices.find(t=>String(t.line)===taskSelect.value);
      if(selected){const identified=await tasks.identify(selected);task=wiki(tasks.path,identified.id);}else task=taskSelect.value;
      const result=await store.save({title:title.value,start:toInstant(start.value,zone),end:toInstant(end.value,zone),timezone:zone,projects,course,task},note.value,this.entry,this.id);
      if(this.entry)this.state.undo={current:result,old:this.entry};this.close();this.change();new Notice('安排已保存到本地 Markdown。');
    });title.focus();
  }
  onClose(){this.closed=true;this.contentEl.empty();}
}
export function renderCalendar(parent:HTMLElement,host:WorkspaceHost,state:CalendarState,component:Component,alive:()=>boolean,refresh:()=>void){
  const store=storeFor(host),zone=host.settings.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
  const header=parent.createDiv({cls:'lr-calendar-toolbar'});header.createEl('h1',{text:host.settings.homeMode==='today'?'今日安排':'本週安排'});
  const tools=header.createDiv({cls:'lr-calendar-controls'});
  button(tools,'',()=>{state.day=shiftDay(state.day,host.settings.homeMode==='today'?-1:-7);refresh();},{icon:'chevron-left',title:'上一段日期'});
  button(tools,'今天',()=>{state.day=localStamp(Date.now(),zone).slice(0,10);refresh();});
  button(tools,'',()=>{state.day=shiftDay(state.day,host.settings.homeMode==='today'?1:7);refresh();},{icon:'chevron-right',title:'下一段日期'});
  const mode=select(tools,'檢視',[['week','本週 Week'],['today','今日 Today']],host.settings.homeMode||'week');
  mode.addEventListener('change',()=>{host.settings.homeMode=mode.value as 'week'|'today';void host.saveSettings().then(refresh).catch(e=>new Notice(String(e)));});
  const startDay=host.settings.homeMode==='today'?state.day:weekStart(state.day);
  const days=Array.from({length:host.settings.homeMode==='today'?1:7},(_,n)=>shiftDay(startDay,n));
  const open=(day:string,minute=540,endMinute=minute+60)=>{const endDay=endMinute>=1440?shiftDay(day,1):day;new ArrangementModal(host,state,refresh,{start:toInstant(day+'T'+clock(minute),zone),end:toInstant(endDay+'T'+clock(endMinute%1440),zone)}).open();};
  button(tools,'安排',()=>open(state.day),{icon:'plus',cls:'lr-primary'});
  if(state.undo)button(tools,'撤銷',async()=>{const undo=state.undo!;await store.files.update(undo.current,{title:undo.old.title,start:undo.old.start,end:undo.old.end,status:undo.old.fm.status,task:undo.old.fm.task,projects:undo.old.fm.projects,course:undo.old.fm.course,timezone:undo.old.fm.timezone},undo.old.body);state.undo=undefined;refresh();new Notice('已撤銷。');},{icon:'undo-2'});
  parent.createDiv({cls:'lr-calendar-caption',text:`${days[0]} — ${days[days.length-1]} · ${zone} · 15 分鐘吸附，詳情可精確輸入`});
  const error=parent.createDiv({cls:'lr-form-error',attr:{role:'alert'}});
  const loading=parent.createDiv({cls:'lr-muted',text:'正在讀取安排…',attr:{role:'status'}});
  void (async()=>{try{
    const data=await store.list();if(!alive())return;loading.remove();if(data.errors.length)error.setText(data.errors.join('\n'));
    const entries=data.items.filter(e=>!e.archived);
    const visible=entries.filter(e=>days.some(day=>localStamp(e.start,zone).slice(0,10)<=day&&localStamp(Date.parse(e.end)-1,zone).slice(0,10)>=day));
    const agenda=parent.createDiv({cls:`lr-agenda ${host.settings.homeMode==='today'?'is-today':''}`});
    for(const day of days){const block=agenda.createEl('section');const h=block.createDiv({cls:'lr-section-head'});h.createEl('h3',{text:day});button(h,'安排',()=>open(day),{icon:'plus',cls:'lr-quiet'});
      const daily=visible.filter(e=>localStamp(e.start,zone).slice(0,10)<=day&&localStamp(Date.parse(e.end)-1,zone).slice(0,10)>=day).sort((a,b)=>a.start.localeCompare(b.start));
      if(!daily.length)block.createEl('p',{cls:'lr-muted',text:'尚無安排'});
      for(const e of daily){const row=button(block,`${localStamp(e.start,zone).slice(11)}–${localStamp(e.end,zone).slice(11)}  ${e.title}`,()=>new ArrangementModal(host,state,refresh,e,e).open(),{cls:'lr-agenda-event',title:e.title});if(e.task)row.createSpan({cls:'lr-badge',text:'待辦'});}
    }
    const scroll=parent.createDiv({cls:`lr-calendar-scroll ${host.settings.homeMode==='today'?'is-today':''}`});
    const grid=scroll.createDiv({cls:'lr-calendar-grid'});grid.style.setProperty('--lr-days',String(days.length));
    const labels=grid.createDiv({cls:'lr-time-labels'});for(let h=0;h<24;h++){const label=labels.createSpan({text:clock(h*60)});label.style.top=`${h*40}px`;}
    const cols:HTMLElement[]=[];
    const today=localStamp(Date.now(),zone).slice(0,10);
    for(const day of days){
      const col=grid.createDiv({cls:`lr-day-column ${day===today?'is-today':''}`,attr:{'data-day':day,'aria-label':day}});cols.push(col);
      const head=col.createDiv({cls:'lr-day-heading'});button(head,day.slice(5)+' '+new Intl.DateTimeFormat('zh-TW',{weekday:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z')),()=>open(day),{cls:'lr-quiet',title:day+' · 新增安排'});
      const slots=col.createDiv({cls:'lr-day-slots',attr:{'data-day':day}});
      const daily=visible.filter(e=>localStamp(e.start,zone).slice(0,10)<=day&&localStamp(Date.parse(e.end)-1,zone).slice(0,10)>=day);
      const layout=layoutEvents(daily);
      for(const e of daily){
        const s=localStamp(e.start,zone),t=localStamp(e.end,zone);const from=s.slice(0,10)<day?0:minuteOf(s),to=t.slice(0,10)>day?1440:minuteOf(t);
        const conflicts=daily.filter(other=>overlaps(e,other)).sort((a,b)=>a.start.localeCompare(b.start)||a.path.localeCompare(b.path));
        const event=slots.createEl('button',{cls:'lr-calendar-event',attr:{type:'button','aria-label':`${e.title} ${s} 至 ${t}`,title:`${e.title}\n${s} → ${t}${conflicts.length>1?'\n時間重疊':''}`}});
        event.style.top=`${from/1.5}px`;event.style.height=`${Math.max(16,(to-from)/1.5)}px`;event.style.left=`${layout.get(e.path)!.column/layout.get(e.path)!.columns*100}%`;event.style.width=`${100/layout.get(e.path)!.columns}%`;
        event.createSpan({cls:'lr-event-time',text:s.slice(11)});event.createSpan({cls:'lr-event-title',text:e.title});
        const handle=event.createSpan({cls:'lr-event-resize',attr:{'aria-hidden':'true'}});
        // Pointer capture retargets the mouse click to the grid. Open pointer
        // details on pointerup; retain click for keyboard/assistive activation.
        event.addEventListener('click',ev=>{if(ev.detail===0)new ArrangementModal(host,state,refresh,e,e).open();});
        event.addEventListener('pointerdown',ev=>begin(ev,e,handle===ev.target));
      }
      slots.addEventListener('pointerdown',ev=>{if(ev.target===slots)begin(ev);});
    }
    scroll.scrollTop=state.scroll??7*40;scroll.addEventListener('scroll',()=>state.scroll=scroll.scrollTop); // show the working day; all 24 hours remain reachable
    const controller=new AbortController();component.register(()=>controller.abort());
    let drag:{pointer:number;x:number;y:number;day:string;minute:number;item?:Arrangement;resize:boolean;moved:boolean;ghost:HTMLElement}|undefined;
    function point(ev:PointerEvent){
      const col=cols.find(c=>{const r=c.getBoundingClientRect();return ev.clientX>=r.left&&ev.clientX<=r.right;});if(!col)return null;
      const slots=col.querySelector<HTMLElement>('.lr-day-slots')!,rect=slots.getBoundingClientRect();return {day:col.dataset.day!,minute:snapMinute((ev.clientY-rect.top)*1.5),slots};
    }
    function begin(ev:PointerEvent,item?:Arrangement,resize=false){
      if(ev.button!==0)return;const p=point(ev);if(!p)return;ev.preventDefault();
      const ghost=p.slots.createDiv({cls:'lr-calendar-ghost'});drag={pointer:ev.pointerId,x:ev.clientX,y:ev.clientY,day:p.day,minute:p.minute,item,resize,moved:false,ghost};grid.setPointerCapture(ev.pointerId);
    }
    grid.addEventListener('pointermove',ev=>{if(!drag||ev.pointerId!==drag.pointer)return;const p=point(ev);if(!p)return;
      drag.moved=drag.moved||Math.abs(ev.clientX-drag.x)+Math.abs(ev.clientY-drag.y)>5;p.slots.appendChild(drag.ghost);
      const from=drag.item&&!drag.resize?p.minute:Math.min(drag.minute,p.minute),to=drag.item&&!drag.resize?p.minute+Math.round((Date.parse(drag.item.end)-Date.parse(drag.item.start))/60000):Math.max(drag.minute+15,p.minute+15);
      drag.ghost.style.top=`${from/1.5}px`;drag.ghost.style.height=`${Math.max(15,to-from)/1.5}px`;drag.ghost.setText(`${clock(from)} · ${drag.resize?'調整結束':'安排'}`);
    },{signal:controller.signal});
    grid.addEventListener('pointercancel',()=>{drag?.ghost.remove();drag=undefined;},{signal:controller.signal});
    grid.addEventListener('pointerup',ev=>{if(!drag)return;const d=drag,p=point(ev);drag=undefined;d.ghost.remove();if(!p)return;
      if(d.item){if(!d.moved){new ArrangementModal(host,state,refresh,d.item,d.item).open();return;}const item=d.item;const startStamp=localStamp(item.start,zone);const startMinute=snapMinute(minuteOf(startStamp)+p.minute-d.minute);let start:string,end:string;
        try{start=d.resize?item.start:toInstant(p.day+'T'+clock(startMinute),zone);
        const endMinute=p.minute+15;end=d.resize?toInstant((endMinute===1440?shiftDay(p.day,1):p.day)+'T'+clock(endMinute%1440),zone):new Date(Date.parse(start)+Date.parse(item.end)-Date.parse(item.start)).toISOString();}catch(e){error.setText(String(e));return;}
        // The click generated after a drag must not open a stale detail modal.
        const buttons=grid.querySelectorAll<HTMLButtonElement>('.lr-calendar-event');for(const b of buttons)b.addEventListener('click',event=>{event.stopImmediatePropagation();event.preventDefault();},{once:true,capture:true});
        void (async()=>{try{const next=await store.save({title:item.title,start,end,timezone:zone,task:item.task,projects:item.projects,course:item.course},item.body,item);state.undo={current:next,old:item};const overlap=entries.some(e=>e.path!==item.path&&overlaps(e,next));new Notice(overlap?'已保存；與其他安排重疊。':'已保存安排。');refresh();}catch(e){error.setText(String(e));}})();
      }else {try{const from=d.day===p.day?Math.min(d.minute,p.minute):p.minute;const to=d.day===p.day?Math.max(d.minute+15,p.minute+15):p.minute+15;open(p.day,from,to);}catch(e){error.setText(String(e));}}
    },{signal:controller.signal});
    if(!visible.length)parent.createEl('p',{cls:'lr-muted',text:`${host.settings.homeMode==='today'?'今日':'本週'}尚無安排。點日期、空白時段或「安排」即可新增。`});
  }catch(e){if(alive()){loading.remove();error.setText(String(e));}}})();
}
