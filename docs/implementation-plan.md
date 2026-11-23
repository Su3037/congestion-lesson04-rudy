# Implementation plan (as executed)

1. Extract the evidence pack into its own directory; copy the teacher files and the pinned upstream files into `research/`.
2. Write `docs/model-spec.md`; implement `site/js/rudy.js` and `python/rudy_ref.py` independently.
3. Tests from the pack's numbers first; then property tests; then oracles (teacher, upstream, cross-language, edge cases).
4. Shared board (`board.js`), film timeline (`film.js`), renderer page, stills, 41 s sample, full film (zh, en).
5. Lab, challenges, reading pages (zh, en), slides and PDF, Python kit, concept quiz.
6. Voice kit (narration for the ear, lexicon, blind test, scoring, retime); no voice shipped.
7. Docs, CI (test → build → browser checks → Pages), push, verify the live URL, clean-clone rebuild.

## Second pass: rebuilt in the course house style (2026-11-23)

8. Port the HPWL lesson's engine (page, films, renderer, slides, player, lab shell, CI) and put the RUDY model inside (`site/js/domain.js`); keep the first pass's oracles and tests, now run through `oracles/adapter.mjs`.
9. Write four film scripts in the house formats (`tools/films_src.py`), the zh/en lesson text, seven challenges, quiz and the 13-page deck (`tools/slides_src.py`).
10. Narration: Kokoro-82M offline, a line per take, lexicon and spoken forms; choose the zh voice by ASR error rate; full ASR check.
11. Build clocks from the measured takes; record the lab walkthrough from the real page; render 4 films × 2 languages with music (科普) and voice (精讲, 实验演示); media checks.
12. Python pack (5 tasks, 26 cases), unit/browser tests, docs, push, CI, Pages.
