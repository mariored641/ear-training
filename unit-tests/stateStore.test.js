import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readLastState, writeLastState, stateKey } from '../src/utils/stateStore.js';
import { getLocalPresets } from '../src/utils/presetManager.js';
import Storage from '../src/utils/Storage.js';
beforeEach(() => {
  const map = new Map();
  globalThis.localStorage = { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) };
});
test('missing, corrupt, unknown version and malformed schema fall back safely', () => {
  const defaults = { bpm: 90, volumes: { bass: 0.8 }, chords: [] };
  for (const payload of [null, '{bad', 'null', '{"v":99,"data":{}}', '{"v":1,"data":[]}']) {
    if (payload) localStorage.setItem(stateKey('test'), payload);
    assert.deepEqual(readLastState('test', 1, defaults), defaults);
  }
  writeLastState('test',1,{ bpm:'bad', volumes:null, chords:{} });
  assert.deepEqual(readLastState('test',1,defaults),defaults);
});
test('legacy state migrates without modifying original bytes or saved presets', () => {
  const legacy = JSON.stringify({v:1,data:{chords:[{root:'F',quality:'minor',extensions:['7'],beats:2}],tempo:113}});
  localStorage.setItem('ear-training:last-state:backing-tracks',legacy);
  const saved = readLastState('backing-tracks',1,{chords:null,tempo:120});
  assert.equal(saved.chords[0].root,'F');
  writeLastState('backing-tracks',1,saved);
  assert.equal(localStorage.getItem('ear-training:last-state:backing-tracks'),legacy);
  assert.deepEqual(readLastState('backing-tracks',1,{}),saved);
});
test('existing named preset payloads still load unchanged', () => {
  for (const type of ['rhythm_explorer','advanced_subdivisions','partial_chords']) {
    const payload = JSON.stringify([{id:'local-existing',name:'Lesson',settings:{bpm:108},progression:[{root:'G',quality:'major'}]}]);
    localStorage.setItem(`${type}_presets_local`,payload);
    writeLastState(type,1,{bpm:112});
    assert.equal(getLocalPresets(type)[0].name,'Lesson');
    assert.equal(localStorage.getItem(`${type}_presets_local`),payload);
  }
});
test('playback and recording flags are never restored', () => {
  writeLastState('test',1,{tempo:123,isPlaying:true,is_playing:true,nested:{recording:true,root:'G'}});
  assert.deepEqual(readLastState('test',1,{}),{tempo:123,nested:{root:'G'}});
});
test('storage exceptions never prevent use of defaults or writing', () => {
  globalThis.localStorage = { getItem(){throw Error('disabled')},setItem(){throw Error('quota')} };
  assert.deepEqual(readLastState('test',1,{tempo:90}),{tempo:90});
  assert.doesNotThrow(()=>writeLastState('test',1,{}));
});
test('legacy exercise settings accept malformed JSON', () => {
  localStorage.setItem('exercise3Settings','{bad');
  assert.deepEqual(Storage.loadSettings(3,{tempo:90}),{tempo:90});
});
for (const id of ['rhythm','rhythm-explorer','rhythm-polyrhythm','rhythm-advanced','positions','positions-all-scales','positions-partial-builder','positions-partial-sequence','backing-tracks','backing-polyscale','backing-practice','backing-fretboard','feedback-prep','rhythm-training', ...['M1','M2','M3','H1','H2','H3','H4','F0','F1','F2','F3','F4','V1','V2','S1','S2','G1','R1','R2'].map(id=>`exercise-${id.toLowerCase()}`)]) {
  test(`${id}: namespaced round trip and independent keys`, () => {
    writeLastState(id,1,{selection:'G',content:[1,2],tempo:109});
    writeLastState('other',1,{selection:'C'});
    assert.deepEqual(readLastState(id,1,{selection:'C',content:[],tempo:90}),{selection:'G',content:[1,2],tempo:109});
  });
}

test('split chords retain extensions and slash bass, and count as one bar', async () => {
  const { validProgression, progressionBarCount } = await import('../src/utils/backingState.js');
  const chords = [{root:'F',quality:'minor',extensions:['7','9'],bassNote:'Ab',beats:2},{root:'G',quality:'major',extensions:['7'],beats:2}];
  writeLastState('backing-tracks',1,{chords,barCount:1});
  const restored=readLastState('backing-tracks',1,{chords:null,barCount:4});
  assert.ok(validProgression(restored.chords));
  assert.deepEqual(restored.chords,chords);
  assert.equal(progressionBarCount(restored.chords),1);
  assert.equal(progressionBarCount([{root:'C'},{root:'F'}],3),2);
  for(const invalid of [[],null,[null],[{}],[{root:'X',quality:'major'}],[{root:'C',quality:'major',extensions:{}}]]) assert.equal(validProgression(invalid),false);
});

test('completed media drafts restore bytes, MIME and duration without playback state',async()=> {
  const { saveMediaDraft, readMediaDraft, clearMediaDraft }=await import('../src/utils/mediaDraft.js');
  const blob=new Blob(['recorded content'],{type:'audio/webm'});
  assert.equal(await saveMediaDraft('global-recording',blob,{durationSec:3}),true);
  const restored=readMediaDraft('global-recording');
  assert.equal(await restored.blob.text(),'recorded content');
  assert.equal(restored.mimeType,'audio/webm');
  assert.equal(restored.durationSec,3);
  clearMediaDraft('global-recording');assert.equal(readMediaDraft('global-recording'),null);
});

test('discard cancels an in-flight media conversion so it cannot resurrect a take',async()=> {
  const { saveMediaDraft, readMediaDraft, clearMediaDraft }=await import('../src/utils/mediaDraft.js');
  let finish;
  const pending=saveMediaDraft('pending',{type:'audio/webm',arrayBuffer:()=>new Promise(resolve=>{finish=resolve;})});
  clearMediaDraft('pending');finish(new Uint8Array([1,2]).buffer);
  assert.equal(await pending,false);assert.equal(readMediaDraft('pending'),null);
});

test('editable record schemas reject malformed partial chords, tuplets and overlays',()=> {
  for(const [id,field,bad] of [
    ['positions-partial-sequence','progression',[null,{root:'C',quality:'unknown',cagedIdx:0,setIdx:0}]],
    ['rhythm-advanced','beats',[null,{length:1,division:3,cells:{}}]],
    ['rhythm-polyrhythm','rows',[null,{cells:[]}]],
    ['positions-all-scales','overlays',[null,{root:{},chordId:1}]],
    ['rhythm-explorer','grid',[null,[1]]],
  ]) {
    writeLastState(id,1,{[field]:bad});
    assert.deepEqual(readLastState(id,1,{[field]:[]})[field],[]);
  }
  writeLastState('looper',1,{timeSignature:[null]});
  assert.deepEqual(readLastState('looper',1,{timeSignature:[4,4]}).timeSignature,[4,4]);
});
