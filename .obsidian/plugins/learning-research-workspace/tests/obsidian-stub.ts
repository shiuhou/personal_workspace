// Only the host boundary is stubbed; tests execute the real FileActions class.
export const normalizePath=(path:string)=>path.replace(/\\/g,'/').replace(/\/+/g,'/').replace(/^\/|\/$/g,'');
export const moment={utc:()=>({local:()=>({format:(format:string)=>format==='YYYY-MM-DD'?'2026-10-10':'12:34'})})};
export class TFile {}
