import { chromium } from '@playwright/test';
import { scanContrast } from '../e2e/helpers/contrast.js';
import fs from 'node:fs';
const base=process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
import { walkContrast } from '../e2e/helpers/contrast-navigation.js';
const browser=await chromium.launch({headless:true}); const records=[];
const jobs=[];
for(const theme of (process.env.QUICK ? ['dark']:['light','dark'])) for(const lang of (process.env.QUICK ? ['en']:['en','he'])) for(const width of (process.env.QUICK ? [1280]:[360,390,1280])) jobs.push({theme,lang,width});
async function worker() {
while(jobs.length) {
 const {theme,lang,width}=jobs.shift();
 const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,serviceWorkers:'block'});
 await context.addInitScript(l=>localStorage.setItem('ear-training:language',l),lang);
 const page=await context.newPage();
 await walkContrast(page,base,async(route,instance)=>{
  const results=await page.evaluate(scanContrast); records.push({route,instance,theme,lang,width,results});
  if(process.env.SCREENSHOTS && width!==360) await page.screenshot({path:`/workspace/codex-night-11-12/screens/t6-${instance}-${theme}-${lang}-${width}.png`,fullPage:true});
 });
 await context.close();
}
}
await Promise.all(Array.from({length:3},()=>worker()));
await browser.close();fs.writeFileSync(process.env.AUDIT_OUTPUT||'/tmp/contrast-audit.json',JSON.stringify(records,null,2));
const failures=records.flatMap(r=>r.results.filter(x=>x.ratio<4.5).map(x=>({...r,results:undefined,...x})));
const unique=[...new Map(failures.map(x=>[x.route+' '+x.selector+' '+x.text,x])).values()];console.log(JSON.stringify({states:records.length,failures:failures.length,unique},null,2));

process.exitCode=failures.length ? 1 : 0;
