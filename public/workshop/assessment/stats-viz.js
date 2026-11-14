/* Statistics and charts for the trainer's results dashboard: correlation of test scores with the
 * participants' demographics, a multiple linear regression, and the infographics that show them.
 * Plain functions (window.SV); charts are inline SVG that take the page's colours from CSS. */
(function (root) {
  "use strict";

  /* ---------- distributions ---------- */
  function logGamma(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5, s = 1.000000000190015;
    t -= (x + 0.5) * Math.log(t);
    for (var j = 0; j < 6; j++) s += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  function betacf(a, b, x) {
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d; var h = d;
    for (var m = 1; m <= 200; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d; var del = d * c; h *= del;
      if (Math.abs(del - 1) < 3e-12) break;
    }
    return h;
  }
  /* Regularised incomplete beta I_x(a, b). */
  function ibeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  /* Two-sided p for Student's t with df degrees of freedom. */
  function tP(t, df) { if (!isFinite(t)) return 0; return ibeta(df / (df + t * t), df / 2, 0.5); }
  /* Upper-tail p for F(d1, d2). */
  function fP(F, d1, d2) { if (!(F > 0)) return 1; return ibeta(d2 / (d2 + d1 * F), d2 / 2, d1 / 2); }
  /* Critical t for a two-sided interval (e.g. 0.95). */
  function tCrit(df, level) {
    var alpha = 1 - (level || 0.95), lo = 0, hi = 200;
    for (var i = 0; i < 80; i++) { var mid = (lo + hi) / 2; if (tP(mid, df) > alpha) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  /* ---------- correlation ---------- */
  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : null; }
  function ranks(a) {
    var idx = a.map(function (v, i) { return [v, i]; }).sort(function (p, q) { return p[0] - q[0]; });
    var r = new Array(a.length), i = 0;
    while (i < idx.length) {
      var j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      var avg = (i + j) / 2 + 1; for (var k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1;
    }
    return r;
  }
  function pearson(x, y) {
    var n = x.length; if (n < 3) return null;
    var mx = mean(x), my = mean(y), num = 0, dx = 0, dy = 0;
    for (var i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) * (x[i] - mx); dy += (y[i] - my) * (y[i] - my); }
    return dx === 0 || dy === 0 ? null : num / Math.sqrt(dx * dy);
  }
  /* r with its two-sided p (t test with n − 2 df) for Pearson or Spearman. */
  function corr(x, y, method) {
    var ok = []; for (var i = 0; i < x.length; i++) if (x[i] != null && y[i] != null && isFinite(x[i]) && isFinite(y[i])) ok.push(i);
    var xs = ok.map(function (i) { return x[i]; }), ys = ok.map(function (i) { return y[i]; }), n = ok.length;
    var r = method === "spearman" ? pearson(ranks(xs), ranks(ys)) : pearson(xs, ys);
    if (r === null) return { r: null, p: null, n: n };
    var p = Math.abs(r) >= 1 ? 0 : (n > 2 ? tP(r * Math.sqrt((n - 2) / (1 - r * r)), n - 2) : null);
    return { r: r, p: p, n: n };
  }
  /* Simple least-squares line y = a + b x. */
  function line(x, y) {
    var mx = mean(x), my = mean(y), sxy = 0, sxx = 0;
    for (var i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); }
    if (!sxx) return null;
    var b = sxy / sxx; return { a: my - b * mx, b: b };
  }

  /* ---------- multiple linear regression (OLS) ---------- */
  function invert(M) {
    var n = M.length, A = M.map(function (row, i) { return row.concat(row.map(function (_, j) { return i === j ? 1 : 0; })); });
    for (var c = 0; c < n; c++) {
      var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-10) return null;
      var tmp = A[c]; A[c] = A[p]; A[p] = tmp;
      var piv = A[c][c]; for (var k = 0; k < 2 * n; k++) A[c][k] /= piv;
      for (var r2 = 0; r2 < n; r2++) if (r2 !== c) { var f = A[r2][c]; if (f) for (var k2 = 0; k2 < 2 * n; k2++) A[r2][k2] -= f * A[c][k2]; }
    }
    return A.map(function (row) { return row.slice(n); });
  }
  /* rows: records; y(r) → number|null; preds: [{key, label, get(r) → number|null}].
     Records with a missing value are left out; predictors that do not vary are dropped. */
  function regress(rows, y, preds) {
    var use = rows.filter(function (r) { var v = y(r); return v != null && isFinite(v) && preds.every(function (p) { var x = p.get(r); return x != null && isFinite(x); }); });
    var keep = preds.filter(function (p) { var vals = use.map(p.get); return vals.some(function (v) { return v !== vals[0]; }); });
    var dropped = preds.filter(function (p) { return keep.indexOf(p) < 0; });
    var n = use.length, k = keep.length;
    var base = { n: n, k: k, dropped: dropped, preds: keep };
    if (!k || n < k + 3) return Object.assign(base, { ok: false, reason: "few" });
    var X = use.map(function (r) { return [1].concat(keep.map(function (p) { return p.get(r); })); });
    var Y = use.map(y);
    if (!Y.some(function (v) { return v !== Y[0]; })) return Object.assign(base, { ok: false, reason: "novar" });
    var XtX = [], XtY = [];
    for (var i = 0; i <= k; i++) {
      XtX.push([]); var sy = 0;
      for (var j = 0; j <= k; j++) { var s = 0; for (var m = 0; m < n; m++) s += X[m][i] * X[m][j]; XtX[i].push(s); }
      for (var m2 = 0; m2 < n; m2++) sy += X[m2][i] * Y[m2];
      XtY.push(sy);
    }
    var inv = invert(XtX);
    if (!inv) return Object.assign(base, { ok: false, reason: "collinear" });
    var beta = inv.map(function (row) { return row.reduce(function (s, v, j) { return s + v * XtY[j]; }, 0); });
    var my = mean(Y), sse = 0, sst = 0;
    for (var q = 0; q < n; q++) { var fit = X[q].reduce(function (s, v, j) { return s + v * beta[j]; }, 0); sse += (Y[q] - fit) * (Y[q] - fit); sst += (Y[q] - my) * (Y[q] - my); }
    var df = n - k - 1, s2 = sse / df, tc = tCrit(df, 0.95);
    var r2 = sst ? 1 - sse / sst : 0, adj = 1 - (1 - r2) * (n - 1) / df;
    var F = r2 < 1 && k ? (r2 / k) / ((1 - r2) / df) : Infinity;
    var coefs = keep.map(function (p, i) {
      var b = beta[i + 1], se = Math.sqrt(Math.max(inv[i + 1][i + 1] * s2, 0)), t = se ? b / se : null;
      return { key: p.key, label: p.label, unit: p.unit || "", b: b, se: se, t: t, p: se ? tP(t, df) : null, lo: b - tc * se, hi: b + tc * se };
    });
    return Object.assign(base, { ok: true, intercept: beta[0], coefs: coefs, r2: r2, adjR2: adj, F: F, pF: fP(F, k, df), df: df, rmse: Math.sqrt(sse / n) });
  }

  /* ---------- formatting ---------- */
  var DEV = "०१२३४५६७८९";
  function np(s) { return String(s).replace(/[0-9]/g, function (d) { return DEV[+d]; }); }
  function f2(v, d) { if (v == null || !isFinite(v)) return "—"; var s = v.toFixed(d == null ? 2 : d); return s.replace(/^-/, "−"); }
  function signed(v, d) { return v == null ? "—" : (v > 0 ? "+" : "") + f2(v, d); }
  function pTxt(p) { if (p == null) return "—"; if (p < 0.001) return "p < 0.001"; return "p = " + p.toFixed(p < 0.1 ? 3 : 2); }
  function strength(r) { var a = Math.abs(r); return a < 0.1 ? "नगण्य" : a < 0.3 ? "कमजोर" : a < 0.5 ? "मध्यम" : "बलियो"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- charts (inline SVG; colours from the page's --sv-* custom properties) ---------- */
  var W = 440;
  function niceMax(v) { var steps = [0.25, 0.5, 1, 2, 2.5, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100]; for (var i = 0; i < steps.length; i++) if (v <= steps[i]) return steps[i]; return Math.ceil(v / 50) * 50; }

  /* Diverging bars, −1 … +1: one row per variable, its name above the bar. */
  function corrChart(rows) {
    var x0 = 8, x1 = W - 8, rowH = 52, top = 22, h = top + rows.length * rowH + 4;
    var X = function (v) { return x0 + (v + 1) / 2 * (x1 - x0); };
    var s = '<svg class="sv" viewBox="0 0 ' + W + ' ' + h + '" role="img" aria-label="सहसम्बन्ध चार्ट">';
    [-1, -0.5, 0, 0.5, 1].forEach(function (t) {
      s += '<line class="sv-grid' + (t === 0 ? ' sv-zero' : '') + '" x1="' + X(t) + '" x2="' + X(t) + '" y1="' + (top - 4) + '" y2="' + (h - 4) + '"/>' +
        '<text class="sv-tick" x="' + X(t) + '" y="12" text-anchor="middle">' + f2(t, t % 1 ? 1 : 0) + '</text>';
    });
    rows.forEach(function (r, i) {
      var y = top + i * rowH, by = y + 24;
      s += '<g class="sv-hit"><title>' + esc(r.label + ": r = " + f2(r.r) + ", " + pTxt(r.p) + ", n = " + r.n) + '</title>' +
        '<rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
        '<text class="sv-lab" x="' + x0 + '" y="' + (y + 14) + '">' + esc(r.label) + '</text>';
      if (r.r == null) {
        s += '<text class="sv-val" x="' + X(0) + '" y="' + (by + 11) + '" text-anchor="middle">पर्याप्त डाटा छैन</text></g>';
        return;
      }
      var a = X(Math.min(0, r.r)), b = X(Math.max(0, r.r)), w = Math.max(b - a, 2);
      var cls = r.p != null && r.p < 0.05 ? (r.r >= 0 ? "sv-pos" : "sv-neg") : (r.r >= 0 ? "sv-pos sv-faint" : "sv-neg sv-faint");
      s += '<rect class="' + cls + '" x="' + a + '" y="' + by + '" width="' + w + '" height="16" rx="4"/>';
      var txt = "r = " + f2(r.r) + " · " + pTxt(r.p) + (r.p != null && r.p < 0.05 ? " ★" : "");
      var right = r.r >= 0, tx = right ? b + 6 : a - 6;
      if (right && tx > x1 - 150) { right = false; tx = a - 6; }
      if (!right && tx < x0 + 150) { right = true; tx = b + 6; }
      s += '<text class="sv-val" x="' + tx + '" y="' + (by + 12) + '" text-anchor="' + (right ? "start" : "end") + '">' + esc(txt) + '</text></g>';
    });
    return s + '</svg>';
  }

  /* Coefficient (forest) plot: estimate with its 95% interval; a zero line; significant ones in colour. */
  function coefChart(coefs) {
    var m = 0; coefs.forEach(function (c) { m = Math.max(m, Math.abs(c.lo), Math.abs(c.hi)); });
    m = niceMax(m || 1);
    var x0 = 8, x1 = W - 8, rowH = 52, top = 22, h = top + coefs.length * rowH + 4;
    var X = function (v) { return x0 + (v + m) / (2 * m) * (x1 - x0); };
    var s = '<svg class="sv" viewBox="0 0 ' + W + ' ' + h + '" role="img" aria-label="प्रतिगमन गुणाङ्क चार्ट">';
    [-m, -m / 2, 0, m / 2, m].forEach(function (t) {
      s += '<line class="sv-grid' + (t === 0 ? ' sv-zero' : '') + '" x1="' + X(t) + '" x2="' + X(t) + '" y1="' + (top - 4) + '" y2="' + (h - 4) + '"/>' +
        '<text class="sv-tick" x="' + X(t) + '" y="12" text-anchor="middle">' + signed(t, t % 1 ? (Math.abs(t) < 1 ? 2 : 1) : 0) + '</text>';
    });
    coefs.forEach(function (c, i) {
      var y = top + i * rowH, cy = y + 32, sig = c.p != null && c.p < 0.05, cls = sig ? (c.b >= 0 ? "sv-pos" : "sv-neg") : "sv-ns";
      s += '<g class="sv-hit"><title>' + esc(c.label + ": " + signed(c.b, 1) + " " + c.unit + " (९५% CI " + f2(c.lo, 1) + " देखि " + f2(c.hi, 1) + "), " + pTxt(c.p)) + '</title>' +
        '<rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
        '<text class="sv-lab" x="' + x0 + '" y="' + (y + 14) + '">' + esc(c.label) + '</text>' +
        '<text class="sv-val" x="' + x1 + '" y="' + (y + 14) + '" text-anchor="end">' + esc(signed(c.b, 1) + " " + c.unit + " · " + pTxt(c.p) + (sig ? " ★" : "")) + '</text>' +
        '<line class="sv-ci ' + cls + '" x1="' + X(Math.max(c.lo, -m)) + '" x2="' + X(Math.min(c.hi, m)) + '" y1="' + cy + '" y2="' + cy + '"/>' +
        '<circle class="sv-dot ' + cls + '" cx="' + X(c.b) + '" cy="' + cy + '" r="6"/></g>';
    });
    return s + '</svg>';
  }

  /* Scatter of score against one variable, with the least-squares line. For an ordinal variable the
     points are spread sideways a little (the same way every time) and each group's mean is marked. */
  function scatter(pts, o) {
    var w = 300, h = 230, L = 40, R = 10, T = 12, B = 44;
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var xmin, xmax, xt = [];
    if (o.ticks) { xmin = -0.5; xmax = o.ticks.length - 0.5; }
    else if (o.xmin != null) { xmin = o.xmin; xmax = o.xmax; xt = o.xticks; }
    else {   // round ticks around the data: a step of 1, 2, 2.5 or 5 × 10^k, about four steps
      var lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs), raw = (hi - lo) / 4 || 1, mag = Math.pow(10, Math.floor(Math.log10(raw)));
      var step = [1, 2, 2.5, 5, 10].map(function (k) { return k * mag; }).filter(function (v) { return v >= raw; })[0];
      xmin = Math.floor(lo / step) * step; xmax = Math.ceil(hi / step) * step; if (xmax === xmin) xmax = xmin + step;
      for (var q = xmin; q <= xmax + 1e-9; q += step) xt.push(+q.toFixed(6));
    }
    var ymin = o.ymin != null ? o.ymin : 0, ymax = o.ymax != null ? o.ymax : 100;
    var X = function (v) { return L + (v - xmin) / (xmax - xmin) * (w - L - R); };
    var Y = function (v) { return T + (1 - (v - ymin) / (ymax - ymin)) * (h - T - B); };
    var s = '<svg class="sv sv-sc" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(o.title || "") + '">';
    var yt = o.yticks || [0, 25, 50, 75, 100];
    yt.forEach(function (t) { s += '<line class="sv-grid' + (t === 0 ? ' sv-zero' : '') + '" x1="' + L + '" x2="' + (w - R) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text class="sv-tick" x="' + (L - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + esc((o.yfmt || String)(t)) + '</text>'; });
    if (o.ticks) o.ticks.forEach(function (t, i) { s += '<text class="sv-tick" x="' + X(i) + '" y="' + (h - B + 16) + '" text-anchor="middle">' + esc(t) + '</text>'; });
    else xt.forEach(function (v) { s += '<text class="sv-tick" x="' + X(v) + '" y="' + (h - B + 16) + '" text-anchor="middle">' + esc((o.xfmt || String)(v)) + '</text>'; });
    s += '<text class="sv-axis" x="' + ((L + w - R) / 2) + '" y="' + (h - 6) + '" text-anchor="middle">' + esc(o.xLabel || "") + '</text>';
    if (o.diag) s += '<line class="sv-ref" x1="' + X(Math.max(xmin, ymin)) + '" y1="' + Y(Math.max(xmin, ymin)) + '" x2="' + X(Math.min(xmax, ymax)) + '" y2="' + Y(Math.min(xmax, ymax)) + '"/>';
    pts.forEach(function (p, i) {
      var jx = o.ticks ? (((i * 37) % 11) / 10 - 0.5) * 0.5 : 0;
      s += '<circle class="sv-pt" cx="' + X(p.x + jx).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="4.5"><title>' + esc(p.tip || "") + '</title></circle>';
    });
    if (o.ticks) o.ticks.forEach(function (t, i) {
      var g = ys.filter(function (_, j) { return xs[j] === i; }); if (!g.length) return;
      var mY = mean(g); s += '<rect class="sv-mean" x="' + (X(i) - 14) + '" y="' + (Y(mY) - 2) + '" width="28" height="4" rx="2"><title>' + esc(t + ": औसत " + Math.round(mY) + " (n = " + g.length + ")") + '</title></rect>';
    });
    var ln = line(xs, ys);
    if (ln) {
      var a = o.ticks ? 0 : Math.min.apply(null, xs), b = o.ticks ? o.ticks.length - 1 : Math.max.apply(null, xs);
      var ya = Math.max(ymin, Math.min(ymax, ln.a + ln.b * a)), yb = Math.max(ymin, Math.min(ymax, ln.a + ln.b * b));
      s += '<line class="sv-fit" x1="' + X(a) + '" y1="' + Y(ya) + '" x2="' + X(b) + '" y2="' + Y(yb) + '"/>';
    }
    return s + '</svg>';
  }

  root.SV = { ibeta: ibeta, tP: tP, fP: fP, tCrit: tCrit, mean: mean, pearson: pearson, corr: corr, line: line, regress: regress,
    f2: f2, signed: signed, pTxt: pTxt, strength: strength, np: np, corrChart: corrChart, coefChart: coefChart, scatter: scatter };
})(typeof window !== "undefined" ? window : globalThis);
