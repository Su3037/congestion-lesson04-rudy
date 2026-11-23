# Decision log

| # | Decision | Why |
| --- | --- | --- |
| D1 | Model P (teacher's equal-share proxy) is the core; model A (area-weighted) is a separate, labelled extension | The issue maps to the teacher's module; production tools use area weighting. Comparing them on the same pins is the lesson's main insight. |
| D2 | Validate and reject instead of computing on bad input | The teacher's code returns finite-looking numbers for NaN pins, empty nets and capacity 0 (`docs/edge-cases.md`). |
| D3 | Pins are points; no cell-centre offsets | The teacher's RUDY functions use the coordinates as given. |
| D4 | Fixed legends for demand (0–8), ratio (0–4), overflow (0–6) | Equal colour must mean equal value across cases and models. |
| D5 | Model A's degenerate-box rule spreads a line net's length along the line | Both production tools drop zero-area boxes, which would make line nets invisible in the comparison. Labelled as a teaching choice, and the edge-case table shows what the tools do. |
| D6 | "Top 25% mean ratio" statistic, not called ACE | It follows the ACE(x) idea but is not the contest's edge-based definition. |
| D7 | Silent film with burned-in captions; voice only after a blind listening test | Earlier films with per-cue edge-tts were criticised; this machine cannot reach any TTS. |
| D8 | Reading-time clock of 4.5 characters/s + 0.9 s, minimum 2.6 s; captions ≤ 16 CJK characters per line, ≤ 2 lines, no break inside numbers, formulas or parentheses | Readable at first viewing; well under the 9 characters/s limit. |
| D9 | One SVG board for figures, lab, film and slides | Guarantees the film frame and the lab show the same geometry from the same numbers; "Try this frame" moves exact state. |
| D10 | Upstream oracles compile the verbatim upstream text with stubs | Comparing against my reading of the code would not be independent. |
| D11 | MP4s committed directly (≈ 4 MB each), no Git LFS | Pages must not serve LFS pointer files. |
| D12 | English page and English-caption film share the same data and timeline | One source of truth; no drift between languages. |
| D13 | Router-correlation oracle not run | OpenROAD/ORFS and CircuitNet were not installable on the build machine. Documented as not run, with steps. |
