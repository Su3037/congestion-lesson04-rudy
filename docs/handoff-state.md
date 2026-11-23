# Handoff state · 交接状态

_Last updated: 2026-11-23._

## Where the work lives

- Repository: <https://github.com/Su3037/congestion-lesson04-rudy> (`main`), published by GitHub Actions to
  <https://su3037.github.io/congestion-lesson04-rudy/>.
- The music for the 科普 film is the owner's private file (`/mnt/project-files/private-music/wenever.m4a` in the
  build environment, or `RUDY_MUSIC_WENEVER`). It is never committed; only cue times are (`content/music/wenever.json`).
- Narration takes are committed in `media-source/voice/`; the TTS models are not (re-download steps in
  `docs/REPRODUCIBILITY.md`).

## Done

Rebuilt in the course house style (decision D14): single page with ten numbered sections in zh and en; four films ×
two languages with music (科普) and voiceover (精讲, 实验演示); lab with models P and A, layers, capacity, step-through
and "Try this frame"; 7 challenges graded on the real lab state; 6-item quiz; 13 slides (PDF + PPTX, zh/en); Python
pack (5 tasks, 26 cases). All earlier oracles (teacher code, DREAMPlace and OpenROAD kernels, exact Python,
edge-case table) and the earlier core tests run against the new code. Results: `docs/verification.md`.

## Not done, and what to do next

1. **Listening test of the voice.** The voice passed an ASR screen only. Run `docs/voice-casting.md` (blind test,
   ≥ 8 native listeners, kit in `voice-test/`); if another voice wins, re-run `npm run voice`, `node scripts/build-films.mjs`
   and re-render `concise` and `lab`.
2. **Router correlation.** On a machine with OpenROAD-flow-scripts: run `gcd` (Nangate45) through global placement,
   dump the DEF; compute RUDY per GCell with model A on the GCell grid OpenROAD uses; run `global_route
   -congestion_report_file`, read per-GCell usage; report Spearman ρ and top-10 % hotspot overlap. Alternatively
   CircuitNet 2.0 (RUDY features vs congestion labels).
3. **Paper check.** Read Spindler & Johannes (DATE 2007) and confirm the degenerate-box handling and wire-width term
   against `docs/model-spec.md`.
4. **Learner study.** `docs/learner-study.md`.
5. **Issue comment.** `docs/submission-draft.md`, only when the owner says to post.
