import type { App, TFile } from 'obsidian';
import type { Entry, ObjectType, Route, WorkspaceSettings } from './domain';
import type { VaultIndex } from './data/index';
import type { FileActions, CreateInput } from './data/actions';
export interface WorkspaceHost {
  app:App; settings:WorkspaceSettings; index:VaultIndex; actions:FileActions;
  openWorkspace(route?:Route):Promise<void>;
  openFile(path:string):Promise<void>;
  newObject(type:ObjectType,context?:Partial<CreateInput>):void;
  capture(idea?:boolean):void;
  organize(entry:Entry):void;
  edit(entry:Entry):void;
  saveSettings():Promise<void>;
  nativeSearch(query?:string):void;
  importInbox(files:File[]):Promise<void>;
  openPaperPair(file:TFile,pdf:TFile):Promise<void>;
}
