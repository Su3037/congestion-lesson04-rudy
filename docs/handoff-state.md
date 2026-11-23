# Handoff state

Last updated 2026-11-23.

## Done

Domain model (P and A) in JS and Python; tests and five oracles green; edge-case table; zh/en lesson pages; lab; 7 challenges; 12 slides with PDFs; Python kit; concept quiz page; film (zh and en caption cuts, 261.9 s) and 41.5 s sample; voice kit; docs; CI workflow (test → build → browser checks → Pages).

## Not done, and what to do next

1. **Voice.** Run `docs/voice-casting.md` steps 3–9 on a machine that can reach model weights or a TTS service. Recruit ≥ 8 native listeners. Ship a voice only if it passes.
2. **Router correlation.** On a machine with OpenROAD-flow-scripts: run `gcd` (Nangate45) through global placement, dump the DEF; compute RUDY per GCell with model A on the GCell grid OpenROAD uses; run `global_route -congestion_report_file`, read per-GCell usage; report Spearman ρ and top-10% hotspot overlap. Alternatively use CircuitNet 2.0 (RUDY features vs congestion labels).
3. **Paper check.** Read Spindler & Johannes (DATE 2007) and confirm the degenerate-box handling and wire-width term against `docs/model-spec.md`.
4. **Learner study.** `docs/learner-study.md`.
5. **Issue comment.** `docs/submission-draft.md`, only when the author says to post.
