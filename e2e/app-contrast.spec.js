import { test, expect } from '@playwright/test';
import { scanContrast } from './helpers/contrast.js';
import { walkContrast } from './helpers/contrast-navigation.js';
test.describe.configure({ mode: 'parallel' });

test('contrast scanner catches dark ink on dark surfaces and composites alpha',async({page})=>{
 await page.setContent('<div style="background:rgb(20,20,20)"><button style="background:rgba(0,0,0,.5);color:rgb(10,10,10)">Unreadable</button><button style="background:rgb(20,20,20);color:white">Readable</button></div>');
 const results=await page.evaluate(scanContrast);
 expect(results.find(x=>x.text==='Unreadable').ratio).toBeCloseTo(1,1);
 expect(results.find(x=>x.text==='Readable').ratio).toBeGreaterThan(18);
});
for(const theme of ['light','dark']) for(const lang of ['en','he']) for(const width of [360,390,1280]) {
 test(`bars and selectors: ${theme} ${lang} ${width}`,async({browser,baseURL},testInfo)=>{
  test.setTimeout(240000);
  const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,serviceWorkers:'block'});
  await context.addInitScript(l=>localStorage.setItem('ear-training:language',l),lang);
  const page=await context.newPage(), failures=[],records=[];
  await walkContrast(page,baseURL,async(route,instance)=>{
   expect(await page.locator('html').getAttribute('dir')).toBe('ltr');
   const results=await page.evaluate(scanContrast); records.push({route,instance,results});
   failures.push(...results.filter(x=>x.ratio<4.5).map(x=>({route,instance,...x})));
  });
  await testInfo.attach('contrast-results',{body:JSON.stringify(records,null,2),contentType:'application/json'});
  await context.close();
  expect(failures, JSON.stringify(failures.map(({route,instance,selector,text,ratio})=>({route,instance,selector,text,ratio})),null,2)).toEqual([]);
 });
}
