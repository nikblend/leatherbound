/* ===== palette.js — ink colours: choosing, adding, editing ===== */
var colsEl=document.getElementById('cols'),cpEl=document.getElementById('cp'),cpMode=null,cH=0,cS=0,cV=0;
var cpSw=document.getElementById('cpsw'),cpHex=document.getElementById('cphex'),sH=document.getElementById('cph'),sS=document.getElementById('cps'),sV=document.getElementById('cpv'),
    PRESETS=['#2f7d79','#41659a','#7c9a4e','#8b4f7d','#c9402c','#cf8a2a','#6b4a2f','#3d4150'];
function drawCols(){
  colsEl.innerHTML=PALORDER.map(function(q){return '<button style="--c:'+COL[q]+'" data-c="'+q+'"'+(q===pick?' class="on"':'')+' aria-label="Colour"></button>'}).join('')
    +(PALORDER.length<10?'<button class="add" data-add="1" aria-label="Add a colour"></button>':'')
    +'<button class="edit" data-edit="1" aria-label="Edit selected colour"></button>';
}
function h2(n){n=Math.round(n).toString(16);return n.length<2?'0'+n:n}
function hsv2hex(h,s,v){s/=100;v/=100;var c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,a=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return '#'+h2((a[0]+m)*255)+h2((a[1]+m)*255)+h2((a[2]+m)*255)}
function hex2hsv(x){var r=parseInt(x.substr(1,2),16)/255,g=parseInt(x.substr(3,2),16)/255,b=parseInt(x.substr(5,2),16)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0;
  if(d){h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360}
  return [h,mx?d/mx*100:0,mx*100]}
function normHex(t){t=t.trim().replace(/^#?/,'#');if(/^#[0-9a-f]{3}$/i.test(t))t='#'+t[1]+t[1]+t[2]+t[2]+t[3]+t[3];return /^#[0-9a-f]{6}$/i.test(t)?t.toLowerCase():null}
function cpPaint(setHex){
  var hx=hsv2hex(cH,cS,cV);
  cpSw.style.setProperty('--c',hx);
  if(setHex)cpHex.value=hx;
  sH.style.setProperty('--trk','linear-gradient(to right,#f00,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00)');
  sS.style.setProperty('--trk','linear-gradient(to right,'+hsv2hex(cH,0,cV)+','+hsv2hex(cH,100,cV)+')');
  sV.style.setProperty('--trk','linear-gradient(to right,#000,'+hsv2hex(cH,cS,100)+')');
}
function cpLoad(hx){var a=hex2hsv(hx);cH=a[0];cS=a[1];cV=a[2];sH.value=cH;sS.value=cS;sV.value=cV;cpPaint(true)}
function cpOpen(mode){
  cpMode=mode;
  document.getElementById('cpt').textContent=mode==='add'?'New colour':'Edit colour';
  document.getElementById('cprm').style.display=(mode!=='add'&&PALORDER.length>1)?'':'none';
  cpLoad(mode==='add'?'#c98a2b':COL[mode]);
  cpEl.classList.add('on');
}
function cpClose(){cpEl.classList.remove('on');cpMode=null;cpHex.blur()}
function cpSave(){
  if(!cpMode)return;
  var hx=hsv2hex(cH,cS,cV);
  if(cpMode==='add'){if(PALORDER.length>=10){cpClose();return}var q='x'+Date.now().toString(36);COL[q]=hx;PALORDER.push(q);pick=q}else COL[cpMode]=hx;
  savePal();cpClose();drawCols();render();drawList();
}
[sH,sS,sV].forEach(function(el){el.addEventListener('input',function(){cH=+sH.value;cS=+sS.value;cV=+sV.value;cpPaint(true)})});
cpHex.addEventListener('input',function(){var n=normHex(cpHex.value);if(n){var a=hex2hsv(n);cH=a[0];cS=a[1];cV=a[2];sH.value=cH;sS.value=cS;sV.value=cV;cpPaint(false)}});
cpHex.addEventListener('blur',function(){cpPaint(true)});
cpHex.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();cpHex.blur()}});
document.getElementById('cppre').innerHTML=PRESETS.map(function(c){return '<button style="--c:'+c+'" data-p="'+c+'" aria-label="Preset colour"></button>'}).join('');
document.getElementById('cppre').addEventListener('click',function(e){var b=e.target.closest('button');if(b)cpLoad(b.dataset.p)});
document.getElementById('cpsave').onclick=cpSave;
document.getElementById('cpcancel').onclick=cpClose;
document.getElementById('cprm').onclick=function(){
  if(cpMode&&cpMode!=='add'&&PALORDER.length>1){var k0=cpMode;PALORDER=PALORDER.filter(function(q){return q!==k0});if(pick===k0)pick=PALORDER[0];savePal();cpClose();drawCols()}
};
cpEl.addEventListener('click',function(e){if(e.target===cpEl)cpClose()});
colsEl.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.dataset.add){cpOpen('add');return}
  if(b.dataset.edit){cpOpen(pick);return}
  pick=b.dataset.c;drawCols();
});
drawCols();
