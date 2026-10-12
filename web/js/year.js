/* ===== year.js — the year page ===== */
/* ===== YEAR VIEW: the whole school year on one printed sheet =====
   Twelve rows of day-ticks span the sheet the data covers, so the shape of the
   year — the breaks, the terms, the summer at both ends — is legible at a glance. */
var YS=null,YE=null,yC=null;
Object.keys(SCHOOL.days).concat(Object.keys(SCHOOL.off)).forEach(function(q){
  if(!YS||q<YS)YS=q;if(!YE||q>YE)YE=q;
});
/* every meeting of every course across the year, from the rotation */
var _cY=null;
function courseYear(){
  if(_cY)return _cY;
  var list={},on={};
  CLASSDATES.forEach(function(q){
    var r=SCHOOL.rot[SCHOOL.days[q]];if(!r)return;
    r.forEach(function(p){
      var c=p[3];(list[c]||(list[c]=[])).push({q:q,p:p[0],s:t2m(p[1])});(on[q]||(on[q]={}))[c]=1;
    });
  });
  _cY={list:list,on:on};return _cY;
}
function yDate(q){return new Date(+q.substr(0,4),+q.substr(5,2)-1,+q.substr(8,2))}
function yTotals(){
  var t={c:TOTCLASS,ped:0,hol:0,brk:0};
  Object.keys(SCHOOL.off).forEach(function(q){var x=SCHOOL.off[q];if(x==='hol')t.hol++;else if(x==='brk')t.brk++;else t.ped++});
  return t;
}
function renderY(turn){
  var y0=+YS.substr(0,4),m0=+YS.substr(5,2)-1,y1=+YE.substr(0,4),m1=+YE.substr(5,2)-1,i;
  var t=yTotals(),done=classDaysUpTo(today),pct=TOTCLASS?done/TOTCLASS:0,term=1;
  for(i=0;i<TERMS.length;i++)if(today>TERMS[i])term=i+2;
  if(term>TERMS.length)term=TERMS.length;   /* after the last day it is still term three */
  /* one subject's year, when the rail has one picked */
  var CY=yC?courseYear():null,cl=CY?(CY.list[yC]||[]):null,cdone=0,cnext=null;
  if(cl)for(i=0;i<cl.length;i++){if(cl[i].q<=today)cdone++;else if(!cnext)cnext=cl[i]}
  var marks='';
  TERMS.forEach(function(e){marks+='<b class="ytick" style="left:'+(TOTCLASS?classDaysUpTo(e)/TOTCLASS*100:0).toFixed(2)+'%"></b>'});
  marks+='<s class="ynew" style="left:'+(pct*100).toFixed(2)+'%"></s>';
  var h='<div class="yband">'
    +(cl
      ?'<div class="yline"><b>'+esc(cInfo(yC).d)+'</b> · '+cdone+' of '+cl.length+' periods</div>'
        +'<div class="ynext">'+(cnext?'next '+yDate(cnext.q).toLocaleDateString('en',{weekday:'short'})+' · '+fmt(cnext.s)+' · ':'')+'last '+yDate(cl[cl.length-1].q).toLocaleDateString('en',{weekday:'short'})+' '+fmtDate(cl[cl.length-1].q)+'</div>'
      :'<div class="yline">Term '+term+' of '+TERMS.length+' · <b>'+done+'</b> of '+TOTCLASS+' class days</div>')
    +'<div class="yrule"><i class="yfill" style="width:'+(pct*100).toFixed(2)+'%"></i>'+marks+'</div>'
    +'<div class="ysub">'+Object.keys(SCHOOL.courses).map(function(c){return '<button data-c="'+esc(c)+'" class="'+(yC===c?'set':'')+'" aria-pressed="'+(yC===c)+'"><i></i>'+esc(cInfo(c).d)+'</button>'}).join('')+'</div></div>';
  var rl='';
  for(i=1;i<=31;i++)rl+='<span class="yr">'+(i===1||i%5===0?i:'')+'</span>';
  var head='<div class="yrow yhead"><span class="ymon"></span><span class="ycells">'+rl+'</span></div>',rows='';
  for(var yy=y0,mm=m0;;){
    var nd=new Date(yy,mm+1,0).getDate(),cells='';
    for(var dd=1;dd<=31;dd++){
      if(dd>nd){cells+='<span class="yx"></span>';continue}
      var q=k(yy,mm,dd),ty=dayType(q);
      cells+='<span class="yc'+(ty?' ty-'+ty:'')+(cl&&CY.on[q]&&CY.on[q][yC]?' onc':'')+(q===today?' today':'')+(TERMS.indexOf(q)>=0?' term':'')+'"></span>';
    }
    var cur=(+today.substr(0,4)===yy&&+today.substr(5,2)-1===mm);
    rows+='<button class="yrow" data-y="'+yy+'" data-m="'+mm+'" aria-label="Open '+new Date(yy,mm,1).toLocaleString('en',{month:'long'})+' '+yy+'"><span class="ymon'+(cur?' cur':'')+'">'
      +new Date(yy,mm,1).toLocaleString('en',{month:'short'}).toUpperCase()+'</span><span class="ycells">'+cells+'</span></button>';
    if(yy===y1&&mm===m1)break;
    mm++;if(mm>11){mm=0;yy++}
  }
  var lg='<div class="ylegend">'
    +'<span><i class="ysw ty-c"></i>'+t.c+' class days</span>'
    +'<span><i class="ysw ty-ped"></i>'+t.ped+' pedagogical</span>'
    +'<span><i class="ysw ty-hol"></i>'+t.hol+' holidays</span>'
    +'<span><i class="ysw ty-brk"></i>'+t.brk+' spring break</span></div>';
  var yvEl=document.getElementById('yv'),rail0=yvEl.querySelector('.ysub'),keep=rail0?rail0.scrollLeft:0;
  yvEl.innerHTML='<div class="ywrap'+(turn?' turn':'')+'">'+h+'<div class="yledger'+(cl?' yl byc':'')+'">'+head+rows+'</div>'+lg+'</div>';
  /* keep the rail where it was, and bring the chosen subject into sight */
  var rail=yvEl.querySelector('.ysub');
  if(rail){
    var sb=rail.querySelector('button.set');
    if(!sb)rail.scrollLeft=0;                 /* nothing chosen: the rail reads from the start */
    else{rail.scrollLeft=keep;
      var rb=rail.getBoundingClientRect(),cb=sb.getBoundingClientRect();
      if(cb.left<rb.left||cb.right>rb.right)rail.scrollLeft+=cb.left-rb.left-(rb.width-cb.width)/2;}
  }
  document.getElementById('mn').textContent='';
  document.getElementById('yr').textContent=y0+'–'+y1;
  document.getElementById('back').hidden=true;
}
/* tap a month row to open that month */
document.getElementById('yv').addEventListener('click',function(e){
  var s=e.target.closest('.ysub button');
  if(s){var c=s.dataset.c;yC=(yC===c?null:c);renderY(false);return}
  var b=e.target.closest('.yrow[data-m]');if(!b)return;
  var yy=+b.dataset.y,mm=+b.dataset.m;
  A=new Date(yy,mm,1);sel=k(yy,mm,1);setView('month');
});
/* iOS-style page curl: next = curls up from the bottom, previous = curls down from the top */
