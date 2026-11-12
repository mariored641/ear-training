export const routes=['/','/positions','/backing-tracks','/looper','/feedback','/rhythm-training','/category/dictation','/category/melodic','/category/harmonic','/category/ear-training',...['melodic','harmonic-isolated','functional','voice-leading','solfege','guitar','reactive'].map(s=>'/category/ear-training/'+s),...['M1','M2','M3','H1','H2','H3','H4','F0','F1','F2','F3','F4','V1','V2','S1','S2','G1','R1','R2','1','2','3','4','4a','4b','4c'].map(s=>'/exercise/'+s), '/feedback-test','/soundfont-test','/style-parser-test','/chord-engine-test','/engine-test','/timing-test','/test/backing-tracks','/test/sf2-lab', '/positions', '/backing-tracks'];

// A DOMContentLoaded navigation can finish before the React route mounts.
// Check actual view content, including after panel-isolation reloads.
export async function waitForView(page) {
 await page.waitForFunction(() => {
  const root=document.getElementById('root');
  return root && root.innerText.trim().length>20 &&
   ![...root.querySelectorAll('.container')].some(el=>/^(Loading|טוען)[….]*$/.test(el.textContent.trim()));
 });
}

export async function walkContrast(page, base, capture) {
 for (const route of routes) {
  await page.goto(base+route,{waitUntil:'domcontentloaded'}); await waitForView(page);
  await page.addStyleTag({content:'*,*::before,*::after { transition: none !important; animation: none !important; }'});
  await page.waitForTimeout(180);
  await page.locator('#root > .container').filter({hasText:/^(Loading|טוען)/i}).waitFor({state:'hidden',timeout:10000}).catch(()=>{});
  const instance=route.replaceAll('/','-').replace(/^-/, '')||'home';
  await capture(route,instance);
  const tabs=page.locator(route==='/test/backing-tracks' ? 'nav button' : '.positions-tabs .tab-btn,.tab-button,.rt-tabs button');
  for(let i=0;i<await tabs.count();i++) {
   await tabs.nth(i).click(); await page.waitForTimeout(60);
   await capture(route,instance+'-tab-'+i);
   if(route==='/positions' && i===2) {
    await page.locator('.ast-select-scale').selectOption({index:2});
    await page.locator('.ast-add-overlay-btn').click();
    await capture(route,'all-scales-selector');
   }
  }
  // Open non-playing controls, then reload to isolate each panel.
  const panels=route==='/backing-tracks' ? ['.bp-info-btn >> nth=0','.bp-info-btn >> nth=1','.bp-info-btn >> nth=2','.bp-style-name','.bp-tab >> nth=0','.bp-tab >> nth=1','.bp-tab >> nth=3','.bp-tab >> nth=4']
    : route==='/looper' ? ['.looper-settings-btn'] : route==='/feedback' ? ['.fb-tab >> nth=1'] : route==='/exercise/4' ? ['.presets-btn-inline:not(.save-btn)', '.presets-btn-inline.save-btn'] : route.startsWith('/exercise/') ? ['.et-header-level-trigger','button:has-text("Settings"),button:has-text("הגדרות")']
    : route==='/positions' ? ['.pct-more-btn'] : [];
  for(let i=0;i<panels.length;i++) {
   const button=page.locator(panels[i]).first();
   const required=!route.startsWith('/exercise/') || route==='/exercise/4' || (i===0 && /^\/exercise\/[A-Z]/.test(route));
   if(required) await button.waitFor({state:'visible'});
   if(await button.isVisible() && await button.isEnabled()) {
    // The draggable global FAB may cover the dock on phones; this suite audits paint, not hit testing.
    await button.dispatchEvent('click'); await page.waitForTimeout(80);
    if(route==='/backing-tracks' && i===7) {
      await page.locator('.bp-templates-tab').first().click();
      if(await page.locator('.lib-filter-btn.active').count()) await page.locator('.lib-filter-btn').click();
      await page.locator('.lib-fav-btn').first().waitFor({state:'visible',timeout:15000});
    }
    await capture(route,instance+'-panel-'+i);
    if(route==='/backing-tracks' && i===7) {
      await page.locator('.lib-fav-btn').first().dispatchEvent('click');
      await page.locator('.lib-filter-btn').click(); await capture(route,'backing-favorites');
      await page.locator('.bp-templates-tab').nth(1).click(); await capture(route,'backing-saved-progressions');
    }
    await page.keyboard.press('Escape');
    await page.goto(base+route,{waitUntil:'domcontentloaded'}); await waitForView(page); await page.addStyleTag({content:'* {transition:none !important; animation:none !important}'}); await page.waitForTimeout(100);
   }
  }
  if(route==='/') {
   await page.locator('.gt-fab-main').click();
   await page.locator('.gt-mini-metro').click(); await capture(route,'global-metronome');
   await page.locator('.gt-mini-tuner').click(); await capture(route,'global-tuner');
  }
 }
}
