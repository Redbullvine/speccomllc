// Local-only browser QA: production markup/functions with an in-memory backend.
// Run: node tests/onboarding-browser-fixture.mjs [https://speccomllc-app.netlify.app]
// No requests, signatures, or uploads are sent to Supabase.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const source = process.argv[2];
async function asset(name){
  if (source){
    const response = await fetch(new URL(name, source));
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    return response.text();
  }
  return readFile(new URL(`../${name}`, import.meta.url), "utf8");
}
const [app, html, css] = await Promise.all([asset("app.js"), asset("index.html"), asset("styles.css")]);
const section = html.slice(html.indexOf('<section id="viewOnboarding"'), html.indexOf('<section id="viewTechnician"'));
const constants = app.slice(app.indexOf("const SUBCONTRACTOR_DOCUMENTS_BUCKET"), app.indexOf("const KMZ_SNAPSHOT_TABLE"));
const functions = app.slice(app.indexOf("function getOnboardingStatus()"), app.indexOf("function groupOnboardingRowsByUser"));
const bindings = app.slice(app.indexOf('  const onboardingView = $("viewOnboarding");', app.indexOf("function wireUI")), app.indexOf("  syncDispatchStatusFilter();", app.indexOf("function wireUI")));
const setup = `
const $ = (id) => document.getElementById(id);
const setText = (id, text) => { $(id).textContent = text; };
const escapeHtml = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const getProfileDisplayName = () => 'QA Test';
const isDemo = false;
const isSubcontractorRole = () => false;
const toast = (title, message) => { $('qaResult').textContent = title + ': ' + message; };
const db = JSON.parse(sessionStorage.getItem('onboarding-qa') || 'null') || {
  subcontractor_profiles: null, subcontractor_documents: [], subcontractor_agreements: []
};
const persist = () => sessionStorage.setItem('onboarding-qa', JSON.stringify(db));
const state = { user: { id: 'qa-only', email: 'qa@example.test' }, onboarding: {
  profile: null, documents: [], agreements: [], activeAgreementType: 'subcontractor_agreement'
} };
state.client = {
  from(table){ return {
    select(){ return this; }, eq(){ return this; },
    async maybeSingle(){ return {data: db[table]}; },
    async order(){ return {data: db[table]}; },
    upsert(payload){ this.payload = payload; return this; },
    async single(){ db[table] = {...db[table], ...this.payload}; persist(); return {data: db[table]}; },
    async insert(payload){ db[table].push({...payload, id: crypto.randomUUID(), uploaded_at: new Date().toISOString(), signed_at: new Date().toISOString()}); persist(); return {}; }
  }; },
  storage: {from: () => ({upload: async () => ({}), createSignedUrl: async () => ({data: {signedUrl: 'about:blank'}})})},
  rpc: async () => ({data: {ok: true}})
};
`;
const controls = `
$('qaFill').onclick = async () => {
  Object.entries({subFullName:'QA Test', subPhone:'5550100', subEmail:'qa@example.test', subAddress1:'1 Test Street', subCity:'Test', subState:'NM', subZip:'00000', subEmergencyName:'QA Contact', subEmergencyPhone:'5550101'}).forEach(([id,value]) => {$(id).value = value; $(id).dispatchEvent(new Event('input', {bubbles:true}));});
  await saveSubcontractorDraft();
};
$('qaUpload').onclick = async () => {
  for(const type of ['w9','driver_license','insurance_coi','workers_comp']) await uploadSubcontractorDocument(type, new File(['QA only'], 'qa.pdf', {type:'application/pdf'}));
};
$('qaTouch').onclick = () => {
  const results = [];
  for (const key of ['profile','emergency','w9','driver_license','insurance_coi','workers_comp','subcontractor_agreement','bucket_truck_agreement','rate_sheet_acknowledgment','safety_acknowledgment']){
    const card = document.querySelector('[data-item-key="'+key+'"]');
    card.dispatchEvent(new Event('touchstart', {bubbles:true}));
    card.dispatchEvent(new Event('touchend', {bubbles:true}));
    card.click();
    const expected = key === 'profile' ? 'subFullName' : key === 'emergency' ? 'subEmergencyName' : ['w9','driver_license','insurance_coi','workers_comp'].includes(key) ? 'onboardingUpload-'+key : 'onboardingAgreementContent';
    results.push(key+': '+(document.activeElement.id === expected ? 'PASS' : 'FAIL'));
  }
  $('qaResult').textContent = 'Synthetic touch + click checks: '+results.join(', ');
};
loadSubcontractorOnboarding();
`;
const page = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Onboarding isolated QA</title><style>${css}</style><style>body{display:block;overflow:auto}#viewOnboarding{display:block!important}.qa{padding:16px;background:#fff;color:#111}.qa button{margin:6px;padding:10px}#qaResult{overflow-wrap:anywhere}</style></head><body><aside class="qa"><strong>Isolated QA — simulated records only. Source: ${source || "local working tree"}</strong><div><button id="qaFill">Save test profile and emergency contact</button><button id="qaUpload">Test four upload completions</button><button id="qaTouch">Run synthetic touch checks</button></div><p id="qaResult" role="status">Ready</p></aside>${section}<script>${setup}\n${constants}\n${functions}\n${bindings}\n${controls}</script></body></html>`;
createServer((req, res) => { res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"}); res.end(page); }).listen(4175, "127.0.0.1", () => console.log(`Onboarding QA at http://127.0.0.1:4175 (${source || 'local'})`));
