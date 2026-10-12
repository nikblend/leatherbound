/* ===== school.js — what the timetable and the school calendar mean ===== */
function cInfo(c){return SCHOOL.courses[c]||{n:c,d:c,t:'',r:''}}
function rotOf(q){return SCHOOL.days[q]||0}
function offOf(q){return SCHOOL.off[q]||''}
function annOf(q){return SCHOOL.ann[q]||''}
function t2m(s){var z=s.split(':');return +z[0]*60+ +z[1]}
/* what the school day actually contains: the four periods of its rotation day, plus
   your own routine (the bus). Breaks and lunch are not listed — you know when they are. */
function slots(q){
  var r=SCHOOL.days[q];if(!r)return [];
  var a=SCHOOL.rot[r].map(function(p){return {k:'c',p:p[0],c:p[3],s:t2m(p[1]),e:t2m(p[2]),st:p[1],en:p[2]}});
  ROUTINE.forEach(function(z){a.push({k:'r',n:z.t,s:t2m(z.s),e:t2m(z.s),st:z.s,en:z.s})});
  return a.sort(function(x,y){return x.s-y.s||(x.k==='c'?-1:0)});
}
function slotName(z){return z.k==='c'?cInfo(z.c).d:z.n}
/* what the timetable says RIGHT NOW (today only) — period in progress, or the next bell */
function liveNow(q){
  if(q!==today||!SCHOOL.days[q])return null;
  var nd=new Date(),nm=nd.getHours()*60+nd.getMinutes(),S=slots(q),i,cur=null,nx=null;
  for(i=0;i<S.length;i++)if(nm>=S[i].s&&nm<S[i].e){cur=S[i];break}
  if(!cur)for(i=0;i<S.length;i++)if(nm<S[i].s){nx=S[i];break}
  if(cur)return {t:slotName(cur),r:cur.k==='c'?cInfo(cur.c).r:'',left:cur.e-nm};
  if(nx)return {t:slotName(nx),r:nx.k==='c'?cInfo(nx.c).r:'',pre:nx.st};
  return null;
}
var TOTCLASS=Object.keys(SCHOOL.days).length;
/* term boundaries, from calendar.important_dates.term_ends */
var TERMS=['2026-11-12','2027-02-11','2027-06-23'];
function dayType(q){
  if(SCHOOL.days[q])return 'c';
  var o=SCHOOL.off[q];
  return o==='hol'?'hol':o==='brk'?'brk':o?'ped':'';
}
function classDaysUpTo(q){var n=0;Object.keys(SCHOOL.days).forEach(function(d){if(d<=q)n++});return n}
var CLASSDATES=Object.keys(SCHOOL.days).sort();
function fmtDate(q){var d=new Date(+q.substr(0,4),+q.substr(5,2)-1,+q.substr(8,2));return d.toLocaleDateString('en',{month:'short',day:'numeric'})}
