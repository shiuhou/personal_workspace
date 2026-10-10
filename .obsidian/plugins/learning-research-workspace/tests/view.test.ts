import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {WorkspaceView} from '../src/views/workspace-view';
import type {WorkspaceLeaf} from 'obsidian';
import type {WorkspaceHost} from '../src/contracts';

test('native View.open reaches onOpen without trying to open a file',async()=>{
  let initialized=false;
  const view=new WorkspaceView({} as WorkspaceLeaf,{openFile:()=>assert.fail('Lifecycle argument is not an Entry')} as unknown as WorkspaceHost);
  view.onOpen=async()=>{initialized=true;};
  // Runtime API not declared by obsidian.d.ts. This is a host-boundary regression, not GUI QA.
  await (view as any).open({});
  assert.equal(initialized,true);
});
