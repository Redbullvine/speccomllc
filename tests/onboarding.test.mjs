import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const fields = ["subFullName", "subCompanyName", "subPhone", "subEmail", "subAddress1", "subAddress2", "subCity", "subState", "subZip", "subEmergencyName", "subEmergencyPhone"];
const docTypes = ["w9", "driver_license", "insurance_coi", "workers_comp"];
const agreementTypes = ["subcontractor_agreement", "bucket_truck_agreement", "rate_sheet_acknowledgment", "safety_acknowledgment"];

function fixture(){
  const elements = new Map();
  const db = { subcontractor_profiles: null, subcontractor_documents: [], subcontractor_agreements: [] };
  const uploads = [];
  const notices = [];
  const document = { activeElement: null, createElement: () => element("canvas") };
  const context2d = new Proxy({}, { get: (_, key) => key === "getImageData" ? () => ({ pixels: "draft" }) : () => {} });
  function element(id){
    if (!elements.has(id)) elements.set(id, {
      id, value: "", checked: false, dataset: {}, style: {}, innerHTML: "", textContent: "",
      width: 720, height: 220,
      focus(){ document.activeElement = this; },
      scrollIntoView(){ this.scrolled = true; },
      getContext: () => context2d,
      toDataURL: () => "data:image/png;base64,dGVzdA==",
      addEventListener(){},
      querySelectorAll: () => fields.map(element),
    });
    return elements.get(id);
  }
  const state = { user: { id: "test-user", email: "qa@example.test" }, onboarding: {
    profile: null, documents: [], agreements: [], activeAgreementType: agreementTypes[0], signatureDirty: false,
  } };
  let failure = null;
  state.client = {
    from(table){
      const query = {
        select(){ return this; }, eq(){ return this; },
        async maybeSingle(){ return { data: db[table] }; },
        async order(){ return { data: db[table] }; },
        upsert(payload){ this.payload = payload; return this; },
        async single(){
          if (failure) return { error: { message: failure } };
          db[table] = { ...db[table], ...this.payload };
          return { data: db[table] };
        },
        async insert(payload){
          if (failure) return { error: { message: failure } };
          db[table].push({ ...payload, id: `row-${db[table].length}`, uploaded_at: new Date().toISOString(), signed_at: new Date().toISOString() });
          return {};
        },
      };
      return query;
    },
    storage: { from: () => ({ async upload(path, file, options){
      if (failure) return { error: { message: failure } };
      uploads.push({ path, file, options }); return {};
    } }) },
  };
  const context = vm.createContext({ state, document, navigator: { userAgent: "test" },
    $: element, setText: (id, value) => { element(id).textContent = value; },
    escapeHtml: (text) => String(text).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    getProfileDisplayName: () => "QA Tester", isSubcontractorRole: () => false, isDemo: false,
    toast: (...args) => notices.push(args), window: {},
  });
  vm.runInContext(app.slice(app.indexOf('const SUBCONTRACTOR_DOCUMENTS_BUCKET'), app.indexOf('const KMZ_SNAPSHOT_TABLE')), context);
  vm.runInContext(app.slice(app.indexOf('function getOnboardingStatus()'), app.indexOf('function groupOnboardingRowsByUser')), context);
  return { context, element, state, db, uploads, notices, document, fail: (message) => { failure = message; } };
}

test("all ten cards are enabled native buttons and navigate even when complete", () => {
  const f = fixture();
  f.context.renderSubcontractorOnboarding();
  const markup = f.element("onboardingChecklist").innerHTML;
  assert.equal((markup.match(/<button /g) || []).length, 10);
  assert.equal((markup.match(/type="button"/g) || []).length, 10);
  assert.doesNotMatch(markup, /disabled/);
  for (const key of ["profile", "emergency", ...docTypes, ...agreementTypes]){
    f.context.handleOnboardingAction("navigateItem", { dataset: { itemKey: key } });
    const expected = key === "profile" ? "subFullName" : key === "emergency" ? "subEmergencyName"
      : docTypes.includes(key) ? `onboardingUpload-${key}` : "onboardingAgreementContent";
    assert.equal(f.document.activeElement.id, expected, key);
    if (agreementTypes.includes(key)) assert.equal(f.state.onboarding.activeAgreementType, key);
  }
});

test("profile and emergency completion update separately after saving, and survive reload", async () => {
  const f = fixture();
  for (const id of fields.slice(0, 9)) f.element(id).value = "Test";
  await f.context.saveSubcontractorDraft();
  assert.equal(f.context.computeOnboardingChecklist()[0].complete, true);
  assert.equal(f.context.computeOnboardingChecklist()[1].complete, false);
  f.element("subEmergencyName").value = "Test Contact";
  f.element("subEmergencyPhone").value = "5550100";
  await f.context.saveSubcontractorDraft();
  await f.context.loadSubcontractorOnboarding();
  assert.equal(f.context.computeOnboardingChecklist()[1].complete, true);
  assert.equal(f.db.subcontractor_profiles.emergency_contact_name, "Test Contact");
});

test("all four uploads update status, retain prior files, and rejected latest upload needs correction", async () => {
  const f = fixture();
  for (const type of docTypes){
    await f.context.uploadSubcontractorDocument(type, { name: `${type}.pdf`, type: "application/pdf" });
    assert.equal(f.context.computeOnboardingChecklist().find((item) => item.key === type).complete, true);
  }
  assert.equal(f.uploads.length, 4);
  assert.ok(f.uploads.every((upload) => upload.options.upsert === false));
  const original = f.db.subcontractor_documents[0];
  f.db.subcontractor_documents.push({ ...original, id: "rejected", status: "rejected", uploaded_at: "2099-01-01" });
  await f.context.loadSubcontractorOnboarding();
  assert.equal(f.context.isDocumentComplete("w9"), false);
  assert.equal(f.db.subcontractor_documents[0], original);
});

test("all four agreements require consent and signature, persist, and remain navigable", async () => {
  const f = fixture();
  for (const type of agreementTypes){
    f.context.selectOnboardingAgreement(type);
    await f.context.saveSubcontractorAgreement();
    assert.equal(f.context.isAgreementComplete(type), false);
    f.element("onboardingSignatureConsent").checked = true;
    await f.context.saveSubcontractorAgreement();
    assert.equal(f.context.isAgreementComplete(type), false);
    f.element("onboardingTypedSignature").checked = true;
    await f.context.saveSubcontractorAgreement();
    assert.equal(f.context.isAgreementComplete(type), true);
    f.context.navigateOnboardingItem(type);
    assert.equal(f.document.activeElement.id, "onboardingAgreementContent");
    assert.match(f.element("onboardingAgreementReceipt").textContent, /Saved on file/);
  }
  assert.equal(f.db.subcontractor_agreements.length, 4);
  assert.ok(f.db.subcontractor_agreements.every((row) => row.signature_data.startsWith("data:image/png")));
});

test("navigation and uploads preserve unsaved profile fields and separate signature drafts", async () => {
  const f = fixture();
  f.context.renderSubcontractorOnboarding();
  f.element("subFullName").value = "Unsaved Name";
  f.element("subFullName").dataset.onboardingDirty = "true";
  f.element("onboardingSignerName").value = "Draft Signer";
  f.element("onboardingSignatureConsent").checked = true;
  f.state.onboarding.signatureDirty = true;
  f.context.selectOnboardingAgreement("bucket_truck_agreement");
  assert.equal(f.element("onboardingSignatureConsent").checked, false);
  assert.equal(f.state.onboarding.signatureDirty, false);
  await f.context.uploadSubcontractorDocument("w9", { name: "test.pdf" });
  assert.equal(f.element("subFullName").value, "Unsaved Name");
  f.context.selectOnboardingAgreement("subcontractor_agreement");
  assert.equal(f.element("onboardingSignerName").value, "Draft Signer");
  assert.equal(f.element("onboardingSignatureConsent").checked, true);
  assert.equal(f.state.onboarding.signatureDirty, true);
});

test("failed writes do not mark items complete or discard draft answers", async () => {
  const f = fixture();
  f.context.renderSubcontractorOnboarding();
  f.fail("Offline");
  f.element("subEmergencyName").value = "Keep me";
  assert.equal(await f.context.saveSubcontractorDraft(), false);
  assert.equal(f.element("subEmergencyName").value, "Keep me");
  await f.context.uploadSubcontractorDocument("w9", { name: "test.pdf" });
  f.element("onboardingSignatureConsent").checked = true;
  f.element("onboardingTypedSignature").checked = true;
  await f.context.saveSubcontractorAgreement();
  assert.equal(f.context.computeOnboardingChecklist().filter((item) => item.complete).length, 0);
  assert.equal(f.element("onboardingSignatureConsent").checked, true);
});

test("review panel stays in document flow; focusable document and emergency form exist", () => {
  assert.match(css, /\.onboarding-submit-bar\s*\{\s*position: static;/);
  assert.match(html, /id="onboardingAgreementContent"[^>]*tabindex="-1"/);
  assert.match(html, /<fieldset id="onboardingEmergencyContact"/);
  assert.match(html, /id="btnOnboardingSaveDraft"[^>]*type="submit"/);
});
