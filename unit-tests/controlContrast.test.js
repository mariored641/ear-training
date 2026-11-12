import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../src/styles/workshop-theme.css',import.meta.url),'utf8');
const tokens=new Map([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
function color(token) {
 let value=tokens.get(token);
 for(let i=0;value?.startsWith('var(')&&i<10;i++) value=tokens.get(value.slice(4,-1));
 assert.match(value,/^#[\da-f]{6}$/i,`${token} must resolve to an opaque color`);
 return value.slice(1).match(/../g).map(x=>parseInt(x,16)/255);
}
function luminance(rgb) {return rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
for(const [surface,ink] of [['--control-surface','--control-text'],['--control-accent-low','--control-ink'],['--paper-aged','--control-paper-ink']]) {
 test(`${ink} remains AA on ${surface}`,()=>{
  const a=luminance(color(surface)),b=luminance(color(ink));
  assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);
 });
}
