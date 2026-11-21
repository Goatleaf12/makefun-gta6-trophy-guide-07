# Leonida Ledger — GTA VI trophy guide & tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Goatleaf12/makefun-gta6-trophy-guide-07/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Goatleaf12/makefun-gta6-trophy-guide-07/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Ledger — GTA VI trophy guide & tracker: all 55 trophies, every step cited, platinum roadmap, missables flagged**

A complete, fully offline trophy guide and progress tracker for the official
55-trophy PlayStation 5 list of Grand Theft Auto VI. Every trophy carries its
exact official name, description and grade, a plain-words summary, and a set of
numbered steps — and every step ends in citation numbers that point into a
numbered source list, so each claim in the guide can be traced to the public
guide or list it was read from. Where the sources disagree (the meditation-spot
count is the famous one), the guide shows both versions instead of picking a
side in secret. Where a fact rests on a single source, or is not yet confirmed,
the trophy says so on its face.

## What is inside

- **Checklist** — all 55 trophies grouped by the seven roadmap stages, with
  grade chips, hidden / missable / watch / unconfirmed badges, a live counter
  of earned trophies per grade, and citation refs on every row.
- **Guide pane** — the official PlayStation description (labelled as such), an
  "in short" summary, a red warning box for the one possibly missable trophy,
  a blue "sources disagree" box wherever guides conflict, numbered steps that
  each cite their sources, and a working counter widget for every trophy
  PlayStation tracks (meditations, stunts, races, challenges and more).
- **Roadmap** — a seven-stage route to the platinum and the 100% gold, with
  per-stage progress and a "next up" panel: the missable to secure first, the
  next story beat, and the counter closest to its line.
- **Missables & watch** — the risk list on one screen: the possibly missable
  trophy, the two watch items, and everything unconfirmed or single-source.
- **Sources** — the numbered source matrix: each source's name, what it is,
  its address (written as text — the app itself loads nothing from the
  network), the date it was read, how it was read, and how many of the 55
  guides cite it.
- **Tracker state** — earned trophies, counters and the spoiler setting are
  saved in the browser (localStorage). Export downloads the state as JSON;
  Import reads it back on any machine. With spoilers hidden, unearned story
  and hidden trophies are masked until earned or revealed.

## Run it

The app is plain static files with no build step and no network needs:

```
node serve.ts
```

then open the local address it prints (http://localhost:8080). Opening
`app/index.html` directly in a desktop browser works too.

## Build the submission dossier

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` into `out/` and writes
`out/dossier.json` with the vendored make.fun library in `vendor/`, which is
kept byte-identical to the kit's copy.

## Notes on the data

Trophy names, descriptions and grades are the official list as published for
PlayStation 5. Guide text is original to this entry: it paraphrases the public
guides listed in the app's Sources tab and cites them by number beside every
step. No guide text, artwork or logos are reproduced from any publisher.

## License

MIT — see `LICENSE`.
