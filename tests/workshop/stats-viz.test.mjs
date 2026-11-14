// Statistics behind the results dashboard's correlation/regression infographics,
// checked against statsmodels OLS and scipy (values computed once with Python).
import test from "node:test";
import assert from "node:assert/strict";
import "../../public/workshop/assessment/stats-viz.js";
const SV = globalThis.SV;
let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const rows = [];
for (let i = 0; i < 30; i++) { const f = rnd() < 0.4 ? 1 : 0, a = Math.floor(rnd() * 4), e = Math.floor(rnd() * 3), t = 5 + rnd() * 20; rows.push({ f, a, e, t, y: 60 + 5 * e - 3 * a + 4 * f + 0.3 * t + (rnd() - 0.5) * 30 }); }
const close = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);

test("OLS matches statsmodels", () => {
  const m = SV.regress(rows, r => r.y, ["f", "a", "e", "t"].map(k => ({ key: k, label: k, get: r => r[k] })));
  assert.equal(m.ok, true);
  close(m.intercept, 60.3534, 1e-3, "intercept");
  [[6.7581, 3.3948, 0.0575, -0.234, 13.75], [-0.8298, 1.5899, 0.6063, -4.104, 2.445], [5.7143, 1.9071, 0.0061, 1.786, 9.642], [-0.0423, 0.2687, 0.876, -0.596, 0.511]]
    .forEach((e, i) => { const c = m.coefs[i]; close(c.b, e[0], 1e-3, "b" + i); close(c.se, e[1], 1e-3, "se" + i); close(c.p, e[2], 1e-3, "p" + i); close(c.lo, e[3], 2e-3, "lo" + i); close(c.hi, e[4], 2e-3, "hi" + i); });
  close(m.r2, 0.347, 1e-3, "R2"); close(m.adjR2, 0.2426, 1e-3, "adjR2"); close(m.F, 3.3216, 1e-3, "F"); close(m.pF, 0.02591, 1e-4, "pF");
});
test("correlations match scipy", () => {
  const sp = SV.corr(rows.map(r => r.e), rows.map(r => r.y), "spearman"); close(sp.r, 0.48038, 1e-4, "rho"); close(sp.p, 0.0072146, 1e-5, "p rho");
  const pe = SV.corr(rows.map(r => r.t), rows.map(r => r.y)); close(pe.r, -0.19154, 1e-4, "r"); close(pe.p, 0.31060, 1e-4, "p r");
});
test("predictors that do not vary are dropped; too few rows is reported", () => {
  const m = SV.regress(rows, r => r.y, [{ key: "k", label: "k", get: () => 1 }, { key: "e", label: "e", get: r => r.e }]);
  assert.deepEqual(m.dropped.map(p => p.key), ["k"]); assert.equal(m.coefs.length, 1);
  assert.equal(SV.regress(rows.slice(0, 3), r => r.y, [{ key: "e", label: "e", get: r => r.e }, { key: "t", label: "t", get: r => r.t }]).ok, false);
});
test("charts render SVG", () => {
  assert.match(SV.corrChart([{ label: "x", r: 0.4, p: 0.01, n: 20 }, { label: "y", r: null, p: null, n: 2 }]), /^<svg[\s\S]*<\/svg>$/);
  assert.match(SV.scatter([{ x: 0, y: 50 }, { x: 1, y: 70 }, { x: 2, y: 80 }], { ticks: ["a", "b", "c"] }), /sv-fit/);
});
