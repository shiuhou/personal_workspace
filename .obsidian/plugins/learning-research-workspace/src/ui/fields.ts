import { Modal } from 'obsidian';
import { button } from './components';
export function field(parent:HTMLElement,label:string,value='',type='text'){
  const row=parent.createEl('label',{cls:'lr-field'});row.createSpan({text:label});
  const input=row.createEl('input',{attr:{type,'aria-label':label}});input.value=value;return input;
}
export function area(parent:HTMLElement,label:string,value='',rows=5){
  const row=parent.createEl('label',{cls:'lr-field'});row.createSpan({text:label});
  const input=row.createEl('textarea',{attr:{rows:String(rows),'aria-label':label}});input.value=value;return input;
}
export function select(parent:HTMLElement,label:string,options:[string,string][],value=''){
  const row=parent.createEl('label',{cls:'lr-field'});row.createSpan({text:label});
  const input=row.createEl('select',{attr:{'aria-label':label}});for(const [key,name] of options)input.createEl('option',{value:key,text:name});input.value=value;return input;
}
export function fold(parent:HTMLElement,label:string){const el=parent.createEl('details',{cls:'lr-more'});el.createEl('summary',{text:label});return el;}
export function submit(modal:Modal,label:string,save:()=>Promise<void>){
  const error=modal.contentEl.createDiv({cls:'lr-form-error',attr:{role:'alert'}});
  const actions=modal.contentEl.createDiv({cls:'lr-modal-actions'});button(actions,'取消',()=>modal.close());
  const b=button(actions,label,async()=>{if(b.disabled)return;b.disabled=true;error.empty();b.setAttribute('aria-busy','true');try{await save();}catch(e){error.setText(e instanceof Error?e.message:String(e));}finally{b.disabled=false;b.removeAttribute('aria-busy');}},{cls:'lr-primary'});
  modal.contentEl.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)&&!e.isComposing){e.preventDefault();b.click();}});
  return error;
}
export async function copyText(text:string){if(!navigator.clipboard)throw new Error('此環境未提供剪貼簿，請開啟 Markdown 手動複製。');await navigator.clipboard.writeText(text);}
export function downloadMarkdown(title:string,text:string,document:Document){
  const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=title.replace(/[\\/:*?"<>|]/g,' ')+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
