// Compiles the verbatim upstream kernels (dp_kernel.inc, or_visit.inc) against
// minimal stubs. Input on stdin, one case per block:
//   nx ny binW binH nnets  then per net: k x1 y1 ... xk yk
// Output per case: "DPH v..", "DPV v..", and "OR v.." (OpenROAD needs square
// integer tiles; it is skipped with "OR skip" otherwise). Maps are x-major.
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <limits>
#include <vector>
#include <iostream>

// ---- DREAMPlace stubs ----
#define DREAMPLACE_STD_NAMESPACE std
#include "../../research/upstream/dreamplace/parameters.h"
struct AtomicAdd { typedef double type; void operator()(double* p, double v) const { *p += v; } };
#include "dp_kernel.inc"

// ---- OpenROAD stubs (odb::Rect semantics: closed rectangles, integer DBU) ----
namespace odb {
struct Rect {
  int xlo = 0, ylo = 0, xhi = 0, yhi = 0;
  Rect() = default;
  Rect(int a, int b, int c, int d) : xlo(a), ylo(b), xhi(c), yhi(d) {}
  int xMin() const { return xlo; } int yMin() const { return ylo; }
  int xMax() const { return xhi; } int yMax() const { return yhi; }
  int dx() const { return xhi - xlo; } int dy() const { return yhi - ylo; }
  long long area() const { return (long long)dx() * dy(); }
  bool isInverted() const { return xlo > xhi || ylo > yhi; }
  bool overlaps(const Rect& r) const { return !(r.xlo > xhi || r.xhi < xlo || r.ylo > yhi || r.yhi < ylo); }
  Rect intersect(const Rect& r) const { return Rect(std::max(xlo, r.xlo), std::max(ylo, r.ylo), std::min(xhi, r.xhi), std::min(yhi, r.yhi)); }
};
}
struct OrRudy {
  struct Tile { odb::Rect r; const odb::Rect& getRect() const { return r; } };
  odb::Rect grid_block_;
  int tile_cnt_x_ = 0, tile_cnt_y_ = 0, wire_width_ = 1, tile_size_ = 1;
  std::vector<std::vector<Tile>> grid_;
#include "or_visit.inc"
};

int main() {
  int nx, ny, nnets; double bw, bh;
  while (std::cin >> nx >> ny >> bw >> bh >> nnets) {
    std::vector<double> px, py; std::vector<int> start{0}, flat;
    for (int n = 0; n < nnets; ++n) {
      int k; std::cin >> k;
      for (int q = 0; q < k; ++q) { double x, y; std::cin >> x >> y; flat.push_back(px.size()); px.push_back(x); py.push_back(y); }
      start.push_back(flat.size());
    }
    // DREAMPlace pin_pos layout: x array then y array; kernel takes separate pointers.
    std::vector<double> H(nx * ny, 0.0), V(nx * ny, 0.0);
    rudyLauncher<double, AtomicAdd>(px.data(), py.data(), start.data(), flat.data(), nullptr, bw, bh,
                                    0.0, 0.0, nx * bw, ny * bh, nx, ny, nnets, 1, AtomicAdd(), H.data(), V.data());
    std::printf("DPH"); for (double v : H) std::printf(" %.17g", v); std::printf("\n");
    std::printf("DPV"); for (double v : V) std::printf(" %.17g", v); std::printf("\n");
    bool square_int = bw == bh && bw == std::floor(bw);
    for (double v : px) square_int = square_int && v == std::floor(v);
    for (double v : py) square_int = square_int && v == std::floor(v);
    if (!square_int) { std::printf("OR skip\n"); continue; }
    OrRudy o; o.tile_size_ = (int)bw; o.tile_cnt_x_ = nx; o.tile_cnt_y_ = ny;
    o.grid_block_ = odb::Rect(0, 0, nx * (int)bw, ny * (int)bh);
    o.grid_.assign(nx, std::vector<OrRudy::Tile>(ny));
    for (int x = 0; x < nx; ++x) for (int y = 0; y < ny; ++y) o.grid_[x][y].r = odb::Rect(x * o.tile_size_, y * o.tile_size_, (x + 1) * o.tile_size_, (y + 1) * o.tile_size_);
    std::vector<double> T(nx * ny, 0.0);
    for (int n = 0; n < nnets; ++n) {
      int lx = 1 << 30, ly = 1 << 30, ux = -(1 << 30), uy = -(1 << 30);
      for (int q = start[n]; q < start[n + 1]; ++q) { lx = std::min(lx, (int)px[flat[q]]); ux = std::max(ux, (int)px[flat[q]]); ly = std::min(ly, (int)py[flat[q]]); uy = std::max(uy, (int)py[flat[q]]); }
      o.visitNetTiles(odb::Rect(lx, ly, ux, uy), [&](int x, int y, float d) { T[x * ny + y] += d; });
    }
    std::printf("OR"); for (double v : T) std::printf(" %.9g", v); std::printf("\n");
  }
}
