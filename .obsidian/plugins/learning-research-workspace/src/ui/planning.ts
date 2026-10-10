import { Modal, Setting, Notice } from 'obsidian';
import type { WorkspaceHost } from '../contracts';
import type { Entry } from '../domain';
import { progressValue } from '../data/tasks';
import { button } from './components';

export class ProgressModal extends Modal {
  constructor(private host:WorkspaceHost,private entry:Entry){super(host.app);this.setTitle(`專案進度 · ${entry.name}`);}
  onOpen(){
    this.contentEl.addClass('lr-modal');
    this.contentEl.createEl('p',{cls:'lr-modal-intro',text:'填寫你確認的進度，或由 AI 依你的每日更新修改專案筆記的 progress。留空表示尚未設定。'});
    let input:HTMLInputElement;
    new Setting(this.contentEl).setName('進度 %').addText(t=>{input=t.inputEl;input.type='number';input.min='0';input.max='100';input.step='any';input.setAttribute('aria-label','專案進度百分比');t.setValue(this.entry.progress==null?'':String(this.entry.progress));});
    const error=this.contentEl.createDiv({cls:'lr-form-error',attr:{role:'alert'}});
    const actions=this.contentEl.createDiv({cls:'lr-modal-actions'});button(actions,'取消',()=>this.close());
    const save=button(actions,'儲存進度',async()=>{
      if(save.disabled)return;
      const raw=input.value.trim();const value=raw===''?undefined:progressValue(Number(raw));
      if(input.validity.badInput||(raw!==''&&value==null)){error.setText('請填寫 0 至 100 的數字，或留空。');return;}
      save.disabled=true;
      try {const file=this.app.vault.getFileByPath(this.entry.path);if(!file)throw new Error('專案已移動或刪除，請重新開啟。');await this.host.actions.update(file,{progress:value});this.close();new Notice('已更新專案進度。');}
      catch(e){error.setText(e instanceof Error?e.message:String(e));save.disabled=false;}
    },{cls:'lr-primary'});
    input!.focus();
  }
  onClose(){this.contentEl.empty();}
}
