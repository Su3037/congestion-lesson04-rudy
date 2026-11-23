# Implementation plan (as executed)

1. Extract the evidence pack into its own directory; copy the teacher files and the pinned upstream files into `research/`.
2. Write `docs/model-spec.md`; implement `site/js/rudy.js` and `python/rudy_ref.py` independently.
3. Tests from the pack's numbers first; then property tests; then oracles (teacher, upstream, cross-language, edge cases).
4. Shared board (`board.js`), film timeline (`film.js`), renderer page, stills, 41 s sample, full film (zh, en).
5. Lab, challenges, reading pages (zh, en), slides and PDF, Python kit, concept quiz.
6. Voice kit (narration for the ear, lexicon, blind test, scoring, retime); no voice shipped.
7. Docs, CI (test → build → browser checks → Pages), push, verify the live URL, clean-clone rebuild.
