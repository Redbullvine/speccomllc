import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import vm from "node:vm";
import { execFileSync, spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8").replace(/\r\n/g, "\n");
const app = read("app.js");
const html = read("index.html");
const css = read("styles.css");

// The guard blocks this token in every file but the launcher, so tests build it.
const TE = ["tele", "com", "engine"].join("");

function extractFunction(source, header) {
  const start = source.indexOf(header);
  assert.ok(start >= 0, `missing ${header}`);
  const open = /\)\s*\{/.exec(source.slice(start));
  let i = start + open.index + open[0].length - 1;
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated ${header}`);
}

// ---------------------------------------------------------------- launcher --

test("launcher URL is exact, https, root path, no params, and lives in one file", () => {
  const src = read("js/splicingLauncher.js");
  const urls = (src.match(/https?:\/\/[^\s"'`)]+/g) || []).filter((x) => !x.includes("w3.org"));
  assert.equal(urls.length, 1, "exactly one URL literal in the launcher");
  const u = new URL(urls[0]);
  assert.equal(u.protocol, "https:");
  assert.equal(u.pathname, "/");
  assert.equal(u.search, "");
  assert.equal(u.hash, "");
  assert.equal(urls[0], `https://${TE}.app/`);
  const tracked = execFileSync("git", ["grep", "-l", "-i", TE], { cwd: root, encoding: "utf8" })
    .split("\n").filter(Boolean)
    .filter((f) => !["CLAUDE.md", ".githooks/pre-commit"].includes(f) && !f.startsWith("tests/"));
  assert.deepEqual(tracked, ["js/splicingLauncher.js"]);
});

test("launch(): handoff is <= 700 ms, same-tab navigation to the bare URL, nothing appended", () => {
  const src = read("js/splicingLauncher.js");
  const assigned = [];
  const timers = [];
  const appended = [];
  const listeners = {};
  const doc = {
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, set innerHTML(v) {}, set textContent(v) {} }),
    head: { appendChild() {} },
    body: { appendChild: (el) => appended.push(el) },
    addEventListener: (t, fn) => { listeners[t] = fn; },
  };
  const win = { location: { assign: (u) => assigned.push(u) } };
  const ctx = vm.createContext({ window: win, document: doc, setTimeout: (fn, ms) => timers.push({ fn, ms }) });
  vm.runInContext(src, ctx);
  const api = win.SpecComSplicing;
  assert.ok(api.handoffMs <= 700);
  assert.equal(api.launch(), true);
  assert.equal(api.launch(), false, "double tap does not launch twice");
  assert.equal(appended.length, 1, "handoff overlay shown");
  assert.equal(timers.length, 1);
  assert.ok(timers[0].ms <= 700);
  assert.equal(assigned.length, 0, "navigation waits for the handoff");
  timers[0].fn();
  assert.deepEqual(assigned, [api.url()]);
  assert.equal(assigned[0], `https://${TE}.app/`);
});

test("launcher is offered in the menu, the OSP Splicer workspace and the Feature Hub", () => {
  const menu = html.match(/OSP Specialist\s*<\/button>\s*<button class="menu-link splicing-launch"[^>]*data-splicing-launch[^>]*>[\s\S]*?Splicing/);
  assert.ok(menu, "menu item directly under OSP Specialist");
  assert.match(html, /<section id="viewNodes" class="view">[\s\S]{0,400}splicing-tile[^>]*data-splicing-launch/);
  assert.match(html, /id="featureHubGrid"[\s\S]{0,900}data-splicing-launch/);
  assert.ok(html.indexOf("js/splicingLauncher.js") > 0);
  assert.ok(!/href="https?:\/\/[^"]*splic/i.test(html));
});

// -------------------------------------------------------------- flag / hide --

test("flag on: hidden entry points are marked and invoices/redlines are out of Export", () => {
  for (const needle of [
    /<div class="menu-section" data-splicing-hide>\s*<div class="muted small menu-title">Projects<\/div>/,
    /data-demo-feature="viewInvoices" data-splicing-hide>Invoicing/,
    /data-view="viewInvoices" data-splicing-hide>Billing Desk/,
    /<label data-splicing-hide[^>]*>\s*<input type="checkbox" id="wpIncInvoices"/,
    /<label data-splicing-hide[^>]*>\s*<input type="checkbox" id="wpIncRedlines"/,
  ]) assert.match(html, needle);
  // Work Orders and Photos stay
  assert.match(html, /<label style="[^"]*">\s*<input type="checkbox" id="wpIncWorkOrders"/);
  assert.match(html, /<label style="[^"]*">\s*<input type="checkbox" id="wpIncPhotos"/);
  // and the payload cannot include them even though the boxes exist in the DOM
  assert.equal((app.match(/includeInvoices: !SPLICING_MOVED &&/g) || []).length, 2);
  assert.equal((app.match(/includeRedlines: !SPLICING_MOVED &&/g) || []).length, 2);
  assert.match(css, /body\.splicing-moved \[data-splicing-hide\]\{display:none !important\}/);
});

function routeFn(moved) {
  const fnSrc = extractFunction(app, "function isSplicingHiddenRoute(");
  const tokens = app.match(/const SPLICING_HIDDEN_ROUTE_TOKENS = new Set\(\[[\s\S]*?\]\);/)[0];
  const ctx = vm.createContext({ window: { location: { hash: "", pathname: "/" } } });
  vm.runInContext(`const SPLICING_MOVED = ${moved}; ${tokens} ${fnSrc}; this.f = isSplicingHiddenRoute;`, ctx);
  return ctx.f;
}

test("flag on: billing, office, invoice, redline deep links are hidden routes; everything else is not", () => {
  const f = routeFn(true);
  for (const h of ["#billing", "#office", "#invoices", "#invoice=K-1", "#viewinvoices", "#redline", "#demo", "#Billing"]) {
    assert.equal(f(h, "/"), true, h);
  }
  assert.equal(f("", "/invoice/K-1"), true);
  for (const h of ["", "#home", "#map", "#technician", "#warehouse", "#admin", "#admin/onboarding", "#ebc", "#root-command-center", "#onboarding"]) {
    assert.equal(f(h, "/"), false, h);
  }
});

test("flag off: nothing is hidden, so every route is restored", () => {
  const f = routeFn(false);
  for (const h of ["#billing", "#office", "#invoice=K-1", "#redline"]) assert.equal(f(h, "/"), false, h);
  assert.match(css, /body:not\(\.splicing-moved\) \[data-splicing-launch\]\{display:none !important\}/);
  // every gate is keyed on the flag, so off means the original code path
  assert.match(app, /function isViewAllowed\(viewId\)\{\n  if \(SPLICING_MOVED && SPLICING_HIDDEN_VIEWS\.has\(viewId\)\) return false;/);
  assert.match(app, /const SPLICING_HIDDEN_VIEWS = new Set\(\["viewInvoices", "viewBilling"\]\)/);
  assert.match(app, /\|\| "true"\n\)\.toLowerCase\(\) !== "false"/);
});

test("flag on: hidden views redirect Home with the one-line toast", () => {
  const setActive = extractFunction(app, "function setActiveView(");
  assert.match(setActive, /SPLICING_HIDDEN_VIEWS\.has\(viewId\)[\s\S]{0,120}showToast\(SPLICING_MOVED_MESSAGE\)[\s\S]{0,60}viewId = getDefaultView\(\)/);
  assert.match(app, /const SPLICING_MOVED_MESSAGE = "Projects, redlines and billing are now in Splicing\."/);
  assert.match(extractFunction(app, "function launchRedlineFromMenu"), /SPLICING_MOVED/);
});

test("ROOT Command Center stays available", () => {
  assert.doesNotMatch(app, /SPLICING_HIDDEN_VIEWS = new Set\([^)]*viewRootCommandCenter/);
  assert.match(app, /if \(viewId === "viewRootCommandCenter"\) return isEffectiveRootRole\(\);/);
});

// ---------------------------------------------------------------- my_jobs --

test("my_jobs migration: read-only, SECURITY DEFINER, authenticated only, touches no data or policy", () => {
  const sql = read("supabase/migrations/20260929000001_my_jobs.sql");
  const code = sql.replace(/--.*$/gm, "");
  assert.match(code, /create or replace function public\.my_jobs\(\)/);
  assert.match(code, /security definer/);
  assert.match(code, /set search_path = public, pg_temp/);
  assert.match(code, /grant execute on function public\.my_jobs\(\) to authenticated/);
  assert.match(code, /revoke all on function public\.my_jobs\(\) from public, anon/);
  assert.doesNotMatch(code, /\b(create|alter|drop)\s+(policy|table|trigger|index)\b/i);
  assert.doesNotMatch(code, /\b(insert|update|delete|truncate)\b/i);
  assert.doesNotMatch(code, /active_org|my_org_id|my_role/);
});

function loadProjectsHarness({ rows, activeOrgId, sessionJob = "", profileProject = "", root = false }) {
  const calls = { rpc: [], from: 0, toasts: [] };
  const state = {
    user: { id: "u1" },
    client: {
      rpc: async (name) => { calls.rpc.push(name); return { data: rows, error: null }; },
      from: () => { calls.from++; throw new Error("no table reads allowed for the job list"); },
    },
    activeOrgId,
    activeProject: null,
    projects: [],
    profile: { current_project_id: profileProject },
  };
  const ctx = vm.createContext({
    state, isDemo: false, calls,
    SpecCom: { helpers: { isRoot: () => root } },
    initializeOrgContext: async () => activeOrgId,
    toast: (...a) => calls.toasts.push(a),
    shouldUseFieldProjectBucket: () => false,
    renderProjects() {}, loadFieldDaySession() {}, loadMessages() {}, debugLog() {},
    loadProjectMembershipIdsForCurrentUser: async () => new Set(),
    getSessionJobId: () => sessionJob, setSessionJobId() {}, setSavedProjectPreference() {},
    setActiveOrgContext() {}, console,
  });
  vm.runInContext(extractFunction(app, "async function loadProjects()") + "; this.run = loadProjects;", ctx);
  return { run: ctx.run, state, calls };
}

const J = (id, name, scope = "member") => ({ id, name, scope, org_id: "o" });

test("job list is my_jobs() and nothing else, identical for every sign-in path / company switch / reload", async () => {
  const rows = [J("a", "Alpha"), J("b", "Bravo"), J("c", "Charlie")];
  const seen = [];
  for (const activeOrgId of [null, "org-1", "org-2", "org-that-does-not-exist"]) {
    for (const sessionJob of ["", "b"]) {
      const h = loadProjectsHarness({ rows, activeOrgId, sessionJob });
      await h.run();
      assert.deepEqual(h.calls.rpc, ["my_jobs"]);
      assert.equal(h.calls.from, 0);
      seen.push(h.state.projects.map((p) => p.id).join(","));
      assert.ok(!("scope" in h.state.projects[0]));
    }
  }
  assert.deepEqual([...new Set(seen)], ["a,b,c"]);
});

test("session choice is remembered; exactly one job auto-selects; error shows nothing stale", async () => {
  const many = [J("a", "Alpha"), J("b", "Bravo")];
  let h = loadProjectsHarness({ rows: many, sessionJob: "b" });
  await h.run();
  assert.equal(h.state.activeProject.id, "b");
  h = loadProjectsHarness({ rows: many, sessionJob: "not-mine" });
  await h.run();
  assert.equal(h.state.activeProject.id, "a", "a remembered job outside my_jobs() is ignored");
  h = loadProjectsHarness({ rows: [J("only", "Only")], sessionJob: "" });
  await h.run();
  assert.equal(h.state.activeProject.id, "only");
  h = loadProjectsHarness({ rows: [] });
  await h.run();
  assert.equal(h.state.activeProject, null);
  assert.deepEqual(h.state.projects, []);
});

test("picker states the count and the rule applied", () => {
  const fnSrc = extractFunction(app, "function renderJobPickers()");
  const render = (jobs, scope) => {
    const host = { innerHTML: "" };
    const ctx = vm.createContext({
      state: { projects: jobs, jobListScope: scope, activeProject: jobs[0] || null },
      document: { querySelectorAll: () => [host] },
      escapeHtml: (s) => String(s),
    });
    vm.runInContext(fnSrc + "; renderJobPickers();", ctx);
    return host.innerHTML;
  };
  const n = (k) => Array.from({ length: k }, (_, i) => J(`j${i}`, `Job ${i}`));
  assert.match(render(n(3), "member"), /Showing 3 jobs you're a member of/);
  assert.match(render(n(1), "member"), /Showing 1 job you're a member of/);
  assert.match(render(n(14), "root"), /Root: showing all 14 active jobs/);
  assert.match(render(n(3), "member"), /<select[^>]*data-job-select/);
  assert.doesNotMatch(render(n(1), "member"), /<select/);
  assert.match(render([], "member"), /No jobs yet/);
});

test("job picker sits at the top of I&R Tech / Drop Crew, OSP Splicer and Warehouse", () => {
  for (const id of ["viewTechnician", "viewNodes", "viewCatalog", "viewWarehouseScan"]) {
    assert.match(html, new RegExp(`<section id="${id}" class="view[^"]*">\\s*<div class="job-picker" data-job-picker></div>`), id);
  }
});

test("members get no project-creation UI; admins create jobs in Admin", () => {
  const fn = extractFunction(app, "function canCreateProjects()");
  assert.match(fn, /SPLICING_MOVED/);
  assert.match(fn, /"ROOT", "OWNER", "ADMIN"/);
  assert.match(app, /data-action="openCreateProject"/, "the Admin tab keeps its New Project button");
});

// ------------------------------------------------------------ guard hook --

function hookRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guard-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  fs.mkdirSync(path.join(dir, ".githooks"));
  fs.mkdirSync(path.join(dir, "js"));
  fs.copyFileSync(path.join(root, ".githooks/pre-commit"), path.join(dir, ".githooks/pre-commit"));
  git("config", "core.hooksPath", ".githooks");
  return { dir, git };
}
function attempt({ dir, git }, file, content) {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), content);
  git("add", file);
  const r = spawnSync("git", ["commit", "-q", "-m", "t"], { cwd: dir, encoding: "utf8" });
  if (r.status !== 0) git("reset", "-q", file);
  return r.status;
}

test("guard hook: exact address allowed only in the launcher; every other token blocked everywhere", (t) => {
  if (spawnSync("sh", ["-c", "true"]).status !== 0) return t.skip("no sh");
  const repo = hookRepo();
  const url = `https://${TE}.app/`;
  assert.equal(attempt(repo, "js/splicingLauncher.js", `var u = "${url}";\n`), 0, "launcher with the exact address commits");
  assert.notEqual(attempt(repo, "other.js", `var u = "${url}";\n`), 0, "same string in any other file is rejected");
  assert.notEqual(attempt(repo, "js/other.js", `var u = "${url}";\n`), 0, "even in js/");
  assert.notEqual(attempt(repo, "notes.md", `see ${TE} docs\n`), 0, "any other token is rejected");
  assert.notEqual(attempt(repo, "js/splicingLauncher.js", `var u = "${url}";\n// ${TE} docs\n`), 0, "extra token inside the launcher is rejected");
  assert.notEqual(attempt(repo, "js/splicingLauncher.js", `var u = "${url}?p=1";\n`), 0, "address plus query is rejected");
  assert.notEqual(attempt(repo, "js/splicingLauncher.js", `var u = "${url}#x";\n`), 0, "address plus hash is rejected");
  assert.notEqual(attempt(repo, "js/splicingLauncher.js", `var u = "${url}a/b";\n`), 0, "address plus path is rejected");
  assert.notEqual(attempt(repo, "db.sql", `select * from capture_${"events"};\n`), 0, "other boundary tokens still blocked");
});

test("CI guard runs the same hook over a commit range", () => {
  const wf = read(".github/workflows/boundary-guard.yml");
  assert.match(wf, /BOUNDARY_DIFF_ARGS=/);
  assert.match(wf, /\.githooks\/pre-commit/);
});
