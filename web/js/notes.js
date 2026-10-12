/* ===== notes.js — the note sheet: writing, listing and deleting ===== */
var note=document.getElementById('note'),scrim=document.getElementById('scrim'),txt=document.getElementById('txt'),list=document.getElementById('list');
function drawList(){
  var p=sel.split('-'),dt=new Date(+p[0],+p[1]-1,+p[2]),E=ev[sel]||[];
  document.getElementById('nd').textContent=dt.toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'});
  document.getElementById('nd').classList.toggle('nolink',V==='day');
  list.innerHTML=E.length?E.map(function(e,i){return '<li><i style="--c:'+COL[e.c]+'"></i><span>'+esc(e.t)+(e.s!=null?'<small>'+fmt(e.s)+'</small>':'')+'</span><button data-i="'+i+'" aria-label="Delete note">&#10005;</button></li>'}).join(''):'';
}
function openNote(q,focus){
  sel=q;var p=q.split('-');Y=+p[0];M=+p[1]-1;render();drawList();
  note.classList.add('open');scrim.classList.add('on');
  if(focus)setTimeout(function(){txt.focus()},320);
}
function closeNote(){note.classList.remove('open');scrim.classList.remove('on');txt.blur()}
grid.addEventListener('click',function(e){var d=e.target.closest('.day');if(d)openNote(d.dataset.k,false)});
document.getElementById('fab').onclick=function(){openNote(sel,true)};
document.getElementById('close').onclick=closeNote;scrim.onclick=closeNote;
addEventListener('keydown',function(e){if(e.key==='Escape'){if(dd.classList.contains('open'))ddClose();else if(cpEl.classList.contains('on'))cpClose();else closeNote()}});
var tmEl=document.getElementById('tm'),tmHintEl=document.getElementById('tmhint');
function tmHint(){var t=parseTime(tmEl.value);tmHintEl.textContent=tmEl.value.trim()?(t!=null?'\u2192 '+fmt(t):'not a time'):'blank = all day';tmHintEl.className=t!=null?'ok':''}
tmEl.addEventListener('input',tmHint);
function add(){
  var v=txt.value.trim();if(!v){txt.focus();return}
  var o={t:v,c:pick},st=parseTime(tmEl.value);
  if(st!=null)o.s=st;
  (ev[sel]=ev[sel]||[]).push(o);dirty[sel]=1;save();txt.value='';tmEl.value='';tmHint();drawList();render();
}
document.getElementById('go').onclick=add;
txt.addEventListener('keydown',function(e){if(e.key==='Enter')add()});
list.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  var mine=ev[sel];if(!mine||!mine.length)return;   /* the notebook can change under us */
  mine.splice(+b.dataset.i,1);if(!ev[sel].length)delete ev[sel];dirty[sel]=1;save();drawList();render();
});

var ndEl=document.getElementById('nd');
ndEl.addEventListener('click',function(){if(V!=='day')goToDay(sel)});
ndEl.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&V!=='day'){e.preventDefault();goToDay(sel)}});

