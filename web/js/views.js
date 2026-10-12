/* ===== views.js — navigation: the arrows, the date button, switching views ===== */
function go(delta){if(V==='year')return;if(V==='day'){A=new Date(A.getFullYear(),A.getMonth(),A.getDate()+delta);sel=k(A.getFullYear(),A.getMonth(),A.getDate());render(true);return}if(V==='week'){A=new Date(A.getFullYear(),A.getMonth(),A.getDate()+7*delta);render(true);return}var d=new Date(Y,M+delta,1);turnPage(delta,function(){Y=d.getFullYear();M=d.getMonth();render(false);sc.scrollLeft=0})}
document.getElementById('prev').onclick=function(){go(-1)};
document.getElementById('next').onclick=function(){go(1)};
document.getElementById('back').onclick=function(){
  var dir=(tY*12+tM)>(Y*12+M)?1:-1;
  function fn(){Y=tY;M=tM;sel=today;A=new Date(tY,tM,tD)}
  if(V==='month')turnPage(dir,function(){fn();render(false);sc.scrollLeft=0});else{fn();render(true)}
};

function syncDD(v){
  var T0=v.charAt(0).toUpperCase()+v.slice(1);
  dd.querySelectorAll('.menu button').forEach(function(x){x.classList.toggle('on',x.textContent===T0)});
  ddl.textContent=T0;
  document.getElementById('prev').setAttribute('aria-label','Previous '+v);
  document.getElementById('next').setAttribute('aria-label','Next '+v);
  /* the data covers one school year, so stepping is meaningless here */
  var dis=v==='year'?'true':'false';
  document.getElementById('prev').setAttribute('aria-disabled',dis);
  document.getElementById('next').setAttribute('aria-disabled',dis);
}
function setView(v){
  if(v===V)return;
  var p=sel.split('-'),sd=new Date(+p[0],+p[1]-1,+p[2]);
  if(v==='day'){
    if(V==='week'){var w0=new Date(A.getFullYear(),A.getMonth(),A.getDate()-A.getDay()),df=Math.round((sd-w0)/864e5),td=Math.round((new Date(tY,tM,tD)-w0)/864e5);A=(df>=0&&df<7)?sd:(td>=0&&td<7)?new Date(tY,tM,tD):w0}
    else{A=(sd.getFullYear()===Y&&sd.getMonth()===M)?sd:(tY===Y&&tM===M)?new Date(tY,tM,tD):new Date(Y,M,1)}
    sel=k(A.getFullYear(),A.getMonth(),A.getDate());
  }else if(v==='week'){
    if(V!=='day')A=(sd.getFullYear()===Y&&sd.getMonth()===M)?sd:new Date(Y,M,1);
  }else if(v!=='year'){Y=A.getFullYear();M=A.getMonth()}
  V=v;mainEl.dataset.v=v;syncDD(v);render(true);
}
/* tap the date in the notes popup -> jump to that day's page */
function goToDay(q){
  if(V==='day'&&q===sel)return;
  var p=q.split('-');A=new Date(+p[0],+p[1]-1,+p[2]);sel=q;Y=A.getFullYear();M=A.getMonth();
  V='day';mainEl.dataset.v='day';syncDD('day');closeNote();render(true);
}
