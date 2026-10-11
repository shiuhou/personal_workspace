import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import type {App,TFile} from 'obsidian';
import {localStamp,toInstant,shiftDay,weekStart,overlaps,snapMinute} from '../src/data/dates';
import {parseDocument,patchDocument,PortableStore,unchanged} from '../src/data/portable';
import {CalendarStore} from '../src/data/calendar';
import {RecordStore,recordBody,continuation,diaryPreview} from '../src/data/records';
import {DEFAULT_SETTINGS} from '../src/domain';
import {parseTasks,editTask} from '../src/data/tasks';
function harness(){
  const files=new Map<string,TFile>(),contents=new Map<string,string>(),folders=new Set<string>();
  const add=(path:string,body:string)=>{const file={path,extension:'md'} as TFile;files.set(path,file);contents.set(path,body);return file;};
  const app={vault:{getFileByPath:(p:string)=>files.get(p),getMarkdownFiles:()=>[...files.values()],getAbstractFileByPath:(p:string)=>files.get(p)||(folders.has(p)?{path:p}:null),getFolderByPath:(p:string)=>folders.has(p)?{path:p}:null,createFolder:async(p:string)=>folders.add(p),read:async(f:TFile)=>contents.get(f.path),create:async(p:string,c:string)=>{if(files.has(p))throw new Error('exists');return add(p,c);},process:async(f:TFile,fn:(text:string)=>string)=>contents.set(f.path,fn(contents.get(f.path)!))},metadataCache:{getFileCache:(f:TFile)=>({frontmatter:parseDocument(contents.get(f.path)!).fm})}} as unknown as App;
  const store=new PortableStore(app,()=>DEFAULT_SETTINGS);return {files,contents,app,store,add};
}
test('record projections exclude templates and documentation while allowing configured Demo roots',async()=>{
  const h=harness();
  const raw=patchDocument({path:'',raw:'',fm:{},body:''},{type:'note',kind:'work-log',date:'2026-10-11'},'Real record');
  h.add('90 Templates/Work Record.md',raw);h.add('99 System/Documentation/Example.md',raw);h.add('40 Notes/Records/Real.md',raw);
  assert.deepEqual((await h.store.list('work-log')).items.map(s=>s.path),['40 Notes/Records/Real.md']);
  h.add('99 System/Demo/note/Record.md',raw);
  const demo=new PortableStore(h.app,()=>({...DEFAULT_SETTINGS,folders:{...DEFAULT_SETTINGS.folders,note:'99 System/Demo/note'}}));
  assert.ok((await demo.list('work-log')).items.some(s=>s.path==='99 System/Demo/note/Record.md'));
});
test('civil dates, Monday weeks, timezone round-trip and quarter-hour snapping',()=>{
  assert.equal(weekStart('2026-10-11'),'2026-10-05');assert.equal(shiftDay('2024-02-28',1),'2024-02-29');
  const time=toInstant('2026-10-11T00:00','Asia/Hong_Kong');assert.equal(time,'2026-10-10T16:00:00.000Z');assert.equal(localStamp(time,'America/New_York'),'2026-10-10T12:00');assert.equal(snapMinute(37),30);assert.equal(snapMinute(1439),1425);
  assert.throws(()=>toInstant('2026-02-30T12:00','UTC'));assert.throws(()=>shiftDay('bad',1));
});
test('DST gaps and ambiguous repeats fail instead of moving user events',()=>{
  assert.throws(()=>toInstant('2026-03-08T02:30','America/New_York'),/夏令/);assert.throws(()=>toInstant('2026-11-01T01:30','America/New_York'),/夏令/);assert.equal(toInstant('2026-03-08T03:30','America/New_York'),'2026-03-08T07:30:00.000Z');
});
test('calendar saved edits reload, overlap is advisory, tasks remain untouched',async()=>{
  const h=harness(),calendar=new CalendarStore(h.store,()=>DEFAULT_SETTINGS);
  h.add('40 Notes/Tasks.md','- [ ] User task ^task-a\n');
  const item=await calendar.save({title:'Research',start:'2026-10-11T01:00:00Z',end:'2026-10-11T02:00:00Z',timezone:'Asia/Hong_Kong',task:'[[40 Notes/Tasks#^task-a]]'},'User notes',undefined,'operation');
  const changed=await calendar.save({...item,start:'2026-10-12T01:15:00Z',end:'2026-10-12T03:00:00Z'},item.body,item);
  const reload=await calendar.list();assert.equal(reload.items[0].start,changed.start);assert.equal(reload.items[0].body,'User notes');assert.equal(h.contents.get('40 Notes/Tasks.md'),'- [ ] User task ^task-a\n');
  assert.equal(overlaps(changed,{start:changed.end,end:'2026-10-12T04:00:00Z'}),false);
  assert.equal(overlaps(changed,{start:'2026-10-12T02:00:00Z',end:'2026-10-12T04:00:00Z'}),true);
  await assert.rejects(calendar.save({...item,end:item.start},'',item),/結束/);
});
test('stale events, deletion and malformed documents preserve originals',async()=>{
  const h=harness(),calendar=new CalendarStore(h.store,()=>DEFAULT_SETTINGS);
  const item=await calendar.save({title:'A',start:'2026-10-11T01:00:00Z',end:'2026-10-11T02:00:00Z',timezone:'UTC'},'handwritten',undefined,'a');
  h.contents.set(item.path,item.raw+'AI update');await assert.rejects(calendar.archive(item),/其他位置修改/);assert.match(h.contents.get(item.path)!,/AI update/);
  h.files.delete(item.path);await assert.rejects(calendar.archive(item),/移動或刪除/);
  assert.throws(()=>parseDocument('---\nbroken\n','broken.md'),/尚未關閉/);
});
test('unknown properties, CRLF body, archived recovery and duplicated events',async()=>{
  const h=harness(),calendar=new CalendarStore(h.store,()=>DEFAULT_SETTINGS);
  let item=await calendar.save({title:'A',start:'2026-10-11T01:00:00Z',end:'2026-10-11T02:00:00Z',timezone:'UTC'},'Keep\r\n[[Source]]',undefined,'a');
  const snapshot=await h.store.update(item,{custom:{keep:true}});item=(await calendar.list()).items[0];
  const archived=await calendar.archive(item);assert.equal(archived.fm.status,'archived');assert.deepEqual(archived.fm.custom,{keep:true});assert.equal(archived.body,'Keep\r\n[[Source]]');
  await calendar.restore(archived);assert.equal((await calendar.list()).items[0].archived,false);
  const copy=await calendar.duplicate(item);assert.notEqual(copy.path,item.path);assert.equal(copy.body,item.body);
});
test('record capture is idempotent, keeps raw input, and never invents results',async()=>{
  const h=harness(),records=new RecordStore(h.store,()=>DEFAULT_SETTINGS);
  const raw='測試失敗，錯誤 X\nhttps://example.com';const input={title:'Attempt',raw,date:'2026-10-11',projects:['[[Project]]'],task:'',source:''};
  const a=await records.capture(input,'same');const b=await records.capture(input,'same');assert.equal(a.path,b.path);assert.equal(h.files.size,1);assert.ok(a.body.includes(raw));assert.equal(continuation(a).result,'');assert.equal(a.fm.source,'');
  const preview=diaryPreview('2026-10-11',[a]);assert.ok(preview.includes(raw));assert.ok(preview.includes(a.path.replace(/\.md$/,'')));assert.match(diaryPreview('2026-10-12',[a]),/尚未記錄/);
});
test('structured input survives, diary edits are loaded and stale rewrites fail',async()=>{
  const h=harness(),records=new RecordStore(h.store,()=>DEFAULT_SETTINGS);
  const raw='## 目標\nQ\n\n## 過程\nP\n\n## 結果\n失敗\n\n## 未來計劃\n核對參數';assert.ok(recordBody(raw).startsWith(raw));
  const record=await records.capture({title:'A',raw,date:'2026-10-11',projects:[],task:'',source:''},'a');assert.equal(continuation(record).result,'失敗');
  const preview=diaryPreview('2026-10-11',[record]);const journal=await records.diary('2026-10-11',preview);
  const corrected=await records.diary('2026-10-11',preview+'\nMy correction',journal);
  await assert.rejects(records.diary('2026-10-11',preview,journal),/其他位置修改/);assert.match((await h.store.read(corrected.path)).body,/My correction/);
});
test('task fields and stable refs remain compatible, suggestions are distinct',()=>{
  const content='Prose\n- [ ] Read [[Paper]] [priority:: high] [due:: 2026-10-12] ^task-a\n- [ ] Suggest [state:: suggested]\n';const [a,b]=parseTasks(content);assert.equal(a.id,'task-a');assert.equal(a.text,'Read [[Paper]]');assert.equal(b.suggested,true);
  const changed=editTask(content,a,{text:'Revise [[Paper]] [custom:: keep]',priority:'low',id:a.id});assert.match(changed,/Prose/);assert.match(changed,/\[custom:: keep\]/);assert.match(changed,/\^task-a/);assert.equal(parseTasks(changed)[0].priority,'low');assert.throws(()=>editTask(content.replace('Read','Changed'),a,{text:'X'}),/其他編輯/);
});

test('overlap layout uses coherent columns for transitive intersections',async()=>{
  const {layoutEvents}=await import('../src/data/calendar');
  const items=[{path:'a',start:'2026-10-11T01:00Z',end:'2026-10-11T02:00Z'},{path:'b',start:'2026-10-11T01:00Z',end:'2026-10-11T03:00Z'},{path:'c',start:'2026-10-11T02:00Z',end:'2026-10-11T03:00Z'}];const layout=layoutEvents(items);assert.equal(layout.get('a')?.columns,3);assert.equal(layout.get('c')?.column,2);
});
test('unknown task status fields survive edits and Windows device names stay portable',async()=>{
  const {safeStem}=await import('../src/domain');assert.equal(safeStem('CON'),'CON note');
  const text='- [ ] Keep [state:: waiting] [custom:: yes] ^task-a';const task=parseTasks(text)[0];assert.match(task.text,/state:: waiting/);assert.match(editTask(text,task,{...task,text:task.text}),/custom:: yes/);
});

test('a changed capture title on retry cannot duplicate or silently replace saved raw input',async()=>{
  const h=harness(),records=new RecordStore(h.store,()=>DEFAULT_SETTINGS);const input={title:'A',raw:'Raw',date:'2026-10-11',projects:[],task:'',source:''};const a=await records.capture(input,'same');const b=await records.capture({...input,title:'B'},'same');assert.equal(a.path,b.path);assert.equal(h.files.size,1);await assert.rejects(records.capture({...input,title:'C',raw:'Changed'},'same'),/新草稿不同/);assert.equal(h.files.size,1);
});
