# Congestion Lesson 04: RUDY congestion estimate

A standalone, reproducible lesson on the RUDY routing-demand estimate, made for [yongfu-li/eda-learning#42](https://github.com/yongfu-li/eda-learning/issues/42) (module `module02-01-rudy-estimate`, lab `rudy-estimate`).

**Live site:** https://su3037.github.io/congestion-lesson04-rudy/ (中文) · [English](https://su3037.github.io/congestion-lesson04-rudy/en/)

## What is in it

- **Reading** (Chinese first, English edition): terms, one net's box and tiles, the boundary rule, accumulation, capacity, why max and total overflow disagree, and how a different RUDY (area-weighted) changes the conclusion.
- **Live lab:** drag / keyboard / numeric pin editing, presets, undo/reset, model P/A switch, demand/ratio/overflow heat maps on fixed legends, net-by-net step-through with pseudocode, a synchronized number grid, per-tile breakdown, capacity control, side-by-side comparison, and visible error states.
- **Film:** code-drawn, silent, captioned; 261.9 s full cut and a 41.5 s sample, Chinese and English caption cuts, VTT. The in-page player and the MP4 use the same `renderAt(t)`; "Try this frame" moves the exact state into the lab.
- **7 challenges** graded on real lab state, two-stage hints, independent vs after-solution tracking.
- **Slides:** 12 pages with notes, PDF in both languages.
- **Python practice:** starter, exact-fraction reference, fixtures, expected results, checker (PASS / INCOMPLETE / FAIL).
- **Concept quiz** (`/study/`) for a pre/post learner study.
- **Voice kit** (`voice/`): narration written for the ear, pronunciation lexicon, blind listening test, scoring, and retiming from forced alignment. No voice has passed yet, so the film ships silent.

## The model, in one paragraph

Model P is the teacher's classroom proxy: for each net, HPWL = box width + height; select every tile between the two corners' tiles (floor, clamp, inclusive); add HPWL ÷ tile count to each. It conserves demand (Σ demand = Σ HPWL). It is not the paper's continuous density and not a router; units are teaching units. Model A, labelled separately, weights by overlap area like DREAMPlace and OpenROAD. Full spec: `docs/model-spec.md`.

## How the numbers are checked

| Oracle | Result |
| --- | --- |
| Teacher's unmodified JS / Python vs model P | 5000 / 1000 cases, 0 mismatches |
| Verbatim DREAMPlace / OpenROAD RUDY kernels vs model A | 1489 / 739 cases, 0 mismatches |
| JS vs exact-fraction Python | 2000 cases, 0 disagreements |
| fast-check / Hypothesis properties | all pass (fixed seeds) |
| Router correlation (OpenROAD global route, CircuitNet) | not run (see `docs/oracles.md`) |

## Commands

See `docs/REPRODUCIBILITY.md`. Short version: `npm ci && npm test && npm run build && npm run serve`.

## Docs

`docs/model-spec.md` · `docs/source-audit.md` · `docs/edge-cases.md` · `docs/oracles.md` · `docs/voice-casting.md` · `docs/learner-study.md` · `docs/decision-log.md` · `docs/REPRODUCIBILITY.md` · `docs/verification.md` · `docs/handoff-state.md` · `docs/submission-draft.md` · `docs/outline.md` · `docs/implementation-plan.md` · `docs/reference-adaptation.md`

## Licences

New code MIT; new content CC BY 4.0; teacher material CC BY 4.0 (Yongfu Li); DREAMPlace and OpenROAD excerpts BSD-3-Clause, used only as test oracles; fonts SIL OFL 1.1. Details in `NOTICE.md`.
