import { App, TFile, moment, normalizePath } from 'obsidian';
import { ObjectType, TEMPLATES, WorkspaceSettings, linkTarget, safeStem, strings, validateFolder } from '../domain';

export interface CreateInput {
  type:ObjectType; title:string; projects?:string[]; course?:string; pdf?:string; source?:string; kind?:string;
  body?:string; capture?:boolean;
}
export class FileActions {
  constructor(private app:App, private settings:()=>WorkspaceSettings) {}
  async ensureFolder(folder:string) {
    if(!validateFolder(folder)) throw new Error('資料夾必須是 Vault 內的相對路徑。');
    const parts=normalizePath(folder).split('/');
    for(let i=1;i<=parts.length;i++) {
      const path=parts.slice(0,i).join('/');
      if(!this.app.vault.getAbstractFileByPath(path)) await this.app.vault.createFolder(path);
      if(!this.app.vault.getFolderByPath(path)) throw new Error(`${path} 不是資料夾。`);
    }
  }
  unique(folder:string,name:string) {
    const dot=name.lastIndexOf('.');
    const stem=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';
    let path=normalizePath(`${folder}/${name}`),n=2;
    while(this.app.vault.getAbstractFileByPath(path)) path=normalizePath(`${folder}/${stem} (${n++})${ext}`);
    return path;
  }
  findCompanion(attachment:TFile):TFile|null {
    for(const file of this.app.vault.getMarkdownFiles()) {
      const fm=this.app.metadataCache.getFileCache(file)?.frontmatter;
      const value=fm?.type==='paper'?fm.pdf:fm?.type==='resource'?fm.source:undefined;
      if(typeof value!=='string' || /^https?:\/\//i.test(value))continue;
      if(this.app.metadataCache.getFirstLinkpathDest(linkTarget(value),file.path)?.path===attachment.path)return file;
    }
    return null;
  }
  async create(input:CreateInput):Promise<TFile> {
    const stem=safeStem(input.title);
    if(!stem) throw new Error('請輸入有效的標題。');
    if(input.type==='paper'&&input.pdf) {
      const pdf=this.app.metadataCache.getFirstLinkpathDest(linkTarget(input.pdf),'');
      const existing=pdf?this.findCompanion(pdf):null;
      if(existing) {
        const fm=this.app.metadataCache.getFileCache(existing)?.frontmatter;
        if(fm?.type!=='paper')throw new Error(`此 PDF 已由 ${existing.path} 說明，請編輯該筆記。`);
        const values:Record<string,unknown>={};
        if(input.projects?.length)values.projects=[...new Set([...strings(fm.projects ?? fm.project),...input.projects])];
        if(input.course)values.course=input.course;
        if(input.source)values.source=input.source;
        if(Object.keys(values).length)await this.update(existing,values);
        return existing;
      }
    }
    const folder=this.settings().folders[input.capture?'inbox':input.type];
    await this.ensureFolder(folder);
    const path=this.unique(folder,`${stem}.md`);
    const templatePath=normalizePath(`${this.settings().folders.templates}/${TEMPLATES[input.type]}.md`);
    const template=this.app.vault.getFileByPath(templatePath);
    if(!template) throw new Error(`找不到範本 ${templatePath}。請在設定中檢查範本資料夾。`);
    const raw=await this.app.vault.read(template);
    const rendered=raw.replace(/\{\{title\}\}/g,()=>stem).replace(/\{\{(date|time)(?::([^}]+))?\}\}/g,(_,type,format)=>moment.utc().local().format(format || (type==='date'?'YYYY-MM-DD':'HH:mm')));
    const file=await this.app.vault.create(path,rendered+(input.body?`\n${input.body}\n`:''));
    try {
      await this.app.fileManager.processFrontMatter(file,fm=>{
        fm.type=input.type;
        if(input.projects?.length) fm.projects=input.projects;
        if(input.course) fm.course=input.course;
        if(input.pdf) fm.pdf=input.pdf;
        if(input.source) fm.source=input.source;
        if(input.kind) fm.kind=input.kind;
        if(input.capture) fm.status='inbox';
      });
    } catch(error) {
      throw new Error(`筆記已建立於 ${file.path}，但屬性未完成：${String(error)}。請先開啟該檔案，避免重複建立。`);
    }
    return file;
  }
  async capture(content:string,idea:boolean) {
    if(!content.trim()) throw new Error('先寫下一點內容。');
    const title=safeStem(content.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0,70)) || `Capture ${moment.utc().local().format('YYYY-MM-DD HHmmss')}`;
    await this.ensureFolder(this.settings().folders.inbox);
    const yaml=`---\n${idea?'type: idea\n':''}status: inbox\ncreated: ${moment.utc().local().format('YYYY-MM-DD')}\n---\n`;
    return this.app.vault.create(this.unique(this.settings().folders.inbox,`${title}.md`),`${yaml}\n# ${title}\n\n${content.trim()}\n`);
  }
  async importFiles(files:File[],folder=this.settings().folders.inbox) {
    await this.ensureFolder(folder);
    const imported:TFile[]=[];
    for(const file of files) {
      const dot=file.name.lastIndexOf('.');
      const stem=safeStem(dot>0?file.name.slice(0,dot):file.name) || 'Attachment';
      const ext=dot>0?file.name.slice(dot).replace(/[^.a-zA-Z0-9_-]/g,''):'';
      const path=this.unique(folder,stem+ext);
      try { imported.push(await this.app.vault.createBinary(path,await file.arrayBuffer())); }
      catch(error) { throw new Error(`已匯入 ${imported.length} 個檔案；${file.name} 匯入失敗：${String(error)}。已匯入的檔案保留。`); }
    }
    return imported;
  }
  async update(file:TFile,values:Record<string,unknown>) {
    await this.app.fileManager.processFrontMatter(file,fm=>{
      for(const [key,value] of Object.entries(values)) {
        if(value===undefined || value==='' || (Array.isArray(value)&&!value.length)) delete fm[key];
        else fm[key]=value;
      }
      if('projects' in values) delete fm.project;
    });
  }
  async organize(file:TFile,type:ObjectType,values:Record<string,unknown>) {
    if(file.extension.toLowerCase()!=='md') {
      if(type!=='paper' && type!=='resource') throw new Error('附件可建立為論文或資源；原始檔案會完整保留。');
      if(type==='paper' && file.extension.toLowerCase()!=='pdf') throw new Error('請將此附件建立為資源；論文 PDF 欄位只接受 PDF。');
      const folder=this.settings().folders.attachments;
      await this.ensureFolder(folder);
      // Create the companion before moving anything. A failed move still leaves a valid link.
      let note=this.findCompanion(file);
      if(note && this.app.metadataCache.getFileCache(note)?.frontmatter?.type!==type)throw new Error(`此附件已有 ${note.path}，請使用原有說明筆記。`);
      if(!note)note=await this.create({type,title:file.basename,[type==='paper'?'pdf':'source']:`[[${file.path}]]`});
      await this.update(note,values);
      try { if(!file.path.startsWith(folder+'/')) await this.app.fileManager.renameFile(file,this.unique(folder,file.name)); }
      catch(error) { throw new Error(`已建立 ${note.path}；原始附件仍保留於 ${file.path}，搬移未完成：${String(error)}`); }
      // Do not depend on metadata-cache timing for the freshly created companion link.
      await this.update(note,{[type==='paper'?'pdf':'source']:`[[${file.path}]]`});
      return note;
    }
    await this.update(file,{...values,type});
    const folder=this.settings().folders[type];
    await this.ensureFolder(folder);
    if(!file.path.startsWith(folder+'/')) await this.app.fileManager.renameFile(file,this.unique(folder,file.name));
    return file;
  }
}
