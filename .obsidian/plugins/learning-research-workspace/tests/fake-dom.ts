/** Small event/element harness, no layout engine. These tests cannot prove visual quality. */
export class FakeElement extends EventTarget {
  children:FakeElement[]=[];parent?:FakeElement;value='';checked=false;disabled=false;readOnly=false;textContent='';scrollTop=0;dataset:Record<string,string>={};attrs:Record<string,string>={};
  style={setProperty:()=>{},top:'',left:'',width:'',height:''};classes=new Set<string>();ownerDocument:any;
  classList={contains:(value:string)=>this.classes.has(value)};
  constructor(public tag='div',options:any={}){super();this.ownerDocument=(globalThis as any).document;this.addClass(options.cls||'');this.textContent=options.text||'';this.value=options.value||'';for(const [k,v] of Object.entries(options.attr||{}))this.setAttribute(k,String(v));}
  createEl(tag:string,options:any={}){const el=new FakeElement(tag,options);this.appendChild(el);return el;}
  createDiv(options:any={}){return this.createEl('div',typeof options==='string'?{cls:options}:options);}
  createSpan(options:any={}){return this.createEl('span',options);}
  appendChild(el:FakeElement){el.parent=this;this.children.push(el);return el;}
  addClass(value:string){value.split(/\s+/).filter(Boolean).forEach(v=>this.classes.add(v));}
  removeClass(value:string){this.classes.delete(value);}
  toggleClass(value:string,on:boolean){if(on)this.addClass(value);else this.removeClass(value);}
  setText(value:string){this.textContent=value;this.children=[];}
  empty(){this.children=[];this.textContent='';}
  setAttribute(key:string,value:string){this.attrs[key]=value;if(key.startsWith('data-'))this.dataset[key.slice(5)]=value;}
  removeAttribute(key:string){delete this.attrs[key];}
  getAttribute(key:string){return this.attrs[key];}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
  focus(){this.ownerDocument.activeElement=this;}
  click(){if(!this.disabled)this.dispatchEvent(new Event('click'));}
  all():FakeElement[]{return this.children.flatMap(el=>[el,...el.all()]);}
  querySelectorAll(selector:string){return this.all().filter(el=>selector.startsWith('.')?el.classes.has(selector.slice(1)):el.tag===selector);}
  querySelector(selector:string){return this.querySelectorAll(selector)[0]||null;}
  getBoundingClientRect(){return {left:0,right:100,top:0,bottom:100,width:100,height:100};}
  setPointerCapture(){}
}
export function setupDOM(){(globalThis as any).document={createElement:(tag:string)=>new FakeElement(tag),activeElement:null};return new FakeElement();}
export const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
export const byLabel=(parent:FakeElement,label:string)=>parent.all().find(e=>e.getAttribute('aria-label')===label)!;
