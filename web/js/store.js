/* ===== store.js — your notebook on disk — palette, entries, and how two tabs share them ===== */
var COL={a:'#2f7d79',b:'#41659a',c:'#7c9a4e',d:'#8b4f7d'},PALORDER=['a','b','c','d'];
try{var pj=JSON.parse(localStorage.getItem('lb-pal')||'null');if(pj&&pj.order&&pj.col){var okc=/^#[0-9a-f]{6}$/i;for(var kk in pj.col)if(okc.test(pj.col[kk]))COL[kk]=pj.col[kk];PALORDER=pj.order.filter(function(q){return COL[q]}).slice(0,10)}}catch(e){}
function savePal(){try{localStorage.setItem('lb-pal',JSON.stringify({order:PALORDER,col:COL}))}catch(e){}}
/* The prototype used to invent demo entries (Chem quiz, Chem lab, ...). They are gone:
   nothing is fabricated any more, and any that were already saved are scrubbed once,
   matched exactly on text + colour + time so your own entries are never touched. */
var DEMO=[[1,'Chem quiz','a',540],[3,'Soccer game','c',600],[6,'Essay due','d'],[9,'Study group','b',900],[9,'Pizza night','c',1140],[11,'Call grandma','b',1020],[11,'Read ch. 4','a'],[12,'Math tutor','b',930],[13,'Band practice','b',960],[14,'Lab report','a'],[14,'Chem lab','a',510],[16,'Movie w/ Mia','d',1170],[22,'Math test!','d',540],[24,'Band practice','b',960],[29,'Bio hw','a']];
function isDemo(e){
  for(var i=0;i<DEMO.length;i++){var d=DEMO[i];
    if(e.t===d[1]&&e.c===d[2]&&(d[3]==null?e.s==null:e.s===d[3]))return true}
  return false;
}
function load(){
  var o=null;
  try{var s=localStorage.getItem('lb-ev2');if(s)o=JSON.parse(s)}catch(e){o=null}
  if(!o||typeof o!=='object'||Array.isArray(o))return {};
  /* storage can be edited, truncated or written by an older build: drop anything
     that would break a render, and never let a bad entry take the whole page down */
  var chg=false;
  Object.keys(o).forEach(function(q){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(q)||!Array.isArray(o[q])){delete o[q];chg=true;return}
    var out=[];
    o[q].forEach(function(e){
      if(!e||typeof e!=='object'||typeof e.t!=='string'||!e.t.trim()){chg=true;return}
      var n={t:e.t,c:(typeof e.c==='string'&&COL[e.c])?e.c:PALORDER[0]};
      if(n.c!==e.c)chg=true;
      if(e.s!=null){var m=Math.round(+e.s);if(isFinite(m)&&m>=0&&m<1440){if(m!==e.s)chg=true;n.s=m}else chg=true}
      out.push(n);
    });
    if(!out.length){delete o[q];chg=true;return}
    o[q]=out;
  });
  try{
    if(!localStorage.getItem('lb-demo-scrub')){
      Object.keys(o).forEach(function(q){
        o[q]=o[q].filter(function(e){return !isDemo(e)});
        if(!o[q].length)delete o[q];
      });
      localStorage.setItem('lb-demo-scrub','1');chg=true;
    }
  }catch(e){}
  if(chg){try{localStorage.setItem('lb-ev2',JSON.stringify(o))}catch(e){}}
  return o;
}
var ev=load(),dirty={};
/* read-modify-write: another tab's dates survive, the ones we just touched win */
function save(){
  try{
    var cur=null;try{cur=JSON.parse(localStorage.getItem('lb-ev2')||'null')}catch(e2){cur=null}
    if(cur&&typeof cur==='object'&&!Array.isArray(cur)){
      Object.keys(ev).forEach(function(q){if(!dirty[q]&&!cur[q])delete ev[q]});
      Object.keys(cur).forEach(function(q){if(!dirty[q])ev[q]=cur[q]});
    }
    localStorage.setItem('lb-ev2',JSON.stringify(ev));
  }catch(e){}
}
/* Where an entry sits in the notebook.  The pages print entries in clock order, which is
   not the order they were written in, so anything pointing back at an entry points at it
   by identity — not at the position it happens to occupy on the page. */
function evIndex(q,e){var a=ev[q];return a?a.indexOf(e):-1}

