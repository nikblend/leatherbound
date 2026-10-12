/* ===== month.js — the render router and the month page ===== */
var grid=document.getElementById('grid'),sheet=document.getElementById('sheet'),sc=document.getElementById('sc');
function render(turn){
  if(V==='day'){renderD(turn);return}
  if(V==='week'){renderW(turn);return}
  if(V==='year'){renderY(turn);return}
  var off=new Date(Y,M,1).getDay(),n=new Date(Y,M+1,0).getDate(),rows=Math.ceil((off+n)/7),h='';
  for(var i=0;i<rows*7;i++){
    var d=new Date(Y,M,i-off+1),inM=d.getMonth()===M,q=k(d.getFullYear(),d.getMonth(),d.getDate()),E=inM&&ev[q]||[],
        /* the cell prints the earliest two, the way the day page and the sheet read: the
           writing order of your notes is not an order anyone can see */
        Es=E.slice().sort(function(a,b){return (a.s==null?1440:a.s)-(b.s==null?1440:b.s)}),
        rr=inM?rotOf(q):0,of=inM?offOf(q):'';
    h+='<button class="day'+(inM?'':' out')+(q===sel?' sel':'')+(of?' '+of:'')+'" data-k="'+q+'"><b'+(q===today?' class="today"':'')+'>'+d.getDate()+'</b>'+
      (rr?'<i class="rot" aria-hidden="true">'+rr+'</i>':'')+
      Es.slice(0,2).map(function(e){return '<u data-i="'+evIndex(q,e)+'" style="--c:'+COL[e.c]+'">'+esc(e.t)+'</u>'}).join('')+(Es.length>2?'<em>+'+(Es.length-2)+Es.slice(2,5).map(function(e){return '<s style="--c:'+COL[e.c]+'"></s>'}).join('')+'</em>':'')+'</button>';
  }
  grid.innerHTML=h;
  document.documentElement.style.setProperty('--rows',rows);
  document.getElementById('mn').textContent=new Date(Y,M,1).toLocaleString('en',{month:'long'});
  document.getElementById('yr').textContent=Y;
  document.getElementById('back').hidden=(Y===tY&&M===tM);
  if(turn){sc.scrollLeft=0;sheet.classList.remove('turn');void sheet.offsetWidth;sheet.classList.add('turn')}
  lift();   /* an entry being written over stays lifted through every redraw */
}
