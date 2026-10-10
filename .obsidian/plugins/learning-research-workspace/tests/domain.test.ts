import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { performance } from 'node:perf_hooks';
import { DEFAULT_SETTINGS, courseGroup, isContentPath, isInbox, linkTarget, matches, normalizeEntry, recent, safeStem, validateFolder } from '../src/domain';
const file={path:'30 Papers/測試.md',name:'測試',ext:'md',mtime:20,ctime:10};
test('unclassified capture does not acquire an invented object type',()=>{
  const e=normalizeEntry({...file,path:'01 Inbox/Untitled.md'});assert.equal(e.type,undefined);assert.ok(isInbox(e,DEFAULT_SETTINGS));
});
test('paper inbox works outside physical inbox, once per file',()=>{
  const e=normalizeEntry(file,{type:'paper',status:'inbox'});assert.ok(isInbox(e,DEFAULT_SETTINGS));assert.equal(isInbox({...e,status:'read'},DEFAULT_SETTINGS),false);
});
test('legacy/single relationships are readable without mutating source',()=>{
  const fm={type:'experiment',project:'[[Project]]',topics:'Physics'};
  const e=normalizeEntry(file,fm);assert.deepEqual(e.projects,['[[Project]]']);assert.deepEqual(e.topics,['Physics']);assert.equal(fm.project,'[[Project]]');assert.ok(e.issues.length);
});
test('two project links remain distinct, explicit references',()=>{
  const e=normalizeEntry(file,{type:'paper',projects:['[[A]]','[[B]]']});assert.deepEqual(e.projects,['[[A]]','[[B]]']);
});
test('pinned is an explicit boolean, not a truthy string',()=>{
  assert.equal(normalizeEntry(file,{pinned:'false'}).pinned,false);assert.equal(normalizeEntry(file,{pinned:true}).pinned,true);
});
test('unknown types and nested metadata cannot crash or impersonate a valid object',()=>{
  const e=normalizeEntry(file,{type:'paper-ish',authors:[{},'A'],year:2026,course:{path:'x'}});assert.equal(e.type,undefined);assert.deepEqual(e.authors,['A']);assert.equal(e.course,'');assert.equal(e.year,'2026');assert.ok(e.issues.length);
});
test('system and template files are excluded; normal attachments included',()=>{
  for(const path of ['00 Home/Home.md','99 System/Documentation/README.md','90 Templates/Paper.md','.obsidian/config.json','30 Papers/.gitkeep'])assert.equal(isContentPath(path,DEFAULT_SETTINGS),false,path);
  for(const path of ['80 Attachments/資料.pdf','01 Inbox/screenshot.png','Custom/Research.canvas','30 Papers/資料.md'])assert.ok(isContentPath(path,DEFAULT_SETTINGS),path);
});
test('configured data roots may be relocated, without making all system files visible',()=>{
  const settings={...DEFAULT_SETTINGS,folders:{...DEFAULT_SETTINGS.folders,course:'99 System/Demo/Courses'}};
  assert.ok(isContentPath('99 System/Demo/Courses/QA.md',settings));assert.equal(isContentPath('99 System/Documentation/README.md',settings),false);
});
test('links with alias or heading resolve by target path',()=>{
  assert.equal(linkTarget('[[20 Research/A#Question|研究 A]]'),'20 Research/A');assert.equal(linkTarget('A.md'),'A.md');
});
test('recent includes failed experiments and uses modification time only',()=>{
  const failed=normalizeEntry({...file,path:'50 Experiments/Failed.md',mtime:50},{type:'experiment',status:'failed'});
  const older=normalizeEntry({...file,path:'old.md',mtime:10});assert.deepEqual(recent([older,failed],1),[failed]);
});
test('course grouping does not require extra types',()=>{
  assert.equal(courseGroup(normalizeEntry(file,{type:'note',kind:'assignment'})),'assignment');
  assert.equal(courseGroup(normalizeEntry(file,{type:'paper'})),'resource');assert.equal(courseGroup(normalizeEntry(file,{type:'note'})),'note');
});
test('portable names and roots reject traversal and keep CJK',()=>{
  assert.equal(safeStem('../Course: 物理/量子?'),'Course 物理 量子');assert.equal(safeStem('...'),'');
  for(const path of ['/outside','../escape','valid/../escape','.obsidian','a//b','a\\b'])assert.equal(validateFolder(path),false,path);
  assert.ok(validateFolder('10 Courses/研究'));
});
test('scoped filtering supports Unicode, authors, and all query terms',()=>{
  const e=normalizeEntry({...file,name:'ＡＢＣ 物理'},{authors:['Chen'],topics:['Quantum']});
  assert.ok(matches(e,'abc chen'));assert.ok(matches(e,'物理 quantum'));assert.equal(matches(e,'chen absent'),false);
});
test('5,000-entry metadata projection and sorting stay bounded',()=>{
  const start=performance.now();const entries=Array.from({length:5000},(_,i)=>normalizeEntry({...file,path:`40 Notes/${i}.md`,name:`Note ${i}`,mtime:i},{type:'note',topics:['Physics']}));
  const selected=recent(entries.filter(e=>matches(e,'physics')),50);assert.equal(selected.length,50);assert.equal(selected[0].mtime,4999);
  const elapsed=performance.now()-start;assert.ok(elapsed<2000,`${elapsed.toFixed(1)}ms`);console.log(`5,000 files: metadata/filter/sort ${elapsed.toFixed(1)} ms (not a full Obsidian startup benchmark)`);
});
