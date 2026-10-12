#!/usr/bin/env node
/* ===== selfcheck.mjs — open the real page in a DOM and hold it to its own data =====

   The app is one page and one year of school data, and it has two ways to be
   quietly wrong: school-data.js is hand-derived from
   school_data_2026_2027_combined.json, so it can drift from the source silently;
   and a view can render an empty sheet without throwing anything at all.  A
   wrong rotation day is not an error, it is the wrong classroom at 9:25.

   So this loads web/index.html the way a browser does — every stylesheet, every
   script, in load order — with the clock pinned to a known minute, and then
   checks what came out against the JSON the data was taken from.

       npm run selfcheck

   Run it after touching web/, school_data_*.json, or tools/make-icons.py.
   Exits non-zero and names the first thing that disagrees.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, ResourceLoader, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "web");
const SOURCE = path.join(ROOT, "school_data_2026_2027_combined.json");

/* a Tuesday in a teaching week, second period, ten minutes after the bell */
const CLOCK = "2026-10-13T09:30:00";
const DAY = "2026-10-13";

/* ------------------------------------------------------------------ reporting */
let failed = 0, passed = 0;
function check(name, fn) {
  try {
    const detail = fn();
    passed++;
    console.log(`  ok    ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}\n          ${e.message}`);
  }
}
function eq(got, want, what) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) throw new Error(`${what}\n          expected ${w}\n          got      ${g}`);
  return `${what} ✓`;
}
function ok(cond, what) { if (!cond) throw new Error(what); return `${what} ✓`; }
function section(title) { console.log(`\n${title}`); }

/* ---------------------------------------------------------- the real page, loaded
   A ResourceLoader that serves http://leatherbound.local/... out of web/, so the
   document has a normal origin (file:// is opaque, and localStorage — the whole
   notebook — refuses to open in one).  Every request is recorded: a stylesheet
   that 404s does not throw, it just leaves the page unstyled. */
const served = [];
class Bundle extends ResourceLoader {
  fetch(url, options) {
    const file = decodeURIComponent(new URL(url).pathname);
    served.push(file);
    return fs.promises.readFile(path.join(WEB, file));
  }
}
const noise = [];
const console_ = new VirtualConsole();
console_.on("jsdomError", e => noise.push(e.message.split("\n")[0]));
console_.on("error", (...a) => noise.push("console.error " + a.join(" ")));

const json = JSON.parse(fs.readFileSync(SOURCE, "utf8"));

const dom = await JSDOM.fromFile(path.join(WEB, "index.html"), {
  url: "http://leatherbound.local/",
  resources: new Bundle(),
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole: console_,
  beforeParse(window) {
    /* pin the clock: "today", the live strip and the now line must be checkable */
    const Real = window.Date, at = new Real(CLOCK).getTime();
    window.Date = class extends Real {
      constructor(...args) { super(...(args.length ? args : [at])); }
      static now() { return at; }
    };
    window.scrollTo = () => {};
    /* jsdom has no matchMedia.  The page asks it whether the reader wants less motion
       (curl the paper, or just turn it), so it has to answer, or the turn never starts. */
    window.matchMedia = (media) => ({
      media, matches: false, onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {},
      dispatchEvent: () => false,
    });
  },
});
const win = dom.window;
const $ = (sel) => win.document.querySelector(sel);
const $$ = (sel) => [...win.document.querySelectorAll(sel)];
const text = (el) => el.textContent.replace(/\s+/g, " ").trim();

/* Scripts are fetched and run asynchronously.  Waiting on a function would be a lie:
   views.js defines setView before boot.js has drawn anything, so the wait is on the
   finished page — the month sheet is on screen, which only boot.js can put there. */
await new Promise((resolve, reject) => {
  const started = win.Date.now();
  const timer = setInterval(() => {
    const drawn = win.document.readyState === "complete" && $("#grid .day");
    if (drawn && typeof win.setView === "function") { clearInterval(timer); resolve(); }
    else if (win.Date.now() - started > 15000) { clearInterval(timer); reject(new Error(`the page never finished drawing (readyState ${win.document.readyState})`)); }
  }, 20);
});

/* ============================== 1. the page as a document ============================== */
section("the page loads as a browser loads it");

check("every stylesheet and script in index.html resolved", () => {
  const html = fs.readFileSync(path.join(WEB, "index.html"), "utf8");
  const want = [...html.matchAll(/(?:href|src)="((?:css|js)\/[^"]+)"/g)].map(m => m[1]);
  ok(want.length > 0, `${want.length} local assets referenced`);
  const missing = want.filter(f => !served.includes("/" + f));
  ok(missing.length === 0, `none missing from the load (${missing.join(", ") || "all fetched"})`);
  return `${want.length} assets`;
});

check("the three faces are the ones the page declares", () => {
  const faces = $$('link[rel="stylesheet"]').map(l => l.getAttribute("href"));
  ok(faces.includes("css/fonts.css"), "fonts.css is linked");
  const css = fs.readFileSync(path.join(WEB, "css/fonts.css"), "utf8");
  for (const face of ["Patrick Hand", "Architects Daughter", "Playfair Display"]) {
    ok(css.includes(`font-family:'${face}'`), `${face} declared`);
    ok(css.includes(`${face.toLowerCase().replace(/ /g, "-")}`), `${face} has a local file`);
  }
  ok(!/https?:\/\//.test(css), "no font is fetched over the network");
  return "self-hosted, no network";
});

check("the icons the page and the app bundle ask for exist", () => {
  const sizes = { "icon-32.png": 32, "icon-180.png": 180 };
  for (const [file, size] of Object.entries(sizes)) {
    const buf = fs.readFileSync(path.join(WEB, file));
    ok(buf.subarray(1, 4).toString() === "PNG", `${file} is a png`);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    ok(w === size && h === size, `${file} is ${size}×${size} (found ${w}×${h})`);
  }
  const icon = path.join(ROOT, "ios/Leatherbound/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png");
  const buf = fs.readFileSync(icon);
  ok(buf.readUInt32BE(16) === 1024 && buf.readUInt32BE(20) === 1024, "the AppIcon master is 1024×1024");
  /* colour type 2 is truecolour without alpha: an app icon with transparency is
     rejected, and the mistake would only surface at submission time */
  ok(buf[25] === 2, `the AppIcon master carries no alpha channel (png colour type ${buf[25]})`);
  const set = JSON.parse(fs.readFileSync(path.join(ROOT, "ios/Leatherbound/Assets.xcassets/AppIcon.appiconset/Contents.json"), "utf8"));
  ok(set.images.length === 1 && set.images[0].filename === "AppIcon-1024.png", "the iconset points at it");
  return "web favicon, touch icon, AppIcon";
});

check("nothing threw while the page started up", () => {
  const real = noise.filter(n => !/Could not parse CSS stylesheet/i.test(n));
  ok(real.length === 0, real.join(" | ") || "clean console");
  return "clean console";
});

/* ============================== 2. school-data.js vs the JSON ============================== */
section("school-data.js still agrees with school_data_2026_2027_combined.json");

const SCHOOL = win.SCHOOL;
const calendarDays = json.calendar.months.flatMap(m => m.dates);
const classDays = calendarDays.filter(d => d.status === "class_day");

check("every class day carries the rotation day it is printed with", () => {
  eq(Object.keys(SCHOOL.days).length, classDays.length, "class days in school-data.js");
  const wrong = classDays.filter(d => SCHOOL.days[d.date] !== d.rotation_day);
  ok(wrong.length === 0, wrong.length ? wrong.slice(0, 5).map(d => `${d.date} printed JOUR ${d.rotation_day}, app says ${SCHOOL.days[d.date]}`).join("; ") : "all rotations match the source");
  return `${classDays.length} days`;
});

check("there are no classes on a weekend, a holiday or a pedagogical day", () => {
  const bad = Object.keys(SCHOOL.days).filter(q => {
    const d = new Date(+q.slice(0, 4), +q.slice(5, 7) - 1, +q.slice(8, 10));
    return d.getDay() === 0 || d.getDay() === 6 || SCHOOL.off[q];
  });
  ok(bad.length === 0, bad.join(", ") || "no class day falls on a day off");
  return "weekdays only";
});

check("the timetable matches the printed timetable, period for period", () => {
  json.timetable.days.forEach(day => {
    const app = SCHOOL.rot[day.rotation_day];
    ok(!!app, `rotation day ${day.rotation_day} exists`);
    const want = day.periods.map(p => [p.period, p.start, p.end, p.course_code]);
    eq(app, want, `JOUR ${day.rotation_day}`);
  });
  return `${json.timetable.days.length} days × ${json.timetable.days[0].periods.length} periods`;
});

check("the courses match: code, name, teacher and room", () => {
  for (const [code, c] of Object.entries(json.timetable.courses)) {
    const app = SCHOOL.courses[code];
    ok(!!app, `${code} is in the app`);
    ok(app.n.startsWith(c.name.slice(0, 8)), `${code} name “${app.n}” vs “${c.name}”`);
    eq(app.t, c.teacher, `${code} teacher`);
    eq(app.r, c.room, `${code} room`);
  }
  eq(Object.keys(SCHOOL.courses).length, Object.keys(json.timetable.courses).length, "course count");
  return `${Object.keys(SCHOOL.courses).length} courses`;
});

check("the term ends are the ones the school calendar prints", () => {
  eq(win.TERMS, json.calendar.important_dates.term_ends.map(t => t.date), "term ends");
  return win.TERMS.join(" · ");
});

check("every closure in the calendar is in the app, and no others", () => {
  const sets = json.calendar.date_sets;
  /* the app keeps the calendar's own distinctions (pool, school, conditional,
     teacher-scheduled); they all print as "Pedagogical day" through OFFL, and the
     year page adds them into one count */
  const marked = {
    hol: [...sets.holidays, ...sets.summer_holiday_markings],
    brk: sets.spring_break,
    ped: sets.fixed_pedagogical_days,
    tped: sets.teacher_scheduled_fixed_pedagogical_days,
    sped: sets.school_pedagogical_days,
    cond: sets.conditional_pedagogical_days,
    pool: sets.pedagogical_pool_day,
  };
  let count = 0;
  for (const [code, dates] of Object.entries(marked)) {
    for (const q of dates) {
      eq(SCHOOL.off[q], code, `${q} should be “${code}”`);
      count++;
    }
  }
  eq(Object.keys(SCHOOL.off).length, count, "closures in the app");
  return `${count} closures`;
});

check("the year the app reports is the year the calendar covers", () => {
  /* dayType() and the legend come from these two maps, not from the JSON */
  eq(win.TOTCLASS, 180, "class days in the legend");
  const legend = { ped: 20, hol: 17, brk: 5 };
  const got = { ped: 0, hol: 0, brk: 0 };
  for (const code of Object.values(SCHOOL.off)) got[code === "hol" ? "hol" : code === "brk" ? "brk" : "ped"]++;
  eq(got, legend, "pedagogical / holiday / break days");
  const first = [json.calendar.range.first_day_of_class, json.calendar.range.last_day_of_class];
  const span = Object.keys(SCHOOL.days).sort();
  eq([span[0], span[span.length - 1]], first, "first and last day of class");
  return `180 / 20 / 17 / 5`;
});

/* ============================== 3. the clock ============================== */
section(`the page at a known minute (${CLOCK.replace("T", " ")})`);

check("it knows which day it is and which JOUR", () => {
  eq(win.today, DAY, "today");
  eq(win.rotOf(DAY), 1, "JOUR");
  eq(win.offOf(DAY), "", "not a day off");
  return `today ${DAY} · JOUR 1`;
});

check("the live strip names the class that is in progress", () => {
  const live = win.liveNow(DAY);
  ok(!!live, "something is live");
  eq(live.t, "Éduc. physique", "in progress now");
  eq(live.left, 70, "minutes left of the period");
  eq(live.r, "PC121", "room");
  return `${live.t} in ${live.r}, ${live.left} min left`;
});

check("the day sheet is the bus and the four periods, in clock order", () => {
  /* the sheet prints the short name of a course; the full school label is kept in
     cInfo().n for the timetables that show it */
  const slots = win.slots(DAY).map(s => [s.st, win.slotName(s)]);
  eq(slots, [["08:40", "Bus"], ["09:25", "Éduc. physique"], ["10:50", "Anglais"], ["13:20", "Mathématiques"], ["14:45", "Français"]], "today's rows");
  return slots.map(s => s[0]).join(" ");
});

check("no periods are ever missing from a rotation day", () => {
  for (let r = 1; r <= 9; r++) eq(win.slots(Object.keys(SCHOOL.days).find(q => SCHOOL.days[q] === r)).length, 5, `JOUR ${r} rows`);
  return "9 rotation days";
});

/* ============================== 4. what each view renders ============================== */
section("every view renders what it is supposed to render");

check("the month page is a full grid with today ringed", () => {
  win.setView("month");
  const cells = $$("#grid .day");
  eq(cells.length, 35, "cells in October 2026");
  const todayCell = $(`#grid .day[data-k="${DAY}"]`);
  ok(!!todayCell, "today is in the grid");
  ok(!!todayCell.querySelector("b.today"), "today is ringed");
  ok(!!todayCell.querySelector("i.rot"), "and numbered with its JOUR");
  eq(text($("#mn")), "October", "month name");
  eq(text($("#yr")), "2026", "year");
  eq($("#back").hidden, true, "the today button is hidden while you are in the current month");
  return "35 cells, today marked";
});

check("days off and days out of the month are drawn differently", () => {
  /* the month grid carries the closing's own code, and school.css washes each one */
  const holiday = $(`#grid .day[data-k="2026-10-12"]`);
  ok(holiday.classList.contains("hol"), `the holiday is washed red (${holiday.className})`);
  ok(!holiday.querySelector("i.rot"), "and has no rotation number, because there are no classes");
  const ped = $(`#grid .day[data-k="2026-10-05"]`);
  ok(ped.classList.contains("ped"), `the pedagogical day is washed yellow (${ped.className})`);
  eq($$("#grid .day.hol").map(c => c.dataset.k), ["2026-10-12"], "exactly one holiday in October");
  eq($$("#grid .day.ped").map(c => c.dataset.k), ["2026-10-05"], "and one pedagogical day, the Monday two weeks before");
  ok($("#grid .day").className.includes("out"), "the first cell of the month is an overhang day");
  ok($(`#grid .day[data-k="2026-10-13"]`).querySelector("i.rot"), "a class day is numbered");
  return "holiday, pedagogical day, overhang, class day";
});

check("the week page is seven rows with the right JOUR on each", () => {
  win.setView("week");
  const rows = $$("#ws .wday");
  eq(rows.length, 7, "rows");
  const stamps = $$("#ws .jr").map(text);
  eq(stamps, ["JOUR 1", "JOUR 2", "JOUR 3", "JOUR 4"], "rotation stamps on the school days of that week");
  const tuesday = rows.find(r => r.dataset.k === DAY);
  eq([...tuesday.querySelectorAll(".ev")].length, 4, "periods listed on Tuesday");
  ok(text(rows[0]).startsWith("Sun11"), "the week starts on Sunday");
  eq(text($("#mn")) + " " + text($("#yr")), "Oct 11–17 2026", "week heading");
  return "7 rows, JOUR 1–4";
});

check("the day page interleaves the printed rows with the written ones", () => {
  win.goToDay(DAY);
  /* the now line is a row too, so the sheet reads bus, four periods, and the clock */
  const rows = $$("#dv .tle").filter(r => !r.classList.contains("dnow")).map(r => text(r));
  eq(rows.length, 5, "rows on the sheet");
  ok(rows[0].startsWith("8:40 AM") && rows[0].includes("Bus"), `first row is the bus (got ${rows[0]})`);
  ok(rows[1].startsWith("9:25 AM") && rows[1].includes("P1") && rows[1].includes("Éduc. physique"), `then period 1 (got ${rows[1]})`);
  ok(rows[4].startsWith("2:45 PM") && rows[4].includes("Français"), `and last period 4 (got ${rows[4]})`);
  ok($("#dv .dnow"), "the now line is drawn, since this is today");
  ok(text($("#dv .snow")).includes("Éduc. physique"), "the live strip is showing");
  eq(text($("#dv .dfoot")), "Day 286 of 365 · Week 42 · JOUR 1 · Waxing crescent", "the footer");
  return "5 rows + now line";
});

check("a day off says so instead of showing an empty timetable", () => {
  win.goToDay("2026-10-12");
  ok(text($("#dv")).includes("Holiday"), "the holiday is named");
  ok(text($("#dv")).includes("no classes"), "and says there are none");
  return "holiday · no classes";
});

check("the year page is the whole year on one sheet", () => {
  win.setView("year");
  eq($$("#yv .yledger button.yrow").length, 12, "month rows");
  const run = $$("#yv .yledger .yr")[0];
  ok(!!run, "the ledger has day cells");
  const months = [];
  for (let y = 2026, m = 6; !(y === 2027 && m === 6); m === 11 ? (m = 0, y++) : m++) months.push(new Date(y, m + 1, 0).getDate());
  eq($$("#yv .yc").length, months.reduce((a, b) => a + b, 0), "cells drawn for the twelve months");
  eq($$("#yv .yc.ty-c").length, 180, "class days shaded");
  eq($$("#yv .yc.ty-brk").length, 5, "spring break shaded");
  ok(text($("#yv .yline")).startsWith("Term 1 of 3"), `term line (${text($("#yv .yline"))})`);
  const done = win.classDaysUpTo(DAY);
  eq(done, 28, "class days counted up to today");
  ok(text($("#yv .yline")).includes(`${done} of 180`), "and the page prints that count");
  eq(text($("#yr")), "2026–2027", "the year heading");
  return "12 months, 180 class days";
});

check("picking a subject re-reads the year for that subject", () => {
  win.setView("year");
  const find = () => $$("#yv .ysub button").find(b => text(b) === "Mathématiques");
  find().dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  ok(text($("#yv .yline")).startsWith("Mathématiques ·"), `rail switched (${text($("#yv .yline"))})`);
  const periods = win.courseYear().list["MAT306-37"].length;
  ok(text($("#yv .yline")).includes(`of ${periods} periods`), `periods counted (${periods})`);
  ok($$("#yv .onc").length > 0, "and that subject's days are marked on the ledger");
  /* the rail is redrawn on every render, so ask the page for it again */
  find().dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  ok(text($("#yv .yline")).startsWith("Term"), `and switches back (${text($("#yv .yline"))})`);
  return `Mathématiques, ${periods} periods`;
});

/* ============================== 5. the notebook ============================== */
section("the notebook: writing, keeping, deleting");

check("a note written through the page is kept", () => {
  win.setView("month");
  $(`#grid .day[data-k="2026-10-19"]`).dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  ok($("#note").classList.contains("open"), "the sheet opened");
  const input = $("#txt");
  input.value = "Dentist";
  input.dispatchEvent(new win.Event("input", { bubbles: true }));
  $("#tm").value = "3:30pm";
  $("#tm").dispatchEvent(new win.Event("input", { bubbles: true }));
  eq(text($("#tmhint")), "→ 3:30 PM", "the time hint reads the time back");
  $("#go").dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  eq(win.ev["2026-10-19"], [{ t: "Dentist", c: "a", s: 930 }], "the stored note");
  const cell = $(`#grid .day[data-k="2026-10-19"]`);
  eq(text(cell.querySelector("u")), "Dentist", "the month cell shows it");
  eq(text(cell.querySelector("i.rot")), "5", "next to its rotation number");
  eq($("#txt").value, "", "the composer is empty again");
  return "written, stored, on the page";
});

check("it is still there after the page is opened again", () => {
  const reloaded = win.load();
  eq(reloaded["2026-10-19"], [{ t: "Dentist", c: "a", s: 930 }], "re-read from disk");
  return "read back from localStorage";
});

check("a note can be deleted again", () => {
  win.drawList();
  $("#list button").dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  eq(win.ev["2026-10-19"], undefined, "the day is empty again");
  eq(text($("#list")), "a clean page", "the list says so instead of showing nothing at all");
  eq(win.load()["2026-10-19"], undefined, "and so is the disk");
  return "added, deleted, gone";
});

check("a broken notebook is repaired instead of breaking the page", () => {
  /* storage is just text on disk: it can be truncated, hand-edited, or written by
     an older build.  Nothing in it may take the render down. */
  win.localStorage.setItem("lb-ev2", JSON.stringify({
    "not-a-date": [{ t: "junk", c: "a" }],
    "2026-10-20": "not an array",
    "2026-10-21": [null, {}, { t: "   " }, { t: "fine", c: "zz", s: 900 }, { t: "late", c: "a", s: 4000 }, { t: "square", c: "b", s: "780" }],
  }));
  const repaired = win.load();
  eq(Object.keys(repaired).sort(), ["2026-10-21"], "only the usable day survives");
  eq(repaired["2026-10-21"].length, 3, "three of the six entries are usable");
  eq(repaired["2026-10-21"][0], { t: "fine", c: "a", s: 900 }, "an unknown colour falls back to the first, the time is kept");
  eq(repaired["2026-10-21"][1], { t: "late", c: "a" }, "an impossible time is dropped, the note itself survives as all day");
  eq(repaired["2026-10-21"][2], { t: "square", c: "b", s: 780 }, "a numeric string time is read as a number");
  win.ev = {}; win.dirty = {};
  win.render();
  return "junk dropped, bad values corrected";
});

check("the times people actually type are the times it reads", () => {
  const read = { "8:40": 520, "0840": 520, "8h40": 520, "9": 540, "8:40pm": 1240, "20:15": 1215, "12am": 0, "12:30pm": 750, " 7:05 ": 425 };
  for (const [typing, minutes] of Object.entries(read)) eq(win.parseTime(typing), minutes, `“${typing}”`);
  for (const typing of ["map", "1.5", "n0pe", "25:00", "8:99", "", "   "]) eq(win.parseTime(typing), null, `“${typing}” is not a time`);
  eq(win.fmt(520), "8:40 AM", "and written back");
  eq(win.fmt(1240), "8:40 PM", "in the evening");
  return "9 shapes read, 7 rejected";
});

/* ============================== 6. working over an entry ============================== */
section("opening an old entry and writing over it");

const fire = (el, type = "click") => el.dispatchEvent(new win.MouseEvent(type, { bubbles: true }));
const input = (el, value) => { el.value = value; el.dispatchEvent(new win.Event("input", { bubbles: true })); };
const cellOf = (q) => $(`#grid .day[data-k="${q}"]`);
const tabOf = (q, i) => cellOf(q).querySelector(`u[data-i="${i}"]`);

/* write a note the way a person does: open the sheet on a day, fill it in, press Add */
function noteOn(q, text, time) {
  win.openNote(q, false);
  input($("#txt"), text);
  input($("#tm"), time || "");
  fire($("#go"));
}
const EDITED = "2026-10-14";   /* a class day nobody has written on yet */

check("tapping an entry opens the sheet over that entry, not over the day", () => {
  win.setView("month");
  win.Y = 2026; win.M = 9; win.A = new win.Date(2026, 9, 14);   /* October, where these checks live */
  win.ev = {}; win.dirty = {}; win.render();
  noteOn(EDITED, "Dentist", "3:30pm");
  eq(win.ev[EDITED], [{ t: "Dentist", c: "a", s: 930 }], "the note is written");
  fire(tabOf(EDITED, 0));
  eq($("#txt").value, "Dentist", "the sheet holds the entry's words");
  eq($("#tm").value, "3:30 PM", "and its time, written the way the page writes it");
  eq(text($("#go")), "Done", "the button offers to finish, not to add");
  eq($("#del").hidden, false, "and Remove is there to take it off the page");
  ok(tabOf(EDITED, 0).classList.contains("lift"), "the entry lifts off the page while it is in the sheet");
  ok($("#list li[data-i='0']").classList.contains("on"), "and the sheet's own list marks that line");
  eq(win.document.activeElement.tagName, "BODY", "nothing is focused: the entry is shown before it is written over");
  return "text, time, colour and the lifted tab all follow the entry";
});

check("Done writes the change back and puts the entry down again", () => {
  input($("#txt"), "Dentist — Dr. Roy");
  input($("#tm"), "4:15pm");
  fire($("#go"));
  eq(win.ev[EDITED], [{ t: "Dentist — Dr. Roy", c: "a", s: 975 }], "the notebook");
  eq(win.ev[EDITED].length, 1, "entries edited, not added");
  eq(text(tabOf(EDITED, 0)), "Dentist — Dr. Roy", "the page");
  eq($("#note").classList.contains("open"), false, "the sheet closed");
  eq($("#note").querySelectorAll(".lift").length + $$("main .lift").length, 0, "and nothing is left lifted");
  eq(text($("#go")), "Add", "the sheet is ready to write a new note again");
  return "corrected in place";
});

check("a colour tapped while editing recolours the entry, not your ink", () => {
  fire(tabOf(EDITED, 0));
  eq(win.pick, "a", "the ink you write with");
  fire($$("#cols button")[1]);
  eq(win.editCol, "b", "the entry's colour follows the tap");
  eq(win.pick, "a", "and your ink is left where you had it");
  eq(win.ev[EDITED][0].c, "a", "nothing is written until Done");
  fire($("#go"));
  eq(win.ev[EDITED][0].c, "b", "Done writes the new colour");
  eq(win.pick, "a", "still your own ink");
  return "the entry changes colour, the pen does not";
});

check("closing the sheet throws the draft away", () => {
  fire(tabOf(EDITED, 0));
  input($("#txt"), "something you thought better of");
  fire($("#close"));
  eq(win.ev[EDITED], [{ t: "Dentist — Dr. Roy", c: "b", s: 975 }], "the notebook");
  eq(text(tabOf(EDITED, 0)), "Dentist — Dr. Roy", "and the page");
  eq($("#txt").value, "", "the composer is empty again");
  eq(win.editIdx, null, "and the sheet is writing a new note");
  return "nothing half-written is ever filed";
});

check("a line that is not a time is refused, not quietly made all-day", () => {
  fire(tabOf(EDITED, 0));
  input($("#tm"), "banana");
  fire($("#go"));
  eq(win.ev[EDITED], [{ t: "Dentist — Dr. Roy", c: "b", s: 975 }], "nothing was written");
  eq($("#note").classList.contains("open"), true, "the sheet stays open to be corrected");
  ok($("#warn").textContent.includes("banana"), `the sheet says why (${text($("#warn"))})`);
  ok($("#note").classList.contains("no"), "the paper refuses");
  eq(text($("#tmhint")), "not a time", "and the time field says so too");
  return "as all-day it would have gone missing silently";
});

check("an empty note is refused", () => {
  input($("#tm"), "4:15pm");
  input($("#txt"), "   ");
  fire($("#go"));
  eq(win.ev[EDITED], [{ t: "Dentist — Dr. Roy", c: "b", s: 975 }], "nothing was written");
  ok($("#warn").textContent.includes("words"), `the sheet says why (${text($("#warn"))})`);
  fire($("#close"));
  return "an entry cannot be blanked by accident";
});

check("clearing the time makes an entry all day", () => {
  fire(tabOf(EDITED, 0));
  input($("#tm"), "");
  fire($("#go"));
  eq(win.ev[EDITED], [{ t: "Dentist — Dr. Roy", c: "b" }], "the time is gone and the note is not");
  return "timed \u2194 all day either way";
});

check("removing the line above leaves the sheet writing over the same entry", () => {
  noteOn(EDITED, "Bus pass", "7:45am");          /* second entry, appended after the first */
  eq(win.ev[EDITED].map(e => e.t), ["Dentist — Dr. Roy", "Bus pass"], "two entries");
  const busCol = win.ev[EDITED][1].c;              /* whatever colour it was written in */
  fire($("#list li[data-i='1'] span"));           /* open the second one */
  eq(win.editIdx, 1, "writing over the second entry");
  fire($("#list li[data-i='0'] button"));         /* delete the first one underneath it */
  eq(win.ev[EDITED].map(e => e.t), ["Bus pass"], "the first is gone");
  eq(win.editIdx, 0, "and the sheet moved with its entry");
  eq($("#txt").value, "Bus pass", "still holding the entry it started on");
  input($("#txt"), "Bus pass (renewed)");
  fire($("#go"));
  eq(win.ev[EDITED], [{ t: "Bus pass (renewed)", c: busCol, s: 465 }], "Done wrote the entry that was being edited");
  return "the entry that shifted was not the one overwritten";
});

check("Remove takes an entry off the page for good", () => {
  fire(tabOf(EDITED, 0));
  eq($("#del").hidden, false, "Remove is offered");
  fire($("#del"));
  eq(win.ev[EDITED], undefined, "the day is empty");
  eq(win.load()[EDITED], undefined, "and so is the disk");
  eq($("#note").classList.contains("open"), false, "the sheet closed");
  eq($(`#grid .day[data-k="${EDITED}"] u`), null, "the page has no tab left");
  return "removed, and stored";
});

check("the month cell prints entries by the clock, not by when they were written", () => {
  noteOn(EDITED, "Permission slip");              /* all day, written first */
  noteOn(EDITED, "Piano lesson", "4pm");          /* timed, written second */
  eq(win.ev[EDITED].map(e => e.t), ["Permission slip", "Piano lesson"], "storage keeps the order they were written in");
  eq([...cellOf(EDITED).querySelectorAll("u")].map(text), ["Piano lesson", "Permission slip"], "the cell reads by the clock");
  eq([...cellOf(EDITED).querySelectorAll("u")].map(u => u.dataset.i), ["1", "0"], "and each tab still points at its own entry");
  fire(tabOf(EDITED, 0));
  eq($("#txt").value, "Permission slip", "so the second tab opens the all-day entry");
  fire($("#close"));
  return "display order and storage order are allowed to differ";
});

check("the sheet follows the page when it is asked for another day", () => {
  win.goToDay(EDITED);
  eq(win.V, "day", "the day page is up");
  win.openNote(DAY, false);                       /* a different day, while the day page is up */
  eq(win.k(win.A.getFullYear(), win.A.getMonth(), win.A.getDate()), DAY, "the page followed");
  eq(text($("#nd")), "Tue, Oct 13", "and the sheet is showing that day, not the one the page left behind");
  fire($("#close"));
  return "no way to write a note onto the wrong day";
});

check("every page still agrees after all that", () => {
  win.setView("week"); win.setView("day"); win.setView("year"); win.setView("month");
  eq($$("#ws .wday").length, 7, "the week page is a week again");
  eq($$("#grid .day").length, 35, "the month page is back with October on it");
  eq(win.load()[EDITED].length, 2, "the notebook still holds the day's two entries");
  return "four views, one notebook";
});

check("another tab rewriting the entry under the sheet makes it stand down", () => {
  /* a planner on a phone lives in two places at once: the day it was written and the
     day it is being written.  Another tab can delete the entry the sheet is over, and
     the draft must not land on whatever moved into its place. */
  win.Y = 2026; win.M = 9; win.render();
  win.dirty = {};                                  /* accept the other tab's notebook */
  fire(tabOf(EDITED, 1));
  eq(win.editIdx, 1, "the sheet is working over the second entry");
  const theirs = JSON.parse(JSON.stringify(win.ev));
  theirs[EDITED] = [{ t: "Piano lesson", c: "a", s: 960 }];   /* the all-day one is gone */
  win.dispatchEvent(new win.StorageEvent("storage", { key: "lb-ev2", newValue: JSON.stringify(theirs) }));
  eq(win.ev[EDITED].length, 1, "the notebook took the other tab's version");
  eq(win.editIdx, null, "and the sheet let go of the entry that moved");
  eq($("#txt").value, "", "back to writing a new note");
  fire($("#close"));
  return "a draft never lands on the wrong entry";
});

/* The page turn runs on requestAnimationFrame, so this one has to be waited for.  It is
   the last check because it leaves the page two months further on, mid-turn.
   The clock is the module's own: the page's Date is pinned to a single minute. */
await (async () => {
  const name = "two taps as fast as a hand can make them turn two pages, not one";
  try {
    win.setView("month");
    const before = win.Y * 12 + win.M;
    win.go(1); win.go(1);
    const started = Date.now();
    let moved = 0;
    for (;;) {
      await new Promise(r => setTimeout(r, 25));
      moved = win.Y * 12 + win.M - before;
      if (!win.curlOn && !win.pendingTurn && moved === 2) break;
      if (Date.now() - started > 15000) throw new Error(`15s later, the two taps had turned ${moved} page(s) (curling: ${win.curlOn})`);
    }
    passed++;
    console.log(`  ok    ${name} — both taps turned, ${moved} pages`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}\n          ${e.message}`);
  }
})();

/* ---------------------------------------------------------------------- result */
console.log(`\n${failed ? "✗" : "✓"} ${passed} checks passed${failed ? `, ${failed} FAILED` : ""}\n`);
/* exit rather than close(): jsdom's request manager throws on close() when a
   custom resource loader is in use, and that throw would look like a failure here */
process.exit(failed ? 1 : 0);
