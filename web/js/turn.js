/* ===== turn.js — the iOS-style page curl and the month-strip gestures ===== */
var curlOn=false,screenEl=document.querySelector('.screen'),pendingTurn=null;
function shade(f){var q=f<1.5708;return [q?.3*Math.sin(f):0,q?.38*Math.exp(-Math.pow((f-1.15)/.22,2)):0]}
function turnPage(dir,swap){
  /* One tap, one page.  A tap that lands while a page is already curling used to be thrown
     away; it is remembered instead, and turns when the paper comes to rest. */
  if(curlOn){pendingTurn={dir:dir,swap:swap};return}
  if(V!=='month'||matchMedia('(prefers-reduced-motion:reduce)').matches){swap();return}
  curlOn=true;
  var tpl=mainEl.cloneNode(true),sl=sc.scrollLeft,mt=mainEl.scrollTop,Hh=mainEl.clientHeight,W=mainEl.clientWidth,flip=dir<0,N=12,PI=Math.PI,ov=document.createElement('div');
  swap();
  ov.className='curl';ov.style.top=mainEl.offsetTop+'px';ov.style.height=Hh+'px';if(flip)ov.style.transform='scaleY(-1)';
  function mk(c,p){var d=document.createElement('div');d.className=c;p.appendChild(d);return d}
  function cl(p){var c=tpl.cloneNode(true);c.className='cl';c.style.width=W+'px';c.style.height=Hh+'px';if(flip)c.style.transform='scaleY(-1)';p.appendChild(c);return c}
  var top=mk('ctop',ov);cl(top);var tip=mk('tip',top),shd=mk('cshd',ov),segs=[],par=ov,i;
  for(i=0;i<=N;i++){var s=mk('cs',par),p=mk('cp',s),cc=mk('cc',s),c=cl(cc),sh=mk('sh',cc);segs.push({s:s,p:p,c:c,sh:sh});par=s}
  screenEl.appendChild(ov);
  ov.querySelectorAll('.cl').forEach(function(c){var q=c.querySelector('.scroller');if(q)q.scrollLeft=sl;c.scrollTop=mt});
  function frame(t){
    var e=.5-.5*Math.cos(PI*t),r=16+22*Math.sin(PI*t),c=Hh+(-(r+14)-Hh)*e,
        arc=Math.max(0,Math.min(PI*r,Hh-c)),h=arc/N,dr=arc/r/N,rem=Math.max(0,Hh-c-PI*r);
    top.style.height=Math.max(0,c)+'px';
    tip.style.top=(c-rem-34)+'px';tip.style.display=rem>0?'block':'none';
    shd.style.top=(c+r*.6)+'px';shd.style.opacity=Math.max(0,Math.min(1,(Hh-c)/70,(c+40)/40));
    segs.forEach(function(g,i){
      var last=i===N,hh=last?rem:h,off=last?c+arc:c+i*h,ta=last?PI:(i+.5)*dr,ba=last?PI:(i+1.5)*dr,A=shade(ta),B=shade(ba),
          bA=ta>1.5708?.32*Math.sin(Math.min(ta,PI)):0,bB=ba>1.5708?.32*Math.sin(Math.min(ba,PI)):0;
      g.s.style.display=(last&&rem<=0)?'none':'block';
      g.s.style.height=hh+'px';g.s.style.top=(i?h:c)+'px';
      g.s.style.transform=last?'none':'rotateX('+(dr*180/PI)+'deg)';
      g.c.style.top=(-off)+'px';
      g.sh.style.background='linear-gradient(rgba(255,255,255,'+A[1]+'),rgba(255,255,255,'+B[1]+')),linear-gradient(rgba(20,10,0,'+A[0]+'),rgba(20,10,0,'+B[0]+'))';
      g.p.style.background=last?'linear-gradient(rgba(60,38,10,.3),rgba(60,38,10,0) 70px),rgba(246,238,216,.86)':'linear-gradient(rgba(60,38,10,'+bA+'),rgba(60,38,10,'+bB+')),rgba(244,236,214,.86)';
    });
  }
  var t0=performance.now(),DUR=960;
  (function tick(now){var t=Math.min(1,(now-t0)/DUR);frame(t);if(t<1)requestAnimationFrame(tick);else{ov.remove();curlOn=false;var p=pendingTurn;pendingTurn=null;if(p)turnPage(p.dir,p.swap)}})(t0);
}
var dragX,startL,drag=false,moved=false;
sc.addEventListener('mousedown',function(e){drag=true;moved=false;dragX=e.pageX;startL=sc.scrollLeft});
addEventListener('mousemove',function(e){if(!drag)return;var dx=e.pageX-dragX;if(Math.abs(dx)>4)moved=true;sc.scrollLeft=startL-dx});
addEventListener('mouseup',function(){drag=false});
sc.addEventListener('click',function(e){if(moved){e.stopPropagation();e.preventDefault();moved=false}},true);
sc.addEventListener('wheel',function(e){if(Math.abs(e.deltaY)>Math.abs(e.deltaX)&&sc.scrollWidth>sc.clientWidth){sc.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false});
