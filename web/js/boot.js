/* ===== boot.js — startup: fit the page, keep the clock honest, follow other tabs ===== */
function fit(){var d=document.querySelector('.device');d.style.zoom=window.innerWidth>480?Math.min(1,(innerHeight-24)/866):1}
fit();addEventListener('resize',fit);
var dd=document.getElementById('dd'),ddl=document.getElementById('ddl');
function ddClose(){dd.classList.remove('open');dd.querySelector('.dd-btn').setAttribute('aria-expanded','false')}
dd.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.classList.contains('dd-btn')){b.setAttribute('aria-expanded',dd.classList.toggle('open')?'true':'false');return}
  dd.querySelectorAll('.on').forEach(function(x){x.classList.remove('on')});b.classList.add('on');ddl.textContent=b.textContent;ddClose();setView(b.textContent.toLowerCase());
});
document.addEventListener('click',function(e){if(!dd.contains(e.target))ddClose()});
/* ===== keeping the page honest while it stays open ==========================
   Phones leave this open for days, and the live strip, the "now" line and the
   date itself all used to freeze at load. One minute tick fixes that; a date
   rollover moves "today" without a reload. */
var lastMin=-1,lastDay=today;
function tick(){
  var n=new Date(),m=n.getHours()*60+n.getMinutes();
  if(m===lastMin)return;
  lastMin=m;
  var q=k(n.getFullYear(),n.getMonth(),n.getDate());
  if(q!==lastDay){
    var wasT=sel===lastDay;
    tY=n.getFullYear();tM=n.getMonth();tD=n.getDate();today=q;lastDay=q;
    if(wasT){A=new Date(tY,tM,tD);sel=q}      /* you were reading today: follow the new one */
    render(false);
    return;
  }
  if(V==='day')renderD(false);                 /* refresh the strip and the now line */
}
setInterval(tick,15000);
addEventListener('focus',function(){lastMin=-1;tick()});
document.addEventListener('visibilitychange',function(){if(!document.hidden){lastMin=-1;tick()}});
/* another tab changed the notebook: adopt what it wrote, keep what we have not touched */
addEventListener('storage',function(e){
  if(e.key!=='lb-ev2')return;
  var s=null;try{s=JSON.parse(e.newValue||'null')}catch(err){s=null}
  if(!s||typeof s!=='object'||Array.isArray(s))s={};
  Object.keys(ev).forEach(function(q){if(!dirty[q]&&!s[q])delete ev[q]});
  Object.keys(s).forEach(function(q){if(!dirty[q])ev[q]=s[q]});
  render();if(note.classList.contains('open'))drawList();
});
render();
