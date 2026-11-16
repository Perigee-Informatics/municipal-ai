// public/workshop/course-outline.js (objectives and sessions for the training report) must match the
// course materials it is built from. If this fails: node tests/workshop/build-course-outline.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildOutline, outlineFile } from "./build-course-outline.mjs";

test("course-outline.js is up to date with the course materials", () => {
  const onDisk = readFileSync(new URL("../../public/workshop/course-outline.js", import.meta.url), "utf8");
  assert.equal(onDisk, outlineFile(), "run: node tests/workshop/build-course-outline.mjs");
});
test("both courses have objectives and every session", () => {
  const o = buildOutline();
  assert.equal(o.employee.sessions.length, 11); assert.equal(o.representative.sessions.length, 8);
  for (const k of ["employee", "representative"]) {
    assert.ok(o[k].main.length > 40, k + " main objective"); assert.ok(o[k].objectives.length >= 5, k + " objectives");
    o[k].sessions.forEach((s) => assert.ok(s.title && s.start && (s.content || s.objective), k + " session " + s.n));
  }
});
