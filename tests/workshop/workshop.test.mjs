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
  "assessment/index.html", "representative/index.html", "cso/index.html", "event.html",
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
  for (const f of ["account.js", "event-info.js", "assessment/pool-employee.js", "assessment/pool-representative.js", "assessment/pool-cso.js"]) {
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
    assert.ok(q.q, `q${q.id} has its question`);
    // The answer key stays in the database (question_keys, trainer only): never in the public file.
    assert.ok(!("a" in q) && !("e" in q), `q${q.id} carries no correct answer or explanation`);
  }
  return pool;
}

test("representative pool: 50 questions, ids 101-150, 10/25/15, no answer keys", () => {
  const ctx = load("assessment/pool-representative.js");
  checkPool(Array.from(ctx.POOL_REPRESENTATIVE), 101, 150);
});

test("employee pool: 50 questions, ids 1-50, 10/25/15, no answer keys", () => {
  const ctx = load("assessment/pool-employee.js");
  checkPool(Array.from(ctx.POOL_EMPLOYEE), 1, 50);
});

test("no other public file carries test answers", () => {
  for (const f of ["assessment/questions-pre.js", "assessment/questions-post.js"]) assert.ok(!fs.existsSync(new URL("../../public/workshop/" + f, import.meta.url)), f + " removed");
  const page = read("assessment/index.html");
  assert.ok(!/[{,]a:\s*\d,/.test(page.replace(/<script id="sv-src">[\s\S]*?<\/script>/, "")), "the test page has no inline answer keys");
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

test("AI for CSOs pool: 10 questions, ids 201-210, no answer keys; every event uses all of them", () => {
  const ctx = load("assessment/pool-cso.js");
  const pool = Array.from(ctx.POOL_CSO);
  assert.deepEqual(pool.map((q) => q.id).sort((a, b) => a - b), Array.from({ length: 10 }, (_, i) => 201 + i));
  for (const q of pool) {
    assert.equal(q.o.length, 4, `q${q.id} has 4 options`);
    assert.ok([0, 1, 2, 3, 4, 5].includes(q.s) && [1, 2, 3].includes(q.c), `q${q.id} topic and complexity`);
    assert.ok(!("a" in q) && !("e" in q), `q${q.id} carries no correct answer or explanation`);
  }
  const emp = load("assessment/pool-employee.js"), rep = load("assessment/pool-representative.js");
  const others = new Set([...Array.from(emp.POOL_EMPLOYEE, (q) => q.id), ...Array.from(rep.POOL_REPRESENTATIVE, (q) => q.id)]);
  for (const q of pool) assert.ok(!others.has(q.id), `id ${q.id} unique across pools`);
  for (let run = 0; run < 50; run++) {
    const ids = Array.from(ctx.pickCsoSet());
    assert.deepEqual(ids.slice().sort((a, b) => a - b), Array.from({ length: 10 }, (_, i) => 201 + i));
  }
});

test("event-info.js: a cso package is its own course, page and level", () => {
  const ctx = load("event-info.js", { location: { search: "", origin: "https://x.test", pathname: "/" }, URLSearchParams });
  const EVI = ctx.window.EVI;
  assert.equal(EVI.courseOf("cso"), "cso");
  assert.equal(EVI.courseOf("representative-municipal"), "representative");
  assert.equal(EVI.courseOf("employee-rural"), "employee");
  assert.equal(EVI.levelOf("cso"), "cso");
  assert.equal(EVI.eventLink("aicso001", "cso"), "https://x.test/workshop/cso/index.html?event=AICSO001");
  assert.equal(EVI.info({ organized_by: "Loo Niva Child Concern Group", event_dates: [] }).org, "Loo Niva Child Concern Group", "an English organiser gets no पालिका");
  assert.equal(EVI.info({ organized_by: "सन्धिखर्क", event_dates: [] }).org, "सन्धिखर्क पालिका");
  assert.equal(EVI.enRange(["2026-11-28"]), "28 November 2026");
  assert.equal(EVI.enRange(["2026-11-29", "2026-11-28"]), "28–29 November 2026");
});

test("account.js exposes the methods the pages call", () => {
  const ctx = load("account.js");
  const WS = ctx.window.WS;
  for (const m of [
    "init", "signUp", "signIn", "signOut", "isTrainer", "isApproved", "materialsAccess",
    "listByStatus", "setStatus", "listPackages", "listEvents", "saveEvent", "updateEvent", "deleteEvent",
    "loadEventForProfile", "saveMyProfile", "submitFeedback", "listAnswers",
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

test("ideal answers never ship in the public pages: every answer place is empty", () => {
  const files = ["index.html", "representative/index.html", "cso/index.html", ...fs.readdirSync(path.join(W, "data")).map((f) => "data/" + f)];
  let places = 0;
  for (const f of files) {
    const text = read(f).replace(/\\"/g, '"');
    for (const m of text.matchAll(/<div class="ans" data-ans="([a-z0-9-]+)">([\s\S]*?)<\/div>/g)) {
      places++;
      assert.equal(m[2].trim(), "", `${f}: answer place ${m[1]} must be empty`);
    }
  }
  assert.ok(places >= 20, `found ${places} answer places`);
});

test("service-role key is never shipped to the browser", () => {
  const all = ["account.js", "admin.html", "login.html", "profile.html", "index.html", "assessment/index.html", "representative/index.html", "cso/index.html", "assessment/pool-cso.js"]
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
