// Only the host boundary is stubbed; tests execute the real FileActions class.
export const normalizePath=(path:string)=>path.replace(/\\/g,'/').replace(/\/+/g,'/').replace(/^\/|\/$/g,'');
export const moment={utc:()=>({local:()=>({format:(format:string)=>format==='YYYY-MM-DD'?'2026-10-10':'12:34'})})};
export class TFile {}
// Model the runtime-only View.open entry point observed in Obsidian 1.14.4.
export class Component {registerEvent(_event:unknown){}}
export class ItemView extends Component {
  constructor(public leaf:unknown){super();}
  async open(_container:unknown){await (this as any).onOpen();}
}
export class Menu {}
export class Notice {}
export const MarkdownRenderer={};
export const getFrontMatterInfo=()=>({contentStart:0});
export const setIcon=()=>{};

export class TFolder {}
export const parseLinktext=(path:string)=>({path:path.split("#")[0],subpath:""});

export class Modal {}
export class Setting {}
