import { Notice, Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, Entry, ICONS, LABELS, ObjectType, Route, TYPES, WorkspaceSettings, validateFolder } from './domain';
import { VaultIndex } from './data/index';
import { CreateInput, FileActions } from './data/actions';
import { WorkspaceView, VIEW_TYPE } from './views/workspace-view';
import { CaptureModal, MetadataModal, NewObjectModal } from './ui/modals';
import { WorkspaceSettingsTab } from './settings';
import { run } from './ui/components';

export default class WorkspacePlugin extends Plugin {
  settings:WorkspaceSettings=structuredClone(DEFAULT_SETTINGS);
  index!:VaultIndex;
  actions!:FileActions;
  private disposed=false;
  async onload(){
    const saved=await this.loadData();
    this.settings={openOnStartup:saved?.openOnStartup!==false,folders:{...DEFAULT_SETTINGS.folders}};
    for(const key of Object.keys(this.settings.folders) as (keyof WorkspaceSettings['folders'])[]){
      const value=saved?.folders?.[key];if(typeof value==='string'&&validateFolder(value))this.settings.folders[key]=value;
    }
    this.index=new VaultIndex(this.app,()=>this.settings);this.addChild(this.index);
    this.actions=new FileActions(this.app,()=>this.settings);
    this.registerView(VIEW_TYPE,leaf=>new WorkspaceView(leaf,this));
    this.addRibbonIcon('panels-top-left','Open Learning & Research Workspace',()=>run(()=>this.openWorkspace()));
    this.addCommand({id:'open-workspace',name:'Open Workspace',callback:()=>run(()=>this.openWorkspace())});
    this.addCommand({id:'open-inbox',name:'Open Inbox',callback:()=>run(()=>this.openWorkspace({section:'inbox'}))});
    this.addCommand({id:'quick-capture',name:'Quick capture',callback:()=>this.capture()});
    this.addCommand({id:'capture-idea',name:'Capture idea',callback:()=>this.capture(true)});
    for(const type of TYPES.filter(t=>t!=='idea'))this.addCommand({id:`new-${type}`,name:type==='paper'?'Add paper':`New ${type==='project'?'research project':type}`,callback:()=>this.newObject(type)});
    this.addCommand({id:'rebuild-index',name:'Rebuild workspace index',callback:()=>run(()=>this.index.rebuild())});
    this.addSettingTab(new WorkspaceSettingsTab(this.app,this));
    this.registerObsidianProtocolHandler(VIEW_TYPE,params=>{if(!params.vault || params.vault===this.app.vault.getName())run(()=>this.openWorkspace());});
    this.registerEvent(this.app.workspace.on('file-menu',(menu,file)=>{
      if(!(file instanceof TFile))return;const entry=this.index.entries.get(file.path);if(!entry)return;
      if(['course','project','paper'].includes(entry.type ?? ''))menu.addItem(i=>i.setTitle('在工作區中檢視').setIcon('panels-top-left').onClick(()=>run(()=>this.openWorkspace({section:'detail',path:file.path}))));
      menu.addItem(i=>i.setTitle('整理至學習研究工作區').setIcon('inbox').onClick(()=>this.organize(entry)));
    }));
    this.app.workspace.onLayoutReady(()=>run(async()=>{
      if(this.disposed)return;
      await this.index.rebuild();
      if(this.settings.openOnStartup&&!this.disposed)await this.openWorkspace();
    }));
  }
  onunload(){this.disposed=true;}
  async saveSettings(){await this.saveData(this.settings);}
  async openWorkspace(route:Route={section:'home'}){
    const workspace=this.app.workspace;
    let leaf=workspace.getLeavesOfType(VIEW_TYPE)[0];
    const first=!leaf;
    if(!leaf){const current=workspace.getLeaf(false);leaf=current.view.getViewType()==='empty'?current:workspace.getLeaf('tab');}
    await leaf.setViewState({type:VIEW_TYPE,active:true,state:{...route}});
    await workspace.revealLeaf(leaf);
    if(first)workspace.leftSplit.collapse();
  }
  async openFile(path:string){
    const file=this.app.vault.getFileByPath(path);if(!file)throw new Error(`找不到檔案：${path}`);
    await this.app.workspace.getLeaf('tab').openFile(file,{active:true});
  }
  async openPaperPair(file:TFile,pdf:TFile){
    const noteLeaf=this.app.workspace.getLeaf('tab');await noteLeaf.openFile(file,{active:true});
    const pdfLeaf=this.app.workspace.createLeafBySplit(noteLeaf,'vertical');await pdfLeaf.openFile(pdf,{active:true});
  }
  newObject(type:ObjectType,context:Partial<CreateInput>={}){new NewObjectModal(this,type,context).open();}
  capture(idea=false){new CaptureModal(this,idea).open();}
  organize(entry:Entry){new MetadataModal(this,entry,true).open();}
  edit(entry:Entry){new MetadataModal(this,entry).open();}
  nativeSearch(query=''){
    window.open(`obsidian://search?vault=${encodeURIComponent(this.app.vault.getName())}&query=${encodeURIComponent(query)}`);
  }
  async importInbox(files:File[]){const imported=await this.actions.importFiles(files);new Notice(`已匯入 ${imported.length} 個檔案至 Inbox。`);}
}
