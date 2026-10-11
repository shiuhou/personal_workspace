import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { App,TFile } from 'obsidian';
import { FileActions } from '../src/data/actions';
import { DEFAULT_SETTINGS, TEMPLATES, TYPES, linkTarget } from '../src/domain';

function harness(){
  const files=new Map<string,TFile>(),contents=new Map<string,string|ArrayBuffer>(),metadata=new Map<TFile,Record<string,unknown>>(),folders=new Set<string>();
  const flags={failMetadata:false,failMove:false};
  function add(path:string,content:string|ArrayBuffer='',fm:Record<string,unknown>={}){
    const name=path.split('/').pop()!,dot=name.lastIndexOf('.');
    const file={path,name,basename:name.slice(0,dot),extension:name.slice(dot+1),stat:{mtime:1,ctime:1,size:1}} as TFile;
    files.set(path,file);contents.set(path,content);metadata.set(file,{...fm});return file;
  }
  const resolve=(target:string)=>files.get(target) ?? files.get(target+'.md') ?? [...files.values()].find(f=>f.basename===target) ?? null;
  const app={
    vault:{getFileByPath:(p:string)=>files.get(p) ?? null,getAbstractFileByPath:(p:string)=>files.get(p) ?? (folders.has(p)?{path:p}:null),getFolderByPath:(p:string)=>folders.has(p)?{path:p}:null,
      getMarkdownFiles:()=>[...files.values()].filter(f=>f.extension==='md'),createFolder:async(p:string)=>{folders.add(p);},read:async(f:TFile)=>contents.get(f.path),
      create:async(p:string,c:string)=>{if(files.has(p))throw new Error('exists');return add(p,c);},createBinary:async(p:string,c:ArrayBuffer)=>{if(files.has(p))throw new Error('exists');return add(p,c);}},
    metadataCache:{getFileCache:(f:TFile)=>({frontmatter:metadata.get(f)}),getFirstLinkpathDest:(p:string)=>resolve(p)},
    fileManager:{processFrontMatter:async(f:TFile,fn:(fm:Record<string,unknown>)=>void)=>{if(flags.failMetadata)throw new Error('YAML parse failed');fn(metadata.get(f)!);},
      renameFile:async(f:TFile,p:string)=>{if(flags.failMove)throw new Error('disk full');if(files.has(p))throw new Error('exists');const old=f.path;files.delete(old);const content=contents.get(old)!;contents.delete(old);f.path=p;files.set(p,f);contents.set(p,content);
        for(const fm of metadata.values())for(const key of ['pdf','source'])if(typeof fm[key]==='string'&&linkTarget(fm[key] as string)===old)fm[key]=`[[${p}]]`;}}
  } as unknown as App;
  for(const type of TYPES)add(`90 Templates/${TEMPLATES[type]}.md`,'---\ncreated: "{{date:YYYY-MM-DD}}"\n---\n# {{title}}\n\nKeep the body.\n');
  return {app,actions:new FileActions(app,()=>DEFAULT_SETTINGS),files,contents,metadata,folders,flags,add};
}
test('creation uses the real template and only supplied relationships',async()=>{
  const h=harness();const file=await h.actions.create({type:'note',title:'Notes: 物理',projects:['[[Project]]']});
  assert.equal(file.path,'40 Notes/Notes 物理.md');assert.match(h.contents.get(file.path) as string,/2026-10-10/);assert.match(h.contents.get(file.path) as string,/# Notes 物理/);
  assert.deepEqual(h.metadata.get(file),{type:'note',projects:['[[Project]]']});
});
test('same-title creation never overwrites existing content',async()=>{
  const h=harness();const original=h.add('10 Courses/QA.md','ORIGINAL');const file=await h.actions.create({type:'course',title:'QA'});
  assert.equal(file.path,'10 Courses/QA (2).md');assert.equal(h.contents.get(original.path),'ORIGINAL');
});
test('missing template fails without creating a partial note',async()=>{
  const h=harness();h.files.delete('90 Templates/Paper.md');await assert.rejects(h.actions.create({type:'paper',title:'QA'}),/找不到範本/);assert.equal(h.files.has('30 Papers/QA.md'),false);
});
test('metadata update preserves unrelated properties and note body',async()=>{
  const h=harness();const file=h.add('40 Notes/QA.md','Evidence stays here',{custom:'keep',project:'[[Legacy]]',pinned:true});
  await h.actions.update(file,{projects:['[[New]]'],pinned:undefined});assert.deepEqual(h.metadata.get(file),{custom:'keep',projects:['[[New]]']});assert.equal(h.contents.get(file.path),'Evidence stays here');
});
test('failed metadata initialization retains created text and gives its path',async()=>{
  const h=harness();h.flags.failMetadata=true;await assert.rejects(h.actions.create({type:'note',title:'QA'}),/40 Notes\/QA.md/);assert.ok(h.contents.get('40 Notes/QA.md'));
});
test('binary import preserves bytes and resolves filename collisions',async()=>{
  const h=harness();const bytes=new Uint8Array([0,255,42]).buffer;
  h.add('01 Inbox/test.pdf','original');const imported=await h.actions.importFiles([{name:'test.pdf',arrayBuffer:async()=>bytes} as File]);
  assert.equal(imported[0].path,'01 Inbox/test (2).pdf');assert.deepEqual(new Uint8Array(h.contents.get(imported[0].path) as ArrayBuffer),new Uint8Array(bytes));assert.equal(h.contents.get('01 Inbox/test.pdf'),'original');
});
test('raw PDF organization creates companion and moves original bytes',async()=>{
  const h=harness();const bytes=new Uint8Array([1,2,3]).buffer;const pdf=h.add('01 Inbox/QA.pdf',bytes);
  const note=await h.actions.organize(pdf,'paper',{status:'reference',projects:['[[Project]]']});
  assert.equal(note.path,'30 Papers/QA.md');assert.equal(pdf.path,'80 Attachments/QA.pdf');assert.equal(h.contents.get(pdf.path),bytes);assert.equal(h.metadata.get(note)?.pdf,'[[80 Attachments/QA.pdf]]');
});
test('move failure leaves original binary and a readable companion link',async()=>{
  const h=harness();const pdf=h.add('01 Inbox/QA.pdf',new ArrayBuffer(8));h.flags.failMove=true;
  await assert.rejects(h.actions.organize(pdf,'paper',{status:'reference'}),/原始附件仍保留/);
  assert.ok(h.files.has('01 Inbox/QA.pdf'));const note=h.files.get('30 Papers/QA.md')!;assert.equal(h.metadata.get(note)?.pdf,'[[01 Inbox/QA.pdf]]');
});
test('existing PDF companion is reused when adding another project',async()=>{
  const h=harness();h.add('80 Attachments/QA.pdf',new ArrayBuffer(8));const note=h.add('30 Papers/Canonical.md','Original notes',{type:'paper',pdf:'[[80 Attachments/QA.pdf]]',projects:['[[A]]'],status:'read'});
  const result=await h.actions.create({type:'paper',title:'Different title',pdf:'[[80 Attachments/QA.pdf]]',projects:['[[B]]']});
  assert.equal(result,note);assert.deepEqual(h.metadata.get(note)?.projects,['[[A]]','[[B]]']);assert.equal(h.metadata.get(note)?.status,'read');assert.equal(h.contents.get(note.path),'Original notes');assert.equal(h.files.has('30 Papers/Different title.md'),false);
});
test('organizing a PDF with existing companion does not duplicate the note',async()=>{
  const h=harness();const pdf=h.add('01 Inbox/QA.pdf',new ArrayBuffer(8));const note=h.add('30 Papers/Canonical.md','Reading notes',{type:'paper',pdf:'[[01 Inbox/QA.pdf]]'});
  assert.equal(await h.actions.organize(pdf,'paper',{status:'reference'}),note);assert.equal(h.files.has('30 Papers/QA.md'),false);assert.equal(h.metadata.get(note)?.pdf,'[[80 Attachments/QA.pdf]]');
});
test('quick capture keeps user text, has no compulsory type, and goes to Inbox',async()=>{
  const h=harness();const text='Unsorted thought\n\nhttps://example.com';const file=await h.actions.capture(text,false);
  assert.match(file.path,/^01 Inbox\//);const content=h.contents.get(file.path) as string;assert.ok(content.includes(text));assert.ok(!content.includes('type:'));assert.ok(content.includes('status: inbox'));
});

test('arXiv abs and PDF URLs reuse a main note without changing personal text or anchors',async()=>{
  const h=harness();const note=h.add('30 Papers/Original.md','Handwritten reading notes',{type:'paper',source:'https://arxiv.org/abs/1706.03762v1',status:'reading',custom:'keep',projects:['[[A]]']});
  const file=await h.actions.create({type:'paper',title:'Different title',source:'https://arxiv.org/pdf/1706.03762v1.pdf',projects:['[[B]]']});
  assert.equal(file,note);assert.equal(h.contents.get(note.path),'Handwritten reading notes');
  assert.deepEqual(h.metadata.get(note),{type:'paper',source:'https://arxiv.org/abs/1706.03762v1',status:'reading',custom:'keep',projects:['[[A]]','[[B]]']});
});
test('explicit arXiv versions are separate, and a different PDF never replaces an annotated PDF',async()=>{
  const h=harness();h.add('80 Attachments/v1.pdf');h.add('80 Attachments/v2.pdf');
  const note=h.add('30 Papers/Original.md','My annotations',{type:'paper',source:'https://arxiv.org/abs/1706.03762v1',pdf:'[[80 Attachments/v1.pdf]]'});
  await assert.rejects(h.actions.create({type:'paper',title:'Same version',source:'https://arxiv.org/abs/1706.03762v1',pdf:'[[80 Attachments/v2.pdf]]'}),/其他 PDF/);
  const newer=await h.actions.create({type:'paper',title:'Version 2',source:'https://arxiv.org/abs/1706.03762v2',pdf:'[[80 Attachments/v2.pdf]]'});
  assert.notEqual(newer,note);assert.equal(h.metadata.get(note)?.pdf,'[[80 Attachments/v1.pdf]]');assert.equal(h.contents.get(note.path),'My annotations');
});
test('conflicting source and PDF companions fail without editing either note',async()=>{
  const h=harness();h.add('80 Attachments/A.pdf');
  const a=h.add('30 Papers/A.md','A',{type:'paper',pdf:'[[80 Attachments/A.pdf]]',source:'https://doi.org/10.1234/A'});
  const b=h.add('30 Papers/B.md','B',{type:'paper',source:'https://doi.org/10.1234/B'});
  await assert.rejects(h.actions.create({type:'paper',title:'Conflicting',pdf:'[[80 Attachments/A.pdf]]',source:'https://doi.org/10.1234/B'}),/多份/);
  assert.equal(h.contents.get(a.path),'A');assert.equal(h.contents.get(b.path),'B');assert.equal(h.files.has('30 Papers/Conflicting.md'),false);
});
test('concept capture stays a note, inherits projects and writes a durable source link',async()=>{
  const h=harness();h.add('90 Templates/Concept.md','# {{title}}\n\n## Understanding\n');
  const file=await h.actions.create({type:'note',kind:'concept',title:'Reusable idea',projects:['[[Project]]'],body:'## Source\n[[30 Papers/Original]]'});
  assert.equal(h.metadata.get(file)?.type,'note');assert.equal(h.metadata.get(file)?.kind,'concept');
  assert.match(h.contents.get(file.path) as string,/Understanding/);assert.match(h.contents.get(file.path) as string,/\[\[30 Papers\/Original\]\]/);
});

test('same PDF with conflicting explicit source version is not silently reused',async()=>{
  const h=harness();h.add('80 Attachments/A.pdf');
  const original=h.add('30 Papers/A.md','Keep annotations',{type:'paper',pdf:'[[80 Attachments/A.pdf]]',source:'https://arxiv.org/abs/1706.03762v1'});
  await assert.rejects(h.actions.create({type:'paper',title:'Version 2',source:'https://arxiv.org/abs/1706.03762v2',pdf:'[[80 Attachments/A.pdf]]'}),/不同來源或版本/);
  assert.equal(h.contents.get(original.path),'Keep annotations');
});

test('retrying the same quick capture operation returns the saved note once',async()=>{
  const h=harness();const a=await h.actions.capture('Keep original [[Paper]]',false,'stable');const b=await h.actions.capture('Keep original [[Paper]]',false,'stable');assert.equal(a,b);assert.match(h.contents.get(a.path) as string,/capture_id: stable/);
});
