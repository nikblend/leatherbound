/* ===== day.js — the day page ===== */

function renderD(turn){
  var d=new Date(A.getFullYear(),A.getMonth(),A.getDate()),q=k(d.getFullYear(),d.getMonth(),d.getDate()),E=(ev[q]||[]).slice(),
      base=new Date(tY,tM,tD),diff=Math.round((d-base)/864e5),isT=diff===0,now=new Date(),nm=now.getHours()*60+now.getMinutes();
  sel=q;
  var timed=E.filter(function(e){return e.s!=null}).sort(function(a,b){return a.s-b.s}),all=E.filter(function(e){return e.s==null});
  var y=d.getFullYear(),leap=(y%4===0&&y%100!==0)||y%400===0,ylen=leap?366:365,doy=Math.round((Date.UTC(y,d.getMonth(),d.getDate())-Date.UTC(y,0,0))/864e5),mo=moonInfo(d);
  var SS=slots(q),lv=liveNow(q),of=offOf(q),an=annOf(q);
  var h='<div class="dtag'+(isT?' t':'')+'">'+relText(diff)+(SS.length?'<span class="stamp">JOUR '+rotOf(q)+'</span>':'')+'</div>';
  if(lv)h+='<div class="snow"><i></i><span><b>'+esc(lv.t)+'</b>'+(lv.r?' <small>'+esc(lv.r)+'</small>':'')+(lv.left!=null?' <small>· '+lv.left+' min left</small>':' <small>· at '+fmt(t2m(lv.pre))+'</small>')+'</span></div>';
  if(an)h+='<div class="dann">'+esc(an)+'</div>';
  /* ONE day sheet: the school's printed rows and your own written rows, interleaved by the clock */
  var items=SS.map(function(z){return {k:z.k,z:z,s:z.s}});
  timed.forEach(function(e){items.push({k:'n',e:e,s:e.s})});
  items.sort(function(a,b){return a.s-b.s});
  if(items.length){
    var tl='',last='',nd=false,nowRow='<div class="tle dnow"><span class="tt">now</span><span class="rail"><i></i></span><span class="tb"><span class="nl">'+fmt(nm)+'</span></span></div>';
    items.forEach(function(it){
      if(isT&&!nd&&it.s>nm){tl+=nowRow;nd=true}
      var pr=partOf(it.s);if(pr!==last){tl+='<div class="dpart">'+pr+'</div>';last=pr}
      if(it.k==='c'){
        var z=it.z,ci=cInfo(z.c),hot=isT&&nm>=z.s&&nm<z.e?' hot':'';
        tl+='<div class="tle cls'+hot+'" style="--c:#2f4468"><span class="tt">'+fmt(z.s)+'</span><span class="rail"><i></i></span><span class="tb"><span class="tx2"><span class="cn"><b class="pn">P'+z.p+'</b>'+esc(ci.n)+'</span><small class="ct">'+esc(ci.t)+'<b class="cr">'+esc(ci.r)+'</b></small></span></span></div>';
      }else if(it.k==='r'){
        var zr=it.z;
        tl+='<div class="tle rout" style="--c:#8a97ab"><span class="tt">'+fmt(zr.s)+'</span><span class="rail"><i></i></span><span class="tb"><span class="tx2"><span class="cn">'+esc(zr.n)+'</span></span></span></div>';
      }else{
        var en=it.e;
        tl+='<div class="tle" data-k="'+q+'" style="--c:'+COL[en.c]+'"><span class="tt">'+fmt(en.s)+'</span><span class="rail"><i></i></span><span class="tb"><span class="tx">'+esc(en.t)+'</span></span></div>';
      }
    });
    if(isT&&!nd)tl+=nowRow;
    h+='<div class="dsec"><div class="dsh">Schedule</div>'+tl+'</div>';
  }else if(of){
    h+='<div class="doff"><b>'+esc(OFFL[of]||of)+'</b>no classes</div>';
  }
  if(!E.length&&!items.length&&!of){h+='<div class="dempty" data-k="'+q+'">Nothing planned yet.</div>'}
  var allH='';
  if(all.length){
    allH='<div class="dsec"><div class="dsh">All day</div>'+all.map(function(e){return '<div class="dall" data-k="'+q+'" style="--c:'+COL[e.c]+'"><span class="tx">'+esc(e.t)+'</span></div>'}).join('')+'</div>';
  }
  h+=allH;
  h+='<div class="dfoot">Day '+doy+' of '+ylen+' \u00b7 Week '+isoWeek(d)+(SS.length?' \u00b7 JOUR '+rotOf(q):'')+' \u00b7 '+mo.name+'</div>';
  var dv=document.getElementById('dv');
  dv.innerHTML=h;dv.classList.remove('turn');
  if(turn){void dv.offsetWidth;dv.classList.add('turn');mainEl.scrollTop=0}
  document.getElementById('mn').textContent=d.toLocaleDateString('en',{weekday:'long'});
  document.getElementById('yr').textContent=d.toLocaleString('en',{month:'short'})+' '+d.getDate()+(y!==tY?', '+y:'');
  document.getElementById('back').hidden=isT;
}
(function(){
  var dv=document.getElementById('dv'),x0,y0;
  dv.addEventListener('click',function(e){var t=e.target.closest('[data-k]');if(t)openNote(t.dataset.k,false)});
  dv.addEventListener('touchstart',function(e){var t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
  dv.addEventListener('touchend',function(e){var t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.6)go(dx<0?1:-1)},{passive:true});
})();
