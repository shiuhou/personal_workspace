import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {App,TFile} from 'obsidian';
import {VaultIndex} from '../src/data/index';
import {DEFAULT_SETTINGS} from '../src/domain';

test('resolved cache restores type after rename and relationships follow new paths and deletion',async()=>{
  const files=new Map<string,TFile>(),cache=new Map<string,any>();
  const callbacks={vault:new Map<string,Function>(),metadata:new Map<string,Function>()};
  const add=(path:string,fm:any,links:any[]=[])=>{
    const file=Object.assign(new TFile(),{path,basename:path.split('/').pop()!.replace('.md',''),extension:'md',stat:{ctime:1,mtime:1}});
    files.set(path,file);cache.set(path,{frontmatter:fm,links:links.map(link=>({link}))});return file;
  };
  const project=add('20 Research/P.md',{type:'project'});
  const paper=add('30 Papers/A.md',{type:'paper',projects:['[[20 Research/P]]']},['40 Notes/N']);
  const note=add('40 Notes/N.md',{type:'note'},['30 Papers/A']);
  const app={vault:{getFiles:()=>[...files.values()],getFileByPath:(p:string)=>files.get(p),on:(e:string,fn:Function)=>{callbacks.vault.set(e,fn);}},
    metadataCache:{getFileCache:(f:TFile)=>cache.get(f.path),getFirstLinkpathDest:(p:string)=>files.get(p)||files.get(p+'.md')||null,on:(e:string,fn:Function)=>{callbacks.metadata.set(e,fn);}}} as unknown as App;
  const index=new VaultIndex(app,()=>DEFAULT_SETTINGS);index.onload();
  try {
    await index.rebuild();assert.deepEqual(index.connected(paper.path).map(e=>e.path),[note.path]);
    const old=paper.path,meta=cache.get(old);files.delete(old);cache.delete(old);paper.path='30 Papers/Renamed.md';files.set(paper.path,paper);
    callbacks.vault.get('rename')!(paper,old);
    cache.set(paper.path,meta);cache.set(note.path,{frontmatter:{type:'note'},links:[{link:'30 Papers/Renamed'}]});
    callbacks.metadata.get('resolved')!();await new Promise(resolve=>setTimeout(resolve,180));
    assert.equal(index.entries.get(paper.path)?.type,'paper');assert.equal(index.entries.has(old),false);
    assert.deepEqual(index.related(project.path,'project').map(e=>e.path),[paper.path]);
    assert.deepEqual(index.connected(paper.path).map(e=>e.path),[note.path]);
    files.delete(note.path);cache.delete(note.path);callbacks.vault.get('delete')!(note);await new Promise(resolve=>setTimeout(resolve,180));
    assert.deepEqual(index.connected(paper.path),[]);
  } finally {index.onunload();}
});
