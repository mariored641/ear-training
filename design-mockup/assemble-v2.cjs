// Assembles design-mockup/redesign-v2.html from:
//   - canon boilerplate (extracted from redesign-v1.html)
//   - each fragment in v2-sections/*.html
//
// For each fragment:
//   - extracts the <style id="section-..."> block (section-specific CSS)
//   - extracts the <script type="application/json" id="views-..."> JSON blob
//   - extracts the renderer <script> block (excluding standalone-preview helpers)
//
// Outputs a single self-contained file with hash-based routing.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const V1 = fs.readFileSync(path.join(ROOT, 'redesign-v1.html'), 'utf8');
const SECTIONS_DIR = path.join(ROOT, 'v2-sections');
const OUT = path.join(ROOT, 'redesign-v2.html');

const SECTIONS = [
  'melodic',
  'harmonic-isolated',
  'functional',
  'voice-leading',
  'solfege',
  'guitar',
  'reactive',
  'dictation',
  'rhythm',
  'positions',
  'backing-tracks',
  'feedback',
];

// -------- Extract canon CSS from v1 --------
// Take everything inside the first <style>...</style>
function extractV1CanonCss() {
  const m = V1.match(/<style>([\s\S]*?)<\/style>/);
  if (!m) throw new Error('no <style> in v1');
  return m[1];
}

// -------- Per-fragment extraction --------
function extractFragmentBlocks(name) {
  const file = path.join(SECTIONS_DIR, name + '.html');
  if (!fs.existsSync(file)) {
    console.warn(`[WARN] missing fragment: ${name}.html`);
    return null;
  }
  const src = fs.readFileSync(file, 'utf8');

  // 1. section style block: <style id="section-NAME">...</style>
  //    Some agents named it differently — try a few patterns.
  let sectionCss = '';
  const cssPatterns = [
    new RegExp(`<style[^>]*id=["']section-${name}["'][^>]*>([\\s\\S]*?)<\\/style>`, 'i'),
    new RegExp(`<style[^>]*id=["']section[^"']*["'][^>]*>([\\s\\S]*?)<\\/style>`, 'i'),
  ];
  for (const p of cssPatterns) {
    const m = src.match(p);
    if (m) { sectionCss = m[1]; break; }
  }
  // If still empty, take the SECOND <style> block (after canon-base)
  if (!sectionCss) {
    const all = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];
    if (all.length >= 2) sectionCss = all[1][1];
  }

  // 2. views JSON: <script type="application/json" id="views-NAME">...</script>
  let views = {};
  const viewsPatterns = [
    new RegExp(`<script[^>]*id=["']views-${name}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i'),
    new RegExp(`<script[^>]*type=["']application\\/json["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i'),
  ];
  for (const p of viewsPatterns) {
    const m = src.match(p);
    if (m) {
      try {
        views = JSON.parse(m[1].trim());
        break;
      } catch (e) {
        console.warn(`[WARN] ${name}: views JSON parse failed: ${e.message}`);
      }
    }
  }

  // 3. renderer script: the LAST <script> block (not type="application/json")
  let rendererJs = '';
  const allScripts = [...src.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g)];
  if (allScripts.length > 0) {
    rendererJs = allScripts[allScripts.length - 1][1];
  }

  // Cleanup: only strip TOP-LEVEL calls that would interfere.
  // Function declarations stay — master script comes AFTER and wins via hoisting/redefinition.
  // (Tried to strip function bodies with regex but template literals + nested braces broke it.)
  rendererJs = rendererJs
    // Strip DOMContentLoaded listeners that mount standalone preview
    .replace(/document\.addEventListener\(\s*['"]DOMContentLoaded['"][\s\S]*?\)\s*;?/g, '')
    // Strip resize listeners (master provides one)
    .replace(/window\.addEventListener\(\s*['"]resize['"][\s\S]*?\)\s*;?/g, '')
    // Strip popstate listeners (master provides)
    .replace(/window\.addEventListener\(\s*['"]popstate['"][\s\S]*?\)\s*;?/g, '')
    // Strip top-level render(...) bootstrap calls (the very last lines of fragments)
    .replace(/^\s*render\s*\([^)]*\)\s*;?\s*$/gm, '')
    .replace(/^\s*renderStandalonePreview\s*\([^)]*\)\s*;?\s*$/gm, '');

  // Wrap each section's renderer in its own IIFE that exposes everything onto window,
  // so name collisions between sections don't break anything — but ALSO so each fragment's
  // syntax errors stay isolated. We do this by appending an explicit window export list.
  return { sectionCss, views, rendererJs };
}

// -------- Build master --------
function build() {
  const canonCss = extractV1CanonCss();

  // collect all section CSS + views + renderers
  const allSectionCss = [];
  const allViews = {};
  const allRenderers = [];

  // home page comes from v1 itself
  const homeView = {
    home: {
      type: 'radial', breadcrumb: 'דף הבית',
      title: 'אלתור בהישג יד', sub: 'Ear Training Application',
      centerLogo: 'logo.png',
      satellites: [
        { icon: '👂', label: 'שמיעה מוזיקלית', goto: 'ear-training' },
        { icon: '🥁', label: 'קצב',           goto: 'rhythm' },
        { icon: '🎼', label: 'הכתבה',         goto: 'dictation' },
        { icon: '🎸', label: 'פוזיציות',      goto: 'positions' },
        { icon: '🎵', label: 'באקינג טראקס',  goto: 'backing-tracks' },
        { icon: '📹', label: 'פידבק',         goto: 'feedback' },
      ]
    },
    'ear-training': {
      type: 'radial', breadcrumb: 'שמיעה מוזיקלית',
      title: 'שמיעה מוזיקלית', sub: '19 Exercises · 7 Sub-Categories',
      centerEmoji: '👂',
      satellites: [
        { icon: '🎵', label: 'מלודיה',              goto: 'melodic' },
        { icon: '🎹', label: 'הרמוניה מבודדת',      goto: 'harmonic-isolated' },
        { icon: '🎼', label: 'הרמוניה פונקציונלית', goto: 'functional' },
        { icon: '🎶', label: 'תנועת קול',           goto: 'voice-leading' },
        { icon: '🎤', label: "סולפז'",              goto: 'solfege' },
        { icon: '🎸', label: 'גיטרה',               goto: 'guitar' },
        { icon: '⚡', label: 'ריאקטיבית',           goto: 'reactive' },
      ]
    }
  };
  Object.assign(allViews, homeView);

  for (const name of SECTIONS) {
    const block = extractFragmentBlocks(name);
    if (!block) continue;
    allSectionCss.push(`/* ============ ${name} ============ */\n` + block.sectionCss);
    // Merge views, but skip duplicates of allView keys
    for (const [k, v] of Object.entries(block.views)) {
      if (allViews[k]) {
        console.warn(`[WARN] view "${k}" duplicated by ${name}; keeping first`);
      } else {
        allViews[k] = v;
      }
    }
    allRenderers.push(`// ============ ${name} ============\n` + block.rendererJs);
    console.log(`[OK] ${name}: ${Object.keys(block.views).length} views, ${block.rendererJs.length} bytes of JS`);
  }

  const out = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Ear Training App — Redesign v2 (Full Mockup)</title>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
<style id="canon-base">
${canonCss}
</style>
<style id="all-sections">
${allSectionCss.join('\n\n')}
</style>
</head>
<body>

<div class="aurora">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
</div>
<div class="stars"></div>

<div class="top-bar">
  <span class="label">🎨 Mockup v2 — Ear Training App</span>
  <span class="crumb" id="crumb">דף הבית</span>
</div>

<button class="back-pill" id="back-btn" onclick="goBack()" style="display:none">← חזרה</button>
<div id="app"></div>

<!-- ============ MASTER VIEWS ============ -->
<script id="master-views">
window.VIEWS = ${JSON.stringify(allViews, null, 2)};
</script>

<!-- ============ SECTION RENDERERS (one <script> per fragment so syntax errors stay isolated) ============ -->
${allRenderers.map(r => `<script>\n${r}\n</script>`).join('\n')}

<!-- ============ MASTER DISPATCH ============ -->
<script>
  function renderRadial(def) {
    const n = def.satellites.length;
    const center = def.centerLogo
      ? \`<div class="center-logo"><img src="\${def.centerLogo}" alt="logo"/></div>\`
      : \`<div class="center-info">
           <div class="emoji">\${def.centerEmoji || '🎵'}</div>
           <h2>\${def.title}</h2>
           <p>\${def.sub || ''}</p>
         </div>\`;
    const sats = def.satellites.map((s, i) => {
      const angle = (i * 360 / n).toFixed(2);
      const slot = (i % 7) + 1;
      const subLabel = s.sub ? \`<div class="sub-label">\${s.sub}</div>\` : '';
      return \`
        <div class="satellite s-\${slot}" style="--angle:\${angle}deg" data-angle="\${angle}">
          <div class="label">\${s.label}</div>
          <div class="orb" onclick="navigate('\${s.goto}')">\${s.icon}</div>
          \${subLabel}
        </div>\`;
    }).join('');
    return \`
      <div class="stage">
        <div class="constellation" id="cur-const">
          <svg class="lines" id="cur-lines"></svg>
          <div class="center-hub">\${center}</div>
          \${sats}
        </div>
      </div>\`;
  }

  function drawLines() {
    const container = document.getElementById('cur-const');
    const svg = document.getElementById('cur-lines');
    if (!container || !svg) return;
    const w = container.clientWidth, h = container.clientHeight;
    svg.setAttribute('viewBox', \`0 0 \${w} \${h}\`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.innerHTML = '';
    const cRect = container.getBoundingClientRect();
    const cx = w/2, cy = h/2;
    container.querySelectorAll('.satellite .orb').forEach(orb => {
      const r = orb.getBoundingClientRect();
      const x = r.left + r.width/2 - cRect.left;
      const y = r.top + r.height/2 - cRect.top;
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', x);  line.setAttribute('y2', y);
      svg.appendChild(line);
    });
  }

  function render(id) {
    const def = window.VIEWS[id] || window.VIEWS.home;
    const app = document.getElementById('app');
    const back = document.getElementById('back-btn');
    const crumb = document.getElementById('crumb');

    back.style.display = id === 'home' ? 'none' : 'block';

    // breadcrumb path
    let path = [], cur = id;
    while (cur && window.VIEWS[cur]) {
      path.unshift(window.VIEWS[cur].breadcrumb || cur);
      cur = window.VIEWS[cur].parent;
    }
    if (id !== 'home') path.unshift('🏠');
    crumb.innerHTML = path.join('<span>›</span>');

    // close any open drawers
    document.querySelectorAll('.levels-drawer.open, .levels-overlay.open').forEach(el => el.classList.remove('open'));

    if (def.type === 'radial') {
      app.innerHTML = renderRadial(def);
      requestAnimationFrame(drawLines);
    } else if (def.type === 'exercise-custom' || def.type === 'tool-custom') {
      const fn = window[def.renderer];
      if (typeof fn === 'function') {
        app.innerHTML = fn();
      } else {
        app.innerHTML = '<div style="text-align:center;padding:80px;color:var(--text-dim)">⚠️ renderer not found: ' + def.renderer + '</div>';
      }
    } else if (def.type === 'exercise') {
      // legacy generic exercise template (from v1)
      app.innerHTML = '<div style="text-align:center;padding:80px;color:var(--text-dim)">[generic exercise: ' + (def.title || id) + ']</div>';
    } else if (def.type === 'tool') {
      app.innerHTML = '<div style="text-align:center;padding:80px;color:var(--text-dim)">[legacy tool: ' + (def.tool || id) + ']</div>';
    } else {
      app.innerHTML = '<div style="text-align:center;padding:80px;color:var(--text-dim)">⚠️ unknown view type: ' + def.type + '</div>';
    }
  }

  function navigate(id) {
    history.pushState(null, '', '#' + id);
    render(id);
  }
  function goBack() {
    if (history.length > 1) history.back();
    else navigate('home');
  }

  // Master drawer toggle — works for all sections (levels-drawer-X / levels-overlay-X)
  function toggleDrawer(idOrSuffix) {
    // try both forms: full id, or suffix to be combined with levels-drawer- prefix
    let drawer = document.getElementById(idOrSuffix);
    let overlay = null;
    if (!drawer) {
      drawer = document.getElementById('levels-drawer-' + idOrSuffix);
      overlay = document.getElementById('levels-overlay-' + idOrSuffix);
    }
    if (drawer) drawer.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
    else {
      // try sibling overlay
      const sib = drawer && drawer.previousElementSibling;
      if (sib && sib.classList.contains('levels-overlay')) sib.classList.toggle('open');
    }
  }

  function selectLevel(exId, n) {
    // mock — closes drawer
    toggleDrawer(exId);
  }

  // Master tab/screen switchers
  function feedbackScreen(which) {
    ['prep','rec','prev'].forEach(s => {
      const el = document.getElementById('feedback-' + s);
      if (el) el.style.display = (s === which) ? 'block' : 'none';
    });
    // also try fb- prefix (v1 naming)
    ['prep','rec','prev'].forEach(s => {
      const el = document.getElementById('fb-' + s);
      if (el) el.style.display = (s === which) ? 'block' : 'none';
    });
    document.querySelectorAll('.screen-tabs button').forEach((b, i) => {
      b.classList.toggle('active', ['prep','rec','prev'][i] === which);
    });
  }

  window.addEventListener('popstate', () => {
    render(location.hash.slice(1) || 'home');
  });
  window.addEventListener('resize', drawLines);

  // initial render
  render(location.hash.slice(1) || 'home');
</script>
</body>
</html>
`;

  fs.writeFileSync(OUT, out, 'utf8');
  const sizeKB = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
  console.log(`\n[DONE] wrote ${OUT} (${sizeKB} KB)`);
  console.log(`Total views: ${Object.keys(allViews).length}`);
}

build();
