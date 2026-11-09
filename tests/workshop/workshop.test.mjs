// Unit tests for the workshop pages (no browser, no network).
// Run: node --test tests/workshop/   (or: npm run test:workshop)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const W = path.join(ROOT, "public/workshop");
const read = (rel) => fs.readFileSync(path.join(W, rel), "utf8");

// Load a browser-style script into a sandbox and return it.
function load(rel, extra = {}) {
  const ctx = vm.createContext({ console, Math, Uint32Array, crypto: globalThis.crypto, window: {}, document: {}, ...extra });
  vm.runInContext(read(rel), ctx, { filename: rel });
  return ctx;
}

const HTML_FILES = [
  "index.html", "login.html", "admin.html", "profile.html",
  "assessment/index.html", "representative/index.html",
];

test("every inline script in the workshop pages compiles", () => {
  for (const f of HTML_FILES) {
    const html = read(f);
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.ok(scripts.length >= 1, `${f} has an inline script`);
    scripts.forEach((code, i) => {
      assert.doesNotThrow(() => new vm.Script(code, { filename: `${f}#${i}` }), `${f} inline script ${i} compiles`);
    });
  }
});

test("every standalone workshop script compiles", () => {
  for (const f of ["account.js", "assessment/pool-employee.js", "assessment/pool-representative.js"]) {
    assert.doesNotThrow(() => new vm.Script(read(f), { filename: f }), `${f} compiles`);
  }
});

function checkPool(pool, lo, hi) {
  assert.equal(pool.length, 50, "50 questions");
  const ids = pool.map((q) => q.id).sort((a, b) => a - b);
  assert.deepEqual(ids, Array.from({ length: 50 }, (_, i) => lo + i), `ids ${lo}-${lo + 49}`);
  const levels = { 1: 0, 2: 0, 3: 0 };
  pool.forEach((q) => levels[q.c]++);
  assert.deepEqual(levels, { 1: 10, 2: 25, 3: 15 }, "20:50:30 split (10/25/15)");
  for (const q of pool) {
    assert.equal(q.o.length, 4, `q${q.id} has 4 options`);
    assert.equal(new Set(q.o).size, 4, `q${q.id} options are distinct`);
    assert.ok(q.a >= 0 && q.a <= 3, `q${q.id} answer index in range`);
    assert.ok(q.q && q.e, `q${q.id} has question and explanation`);
  }
  const pos = [0, 0, 0, 0];
  pool.forEach((q) => pos[q.a]++);
  assert.ok(Math.max(...pos) - Math.min(...pos) <= 2, `answer positions balanced: ${pos}`);
  return pool;
}

test("representative pool: 50 questions, ids 101-150, 10/25/15, balanced answers", () => {
  const ctx = load("assessment/pool-representative.js");
  const pool = checkPool(Array.from(ctx.POOL_REPRESENTATIVE), 101, 150);
  // Option length must not give the answer away: the correct option is never the single longest.
  const giveaway = pool.filter((q) => {
    const lens = q.o.map((x) => [...x].length);
    const c = lens[q.a];
    return lens.every((l, i) => i === q.a || l < c);
  }).length;
  assert.equal(giveaway, 0, "correct option is never the single longest");
});

test("employee pool: 50 questions, ids 1-50, 10/25/15, balanced answers", () => {
  const ctx = load("assessment/pool-employee.js");
  checkPool(Array.from(ctx.POOL_EMPLOYEE), 1, 50);
});

test("pools do not share ids", () => {
  const emp = load("assessment/pool-employee.js");
  const rep = load("assessment/pool-representative.js");
  const a = new Set(Array.from(emp.POOL_EMPLOYEE, (q) => q.id));
  for (const q of rep.POOL_REPRESENTATIVE) assert.ok(!a.has(q.id), `id ${q.id} unique across pools`);
});

for (const [name, pool, pick] of [
  ["employee", "POOL_EMPLOYEE", "pickEventSet"],
  ["representative", "POOL_REPRESENTATIVE", "pickRepresentativeSet"],
]) {
  test(`${name}: each event draws 4 simple + 10 medium + 6 complex, no repeats`, () => {
    const file = name === "employee" ? "assessment/pool-employee.js" : "assessment/pool-representative.js";
    const ctx = load(file);
    const byId = new Map(Array.from(ctx[pool], (q) => [q.id, q]));
    for (let run = 0; run < 200; run++) {
      const ids = Array.from(ctx[pick]());
      assert.equal(ids.length, 20);
      assert.equal(new Set(ids).size, 20, "no repeated question");
      const lv = { 1: 0, 2: 0, 3: 0 };
      ids.forEach((id) => { assert.ok(byId.has(id), `id ${id} in pool`); lv[byId.get(id).c]++; });
      assert.deepEqual(lv, { 1: 4, 2: 10, 3: 6 });
    }
  });
}

test("account.js exposes the methods the pages call", () => {
  const ctx = load("account.js");
  const WS = ctx.window.WS;
  for (const m of [
    "init", "signUp", "signIn", "signOut", "isTrainer", "isApproved", "materialsPublic", "setMaterialsPublic",
    "listByStatus", "setStatus", "listPackages", "listEvents", "saveEvent", "updateEvent", "deleteEvent",
    "loadEventForProfile", "saveMyProfile", "submitFeedback",
  ]) {
    assert.equal(typeof WS[m], "function", `WS.${m}`);
  }
  assert.equal(WS.isTrainer(), false, "no profile means not a trainer");
  assert.equal(WS.isApproved(), false, "no profile means not approved");
});

test("admin page: the manual registration form sends only email and password", () => {
  const html = read("admin.html");
  assert.ok(html.includes('id="mrEmail"') && html.includes('id="mrPass"'));
  assert.ok(!/id="mrName"|id="mrGender"|id="mrOffice"/.test(html), "no profile fields on the manual form");
  assert.ok(html.includes("/functions/v1/admin-create-participants"));
});

test("service-role key is never shipped to the browser", () => {
  const all = ["account.js", "admin.html", "login.html", "profile.html", "index.html", "assessment/index.html", "representative/index.html"]
    .map(read).join("\n");
  assert.ok(!/service_role|SERVICE_ROLE|sb_secret_/i.test(all), "no secret key in client files");
});

test("SQL behaviour tests (needs a local Postgres; skipped if none)", (t) => {
  const host = process.env.MUNI_PG_HOST || "/var/tmp/pgtest";
  const port = process.env.MUNI_PG_PORT || "5433";
  const reachable = spawnSync("psql", ["-h", host, "-p", port, "-U", "postgres", "-tAc", "select 1"], { encoding: "utf8" });
  if (reachable.status !== 0) return t.skip(`no Postgres at ${host}:${port}`);
  const run = spawnSync(path.join(ROOT, "tests/db/run-sql-tests.sh"), [host, port, "postgres"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /SQL tests passed/);
});
