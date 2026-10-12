/* ===== util.js — small pure helpers shared by every view — no DOM, so they are testable in node ===== */
function k(y,m,d){return y+'-'+(m+1<10?'0':'')+(m+1)+'-'+(d<10?'0':'')+d}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
/* the time is written the way you would write it: 8:40, 0840, 8h40, 8:40pm, 20:15 */
function parseTime(t){
  if(!t)return null;
  /* only shapes that read as a time get through: 8:40 · 8h40 · 0840 · 9 · 8:40pm.
     Anything else ("map", "1.5", "n0pe", "blah") is not a time and must not become one. */
  var s=t.trim().toLowerCase().replace(/\s+/g,''),h,mi,ap='',
      m1=s.match(/^(\d{1,2})(?:[:h](\d{1,2}))?([ap]m?)?$/),m2=s.match(/^(\d{3,4})([ap]m?)?$/);
  if(m1){h=+m1[1];mi=m1[2]?+m1[2]:0;ap=m1[3]||''}
  else if(m2){h=+m2[1].slice(0,-2);mi=+m2[1].slice(-2);ap=m2[2]||''}
  else return null;
  if(ap){h=h%12;if(ap.charAt(0)==='p')h+=12}
  if(h<0||h>23||mi<0||mi>59)return null;
  return h*60+mi;
}
function fmt(m){var h=Math.floor(m/60),n=m%60,ap=h>=12?'PM':'AM';h=h%12||12;return h+(n?':'+(n<10?'0':'')+n:'')+' '+ap}
function relText(n){
  if(n===0)return 'Today';if(n===1)return 'Tomorrow';if(n===-1)return 'Yesterday';
  var a=Math.abs(n),t;
  if(a<14)t=a+' days';
  else if(a<60){var w=Math.floor(a/7),r=a%7;t=w+' weeks'+(r?', '+r+' day'+(r>1?'s':''):'')}
  else t=Math.round(a/30.44)+' months';
  return n>0?'in '+t:t+' ago';
}
function isoWeek(d){var t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())),dn=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-dn);var y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil(((t-y0)/864e5+1)/7)}
function moonInfo(d){
  var jd=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),12)/864e5+2440587.5,S=29.530588853,age=(jd-2451550.1)%S;if(age<0)age+=S;
  var f=age/S,il=(1-Math.cos(2*Math.PI*f))/2,nm=f<.0338||f>=.9662?'New moon':f<.2162?'Waxing crescent':f<.2838?'First quarter':f<.4662?'Waxing gibbous':f<.5338?'Full moon':f<.7162?'Waning gibbous':f<.7838?'Last quarter':'Waning crescent';
  return {f:f,il:Math.round(il*100),name:nm};
}
function partOf(m){return m<300?'Night':m<720?'Morning':m<1020?'Afternoon':m<1260?'Evening':'Night'}
