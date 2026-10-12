# Leatherbound

A paper school planner for one student's year at École Jacques-Leber, as an
iPhone app: the school's 9-day rotation timetable and academic calendar are
printed on the page, your own notes are written on it by hand, and every view is
a paper object — gilt cover, torn edge, saddle stitching along the top and a page
that curls when you turn the month.

The page *is* the app. There is no framework, no bundler and no build step: the
iPhone app is a web view around `web/index.html`, which works offline out of the
box because nothing it shows comes from the network.

```
web/                         the whole app — this is what ships
  index.html                 the shell: cover, view menu, four view containers
  css/                       tokens (paper, ink, gilt) then one file per view
  js/                        loaded in the order index.html lists them; see below
  fonts/                     three self-hosted faces + their OFL licences
  icon-32.png icon-180.png   favicon and touch icon, generated (see "Icons")
ios/                         the iPhone wrapper
  Leatherbound/App.swift     the SwiftUI app
  Leatherbound/WebView.swift the WKWebView, and the paper colour it starts on
  Leatherbound/BundleScheme.swift  serves web/ out of the app bundle over app://local
  Leatherbound/Assets.xcassets/    the compiled app icon
  project.yml                XcodeGen spec — the .xcodeproj is generated, not committed
package.json                 the check's manifest; the page itself has no dependencies
tools/make-icons.py          draws every icon from one 1024 master
tools/selfcheck.mjs          opens the real page and holds it to its own data
.github/workflows/ios.yml    checks the page, then builds an unsigned .ipa
school_data_2026_2027_combined.json   the school's own documents, transcribed
fonts-i-like/                the open-licensed font sources (see "Typefaces")
Leatherbound — Calendar.html  the original single-file prototype this was sliced from
```

## The page

```sh
npm run serve          # any static server will do: http://127.0.0.1:8137
```

The scripts are plain classic scripts loaded in the order `index.html` lists
them, and load order matters twice: a file may only use another file it follows,
and the day page borrows its measurements from the week page.

| file | its one job |
| --- | --- |
| `util.js` | pure helpers — date keys, time parsing, the moon. No DOM, so it is testable outside a browser |
| `state.js` | where you are looking: today, the selected day, the open view |
| `school-data.js` | the year, derived from `school_data_2026_2027_combined.json` |
| `school.js` | what the timetable means: slots, the live period, closures, terms |
| `store.js` | the notebook on disk — palette, entries, and how two tabs share them |
| `month.js` `week.js` `day.js` `year.js` | the four pages, and the router that picks one |
| `views.js` | the arrows, the date button, switching views |
| `notes.js` | writing, listing and deleting notes |
| `palette.js` | ink colours: choosing, adding, editing |
| `turn.js` | the page curl and the month-strip gestures |
| `boot.js` | startup: fit the page, keep the clock honest, follow other tabs |

The prototype at the root of the repo is kept as the record of where the design
came from. It is not the app and it is not kept in step with it.

## The self-check

```sh
npm ci
npm run selfcheck
```

27 checks, and the interesting ones are not "does it crash" — a web page with a
broken script still loads, it just shows an empty sheet. So the check loads
`web/index.html` the way a browser does (every stylesheet, every script, in
order) in a real DOM with the clock pinned to a Tuesday second period, then
holds what came out against the JSON the school data was transcribed from:
every class day's rotation number, every period of all nine days, every course's
teacher and room, every closure, the term ends, the live strip, and what each of
the four views renders. It also writes a note through the page and reads it back,
and feeds the notebook junk to see it repaired rather than trusted.

`school-data.js` is hand-derived from the JSON, so it can drift from it
silently; a wrong rotation number is not an error message, it is the wrong
classroom at 9:25. Run this after touching `web/`, the JSON, or the icons.

## Icons

```sh
npm run icons          # python3 + Pillow; reads the hand face out of fonts-i-like/
```

One 1024×1024 master is drawn in the app's own palette — the leather cover, the
gilt stitching, a torn page, and the vermilion ring that marks today in the
month grid — and the favicon, the touch icon and the Xcode `AppIcon` are all
resampled from it, so the icon in the tab and the icon on the home screen are
one picture rather than two that drifted apart.

## Building the app

Push to `main` (or run the workflow by hand). `.github/workflows/ios.yml` runs
two jobs: the page self-check, then — only if that passed — a Release archive on
`macos-15` and an **unsigned** `Leatherbound-unsigned.ipa` uploaded as an
artifact. Unsigned means it installs with a sideloading tool, not from the App
Store; signing needs a certificate and a provisioning profile, which would live
in repository secrets.

On a Mac with Xcode:

```sh
brew install xcodegen
xcodegen generate --spec ios/project.yml
open ios/Leatherbound.xcodeproj
```

## Typefaces

Three faces, each with one job, so the page reads as one document:

- **Patrick Hand** — your own hand: every note you write.
- **Architects Daughter** — the planner's lettering: day numbers, times, labels.
- **Playfair Display** — printed matter: the month name, section heads, the year sheet.

They are self-hosted in `web/fonts/` with their OFL licences beside them, because
an app that is meant to work in a lift must not ask the network for its own
lettering. The other faces in `fonts-i-like/` were considered and left out, with
the reasoning written down in `web/css/fonts.css` — and the ones whose licences
are not open (Burbank Big Condensed, Ashley Script, Dwarven Stonecraft, Pieces of
Eight) are not in this repository at all: font sources live here only when they
may be passed on.

## Privacy

Nothing leaves the phone. There are no network requests, no analytics and no
account: your notes are in the app's own storage, and the school data is a file
in the bundle.
