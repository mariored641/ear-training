// Runs in the browser. Alpha backgrounds are composited through all ancestors.
export function scanContrast() {
  const parse = s => { const n = s.match(/[\d.]+/g)?.map(Number); return n?.length >= 3 ? [...n.slice(0,3), n[3] ?? 1] : [0,0,0,0]; };
  const over = (a,b) => { const alpha=a[3]+b[3]*(1-a[3]); return [0,1,2].map(i=>(a[i]*a[3]+b[i]*b[3]*(1-a[3]))/(alpha||1)).concat(alpha); };
  const luminance = c => c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const results=[];
  for(const el of document.querySelectorAll('body *')) {
    const style=getComputedStyle(el), rect=el.getBoundingClientRect();
    if(!rect.width || !rect.height || style.visibility==='hidden' || el.closest('[inert], :disabled') || el.matches(':disabled, input[type=range], option, optgroup, script, style, svg *')) continue;
    const text=el.matches('select,input,textarea') ? (el.selectedOptions?.[0]?.textContent || el.value || el.placeholder) : [...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
    if(!text || !el.closest('button,select,input,textarea,label,[role="tab"],[role="toolbar"],[class*="bar"],[class*="control"],[class*="select"],[class*="tab"],[class*="chip"],[class*="toggle"],[class*="settings"],[class*="popover"],[class*="panel"]')) continue;
    const chain=[]; for(let n=el;n;n=n.parentElement) chain.unshift(n);
    let candidates=[[255,255,255,1]], opacity=1; const gradients=[];
    for(const n of chain) {
      const s=getComputedStyle(n); opacity*=Number(s.opacity);
      candidates=candidates.map(b=>over(parse(s.backgroundColor),b));
      const layers=s.backgroundImage.match(/(?:linear|radial)-gradient\((?:[^()]|\([^()]*\))*\)/g)||[];
      for(const layer of layers.reverse()) {
        gradients.push(layer);
        const stops=(layer.match(/rgba?\([^)]+\)/g)||[]).map(parse);
        if(stops.length) candidates=candidates.flatMap(b=>stops.map(c=>over(c,b)));
      }
      if(candidates.length>64) candidates=candidates.slice(0,64);
    }
    const placeholder=el.matches('input,textarea') && !el.value && !!el.placeholder;
    const inkStyle=placeholder ? getComputedStyle(el,'::placeholder') : style;
    const fg=parse(inkStyle.color); fg[3]*=opacity*(placeholder?Number(inkStyle.opacity):1);
    const ratios=candidates.map(b=>{const f=over(fg,b), a=luminance(f), c=luminance(b);return (Math.max(a,c)+.05)/(Math.min(a,c)+.05);});
    results.push({selector:el.tagName.toLowerCase()+'.'+[...el.classList].join('.'),text:text.slice(0,90),ratio:Math.min(...ratios),color:inkStyle.color,background:style.backgroundColor,gradients});
    if(el.matches('select')) for(const option of el.querySelectorAll('option,optgroup')) {
      const os=getComputedStyle(option), backgrounds=candidates.map(b=>over(parse(os.backgroundColor),b));
      const ratios=backgrounds.map(b=>{const f=over(parse(os.color),b), a=luminance(f), c=luminance(b);return (Math.max(a,c)+.05)/(Math.min(a,c)+.05);});
      results.push({selector:'select.'+[...el.classList].join('.')+' '+option.tagName.toLowerCase(),text:(option.label||option.textContent).slice(0,90),ratio:Math.min(...ratios),color:os.color,background:os.backgroundColor,gradients:[]});
    }

  }
  return results;
}
