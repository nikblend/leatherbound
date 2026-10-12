/* ===== state.js — where you are looking: today, the selected day, the open view ===== */
var T=new Date(),tY=T.getFullYear(),tM=T.getMonth(),tD=T.getDate();
var Y=tY,M=tM,pick='a',V='month',A=new Date();
var sel=k(tY,tM,tD),today=sel;
