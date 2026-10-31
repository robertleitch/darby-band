// Button checker for Field Commander (Rehearsal.html).
// Opens every main screen at iPhone and iPad sizes, upright and sideways, and lists
// every visible button that breaks the house button rule. It only reports; it fixes nothing.
//
// Rule: rectangle with 3px corners · navy fill, white bold CAPS · green = go / on / chosen ·
// blue = Voice · red = delete only · big thin − and + · plain symbols (⚙ ♪ ⌕) have no box.
//
// Run:  node tools/button-check.js http://localhost:8765/Rehearsal.html [report.md]
const {chromium}=require('playwright'); const fs=require('fs');
const URL=process.argv[2]||'http://localhost:8765/Rehearsal.html', OUT=process.argv[3]||'button-report.md';
const OK=['rgb(44, 61, 78)','rgb(37, 61, 86)','rgb(34, 52, 74)','rgb(46, 139, 87)','rgb(64, 106, 150)','rgb(61, 95, 140)','rgb(179, 38, 30)','rgb(180, 35, 24)','rgb(47, 69, 96)','rgb(255, 255, 255)','rgba(0, 0, 0, 0)'];
const SIZES=[['iPhone upright',430,932,true],['iPhone sideways',932,430,true],['iPad sideways',1180,820,false],['iPad upright',820,1180,false]];
const SCREENS=[
  ['Met',()=>{ fcMode('field'); fcGo('met'); }],
  ['Met · run loaded',()=>{ fcMode('field'); fcGo('met'); metLoadRun('show'); mcGo('sets'); }],
  ['Drill',()=>{ metUnload(); fcMode('field'); fcGo('drill'); }],
  ['Drill · SETS drawer',()=>{ fcMode('field'); fcGo('drill'); setUI('side',true); }],
  ['Build · Blocks',()=>{ setUI('side',false); fcMode('prog'); fcGo('blocks'); }],
  ['Build · Chains',()=>{ fcMode('prog'); fcGo('chains'); }],
  ['Build · Sounds',()=>{ fcMode('prog'); fcGo('sounds'); }],
  ['Settings · Field',()=>{ fcMode('field'); fcGo('met'); openSettings(); setTab('field'); }],
  ['Settings · Program',()=>{ setTab('prog'); }],
];
(async()=>{ const b=await chromium.launch(); const found=new Map();
  for(const [sz,w,h,mob] of SIZES){ const c=await b.newContext({viewport:{width:w,height:h},hasTouch:mob,isMobile:mob}); const p=await c.newPage();
    await p.goto(URL); await p.waitForTimeout(1800); await p.evaluate(()=>document.querySelectorAll('#splash,.splash').forEach(e=>e.remove()));
    for(const [name,fn] of SCREENS){ try{ await p.evaluate(`(${fn})()`); }catch(e){ continue; } await p.waitForTimeout(400);
      const bad=await p.evaluate(OK=>{ const out=[]; const vis=e=>{ const r=e.getBoundingClientRect(); if(r.width<4||r.height<4) return false; const s=getComputedStyle(e); return s.visibility!=='hidden'&&s.display!=='none'&&+s.opacity>0.05&&e.offsetParent!==null||s.position==='fixed'; };
        const dlg=document.querySelector('dialog[open]');
        document.querySelectorAll('button,.seg>*,[role=button]').forEach(e=>{ if(!vis(e)) return; if(dlg&&!dlg.contains(e)) return; const s=getComputedStyle(e);
          const txt=(e.innerText||e.textContent||'').trim().replace(/\s+/g,' '), letters=/[A-Za-z]/.test(txt), icon=!letters;
          const bg=s.backgroundColor, rad=parseFloat(s.borderTopLeftRadius)||0, fw=+s.fontWeight||400, caps=s.textTransform==='uppercase'||txt===txt.toUpperCase();
          const why=[]; const boxless=bg==='rgba(0, 0, 0, 0)'&&s.borderTopStyle==='none'&&!/inset/.test(s.boxShadow);
          if(!(icon&&boxless)){ if(rad>4.5) why.push(`round corners (${Math.round(rad)}px)`); const near=OK.some(o=>{ const A=(o.match(/[\d.]+/g)||[]).map(Number), B=(bg.match(/[\d.]+/g)||[]).map(Number); return A.length>=3&&B.length>=3&&(A[3]??1)===(B[3]??1)&&Math.abs(A[0]-B[0])+Math.abs(A[1]-B[1])+Math.abs(A[2]-B[2])<=12; }); if(!near) why.push(`color ${bg}`); }
          if(letters&&!caps) why.push('not CAPS'); if(fw>700) why.push(`too bold (${fw})`);
          if(/^[−+\-]$/.test(txt)&&fw>400) why.push('− / + should be thin');
          if(why.length) out.push({id:e.id||'', cls:(e.className&&e.className.baseVal===undefined?e.className:'').toString().slice(0,30), txt:txt.slice(0,28), why:why.join(', ')}); });
        return out; },OK);
      bad.forEach(x=>{ const k=(x.id||x.cls||'')+'|'+x.txt+'|'+x.why; if(!found.has(k)) found.set(k,Object.assign(x,{where:new Set()})); found.get(k).where.add(`${name} (${sz})`); }); }
    await c.close(); }
  await b.close();
  const rows=[...found.values()].sort((a,b)=>[...a.where][0].localeCompare([...b.where][0]));
  let md=`# Off-rule buttons (${rows.length})\n\nReport only — nothing was changed.\n\n| Button | What's off | Where |\n|---|---|---|\n`;
  rows.forEach(r=>{ md+=`| ${(r.txt||'(icon)').replace(/\|/g,'/')}${r.id?' `#'+r.id+'`':''} | ${r.why} | ${[...r.where].slice(0,3).join('; ')}${r.where.size>3?` +${r.where.size-3} more`:''} |\n`; });
  fs.writeFileSync(OUT,md); console.log(`${rows.length} off-rule buttons → ${OUT}`); })();
