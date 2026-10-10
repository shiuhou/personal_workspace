import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type WorkspacePlugin from './main';
import { LABELS, ObjectType, WorkspaceSettings, validateFolder } from './domain';
export class WorkspaceSettingsTab extends PluginSettingTab {
  constructor(app:App,private workspacePlugin:WorkspacePlugin){super(app,workspacePlugin);}
  display(){
    this.containerEl.empty();
    new Setting(this.containerEl).setName('啟動時開啟 Workspace').setDesc('保留其他分頁，進入工作區首頁。').addToggle(t=>t.setValue(this.workspacePlugin.settings.openOnStartup).onChange(async value=>{this.workspacePlugin.settings.openOnStartup=value;await this.workspacePlugin.saveSettings();}));
    new Setting(this.containerEl).setName('重建索引').setDesc('索引只存在記憶體中；此操作不改動任何內容。').addButton(b=>b.setButtonText('重建').onClick(async()=>{await this.workspacePlugin.index.rebuild();new Notice('索引已重建。');}));
    new Setting(this.containerEl).setName('資料夾與範本').setHeading();
    this.containerEl.createEl('p',{text:'這些位置決定新內容的存放處。更改設定不會搬移現有檔案；以 type 與連結標示的內容仍可被找到。',cls:'setting-item-description'});
    for(const [key,value] of Object.entries(this.workspacePlugin.settings.folders)){
      const label=key==='inbox'?'Inbox':key==='attachments'?'Attachments':key==='templates'?'Templates':LABELS[key as ObjectType];
      new Setting(this.containerEl).setName(label).addText(t=>{
        t.setValue(value);t.inputEl.addEventListener('change',()=>{void (async()=>{
          const folder=t.getValue().trim().replace(/\/$/,'');
          if(!validateFolder(folder)){new Notice('請使用 Vault 內的相對資料夾路徑。');t.setValue(value);return;}
          this.workspacePlugin.settings.folders[key as keyof WorkspaceSettings['folders']]=folder;
          await this.workspacePlugin.saveSettings();await this.workspacePlugin.index.rebuild();
        })().catch(error=>new Notice(String(error)));});
      });
    }
  }
}
