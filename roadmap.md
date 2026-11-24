# Roadmap — MuniAI workshop site

Static Nepali training site hosted under `public/workshop/`. Files arrive over several messages; place byte-for-byte, no edits.

- [x] Replace `src/routes/index.tsx` with redirect to `/workshop/index.html` (loading text "लोड हुँदैछ…")
- [x] Set root route title to "AI तालिम सन्धिखर्क"
- [x] Create `public/workshop/index.html` (byte-for-byte from user)
- [x] Place `public/workshop/data/*.js` (21 files, checksums verified)
- [x] Place `public/workshop/files/*` (4 download files, checksums verified)

## AI for ALL: AI for CSOs package

- [x] Third course `cso` (AI for CSOs): `public/workshop/cso/index.html` (English; facilitator guide, Participant Workbook, Ex 1–8, Use Case 1 Loo Niva M1–M11, demos D1–D7, feedback form)
- [x] Question pool `assessment/pool-cso.js` (ids 201–210; every event uses all 10); keys in the database only
- [x] `event-info.js`, admin, event, login, assessment report and trainer nav know the `cso` course
- [x] Landing page rebranded "AI for ALL" with five packages
- [x] Database: package `cso`, keys loaded, event AICSO001 "AI for LooNiva" (2026-11-28)
- [ ] After merge: make AICSO001 the active event (trainer console)
