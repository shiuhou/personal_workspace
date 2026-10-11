import { App, parseYaml, stringifyYaml } from 'obsidian';
import type { WorkspaceSettings } from '../domain';
import { isContentPath, safeStem } from '../domain';
import { FileActions } from './actions';

export interface Snapshot {path:string;raw:string;fm:Record<string,unknown>;body:string}
export function parseDocument(raw:string,path=''):Snapshot {
  const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  let fm:Record<string,unknown>={};
  if(raw.startsWith('---\n')||raw.startsWith('---\r\n')){
    if(!match)throw new Error(`${path}：YAML 尚未關閉，原檔保留。`);
    const parsed=parseYaml(match[1]);
    if(parsed!=null&&(typeof parsed!=='object'||Array.isArray(parsed)))throw new Error(`${path}：YAML 必須是屬性物件。`);
    fm=parsed??{};
  }
  return {path,raw,fm,body:match?raw.slice(match[0].length):raw};
}
export function patchDocument(snapshot:Snapshot,values:Record<string,unknown>,body=snapshot.body){
  const fm={...snapshot.fm};for(const [key,value] of Object.entries(values)){if(value===undefined)delete fm[key];else fm[key]=value;}
  return `---\n${stringifyYaml(fm).trimEnd()}\n---\n${body}`;
}
export function unchanged(latest:string,snapshot:Snapshot){if(latest!==snapshot.raw)throw new Error(`${snapshot.path} 已在其他位置修改。請重新開啟，草稿仍保留；未覆寫原文。`);}
export class PortableStore {
  constructor(readonly app:App,private settings:()=>WorkspaceSettings){}
  async read(path:string){const file=this.app.vault.getFileByPath(path);if(!file)throw new Error(`檔案已移動或刪除：${path}`);return parseDocument(await this.app.vault.read(file),path);}
  async update(snapshot:Snapshot,values:Record<string,unknown>,body?:string){
    const file=this.app.vault.getFileByPath(snapshot.path);if(!file)throw new Error(`檔案已移動或刪除：${snapshot.path}`);
    await this.app.vault.process(file,latest=>{unchanged(latest,snapshot);return patchDocument(snapshot,values,body);});
    return this.read(file.path);
  }
  async create(folder:string,title:string,fm:Record<string,unknown>,body:string,id:string){
    // Stable operation token makes a retried capture idempotent, including after an uncertain save.
    const actions=new FileActions(this.app,this.settings);await actions.ensureFolder(folder);
    const path=`${folder}/${safeStem(title)||'未命名'} ${id}.md`;
    const matches=this.app.vault.getMarkdownFiles().filter(file=>this.app.metadataCache.getFileCache(file)?.frontmatter?.id===id||(file.path.startsWith(folder+'/')&&file.path.endsWith(' '+id+'.md')));
    if(matches.length>1)throw new Error(`多份筆記具有同一操作 ID：${matches.map(f=>f.path).join('、')}，請先核對。`);
    const existing=matches[0]||this.app.vault.getFileByPath(path);
    if(existing){const snapshot=await this.read(existing.path);if(snapshot.fm.id!==id)throw new Error(`檔名衝突：${path}`);if(snapshot.body!==body)throw new Error(`前次操作已保存於 ${path}，新草稿不同；請先開啟原檔核對。`);return snapshot;}
    await this.app.vault.create(path,patchDocument({path,raw:'',fm:{},body:''},{type:'note',created:new Date().toISOString(),...fm,id},body));
    return this.read(path);
  }
  async list(kind:string){
    const files=this.app.vault.getMarkdownFiles().filter(f=>isContentPath(f.path,this.settings())&&this.app.metadataCache.getFileCache(f)?.frontmatter?.kind===kind);
    const results=await Promise.all(files.map(async f=>{try{return {snapshot:await this.read(f.path)};}catch(error){return {error:`${f.path}: ${String(error)}`};}}));
    return {items:results.flatMap(r=>r.snapshot?[r.snapshot]:[]),errors:results.flatMap(r=>r.error?[r.error]:[])};
  }
}
export const newId=()=>crypto.randomUUID().replace(/-/g,'').slice(0,12);
export const wiki=(path:string,block='')=>`[[${path.replace(/\.md$/,'')}${block?'#^'+block:''}]]`;
