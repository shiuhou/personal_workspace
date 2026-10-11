import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {Component,Modal} from 'obsidian';
import type {WorkspaceHost} from '../src/contracts';
import {DEFAULT_SETTINGS} from '../src/domain';
import {parseDocument} from '../src/data/portable';
import {renderCalendar} from '../src/ui/calendar';
import {RecordModal,RecordDetailModal} from '../src/ui/records';
import {renderTaskPanel} from '../src/ui/task-panel';
import {setupDOM,byLabel,settle,FakeElement} from './fake-dom';
function host(){
  const contents=new Map<string,string>(),files=new Map<string,any>(),folders=new Set<string>();
  const app={vault:{getFileByPath:(p:string)=>files.get(p),getMarkdownFiles:()=>[...files.values()],getAbstractFileByPath:(p:string)=>files.get(p)||(folders.has(p)?{path:p}:null),getFolderByPath:(p:string)=>folders.has(p)?{path:p}:null,createFolder:async(p:string)=>folders.add(p),read:async(f:any)=>contents.get(f.path),create:async(p:string,c:string)=>{if(files.has(p))throw new Error('exists');const f={path:p,extension:'md',stat:{mtime:1}};files.set(p,f);contents.set(p,c);return f;},process:async(f:any,fn:any)=>contents.set(f.path,fn(contents.get(f.path)))},metadataCache:{getFileCache:(f:any)=>({frontmatter:parseDocument(contents.get(f.path)!).fm})}};
  const result={app,settings:{...DEFAULT_SETTINGS,folders:{...DEFAULT_SETTINGS.folders},timezone:'Asia/Hong_Kong'},index:{all:()=>[],ofType:()=>[],resolve:()=>null},saveSettings:async()=>{},openFile:async()=>{}} as unknown as WorkspaceHost;
  return {host:result,contents,files};
}
test('simulated calendar UI creates a real arrangement via modal and redraws from files',async()=>{
  const parent=setupDOM(),h=host();renderCalendar(parent as any,h.host,{day:'2026-10-11'},new Component(),()=>true,()=>{});await settle();
  assert.equal(parent.querySelectorAll('.lr-day-slots').length,7);byLabel(parent,'安排').click();await settle();
  const modal=(Modal as any).latest,el=modal.contentEl as FakeElement;byLabel(el,'標題').value='Actual title';byLabel(el,'儲存安排').click();await settle();
  assert.equal(h.contents.size,1);const snapshot=parseDocument([...h.contents.values()][0]);assert.equal(snapshot.fm.title,'Actual title');assert.equal(snapshot.fm.kind,'schedule');
  const next=setupDOM();renderCalendar(next as any,h.host,{day:'2026-10-11'},new Component(),()=>true,()=>{});await settle();assert.equal(next.querySelectorAll('.lr-calendar-event').length,1);
});
test('simulated task capture/completion uses the same Markdown source',async()=>{
  const parent=setupDOM(),h=host();renderTaskPanel(parent as any,h.host,{component:new Component(),alive:()=>true,draft:{text:''}});await settle();
  byLabel(parent,'新增待辦內容').value='User [[Paper]]';byLabel(parent,'新增待辦').click();await settle();assert.match(h.contents.get('40 Notes/Tasks.md')!,/- \[ \] User/);
  const check=byLabel(parent,'完成 User [[Paper]]');check.checked=true;check.dispatchEvent(new Event('change'));await settle();assert.match(h.contents.get('40 Notes/Tasks.md')!,/- \[x\] User/);
});
test('simulated record UI stores raw text, and an external edit prevents stale save',async()=>{
  setupDOM();const h=host(),modal=new RecordModal(h.host);modal.open();const content=(modal as any).contentEl as FakeElement;byLabel(content,'原始輸入').value='This attempt failed.';byLabel(content,'保存草稿').click();await settle();
  assert.equal(h.contents.size,1);const path=[...h.contents.keys()][0],snapshot=parseDocument(h.contents.get(path)!,path);assert.match(snapshot.body,/lr:raw-start/);assert.match(snapshot.body,/This attempt failed/);
  const detail=new RecordDetailModal(h.host,snapshot);detail.open();const el=(detail as any).contentEl as FakeElement;h.contents.set(path,h.contents.get(path)!+'External correction');byLabel(el,'記錄正文').value='My draft';byLabel(el,'儲存修正').click();await settle();
  assert.match(h.contents.get(path)!,/External correction/);assert.match(el.querySelector('.lr-form-error')!.textContent,/其他位置修改/);assert.equal(byLabel(el,'記錄正文').value,'My draft');
});

test('simulated pointer move and resize persist dates/durations without completing a task',async()=>{
  const {CalendarStore}=await import('../src/data/calendar');const {PortableStore}=await import('../src/data/portable');
  setupDOM();const h=host();const store=new CalendarStore(new PortableStore(h.host.app,()=>h.host.settings),()=>h.host.settings);
  await store.save({title:'Drag me',start:'2026-10-05T01:00:00Z',end:'2026-10-05T02:00:00Z',timezone:'Asia/Hong_Kong',task:'[[40 Notes/Tasks#^task-a]]'},'',undefined,'drag');
  const event=(type:string,x:number,y:number,target?:FakeElement)=>{const e=new Event(type);Object.assign(e,{clientX:x,clientY:y,pointerId:1,button:0});return e;};
  const prepare=async()=>{const parent=setupDOM();renderCalendar(parent as any,h.host,{day:'2026-10-05'},new Component(),()=>true,()=>{});await settle();const columns=parent.querySelectorAll('.lr-day-column');columns.forEach((col,i)=>col.getBoundingClientRect=()=>({left:i*100,right:(i+1)*100,top:0,bottom:1000,width:100,height:1000}));return parent;};
  let parent=await prepare(),grid=parent.querySelector('.lr-calendar-grid')!,block=parent.querySelector('.lr-calendar-event')!;
  block.dispatchEvent(event('pointerdown',50,360));grid.dispatchEvent(event('pointerup',50,360));await settle();assert.equal(byLabel((Modal as any).latest.contentEl,'標題').value,'Drag me');(Modal as any).latest.close();
  block.dispatchEvent(event('pointerdown',50,360));grid.dispatchEvent(event('pointermove',150,420));grid.dispatchEvent(event('pointerup',150,420));await settle();
  let data=await store.list();assert.equal(data.items[0].start,'2026-10-06T02:30:00.000Z');assert.equal(data.items[0].end,'2026-10-06T03:30:00.000Z');assert.equal(data.items[0].task,'[[40 Notes/Tasks#^task-a]]');
  parent=await prepare();grid=parent.querySelector('.lr-calendar-grid')!;block=parent.querySelector('.lr-calendar-event')!;
  const handle=block.querySelector('.lr-event-resize')!;const down=event('pointerdown',150,460);Object.defineProperty(down,'target',{value:handle});block.dispatchEvent(down);grid.dispatchEvent(event('pointermove',150,500));grid.dispatchEvent(event('pointerup',150,500));await settle();
  data=await store.list();assert.equal(data.items[0].start,'2026-10-06T02:30:00.000Z');assert.equal(data.items[0].end,'2026-10-06T04:45:00.000Z');assert.equal(data.items[0].fm.status,undefined);
});
