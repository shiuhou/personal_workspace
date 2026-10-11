// Only the host boundary is stubbed; tests execute the real FileActions class.
export const normalizePath=(path:string)=>path.replace(/\\/g,'/').replace(/\/+/g,'/').replace(/^\/|\/$/g,'');
export const moment={utc:()=>({local:()=>({format:(format:string)=>format==='YYYY-MM-DD'?'2026-10-10':'12:34'})})};
export class TFile {}
// Model the runtime-only View.open entry point observed in Obsidian 1.14.4.
export class Component {registerEvent(_event:unknown){} register(_fn:()=>void){}}
export class ItemView extends Component {
  constructor(public leaf:unknown){super();}
  async open(_container:unknown){await (this as any).onOpen();}
}
export class Menu {}
export class Notice {}
export const MarkdownRenderer={render:async(_app:unknown,text:string,el:any)=>el.createEl('p',{text})};
export const getFrontMatterInfo=()=>({contentStart:0});
export const setIcon=()=>{};

export class TFolder {}
export const parseLinktext=(path:string)=>({path:path.split("#")[0],subpath:""});

export class Modal {
  static latest:any;contentEl:any;
  constructor(public app:any){this.contentEl=(globalThis as any).document?.createElement('div');}
  setTitle(_title:string){}onOpen(){}onClose(){}
  open(){Modal.latest=this;this.onOpen();}close(){this.onClose();}
}
export class Setting {
  controlEl:any;constructor(parent:any){this.controlEl=parent.createDiv();}
  setName(_name:string){return this;}setDesc(_desc:string){return this;}
  addButton(fn:(button:any)=>void){fn({setButtonText:()=>({onClick:()=>{}})});return this;}
}

// JSON is a YAML subset. Real Obsidian parse/stringify are validated separately in desktop QA.
export const parseYaml=(value:string)=>JSON.parse(value);
export const stringifyYaml=(value:unknown)=>JSON.stringify(value,null,2)+'\n';
export class FuzzySuggestModal {}
