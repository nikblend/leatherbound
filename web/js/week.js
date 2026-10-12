/* ===== week.js — the week page ===== */
var ws=document.getElementById('ws'),mainEl=document.querySelector('main');
/* NEW week view: one row per day, all-day items first, then timed items in order */
function renderW(turn){
  var s0=new Date(A.getFullYear(),A.getMonth(),A.getDate()-A.getDay()),e0=new Date(s0.getFullYear(),s0.getMonth(),s0.getDate()+6),h='',i,base=new Date(tY,tM,tD);
  for(i=0;i<7;i++){
    var d=new Date(s0.getFullYear(),s0.getMonth(),s0.getDate()+i),q=k(d.getFullYear(),d.getMonth(),d.getDate()),E=(ev[q]||[]).slice(),isT=q===today,past=d<base;
    E.sort(function(a,b){if(a.s==null&&b.s==null)return 0;if(a.s==null)return -1;if(b.s==null)return 1;return a.s-b.s});
    /* coarse school layer: courses and your notes in clock order, no times, no rooms */
    var r=rotOf(q),ro=r?SCHOOL.rot[r]:null,of=offOf(q),rows=[];
    E.forEach(function(e){rows.push({s:e.s==null?-1:e.s,h:'<span class="ev'+(e.s==null?' all':'')+'" data-i="'+evIndex(q,e)+'" style="--c:'+COL[e.c]+'"><span class="tm">'+(e.s==null?'all day':fmt(e.s))+'</span><span class="tx">'+esc(e.t)+'</span></span>'})});
    if(ro)ro.forEach(function(p){rows.push({s:t2m(p[1]),h:'<span class="ev tt2"><span class="tm">P'+p[0]+'</span><span class="tx">'+esc(cInfo(p[3]).d)+'</span></span>'})});
    rows.sort(function(a,b){return a.s-b.s});
    var body=rows.map(function(x){return x.h}).join('')||(of?'<span class="ev tt2 offk"><span class="tm"></span><span class="tx">'+esc(OFFL[of]||of)+'</span></span>':'<span class="none">a clean page</span>');
    h+='<button class="wday'+(isT?' t':'')+(past?' past':'')+(of?' off':'')+'" data-k="'+q+'"><span class="wdn"><span>'+d.toLocaleDateString('en',{weekday:'short'})+'</span><b>'+d.getDate()+'</b>'+(r?'<span class="jr">JOUR '+r+'</span>':'')+(E.length?'<small>'+E.length+(E.length>1?' notes':' note')+'</small>':'')+'</span><span class="wev">'+body+'</span></button>';
  }
  ws.innerHTML='<div class="wl'+(turn?' turn':'')+'">'+h+'</div>';
  var sm=s0.toLocaleString('en',{month:'short'}),em=e0.toLocaleString('en',{month:'short'}),ti=Math.round((base-s0)/864e5),has=ti>=0&&ti<7;
  document.getElementById('mn').textContent=sm+' '+s0.getDate()+(sm===em?'–':' – '+em+' ')+e0.getDate();
  document.getElementById('yr').textContent=s0.getFullYear();
  document.getElementById('back').hidden=has;
  if(turn)ws.scrollTop=0;
  lift();
}
/* a written row opens for writing; a printed row opens the day it belongs to */
ws.addEventListener('click',function(e){var t=e.target.closest('.ev[data-i]'),d=e.target.closest('[data-k]');if(d)openNote(d.dataset.k,false,t?+t.dataset.i:null)});
var wx,wy,wl,wt,wdn=false,wm=false;
ws.addEventListener('mousedown',function(e){wdn=true;wm=false;wx=e.pageX;wy=e.pageY;wl=ws.scrollLeft;wt=ws.scrollTop});
addEventListener('mousemove',function(e){if(!wdn)return;var dx=e.pageX-wx,dy=e.pageY-wy;if(Math.abs(dx)+Math.abs(dy)>4)wm=true;ws.scrollLeft=wl-dx;ws.scrollTop=wt-dy});
addEventListener('mouseup',function(){wdn=false});
ws.addEventListener('click',function(e){if(wm){e.stopPropagation();e.preventDefault();wm=false}},true);

