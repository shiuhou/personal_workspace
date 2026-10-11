import { progressValue } from './data/tasks';
export const TYPES = ['course', 'project', 'paper', 'note', 'experiment', 'idea', 'resource'] as const;
export type ObjectType = typeof TYPES[number];
export type Section = 'home' | 'courses' | 'research' | 'papers' | 'experiments' | 'ideas' | 'inbox' | 'recent' | 'library' | 'detail' | 'tasks' | 'records';
export interface Route { section: Section; path?: string; filter?: string; query?: string }
export interface WorkspaceSettings {
  openOnStartup: boolean;
  timezone?: string;
  homeMode?: 'week'|'today';
  folders: Record<ObjectType | 'inbox' | 'attachments' | 'templates', string>;
}
export const DEFAULT_SETTINGS: WorkspaceSettings = {
  openOnStartup: true,
  folders: {course:'10 Courses',project:'20 Research',paper:'30 Papers',note:'40 Notes',experiment:'50 Experiments',idea:'60 Ideas',resource:'70 Resources',inbox:'01 Inbox',attachments:'80 Attachments',templates:'90 Templates'}
};
export const LABELS: Record<ObjectType, string> = {course:'課程 Course',project:'研究專案 Project',paper:'論文 Paper',note:'筆記 Note',experiment:'實驗 Experiment',idea:'想法 Idea',resource:'資源 Resource'};
export const ICONS: Record<ObjectType, string> = {course:'graduation-cap',project:'flask-conical',paper:'file-text',note:'notebook-pen',experiment:'test-tubes',idea:'lightbulb',resource:'library'};
export const TEMPLATES: Record<ObjectType, string> = {course:'Course',project:'Research Project',paper:'Paper',note:'General Note',experiment:'Experiment',idea:'Idea',resource:'Resource'};
export const STATUSES: Record<ObjectType, string[]> = {
  course:['planned','active','completed','archived'], project:['active','paused','completed','archived'],
  paper:['inbox','skimming','reading','synthesized','read','reference','archived'], experiment:['planned','running','completed','failed','paused'],
  idea:['inbox','archived'], note:['inbox','archived'], resource:['inbox','reference','archived']
};
export const STATUS_LABELS: Record<string,string> = {planned:'計畫中',active:'進行中',completed:'已完成',archived:'已封存',paused:'暫停',inbox:'待整理',skimming:'略讀',synthesized:'已整合',reading:'閱讀中',read:'已讀',reference:'參考',running:'執行中',failed:'失敗'};
export interface Entry {
  path: string; name: string; ext: string; mtime: number; ctime: number;
  type?: ObjectType; status: string; projects: string[]; course: string;
  topics: string[]; authors: string[]; year: string; pdf: string; source: string;
  progress?: number; kind: string; created: string; pinned: boolean; links: string[]; issues: string[];
}
export function text(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}
export function strings(value: unknown): string[] {
  return (Array.isArray(value) ? value : value == null || value === '' ? [] : [value]).map(text).filter(Boolean);
}
export function isObjectType(value: unknown): value is ObjectType { return TYPES.includes(value as ObjectType); }
export function inFolder(path: string, folder: string): boolean { return path.startsWith(folder.replace(/\/$/, '') + '/'); }
export function isContentPath(path: string, settings: WorkspaceSettings): boolean {
  if(['README.md','AGENTS.md'].includes(path)) return false;
  if(path.split('/').some(s => s.startsWith('.')) || inFolder(path,settings.folders.templates)) return false;
  if(Object.entries(settings.folders).some(([key,folder])=>key!=='templates'&&inFolder(path,folder))) return true;
  return !inFolder(path,'00 Home') && !inFolder(path,'99 System');
}
export function isInbox(entry: Entry, settings: WorkspaceSettings): boolean {
  return entry.status!=='archived'&&(inFolder(entry.path,settings.folders.inbox) || entry.status === 'inbox');
}
export function normalizeEntry(file: Pick<Entry,'path'|'name'|'ext'|'mtime'|'ctime'>, fm: Record<string,unknown> = {}, links: string[] = []): Entry {
  const issues: string[] = [];
  if (fm.type && !isObjectType(fm.type)) issues.push('未知的 type，請在原始筆記中修正。');
  if (fm.project && !fm.projects) issues.push('偵測到舊欄位 project；編輯關聯時會改用 projects。');
  for (const key of ['projects','topics','authors']) if (fm[key] != null && !Array.isArray(fm[key])) issues.push(`${key} 建議使用清單；目前以單一值讀取。`);
  if(fm.progress!=null&&progressValue(fm.progress)==null)issues.push('progress 請使用 0 至 100 的數字；目前顯示尚未設定。');
  return {...file, progress:progressValue(fm.progress), type:isObjectType(fm.type)?fm.type:undefined, status:text(fm.status),
    projects:strings(fm.projects ?? fm.project), course:text(fm.course), topics:strings(fm.topics),
    authors:strings(fm.authors),year:text(fm.year),pdf:text(fm.pdf),source:text(fm.source),
    kind:text(fm.kind),created:text(fm.created),pinned:fm.pinned===true,links,issues};
}
export function linkTarget(value: string): string {
  const match = value.match(/^\[\[([\s\S]+?)\]\]$/);
  const raw = match ? match[1] : value;
  return raw.split('|')[0].split('#')[0].trim();
}
export function recent(entries: Entry[], limit = Infinity): Entry[] {
  return [...entries].sort((a,b)=>b.mtime-a.mtime || a.path.localeCompare(b.path)).slice(0,limit);
}
export function matches(entry: Entry, query: string): boolean {
  const haystack=[entry.name,...entry.topics,...entry.authors,entry.year,entry.status].join(' ').normalize('NFKC').toLocaleLowerCase();
  return query.trim().normalize('NFKC').toLocaleLowerCase().split(/\s+/).every(token=>haystack.includes(token));
}
export function safeStem(title: string): string {
  const stem=title.normalize('NFC').replace(/[\\/:*?"<>|#\[\]\x00-\x1f]/g,' ').replace(/\s+/g,' ').replace(/^[. ]+|[. ]+$/g,'').slice(0,160).trim();
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem)?stem+' note':stem;
}
export function validateFolder(value: string): boolean {
  return !!value.trim() && !value.startsWith('/') && !value.includes('\\') && !value.split('/').some(s=>!s || s==='.' || s==='..' || s.startsWith('.') || /[:*?"<>|]/.test(s));
}
export function courseGroup(entry: Entry): string {
  if (['lecture','assignment','review'].includes(entry.kind)) return entry.kind;
  return ['resource','paper'].includes(entry.type ?? '') ? 'resource' : 'note';
}
export function displayDate(value: number): string {
  return new Intl.DateTimeFormat('zh-TW',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
}

/** Only explicit source identifiers are canonicalized; versions remain distinct. */
export function paperIdentity(source:string):string {
  let url:URL;
  try {url=new URL(source.trim());} catch {return '';}
  if(!['https:','http:'].includes(url.protocol))return '';
  const host=url.hostname.toLowerCase();
  if(host==='arxiv.org'||host==='www.arxiv.org') {
    const id=url.pathname.replace(/^\/(abs|pdf)\//,'').replace(/\.pdf$/i,'');
    if(/^(\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(v\d+)?$/i.test(id))return `arxiv:${id.toLowerCase()}`;
  }
  if(host==='doi.org'||host==='dx.doi.org') {
    let id:string;try {id=decodeURIComponent(url.pathname.slice(1));}catch{return '';}
    if(/^10\.\d{4,9}\/\S+$/i.test(id))return `doi:${id.toLowerCase()}`;
  }
  return '';
}
