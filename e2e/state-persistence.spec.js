import { test, expect } from '@playwright/test';

const screens = process.env.T5_SCREEN_DIR || '/workspace/codex-night-11-12/screens';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ear-training:language', 'en'));
});
async function roundTrip(page, route, check) {
  // Client-side navigation really unmounts the tool (no full document reload).
  await page.evaluate(() => { history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.locator('.constellation')).toBeVisible();
  await page.evaluate(route => { history.pushState({}, '', route); window.dispatchEvent(new PopStateEvent('popstate')); }, route);
  await check();
  await page.reload();
  await check();
}

test('backing chords survive section changes, reload, cache clear and reopen, stopped', async ({ page, browser }) => {
  await page.goto('/backing-tracks');
  await page.locator('.chord-bar-btn').first().click();
  await page.locator('.root-btn').getByText('F', { exact: true }).click();
  await page.locator('.confirm-btn').click();
  const first = page.locator('.chord-bar-btn, .chord-bar-split').first();
  await expect(first).toContainText('F');
  const check = async () => {
    await expect(first).toContainText('F');
    await expect(page.getByRole('button', {name:'Play',exact:true})).toBeVisible();
  };
  await roundTrip(page,'/backing-tracks',check);
  await page.evaluate(async () => { for (const key of await caches.keys()) await caches.delete(key); });
  await page.reload();
  await check();
  await page.screenshot({path:`${screens}/t5-backing-persisted.png`});
  const context = await browser.newContext({storageState:await page.context().storageState()});
  const reopened = await context.newPage();
  await reopened.goto('/backing-tracks');
  await expect(reopened.locator('.chord-bar-btn, .chord-bar-split').first()).toContainText('F');
  await expect(reopened.getByRole('button',{name:'Play',exact:true})).toBeVisible();
  await reopened.screenshot({path:`${screens}/t5-backing-reopened.png`});
  await context.close();
});

for (const id of ['M1','M2','M3','H1','H2','H3','H4','F0','F1','F2','F3','F4','V1','V2','S1','S2','G1','R1','R2']) {
  test(`${id}: settings survive navigation and reload`, async ({page}) => {
    const route = `/exercise/${id}`;
    await page.goto(route);
    const counter = page.locator('.et-counter[aria-label="Questions"]');
    if (id === 'R1' || id === 'R2') {
      const select = page.locator('select:visible').first();
      await expect(select).toBeVisible();
      const options = await select.locator('option').evaluateAll(nodes => nodes.filter(n => !n.disabled).map(n=>n.value));
      const original = await select.inputValue();
      const next = options.find(v=>v!==original);
      await select.selectOption(next);
      await roundTrip(page,route,()=>expect(page.locator('select:visible').first()).toHaveValue(next));
    } else {
      await expect(counter).toBeVisible();
      const value = counter.locator('.et-counter-value');
      const before = Number(await value.innerText());
      await counter.getByRole('button',{name:'Increase',exact:true}).click();
      await roundTrip(page,route,async()=> {
        await expect(value).toHaveText(String(before+1));
        await expect(page.locator('.playing, .is-playing')).toHaveCount(0);
      });
    }
  });
}

test('feedback URL draft survives navigation and reload',async({page})=> {
  await page.goto('/feedback');
  const input=page.locator('input[type="url"], input[type="text"]').first();
  await input.fill('https://www.youtube.com/watch?v=lessonDraft');
  await roundTrip(page,'/feedback',()=>expect(input).toHaveValue('https://www.youtube.com/watch?v=lessonDraft'));
});

for (const id of ['1','2','3','4a','4b','4c']) {
  test(`legacy ${id}: settings survive navigation and reload`,async({page})=> {
    const route=`/exercise/${id}`;
    await page.goto(route);
    if(id!=='3') await page.getByRole('button',{name:'Settings',exact:true}).click();
    const kind = ['4a','4c'].includes(id) ? 'checkbox' : ['3','4b'].includes(id) ? 'select' : 'range';
    const control = kind === 'select' ? page.locator('select:visible').first() : page.locator(`input[type="${kind}"]:visible`).first();
    await expect(control).toBeVisible();
    let next;
    if(kind === 'select') {
      const options=await control.locator('option').evaluateAll(nodes=>nodes.filter(n=>!n.disabled).map(n=>n.value));
      const before = await control.inputValue(); next=options.find(v=>v!==before);
      await control.selectOption(next);
    } else if(kind === 'checkbox') {
      next=!(await control.isChecked()); await control.setChecked(next);
    } else { next=String(Number(await control.getAttribute('min'))+1); await control.fill(next); await control.dispatchEvent('input'); }
    await roundTrip(page,route,async()=> {
      if(id!=='3') await page.getByRole('button',{name:'Settings',exact:true}).click();
      if(kind==='checkbox') await expect(control).toBeChecked({checked:next});
      else await expect(control).toHaveValue(next);
    });
  });
}

test('rhythmic dictation tabs and tempo survive navigation and reload',async({page})=> {
  await page.goto('/rhythm-training');
  await page.getByRole('button',{name:'Call & Response',exact:true}).click();
  const slider=page.locator('.rt-slider');
  await slider.fill('110'); await slider.dispatchEvent('input');
  await roundTrip(page,'/rhythm-training',async()=> {
    await expect(page.getByRole('button',{name:'Call & Response',exact:true})).toHaveClass(/active/);
    await expect(slider).toHaveValue('110');
    await expect(page.getByRole('button',{name:/Start/})).toBeVisible();
  });
});

test('looper tempo restores stopped',async({page})=> {
  await page.goto('/looper');
  const tempo=page.locator('input[type="number"]').first();
  await tempo.fill('113'); await tempo.press('Tab');
  await roundTrip(page,'/looper',async()=> {
    await expect(tempo).toHaveValue('113');
    await expect(page.locator('.is-recording, .is-counting')).toHaveCount(0);
  });
});

for (const tab of ['Positions','Arpeggios','All Scales','Partial Chords']) {
  test(`positions ${tab}: selection/content survives tab unmount and reload`,async({page})=> {
    await page.goto('/positions');
    await page.getByRole('button',{name:tab,exact:true}).click();
    if(tab === 'Partial Chords') {
      await page.getByRole('button',{name:'+ Add',exact:true}).click();
      await page.getByRole('button',{name:'All Scales',exact:true}).click();
      await page.getByRole('button',{name:tab,exact:true}).click();
      await roundTrip(page,'/positions',async()=> {
        await expect(page.getByRole('button',{name:tab,exact:true})).toHaveClass(/active/);
        await expect(page.locator('.pcc-card')).toHaveCount(1);
      });
    } else {
      const select=page.locator('select:visible').first();
      const options=await select.locator('option').evaluateAll(ns=>ns.map(n=>n.value));
      const before=await select.inputValue();const next=options.find(v=>v!==before);
      await select.selectOption(next);
      await page.getByRole('button',{name:'Partial Chords',exact:true}).click();
      await page.getByRole('button',{name:tab,exact:true}).click();
      await roundTrip(page,'/positions',()=>expect(page.locator('select:visible').first()).toHaveValue(next));
    }
  });
}
for(const tab of ['Rhythm Explorer','Polyrhythm','Advanced Subdivisions']) {
  test(`rhythm ${tab}: pattern survives tab unmount and reload stopped`,async({page})=> {
    await page.goto('/exercise/4');await page.getByRole('button',{name:tab,exact:true}).click();
    let check;
    if(tab==='Rhythm Explorer') {
      await page.getByRole('button',{name:'3/4',exact:true}).click();
      check=()=>expect(page.getByRole('button',{name:'3/4',exact:true})).toHaveClass(/active/);
    } else if(tab==='Polyrhythm') {
      const row=page.locator('.row-controls').first();
      const count=row.locator('.count-display');
      const before=await count.innerText();await row.locator('.control-btn').first().click();
      const after=await count.innerText();expect(after).not.toBe(before);
      check=()=>expect(page.locator('.row-controls .count-display').first()).toHaveText(after);
    } else {
      await page.locator('select.division-select').first().selectOption('3');
      check=()=>expect(page.locator('select.division-select').first()).toHaveValue('3');
    }
    await page.getByRole('button',{name:tab==='Polyrhythm'?'Rhythm Explorer':'Polyrhythm',exact:true}).click();
    await page.getByRole('button',{name:tab,exact:true}).click();await check();
    await roundTrip(page,'/exercise/4',async()=> {
      await check();await expect(page.getByRole('button',{name:/Play$/})).toBeVisible();
    });
  });
}

test('pre-existing partial-chords preset loads without changing payload format',async({page})=> {
  await page.goto('/');
  const payload=JSON.stringify([{id:'local-before-t5',name:'Before upgrade',progression:[{root:'C',quality:'major',cagedIdx:0,setIdx:0}],activeIdx:0,builderRoot:'C',builderQuality:'major',displayMode:'tones',targetFret:8,width:3}]);
  await page.evaluate(payload=>localStorage.setItem('partial_chords_presets_local',payload),payload);
  await page.goto('/positions');await page.getByRole('button',{name:'Partial Chords',exact:true}).click();
  await page.getByLabel('Load Preset',{exact:true}).selectOption('local-before-t5');
  await expect(page.locator('.pcc-card')).toHaveCount(1);
  await page.reload();await expect(page.locator('.pcc-card')).toHaveCount(1);
  expect(await page.evaluate(()=>localStorage.getItem('partial_chords_presets_local'))).toBe(payload);
});

test('split chord durations, extensions and bar count survive restore',async({page})=> {
  await page.goto('/backing-tracks');
  await page.locator('.chord-bar-btn').first().click();
  await page.locator('.cpm-bar-type-btn').nth(1).click();
  await page.locator('.root-btn').getByText('F',{exact:true}).first().click();
  await page.locator('.confirm-btn').click();
  await roundTrip(page,'/backing-tracks',async()=> {
    await expect(page.locator('.chord-bar-split')).toHaveCount(1);
    await expect(page.locator('.chord-bar-split').first()).toContainText('F');
  });
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('et.state.v1.backing-tracks'))?.data.barCount)).toBe(4);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('et.state.v1.backing-tracks')).data.chords.slice(0,2).map(c=>c.beats))).toEqual([2,2]);
});

test('feedback attachment and a recorded take restore paused without permission requests',async({page})=> {
  await page.goto('/feedback');
  await page.locator('input[type="file"]').setInputFiles({name:'lesson.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1sAAAAASUVORK5CYII=','base64')});
  await expect(page.locator('.fb-file-btn')).toContainText('lesson.png');
  await roundTrip(page,'/feedback',()=>expect(page.locator('.fb-file-btn')).toContainText('lesson.png'));
  const saved=await page.evaluate(async()=> {
    const {saveMediaDraft}=await import('/src/utils/mediaDraft.js');
    const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
    const stream=canvas.captureStream(10);const chunks=[];const recorder=new MediaRecorder(stream);
    const blob=await new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType}));recorder.start();canvas.getContext('2d').fillRect(0,0,32,32);setTimeout(()=>recorder.stop(),200);});
    stream.getTracks().forEach(track=>track.stop());
    return saveMediaDraft('feedback-recording',blob);
  });
  expect(saved).toBe(true);
  await page.reload();
  await expect(page.locator('.fb-preview-video')).toBeVisible();
  expect(await page.locator('video').evaluate(video=>video.paused)).toBe(true);
  await roundTrip(page,'/feedback',()=>expect(page.locator('.fb-preview-video')).toBeVisible());
  expect(await page.locator('video').evaluate(video=>video.paused)).toBe(true);
});

test('floating recorded audio restores ready without autoplay',async({page})=> {
  await page.goto('/');
  await page.evaluate(async()=> {
    const {saveMediaDraft}=await import('/src/utils/mediaDraft.js');
    await saveMediaDraft('global-recording',new Blob(['sample'],{type:'audio/webm'}),{durationSec:3});
  });
  await page.reload();
  await expect(page.locator('.gt-share-audio')).toBeVisible();
  expect(await page.locator('.gt-share-audio').evaluate(audio=>audio.paused)).toBe(true);
});

test('floating metronome and tuner preferences survive reload with audio stopped',async({page})=> {
  await page.goto('/');
  await page.locator('.gt-fab-main').click();
  await page.locator('.gt-mini-metro').click();
  await page.getByRole('slider',{name:'BPM',exact:true}).fill('117');
  await page.locator('.gt-metro-dots-row button').last().click();
  await page.locator('.gt-metro-keepalive-btn').click();
  await page.locator('.gt-mini-tuner').click();
  await page.locator('.gt-mode-btn').nth(1).click();
  await page.reload();
  await expect(page.locator('.gt-popover')).toHaveCount(0);
  await page.locator('.gt-fab-main').click();
  await page.locator('.gt-mini-tuner').click();
  await expect(page.locator('.gt-mode-btn').nth(1)).toHaveClass(/active/);
  await page.locator('.gt-mini-metro').click();
  await expect(page.getByRole('slider',{name:'BPM',exact:true})).toHaveValue('117');
  await expect(page.locator('.gt-metro-dot')).toHaveCount(5);
  await expect(page.locator('.gt-metro-keepalive-btn')).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('dialog',{name:'Metronome'}).getByRole('button',{name:'Play',exact:true})).toBeVisible();
});

test('backing writes debounce edits and flush before leaving a section',async({page})=> {
  await page.goto('/backing-tracks');
  await expect.poll(()=>page.evaluate(()=>Boolean(localStorage.getItem('et.state.v1.backing-tracks')))).toBe(true);
  await page.evaluate(()=> {
    window.t5Writes=0;
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key==='et.state.v1.backing-tracks')window.t5Writes++;return original.call(this,key,value);};
  });
  await page.getByRole('button',{name:/bpm$/i}).click();
  await page.locator('.bp-popup-round-btn').first().evaluate(button=>{button.click();button.click();button.click();});
  const label=await page.getByRole('button',{name:/bpm$/i}).innerText();
  await expect.poll(()=>page.evaluate(()=>window.t5Writes)).toBe(1);
  await page.locator('.bp-popup-round-btn').first().click();
  const latest=await page.getByRole('button',{name:/bpm$/i}).innerText();expect(latest).not.toBe(label);
  await roundTrip(page,'/backing-tracks',()=>expect(page.getByRole('button',{name:latest,exact:true})).toBeVisible());
});

test('malformed editable records fall back without crashing any renderer',async({page})=> {
  await page.goto('/');
  await page.evaluate(()=> {
    const put=(id,data)=>localStorage.setItem(`et.state.v1.${id}`,JSON.stringify({v:1,data}));
    put('positions',{activeTab:'partialchords'});
    put('positions-partial-sequence',{progression:[null,{root:'C',quality:'unknown'}],activeIdx:8});
    put('rhythm',{activeTab:'advanced'});
    put('rhythm-advanced',{beats:[null,{length:1,cells:{}}]});
    put('positions-all-scales',{overlays:[null,42]});
    put('backing-tracks',{chords:[null],selectedKey:{root:{},type:'bad'}});
  });
  await page.goto('/positions');await expect(page.getByRole('button',{name:'+ Add',exact:true})).toBeVisible();
  await expect(page.locator('.pcc-card')).toHaveCount(0);
  await page.getByRole('button',{name:'All Scales',exact:true}).click();await expect(page.locator('select').first()).toBeVisible();
  await page.goto('/exercise/4');await page.getByRole('button',{name:'Advanced Subdivisions',exact:true}).click();
  await expect(page.locator('select.division-select').first()).toBeVisible();
  await page.goto('/backing-tracks');await expect(page.locator('.chord-bar-btn').first()).toBeVisible();
});
