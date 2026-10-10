import { App, Component, TFile, TFolder, parseLinktext } from 'obsidian';
import { Entry, ObjectType, WorkspaceSettings, isContentPath, linkTarget, normalizeEntry } from '../domain';

/** A disposable projection of files. No user information is persisted here. */
export class VaultIndex extends Component {
  entries = new Map<string, Entry>();
  ready = false;
  error = '';
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private projectMembers = new Map<string, Set<string>>();
  private courseMembers = new Map<string, Set<string>>();
  private references = new Map<string, Set<string>>();
  private generation = 0;
  constructor(private app: App, private settings: () => WorkspaceSettings) { super(); }
  onload() {
    this.registerEvent(this.app.metadataCache.on('changed', file => { this.put(file); this.schedule(); }));
    this.registerEvent(this.app.metadataCache.on('resolved', () => this.schedule()));
    this.registerEvent(this.app.vault.on('create', file => { if (file instanceof TFile) { this.put(file); this.schedule(); } }));
    this.registerEvent(this.app.vault.on('modify', file => { if(file instanceof TFile)this.put(file); this.schedule(); }));
    this.registerEvent(this.app.vault.on('delete', file => {
      for (const path of this.entries.keys()) if(path===file.path || path.startsWith(file.path+'/')) this.entries.delete(path);
      this.schedule();
    }));
    this.registerEvent(this.app.vault.on('rename', (file,oldPath) => {
      for (const path of this.entries.keys()) if(path===oldPath || path.startsWith(oldPath+'/')) this.entries.delete(path);
      if(file instanceof TFile) this.put(file);
      if(file instanceof TFolder) for(const f of this.app.vault.getFiles()) if(f.path.startsWith(file.path+'/')) this.put(f);
      this.schedule();
    }));
  }
  onunload() { this.stopped=true; this.generation++; clearTimeout(this.timer); this.listeners.clear(); this.entries.clear(); }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private put(file: TFile) {
    if (!isContentPath(file.path,this.settings())) { this.entries.delete(file.path); return; }
    const cache = this.app.metadataCache.getFileCache(file);
    this.entries.set(file.path,normalizeEntry({path:file.path,name:file.basename,ext:file.extension.toLowerCase(),mtime:file.stat.mtime,ctime:file.stat.ctime},cache?.frontmatter,
      [...(cache?.links ?? []),...(cache?.embeds ?? []),...(cache?.frontmatterLinks ?? [])].map(link=>link.link)));
  }
  async rebuild() {
    const generation=++this.generation;
    this.ready=false; this.error=''; this.emit(); this.entries.clear();
    try {
      const files=this.app.vault.getFiles();
      for(let i=0;i<files.length;i++) {
        if(this.stopped || generation!==this.generation) return;
        if(this.app.vault.getFileByPath(files[i].path)) this.put(files[i]);
        if(i%250===249) await new Promise<void>(resolve=>setTimeout(resolve,0));
      }
      this.relate(); this.ready=true; this.emit();
    } catch(error) { this.error=error instanceof Error?error.message:String(error); this.ready=true; this.emit(); }
  }
  private schedule() {
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>{ if(!this.stopped) { this.relate(); this.emit(); } },120);
  }
  private emit() { for(const fn of this.listeners) fn(); }
  resolve(value: string, source: string): TFile | null {
    const path=linkTarget(value);
    if(!path || /^https?:\/\//i.test(path)) return null;
    return this.app.metadataCache.getFirstLinkpathDest(parseLinktext(path).path,source);
  }
  private relate() {
    this.projectMembers.clear(); this.courseMembers.clear(); this.references.clear();
    const add=(map:Map<string,Set<string>>, target:string,source:string)=>{
      if(!map.has(target)) map.set(target,new Set());
      map.get(target)!.add(source);
    };
    for(const entry of this.entries.values()) {
      for(const value of entry.projects) { const dest=this.resolve(value,entry.path); if(dest) add(this.projectMembers,dest.path,entry.path); }
      const course=this.resolve(entry.course,entry.path); if(course) add(this.courseMembers,course.path,entry.path);
      for(const value of entry.links) { const dest=this.resolve(value,entry.path); if(dest) add(this.references,dest.path,entry.path); }
    }
  }
  all() { return [...this.entries.values()]; }
  ofType(type:ObjectType) { return this.all().filter(e=>e.type===type); }
  related(path:string,relation:'project'|'course'|'references') {
    const map=relation==='project'?this.projectMembers:relation==='course'?this.courseMembers:this.references;
    return [...(map.get(path) ?? [])].flatMap(key=>{const entry=this.entries.get(key);return entry && entry.path!==path ? [entry] : [];});
  }
}
