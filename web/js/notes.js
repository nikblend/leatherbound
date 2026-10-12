/* ===== notes.js — the note sheet: writing a note, working over an old one, listing and deleting ===== */
var note=document.getElementById('note'),scrim=document.getElementById('scrim'),txt=document.getElementById('txt'),list=document.getElementById('list'),
    goBtn=document.getElementById('go'),delBtn=document.getElementById('del'),warnEl=document.getElementById('warn');
/* Which entry of ev[sel] the sheet is working over; null means it is writing a new one.
   editRef is that entry itself, so the sheet can tell when the notebook has been rewritten
   underneath it and stand down rather than write over whatever moved into that position.
   The notebook is only touched on Done or Remove: until then the sheet holds a draft, so
   closing it — or reloading mid-edit — leaves the page exactly as it was. */
var editIdx=null,editCol=null,editRef=null,warnT=0;

function drawList(){
  var p=sel.split('-'),dt=new Date(+p[0],+p[1]-1,+p[2]),E=(ev[sel]||[]).slice();
  document.getElementById('nd').textContent=dt.toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'});
  document.getElementById('nd').classList.toggle('nolink',V==='day');
  /* the list reads in the same order as the day page: by the clock, the untimed last */
  E.sort(function(a,b){return (a.s==null?1440:a.s)-(b.s==null?1440:b.s)});
  list.innerHTML=E.length?E.map(function(e){
    var i=evIndex(sel,e);
    return '<li'+(i===editIdx?' class="on"':'')+' data-i="'+i+'"><i style="--c:'+COL[e.c]+'"></i><span>'+esc(e.t)+(e.s!=null?'<small>'+fmt(e.s)+'</small>':'')+'</span><button data-i="'+i+'" aria-label="Delete note">&#10005;</button></li>';
  }).join(''):'<li class="none">a clean page</li>';   /* the week page says it; so does the sheet */
}

/* ===== the two moods of the sheet ===== */
/* the sheet's own list marks the line that is in the composer.  The list is rebuilt before
   the edit begins, so the mark is applied here rather than inside drawList */
function markRow(){
  var rows=list.querySelectorAll('li[data-i]'),i;
  for(i=0;i<rows.length;i++)rows[i].classList.toggle('on',editIdx!=null&&+rows[i].dataset.i===editIdx);
}
function composeNew(){
  editIdx=null;editCol=null;editRef=null;
  goBtn.textContent='Add';delBtn.hidden=true;
  txt.value='';tmEl.value='';tmHint();drawCols();lift();markRow();
}
function editEntry(i){
  var e=(ev[sel]||[])[i];if(!e)return false;
  editIdx=i;editCol=e.c;editRef=e;
  goBtn.textContent='Done';delBtn.hidden=false;
  txt.value=e.t;tmEl.value=e.s==null?'':fmt(e.s);tmHint();drawCols();lift();markRow();
  /* the text field is deliberately not focused: tapping an entry should first show you the
     entry, the way tapping an event does in Calendar.  One tap more writes over it. */
  return true;
}
/* The entry being written over comes loose from the page, and has to stay loose through
   every redraw — the month, week and day pages all redraw through render(). */
function lift(){
  var nodes=document.querySelectorAll('main [data-i]'),i,n,day;
  for(i=0;i<nodes.length;i++){
    n=nodes[i];day=n.closest('[data-k]');
    n.classList.toggle('lift',editIdx!=null&&+n.dataset.i===editIdx&&!!day&&day.dataset.k===sel);
  }
}
/* the notebook can be rewritten under an open sheet — by another tab, or by midnight */
function dropEditIfMoved(){
  if(editIdx!=null&&(!ev[sel]||ev[sel][editIdx]!==editRef))composeNew();
}

function openNote(q,focus,i){
  sel=q;var p=q.split('-');Y=+p[0];M=+p[1]-1;
  /* opened for a day other than the one the day page is showing: the page follows, or
     renderD would redraw its own day underneath the sheet */
  if(V==='day'&&k(+p[0],+p[1]-1,+p[2])!==k(A.getFullYear(),A.getMonth(),A.getDate()))A=new Date(+p[0],+p[1]-1,+p[2]);
  render();drawList();composeNew();
  note.classList.add('open');scrim.classList.add('on');
  if(i!=null&&i>=0)editEntry(i);
  if(focus)setTimeout(function(){txt.focus()},320);
}
function closeNote(){note.classList.remove('open');scrim.classList.remove('on');txt.blur();composeNew()}

/* ===== taking the entry off the page, or refusing to ===== */
function refuse(msg){
  warnEl.textContent=msg;warnEl.hidden=false;
  note.classList.remove('no');void note.offsetWidth;note.classList.add('no');   /* the paper refuses */
  clearTimeout(warnT);warnT=setTimeout(function(){warnEl.hidden=true},2600);
}
function commit(){
  var v=txt.value.trim();
  if(!v){refuse('a note needs a few words');txt.focus();return}
  var raw=tmEl.value.trim(),st=raw?parseTime(raw):null;
  /* a line that is not a time is the one thing the sheet must not guess at: silently
     filing it as all day is how a reminder goes missing */
  if(raw&&st==null){refuse('\u201c'+raw+'\u201d is not a time');tmEl.focus();return}
  var o={t:v,c:editCol||pick};
  if(st!=null)o.s=st;
  if(editIdx!=null&&ev[sel]&&ev[sel][editIdx])ev[sel][editIdx]=o;
  else (ev[sel]=ev[sel]||[]).push(o);
  dirty[sel]=1;save();render();drawList();closeNote();
}
function removeAt(i){
  var mine=ev[sel];if(!mine||!mine[i])return;
  mine.splice(i,1);if(!mine.length)delete ev[sel];
  dirty[sel]=1;save();
  /* the notebook shifted under the sheet: keep writing over the same entry */
  if(editIdx!=null){if(i===editIdx)composeNew();else if(i<editIdx){editIdx--;lift();markRow()}}
  drawList();render();dropEditIfMoved();
}

/* ===== wiring ===== */
grid.addEventListener('click',function(e){
  var u=e.target.closest('.day u[data-i]'),d=e.target.closest('.day');if(!d)return;
  openNote(d.dataset.k,false,u?+u.dataset.i:null);
});
document.getElementById('fab').onclick=function(){openNote(sel,true)};
document.getElementById('close').onclick=closeNote;scrim.onclick=closeNote;
addEventListener('keydown',function(e){if(e.key==='Escape'){if(dd.classList.contains('open'))ddClose();else if(cpEl.classList.contains('on'))cpClose();else closeNote()}});
var tmEl=document.getElementById('tm'),tmHintEl=document.getElementById('tmhint');
function tmHint(){var t=parseTime(tmEl.value);tmHintEl.textContent=tmEl.value.trim()?(t!=null?'\u2192 '+fmt(t):'not a time'):'blank = all day';tmHintEl.className=t!=null?'ok':''}
tmEl.addEventListener('input',tmHint);
[txt,tmEl].forEach(function(el){el.addEventListener('input',function(){warnEl.hidden=true})});
goBtn.onclick=commit;
delBtn.onclick=function(){
  if(editIdx==null)return;
  var i=editIdx;composeNew();removeAt(i);closeNote();
};
txt.addEventListener('keydown',function(e){if(e.key==='Enter')commit()});
list.addEventListener('click',function(e){
  var b=e.target.closest('button'),li=e.target.closest('li[data-i]');
  if(b)removeAt(+b.dataset.i);          /* the ✕ takes that line out */
  else if(li)editEntry(+li.dataset.i);  /* the line itself opens for writing */
});

var ndEl=document.getElementById('nd');
ndEl.addEventListener('click',function(){if(V!=='day')goToDay(sel)});
ndEl.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&V!=='day'){e.preventDefault();goToDay(sel)}});
