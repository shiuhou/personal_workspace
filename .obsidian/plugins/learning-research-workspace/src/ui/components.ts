import { Notice, setIcon } from 'obsidian';
export function icon(parent:HTMLElement,name:string,cls='lr-icon') { const el=parent.createSpan({cls,attr:{'aria-hidden':'true'}});setIcon(el,name);return el; }
export function run(action:()=>unknown) {
  try { Promise.resolve(action()).catch(error=>{console.error("Learning & Research Workspace",error);new Notice(error instanceof Error?error.message:String(error),9000);}); }
  catch(error) {console.error("Learning & Research Workspace",error);new Notice(String(error),9000);}
}
export function button(parent:HTMLElement,label:string,action:()=>unknown,options:{icon?:string;cls?:string;title?:string}={}) {
  const b=parent.createEl('button',{cls:`lr-button ${options.cls ?? ''}`,attr:{type:'button','aria-label':options.title ?? label,title:options.title ?? label}});
  if(options.icon) icon(b,options.icon);
  if(label) b.createSpan({text:label});
  b.addEventListener('click',()=>run(action));return b;
}
export function empty(parent:HTMLElement,iconName:string,title:string,description:string,action?:{label:string;run:()=>unknown}) {
  const el=parent.createDiv({cls:'lr-empty'});icon(el,iconName,'lr-empty-icon');
  el.createEl('h3',{text:title});el.createEl('p',{text:description});
  if(action) button(el,action.label,action.run,{icon:'plus',cls:'lr-subtle'});
  return el;
}
export function heading(parent:HTMLElement,title:string,eyebrow?:string,description?:string) {
  const h=parent.createDiv({cls:'lr-page-heading'});
  if(eyebrow) h.createDiv({cls:'lr-eyebrow',text:eyebrow});
  h.createEl('h1',{text:title});if(description) h.createEl('p',{text:description});return h;
}
export function picker(parent:HTMLElement,accept:string,multiple:boolean,onPick:(files:File[])=>void) {
  const input=parent.createEl('input',{cls:'lr-hidden-input',attr:{type:'file',accept,...(multiple?{multiple:''}:{})}});
  input.addEventListener('change',()=>{const files=Array.from(input.files ?? []);if(files.length) onPick(files);input.value='';});
  return input;
}
