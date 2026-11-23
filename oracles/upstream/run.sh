#!/usr/bin/env bash
# Oracle (b): verbatim DREAMPlace and OpenROAD RUDY kernels versus model A.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; root="$(cd "$here/../.." && pwd)"
build="$root/.cache/upstream"; mkdir -p "$build"
python3 -I "$here/extract.py" "$build"
cp "$here/harness.cpp" "$build/harness.cpp"
g++ -O1 -std=c++17 -I"$build" -o "$build/harness" "$build/harness.cpp"
node "$here/compare.mjs" "$build/harness"
