import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {parseTasks,toggleTask,appendTask,progressValue} from '../src/data/tasks';
test('tasks preserve prose, nesting, links and CRLF while ignoring fenced examples',()=>{
  const body='Intro\r\n- [ ] Read [[Paper]]\r\n  - [X] Subtask\r\n```md\r\n- [ ] Example\r\n```\r\n';
  const tasks=parseTasks(body);assert.equal(tasks.length,2);assert.equal(tasks[1].done,true);
  assert.equal(toggleTask(body,tasks[0]),body.replace('- [ ] Read','- [x] Read'));
  assert.equal(toggleTask(body,tasks[1]),body.replace('[X] Subtask','[ ] Subtask'));
});
test('stale checkbox edits cannot overwrite an AI rewrite',()=>{
  const task=parseTasks('- [ ] Original')[0];assert.throws(()=>toggleTask('- [ ] AI revised',task),/其他編輯/);
});
test('capture appends without deleting completed tasks or unrelated text',()=>{
  assert.equal(appendTask('# Tasks\n- [x] Keep','  Next [[Project]]  '),'# Tasks\n- [x] Keep\n- [ ] Next [[Project]]\n');
  assert.throws(()=>appendTask('','a\nb'));assert.throws(()=>appendTask('',' '));
});
test('progress distinguishes missing or invalid data from real zero',()=>{
  for(const invalid of [undefined,null,'50',NaN,Infinity,-1,101])assert.equal(progressValue(invalid),undefined);
  for(const value of [0,37.5,100])assert.equal(progressValue(value),value);
});

test('renamed task source is discovered without making a second list',async()=>{
  const {TaskStore}=await import('../src/data/tasks');const {DEFAULT_SETTINGS}=await import('../src/domain');
  const file={path:'40 Notes/Renamed.md'};const app={vault:{getFileByPath:(path:string)=>path===file.path?file:null,getMarkdownFiles:()=>[file],read:async()=>'- [ ] Keep ^task-a'},metadataCache:{getFileCache:()=>({frontmatter:{kind:'tasks'}})}};
  const store=new TaskStore(app as any,'40 Notes/Tasks.md');assert.equal(store.path,file.path);assert.equal(parseTasks(await store.read())[0].id,'task-a');
});
