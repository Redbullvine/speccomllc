import { APP_MODE, hasSupabaseConfig, makeClient, refreshConfig } from "./supabaseClient.js";

const isDebug = new URLSearchParams(location.search).has("debug");
const dlog = (...args) => { if (isDebug) console.log(...args); };

const $ = (id) => document.getElementById(id);
window.SpecCom = window.SpecCom || {};
const SpecCom = window.SpecCom;
SpecCom.helpers = SpecCom.helpers || {};
let supabase = null;
let appMode = "real";
let isDemo = false;

const supabaseReady = (async () => {
  await loadRuntimeEnv();
  refreshConfig();
  appMode = APP_MODE;
  isDemo = APP_MODE === "demo";

  const client = await makeClient();
  if (!client) {
    dlog("[config] missing Supabase env");
    return null;
  }

  supabase = client;
  return client;
})();

const ROLES = {
  ROOT: "ROOT",
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  USER_LEVEL_1: "USER_LEVEL_1",
  USER_LEVEL_2: "USER_LEVEL_2",
  SUPPORT: "SUPPORT",
};

// --- Backward-compat role helpers (prevents runtime crashes from old code) ---
const LEGACY_ROLE_MAP = {
  TECHNICIAN: ROLES.USER_LEVEL_1,
  SUB: ROLES.USER_LEVEL_1,
  SPLICER: ROLES.USER_LEVEL_2,
  PRIME: ROLES.PROJECT_MANAGER,
  TDS: ROLES.ADMIN,
};

function getRoleValue(x){
  if (!x) return null;
  if (typeof x === "string") return x;
  if (typeof x === "object" && x.role) return x.role;
  return null;
}

const ROLE_LABELS = {
  [ROLES.ROOT]: "Root",
  [ROLES.OWNER]: "Owner",
  [ROLES.ADMIN]: "Admin",
  [ROLES.PROJECT_MANAGER]: "Project Manager",
  [ROLES.USER_LEVEL_1]: "User Level 1",
  [ROLES.USER_LEVEL_2]: "User Level 2",
  [ROLES.SUPPORT]: "Support",
};

const ROLE_SET = new Set(Object.values(ROLES));
const APP_ROLE_OPTIONS = [
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.PROJECT_MANAGER,
  ROLES.USER_LEVEL_1,
  ROLES.USER_LEVEL_2,
  ROLES.SUPPORT,
];
const DEFAULT_ROLE = ROLES.USER_LEVEL_1;

const state = {
  client: null,
  session: null,
  user: null,
  profile: null, // {role, display_name}
  activeProject: null,
  activeNode: null,
  activeSite: null,
  projectNodes: [],
  projectSites: [],
  siteMedia: [],
  siteCodes: [],
  siteEntries: [],
  mediaViewer: {
    open: false,
    index: 0,
  },
  orgs: [],
  invoices: [],
  pendingSites: [],
  billingLocations: [],
  billingLocation: null,
  billingInvoice: null,
  billingItems: [],
  invoiceAgent: {
    candidates: [],
    selectedIds: [],
    results: null,
    allowDuplicates: false,
    busy: false,
    siteMap: new Map(),
    importPreview: null,
    billingWindow: null,
  },
  workCodes: [],
  rateCards: [],
  rateCardItems: [],
  locationProofRules: [],
  activeRateCardId: null,
  locationWorkCodes: new Map(),
  nodeProofStatus: null,
  ownerOverrides: [],
  billingStatus: null,
  lastGPS: null,
  lastProof: null,
  lastLocationSentAt: 0,
  lastLocationSent: null,
  cameraStream: null,
  cameraReady: false,
  cameraInvalidated: false,
  cameraStartedAt: null,
  lastVisibilityChangeAt: null,
  usageEvents: [],
  unitTypes: [],
  allowedQuantities: [],
  alerts: [],
  materialCatalog: [],
  projects: [],
  messages: [],
  messageRecipients: [],
  messageIdentityMap: new Map(),
  messageFilter: "board",
  messageMode: "board",
  dpr: {
    reportId: null,
    projectId: null,
    reportDate: null,
    metrics: null,
  },
  adminProfiles: [],
  locationWatchId: null,
  locationPollId: null,
  map: {
    instance: null,
    drawerOpen: true,
    drawerTab: "layers",
    drawerDocked: false,
    drawerWidth: null,
    drawerResizeBound: false,
    uiBound: false,
    basemap: "street",
    basemapLayer: null,
    basemapLayers: {
      street: null,
      satellite: null,
    },
    layerVisibility: {
      boundary: true,
      pins: true,
      spans: true,
      kmz: true,
      photos: false,
    },
    layers: {
      boundary: null,
      pins: null,
      spans: null,
      kmz: null,
      photos: null,
    },
    kmzImportGroups: new Map(),
    kmzGroupVisibility: new Map(),
    kmzLayerCatalog: [],
    markers: new Map(),
    featureMarkerMeta: new Map(),
    selectedFeature: null,
    selectedSet: [],
    selectedIndex: 0,
    selectedTab: "summary",
    highlightLayer: null,
    userNames: new Map(),
    siteCodesBySiteId: new Map(),
    sitePhotosBySiteId: new Map(),
    popupSiteKeys: [],
    popupSiteIndex: 0,
    popupMarker: null,
    popupRequiredCodes: [],
    siteSearchIndex: new Map(),
    searchDebounceId: null,
    searchJumpKey: "",
    panelVisible: true,
    mobileSnap: 60,
    dropPinMode: false,
    pinTargetSiteId: null,
    pendingMarker: null,
    pendingLatLng: null,
    importPreviewMarkers: [],
  },
  pinOverview: {
    open: false,
  },
  technician: {
    timesheet: null,
    events: [],
    activeEvent: null,
    summary: null,
    locationTrail: [],
  },
  workOrders: {
    assigned: [],
    dispatch: [],
    technicians: [],
    editing: null,
    importWarnings: [],
  },
  importPreview: {
    projectId: null,
    rawRows: [],
    rows: [],
    validation: null,
    preview: null,
  },
  testResultsImportRunning: false,
  labor: {
    rows: [],
  },
  mapFilters: {
    activeOnly: true,
    search: "",
  },
  storageUrlCache: new Map(),
  storageAvailable: true,
  storageWarningShown: false,
  messagesEnabled: true,
  messagesDisabledReason: null,
  features: {
    messages: true,
    labor: true,
    dispatch: true,
  },
  realtime: {
    usageChannel: null,
  },
  demo: {
    roles: APP_ROLE_OPTIONS.slice(),
    role: DEFAULT_ROLE,
    seeded: false,
    nodes: {},
    nodesList: [],
    sites: [],
    siteMedia: [],
    siteCodes: [],
    siteEntries: [],
    invoices: [],
    usageEvents: [],
    unitTypes: [],
    allowedQuantities: [],
    alerts: [],
    materialCatalog: [],
    workCodes: [],
    rateCards: [],
    rateCardItems: [],
    locationProofRules: [],
    workOrders: [],
    messages: [],
    dprReports: [],
  },
};

const WORK_ORDER_TYPES = ["INSTALL", "TROUBLE_TICKET", "MAINTENANCE", "SURVEY"];
const WORK_ORDER_STATUSES = ["NEW", "ASSIGNED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "BLOCKED", "COMPLETE", "CANCELED"];

function normalizeRole(role){
  const raw = getRoleValue(role);
  const key = String(raw || "").toUpperCase();
  return LEGACY_ROLE_MAP[key] || (ROLE_SET.has(key) ? key : DEFAULT_ROLE);
}

function getRoleCode(member = state.profile){
  if (member?.role_code) return normalizeRole(member.role_code);
  if (member?.role) return normalizeRole(member.role);
  if (isDemo) return normalizeRole(state.demo.role);
  return DEFAULT_ROLE;
}

function isTechnician(x){
  return normalizeRole(x) === ROLES.USER_LEVEL_1;
}

function isSplicer(x){
  return normalizeRole(x) === ROLES.USER_LEVEL_2;
}

function isPrime(x){
  return normalizeRole(x) === ROLES.PROJECT_MANAGER;
}

function isTds(x){
  return normalizeRole(x) === ROLES.ADMIN;
}

function formatRoleLabel(roleCode){
  const normalized = normalizeRole(roleCode);
  return ROLE_LABELS[normalized] || normalized.replace(/_/g, " ");
}

const I18N = {
  en: {
    brandSubtitle: "Field verification, documentation, and billing control",
    authTitle: "Sign in to SpecCom",
    authSubtitle: "Welcome back.",
    emailPlaceholder: "email",
    passwordPlaceholder: "password",
    signIn: "Sign in",
    magicLink: "Reset password",
    createUser: "Create account",
    authConfigNote: "Sign-in unavailable.",
    rolesTitle: "",
    rolesSubtitle: "",
    liveSetupTitle: "",
    liveSetupSubtitle: "",
    selectProject: "Select project",
    projectsNav: "Projects",
    messagesNav: "Messages",
    mapToggle: "Map",
    mapShow: "Show map",
    mapHide: "Hide map",
    currentProjectLabel: "Current project",
    projectSummaryNone: "No project selected",
    projectsEmpty: "No projects yet. Create a project or ask your admin for access.",
    projectsEmptyTitle: "No projects yet",
    projectsEmptyBody: "Create a project to start tracking sites and documentation, or ask your admin to add you to an existing project.",
    projectsEmptyCta: "Create project",
    createProject: "Create project",
    messagesEmpty: "No messages yet.",
    messagePlaceholder: "Write a message...",
    sendMessage: "Send",
    messagesFilterAll: "Main Board",
    messagesFilterProject: "Main Board",
    messagesFilterDirect: "Direct",
    messagesFilterGlobal: "Main Board",
    messageModeProject: "Main Board",
    messageModeDirect: "Direct message",
    messageModeGlobal: "Main Board",
    messageRecipientPlaceholder: "Select recipient",
    messageDirectTo: "To {name}",
    messageProjectTag: "Board",
    messageDirectTag: "Direct",
    menuTitle: "Menu",
    menuNavTitle: "Navigation",
    menuSettingsTitle: "Settings",
    menuAboutTitle: "About",
    dailyReportTitle: "Daily Report",
    dprProjectLabel: "Project",
    dprDateLabel: "Report date",
    dprRefresh: "Generate / Refresh",
    dprCommentsLabel: "Comments / Needs Addressed",
    dprCommentsPlaceholder: "Anything needs addressed?",
    dprReadOnlyNote: "Read-only access. Ask an Admin or Project Manager to update.",
    dprNoProject: "Select a project to view the report.",
    dprNoMetrics: "Generate a report to see metrics.",
    dprMetricSites: "Sites created today",
    dprMetricSplice: "Splice locations created today",
    dprMetricWorkOrders: "Work orders completed today",
    dprMetricBlocked: "Blocked items today",
    aboutCopy: "SpecCom turns field chaos into a single, intelligent workflow -- accelerating documentation, tightening project coordination, and protecting margins with fewer surprises. The result is less rework, clearer accountability, and faster paths from job done to money in.",
    messagesScopeProject: "Main Board (Org)",
    messagesScopeGlobal: "Main Board (Org)",
    messagesScopeNone: "Main Board (Org)",
    messageSenderYou: "You",
    messageSenderUnknown: "User",
    globalLabel: "Global",
    navDashboard: "Dashboard",
    navTechnician: "Technician",
    navDispatch: "Dispatch",
    navNodes: "Sites",
    navPhotos: "Photos",
    navBilling: "Billing",
    navLabor: "Labor",
    navInvoices: "Invoices",
      navMap: "Sites map",
    navCatalog: "Material Catalog",
    navAlerts: "Alerts",
    navAdmin: "Admin",
    navSettings: "Settings",
    techClockTitle: "Time tracking",
    techClockIn: "Clock In",
    techClockOut: "Clock Out",
    techJobStateLabel: "Current state",
    techStartJob: "Start Job",
    techPauseJob: "Pause Job",
    techLunch: "Lunch",
    techBreak: "Break",
    techTruckInspection: "Truck Inspection",
    techEndJob: "End Job",
    techSummaryTitle: "Daily summary",
    techSummaryTotal: "Total worked",
    techSummaryPaid: "Paid time",
    techSummaryUnpaid: "Unpaid time",
    techSummaryInspections: "Inspections",
    techLocationTrailTitle: "Location trail",
    techNoTimesheet: "Clock in to start tracking today.",
    techClockedInAt: "Clocked in at {time}",
    techClockedOutAt: "Clocked out at {time}",
    techNoEvents: "No events yet.",
    techNoTrail: "Location trail is empty.",
    techStateIdle: "Idle",
    techStateOffClock: "Off clock",
    techWorkOrdersTitle: "Work orders",
    techWorkOrdersSubtitle: "Assigned installs and trouble tickets",
    techTodayTitle: "Today",
    techTomorrowTitle: "Tomorrow",
    woNoOrders: "No work orders.",
    woActionEnRoute: "En Route",
    woActionOnSite: "On Site",
    woActionStart: "Start",
    woActionBlocked: "Blocked",
    woActionComplete: "Complete",
    dispatchTitle: "Dispatch",
    dispatchCreate: "Create work order",
    dispatchImportCsv: "Import CSV",
    dispatchStatusAll: "All statuses",
    dispatchAssignAll: "All",
    dispatchAssignAssigned: "Assigned",
    dispatchAssignUnassigned: "Unassigned",
    dispatchModalTitle: "Work order",
    laborTitle: "Labor",
    laborNoProject: "Select a project to view labor.",
    laborNoRows: "No technician labor logged yet.",
    laborTechLabel: "Technician",
    laborDateLabel: "Work date",
    laborPaidHoursLabel: "Paid hours",
    jobSubtitle: "Ruidoso FTTH Rebuild (site-by-site workflow)",
    photosOptionalBadge: "Photos optional for MVP",
    activeNodeTitle: "Active site",
    kpiNode: "Site",
    kpiCompletion: "Completion",
    kpiUnits: "Units",
    pricingHidden: "Pricing hidden for User Level 1",
    alertsTitle: "Alerts",
    allowedQuantitiesTitle: "Allowed quantities",
    catalogQuickSearchTitle: "Catalog quick search",
    catalogSearchPlaceholder: "Search Millennium part, MFG SKU, description",
    nodesTitle: "Site workspace",
    nodesSubtitle: "Only one ACTIVE site at a time. Finish splicing before moving to the next site.",
    nodeNumberPlaceholder: "Enter site number (example: SITE-1001)",
    openNode: "Open site",
    createNode: "Create site",
    spliceLocationsTitle: "Splice locations",
    spliceLocationsSubtitle: "Photos are optional for billing in this MVP.",
    addSpliceLocation: "Add splice location",
    inventoryTitle: "Inventory checklist",
    inventorySubtitle: "What was used at this site. Splicers see items and checklists, not pricing.",
    photoChecklistTitle: "Photo checklist",
    photosOptionalBanner: "Photos optional for MVP",
    capturePhotosTitle: "Capture photos",
    capturePhotosSubtitle: "Camera-only. GPS required at capture time. No gallery uploads.",
    startCamera: "Start camera",
    captureUsagePhoto: "Capture usage photo",
    photoStatusNone: "No photo captured",
    invoiceActionsTitle: "Invoice actions",
    invoicesUngatedBanner: "Invoices available without proof in MVP",
    invoiceActionsSubtitle: "Billing entry is available in this MVP.",
    markNodeReady: "Mark site READY for billing",
    createInvoice: "Create invoice (role-based)",
    invoicesPrivacyTitle: "Invoices and privacy",
    billingLocationsTitle: "Locations",
    billingTitle: "Billing",
    importUsage: "Import usage",
    exportCsv: "Export CSV",
    print: "Print",
    billingSelectLocation: "Select a location to start billing.",
      mapTitle: "Sites map",
      mapSubtitle: "Drop a pin to create a site and add documentation.",
      mapActiveOnly: "Active only (last 10 min)",
      mapSearchPlaceholder: "Search locations (name, address, ID, or lat,lng)",
      dropPin: "Drop Pin",
      dropPinNamePlaceholder: "Location name",
      siteListTitle: "Sites",
      siteNameTitle: "Location name",
      siteNameSubtitle: "Name this splice location so it is easy to find later.",
      siteNamePlaceholder: "Location name",
      sitePanelTitle: "Site panel",
      noSiteSelected: "No site selected.",
      siteStatusPending: "Pending sync",
      mapStatusNoProject: "Select a project to view sites.",
      mapStatusNoSites: "No sites yet. Drop a pin to add one.",
      mapStatusSites: "{count} sites",
      pinMissingGps: "GPS unavailable",
      pinMissingGpsBody: "Location access is required to drop a pin.",
      pinAccuracyWarnTitle: "Low accuracy",
      pinAccuracyWarnBody: "Accuracy is low. Pin saved anyway.",
      pinDroppedTitle: "Pin saved",
    pinDroppedBody: "Site created from map pin.",
      pinQueuedTitle: "Pin queued",
      pinQueuedBody: "Offline pin saved. Sync will run when online.",
      importLocations: "Import Locations (KMZ)",
      invoiceAgentAction: "Invoice Agent",
      invoiceAgentTitle: "Invoice Agent",
      invoiceAgentSubtitle: "Generate draft invoices from completed sites with billing entries.",
      invoiceAgentFromLabel: "From company",
      invoiceAgentToLabel: "To company",
      invoiceAgentSelectAll: "Select all eligible",
      invoiceAgentAllowDuplicates: "Allow duplicates",
      invoiceAgentGenerate: "Generate Drafts",
      invoiceAgentNoProject: "Select a project to generate invoices.",
      invoiceAgentNoEligible: "No eligible sites found.",
      invoiceAgentResultsTitle: "Invoice Agent results",
      invoiceAgentExportCsv: "Export CSV",
      invoiceAgentExportPdf: "Export PDF",
      yourInvoicesTitle: "Your invoices",
      yourInvoicesEmpty: "No invoices yet.",
      issuerLabel: "Issuer",
      recipientLabel: "Recipient",
      mediaTitle: "Media",
      mediaSubtitle: "Add images from camera or gallery.",
      addMedia: "Add media",
      codesTitle: "Billing codes",
      codesSubtitle: "Add the billing codes used at this location.",
      entriesTitle: "Entries",
      entriesSubtitle: "Add neutral line entries with optional quantity.",
      addEntry: "Add",
      notesTitle: "Notes",
      notesSubtitle: "Optional notes for this site.",
      entryDescriptionPlaceholder: "Entry description",
      entryQuantityPlaceholder: "Qty (optional)",
      notesPlaceholder: "Add notes",
    catalogTitle: "Material catalog",
    clear: "Clear",
    alertsFeedTitle: "Alerts feed",
    adminNotesTitle: "Admin notes",
    userManagementTitle: "User management",
    userManagementSubtitle: "Create/update profile rows for authenticated users. Auth users must already exist in Supabase.",
    adminUserIdPlaceholder: "Auth user id (UUID)",
    adminUserEmailPlaceholder: "Email or display name",
    createProfile: "Create profile",
    settingsTitle: "Settings",
    languageLabel: "Language",
    languageOptionEnglish: "English",
    languageOptionSpanish: "Spanish",
    languageOptionPortuguese: "Portuguese",
    languageHelp: "Changes apply immediately and sync to your profile.",
    saveLanguage: "Save language",
    selectProjectNodes: "Select a project to see sites.",
    selectProjectLocations: "Select a project to see locations.",
    startLabel: "Start",
    continueLabel: "Continue",
    completeLabel: "Completed",
    completeAction: "Complete",
    editLabel: "Edit",
    deleteLabel: "Delete",
    deletingLabel: "Deleting...",
    noProfilesFound: "No profiles found.",
    noLocationsYet: "No splice locations yet.",
    openNodePrompt: "Open a site to see splice locations.",
    noInventoryItems: "No inventory items yet. In Supabase, these come from inventory master + site checklist.",
    billingStatusLocations: "{count} locations",
    noLocations: "No locations",
    billingOpen: "Open billing",
    proofNotRequired: "Proof: Not required",
    proofProgress: "Proof: {uploaded}/{required}",
    ok: "OK",
    locked: "LOCKED",
    pricingVisible: "Pricing visible (per role)",
    pricingHiddenLabel: "Pricing hidden",
    subInvoicesLabel: "User Level 1 invoices:",
    tdsInvoicesLabel: "ADMIN invoices:",
    visible: "visible",
    hidden: "hidden",
    openNodeInvoices: "Open a site to see invoice actions.",
    billingGateTitle: "Billing status",
    billingGateBypass: "Invoices are not gated by proof in this MVP.",
    statusLabel: "Status",
    eligibleLabel: "ELIGIBLE",
    notReadyLabel: "NOT READY",
    nodeLabel: "Site",
    rateCardLabel: "Rate card",
    notesLabel: "Notes",
    workCodeLabel: "Work code",
    descriptionLabel: "Description",
    unitLabel: "Unit",
    qtyLabel: "Qty",
    rateLabel: "Rate",
    addLineItemLabel: "Add line item",
    subtotalLabel: "Subtotal",
    taxLabel: "Tax",
    totalLabel: "Total",
    openNodeAllowedQuantities: "Open a site to see allowed quantities.",
    openNodePhotoRequirements: "Open a site to see photo requirements.",
    noNodeSelected: "No site selected.",
    spliceLocationLabel: "Splice location",
    codesUsedTitle: "Codes used",
    briefDescriptionTitle: "Brief description",
    editCodesLabel: "Edit",
    saveLabel: "Save",
    closeLabel: "Close",
    cancelLabel: "Cancel",
    noneLabel: "None",
    codesPlaceholder: "Enter codes separated by commas",
    descriptionPlaceholder: "Brief description (max 400 chars)",
    demoEnvBadge: "DEMO ENVIRONMENT",
    demoLogin: "Demo login",
    demoLoginNote: "Demo session (read-only)",
    availableInProduction: "Available in Production",
    noInvoices: "No invoices created yet.",
    fromLabel: "From",
    toLabel: "To",
    amountLabel: "Amount",
    invoiceNumberLabel: "Invoice #",
    locationLabel: "Location",
    selectLocationToBill: "Select a location to start billing.",
    billingNotesPlaceholder: "Notes",
    translated: "Translated",
    viewOriginal: "View original",
    viewTranslation: "View translation",
    lastSeen: "Last seen: {minutes} min ago",
    lastSeenJustNow: "Last seen: just now",
    mapStatusNoData: "No locations available yet.",
    mapStatusSelfOnly: "Showing only your location.",
    mapStatusAll: "Showing crew locations.",
      mapStatusSignin: "Sign in to view sites.",
    you: "You",
    crew: "Crew",
    signedOut: "Signed out",
    signedIn: "Signed in",
    signedInDemo: "Signed in (Demo: {role})",
    signOut: "Sign out",
    roleLabel: "Role",
    pricingHiddenSplicer: "Pricing hidden (User Level 1 view)",
    pricingProtected: "Pricing protected by role",
    gpsMissing: "No GPS",
    gpsMissingBody: "This browser/device doesn't support geolocation.",
    gpsCaptured: "GPS captured",
    gpsError: "GPS error",
    gpsRequired: "GPS is required for payment.",
    locationSharingOn: "Live location sharing enabled.",
  },
  es: {
    brandSubtitle: "Verificación en campo, documentación y control de facturación",
    authTitle: "Inicia sesión en SpecCom",
    authSubtitle: "Bienvenido de nuevo.",
    emailPlaceholder: "correo",
    passwordPlaceholder: "contraseña",
    signIn: "Iniciar sesión",
    magicLink: "Restablecer contraseña",
    createUser: "Crear cuenta",
    authConfigNote: "Inicio de sesión no disponible.",
    rolesTitle: "",
    rolesSubtitle: "",
    liveSetupTitle: "",
    liveSetupSubtitle: "",
    selectProject: "Seleccionar proyecto",
    projectsNav: "Proyectos",
    messagesNav: "Mensajes",
    mapToggle: "Mapa",
    mapShow: "Mostrar mapa",
    mapHide: "Ocultar mapa",
    currentProjectLabel: "Proyecto actual",
    projectSummaryNone: "Sin proyecto seleccionado",
    projectsEmpty: "Aun no hay proyectos. Crea un proyecto o pide acceso a tu administrador.",
    projectsEmptyTitle: "Aun no hay proyectos",
    projectsEmptyBody: "Crea un proyecto para empezar a rastrear sitios y documentación, o pide a tu administrador que te agregue a un proyecto existente.",
    projectsEmptyCta: "Crear proyecto",
    createProject: "Crear proyecto",
    messagesEmpty: "Aun no hay mensajes.",
    messagePlaceholder: "Escribe un mensaje...",
    sendMessage: "Enviar",
    messagesFilterAll: "Tablon",
    messagesFilterProject: "Tablon",
    messagesFilterDirect: "Directo",
    messagesFilterGlobal: "Tablon",
    messageModeProject: "Tablon",
    messageModeDirect: "Mensaje directo",
    messageModeGlobal: "Tablon",
    messageRecipientPlaceholder: "Seleccionar receptor",
    messageDirectTo: "Para {name}",
    messageProjectTag: "Tablon",
    messageDirectTag: "Directo",
    menuTitle: "Menu",
    menuNavTitle: "Navegacion",
    menuSettingsTitle: "Configuracion",
    menuAboutTitle: "Acerca de",
    dailyReportTitle: "Reporte diario",
    dprProjectLabel: "Proyecto",
    dprDateLabel: "Fecha del reporte",
    dprRefresh: "Generar / Actualizar",
    dprCommentsLabel: "Comentarios / Pendientes",
    dprCommentsPlaceholder: "Algo que necesita atencion?",
    dprReadOnlyNote: "Solo lectura. Pide a un Admin o Project Manager que actualice.",
    dprNoProject: "Selecciona un proyecto para ver el reporte.",
    dprNoMetrics: "Genera un reporte para ver metricas.",
    dprMetricSites: "Sitios creados hoy",
    dprMetricSplice: "Ubicaciones de empalme creadas hoy",
    dprMetricWorkOrders: "Ordenes completadas hoy",
    dprMetricBlocked: "Bloqueos hoy",
    aboutCopy: "SpecCom transforma el caos de campo en un flujo inteligente -- acelera la documentacion, alinea la coordinacion del proyecto y protege el margen con menos sorpresas. El resultado es menos retrabajo, mas claridad y un camino mas rapido de trabajo completado a dinero cobrado.",
    messagesScopeProject: "Tablon principal (Org)",
    messagesScopeGlobal: "Tablon principal (Org)",
    messagesScopeNone: "Tablon principal (Org)",
    messageSenderYou: "Tu",
    messageSenderUnknown: "Usuario",
    globalLabel: "Global",
    navDashboard: "Panel",
    navTechnician: "Tecnico",
    navDispatch: "Despacho",
    navNodes: "Sitios",
    navPhotos: "Fotos",
    navBilling: "Facturación",
    navLabor: "Mano de obra",
    navInvoices: "Facturas",
      navMap: "Mapa de sitios",
    navCatalog: "Catálogo",
    navAlerts: "Alertas",
    navAdmin: "Admin",
    navSettings: "Configuración",
    techClockTitle: "Registro de tiempo",
    techClockIn: "Entrada",
    techClockOut: "Salida",
    techJobStateLabel: "Estado actual",
    techStartJob: "Iniciar trabajo",
    techPauseJob: "Pausar trabajo",
    techLunch: "Almuerzo",
    techBreak: "Pausa",
    techTruckInspection: "Inspeccion de camion",
    techEndJob: "Finalizar trabajo",
    techSummaryTitle: "Resumen diario",
    techSummaryTotal: "Total trabajado",
    techSummaryPaid: "Tiempo pagado",
    techSummaryUnpaid: "Tiempo no pagado",
    techSummaryInspections: "Inspecciones",
    techLocationTrailTitle: "Ruta de ubicacion",
    techNoTimesheet: "Marca entrada para iniciar el dia.",
    techClockedInAt: "Entrada a las {time}",
    techClockedOutAt: "Salida a las {time}",
    techNoEvents: "Sin eventos todavia.",
    techNoTrail: "Sin ruta de ubicacion.",
    techStateIdle: "En espera",
    techStateOffClock: "Fuera de turno",
    techWorkOrdersTitle: "Ordenes de trabajo",
    techWorkOrdersSubtitle: "Instalaciones y tickets asignados",
    techTodayTitle: "Hoy",
    techTomorrowTitle: "Mañana",
    woNoOrders: "Sin ordenes.",
    woActionEnRoute: "En ruta",
    woActionOnSite: "En sitio",
    woActionStart: "Iniciar",
    woActionBlocked: "Bloqueado",
    woActionComplete: "Completar",
    dispatchTitle: "Despacho",
    dispatchCreate: "Crear orden",
    dispatchImportCsv: "Importar CSV",
    dispatchStatusAll: "Todos",
    dispatchAssignAll: "Todos",
    dispatchAssignAssigned: "Asignadas",
    dispatchAssignUnassigned: "Sin asignar",
    dispatchModalTitle: "Orden de trabajo",
    laborTitle: "Mano de obra",
    laborNoProject: "Selecciona un proyecto para ver mano de obra.",
    laborNoRows: "No hay horas registradas.",
    laborTechLabel: "Tecnico",
    laborDateLabel: "Fecha",
    laborPaidHoursLabel: "Horas pagadas",
    jobSubtitle: "Reconstrucción FTTH Ruidoso (flujo por sitio)",
    photosOptionalBadge: "Fotos opcionales para el MVP",
    activeNodeTitle: "Sitio activo",
    kpiNode: "Sitio",
    kpiCompletion: "Avance",
    kpiUnits: "Unidades",
    pricingHidden: "Precios ocultos para Nivel I",
    alertsTitle: "Alertas",
    allowedQuantitiesTitle: "Cantidades permitidas",
    catalogQuickSearchTitle: "Búsqueda rápida del catálogo",
    catalogSearchPlaceholder: "Buscar parte Millennium, SKU MFG, descripción",
    nodesTitle: "Espacio de sitios",
    nodesSubtitle: "Solo un sitio ACTIVO a la vez. Termina el empalme antes de pasar al siguiente.",
    nodeNumberPlaceholder: "Ingresa número de sitio (ej: SITE-1001)",
    openNode: "Abrir sitio",
    createNode: "Crear sitio",
    spliceLocationsTitle: "Ubicaciones de empalme",
    spliceLocationsSubtitle: "Las fotos son opcionales para facturar en este MVP.",
    addSpliceLocation: "Agregar ubicación",
    inventoryTitle: "Checklist de inventario",
    inventorySubtitle: "Lo usado en este sitio. Empalmadores ven ítems y checklist, no precios.",
    photoChecklistTitle: "Checklist de fotos",
    photosOptionalBanner: "Fotos opcionales para el MVP",
    capturePhotosTitle: "Capturar fotos",
    capturePhotosSubtitle: "Solo cámara. GPS requerido al capturar. Sin galería.",
    startCamera: "Iniciar cámara",
    captureUsagePhoto: "Capturar foto de uso",
    photoStatusNone: "No se capturó foto",
    invoiceActionsTitle: "Acciones de facturación",
    invoicesUngatedBanner: "Facturas disponibles sin pruebas en el MVP",
    invoiceActionsSubtitle: "La carga de facturación está disponible en este MVP.",
    markNodeReady: "Marcar sitio LISTO para facturar",
    createInvoice: "Crear factura (según rol)",
    invoicesPrivacyTitle: "Facturas y privacidad",
    billingLocationsTitle: "Ubicaciones",
    billingTitle: "Facturación",
    importUsage: "Importar uso",
    exportCsv: "Exportar CSV",
    print: "Imprimir",
    billingSelectLocation: "Selecciona una ubicación para iniciar facturación.",
      mapTitle: "Mapa de sitios",
      mapSubtitle: "Coloca un pin para crear un sitio y agregar documentación.",
      mapActiveOnly: "Solo activos (últimos 10 min)",
      mapSearchPlaceholder: "Buscar ubicaciones (nombre, direccion, ID, o lat,lng)",
      dropPin: "Colocar pin",
      dropPinNamePlaceholder: "Nombre de ubicación",
      siteListTitle: "Sitios",
      siteNameTitle: "Nombre de ubicación",
      siteNameSubtitle: "Nombra esta ubicación para encontrarla fácilmente después.",
      siteNamePlaceholder: "Nombre de ubicación",
      sitePanelTitle: "Panel del sitio",
      noSiteSelected: "Ningún sitio seleccionado.",
      siteStatusPending: "Sincronización pendiente",
      mapStatusNoProject: "Selecciona un proyecto para ver sitios.",
      mapStatusNoSites: "Aún no hay sitios. Coloca un pin para agregar uno.",
      mapStatusSites: "{count} sitios",
      pinMissingGps: "GPS no disponible",
      pinMissingGpsBody: "Se requiere ubicación para colocar un pin.",
      pinAccuracyWarnTitle: "Precisión baja",
      pinAccuracyWarnBody: "La precisión es baja. El pin se guardó.",
      pinDroppedTitle: "Pin guardado",
    pinDroppedBody: "Sitio creado desde un pin del mapa.",
      pinQueuedTitle: "Pin en cola",
      pinQueuedBody: "Pin sin conexión guardado. Se sincronizará al estar en línea.",
      importLocations: "Importar ubicaciones (KMZ)",
      invoiceAgentAction: "Agente de facturación",
      invoiceAgentTitle: "Agente de facturación",
      invoiceAgentSubtitle: "Genera facturas borrador desde ubicaciones completas con entradas de facturación.",
      invoiceAgentFromLabel: "Empresa emisora",
      invoiceAgentToLabel: "Empresa receptora",
      invoiceAgentSelectAll: "Seleccionar elegibles",
      invoiceAgentAllowDuplicates: "Permitir duplicados",
      invoiceAgentGenerate: "Generar borradores",
      invoiceAgentNoProject: "Selecciona un proyecto para generar facturas.",
      invoiceAgentNoEligible: "No hay ubicaciones elegibles.",
      invoiceAgentResultsTitle: "Resultados del agente de facturación",
      invoiceAgentExportCsv: "Exportar CSV",
      invoiceAgentExportPdf: "Exportar PDF",
      yourInvoicesTitle: "Tus facturas",
      yourInvoicesEmpty: "Aún no hay facturas.",
      issuerLabel: "Emisor",
      recipientLabel: "Receptor",
      mediaTitle: "Media",
      mediaSubtitle: "Agrega imágenes desde cámara o galería.",
      addMedia: "Agregar media",
      codesTitle: "Códigos de facturación",
      codesSubtitle: "Agrega los códigos de facturación usados en esta ubicación.",
      entriesTitle: "Entradas",
      entriesSubtitle: "Agrega entradas neutrales con cantidad opcional.",
      addEntry: "Agregar",
      notesTitle: "Notas",
      notesSubtitle: "Notas opcionales para este sitio.",
      entryDescriptionPlaceholder: "Descripción de entrada",
      entryQuantityPlaceholder: "Cant. (opcional)",
      notesPlaceholder: "Agregar notas",
    catalogTitle: "Catálogo de materiales",
    clear: "Limpiar",
    alertsFeedTitle: "Feed de alertas",
    adminNotesTitle: "Notas de admin",
    userManagementTitle: "Gestión de usuarios",
    userManagementSubtitle: "Crea/actualiza perfiles. Los usuarios deben existir en Supabase.",
    adminUserIdPlaceholder: "ID de usuario auth (UUID)",
    adminUserEmailPlaceholder: "Correo o nombre",
    createProfile: "Crear perfil",
    settingsTitle: "Configuración",
    languageLabel: "Idioma",
    languageOptionEnglish: "Inglés",
    languageOptionSpanish: "Español",
    languageOptionPortuguese: "Portugues",
    languageHelp: "Los cambios aplican al instante y se guardan en tu perfil.",
    saveLanguage: "Guardar idioma",
    selectProjectNodes: "Selecciona un proyecto para ver sitios.",
    selectProjectLocations: "Selecciona un proyecto para ver ubicaciones.",
    startLabel: "Iniciar",
    continueLabel: "Continuar",
    completeLabel: "Completado",
    completeAction: "Completar",
    editLabel: "Editar",
    deleteLabel: "Eliminar",
    deletingLabel: "Eliminando...",
    noProfilesFound: "No hay perfiles.",
    noLocationsYet: "No hay ubicaciones aún.",
    openNodePrompt: "Abre un sitio para ver ubicaciones.",
    noInventoryItems: "Aún no hay ítems de inventario. En Supabase vienen del maestro + checklist del sitio.",
    billingStatusLocations: "{count} ubicaciones",
    noLocations: "Sin ubicaciones",
    billingOpen: "Abrir facturación",
    proofNotRequired: "Prueba: No requerida",
    proofProgress: "Prueba: {uploaded}/{required}",
    ok: "OK",
    locked: "BLOQUEADO",
    pricingVisible: "Precios visibles (según rol)",
    pricingHiddenLabel: "Precios ocultos",
    subInvoicesLabel: "Facturas User Level 1:",
    tdsInvoicesLabel: "Facturas ADMIN:",
    visible: "visible",
    hidden: "oculto",
    openNodeInvoices: "Abre un sitio para ver acciones de facturación.",
    billingGateTitle: "Estado de facturación",
    billingGateBypass: "Las facturas no se bloquean por pruebas en este MVP.",
    statusLabel: "Estado",
    eligibleLabel: "ELEGIBLE",
    notReadyLabel: "NO LISTO",
    nodeLabel: "Sitio",
    rateCardLabel: "Tarifa",
    notesLabel: "Notas",
    workCodeLabel: "Código",
    descriptionLabel: "Descripción",
    unitLabel: "Unidad",
    qtyLabel: "Cant.",
    rateLabel: "Tarifa",
    addLineItemLabel: "Agregar línea",
    subtotalLabel: "Subtotal",
    taxLabel: "Impuesto",
    totalLabel: "Total",
    openNodeAllowedQuantities: "Abre un sitio para ver cantidades permitidas.",
    openNodePhotoRequirements: "Abre un sitio para ver requisitos de fotos.",
    noNodeSelected: "No hay sitio seleccionado.",
    spliceLocationLabel: "Ubicación de empalme",
    codesUsedTitle: "Códigos usados",
    briefDescriptionTitle: "Descripción breve",
    editCodesLabel: "Editar",
    saveLabel: "Guardar",
    closeLabel: "Cerrar",
    cancelLabel: "Cancelar",
    noneLabel: "Ninguno",
    codesPlaceholder: "Ingresa códigos separados por comas",
    descriptionPlaceholder: "Descripción breve (máx 400 caracteres)",
    demoEnvBadge: "ENTORNO DEMO",
    demoLogin: "Acceso demo",
    demoLoginNote: "Sesión demo (solo lectura)",
    availableInProduction: "Disponible en Producción",
    noInvoices: "Aún no hay facturas.",
    fromLabel: "De",
    toLabel: "Para",
    amountLabel: "Monto",
    invoiceNumberLabel: "Factura #",
    locationLabel: "Ubicación",
    selectLocationToBill: "Selecciona una ubicación para iniciar facturación.",
    billingNotesPlaceholder: "Notas",
    translated: "Traducido",
    viewOriginal: "Ver original",
    viewTranslation: "Ver traducción",
    lastSeen: "Última vez: hace {minutes} min",
    lastSeenJustNow: "Última vez: justo ahora",
    mapStatusNoData: "Aún no hay ubicaciones disponibles.",
    mapStatusSelfOnly: "Mostrando solo tu ubicación.",
    mapStatusAll: "Mostrando ubicaciones del equipo.",
      mapStatusSignin: "Inicia sesión para ver sitios.",
    you: "Tú",
    crew: "Equipo",
    signedOut: "Sesión cerrada",
    signedIn: "Sesión iniciada",
    signedInDemo: "Sesión iniciada (Demo: {role})",
    signOut: "Cerrar sesión",
    roleLabel: "Rol",
    pricingHiddenSplicer: "Precios ocultos (vista Nivel I)",
    pricingProtected: "Precios protegidos por rol",
    gpsMissing: "Sin GPS",
    gpsMissingBody: "Este navegador/dispositivo no soporta geolocalización.",
    gpsCaptured: "GPS capturado",
    gpsError: "Error de GPS",
    gpsRequired: "El GPS es requerido para el pago.",
    locationSharingOn: "Compartir ubicación en vivo activado.",
  },
};

function normalizeLanguage(value){
  const lang = String(value || "").toLowerCase();
  if (lang === "es") return "es";
  if (lang === "pt") return "pt";
  return "en";
}

I18N.pt = {
  ...I18N.en,
  brandSubtitle: "Verificacao em campo, documentacao e controle de faturamento",
  authTitle: "Entrar no SpecCom",
  authSubtitle: "Bem-vindo de volta.",
  projectsNav: "Projetos",
  messagesNav: "Mensagens",
  mapToggle: "Mapa",
  menuTitle: "Menu",
  menuNavTitle: "Navegacao",
  menuSettingsTitle: "Configuracoes",
  menuAboutTitle: "Sobre",
  dailyReportTitle: "Relatorio Diario",
  settingsTitle: "Configuracoes",
  languageLabel: "Idioma",
  languageOptionEnglish: "Ingles",
  languageOptionSpanish: "Espanhol",
  languageOptionPortuguese: "Portugues",
  saveLanguage: "Salvar idioma",
  signIn: "Entrar",
  signOut: "Sair",
  roleLabel: "Funcao",
};

function getTodayDate(){
  return new Date().toISOString().slice(0, 10);
}

function handleStorageFailure(){
  if (!state.storageAvailable) return;
  state.storageAvailable = false;
  showStorageBlockedWarning();
}

function safeLocalStorageGet(key){
  if (!state.storageAvailable) return null;
  try{
    return localStorage.getItem(key);
  } catch {
    handleStorageFailure();
    return null;
  }
}

function safeLocalStorageSet(key, value){
  if (!state.storageAvailable) return false;
  try{
    localStorage.setItem(key, value);
    return true;
  } catch {
    handleStorageFailure();
    return false;
  }
}

function safeLocalStorageRemove(key){
  if (!state.storageAvailable) return false;
  try{
    localStorage.removeItem(key);
    return true;
  } catch {
    handleStorageFailure();
    return false;
  }
}

const CURRENT_PROJECT_KEY = "current_project_id";
const MAP_PANEL_VISIBLE_KEY = "map_panel_visible";
const SIDEBAR_OPEN_KEY = "speccom.ui.sidebarOpen";
const SIDEBAR_TAB_KEY = "speccom.ui.sidebarTab";
const SIDEBAR_WIDTH_KEY = "speccom.ui.sidebarWidth";
const LEGACY_DRAWER_OPEN_KEY = "speccom.ui.drawerOpen";
const LEGACY_DRAWER_TAB_KEY = "speccom.ui.drawerTab";
const LEGACY_DRAWER_WIDTH_KEY = "speccom.ui.drawerWidth";
const SIDEBAR_MIN_WIDTH = 320;
const SIDEBAR_MAX_WIDTH = 520;

function storageOk(){
  try{
    localStorage.setItem("__t", "1");
    localStorage.removeItem("__t");
    return true;
  } catch {
    return false;
  }
}

function ensureStorageAvailable(){
  if (state.storageAvailable) return true;
  showStorageBlockedWarning();
  return false;
}

function getRuntimeEnv(){
  if (window.__ENV && typeof window.__ENV === "object"){
    return window.__ENV;
  }

  return {
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
    APP_MODE: "real",
  };
}

async function tryFetchAppConfig(){
  try{
    const res = await fetch("/.netlify/functions/app-config", { cache: "no-store" });
    if (!res.ok) throw new Error(`app-config ${res.status}`);
    return await res.json();
  } catch (e){
    dlog("[config] app-config fetch not available (ok in demo/static):", e?.message || e);
    return null;
  }
}

async function loadRuntimeEnv(){
  if (window.__ENV){
    dlog("[config] using window.__ENV");
    return window.__ENV;
  }

  const cfg = await tryFetchAppConfig();
  if (cfg){
    window.__ENV = cfg;
    dlog("[config] window.__ENV set from app-config");
    return cfg;
  }

  window.__ENV = window.__ENV || { SUPABASE_URL: "", SUPABASE_ANON_KEY: "", APP_MODE: "real" };
  return window.__ENV;
}

async function ensureAuthClient(){
  if (state.client) return state.client;
  await loadRuntimeEnv();
  refreshConfig();
  appMode = APP_MODE;
  isDemo = APP_MODE === "demo";
  let client = await makeClient();
  if (client){
    state.client = client;
    supabase = client;
    return client;
  }
  return null;
}

function showStorageBlockedWarning(){
  if (state.storageWarningShown) return;
  state.storageWarningShown = true;
  const message = "Private browsing / tracking prevention is blocking storage. Please use a normal browser window for SpecCom.";
  const banner = $("storageWarning");
  if (banner){
    banner.style.display = "";
    banner.classList.add("warning-banner");
    banner.textContent = message;
  }
  const note = $("authConfigNote");
  if (note){
    note.textContent = "Private browsing / tracking prevention is blocking storage. Use a normal browser window.";
    note.style.display = "";
  }
  toast("Storage blocked", message, "error");
  setAuthButtonsDisabled(true);
}

function getPreferredLanguage(){
  const profileLang = window.currentUserProfile?.preferred_language || state.profile?.preferred_language;
  const stored = safeLocalStorageGet("preferred_language");
  return normalizeLanguage(profileLang || stored || "en");
}

function setPreferredLanguage(lang, { persist = true } = {}){
  const next = normalizeLanguage(lang);
  if (persist){
    safeLocalStorageSet("preferred_language", next);
  }
  if (state.profile){
    state.profile.preferred_language = next;
  }
  window.currentUserProfile = state.profile;
  applyI18n();
}

function getSavedProjectPreference(){
  return safeLocalStorageGet(CURRENT_PROJECT_KEY);
}

function setSavedProjectPreference(projectId){
  if (projectId){
    safeLocalStorageSet(CURRENT_PROJECT_KEY, projectId);
  } else {
    safeLocalStorageRemove(CURRENT_PROJECT_KEY);
  }
}

function getSavedMapPanelVisible(){
  const raw = safeLocalStorageGet(SIDEBAR_OPEN_KEY) ?? safeLocalStorageGet(LEGACY_DRAWER_OPEN_KEY);
  if (raw == null){
    const legacy = safeLocalStorageGet(MAP_PANEL_VISIBLE_KEY);
    if (legacy == null) return true;
    return legacy !== "0";
  }
  return raw === "1";
}

function isMobileViewport(){
  return window.matchMedia("(max-width: 900px)").matches;
}

function isMapViewActive(){
  return Boolean($("viewMap")?.classList.contains("active"));
}

function normalizeDrawerTab(tab){
  const key = String(tab || "").toLowerCase().trim();
  return ["layers", "feature", "site", "basemap"].includes(key) ? key : "layers";
}

function normalizeDrawerWidth(raw){
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(value)));
}

function applyDrawerWidthCss(width){
  const next = normalizeDrawerWidth(width);
  if (!next){
    document.documentElement.style.removeProperty("--sidebar-w");
    return;
  }
  document.documentElement.style.setProperty("--sidebar-w", `${next}px`);
}

function setDrawerWidth(width, { persist = true } = {}){
  const next = normalizeDrawerWidth(width);
  if (!next) return;
  state.map.drawerWidth = next;
  applyDrawerWidthCss(next);
  if (persist){
    safeLocalStorageSet(SIDEBAR_WIDTH_KEY, String(next));
  }
}

function getCodesRequiredForActiveProject(){
  const project = state?.activeProject || null;
  let raw = project
    ? (
        project.codes_required
        ?? project.required_codes
        ?? project.requiredCodes
        ?? project.allowed_codes
        ?? project.allowedCodes
        ?? project.billing_codes
        ?? project.codes
        ?? null
      )
    : null;

  if (!raw){
    const byWorkCodes = (state.workCodes || []).map((row) => String(row?.code || "").trim()).filter(Boolean);
    if (byWorkCodes.length) return Array.from(new Set(byWorkCodes));
    const byUnits = (state.allowedQuantities || []).map((row) => String(row?.unit_code || "").trim()).filter(Boolean);
    return Array.from(new Set(byUnits));
  }

  if (Array.isArray(raw)){
    return raw.map((item) => {
      if (item == null) return "";
      if (typeof item === "string") return item.trim();
      if (typeof item === "object"){
        return String(item.code || item.name || item.id || "").trim();
      }
      return String(item).trim();
    }).filter(Boolean);
  }
  if (typeof raw === "string"){
    return raw.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw === "object"){
    return Object.keys(raw).filter((k) => raw[k]).map((k) => String(k).trim()).filter(Boolean);
  }
  return [];
}

function queueMapInvalidate(delays = 120){
  if (!isMapViewActive() || !state.map.instance) return;
  const delayList = Array.isArray(delays) ? delays : [delays];
  const runInvalidate = () => {
    try{
      state.map.instance.invalidateSize(true);
    } catch {}
  };
  window.requestAnimationFrame(runInvalidate);
  delayList
    .map((delay) => Number(delay))
    .filter((delay) => Number.isFinite(delay) && delay >= 0)
    .forEach((delay) => setTimeout(runInvalidate, delay));
}

function applyDrawerUiState(){
  const body = document.body;
  const topToggle = $("btnMapToggle");
  const open = state.map.drawerOpen !== false;
  const mobile = isMobileViewport();
  state.map.drawerDocked = !mobile;
  state.map.panelVisible = open;

  body.classList.toggle("sidebar-open", open && mobile);
  body.classList.toggle("sidebar-collapsed", !open && !mobile);

  if (topToggle){
    topToggle.classList.toggle("is-active", open);
    topToggle.setAttribute("aria-pressed", open ? "true" : "false");
    topToggle.title = open ? t("mapHide") : t("mapShow");
  }

  const tab = normalizeDrawerTab(state.map.drawerTab);
  state.map.drawerTab = tab;
  document.querySelectorAll("[data-sidebar-tab]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.sidebarTab === tab);
  });
  document.querySelectorAll(".sidebar-tab").forEach((pane) => {
    pane.classList.toggle("active", pane.id === `sidebarTab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`);
  });
}

function setDrawerOpen(openBool, { persist = true } = {}){
  const open = Boolean(openBool);
  state.map.drawerOpen = open;
  state.map.panelVisible = open;
  if (persist){
    safeLocalStorageSet(SIDEBAR_OPEN_KEY, open ? "1" : "0");
    safeLocalStorageSet(MAP_PANEL_VISIBLE_KEY, open ? "1" : "0");
  }
  applyDrawerUiState();
  queueMapInvalidate([120, 220]);
}

function toggleSidebarOpen(){
  setDrawerOpen(!state.map.drawerOpen);
}

function setDrawerTab(tabName, { persist = true, open = true } = {}){
  state.map.drawerTab = normalizeDrawerTab(tabName);
  if (persist){
    safeLocalStorageSet(SIDEBAR_TAB_KEY, state.map.drawerTab);
  }
  if (open){
    state.map.drawerOpen = true;
    state.map.panelVisible = true;
    if (persist){
      safeLocalStorageSet(SIDEBAR_OPEN_KEY, "1");
    }
  }
  applyDrawerUiState();
  queueMapInvalidate([120, 220]);
}

function switchSidebarTab(tabId){
  setDrawerTab(tabId, { open: true });
}

function setDrawerDocked(dockedBool, { persist = true } = {}){
  state.map.drawerDocked = Boolean(dockedBool) && !isMobileViewport();
  if (persist) safeLocalStorageSet("speccom.ui.sidebarDocked", state.map.drawerDocked ? "1" : "0");
}

function applyDrawerStateFromStorage(){
  state.map.drawerOpen = getSavedMapPanelVisible();
  state.map.drawerTab = normalizeDrawerTab(
    safeLocalStorageGet(SIDEBAR_TAB_KEY)
    || safeLocalStorageGet(LEGACY_DRAWER_TAB_KEY)
    || state.map.drawerTab
  );
  state.map.drawerDocked = !isMobileViewport();
  state.map.drawerWidth = normalizeDrawerWidth(
    safeLocalStorageGet(SIDEBAR_WIDTH_KEY)
    || safeLocalStorageGet(LEGACY_DRAWER_WIDTH_KEY)
  );
  applyDrawerWidthCss(state.map.drawerWidth);
  state.map.panelVisible = state.map.drawerOpen;
  applyDrawerUiState();
}

function initDrawerResizer(){
  if (state.map.drawerResizeBound) return;
  const handle = $("sidebarResizer");
  const sidebar = $("leftSidebar");
  if (!handle || !sidebar) return;
  state.map.drawerResizeBound = true;

  let dragWidth = null;
  let startX = 0;
  let startWidth = 0;
  let dragging = false;

  const onPointerMove = (e) => {
    if (!dragging) return;
    const delta = e.clientX - startX;
    dragWidth = normalizeDrawerWidth(startWidth + delta);
    if (!dragWidth) return;
    applyDrawerWidthCss(dragWidth);
    queueMapInvalidate(50);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    if (dragWidth){
      setDrawerWidth(dragWidth, { persist: true });
    }
    dragWidth = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    queueMapInvalidate([120, 220]);
  };

  handle.addEventListener("pointerdown", (e) => {
    if (isMobileViewport()) return;
    if (state.map.drawerOpen === false) return;
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startWidth = sidebar.getBoundingClientRect().width;
    dragWidth = startWidth;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });
}

function initMapWorkspaceUi(){
  if (state.map.workspaceUiBound) return;
  state.map.workspaceUiBound = true;
  const sidebarClose = $("btnSidebarClose");
  if (sidebarClose){
    sidebarClose.addEventListener("click", () => setDrawerOpen(false));
  }
  document.querySelectorAll("[data-sidebar-tab]").forEach((btn) => {
    if (btn.dataset.drawerBound === "1") return;
    btn.dataset.drawerBound = "1";
    btn.addEventListener("click", () => setDrawerTab(btn.dataset.sidebarTab || "layers"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape"){
      if (isMobileViewport()){
        setDrawerOpen(false);
      }
    }
  });
  initDrawerResizer();
}

function setMapPanelVisible(visible, { persist = true } = {}){
  setDrawerOpen(Boolean(visible), { persist });
}

function toggleMapPanel(){
  toggleSidebarOpen();
}

function t(key, vars = {}){
  const lang = getPreferredLanguage();
  const dict = I18N[lang] || I18N.en;
  const template = dict[key] || I18N.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? "" : String(vars[k])));
}

function applyI18n(root = document){
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", t(key));
  });
}

async function getPublicOrSignedUrl(bucket, storagePath){
  if (!storagePath || !state.client) return "";
  if (/^https?:\/\//i.test(String(storagePath))) return String(storagePath);
  const cached = state.storageUrlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now()){
    return cached.url;
  }
  const storage = state.client.storage?.from(bucket);
  if (!storage) return "";
  try{
    const { data, error } = await storage.createSignedUrl(storagePath, 60 * 60);
    if (!error && data?.signedUrl){
      state.storageUrlCache.set(storagePath, {
        url: data.signedUrl,
        expiresAt: Date.now() + 55 * 60 * 1000,
      });
      return data.signedUrl;
    }
  } catch {}
  const { data } = storage.getPublicUrl(storagePath);
  if (data?.publicUrl){
    state.storageUrlCache.set(storagePath, {
      url: data.publicUrl,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    return data.publicUrl;
  }
  return "";
}

function renderTranslatedText(sourceText, { valueClass = "muted small" } = {}){
  const safe = escapeHtml(sourceText || "");
  return `
    <div class="translated-text" data-source-text="${safe}">
      <div class="translated-value ${valueClass}">${safe}</div>
      <div class="translated-meta" style="display:none;">
        <span class="muted small" data-translate-label>${t("translated")}</span>
        <button class="btn link small" data-action="toggleTranslation">${t("viewOriginal")}</button>
      </div>
    </div>
  `;
}

async function sha256Hex(text){
  if (!crypto?.subtle) return "";
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function translateTextIfNeeded(sourceText, targetLang){
  const normalized = String(sourceText || "").trim();
  const lang = normalizeLanguage(targetLang);
  if (!normalized || !state.client || isDemo) return normalized;
  const sourceHash = await sha256Hex(normalized);
  if (!sourceHash) return normalized;
  const { data: cached } = await state.client
    .from("text_translations")
    .select("translated_text")
    .eq("target_lang", lang)
    .eq("source_hash", sourceHash)
    .maybeSingle();
  if (cached?.translated_text){
    return cached.translated_text;
  }

  try{
    const res = await fetch("/.netlify/functions/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: normalized, target_lang: lang }),
    });
    if (!res.ok) return normalized;
    const json = await res.json();
    const translatedText = String(json?.translated_text || "").trim();
    if (!translatedText) return normalized;
    await state.client.from("text_translations").insert({
      source_lang: "auto",
      target_lang: lang,
      source_hash: sourceHash,
      source_text: normalized,
      translated_text: translatedText,
    });
    return translatedText;
  } catch {
    return normalized;
  }
}

async function hydrateTranslations(root = document){
  const targetLang = getPreferredLanguage();
  const blocks = Array.from(root.querySelectorAll(".translated-text"));
  for (const block of blocks){
    const sourceText = block.getAttribute("data-source-text") || "";
    const valueEl = block.querySelector(".translated-value");
    const metaEl = block.querySelector(".translated-meta");
    if (!valueEl || !metaEl) continue;
    const translated = await translateTextIfNeeded(sourceText, targetLang);
    const same = !translated || translated.trim() === sourceText.trim();
    if (same){
      metaEl.style.display = "none";
      valueEl.textContent = sourceText;
      block.dataset.translatedText = "";
      block.dataset.showing = "original";
      continue;
    }
    block.dataset.translatedText = translated;
    block.dataset.showing = "translated";
    valueEl.textContent = translated;
    metaEl.style.display = "";
    const btn = metaEl.querySelector("[data-action=\"toggleTranslation\"]");
    if (btn) btn.textContent = t("viewOriginal");
    const label = metaEl.querySelector("[data-translate-label]");
    if (label) label.textContent = t("translated");
  }
}

const DEBUG = Boolean(window.DEBUG) || new URLSearchParams(window.location.search).get("debug") === "1";

function debugLog(label, payload){
  if (!DEBUG) return;
  try{
    console.error(label, payload);
  } catch {}
}

function getErrorMessage(error){
  if (!error) return "Unknown error";
  return error.message || error.hint || error.details || String(error);
}

function getDetailedErrorMessage(error){
  if (!error) return "Unknown error";
  const parts = [];
  if (error.message) parts.push(String(error.message));
  if (error.details && String(error.details) !== String(error.message)) parts.push(String(error.details));
  if (error.hint) parts.push(`Hint: ${error.hint}`);
  if (error.code) parts.push(`Code: ${error.code}`);
  if (error.status) parts.push(`Status: ${error.status}`);
  return parts.join(" | ") || getErrorMessage(error);
}

function isRpc404(error){
  return error?.status === 404 || String(error?.message || "").includes("404");
}

function isDuplicateKeyError(error){
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  return error.status === 409 || error.code === "23505" || message.includes("duplicate key") || message.includes("already exists");
}

function toast(title, body, variant){
  $("toastTitle").textContent = title;
  $("toastBody").textContent = body;
  const toastEl = $("toast");
  toastEl.classList.toggle("error", variant === "error");
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 4200);
}

function reportErrorToast(title, error){
  const message = typeof error === "string" ? error : getDetailedErrorMessage(error);
  toast(title, message, "error");
  console.error(error);
}

function nowISO(){ return new Date().toISOString(); }

const DEFAULT_TERMINAL_PORTS = 4;
const MAX_TERMINAL_PORTS = 8;
const FIXED_LOCATION_PHOTO_SLOTS = 8;
const DEFAULT_RATE_CARD_NAME = String(
  (window.__ENV && window.__ENV.DEFAULT_RATE_CARD_NAME)
  || (window.ENV && window.ENV.DEFAULT_RATE_CARD_NAME)
  || (window.process && window.process.env && window.process.env.DEFAULT_RATE_CARD_NAME)
  || ""
).trim();
const BUILD_MODE = String(
  (window.__ENV && window.__ENV.BUILD_MODE)
  || (window.ENV && window.ENV.BUILD_MODE)
  || (window.process && window.process.env && window.process.env.BUILD_MODE)
  || ""
).toLowerCase() === "true";
const SINGLE_PROOF_PHOTO_MODE = String(
  (window.__ENV && window.__ENV.SINGLE_PROOF_PHOTO_MODE)
  || (window.ENV && window.ENV.SINGLE_PROOF_PHOTO_MODE)
  || (window.process && window.process.env && window.process.env.SINGLE_PROOF_PHOTO_MODE)
  || ""
).toLowerCase() === "true";
const MVP_UNGATED = true;

function getSiteDisplayName(site){
  const raw = String(site?.name || "").trim();
  return raw || "Pinned site";
}

function toSiteIdKey(id){
  if (id == null) return "";
  return String(id);
}

function getSiteCoords(site){
  const lat = site?.gps_lat ?? site?.lat ?? site?.latitude ?? null;
  const lng = site?.gps_lng ?? site?.lng ?? site?.longitude ?? null;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  return { lat: latNum, lng: lngNum };
}

function normalizeCodeList(list){
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.map((code) => String(code || "").trim()).filter(Boolean)));
}

function summarizeCodesForPopup(list, maxItems = 10){
  const cleaned = normalizeCodeList(list);
  if (!cleaned.length) return "(none)";
  if (cleaned.length <= maxItems) return cleaned.join(", ");
  return `${cleaned.slice(0, maxItems).join(", ")} (+${cleaned.length - maxItems} more)`;
}

function getCachedSiteCodes(siteId){
  const key = toSiteIdKey(siteId);
  if (!key) return [];
  const cached = state.map.siteCodesBySiteId.get(key);
  return Array.isArray(cached) ? cached : [];
}

function setCachedSiteCodes(siteId, codes){
  const key = toSiteIdKey(siteId);
  if (!key) return [];
  const normalized = normalizeCodeList(codes);
  state.map.siteCodesBySiteId.set(key, normalized);
  return normalized;
}

async function fetchSiteCodesForMapPopup(siteId){
  const key = toSiteIdKey(siteId);
  if (!key) return [];
  const cached = state.map.siteCodesBySiteId.get(key);
  if (Array.isArray(cached)) return cached;
  if (isDemo){
    const demoCodes = (state.demo.siteCodes || [])
      .filter((row) => toSiteIdKey(row?.site_id) === key)
      .map((row) => row.code);
    return setCachedSiteCodes(key, demoCodes);
  }
  if (!state.client) return [];
  const { data, error } = await state.client
    .from("site_codes")
    .select("code")
    .eq("site_id", siteId)
    .order("created_at", { ascending: true });
  if (error){
    debugLog("[map] popup code fetch failed", error);
    return [];
  }
  return setCachedSiteCodes(key, (data || []).map((row) => row.code));
}

function normalizePopupPhotos(items){
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const url = String(item?.url || "").trim();
      if (!url) return null;
      return {
        url,
        createdAt: item?.createdAt || "",
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function getCachedSitePhotos(siteId){
  const key = toSiteIdKey(siteId);
  if (!key) return [];
  const cached = state.map.sitePhotosBySiteId.get(key);
  return Array.isArray(cached) ? cached : [];
}

function setCachedSitePhotos(siteId, photos){
  const key = toSiteIdKey(siteId);
  if (!key) return [];
  const normalized = normalizePopupPhotos(photos);
  state.map.sitePhotosBySiteId.set(key, normalized);
  return normalized;
}

async function fetchSitePhotosForMapPopup(siteId){
  const key = toSiteIdKey(siteId);
  if (!key) return [];
  const cached = state.map.sitePhotosBySiteId.get(key);
  if (Array.isArray(cached)) return cached;
  if (isDemo){
    const rows = (state.demo.siteMedia || [])
      .filter((row) => toSiteIdKey(row?.site_id) === key)
      .slice(0, 6)
      .map((row) => ({
        url: String(row?.previewUrl || row?.media_path || "").trim(),
        createdAt: row?.created_at || "",
      }))
      .filter((row) => row.url);
    return setCachedSitePhotos(key, rows);
  }
  if (!state.client) return [];
  const { data, error } = await state.client
    .from("site_media")
    .select("media_path, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(6);
  if (error){
    debugLog("[map] popup photo fetch failed", error);
    return [];
  }
  const rows = [];
  for (const row of data || []){
    const url = row?.media_path
      ? (/^https?:\/\//i.test(String(row.media_path))
          ? String(row.media_path)
          : await getPublicOrSignedUrl("proof-photos", row.media_path))
      : "";
    if (!url) continue;
    rows.push({
      url,
      createdAt: row?.created_at || "",
    });
  }
  return setCachedSitePhotos(key, rows);
}

function getDemoCredentials(){
  const env = getRuntimeEnv();
  return {
    email: String(env.DEMO_ADMIN_EMAIL || "demo_admin@speccom.llc").trim(),
    password: String(env.DEMO_PASSWORD || "DemoOnly-2026!").trim(),
  };
}

function normalizeTerminalPorts(value){
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_TERMINAL_PORTS;
  return Math.min(MAX_TERMINAL_PORTS, Math.max(1, parsed));
}

function getFixedPhotoSlots(){
  const slots = [];
  for (let i = 1; i <= FIXED_LOCATION_PHOTO_SLOTS; i += 1){
    slots.push(`photo_${i}`);
  }
  return slots;
}

function getSlotLabel(slotKey){
  const photoMatch = String(slotKey || "").match(/^photo_(\d+)$/);
  if (photoMatch) return `Photo ${photoMatch[1]}`;
  if (slotKey === "splice_completion") return "Splice completion";
  const match = String(slotKey || "").match(/^port_(\d+)$/);
  if (match) return `Port ${match[1]}`;
  return slotKey;
}

function getRequiredSlotsForLocation(loc){
  return getFixedPhotoSlots();
}

function countRequiredSlotUploads(loc){
  const photos = loc?.photosBySlot || {};
  if (SINGLE_PROOF_PHOTO_MODE){
    const uploaded = Object.keys(photos).length > 0 ? 1 : 0;
    return { uploaded, required: 1 };
  }
  const required = getRequiredSlotsForLocation(loc);
  let uploaded = 0;
  required.forEach((slot) => {
    if (photos[slot]) uploaded += 1;
  });
  return { uploaded, required: 0 };
}

function hasAllRequiredSlotPhotos(loc){
  const photos = loc?.photosBySlot || {};
  if (SINGLE_PROOF_PHOTO_MODE){
    return Object.keys(photos).length > 0;
  }
  return true;
}

function getSpliceLocationDefaultName(index){
  const safeIndex = Number.isFinite(index) && index >= 0 ? index : 0;
  return `${t("spliceLocationLabel")} ${safeIndex + 1}`;
}

function getSpliceLocationDisplayName(loc, index){
  const label = String(loc?.label ?? "").trim();
  if (label) return label;
  if (Number.isFinite(index)) return getSpliceLocationDefaultName(index);
  const legacy = String(loc?.location_label ?? loc?.name ?? "").trim();
  if (legacy) return legacy;
  return t("spliceLocationLabel");
}

function normalizeWorkCodes(input){
  return String(input || "")
    .split(",")
    .map((part) => part.trim().replace(/\s+/g, " ").toUpperCase())
    .filter(Boolean);
}

function renderCodesSection(loc){
  const codes = Array.isArray(loc.work_codes) ? loc.work_codes : [];
  const description = String(loc.work_description || "");
  const isEditing = Boolean(loc.isEditingCodes);
  const template = $("spliceCodesTemplate");
  const codesHtml = codes.length
    ? codes.map((code) => `<span class="code-chip">${escapeHtml(code)}</span>`).join("")
    : `<span class="muted small">${t("noneLabel")}</span>`;
  const descHtml = description.trim()
    ? `<div class="muted small">${escapeHtml(description)}</div>`
    : `<div class="muted small">${t("noneLabel")}</div>`;

  const editBody = isEditing
    ? `
      <div class="field-stack" style="margin-top:10px;">
        <input class="input code-input" data-action="codesInput" data-location-id="${loc.id}" value="${escapeHtml((loc.pending_work_codes || codes).join(", "))}" placeholder="${t("codesPlaceholder")}" />
        <textarea class="input desc-textarea" data-action="descInput" data-location-id="${loc.id}" maxlength="400" placeholder="${t("descriptionPlaceholder")}">${escapeHtml(loc.pending_work_description ?? description)}</textarea>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn ghost small" data-action="cancelCodes" data-id="${loc.id}">${t("cancelLabel")}</button>
          <button class="btn secondary small" data-action="saveCodes" data-id="${loc.id}">${t("saveLabel")}</button>
        </div>
      </div>
    `
    : "";
  const actionsHtml = isEditing
    ? ""
    : `<button class="btn ghost small" data-action="editCodes" data-id="${loc.id}">${t("editCodesLabel")}</button>`;

  if (template){
    const fragment = template.content.cloneNode(true);
    const wrapper = document.createElement("div");
    wrapper.appendChild(fragment);
    const title = wrapper.querySelector("[data-role=\"codes-title\"]");
    if (title) title.textContent = t("codesUsedTitle");
    const descTitle = wrapper.querySelector("[data-role=\"desc-title\"]");
    if (descTitle) descTitle.textContent = t("briefDescriptionTitle");
    const actions = wrapper.querySelector("[data-role=\"codes-actions\"]");
    if (actions) actions.innerHTML = actionsHtml;
    const codesBody = wrapper.querySelector("[data-role=\"codes-body\"]");
    if (codesBody) codesBody.innerHTML = isEditing ? "" : codesHtml;
    const descBody = wrapper.querySelector("[data-role=\"desc-body\"]");
    if (descBody) descBody.innerHTML = isEditing ? "" : descHtml;
    if (isEditing){
      const editContainer = document.createElement("div");
      editContainer.innerHTML = editBody;
      wrapper.querySelector(".codes-section")?.appendChild(editContainer);
    }
    return wrapper.innerHTML;
  }

  return `
    <div class="codes-section">
      <div class="row" style="justify-content:space-between; align-items:center;">
        <div class="codes-title">${t("codesUsedTitle")}</div>
        ${actionsHtml}
      </div>
      ${isEditing ? "" : codesHtml}
      <div class="codes-title" style="margin-top:8px;">${t("briefDescriptionTitle")}</div>
      ${isEditing ? "" : descHtml}
      ${editBody}
    </div>
  `;
}

function getSortedSpliceLocations(node){
  const rows = [...(node?.splice_locations || [])];
  rows.sort((a, b) => {
    const aOrder = Number.isFinite(a.sort_order) ? a.sort_order : null;
    const bOrder = Number.isFinite(b.sort_order) ? b.sort_order : null;
    if (aOrder != null && bOrder != null && aOrder !== bOrder) return aOrder - bOrder;
    if (aOrder != null && bOrder == null) return -1;
    if (aOrder == null && bOrder != null) return 1;
    const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (aCreated !== bCreated) return aCreated - bCreated;
    return String(a.id).localeCompare(String(b.id));
  });
  return rows;
}

function getBackfillSlotKey(loc, photoType){
  const photos = loc?.photosBySlot || {};
  const requiredSlots = getRequiredSlotsForLocation(loc);
  const missingRequired = requiredSlots.find(slot => !photos[slot]);
  if (missingRequired) return missingRequired;
  return null;
}

function setText(id, value){
  const el = $(id);
  if (el) el.textContent = value;
}

function setAppModeUI(){
  const badge = $("appModeBadge");
  if (!badge) return;
  const live = appMode === "real";
  badge.textContent = live ? "LIVE" : "DEMO";
  badge.classList.toggle("live", live);
  badge.classList.toggle("demo", !live);
}

function setEnvWarning(){
  const banner = $("envWarning");
  if (!banner) return;
  if (appMode === "real" && !hasSupabaseConfig){
    banner.style.display = "";
    banner.classList.add("warning-banner");
    banner.textContent = "";
  } else {
    banner.style.display = "none";
    banner.textContent = "";
  }
}

function getWeeklyBillingWindow(referenceDate = new Date()){
  const ref = referenceDate instanceof Date ? new Date(referenceDate.getTime()) : new Date(referenceDate);
  const start = new Date(ref.getTime());
  const dayOfWeek = start.getDay(); // 0 = Sunday
  start.setDate(start.getDate() - dayOfWeek);
  start.setHours(0, 1, 0, 0); // Sunday 12:01 AM
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(end.getMilliseconds() - 1); // Saturday 11:59:59.999 PM
  return { start, end };
}

function formatBillingWindowLabel(window){
  if (!window?.start || !window?.end) return "";
  const startLabel = window.start.toLocaleString();
  const endLabel = window.end.toLocaleString();
  return `${startLabel} to ${endLabel}`;
}

function setAuthButtonsDisabled(disabled){
  const ids = ["btnSignIn", "btnMagicLink", "btnSignUp", "btnDemoLogin"];
  ids.forEach((id) => {
    const el = $(id);
    if (el) el.disabled = disabled;
  });
  const note = $("authConfigNote");
  if (note) note.style.display = disabled ? "" : "none";
}

function setActiveView(viewId){
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });
  if (viewId === "viewAdmin"){
    loadAdminProfiles();
  }
  if (viewId === "viewTechnician"){
    if (state.features.labor) loadTechnicianTimesheet();
  }
  if (viewId === "viewDispatch"){
    if (state.features.dispatch){
      loadDispatchTechnicians();
      loadDispatchWorkOrders();
    }
  }
  if (viewId === "viewLabor"){
    if (state.features.labor) loadLaborRows();
  }
  if (viewId === "viewMap"){
    ensureMap();
    initMapWorkspaceUi();
    applyDrawerUiState();
    queueMapInvalidate(90);
    refreshLocations();
  }
  if (viewId === "viewDailyReport"){
    syncDprProjectSelection();
    renderDprProjectOptions();
    loadDailyProgressReport();
  }
}

function startVisibilityWatch(){
  document.addEventListener("visibilitychange", () => {
    state.lastVisibilityChangeAt = Date.now();
    if (document.hidden){
      state.cameraInvalidated = true;
    }
  });
}

function distanceMeters(a, b){
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function shouldSendLocation(next){
  if (!state.lastLocationSent) return true;
  const elapsed = (Date.now() - state.lastLocationSentAt) / 1000;
  const dist = distanceMeters(state.lastLocationSent, next);
  return dist >= 10 || elapsed >= 15;
}

async function upsertUserLocation(pos){
  if (!state.client || !state.user || isDemo) return;
  const payload = {
    user_id: state.user.id,
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
    speed: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
    accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
    updated_at: new Date().toISOString(),
  };
  const nextPoint = { lat: payload.lat, lng: payload.lng };
  recordTechnicianTrail(pos);
  if (!shouldSendLocation(nextPoint)) return;
  state.lastLocationSent = nextPoint;
  state.lastLocationSentAt = Date.now();
  await state.client.from("user_locations").upsert(payload, { onConflict: "user_id" });
}

function startLocationWatch(){
  if (isDemo) return;
  if (!state.storageAvailable) return;
  if (state.locationWatchId != null) return;
  if (!navigator.geolocation){
    toast(t("gpsMissing"), t("gpsMissingBody"));
    return;
  }
  state.locationWatchId = navigator.geolocation.watchPosition(
    async (pos) => {
      await upsertUserLocation(pos);
    },
    () => {
      toast(t("gpsError"), t("gpsMissingBody"));
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
  );
  toast(t("gpsCaptured"), t("locationSharingOn"));
}

function stopLocationWatch(){
  if (state.locationWatchId != null){
    navigator.geolocation.clearWatch(state.locationWatchId);
    state.locationWatchId = null;
  }
}

function startLocationPolling(){
  if (isDemo) return;
  if (!state.storageAvailable) return;
  if (state.locationPollId != null) return;
  state.locationPollId = setInterval(() => {
    refreshLocations();
  }, 15000);
}

function stopLocationPolling(){
  if (state.locationPollId != null){
    clearInterval(state.locationPollId);
    state.locationPollId = null;
  }
}

const SITE_SELECT_COLUMNS = "id, project_id, name, notes, gps_lat, gps_lng, gps_accuracy_m, lat, lng, created_at";
const SITE_SELECT_COLUMNS_GPS_ONLY = "id, project_id, name, notes, gps_lat, gps_lng, gps_accuracy_m, created_at";
const SITE_SELECT_COLUMNS_LEGACY_ONLY = "id, project_id, name, notes, lat, lng, created_at";

function isMissingColumnError(error, column){
  const message = String(error?.message || "").toLowerCase();
  const col = String(column || "").toLowerCase();
  if (!message) return false;
  return message.includes("column") && message.includes(col) && (message.includes("does not exist") || message.includes("unknown column"));
}

function isMissingGpsColumnError(error){
  return ["gps_lat", "gps_lng", "gps_accuracy_m"].some((col) => isMissingColumnError(error, col));
}

function isMissingLatLngColumnError(error){
  return ["lat", "lng"].some((col) => isMissingColumnError(error, col));
}

function isMissingTable(err){
  const message = String((err && (err.message || err.details || err.hint)) || "");
  return (err && err.status === 404)
    || message.includes("Could not find the table")
    || message.includes("schema cache")
    || message.includes("Not Found");
}

function isNoRowsError(error){
  const message = String(error?.message || "");
  return error?.code === "PGRST116"
    || message.includes("Cannot coerce the result to a single JSON object")
    || message.includes("The result contains 0 rows");
}

function isRlsError(error){
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42501"
    || message.includes("row-level security")
    || message.includes("rls")
    || message.includes("permission denied");
}

function appendRlsHint(message, error){
  if (!isRlsError(error)) return message;
  return `${message} Save blocked by database security (RLS). Ask Admin to allow inserts/updates on sites for project members.`;
}

function reportPinErrorToast(title, error){
  const base = getErrorMessage(error);
  toast(title, appendRlsHint(base, error), "error");
  console.error(error);
}

function stripGpsFields(payload){
  const { gps_lat, gps_lng, gps_accuracy_m, ...rest } = payload || {};
  return rest;
}

async function fetchSiteById(siteId){
  if (!siteId) return { data: null, error: null };
  let res = await state.client
    .from("sites")
    .select(SITE_SELECT_COLUMNS)
    .eq("id", siteId)
    .maybeSingle();
  if (res.error && isNoRowsError(res.error)) return { data: null, error: null };
  if (!res.error) return res;
  if (isMissingGpsColumnError(res.error)){
    return await state.client
      .from("sites")
      .select(SITE_SELECT_COLUMNS_LEGACY_ONLY)
      .eq("id", siteId)
      .maybeSingle();
  }
  if (isMissingLatLngColumnError(res.error)){
    return await state.client
      .from("sites")
      .select(SITE_SELECT_COLUMNS_GPS_ONLY)
      .eq("id", siteId)
      .maybeSingle();
  }
  return res;
}

async function fetchSitesByProject(projectId){
  let res = await state.client
    .from("sites")
    .select(SITE_SELECT_COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (!res.error) return res;
  if (isMissingGpsColumnError(res.error)){
    return await state.client
      .from("sites")
      .select(SITE_SELECT_COLUMNS_LEGACY_ONLY)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
  }
  if (isMissingLatLngColumnError(res.error)){
    return await state.client
      .from("sites")
      .select(SITE_SELECT_COLUMNS_GPS_ONLY)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
  }
  return res;
}

function clearPendingPinMarker(){
  if (!state.map.pendingMarker || !state.map.instance) return;
  try{
    state.map.instance.removeLayer(state.map.pendingMarker);
  } catch {}
  state.map.pendingMarker = null;
}

function clearImportPreviewMarkers(){
  if (!state.map.instance) return;
  const kmzLayer = state.map.layers?.kmz;
  if (state.map.importPreviewMarkers?.length){
    state.map.importPreviewMarkers.forEach((marker) => {
      try{
        if (kmzLayer?.removeLayer) kmzLayer.removeLayer(marker);
        else state.map.instance.removeLayer(marker);
      } catch {}
    });
    state.map.importPreviewMarkers = [];
  }
  if (state.map.kmzGroupVisibility?.size){
    state.map.kmzGroupVisibility.clear();
  }
  state.map.kmzLayerCatalog = [];
  if (state.map.kmzImportGroups?.size){
    state.map.kmzImportGroups.forEach((group) => {
      try{
        if (kmzLayer?.removeLayer) kmzLayer.removeLayer(group);
      } catch {}
    });
    state.map.kmzImportGroups.clear();
  }
  renderMapLayerPanel();
}

const IMPORT_PREVIEW_MAX_MARKERS = 600;
const IMPORT_PREVIEW_MIN_PRECISION = 2;

function aggregateImportPreviewRows(rows, maxMarkers = IMPORT_PREVIEW_MAX_MARKERS){
  const cleanRows = (rows || []).filter((row) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)));
  if (!cleanRows.length){
    return { points: [], clustered: false, precision: null };
  }
  if (cleanRows.length <= maxMarkers){
    return {
      points: cleanRows.map((row) => ({
        lat: Number(row.latitude),
        lng: Number(row.longitude),
        count: 1,
        sampleNames: [String(row.location_name || "Unnamed")],
        row,
      })),
      clustered: false,
      precision: null,
    };
  }

  let precision = 5;
  let points = [];
  for (; precision >= IMPORT_PREVIEW_MIN_PRECISION; precision -= 1){
    const buckets = new Map();
    cleanRows.forEach((row) => {
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      const key = `${lat.toFixed(precision)}|${lng.toFixed(precision)}`;
      if (!buckets.has(key)){
        buckets.set(key, {
          latSum: 0,
          lngSum: 0,
          count: 0,
          sampleNames: [],
          row,
        });
      }
      const bucket = buckets.get(key);
      bucket.latSum += lat;
      bucket.lngSum += lng;
      bucket.count += 1;
      if (bucket.sampleNames.length < 3){
        bucket.sampleNames.push(String(row.location_name || "Unnamed"));
      }
    });
    if (buckets.size <= maxMarkers || precision === IMPORT_PREVIEW_MIN_PRECISION){
      points = Array.from(buckets.values()).map((bucket) => ({
        lat: bucket.latSum / bucket.count,
        lng: bucket.lngSum / bucket.count,
        count: bucket.count,
        sampleNames: bucket.sampleNames,
        row: bucket.row,
      }));
      break;
    }
  }

  return { points, clustered: true, precision };
}

function buildImportPreviewPopup(point){
  if (!point) return "<div class=\"muted small\">Preview point</div>";
  if ((point.count || 0) > 1){
    const names = (point.sampleNames || []).map((name) => escapeHtml(name)).join(", ");
    return `
      <div style="font-weight:700;">${point.count} locations in this area</div>
      <div class="muted small">${names}${point.count > (point.sampleNames || []).length ? ", ..." : ""}</div>
    `;
  }
  const row = point.row || {};
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  const codeCount = Array.isArray(row.billing_codes) ? row.billing_codes.length : 0;
  const photoCount = Array.isArray(row.photo_urls) ? row.photo_urls.length : 0;
  return `
    <div style="font-weight:700;">${escapeHtml(row.location_name || "Unnamed")}</div>
    <div class="muted small">${Number.isFinite(lat) ? lat.toFixed(6) : "-"}, ${Number.isFinite(lng) ? lng.toFixed(6) : "-"}</div>
    <div class="muted small">${codeCount} codes | ${photoCount} photos</div>
  `;
}

function renderImportPreviewMarkers(rows){
  clearImportPreviewMarkers();
  ensureMap();
  if (!state.map.instance || !window.L){
    return { totalRows: rows?.length || 0, shownMarkers: 0, clustered: false, precision: null };
  }
  ensureMapLayerRegistry();
  const kmzLayer = state.map.layers?.kmz;
  const { points, clustered, precision } = aggregateImportPreviewRows(rows);
  state.map.importPreviewMarkers = points.map((point) => {
    const count = point.count || 1;
    const marker = window.L.circleMarker([point.lat, point.lng], {
      radius: count > 1 ? Math.min(14, 6 + Math.log(count + 1) * 2.4) : 6,
      color: "#f97316",
      fillColor: "#f97316",
      fillOpacity: count > 1 ? 0.92 : 0.85,
      weight: count > 1 ? 2.5 : 2,
      interactive: true,
      bubblingMouseEvents: false,
      pane: MAP_PANES.kmz,
    });
    marker.bindPopup(buildImportPreviewPopup(point));
    const feature = buildKmzFeatureFromRow(point.row || {
      location_name: point.sampleNames?.[0] || "KMZ Point",
      latitude: point.lat,
      longitude: point.lng,
      notes: point.count > 1 ? `${point.count} locations clustered` : "",
      __kml_layer: "KMZ Preview",
      __rowNumber: point.row?.__rowNumber || "",
    }, "KMZ Preview");
    marker.on("click", () => {
      marker.openPopup();
      if (feature) handleMapFeatureSelection(feature);
    });
    if (kmzLayer?.addLayer) kmzLayer.addLayer(marker);
    else marker.addTo(state.map.instance);
    return marker;
  });
  return {
    totalRows: rows?.length || 0,
    shownMarkers: points.length,
    clustered,
    precision: clustered ? precision : null,
  };
}

function openImportLocationsModal(rows, project){
  const modal = $("importLocationsModal");
  const summary = $("importLocationsSummary");
  const list = $("importLocationsList");
  const confirmBtn = $("btnImportLocationsConfirm");
  const validation = state.importPreview.validation || null;
  const errorsBtn = $("btnImportLocationsErrors");
  if (!modal || !summary || !list) return;
  const projectName = project?.name || "Project";
  const validRows = validation?.validRows || rows;
  const errors = validation?.errors || [];
  const warnings = validation?.warnings || [];
  const preview = state.importPreview.preview || null;
  const previewNote = preview
    ? ` Preview: ${preview.shownMarkers} marker${preview.shownMarkers === 1 ? "" : "s"} for ${preview.totalRows} row${preview.totalRows === 1 ? "" : "s"}${preview.clustered ? " (grouped)" : ""}.`
    : "";
  summary.textContent = `Project ${projectName}: ${validRows.length} ready, ${errors.length} errors, ${warnings.length} warnings.${previewNote}`;
  list.innerHTML = "";
  if (errors.length){
    list.innerHTML += errors
      .slice(0, 60)
      .map((entry) => `<div class="muted small">[ERROR] Row ${escapeHtml(entry.row)}: ${escapeHtml(entry.reason)}</div>`)
      .join("");
  }
  if (warnings.length){
    list.innerHTML += warnings
      .slice(0, 60)
      .map((entry) => `<div class="muted small">[WARN] Row ${escapeHtml(entry.row)}: ${escapeHtml(entry.reason)}</div>`)
      .join("");
  }
  if (!errors.length){
    list.innerHTML = rows
    .slice(0, 50)
    .map((row) => {
      const lat = Number(row.latitude).toFixed(6);
      const lng = Number(row.longitude).toFixed(6);
      const codeCount = Array.isArray(row.billing_codes) ? row.billing_codes.length : 0;
      const photoCount = Array.isArray(row.photo_urls) ? row.photo_urls.length : 0;
      const extras = [];
      if (codeCount) extras.push(`${codeCount} codes`);
      if (photoCount) extras.push(`${photoCount} photos`);
      const extraText = extras.length ? ` | ${extras.join(" | ")}` : "";
      return `<div class="muted small">* ${escapeHtml(row.location_name)} (${lat}, ${lng})${escapeHtml(extraText)}</div>`;
    })
    .join("");
  }
  if (validRows.length > 50){
    list.innerHTML += `<div class="muted small">...and ${validRows.length - 50} more</div>`;
  }
  if (confirmBtn){
    confirmBtn.disabled = Boolean(errors.length) || !validRows.length;
    confirmBtn.title = confirmBtn.disabled ? "Fix import errors before confirming." : "";
  }
  if (errorsBtn){
    const hasIssues = errors.length > 0 || warnings.length > 0;
    errorsBtn.disabled = !hasIssues;
    errorsBtn.title = hasIssues ? "" : "No validation issues.";
  }
  modal.style.display = "";
}

function closeImportLocationsModal(){
  const modal = $("importLocationsModal");
  if (!modal) return;
  modal.style.display = "none";
  clearImportPreviewMarkers();
  state.importPreview.rawRows = [];
  state.importPreview.validation = null;
  state.importPreview.preview = null;
}

async function confirmImportLocations(){
  const rows = state.importPreview.validation?.validRows || state.importPreview.rows || [];
  const projectId = state.importPreview.projectId;
  const hasErrors = (state.importPreview.validation?.errors || []).length > 0;
  if (!rows.length || !projectId){
    closeImportLocationsModal();
    return;
  }
  if (hasErrors){
    toast("Import blocked", "Fix validation errors before confirming import.", "error");
    return;
  }
  const client = await supabaseReady;
  if (!client){
    toast("Import failed", "Supabase client unavailable.");
    return;
  }
  const { data, error } = await client.rpc("fn_import_sites", {
    p_project_id: projectId,
    p_sites: rows,
  });
  if (error){
    const message = getDetailedErrorMessage(error);
    toast("Import failed", message, "error");
    const summary = $("importLocationsSummary");
    const list = $("importLocationsList");
    if (summary) summary.textContent = "Import failed. Review the server error below.";
    if (list) list.innerHTML = `<div class="muted small">[SERVER] ${escapeHtml(message)}</div>`;
    return;
  }
  const imported = data?.imported ?? 0;
  const skipped = data?.skipped ?? 0;
  const errors = data?.errors || [];
  toast("Import complete", `Imported ${imported} locations. Skipped ${skipped}.`);
  if (errors.length){
    const summary = $("importLocationsSummary");
    const list = $("importLocationsList");
    if (summary) summary.textContent = `Imported ${imported}. Skipped ${skipped}.`;
    if (list){
      list.innerHTML = errors.map((err) => (
        `<div class="muted small">Row ${escapeHtml(err.row)}: ${escapeHtml(err.reason || "Invalid row")}</div>`
      )).join("");
    }
  } else {
    closeImportLocationsModal();
  }
  clearImportPreviewMarkers();
  await loadProjectSites(projectId);
}

SpecCom.helpers.resetInvoiceAgentState = function(){
  state.invoiceAgent.candidates = [];
  state.invoiceAgent.selectedIds = [];
  state.invoiceAgent.results = null;
  state.invoiceAgent.allowDuplicates = false;
  state.invoiceAgent.busy = false;
  state.invoiceAgent.siteMap = new Map();
  state.invoiceAgent.importPreview = null;
  state.invoiceAgent.billingWindow = null;
};

SpecCom.helpers.isInvoiceAgentAllowed = function(){
  return isPrivilegedRole();
};

SpecCom.helpers.openInvoiceAgentModal = async function(){
  if (!SpecCom.helpers.isInvoiceAgentAllowed()){
    toast("Not allowed", "Only Admin, Project Manager, or Owner can generate invoices.");
    return;
  }
  const modal = $("invoiceAgentModal");
  if (!modal) return;
  SpecCom.helpers.resetInvoiceAgentState();
  if (state.activeProject?.id){
    await loadRateCards(state.activeProject.id);
  }
  if (!state.orgs.length){
    await SpecCom.helpers.loadOrgs();
  }
  SpecCom.helpers.populateInvoiceAgentOrgs();
  modal.style.display = "";
  SpecCom.helpers.renderInvoiceAgentModal();
  await SpecCom.helpers.loadInvoiceAgentCandidates();
  SpecCom.helpers.renderInvoiceImportPreview();
};

SpecCom.helpers.closeInvoiceAgentModal = function(){
  const modal = $("invoiceAgentModal");
  if (!modal) return;
  modal.style.display = "none";
};

SpecCom.helpers.populateInvoiceAgentOrgs = function(){
  const fromSelect = $("invoiceAgentFromOrg");
  const toSelect = $("invoiceAgentToOrg");
  if (!fromSelect || !toSelect) return;
  const orgs = state.orgs || [];
  fromSelect.innerHTML = orgs.map((org) => (
    `<option value="${org.id}">${escapeHtml(org.name)}</option>`
  )).join("");
  toSelect.innerHTML = orgs.map((org) => (
    `<option value="${org.id}">${escapeHtml(org.name)}</option>`
  )).join("");
  const userOrgId = state.profile?.org_id || null;
  if (userOrgId){
    fromSelect.value = userOrgId;
    if (!isOwner()){
      fromSelect.disabled = true;
    }
    if (toSelect.value === userOrgId && orgs.length > 1){
      const firstOther = orgs.find(o => o.id !== userOrgId);
      if (firstOther) toSelect.value = firstOther.id;
    }
  }
};

SpecCom.helpers.getSiteCompletionState = function(site){
  const hasStatus = Object.prototype.hasOwnProperty.call(site, "status");
  const hasCompleted = Object.prototype.hasOwnProperty.call(site, "completed");
  if (hasStatus){
    return String(site.status || "").toUpperCase() === "COMPLETE";
  }
  if (hasCompleted){
    return Boolean(site.completed);
  }
  // Backward-compat: treat unknown status as complete.
  return true;
};

SpecCom.helpers.loadInvoiceAgentCandidates = async function(){
  const summary = $("invoiceAgentSummary");
  const list = $("invoiceAgentList");
  if (!summary || !list) return;
  const projectId = state.activeProject?.id || null;
  if (!projectId){
    summary.textContent = t("invoiceAgentNoProject");
    list.innerHTML = "";
    return;
  }
  if (!state.client){
    summary.textContent = "Loading...";
    return;
  }
  const sites = getVisibleSites().filter((site) => !site.is_pending);
  state.invoiceAgent.siteMap = new Map(sites.map((site) => [site.id, site]));
  if (!sites.length){
    summary.textContent = t("invoiceAgentNoEligible");
    list.innerHTML = "";
    return;
  }
  const siteIds = sites.map((site) => site.id);
  const billingWindow = getWeeklyBillingWindow(new Date());
  state.invoiceAgent.billingWindow = billingWindow;
  const { data: entries, error } = await state.client
    .from("site_entries")
    .select("site_id, description, quantity, created_at")
    .in("site_id", siteIds);
  if (error){
    toast("Load failed", error.message || "Failed to load site entries.");
    summary.textContent = "Unable to load site entries.";
    list.innerHTML = "";
    return;
  }
  const entryMap = new Map();
  (entries || []).forEach((row) => {
    const createdAt = row.created_at ? new Date(row.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return;
    if (createdAt < billingWindow.start || createdAt > billingWindow.end) return;
    const code = String(row.description || "").trim();
    const qty = Number(row.quantity || 0);
    if (!code || !Number.isFinite(qty) || qty <= 0) return;
    if (!entryMap.has(row.site_id)) entryMap.set(row.site_id, []);
    entryMap.get(row.site_id).push({ code, qty });
  });
  const candidates = sites.map((site) => {
    const billable = entryMap.get(site.id) || [];
    const complete = SpecCom.helpers.getSiteCompletionState(site);
    const eligible = complete && billable.length > 0;
    return {
      id: site.id,
      name: getSiteDisplayName(site),
      complete,
      billable,
      eligible,
    };
  });
  state.invoiceAgent.candidates = candidates;
  state.invoiceAgent.selectedIds = candidates.filter(c => c.eligible).map(c => c.id);
  SpecCom.helpers.renderInvoiceAgentModal();
};

SpecCom.helpers.renderInvoiceAgentModal = function(){
  const summary = $("invoiceAgentSummary");
  const list = $("invoiceAgentList");
  const results = $("invoiceAgentResults");
  const selectAll = $("invoiceAgentSelectAll");
  const allowDuplicates = $("invoiceAgentAllowDuplicates");
  const tierWrap = $("invoiceAgentTierWrap");
  const tierSelect = $("invoiceAgentTier");
  if (!summary || !list) return;
  const candidates = state.invoiceAgent.candidates || [];
  const eligible = candidates.filter(c => c.eligible);
  const fromName = (state.orgs || []).find(o => o.id === $("invoiceAgentFromOrg")?.value)?.name || "";
  const toName = (state.orgs || []).find(o => o.id === $("invoiceAgentToOrg")?.value)?.name || "";
  if (tierWrap){
    tierWrap.style.display = SpecCom.helpers.isRoot() ? "" : "none";
    if (tierSelect && !tierSelect.value){
      tierSelect.value = "OWNER";
    }
  }
  if (!candidates.length){
    summary.textContent = t("invoiceAgentNoEligible");
  } else {
    const billingWindowText = formatBillingWindowLabel(state.invoiceAgent.billingWindow);
    const weekText = billingWindowText ? `Billing week (${billingWindowText})` : "Billing week";
    summary.textContent = `${weekText}: ${eligible.length}/${candidates.length} eligible sites.` + (fromName && toName ? ` (${fromName} -> ${toName})` : "");
  }
  if (!candidates.length){
    list.innerHTML = "";
  } else {
    list.innerHTML = candidates.map((c) => {
      const selected = state.invoiceAgent.selectedIds.includes(c.id);
      const statusLabel = c.complete ? "COMPLETE" : "INCOMPLETE";
      const entryLabel = c.billable.length ? `${c.billable.length} items` : "No items";
      const disabled = !c.eligible;
      return `
        <label class="row" style="gap:10px; align-items:flex-start;">
          <input type="checkbox" data-site-id="${c.id}" ${selected ? "checked" : ""} ${disabled ? "disabled" : ""} />
          <div>
            <div style="font-weight:700;">${escapeHtml(c.name)}</div>
            <div class="muted small">${statusLabel} â€¢ ${entryLabel}</div>
          </div>
        </label>
      `;
    }).join("");
  }
  if (selectAll){
    selectAll.checked = eligible.length > 0 && state.invoiceAgent.selectedIds.length === eligible.length;
  }
  if (allowDuplicates){
    allowDuplicates.checked = state.invoiceAgent.allowDuplicates;
  }
  if (results){
    results.style.display = state.invoiceAgent.results ? "" : "none";
    if (state.invoiceAgent.results){
      SpecCom.helpers.renderInvoiceAgentResults();
    }
  }
};

SpecCom.helpers.renderInvoiceAgentResults = function(){
  const results = $("invoiceAgentResults");
  if (!results) return;
  const data = state.invoiceAgent.results;
  if (!data){
    results.style.display = "none";
    return;
  }
  const created = data.created ?? 0;
  const skipped = data.skipped ?? 0;
  const errors = data.errors || [];
  const invoices = data.invoices || [];
  let html = `<div style="font-weight:800;">${t("invoiceAgentResultsTitle")}</div>`;
  html += `<div class="muted small" style="margin-top:6px;">Created ${created} draft invoices. Skipped ${skipped}.</div>`;
  if (errors.length){
    html += `<div class="muted small" style="margin-top:6px;">Errors:</div>`;
    html += `<div class="field-stack" style="margin-top:6px;">${errors.map((err) => (
      `<div class="muted small">Site ${escapeHtml(err.site_id || "?")}: ${escapeHtml(err.reason || "Failed")}</div>`
    )).join("")}</div>`;
  }
  if (invoices.length){
    html += `<div class="field-stack" style="margin-top:10px;">${invoices.map((inv) => {
      const site = state.invoiceAgent.siteMap.get(inv.site_id);
      const siteName = site ? getSiteDisplayName(site) : inv.site_id;
      const total = Number(inv.total || 0);
      return `
        <div class="row" style="justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:700;">${escapeHtml(siteName)}</div>
            <div class="muted small">Draft â€¢ ${formatMoney(total)}</div>
          </div>
          <div class="row">
            <button class="btn ghost small" data-action="invoiceAgentExportCsv" data-invoice-id="${inv.invoice_id}" data-site-id="${inv.site_id}">${t("invoiceAgentExportCsv")}</button>
            <button class="btn ghost small" data-action="invoiceAgentExportPdf" data-invoice-id="${inv.invoice_id}" data-site-id="${inv.site_id}">${t("invoiceAgentExportPdf")}</button>
          </div>
        </div>
      `;
    }).join("")}</div>`;
  }
  results.innerHTML = html;
  results.style.display = "";
};

SpecCom.helpers.confirmInvoiceAgentGenerate = async function(){
  if (state.invoiceAgent.busy) return;
  const projectId = state.activeProject?.id || null;
  const selected = state.invoiceAgent.selectedIds || [];
  const fromOrgId = $("invoiceAgentFromOrg")?.value || null;
  const toOrgId = $("invoiceAgentToOrg")?.value || null;
  const tier = SpecCom.helpers.isRoot() ? ($("invoiceAgentTier")?.value || null) : null;
  if (!projectId){
    toast("Missing project", t("invoiceAgentNoProject"));
    return;
  }
  if (!tier){
    if (!fromOrgId || !toOrgId){
      toast("Missing org", "Select both from and to companies.");
      return;
    }
    if (fromOrgId === toOrgId){
      toast("Invalid orgs", "From and To companies must differ.");
      return;
    }
  }
  if (!selected.length){
    toast("No eligible sites", "No eligible sites found for invoicing.");
    return;
  }
  if (!state.client){
    toast("Unavailable", "Supabase client unavailable.");
    return;
  }
  toast("Invoice Agent", "Generating invoice drafts...");
  state.invoiceAgent.busy = true;
  const btn = $("btnInvoiceAgentConfirm");
  if (btn){
    btn.disabled = true;
    btn.dataset.originalLabel = btn.textContent;
    btn.textContent = "Generating...";
  }
  try{
    let data = null;
    let error = null;
    if (tier){
      const roleName = String(tier || "").toUpperCase();
      const cardName = roleName;
      const rateCard = (state.rateCards || []).find(r => r.name === cardName);
      if (!rateCard){
        toast("Missing pricing", `No rate card found for ${cardName}. Import pricing first.`);
        return;
      }
      ({ data, error } = await state.client.rpc("fn_generate_site_invoices", {
        p_project_id: projectId,
        p_site_ids: selected,
        p_allow_duplicate: state.invoiceAgent.allowDuplicates,
        p_rate_card_id: rateCard.id,
      }));
    } else {
      ({ data, error } = await state.client.rpc("fn_generate_tiered_invoices", {
        p_project_id: projectId,
        p_site_ids: selected,
        p_allow_duplicate: state.invoiceAgent.allowDuplicates,
        p_from_org_id: fromOrgId,
        p_to_org_id: toOrgId,
      }));
    }
    if (error){
      throw error;
    }
    // TODO(phase2): email delivery + accounting sync after invoice generation.
    state.invoiceAgent.results = data || null;
    SpecCom.helpers.renderInvoiceAgentModal();
    await SpecCom.helpers.loadYourInvoices(projectId);
    const createdCount = Number(data?.created || 0);
    if (createdCount > 0){
      toast("Invoice drafts created", `Invoice drafts created (${createdCount} sites)`);
    } else {
      toast("No eligible sites", "No eligible sites found for invoicing.");
    }
  } catch (err){
    console.error(err);
    toast("Invoice generation failed", "Please try again.");
  } finally {
    state.invoiceAgent.busy = false;
    if (btn){
      btn.disabled = false;
      btn.textContent = btn.dataset.originalLabel || "Generate Drafts";
      delete btn.dataset.originalLabel;
    }
  }
};

SpecCom.helpers.loadInvoiceAgentExportData = async function(invoiceId){
  const { data: invoice, error: invoiceErr } = await state.client
    .from("invoices")
    .select("id, invoice_number, status, subtotal, tax, total, created_at, project_id, site_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (invoiceErr || !invoice){
    throw new Error(invoiceErr?.message || "Invoice not found.");
  }
  const { data: items, error: itemsErr } = await state.client
    .from("invoice_items")
    .select("id, work_code_id, description, unit, qty, rate, work_codes(code)")
    .eq("invoice_id", invoiceId)
    .order("sort_order");
  if (itemsErr){
    throw new Error(itemsErr.message || "Unable to load invoice items.");
  }
  return { invoice, items: items || [] };
};

SpecCom.helpers.exportInvoiceAgentCsvPayload = function(invoice, site, items){
  const header = [
    ["Invoice Number", invoice.invoice_number || ""],
    ["Project", state.activeProject?.name || ""],
    ["Site", site ? getSiteDisplayName(site) : ""],
    ["Prepared By", state.profile?.display_name || state.user?.email || ""],
    ["Prepared At", new Date(invoice.created_at || Date.now()).toLocaleString()],
    ["Status", invoice.status || ""],
  ];
  const rows = (items || []).map((item) => ([
    item.work_codes?.code || item.description || "",
    item.description || "",
    item.unit || "",
    item.qty ?? 0,
    item.rate ?? 0,
    (Number(item.qty || 0) * Number(item.rate || 0)).toFixed(2),
  ]));
  const csv = []
    .concat(header.map(row => row.map(escapeCsv).join(",")))
    .concat([["Work Code","Description","Unit","Qty","Rate","Amount"].join(",")])
    .concat(rows.map(row => row.map(escapeCsv).join(",")))
    .join("\n");
  return csv;
};

SpecCom.helpers.printInvoiceAgentPayload = function(invoice, site, items){
  const totals = computeInvoiceTotals(items);
  const now = new Date(invoice.created_at || Date.now()).toLocaleString();
  const codeList = (items || []).map(i => i.work_codes?.code || i.description).filter(Boolean).join(", ");
  const html = `
    <html>
      <head>
        <title>Invoice ${invoice.invoice_number || ""}</title>
        <style>
          body{font-family:Arial, sans-serif; padding:24px; color:#111;}
          h1{margin:0 0 8px;}
          table{width:100%; border-collapse:collapse; margin-top:16px;}
          th,td{border-bottom:1px solid #ccc; text-align:left; padding:8px;}
          .meta{margin-top:12px; font-size:14px;}
          .totals{margin-top:16px; text-align:right;}
        </style>
      </head>
      <body>
        <h1>Invoice ${escapeHtml(invoice.invoice_number || "")}</h1>
        <div class="meta">Project: ${escapeHtml(state.activeProject?.name || "")}</div>
        <div class="meta">Site: ${escapeHtml(site ? getSiteDisplayName(site) : "")}</div>
        <div class="meta">Prepared by: ${escapeHtml(state.profile?.display_name || state.user?.email || "")}</div>
        <div class="meta">Prepared at: ${escapeHtml(now)}</div>
        <div class="meta">Work codes: ${escapeHtml(codeList || "-")}</div>
        <table>
          <thead><tr><th>Work Code</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>
            ${(items || []).map((item) => `
              <tr>
                <td>${escapeHtml(item.work_codes?.code || item.description || "")}</td>
                <td>${escapeHtml(item.description || "")}</td>
                <td>${escapeHtml(item.unit || "")}</td>
                <td>${Number(item.qty || 0)}</td>
                <td>${formatMoney(item.rate)}</td>
                <td>${formatMoney(Number(item.qty || 0) * Number(item.rate || 0))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="totals">
          <div>Subtotal: ${formatMoney(totals.subtotal)}</div>
          <div>Tax: ${formatMoney(totals.tax)}</div>
          <div><b>Total: ${formatMoney(totals.total)}</b></div>
        </div>
      </body>
    </html>
  `;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
};

SpecCom.helpers.normalizeImportHeader = function(header){
  return String(header || "").trim().toLowerCase();
};

function parseDelimited(text, delimiter){
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(delimiter).map(SpecCom.helpers.normalizeImportHeader);
  return lines.slice(1).map((line, idx) => {
    const values = line.split(delimiter);
    const row = Object.fromEntries(
      headers.map((h, i) => [h, values[i]?.trim()])
    );
    row.__rowNumber = idx + 2;
    return row;
  });
}

async function parseCsvFile(file){
  const text = await file.text();
  return parseDelimited(text, ",");
}

async function parseXlsxFile(file){
  if (!window.XLSX) throw new Error("XLSX parser not available");
  const buffer = await file.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (!rows.length) return [];
  const headers = rows[0].map(SpecCom.helpers.normalizeImportHeader);
  return rows.slice(1).filter((r) => r && r.length).map((r, idx) => {
    const row = Object.fromEntries(
      headers.map((h, i) => [h, String(r[i] ?? "").trim()])
    );
    row.__rowNumber = idx + 2;
    return row;
  });
}

async function loadPdfJs(){
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.pdfjsLib;
}

async function parsePdfFile(file){
  const pdfjsLib = await loadPdfJs();
  // TODO: PDF parsing assumes a text table with comma/tab or multi-space delimiters.
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i += 1){
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    text += `${pageText}\n`;
  }
  const wiredRows = parseWiredProductionPdfText(text);
  if (wiredRows.length){
    return wiredRows;
  }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headerLine = lines[0];
  let delimiter = ",";
  if (headerLine.includes("\t")) delimiter = "\t";
  else if (!headerLine.includes(",")) delimiter = null;
  if (delimiter){
    return parseDelimited(lines.join("\n"), delimiter);
  }
  // fallback to 2+ spaces
  const headers = headerLine.split(/\s{2,}/).map(SpecCom.helpers.normalizeImportHeader);
  return lines.slice(1).map((line, idx) => {
    const values = line.split(/\s{2,}/);
    const row = Object.fromEntries(
      headers.map((h, i) => [h, values[i]?.trim()])
    );
    row.__rowNumber = idx + 2;
    return row;
  });
}

function stripHtmlTags(value){
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseKmlCoordinateText(coordText){
  const raw = String(coordText || "").trim();
  if (!raw) return null;
  const parts = raw.split(/\s+/).filter(Boolean);
  for (const part of parts){
    const fields = part.split(",");
    if (fields.length < 2) continue;
    const lng = Number.parseFloat(fields[0]);
    const lat = Number.parseFloat(fields[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    return { lat, lng };
  }
  return null;
}

const KMZ_CRITICAL_LAYERS = ["Project", "Drop", "Network Point", "Cable", "Connectivity Point"];

function canonicalKmzLayerName(value){
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const normalized = raw.toLowerCase().replace(/[_-]+/g, " ");
  if (normalized === "project") return "Project";
  if (normalized === "drop") return "Drop";
  if (normalized === "cable") return "Cable";
  if (normalized === "connectivity point") return "Connectivity Point";
  if (normalized === "network point") return "Network Point";
  if (normalized === "servicelocation" || normalized === "service location") return "Network Point";
  if (normalized === "path") return "Path";
  if (normalized === "network devices") return "Network Devices";
  return raw
    .split(" ")
    .map((part) => (part ? (part[0].toUpperCase() + part.slice(1).toLowerCase()) : ""))
    .join(" ")
    .trim();
}

function normalizeKmzLayerList(values){
  const out = [];
  const seen = new Set();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const name = canonicalKmzLayerName(value);
    if (!name || seen.has(name)) return;
    seen.add(name);
    out.push(name);
  });
  return out;
}

function getOrderedKmzLayerList(values, { includeCritical = false } = {}){
  const normalized = normalizeKmzLayerList(values);
  const critical = normalized
    .filter((name) => KMZ_CRITICAL_LAYERS.includes(name))
    .sort((a, b) => KMZ_CRITICAL_LAYERS.indexOf(a) - KMZ_CRITICAL_LAYERS.indexOf(b));
  const extras = normalized.filter((name) => !KMZ_CRITICAL_LAYERS.includes(name));
  extras.sort((a, b) => a.localeCompare(b));
  if (includeCritical){
    return [...KMZ_CRITICAL_LAYERS, ...extras];
  }
  return [...critical, ...extras];
}

function parseKmlText(kmlText){
  const parser = new DOMParser();
  const raw = String(kmlText || "");
  let xml = parser.parseFromString(raw, "application/xml");
  if (xml.getElementsByTagName("parsererror").length){
    const firstTag = raw.indexOf("<");
    if (firstTag > 0){
      xml = parser.parseFromString(raw.slice(firstTag), "application/xml");
    }
  }
  if (xml.getElementsByTagName("parsererror").length){
    // Some KMZ exports include xsi:schemaLocation but omit xmlns:xsi on <kml>.
    // Auto-heal that namespace declaration so otherwise-valid KML can parse.
    if (raw.includes("xsi:schemaLocation") && !raw.includes("xmlns:xsi")){
      const healed = raw.replace(
        /<kml\b([^>]*)>/i,
        '<kml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"$1>'
      );
      if (healed !== raw){
        xml = parser.parseFromString(healed, "application/xml");
      }
    }
  }
  if (xml.getElementsByTagName("parsererror").length){
    throw new Error("Invalid KML inside KMZ.");
  }
  const placemarks = Array.from(xml.getElementsByTagName("Placemark"));
  const rows = [];

  const getDirectName = (node) => {
    if (!node) return "";
    const children = Array.from(node.children || []);
    const nameNode = children.find((child) => String(child.localName || child.nodeName || "").toLowerCase() === "name");
    return String(nameNode?.textContent || "").trim();
  };
  const getLayerName = (placemark) => {
    let current = placemark?.parentElement || null;
    while (current){
      const local = String(current.localName || current.nodeName || "").toLowerCase();
      if (local === "folder" || local === "document"){
        const name = getDirectName(current);
        if (name) return name;
      }
      current = current.parentElement;
    }
    return "";
  };

  const allLayerNames = [];
  const layerSeen = new Set();
  Array.from(xml.getElementsByTagName("*")).forEach((node) => {
    const local = String(node?.localName || node?.nodeName || "").toLowerCase();
    if (local !== "folder" && local !== "document") return;
    const name = canonicalKmzLayerName(getDirectName(node));
    if (!name || layerSeen.has(name)) return;
    layerSeen.add(name);
    allLayerNames.push(name);
  });
  if (!allLayerNames.length){
    allLayerNames.push(...KMZ_CRITICAL_LAYERS);
  }

  placemarks.forEach((placemark, idx) => {
    const name = placemark.getElementsByTagName("name")[0]?.textContent?.trim() || `KMZ Point ${idx + 1}`;
    const descriptionRaw = placemark.getElementsByTagName("description")[0]?.textContent || "";
    const description = stripHtmlTags(descriptionRaw);

    const pointNode = placemark.getElementsByTagName("Point")[0];
    if (!pointNode) return;
    const coordText = pointNode.getElementsByTagName("coordinates")[0]?.textContent || "";
    const coords = parseKmlCoordinateText(coordText);
    if (!coords) return;
    const layerNameRaw = getLayerName(placemark);
    const layerName = canonicalKmzLayerName(layerNameRaw);

    const row = {
      location_name: name,
      latitude: coords.lat,
      longitude: coords.lng,
      notes: description || null,
      __kml_layer: layerName || null,
      __kml_layer_raw: layerNameRaw || null,
      __rowNumber: rows.length + 2,
    };

    const dataNodes = Array.from(placemark.getElementsByTagName("Data"));
    dataNodes.forEach((node) => {
      const key = SpecCom.helpers.normalizeImportHeader(node.getAttribute("name"));
      const value = node.getElementsByTagName("value")[0]?.textContent?.trim();
      if (key && value) row[key] = value;
    });
    const simpleNodes = Array.from(placemark.getElementsByTagName("SimpleData"));
    simpleNodes.forEach((node) => {
      const key = SpecCom.helpers.normalizeImportHeader(node.getAttribute("name"));
      const value = node.textContent?.trim();
      if (key && value) row[key] = value;
    });

    rows.push(row);
  });

  const attachLayerCatalog = (targetRows) => {
    try{
      Object.defineProperty(targetRows, "__kmlLayerNames", {
        value: allLayerNames.slice(),
        enumerable: false,
        writable: true,
      });
    } catch {}
    return targetRows;
  };
  return attachLayerCatalog(rows);
}

function decodeKmzTextBytes(bytes){
  if (!bytes || !bytes.length) return "";
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // BOM-aware decoding for KMZ KML files exported as UTF-8/UTF-16.
  if (view.length >= 2){
    if (view[0] === 0xFF && view[1] === 0xFE){
      return new TextDecoder("utf-16le").decode(view);
    }
    if (view[0] === 0xFE && view[1] === 0xFF){
      // Decode as LE after swapping bytes for BE payload.
      const swapped = new Uint8Array(view.length - (view.length % 2));
      for (let i = 0; i + 1 < view.length; i += 2){
        swapped[i] = view[i + 1];
        swapped[i + 1] = view[i];
      }
      return new TextDecoder("utf-16le").decode(swapped);
    }
  }
  if (view.length >= 3 && view[0] === 0xEF && view[1] === 0xBB && view[2] === 0xBF){
    return new TextDecoder("utf-8").decode(view);
  }
  return new TextDecoder("utf-8").decode(view);
}

async function parseKmzFile(file){
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files || {}).filter((entry) => !entry.dir);
  const kmlEntries = entries.filter((entry) => String(entry.name || "").toLowerCase().endsWith(".kml"));
  if (!kmlEntries.length){
    throw new Error("KMZ does not contain a .kml file.");
  }
  const preferred = kmlEntries.find((entry) => String(entry.name || "").toLowerCase().endsWith("doc.kml")) || kmlEntries[0];
  const ordered = [preferred, ...kmlEntries.filter((entry) => entry !== preferred)];
  let lastError = null;
  for (const entry of ordered){
    try{
      const kmlBytes = await entry.async("uint8array");
      const kmlText = decodeKmzTextBytes(kmlBytes);
      const rows = parseKmlText(kmlText);
      if (!rows.length) continue;
      const serviceRows = rows.filter((row) => /service\s*location/i.test(String(row?.__kml_layer_raw || "")));
      const selectedRows = serviceRows.length ? serviceRows : rows;
      try{
        Object.defineProperty(selectedRows, "__allKmzRows", {
          value: rows.slice(),
          enumerable: false,
          writable: true,
        });
        Object.defineProperty(selectedRows, "__kmlLayerNames", {
          value: Array.isArray(rows.__kmlLayerNames) ? rows.__kmlLayerNames.slice() : [],
          enumerable: false,
          writable: true,
        });
      } catch {}
      return selectedRows;
    } catch (err){
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  throw new Error("KMZ contains KML files but no valid placemarks were found.");
}

function parseWiredProductionPdfText(text){
  const src = String(text || "");
  if (!/\bJob\/Map\b/i.test(src) || !/\bEnclosure\b/i.test(src) || !/\bCodes\b/i.test(src)){
    return [];
  }
  const stopAt = src.search(/\bProduction Summary\b/i);
  const body = (stopAt >= 0 ? src.slice(0, stopAt) : src).replace(/\s+/g, " ").trim();
  if (!body) return [];
  const rowPattern = /([A-Za-z0-9]{20})\s+(.+?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+([\s\S]*?)(?=([A-Za-z0-9]{20}\s+)|$)/g;
  const rows = [];
  let match;
  while ((match = rowPattern.exec(body))){
    const jobMap = String(match[1] || "").trim();
    const preDate = String(match[2] || "").trim();
    const prodDate = String(match[3] || "").trim();
    const payload = String(match[4] || "").trim();
    if (!jobMap || !preDate || !prodDate) continue;

    const enclosureMatch = preDate.match(/^(\d+(?:\/@[A-Za-z0-9.]+)?(?:\s*-\s*RE\s*ENTRY)?)\b/i);
    const enclosure = enclosureMatch ? enclosureMatch[1].replace(/\s+/g, " ").trim() : preDate.split(/\s+/)[0];
    const tech = enclosureMatch ? preDate.slice(enclosureMatch[0].length).trim() : preDate.split(/\s+/).slice(1).join(" ");

    // Keep only code-like fragments ending in [qty], drop wrapped names/test markers.
    const codes = [];
    const codePattern = /([^,\n]+?)\s*\[(\d+(?:\.\d+)?)\]/g;
    let codeMatch;
    while ((codeMatch = codePattern.exec(payload))){
      const code = String(codeMatch[1] || "").trim().replace(/\s+/g, " ");
      const qty = Number(codeMatch[2]);
      if (!code) continue;
      codes.push({ item: code, qty: Number.isFinite(qty) ? qty : 1 });
    }
    if (!codes.length){
      continue;
    }
    const billingCodes = Array.from(new Set(codes.map((item) => item.item)));
    rows.push({
      location_name: enclosure || `${jobMap}|${prodDate}`,
      enclosure,
      job_map: jobMap,
      external_ref: `${jobMap}|${enclosure}`,
      production_date: prodDate,
      tech,
      codes_raw: payload,
      billing_codes: billingCodes,
      items: codes,
      __rowNumber: rows.length + 2,
    });
  }
  return rows;
}

function buildItemsFromRow(row){
  const items = [];
  Object.keys(row).forEach((key) => {
    const match = key.match(/^item_(\d+)$/);
    if (!match) return;
    const idx = match[1];
    const item = String(row[key] || "").trim();
    if (!item) return;
    const qtyKey = `qty_${idx}`;
    const qtyRaw = row[qtyKey];
    const qty = qtyRaw == null || qtyRaw === "" ? null : Number(qtyRaw);
    items.push({ item, qty: Number.isFinite(qty) ? qty : null });
  });
  if (!items.length){
    const codesRaw = String(row?.codes || row?.codes_raw || "").trim();
    if (codesRaw){
      codesRaw.split(",").forEach((part) => {
        const value = String(part || "").trim();
        if (!value) return;
        const match = value.match(/^(.*?)\s*\[(\d+(?:\.\d+)?)\]\s*$/);
        const item = match ? String(match[1] || "").trim() : value;
        const qty = match ? Number(match[2]) : 1;
        if (!item) return;
        items.push({ item, qty: Number.isFinite(qty) ? qty : 1 });
      });
    }
  }
  return items;
}

function extractEnclosureToken(text){
  const raw = String(text || "").trim();
  if (!raw) return "";
  const direct = raw.match(/^\d+(?:\/@[\w.]+)?$/);
  if (direct) return direct[0];
  const token = raw.match(/\b(\d+(?:\/@[\w.]+)?)\b/);
  return token ? token[1] : "";
}

function getImportCoordsLookup(){
  const map = new Map();
  const rows = getVisibleSites();
  rows.forEach((site) => {
    const coords = getSiteCoords(site);
    if (!coords) return;
    const name = String(site?.name || "").trim();
    const display = String(getSiteDisplayName(site) || "").trim();
    const enclosure = extractEnclosureToken(name) || extractEnclosureToken(display);
    const keys = [name, display, enclosure]
      .map((v) => String(v || "").trim().toLowerCase())
      .filter(Boolean);
    keys.forEach((key) => {
      if (!map.has(key)) map.set(key, coords);
    });
  });
  return map;
}

function parseLatLngCandidate(value){
  const text = String(value ?? "").trim();
  if (!text) return null;
  const num = Number.parseFloat(text);
  return Number.isFinite(num) ? num : null;
}

function splitImportList(raw){
  return String(raw || "")
    .split(/[,\n;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildBillingCodesFromRow(row){
  const set = new Set();
  Object.keys(row || {}).forEach((key) => {
    const lower = String(key || "").trim().toLowerCase();
    if (/^(billing_)?code_\d+$/.test(lower) || /^work_code_\d+$/.test(lower)){
      const value = String(row[key] || "").trim();
      if (value) set.add(value);
      return;
    }
    if (["billing_codes", "billing_code", "codes", "work_codes"].includes(lower)){
      splitImportList(row[key]).forEach((code) => set.add(code));
    }
  });
  return Array.from(set);
}

function buildPhotoUrlsFromRow(row){
  const set = new Set();
  Object.keys(row || {}).forEach((key) => {
    const lower = String(key || "").trim().toLowerCase();
    if (/^(photo|image)(_url)?_\d+$/.test(lower)){
      const value = String(row[key] || "").trim();
      if (/^https?:\/\//i.test(value)) set.add(value);
      return;
    }
    if (["photo_urls", "photos", "image_urls"].includes(lower)){
      splitImportList(row[key]).forEach((url) => {
        if (/^https?:\/\//i.test(url)) set.add(url);
      });
    }
  });
  return Array.from(set);
}

function validateLocationImportRows(rows){
  const errors = [];
  const warnings = [];
  const validRows = [];
  const coordsLookup = getImportCoordsLookup();
  (rows || []).forEach((row) => {
    const rowId = row?.__rowNumber ?? "?";
    const name = String(
      row?.location_name || row?.enclosure || row?.name || row?.drop_number || ""
    ).trim();
    let lat = parseLatLngCandidate(row?.latitude ?? row?.lat);
    let lng = parseLatLngCandidate(row?.longitude ?? row?.lng);
    const latValid = Number.isFinite(lat) && lat >= -90 && lat <= 90;
    const lngValid = Number.isFinite(lng) && lng >= -180 && lng <= 180;
    if (!name){
      errors.push({ row: rowId, reason: "Missing location_name." });
      return;
    }
    if (!latValid || !lngValid){
      const enclosure = String(row?.enclosure || extractEnclosureToken(name)).trim();
      const externalRef = String(row?.external_ref || "").trim();
      const keys = [
        name,
        enclosure,
        externalRef,
        externalRef.includes("|") ? externalRef.split("|").pop() : "",
      ]
        .map((v) => String(v || "").trim().toLowerCase())
        .filter(Boolean);
      let matchedCoords = null;
      for (const key of keys){
        if (coordsLookup.has(key)){
          matchedCoords = coordsLookup.get(key);
          break;
        }
      }
      if (matchedCoords){
        lat = matchedCoords.lat;
        lng = matchedCoords.lng;
        warnings.push({ row: rowId, reason: "Coordinates auto-filled from existing project site match." });
      }
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90){
      errors.push({ row: rowId, reason: "Latitude must be between -90 and 90 (or match an existing site)." });
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180){
      errors.push({ row: rowId, reason: "Longitude must be between -180 and 180 (or match an existing site)." });
      return;
    }

    const next = {
      ...row,
      location_name: name,
      latitude: lat,
      longitude: lng,
      notes: row?.notes ? String(row.notes).trim() : null,
      items: Array.isArray(row?.items) ? row.items : [],
      billing_codes: Array.isArray(row?.billing_codes) ? row.billing_codes : [],
      photo_urls: Array.isArray(row?.photo_urls) ? row.photo_urls : [],
    };

    next.billing_codes = Array.from(new Set(
      next.billing_codes.map((code) => String(code || "").trim()).filter(Boolean)
    ));

    const goodPhotoUrls = [];
    next.photo_urls.forEach((url) => {
      const normalized = String(url || "").trim();
      if (!normalized) return;
      if (!/^https?:\/\//i.test(normalized)){
        warnings.push({ row: rowId, reason: `Ignored non-URL photo value: ${normalized}` });
        return;
      }
      goodPhotoUrls.push(normalized);
    });
    next.photo_urls = Array.from(new Set(goodPhotoUrls));

    if (!next.items.length && !next.billing_codes.length){
      warnings.push({ row: rowId, reason: "No items or billing codes found." });
    }
    validRows.push(next);
  });
  return { errors, warnings, validRows };
}

function downloadLocationImportTemplate(){
  const headers = [
    "location_name",
    "latitude",
    "longitude",
    "progress_notes",
    "billing_codes",
    "photo_urls",
    "item_1",
    "qty_1",
    "item_2",
    "qty_2",
    "finish_date",
    "map_url",
    "gps_status",
  ];
  const sample = [
    "Task 1704",
    "34.145700",
    "-106.892300",
    "Crew on-site. Fiber prep complete. Ready for closeout review.",
    "HAF0(PCOT)LO, HxFO(1X4)PCOT(70/30)MO",
    "https://example.com/photo1.jpg|https://example.com/photo2.jpg",
    "HAF0(PCOT)LO",
    "1",
    "HxFO(1X4)PCOT(70/30)MO",
    "1",
    "2026-01-11",
    "",
    "",
  ];
  const csv = [headers.map(escapeCsv).join(","), sample.map(escapeCsv).join(",")].join("\n");
  downloadFile("locations-import-template.csv", csv, "text/csv");
}

function downloadLocationImportErrorReport(){
  const validation = state.importPreview.validation || { errors: [], warnings: [] };
  const rawRows = state.importPreview.rawRows || [];
  const rawByRow = new Map(rawRows.map((row) => [String(row.__rowNumber ?? ""), row]));
  const issues = []
    .concat((validation.errors || []).map((entry) => ({ ...entry, level: "ERROR" })))
    .concat((validation.warnings || []).map((entry) => ({ ...entry, level: "WARN" })));
  if (!issues.length){
    toast("No issues", "No validation issues to export.");
    return;
  }
  const header = ["level", "row", "reason", "location_name", "latitude", "longitude", "billing_codes", "photo_urls"];
  const lines = [header.map(escapeCsv).join(",")];
  issues.forEach((issue) => {
    const rowKey = String(issue.row ?? "");
    const source = rawByRow.get(rowKey) || {};
    const billingCodes = Array.isArray(source.billing_codes) ? source.billing_codes.join(" | ") : "";
    const photoUrls = Array.isArray(source.photo_urls) ? source.photo_urls.join(" | ") : "";
    lines.push([
      issue.level,
      rowKey,
      issue.reason || "",
      source.location_name || "",
      source.latitude ?? "",
      source.longitude ?? "",
      billingCodes,
      photoUrls,
    ].map(escapeCsv).join(","));
  });
  downloadFile("locations-import-error-report.csv", lines.join("\n"), "text/csv");
}

function validateImportRows(rows){
  const invalidRows = [];
  rows.forEach((r) => {
    const nameOk = Boolean(r.location_name && String(r.location_name).trim());
    const lat = Number.parseFloat(r.latitude);
    const lng = Number.parseFloat(r.longitude);
    const latOk = Number.isFinite(lat) && lat >= -90 && lat <= 90;
    const lngOk = Number.isFinite(lng) && lng >= -180 && lng <= 180;
    if (!(nameOk && latOk && lngOk)) invalidRows.push(r.__rowNumber);
  });
  return invalidRows;
}

function showPendingPinMarker(latlng){
  ensureMap();
  if (!state.map.instance || !window.L || !latlng) return;
  clearPendingPinMarker();
  const coords = [latlng.lat, latlng.lng];
  const marker = window.L.circleMarker(coords, {
    radius: 8,
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.9,
    weight: 2,
    pane: MAP_PANES.pending,
    bubblingMouseEvents: false,
  });
  marker.addTo(state.map.instance);
  state.map.pendingMarker = marker;
}

function focusSiteOnMap(siteId){
  const siteKey = toSiteIdKey(siteId);
  if (!siteKey) return;
  const site = getVisibleSites().find((row) => toSiteIdKey(row?.id) === siteKey) || null;
  if (!site){
    toast("Site not found", "Site data unavailable.");
    return;
  }
  ensureMap();
  if (!state.map.instance) return;
  const coords = getSiteCoords(site);
  if (!coords){
    toast("Site has no coordinates", "Add coordinates to place this site on the map.");
    return;
  }
  const marker = state.map.markers.get(siteKey);
  dlog("focusSiteOnMap", {
    siteId: siteKey,
    resolvedSiteId: site?.id,
    coords: [coords.lat, coords.lng],
    hasMarker: Boolean(marker),
  });
  updateMapMarkers(getVisibleSites());
  let targetMarker = marker;
  if (!targetMarker && window.L){
    const color = site.is_pending ? "#f59e0b" : "#2f6feb";
    targetMarker = window.L.circleMarker([coords.lat, coords.lng], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.9,
      weight: 2,
      pane: MAP_PANES.pins,
      bubblingMouseEvents: false,
    });
    const pinsLayer = state.map.layers?.pins;
    if (pinsLayer?.addLayer) pinsLayer.addLayer(targetMarker);
    else targetMarker.addTo(state.map.instance);
    targetMarker.on("click", () => {
      const resolveSite = () => getVisibleSites().find((row) => toSiteIdKey(row?.id) === siteKey) || site;
      void handleSiteMarkerClick(targetMarker, siteKey, resolveSite);
    });
    bindSiteMarkerPopup(targetMarker, site, {
      requiredCodes: normalizeCodeList(getCodesRequiredForActiveProject()),
      siteCodes: getCachedSiteCodes(site.id),
      loadingCodes: false,
      sitePhotos: getCachedSitePhotos(site.id),
      loadingPhotos: false,
    });
    state.map.markers.set(siteKey, targetMarker);
    state.map.featureMarkerMeta.set(siteKey, { kind: "site", siteId: siteKey });
  }
  if (targetMarker?.getLatLng){
    const latLng = targetMarker.getLatLng();
    const zoom = Math.max(state.map.instance.getZoom() || 0, 17);
    state.map.instance.setView(latLng, zoom);
    if (targetMarker.openPopup) targetMarker.openPopup();
  }
}

const MAP_BASEMAP_STORAGE_KEY = "speccom.map.basemap";
const MAP_LAYER_VISIBILITY_KEY = "speccom.map.layerVisibility";
const MAP_BASEMAPS = {
  street: {
    label: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
  satellite: {
    label: "Satellite",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
};
const MAP_PANES = {
  boundary: "speccom-boundary-pane",
  spans: "speccom-spans-pane",
  kmz: "speccom-kmz-pane",
  pins: "speccom-pins-pane",
  photos: "speccom-photos-pane",
  highlight: "speccom-highlight-pane",
  pending: "speccom-pending-pane",
};

function buildSiteMarkerPopupHtml(site, {
  requiredCodes = [],
  siteCodes = null,
  loadingCodes = false,
  sitePhotos = [],
  loadingPhotos = false,
  pageIndex = 0,
  pageTotal = 1,
  nearbySites = [],
} = {}){
  const locationName = getSiteDisplayName(site);
  const siteId = toSiteIdKey(site?.id) || "-";
  const coords = getSiteCoords(site);
  const coordText = coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "-";
  const createdText = site?.created_at ? new Date(site.created_at).toLocaleString() : "-";
  const statusText = site?.is_pending ? t("siteStatusPending") : "Active";
  const effectiveSiteCodes = normalizeCodeList(siteCodes);
  const effectiveRequiredCodes = normalizeCodeList(requiredCodes);
  const showBillingCodes = effectiveSiteCodes.length > 0;
  const codesLabel = showBillingCodes ? "Billing Codes" : "Required Codes";
  const codesValue = loadingCodes
    ? "Loading..."
    : summarizeCodesForPopup(showBillingCodes ? effectiveSiteCodes : effectiveRequiredCodes);
  const notesRaw = String(site?.notes || "");
  const trimmedNotes = notesRaw.trim();
  const canManualProofEdit = !site?.is_pending && (SpecCom.helpers.isRoot() || isOwner());
  const canDeleteSite = !site?.is_pending && SpecCom.helpers.isRoot();
  const canEditSite = !site?.is_pending;
  const notesText = notesRaw.length > 240 ? `${notesRaw.slice(0, 237)}...` : notesRaw;
  const photos = normalizePopupPhotos(sitePhotos);
  const photosHtml = loadingPhotos
    ? `<div class="scSitePopup-photo-empty">Loading photos...</div>`
    : photos.length
      ? `<div class="scSitePopup-photos">${photos.map((item) => `
          <a class="photo" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
            <img src="${escapeHtml(item.url)}" alt="Site photo" loading="lazy" />
          </a>
        `).join("")}</div>`
      : `<div class="scSitePopup-photo-empty">No photos yet.</div>`;
  const total = Math.max(1, Number(pageTotal) || 1);
  const current = Math.max(0, Math.min(total - 1, Number(pageIndex) || 0));
  const pagerHtml = total > 1
    ? `
      <div class="scSitePopup-pager">
        <button type="button" class="nav" data-popup-nav="prev" aria-label="Previous location">&lt;</button>
        <span>${current + 1}/${total}</span>
        <button type="button" class="nav" data-popup-nav="next" aria-label="Next location">&gt;</button>
      </div>
    `
    : "";
  const listRows = Array.isArray(nearbySites) ? nearbySites : [];
  const locationsHtml = listRows.length > 1
    ? `
      <div class="scSitePopup-location-head">Locations (${listRows.length})</div>
      <div class="scSitePopup-location-list">
        ${listRows.map((row) => `
          <button type="button" class="item${row.active ? " is-active" : ""}" data-popup-index="${Number(row.index) || 0}">
            ${escapeHtml(row.label || "Site")}
          </button>
        `).join("")}
      </div>
    `
    : "";
  const editorDisabledAttr = canEditSite ? "" : " disabled";
  const manualDisabledAttr = canManualProofEdit ? "" : " disabled";
  const codesInputValue = effectiveSiteCodes.join(", ");
  const saveHint = canEditSite
    ? (canManualProofEdit ? "Edit fields and save." : "Name and billing codes can be edited here.")
    : "Pending locations are read-only.";
  const deleteButtonHtml = canDeleteSite
    ? `<button type="button" class="scSitePopup-action is-danger" data-popup-action="delete" data-popup-site-id="${escapeHtml(siteId)}">Delete location</button>`
    : "";
  return `
    <div class="scSitePopup" data-popup-site-id="${escapeHtml(siteId)}">
      <div class="scSitePopup-top">
        <div>
          <div class="scSitePopup-title">${escapeHtml(locationName)}</div>
          <div class="scSitePopup-sub">${escapeHtml(statusText)}</div>
        </div>
        ${pagerHtml}
      </div>
      ${locationsHtml}
      <div class="scSitePopup-grid">
        <div class="k">Location</div><div class="v">${escapeHtml(locationName)}</div>
        <div class="k">Site ID</div><div class="v">${escapeHtml(siteId)}</div>
        <div class="k">Coordinates</div><div class="v mono">${escapeHtml(coordText)}</div>
        <div class="k">${escapeHtml(codesLabel)}</div><div class="v">${escapeHtml(codesValue)}</div>
        <div class="k">Created</div><div class="v">${escapeHtml(createdText)}</div>
        ${trimmedNotes ? `<div class="k">Notes</div><div class="v">${escapeHtml(notesText)}</div>` : ""}
      </div>
      <div class="scSitePopup-edit-head">Edit</div>
      <div class="scSitePopup-edit-grid">
        <label class="scSitePopup-field">
          <span>Location</span>
          <input type="text" value="${escapeHtml(locationName)}" data-popup-field="name"${editorDisabledAttr} />
        </label>
        <label class="scSitePopup-field">
          <span>Billing Codes</span>
          <input type="text" value="${escapeHtml(codesInputValue)}" placeholder="${loadingCodes ? "Loading..." : "CODE-A, CODE-B"}" data-popup-field="codes"${editorDisabledAttr} />
        </label>
        <label class="scSitePopup-field">
          <span>Latitude</span>
          <input type="number" step="any" value="${coords ? escapeHtml(String(coords.lat)) : ""}" data-popup-field="lat"${manualDisabledAttr} />
        </label>
        <label class="scSitePopup-field">
          <span>Longitude</span>
          <input type="number" step="any" value="${coords ? escapeHtml(String(coords.lng)) : ""}" data-popup-field="lng"${manualDisabledAttr} />
        </label>
        <label class="scSitePopup-field is-full">
          <span>Notes</span>
          <textarea rows="3" data-popup-field="notes"${manualDisabledAttr}>${escapeHtml(notesRaw)}</textarea>
        </label>
      </div>
      <div class="scSitePopup-actions">
        <button type="button" class="scSitePopup-action" data-popup-action="save" data-popup-site-id="${escapeHtml(siteId)}"${editorDisabledAttr}>Save changes</button>
        ${deleteButtonHtml}
      </div>
      <div class="scSitePopup-edit-hint">${escapeHtml(saveHint)}</div>
      <div class="scSitePopup-photo-head">Photos</div>
      ${photosHtml}
    </div>
  `;
}

function bindSiteMarkerPopup(marker, site, options = {}){
  if (!marker || !site || typeof marker.bindPopup !== "function") return;
  marker.bindPopup(buildSiteMarkerPopupHtml(site, options), {
    className: "sc-site-popup",
    maxWidth: 520,
    minWidth: 280,
    autoPanPadding: [20, 20],
  });
}

function getSitesAtCoordinate(coords){
  if (!coords) return [];
  const key = `${coords.lat.toFixed(5)}|${coords.lng.toFixed(5)}`;
  return getVisibleSites()
    .map((site) => ({ site, coords: getSiteCoords(site) }))
    .filter((entry) => entry.coords && `${entry.coords.lat.toFixed(5)}|${entry.coords.lng.toFixed(5)}` === key)
    .map((entry) => entry.site)
    .sort((a, b) => String(getSiteDisplayName(a)).localeCompare(String(getSiteDisplayName(b))));
}

function setMapPopupSiteContext(marker, site){
  const coords = getSiteCoords(site);
  const currentSiteKey = toSiteIdKey(site?.id);
  const groupedSites = coords ? getSitesAtCoordinate(coords) : [];
  const siteKeys = (groupedSites.length ? groupedSites : [site])
    .map((row) => toSiteIdKey(row?.id))
    .filter(Boolean);
  state.map.popupSiteKeys = siteKeys;
  state.map.popupSiteIndex = Math.max(0, siteKeys.indexOf(currentSiteKey));
  if (state.map.popupSiteIndex < 0) state.map.popupSiteIndex = 0;
  state.map.popupMarker = marker || null;
  state.map.popupRequiredCodes = normalizeCodeList(getCodesRequiredForActiveProject());
}

function getMapPopupSnapshot(){
  const marker = state.map.popupMarker || null;
  const keys = Array.isArray(state.map.popupSiteKeys) ? state.map.popupSiteKeys : [];
  if (!marker || !keys.length) return null;
  const visibleSites = getVisibleSites();
  const byId = new Map(visibleSites.map((site) => [toSiteIdKey(site?.id), site]));
  const total = keys.length;
  let index = Number(state.map.popupSiteIndex);
  if (!Number.isFinite(index)) index = 0;
  index = ((index % total) + total) % total;
  const activeKey = keys[index];
  const site = byId.get(activeKey) || null;
  if (!site) return null;
  const nearby = keys
    .map((key, idx) => {
      const row = byId.get(key);
      if (!row) return null;
      return {
        index: idx,
        label: getSiteDisplayName(row),
        active: idx === index,
      };
    })
    .filter(Boolean);
  return {
    marker,
    site,
    index,
    total,
    nearby,
    requiredCodes: normalizeCodeList(state.map.popupRequiredCodes),
  };
}

async function renderMapPopupActiveSite({ syncSelection = true } = {}){
  const snap = getMapPopupSnapshot();
  if (!snap) return;
  const { marker, site, index, total, nearby, requiredCodes } = snap;
  const cachedCodes = getCachedSiteCodes(site.id);
  const cachedPhotos = getCachedSitePhotos(site.id);
  bindSiteMarkerPopup(marker, site, {
    requiredCodes,
    siteCodes: cachedCodes.length ? cachedCodes : null,
    loadingCodes: !cachedCodes.length,
    sitePhotos: cachedPhotos,
    loadingPhotos: !cachedPhotos.length,
    pageIndex: index,
    pageTotal: total,
    nearbySites: nearby,
  });
  if (marker.openPopup) marker.openPopup();
  if (syncSelection){
    handleMapFeatureSelection(buildSiteFeature(site), { siteId: toSiteIdKey(site.id), openOverview: false, tab: "feature" });
    if (typeof SpecCom.helpers.closePinOverview === "function"){
      SpecCom.helpers.closePinOverview();
    }
  }
  if (cachedCodes.length && cachedPhotos.length) return;
  try{
    const [siteCodes, sitePhotos] = await Promise.all([
      cachedCodes.length ? Promise.resolve(cachedCodes) : fetchSiteCodesForMapPopup(site.id),
      cachedPhotos.length ? Promise.resolve(cachedPhotos) : fetchSitePhotosForMapPopup(site.id),
    ]);
    const latest = getMapPopupSnapshot();
    if (!latest) return;
    if (toSiteIdKey(latest.site?.id) !== toSiteIdKey(site.id)) return;
    bindSiteMarkerPopup(latest.marker, latest.site, {
      requiredCodes: latest.requiredCodes,
      siteCodes,
      loadingCodes: false,
      sitePhotos,
      loadingPhotos: false,
      pageIndex: latest.index,
      pageTotal: latest.total,
      nearbySites: latest.nearby,
    });
    if (!latest.marker.isPopupOpen || latest.marker.isPopupOpen()){
      if (latest.marker.openPopup) latest.marker.openPopup();
    }
  } catch (error){
    debugLog("[map] marker popup update failed", error);
  }
}

function stepMapPopupSite(delta){
  const keys = Array.isArray(state.map.popupSiteKeys) ? state.map.popupSiteKeys : [];
  if (keys.length <= 1) return;
  const len = keys.length;
  const current = Number(state.map.popupSiteIndex) || 0;
  state.map.popupSiteIndex = ((current + delta) % len + len) % len;
  void renderMapPopupActiveSite({ syncSelection: true });
}

function jumpMapPopupSite(index){
  const keys = Array.isArray(state.map.popupSiteKeys) ? state.map.popupSiteKeys : [];
  if (!keys.length) return;
  const len = keys.length;
  let next = Number(index);
  if (!Number.isFinite(next)) return;
  next = Math.max(0, Math.min(len - 1, Math.floor(next)));
  if (next === state.map.popupSiteIndex) return;
  state.map.popupSiteIndex = next;
  void renderMapPopupActiveSite({ syncSelection: true });
}

function getVisibleSiteByIdKey(siteIdKey){
  const key = toSiteIdKey(siteIdKey);
  if (!key) return null;
  return getVisibleSites().find((row) => toSiteIdKey(row?.id) === key) || null;
}

function patchSiteInCollections(siteIdKey, patch){
  const key = toSiteIdKey(siteIdKey);
  if (!key || !patch || typeof patch !== "object") return;
  const applyPatch = (row) => (toSiteIdKey(row?.id) === key ? { ...row, ...patch } : row);
  state.projectSites = (state.projectSites || []).map(applyPatch);
  state.pendingSites = (state.pendingSites || []).map(applyPatch);
  if (isDemo){
    state.demo.sites = (state.demo.sites || []).map(applyPatch);
  }
  if (toSiteIdKey(state.activeSite?.id) === key){
    state.activeSite = getVisibleSiteByIdKey(key) || { ...(state.activeSite || {}), ...patch };
  }
}

async function saveMapPopupSiteEdits(siteIdKey, draft){
  const key = toSiteIdKey(siteIdKey);
  if (!key) return;
  const site = getVisibleSiteByIdKey(key);
  if (!site){
    toast("Site missing", "This location is no longer available.", "error");
    return;
  }
  if (site.is_pending){
    toast("Read only", "Pending locations cannot be edited from this popup.", "error");
    return;
  }
  const canManualProofEdit = SpecCom.helpers.isRoot() || isOwner();
  const nextName = String(draft?.name || "").trim() || getSiteDisplayName(site);
  const nextCodes = parseCodes(draft?.codes || "");
  const nextNotes = String(draft?.notes || "").trim();
  const latRaw = String(draft?.lat || "").trim();
  const lngRaw = String(draft?.lng || "").trim();
  const hasLat = latRaw !== "";
  const hasLng = lngRaw !== "";
  if (hasLat !== hasLng){
    toast("GPS invalid", "Enter both latitude and longitude, or leave both empty.", "error");
    return;
  }
  const hasGps = hasLat && hasLng;
  let latNum = null;
  let lngNum = null;
  if (hasGps){
    if (!canManualProofEdit){
      toast("Permission denied", "Only ROOT or OWNER can manually edit GPS and notes.", "error");
      return;
    }
    latNum = Number(latRaw);
    lngNum = Number(lngRaw);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)){
      toast("GPS invalid", "Enter valid numeric latitude/longitude.", "error");
      return;
    }
  }

  if (isDemo){
    const patch = {
      name: nextName,
    };
    if (canManualProofEdit){
      patch.notes = nextNotes;
    }
    if (hasGps){
      patch.gps_lat = latNum;
      patch.gps_lng = lngNum;
      patch.lat = latNum;
      patch.lng = lngNum;
    }
    patchSiteInCollections(key, patch);
    state.demo.siteCodes = (state.demo.siteCodes || []).filter((row) => toSiteIdKey(row?.site_id) !== key);
    const stamp = Date.now();
    state.demo.siteCodes.push(...nextCodes.map((code, idx) => ({
      id: `demo-code-${stamp}-${idx}`,
      site_id: site.id,
      code,
      created_at: nowISO(),
    })));
  } else {
    if (!state.client){
      toast("Update failed", "Client not ready.", "error");
      return;
    }
    const sitePayload = {
      name: nextName,
    };
    if (canManualProofEdit){
      sitePayload.notes = nextNotes;
    }
    if (hasGps){
      sitePayload.gps_lat = latNum;
      sitePayload.gps_lng = lngNum;
    }
    let updateRes = await state.client
      .from("sites")
      .update(sitePayload)
      .eq("id", site.id)
      .select("id")
      .single();
    if (updateRes.error && hasGps && isMissingGpsColumnError(updateRes.error)){
      const legacyPayload = {
        ...sitePayload,
        lat: latNum,
        lng: lngNum,
      };
      delete legacyPayload.gps_lat;
      delete legacyPayload.gps_lng;
      updateRes = await state.client
        .from("sites")
        .update(legacyPayload)
        .eq("id", site.id)
        .select("id")
        .single();
    }
    if (updateRes.error){
      toast("Save failed", updateRes.error.message || "Could not save site changes.", "error");
      return;
    }

    await state.client.from("site_codes").delete().eq("site_id", site.id);
    if (nextCodes.length){
      const { error: insertError } = await state.client
        .from("site_codes")
        .insert(nextCodes.map((code) => ({ site_id: site.id, code })));
      if (insertError){
        toast("Codes save error", insertError.message || "Could not update billing codes.", "error");
        return;
      }
    }

    const siteRes = await fetchSiteById(site.id);
    if (siteRes.error){
      toast("Refresh failed", siteRes.error.message || "Saved, but could not refresh location.", "error");
    } else if (siteRes.data){
      patchSiteInCollections(key, siteRes.data);
    } else {
      const fallbackPatch = { name: nextName };
      if (canManualProofEdit){
        fallbackPatch.notes = nextNotes;
      }
      if (hasGps){
        fallbackPatch.gps_lat = latNum;
        fallbackPatch.gps_lng = lngNum;
        fallbackPatch.lat = latNum;
        fallbackPatch.lng = lngNum;
      }
      patchSiteInCollections(key, fallbackPatch);
    }
  }

  setCachedSiteCodes(site.id, nextCodes);
  if (toSiteIdKey(state.activeSite?.id) === key){
    await loadSiteCodes(site.id);
  }
  renderSiteList();
  renderSitePanel();
  if (state.map.instance){
    const rows = getVisibleSites();
    updateMapMarkers(rows);
    renderDerivedMapLayers(rows);
  }
  const updatedSite = getVisibleSiteByIdKey(key);
  const marker = state.map.markers.get(key) || state.map.popupMarker || null;
  if (marker && updatedSite){
    setMapPopupSiteContext(marker, updatedSite);
    await renderMapPopupActiveSite({ syncSelection: true });
  }
  toast("Saved", "Popup details updated.");
}

async function deleteMapPopupSite(siteIdKey){
  const key = toSiteIdKey(siteIdKey);
  if (!key) return;
  const site = getVisibleSiteByIdKey(key);
  if (!site){
    toast("Site missing", "This location is no longer available.", "error");
    return;
  }
  if (!SpecCom.helpers.isRoot()){
    toast("Not allowed", "Root role required.");
    return;
  }
  state.activeSite = site;
  await SpecCom.helpers.deleteSiteFromPanel();
  if (getVisibleSiteByIdKey(key)){
    return;
  }
  const remaining = (state.map.popupSiteKeys || []).filter((id) => id !== key);
  state.map.popupSiteKeys = remaining;
  if (!remaining.length){
    if (state.map.popupMarker?.closePopup){
      state.map.popupMarker.closePopup();
    }
    state.map.popupSiteIndex = 0;
    state.map.popupMarker = null;
    return;
  }
  state.map.popupSiteIndex = Math.max(0, Math.min(state.map.popupSiteIndex, remaining.length - 1));
  const nextKey = remaining[state.map.popupSiteIndex];
  state.map.popupMarker = state.map.markers.get(nextKey) || state.map.popupMarker;
  await renderMapPopupActiveSite({ syncSelection: true });
}

async function handleSiteMarkerClick(marker, siteIdKey, resolveSite){
  const site = typeof resolveSite === "function" ? resolveSite() : null;
  if (!site) return;
  setMapPopupSiteContext(marker, site);
  await renderMapPopupActiveSite({ syncSelection: true });
}

const FEATURE_FIELD_LABELS = {
  id: "ID",
  type: "Type",
  name: "Name",
  location_name: "Location Name",
  project_id: "Project ID",
  created_at: "Created",
  updated_at: "Updated",
  gps_lat: "Latitude",
  gps_lng: "Longitude",
  notes: "Notes",
  status: "Status",
  labor_material_unit: "Labor/Material Unit",
  __kml_layer: "KMZ Layer",
  __import_group: "Import Group",
};
function getDefaultMapLayerVisibility(){
  return {
    boundary: true,
    pins: true,
    spans: true,
    kmz: true,
    photos: false,
  };
}
function normalizeBasemap(value){
  const key = String(value || "").toLowerCase().trim();
  return Object.prototype.hasOwnProperty.call(MAP_BASEMAPS, key) ? key : "street";
}
function getSavedBasemap(){
  const raw = safeLocalStorageGet(MAP_BASEMAP_STORAGE_KEY);
  return normalizeBasemap(raw || state.map.basemap || "street");
}
function saveBasemap(value){
  safeLocalStorageSet(MAP_BASEMAP_STORAGE_KEY, normalizeBasemap(value));
}
function getSavedLayerVisibility(){
  const defaults = getDefaultMapLayerVisibility();
  const raw = safeLocalStorageGet(MAP_LAYER_VISIBILITY_KEY);
  if (!raw) return defaults;
  try{
    const parsed = JSON.parse(raw);
    return {
      boundary: parsed?.boundary !== false,
      pins: parsed?.pins !== false,
      spans: parsed?.spans !== false,
      kmz: parsed?.kmz !== false,
      photos: parsed?.photos === true,
    };
  } catch {
    return defaults;
  }
}
function saveLayerVisibility(next){
  safeLocalStorageSet(MAP_LAYER_VISIBILITY_KEY, JSON.stringify(next || getDefaultMapLayerVisibility()));
}
function titleCaseKey(raw){
  return String(raw || "")
    .replace(/^_+/, "")
    .replace(/[_\s]+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
function getFeatureFieldLabel(key){
  const normalized = String(key || "").trim();
  if (!normalized) return "";
  return FEATURE_FIELD_LABELS[normalized] || titleCaseKey(normalized);
}
function formatFeatureFieldValue(value){
  if (value == null || value === "") return "-";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  const time = Date.parse(text);
  if (Number.isFinite(time) && /T/.test(text)){
    return new Date(time).toLocaleString();
  }
  return text;
}
function buildSiteFeature(site){
  const coords = getSiteCoords(site);
  return {
    type: "Feature",
    geometry: coords ? { type: "Point", coordinates: [coords.lng, coords.lat] } : null,
    properties: {
      id: site?.id || "",
      type: "PIN",
      name: getSiteDisplayName(site),
      project_id: site?.project_id || "",
      notes: site?.notes || "",
      created_at: site?.created_at || "",
      updated_at: site?.updated_at || "",
      status: site?.is_pending ? "Pending sync" : "Active",
      gps_lat: coords?.lat ?? "",
      gps_lng: coords?.lng ?? "",
    },
  };
}
function buildKmzFeatureFromRow(row, groupName = "KMZ Import"){
  const lat = Number(row?.latitude);
  const lng = Number(row?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      id: row?.id || row?.__rowNumber || "",
      type: "KMZ",
      name: row?.location_name || "KMZ Point",
      location_name: row?.location_name || "",
      notes: row?.notes || "",
      gps_lat: lat,
      gps_lng: lng,
      __kml_layer: row?.__kml_layer || "",
      __import_group: groupName,
    },
  };
}
function clearFeatureHighlight(){
  const layer = state.map.highlightLayer;
  if (!layer || !state.map.instance) return;
  try{
    state.map.instance.removeLayer(layer);
  } catch {}
  state.map.highlightLayer = null;
}
function drawFeatureHighlight(feature){
  clearFeatureHighlight();
  if (!state.map.instance || !window.L || !feature?.geometry) return;
  const geom = feature.geometry;
  let layer = null;
  if (geom.type === "Point"){
    const c = geom.coordinates || [];
    const lat = Number(c[1]);
    const lng = Number(c[0]);
    if (Number.isFinite(lat) && Number.isFinite(lng)){
      layer = window.L.circleMarker([lat, lng], {
        radius: 12,
        color: "#f97316",
        fillColor: "#f97316",
        fillOpacity: 0.14,
        weight: 3,
        interactive: false,
        pane: MAP_PANES.highlight,
      }).addTo(state.map.instance);
    }
  } else if (geom.type === "LineString"){
    const pts = (geom.coordinates || []).map((c) => [Number(c[1]), Number(c[0])]).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (pts.length){
      layer = window.L.polyline(pts, {
        color: "#f97316",
        weight: 5,
        opacity: 0.9,
        interactive: false,
        pane: MAP_PANES.highlight,
      }).addTo(state.map.instance);
    }
  }
  state.map.highlightLayer = layer || null;
}
function setFeatureTab(tab){
  const nextTab = String(tab || "summary").toLowerCase();
  state.map.selectedTab = ["summary", "photos", "billing", "notes"].includes(nextTab) ? nextTab : "summary";
  const wrap = $("featureDrawerCard");
  if (wrap){
    wrap.querySelectorAll("[data-feature-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.featureTab === state.map.selectedTab);
    });
  }
  renderFeatureDrawer();
}
function featurePagerDelta(delta){
  const set = state.map.selectedSet || [];
  if (!set.length) return;
  const len = set.length;
  const current = Number(state.map.selectedIndex) || 0;
  const next = (current + delta + len) % len;
  setSelectedFeatureByIndex(next);
}
function setSelectedFeatureByIndex(index){
  const set = state.map.selectedSet || [];
  if (!set.length) return;
  let next = Number(index);
  if (!Number.isFinite(next)) next = 0;
  next = Math.max(0, Math.min(set.length - 1, next));
  state.map.selectedIndex = next;
  state.map.selectedFeature = set[next] || null;
  drawFeatureHighlight(state.map.selectedFeature);
  renderFeatureDrawer();
}
function getFeatureSetByPoint(lat, lng){
  const rows = getSiteSearchResultSet().rows || [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const key = `${lat.toFixed(5)}|${lng.toFixed(5)}`;
  const points = rows
    .map((site) => ({ site, coords: getSiteCoords(site) }))
    .filter((entry) => entry.coords)
    .filter((entry) => `${entry.coords.lat.toFixed(5)}|${entry.coords.lng.toFixed(5)}` === key)
    .map((entry) => buildSiteFeature(entry.site));
  return points;
}
function handleMapFeatureSelection(feature, options = {}){
  if (!feature) return;
  const geom = feature.geometry || null;
  if (geom?.type === "Point"){
    const lat = Number(geom.coordinates?.[1]);
    const lng = Number(geom.coordinates?.[0]);
    const selectedSet = getFeatureSetByPoint(lat, lng);
    state.map.selectedSet = selectedSet.length ? selectedSet : [feature];
    state.map.selectedIndex = Math.max(0, state.map.selectedSet.findIndex((f) => String(f?.properties?.id || "") === String(feature?.properties?.id || "")));
  } else {
    state.map.selectedSet = [feature];
    state.map.selectedIndex = 0;
  }
  if (state.map.selectedIndex < 0) state.map.selectedIndex = 0;
  state.map.selectedFeature = state.map.selectedSet[state.map.selectedIndex] || feature;
  drawFeatureHighlight(state.map.selectedFeature);
  const targetTab = normalizeDrawerTab(options?.tab || "feature");
  if (options?.siteId){
    setActiveSite(options.siteId, {
      openOverview: options.openOverview === true,
      autoDrawerTab: targetTab === "site",
    });
  }
  switchSidebarTab(targetTab);
  setFeatureTab(state.map.selectedTab || "summary");
}
function closeFeatureDrawer(){
  state.map.selectedFeature = null;
  state.map.selectedSet = [];
  state.map.selectedIndex = 0;
  clearFeatureHighlight();
  renderFeatureDrawer();
}
function renderFeatureDrawer(){
  const titleEl = $("featureDrawerTitle");
  const subEl = $("featureDrawerSubTitle");
  const bodyEl = $("featureDrawerBody");
  const pagerEl = $("featureDrawerPager");
  const pagerTextEl = $("featureDrawerPagerText");
  if (!titleEl || !subEl || !bodyEl) return;
  const feature = state.map.selectedFeature || null;
  if (!feature){
    titleEl.textContent = "Feature details";
    subEl.textContent = "Select a map feature.";
    bodyEl.innerHTML = `<div class="muted small">No feature selected.</div>`;
    if (pagerEl) pagerEl.style.display = "none";
    return;
  }
  const props = feature.properties || {};
  const label = String(props.name || props.location_name || props.id || "Feature").trim();
  titleEl.textContent = label || "Feature";
  subEl.textContent = `${props.type || "Feature"} ${props.id ? `#${props.id}` : ""}`.trim();
  const selectedSet = state.map.selectedSet || [];
  if (pagerEl){
    pagerEl.style.display = selectedSet.length > 1 ? "" : "none";
  }
  if (pagerTextEl){
    pagerTextEl.textContent = `${Math.min((state.map.selectedIndex || 0) + 1, Math.max(1, selectedSet.length))}/${Math.max(1, selectedSet.length)}`;
  }
  const tab = state.map.selectedTab || "summary";
  if (tab === "summary"){
    const entries = Object.entries(props).filter(([key]) => !String(key).startsWith("__"));
    bodyEl.innerHTML = `
      <div class="feature-kv">
        ${entries.map(([key, value]) => `
          <div class="feature-kv-row">
            <div class="feature-kv-key">${escapeHtml(getFeatureFieldLabel(key))}</div>
            <div class="feature-kv-val">${escapeHtml(formatFeatureFieldValue(value))}</div>
          </div>
        `).join("")}
      </div>
    `;
    return;
  }
  if (tab === "photos"){
    bodyEl.innerHTML = `<div class="muted small">Photo records will appear here when available for this feature.</div>`;
    return;
  }
  if (tab === "billing"){
    bodyEl.innerHTML = `<div class="muted small">Billing details scaffold is ready for this feature.</div>`;
    return;
  }
  bodyEl.innerHTML = `<div class="muted small">${escapeHtml(String(props.notes || "No notes available."))}</div>`;
}
function ensureMapLayerRegistry(){
  if (!state.map.instance || !window.L) return;
  if (state.map.layers?.pins) return;
  state.map.layers = {
    boundary: window.L.layerGroup(),
    pins: window.L.layerGroup(),
    spans: window.L.layerGroup(),
    kmz: window.L.layerGroup(),
    photos: window.L.layerGroup(),
  };
  applyMapLayerVisibility();
}
function applyMapLayerVisibility(){
  if (!state.map.instance) return;
  const map = state.map.instance;
  const vis = state.map.layerVisibility || getDefaultMapLayerVisibility();
  const layers = state.map.layers || {};
  const apply = (name) => {
    const layer = layers[name];
    if (!layer) return;
    if (vis[name]){
      if (!map.hasLayer(layer)) map.addLayer(layer);
    } else if (map.hasLayer(layer)){
      map.removeLayer(layer);
    }
  };
  ["boundary", "pins", "spans", "kmz", "photos"].forEach(apply);
}
function syncMapLayerToggles(){
  const vis = state.map.layerVisibility || getDefaultMapLayerVisibility();
  const lookup = {
    boundary: $("mapLayerBoundary"),
    pins: $("mapLayerPins"),
    spans: $("mapLayerSpans"),
    kmz: $("mapLayerKmz"),
    photos: $("mapLayerPhotos"),
  };
  Object.entries(lookup).forEach(([key, el]) => {
    if (el) el.checked = Boolean(vis[key]);
  });
}
function renderMapLayerPanel(){
  syncMapLayerToggles();
  const groups = Array.from(state.map.kmzImportGroups?.keys() || []);
  const kmzEnabled = Boolean((state.map.layerVisibility || getDefaultMapLayerVisibility()).kmz);
  const availableCatalog = getOrderedKmzLayerList(state.map.kmzLayerCatalog || groups);
  const placesCatalog = getOrderedKmzLayerList(state.map.kmzLayerCatalog || groups, { includeCritical: true });
  const kmzList = $("mapKmzGroupList");
  if (kmzList){
    if (!availableCatalog.length){
      kmzList.textContent = "KMZ groups: none loaded.";
    } else {
      kmzList.textContent = `KMZ groups: ${availableCatalog.join(", ")}`;
    }
  }
  const placesTree = $("placesLayerTree");
  if (!placesTree) return;
  placesTree.innerHTML = placesCatalog.map((groupName) => {
    const hasGroup = state.map.kmzImportGroups?.has(groupName);
    const checked = state.map.kmzGroupVisibility.get(groupName) !== false;
    const checkedAttr = checked ? " checked" : "";
    const nodeClass = hasGroup ? "places-node" : "places-node is-muted";
    const titleAttr = hasGroup ? "" : ` title="No features loaded for ${escapeHtml(groupName)} yet."`;
    return `
      <label class="${nodeClass}"${titleAttr}>
        <input type="checkbox" data-kmz-group="${escapeHtml(groupName)}"${checkedAttr} />
        <span class="label">${escapeHtml(groupName)}</span>
      </label>
    `;
  }).join("");
}

function setKmzGroupVisibility(groupName, visible){
  const key = canonicalKmzLayerName(groupName);
  if (!key) return;
  if (!state.map.kmzGroupVisibility) state.map.kmzGroupVisibility = new Map();
  const isVisible = Boolean(visible);
  state.map.kmzGroupVisibility.set(key, isVisible);
  if (isVisible && state.map.layerVisibility?.kmz === false){
    setMapLayerVisibility("kmz", true);
  }
  const group = state.map.kmzImportGroups?.get(key);
  const kmzLayer = state.map.layers?.kmz;
  if (group && kmzLayer){
    try{
      if (isVisible && (state.map.layerVisibility?.kmz !== false)){
        if (kmzLayer.addLayer) kmzLayer.addLayer(group);
      } else if (kmzLayer.removeLayer){
        kmzLayer.removeLayer(group);
      }
    } catch {}
  }
  renderMapLayerPanel();
}

function syncKmzPreviewGroups(){
  const kmzLayer = state.map.layers?.kmz;
  if (!kmzLayer || !state.map.kmzImportGroups?.size) return;
  const kmzVisible = state.map.layerVisibility?.kmz !== false;
  state.map.kmzImportGroups.forEach((group, key) => {
    const groupVisible = state.map.kmzGroupVisibility.get(key) !== false;
    try{
      if (kmzVisible && groupVisible){
        if (kmzLayer.addLayer) kmzLayer.addLayer(group);
      } else if (kmzLayer.removeLayer){
        kmzLayer.removeLayer(group);
      }
    } catch {}
  });
}

function setMapLayerVisibility(name, visible){
  const next = {
    ...(state.map.layerVisibility || getDefaultMapLayerVisibility()),
    [name]: Boolean(visible),
  };
  state.map.layerVisibility = next;
  saveLayerVisibility(next);
  applyMapLayerVisibility();
  if (name === "kmz"){
    syncKmzPreviewGroups();
  }
  renderMapLayerPanel();
}
function setMapBasemap(nextBasemap){
  const basemap = normalizeBasemap(nextBasemap);
  state.map.basemap = basemap;
  saveBasemap(basemap);
  const map = state.map.instance;
  if (!map) return;
  const layers = state.map.basemapLayers || {};
  if (!layers.street || !layers.satellite) return;
  Object.values(layers).forEach((layer) => {
    if (layer && map.hasLayer(layer)) map.removeLayer(layer);
  });
  state.map.basemapLayer = layers[basemap];
  if (state.map.basemapLayer) state.map.basemapLayer.addTo(map);
  const select = $("mapBasemapSelect");
  if (select) select.value = basemap;
}
function registerMapUiBindings(){
  if (state.map.uiBound) return;
  state.map.uiBound = true;
  const basemapSelect = $("mapBasemapSelect");
  if (basemapSelect){
    basemapSelect.addEventListener("change", (e) => setMapBasemap(e.target.value));
  }
  const layerMap = [
    ["mapLayerBoundary", "boundary"],
    ["mapLayerPins", "pins"],
    ["mapLayerSpans", "spans"],
    ["mapLayerKmz", "kmz"],
    ["mapLayerPhotos", "photos"],
  ];
  layerMap.forEach(([id, name]) => {
    const input = $(id);
    if (!input) return;
    input.addEventListener("change", (e) => setMapLayerVisibility(name, Boolean(e.target.checked)));
  });
  const closeBtn = $("btnFeatureDrawerClose");
  if (closeBtn){
    closeBtn.addEventListener("click", () => closeFeatureDrawer());
  }
  const prevBtn = $("btnFeaturePrev");
  if (prevBtn){
    prevBtn.addEventListener("click", () => featurePagerDelta(-1));
  }
  const nextBtn = $("btnFeatureNext");
  if (nextBtn){
    nextBtn.addEventListener("click", () => featurePagerDelta(1));
  }
  const drawer = $("featureDrawerCard");
  if (drawer){
    drawer.addEventListener("click", (e) => {
      const tabBtn = e.target.closest("[data-feature-tab]");
      if (!tabBtn) return;
      setFeatureTab(tabBtn.dataset.featureTab || "summary");
    });
  }
  const mapEl = $("liveMap");
  if (mapEl){
    mapEl.addEventListener("click", (e) => {
      const popupRoot = e.target.closest(".scSitePopup");
      if (!popupRoot) return;
      const navBtn = e.target.closest("[data-popup-nav]");
      if (navBtn){
        e.preventDefault();
        e.stopPropagation();
        const dir = String(navBtn.dataset.popupNav || "").toLowerCase();
        if (dir === "prev") stepMapPopupSite(-1);
        else if (dir === "next") stepMapPopupSite(1);
        return;
      }
      const siteBtn = e.target.closest("[data-popup-index]");
      if (siteBtn){
        e.preventDefault();
        e.stopPropagation();
        jumpMapPopupSite(siteBtn.dataset.popupIndex);
        return;
      }
      const saveBtn = e.target.closest("[data-popup-action='save']");
      if (saveBtn){
        e.preventDefault();
        e.stopPropagation();
        if (saveBtn.disabled) return;
        const siteKey = String(saveBtn.dataset.popupSiteId || popupRoot.dataset.popupSiteId || "").trim();
        const getValue = (field) => String(popupRoot.querySelector(`[data-popup-field="${field}"]`)?.value || "");
        const payload = {
          name: getValue("name"),
          codes: getValue("codes"),
          lat: getValue("lat"),
          lng: getValue("lng"),
          notes: getValue("notes"),
        };
        saveBtn.disabled = true;
        void saveMapPopupSiteEdits(siteKey, payload)
          .finally(() => {
            saveBtn.disabled = false;
          });
        return;
      }
      const deleteBtn = e.target.closest("[data-popup-action='delete']");
      if (deleteBtn){
        e.preventDefault();
        e.stopPropagation();
        if (deleteBtn.disabled) return;
        const siteKey = String(deleteBtn.dataset.popupSiteId || popupRoot.dataset.popupSiteId || "").trim();
        deleteBtn.disabled = true;
        void deleteMapPopupSite(siteKey)
          .finally(() => {
            deleteBtn.disabled = false;
          });
      }
    });
  }
  const menuModal = $("menuModal");
  if (menuModal){
    menuModal.addEventListener("click", (e) => {
      const parentBtn = e.target.closest("[data-places-expand]");
      if (!parentBtn) return;
      const groupKey = String(parentBtn.dataset.placesExpand || "").trim();
      if (!groupKey) return;
      const children = menuModal.querySelector(`[data-places-group="${groupKey}"]`);
      parentBtn.classList.toggle("is-open");
      if (children){
        children.classList.toggle("is-open", parentBtn.classList.contains("is-open"));
      }
    });
    menuModal.addEventListener("change", (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement)) return;
      const groupName = String(input.dataset.kmzGroup || "").trim();
      if (!groupName) return;
      setKmzGroupVisibility(groupName, input.checked);
    });
  }
}
function renderKmzPreviewFeatures(rows, sourceName = "KMZ Import"){
  ensureMap();
  if (!state.map.instance || !window.L) return;
  const kmzLayer = state.map.layers?.kmz;
  if (!kmzLayer) return;
  if (!state.map.kmzImportGroups) state.map.kmzImportGroups = new Map();
  if (!state.map.kmzGroupVisibility) state.map.kmzGroupVisibility = new Map();
  if (state.map.kmzImportGroups.size){
    state.map.kmzImportGroups.forEach((group) => {
      try{
        if (kmzLayer?.removeLayer) kmzLayer.removeLayer(group);
      } catch {}
    });
    state.map.kmzImportGroups.clear();
  }
  const groupsByLayer = new Map();
  (rows || []).forEach((row) => {
    const layerName = canonicalKmzLayerName(row?.__kml_layer || row?.__kml_layer_raw || sourceName || "KMZ");
    const key = layerName || "KMZ";
    if (!groupsByLayer.has(key)){
      groupsByLayer.set(key, window.L.layerGroup());
    }
    const feature = buildKmzFeatureFromRow({ ...row, __kml_layer: key }, key);
    if (!feature) return;
    const lat = feature.geometry.coordinates[1];
    const lng = feature.geometry.coordinates[0];
    const marker = window.L.circleMarker([lat, lng], {
      radius: 6,
      color: "#7c3aed",
      fillColor: "#7c3aed",
      fillOpacity: 0.8,
      weight: 2,
      pane: MAP_PANES.kmz,
      bubblingMouseEvents: false,
    });
    marker.on("click", () => handleMapFeatureSelection(feature));
    marker.bindPopup(`<b>${escapeHtml(feature.properties.name || "KMZ Point")}</b><br>${escapeHtml(feature.properties.__kml_layer || key)}`);
    groupsByLayer.get(key).addLayer(marker);
  });
  groupsByLayer.forEach((group, key) => {
    const groupVisible = state.map.kmzGroupVisibility.get(key) !== false;
    if (groupVisible){
      kmzLayer.addLayer(group);
    }
    state.map.kmzGroupVisibility.set(key, groupVisible);
    state.map.kmzImportGroups.set(key, group);
  });
  const layerCatalog = getOrderedKmzLayerList([
    ...(state.map.kmzLayerCatalog || []),
    ...(rows?.__kmlLayerNames || []),
    ...(rows || []).map((row) => row?.__kml_layer || row?.__kml_layer_raw),
  ]);
  state.map.kmzLayerCatalog = layerCatalog;
  renderMapLayerPanel();
}

function ensureMapPanes(){
  const map = state.map.instance;
  if (!map || !window.L) return;
  const panes = [
    [MAP_PANES.boundary, 410],
    [MAP_PANES.spans, 420],
    [MAP_PANES.kmz, 430],
    [MAP_PANES.pins, 440],
    [MAP_PANES.photos, 450],
    [MAP_PANES.highlight, 460],
    [MAP_PANES.pending, 470],
  ];
  panes.forEach(([name, zIndex]) => {
    const pane = map.getPane(name) || map.createPane(name);
    pane.style.zIndex = String(zIndex);
  });
}

function ensureMap(){
  if (state.map.instance || !window.L) return;
  const mapEl = $("liveMap");
  if (!mapEl) return;
  const map = window.L.map(mapEl).setView([39.5, -98.35], 4);
  const street = window.L.tileLayer(MAP_BASEMAPS.street.url, {
    attribution: MAP_BASEMAPS.street.attribution,
    maxZoom: MAP_BASEMAPS.street.maxZoom,
  });
  const satellite = window.L.tileLayer(MAP_BASEMAPS.satellite.url, {
    attribution: MAP_BASEMAPS.satellite.attribution,
    maxZoom: MAP_BASEMAPS.satellite.maxZoom,
  });
  state.map.basemapLayers = { street, satellite };
  state.map.basemap = getSavedBasemap();
  state.map.basemapLayer = state.map.basemap === "satellite" ? satellite : street;
  state.map.basemapLayer.addTo(map);
  state.map.layerVisibility = getSavedLayerVisibility();
  window.__speccomMap = map;
  state.map.instance = map;
  ensureMapPanes();
  initMapWorkspaceUi();
  applyDrawerUiState();
  ensureMapLayerRegistry();
  applyMapLayerVisibility();
  registerMapUiBindings();
  renderMapLayerPanel();
  setMapBasemap(state.map.basemap);
  renderFeatureDrawer();
  map.on("click", async (event) => {
    const latlng = event?.latlng;
    if (!latlng){
      toast("Pin error", "Invalid map location.");
      return;
    }
    state.map.pendingLatLng = { lat: latlng.lat, lng: latlng.lng };
    dlog("[map click]", latlng.lat, latlng.lng);
    showPendingPinMarker(latlng);
    if (!state.map.dropPinMode) return;
    state.map.dropPinMode = false;
    const targetSiteId = state.map.pinTargetSiteId;
    state.map.pinTargetSiteId = null;
    if (targetSiteId){
      await updateSiteLocationFromMapClick(targetSiteId, { lat: latlng.lat, lng: latlng.lng });
    }
  });
}

async function loadLocationNames(userIds){
  if (!state.client || !userIds.length) return;
  const { data } = await state.client
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  (data || []).forEach((row) => {
    if (row?.id) state.map.userNames.set(row.id, row.display_name || "");
  });
}

function updateMapMarkers(rows){
  if (!state.map.instance) return;
  ensureMapLayerRegistry();
  const pinsLayer = state.map.layers?.pins;
  const activeSearch = String(state.mapFilters.search || "").trim();
  const renderRows = activeSearch ? getSiteSearchResultSet().rows : (rows || []);
  const requiredCodesRaw = getCodesRequiredForActiveProject();
  const requiredCodes = Array.isArray(requiredCodesRaw) ? requiredCodesRaw : [];
  const markers = state.map.markers;
  const seen = new Set();
  renderRows.forEach((row) => {
    const coords = getSiteCoords(row);
    if (!coords){
      debugLog("[map] missing coordinates", row);
      return;
    }
    const id = toSiteIdKey(row?.id);
    if (!id) return;
    const markerCoords = [coords.lat, coords.lng];
    let marker = markers.get(id);
    const color = row.is_pending ? "#f59e0b" : "#2f6feb";
    if (!marker){
      marker = window.L.circleMarker(markerCoords, {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 2,
        pane: MAP_PANES.pins,
        bubblingMouseEvents: false,
      });
      const resolveSite = () => {
        return getVisibleSites().find((item) => toSiteIdKey(item?.id) === id) || row;
      };
      if (pinsLayer?.addLayer) pinsLayer.addLayer(marker);
      else marker.addTo(state.map.instance);
      marker.on("click", () => {
        void handleSiteMarkerClick(marker, id, resolveSite);
      });
      markers.set(id, marker);
      state.map.featureMarkerMeta.set(id, { kind: "site", siteId: id });
    } else {
      marker.setLatLng(markerCoords);
      if (marker.setStyle){
        marker.setStyle({ color, fillColor: color });
      }
    }
    bindSiteMarkerPopup(marker, row, {
      requiredCodes,
      siteCodes: getCachedSiteCodes(row.id),
      loadingCodes: false,
      sitePhotos: getCachedSitePhotos(row.id),
      loadingPhotos: false,
    });
    try{
      const loc = row.name || row.address || row.label || row.location_name || `Site ${row.id || ""}`.trim();
      const hoverCodes = normalizeCodeList(getCachedSiteCodes(row.id));
      const fallbackCodes = hoverCodes.length ? hoverCodes : requiredCodes;
      const codeText = fallbackCodes.length ? fallbackCodes.slice(0, 8).join(" | ") : "(none)";
      const more = fallbackCodes.length > 8 ? ` | +${fallbackCodes.length - 8} more` : "";
      const tooltipHtml = `
        <div class="scHoverTip">
          <div class="t1">${escapeHtml(loc)}</div>
          <div class="t2">Codes: ${escapeHtml(codeText + more)}</div>
        </div>
      `;
      const existingTooltip = typeof marker.getTooltip === "function" ? marker.getTooltip() : null;
      if (existingTooltip && typeof marker.setTooltipContent === "function"){
        marker.setTooltipContent(tooltipHtml);
      } else if (typeof marker.bindTooltip === "function"){
        marker.bindTooltip(tooltipHtml, {
          direction: "top",
          sticky: true,
          opacity: 0.97,
          className: "sc-hover-tooltip",
          interactive: false,
        });
      }
    } catch (error){
      debugLog("[map] tooltip render failed", error);
    }
    seen.add(id);
  });
  markers.forEach((marker, id) => {
    if (!seen.has(id)){
      if (pinsLayer?.removeLayer) pinsLayer.removeLayer(marker);
      else state.map.instance.removeLayer(marker);
      markers.delete(id);
      state.map.featureMarkerMeta.delete(id);
    }
  });
}

function renderDerivedMapLayers(rows){
  if (!state.map.instance || !window.L) return;
  ensureMapLayerRegistry();
  const boundaryLayer = state.map.layers?.boundary;
  const spansLayer = state.map.layers?.spans;
  const photosLayer = state.map.layers?.photos;
  if (boundaryLayer?.clearLayers) boundaryLayer.clearLayers();
  if (spansLayer?.clearLayers) spansLayer.clearLayers();
  if (photosLayer?.clearLayers) photosLayer.clearLayers();

  const sites = (rows || []).map((site) => ({ site, coords: getSiteCoords(site) })).filter((x) => x.coords);
  if (sites.length >= 2 && boundaryLayer){
    const points = sites.map((x) => [x.coords.lat, x.coords.lng]);
    const bounds = window.L.latLngBounds(points);
    const rectangle = window.L.rectangle(bounds, {
      color: "#0ea5e9",
      weight: 2,
      fillOpacity: 0.05,
      dashArray: "6 4",
      pane: MAP_PANES.boundary,
    });
    rectangle.on("click", () => {
      const feature = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [bounds.getWest(), bounds.getSouth()],
            [bounds.getEast(), bounds.getSouth()],
            [bounds.getEast(), bounds.getNorth()],
            [bounds.getWest(), bounds.getNorth()],
            [bounds.getWest(), bounds.getSouth()],
          ]],
        },
        properties: {
          id: state.activeProject?.id || "",
          type: "BOUNDARY",
          name: `${state.activeProject?.name || "Project"} Boundary`,
          project_id: state.activeProject?.id || "",
          points: sites.length,
        },
      };
      handleMapFeatureSelection(feature);
    });
    boundaryLayer.addLayer(rectangle);
  }
  if (sites.length >= 2 && spansLayer){
    const ordered = sites.slice().sort((a, b) => String(a.site?.name || "").localeCompare(String(b.site?.name || "")));
    const linePoints = ordered.map((x) => [x.coords.lat, x.coords.lng]);
    const span = window.L.polyline(linePoints, {
      color: "#14b8a6",
      weight: 3,
      opacity: 0.85,
      pane: MAP_PANES.spans,
    });
    span.on("click", () => {
      const feature = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: ordered.map((x) => [x.coords.lng, x.coords.lat]),
        },
        properties: {
          id: `${state.activeProject?.id || "project"}-span`,
          type: "SPAN",
          name: `${state.activeProject?.name || "Project"} Path`,
          project_id: state.activeProject?.id || "",
          segment_count: Math.max(0, ordered.length - 1),
        },
      };
      handleMapFeatureSelection(feature);
    });
    spansLayer.addLayer(span);
  }
  if (photosLayer){
    (state.siteMedia || []).forEach((row, idx) => {
      const lat = Number(row?.gps_lat);
      const lng = Number(row?.gps_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = window.L.circleMarker([lat, lng], {
        radius: 5,
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 0.85,
        weight: 2,
        pane: MAP_PANES.photos,
        bubblingMouseEvents: false,
      });
      const feature = {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          id: row?.id || idx + 1,
          type: "PHOTO",
          name: state.activeSite ? `${getSiteDisplayName(state.activeSite)} Photo` : "Photo Marker",
          created_at: row?.created_at || "",
          gps_lat: lat,
          gps_lng: lng,
        },
      };
      marker.on("click", () => handleMapFeatureSelection(feature));
      photosLayer.addLayer(marker);
    });
  }
}

async function refreshLocations(){
  const status = $("mapStatus");
  if (!state.client && !isDemo) return;
  if (!state.user){
    if (status) status.textContent = t("mapStatusSignin");
    return;
  }
  ensureMap();
  await loadProjectSites(state.activeProject?.id || null);
  const searchResult = getSiteSearchResultSet();
  const rows = searchResult.rows;
  updateMapMarkers(rows);
  renderDerivedMapLayers(rows);
  renderMapLayerPanel();
  renderFeatureDrawer();
  updateSiteSearchUiSummary(searchResult);
  if (status){
    if (!state.activeProject){
      status.textContent = t("mapStatusNoProject");
    } else if (!rows.length){
      status.textContent = searchResult.rawQuery ? "No matching sites." : t("mapStatusNoSites");
    } else {
      status.textContent = searchResult.rawQuery
        ? `${rows.length} match${rows.length === 1 ? "" : "es"}`
        : t("mapStatusSites", { count: rows.length });
    }
  }
}

function showProfileSetupModal(show){
  const modal = $("profileSetupModal");
  if (!modal) return;
  modal.style.display = show ? "flex" : "none";
}

function syncLanguageControls(){
  const lang = getPreferredLanguage();
  const select = $("languageSelect");
  if (select) select.value = lang;
  const profileSelect = $("profileLanguageSelect");
  if (profileSelect) profileSelect.value = lang;
  syncMenuLanguageToggle();
}

function syncMenuLanguageToggle(){
  const lang = getPreferredLanguage();
  document.querySelectorAll("#menuModal .segmented-btn").forEach((btn) => {
    const btnLang = btn.getAttribute("data-lang");
    btn.classList.toggle("active", btnLang === lang);
  });
}

async function savePreferredLanguage(lang, { closeModal = false } = {}){
  const next = normalizeLanguage(lang);
  setPreferredLanguage(next);
  syncLanguageControls();
  if (!state.user || !state.client || isDemo){
    if (closeModal) showProfileSetupModal(false);
    return;
  }
  if (state.profile){
    try{
      const { error } = await state.client
        .from("profiles")
        .update({ preferred_language: next })
        .eq("id", state.user.id);
      if (error){
        const message = String(error.message || "").toLowerCase();
        if (error.status === 400 || message.includes("preferred_language")){
          safeLocalStorageSet("preferred_language", next);
          console.warn("preferred_language missing; using local fallback");
          if (closeModal) showProfileSetupModal(false);
          return;
        }
        toast("Language save failed", error.message);
        return;
      }
    } catch (err){
      console.warn("preferred_language missing; using local fallback", err);
      safeLocalStorageSet("preferred_language", next);
      if (closeModal) showProfileSetupModal(false);
      return;
    }
  } else {
    try{
      const { error } = await state.client
        .from("profiles")
        .insert({
          id: state.user.id,
          display_name: state.user?.email || null,
          preferred_language: next,
          role: DEFAULT_ROLE,
          role_code: DEFAULT_ROLE,
        });
      if (error){
        const message = String(error.message || "").toLowerCase();
        if (error.status === 400 || message.includes("preferred_language")){
          safeLocalStorageSet("preferred_language", next);
          console.warn("preferred_language missing; using local fallback");
          if (closeModal) showProfileSetupModal(false);
          return;
        }
        toast("Profile needed", "Ask an Admin to create your profile. Language saved locally.");
      }
    } catch (err){
      console.warn("preferred_language missing; using local fallback", err);
      safeLocalStorageSet("preferred_language", next);
      if (closeModal) showProfileSetupModal(false);
      return;
    }
  }
  await loadProfile(state.client, state.user?.id);
  if (closeModal){
    showProfileSetupModal(!(state.profile && state.profile.preferred_language));
  }
}

function refreshLanguageSensitiveUI(){
  renderNodeCards();
  renderLocations();
  renderInventory();
  renderBillingLocations();
  renderBillingDetail();
  renderInvoicePanel();
  renderAlerts();
  renderTechnicianDashboard();
  renderLaborTable();
  renderTechnicianWorkOrders();
  renderDispatchTable();
  renderDispatchWarnings();
  syncDispatchStatusFilter();
  renderProjectsList();
  applyMessagesUiLabels();
  renderMessages();
  renderDprMetrics();
  renderDprProjectOptions();
  applyI18n();
  applyDrawerUiState();
  refreshLocations();
}

function getRole(){
  return getRoleCode();
}

function isDemoUser(){
  return Boolean(state.profile?.is_demo);
}

SpecCom.helpers.isRoot = function(){
  const roleCode = getRoleCode();
  return String(roleCode || "").toUpperCase() === "ROOT";
};

SpecCom.helpers.isSupport = function(){
  const roleCode = getRoleCode();
  return String(roleCode || "").toUpperCase() === "SUPPORT";
};

SpecCom.helpers.isPlatformAdmin = function(){
  return SpecCom.helpers.isRoot() || SpecCom.helpers.isSupport();
};

function isBillingManager(){
  const role = getRoleCode();
  if (SpecCom.helpers.isRoot()) return true;
  return isPrivilegedRole(role) || role === ROLES.ADMIN;
}

function isOwner(){
  if (SpecCom.helpers.isRoot()) return true;
  return getRoleCode() === ROLES.OWNER;
}

function isOwnerOrAdmin(){
  const role = getRoleCode();
  if (SpecCom.helpers.isRoot()) return true;
  return role === ROLES.OWNER || role === ROLES.ADMIN;
}

function isPrivilegedRole(roleCode = getRoleCode()){
  if (SpecCom.helpers.isRoot()) return true;
  return roleCode === ROLES.ADMIN || roleCode === ROLES.PROJECT_MANAGER || roleCode === ROLES.OWNER || roleCode === ROLES.SUPPORT;
}

function isFieldRole(roleCode = getRoleCode()){
  return roleCode === ROLES.USER_LEVEL_1 || roleCode === ROLES.USER_LEVEL_2;
}

function canViewLabor(){
  return isPrivilegedRole();
}

function canViewDispatch(){
  return isPrivilegedRole();
}

function getDefaultView(){
  return "viewMap";
}

function isViewAllowed(viewId){
  if (isFieldRole()){
    return ["viewTechnician", "viewMap", "viewSettings", "viewDailyReport"].includes(viewId);
  }
  if (viewId === "viewTechnician") return false;
  if (viewId === "viewLabor") return canViewLabor();
  if (viewId === "viewDispatch") return canViewDispatch();
  return true;
}

function isBillingUnlocked(){
  if (MVP_UNGATED) return true;
  if (isDemo) return true;
  if (BUILD_MODE) return true;
  if (SpecCom.helpers.isRoot()) return true;
  return Boolean(state.nodeProofStatus?.billing_unlocked);
}

function formatMoney(value){
  const num = Number(value || 0);
  return `$${num.toFixed(2)}`;
}

SpecCom.helpers.isRecoveryHash = function(){
  const hash = String(window.location.hash || "");
  if (!hash) return false;
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
  return normalized.includes("type=recovery");
};

SpecCom.helpers.enterResetMode = function(){
  const authForm = $("authForm");
  const resetForm = $("resetForm");
  if (authForm) authForm.style.display = "none";
  if (resetForm) resetForm.style.display = "";
  showAuth(true);
};

SpecCom.helpers.exitResetMode = function(){
  const authForm = $("authForm");
  const resetForm = $("resetForm");
  if (authForm) authForm.style.display = "";
  if (resetForm) resetForm.style.display = "none";
};

SpecCom.helpers.handleForgotPassword = async function(){
  const client = state.client || supabase;
  if (!client){
    toast("Reset failed", "Supabase client unavailable.");
    return;
  }
  let email = $("email")?.value.trim() || "";
  if (!email){
    const prompted = prompt("Enter your email address");
    email = String(prompted || "").trim();
  }
  if (!email){
    toast("Email required", "Enter your email address first.");
    return;
  }
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#reset`,
  });
  if (error){
    toast("Reset failed", error.message || "Password reset failed.");
    return;
  }
  toast("Check your email", "Password reset link sent.");
};

SpecCom.helpers.handleResetSubmit = async function(){
  const client = state.client || supabase;
  if (!client){
    toast("Reset failed", "Supabase client unavailable.");
    return;
  }
  const nextPassword = $("resetPassword")?.value || "";
  const confirmPassword = $("resetPasswordConfirm")?.value || "";
  if (nextPassword.length < 8){
    toast("Password too short", "Password must be at least 8 characters.");
    return;
  }
  if (nextPassword !== confirmPassword){
    toast("Passwords do not match", "Please confirm your password.");
    return;
  }
  const { error } = await client.auth.updateUser({ password: nextPassword });
  if (error){
    toast("Reset failed", error.message || "Password update failed.");
    return;
  }
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  toast("Password updated", "Please sign in.");
  await client.auth.signOut();
  SpecCom.helpers.exitResetMode();
  showAuth(true);
};

SpecCom.helpers.applyAuthModeFromHash = function(){
  if (SpecCom.helpers.isRecoveryHash()){
    SpecCom.helpers.enterResetMode();
  } else {
    SpecCom.helpers.exitResetMode();
  }
};

SpecCom.helpers.handleSignOut = async function(){
  if (isDemo){
    state.activeNode = null;
    showAuth(true);
    setWhoami();
    clearProof();
    return;
  }
  setSavedProjectPreference(null);
  try{
    const client = state.client || supabase;
    if (client?.auth){
      await client.auth.signOut();
    }
  } catch (err){
    console.error("Sign out failed", err);
  } finally {
    state.session = null;
    state.user = null;
    state.profile = null;
    showAuth(true);
    setWhoami();
  }
};

SpecCom.helpers.editProject = async function(){
  const project = state.activeProject;
  if (!project){
    toast("Project required", "Select a project first.");
    return;
  }
  const canEdit = SpecCom.helpers.isRoot() || getRoleCode() === ROLES.PROJECT_MANAGER || isOwnerOrAdmin();
  if (!canEdit){
    toast("Not allowed", "Project Manager or Admin required.");
    return;
  }
  const nextName = prompt("Edit project name", project.name || "");
  if (nextName === null) return;
  const nextDesc = prompt("Edit project description", project.description || "");
  if (nextDesc === null) return;
  const trimmedName = String(nextName || "").trim();
  if (!trimmedName){
    toast("Name required", "Project name cannot be empty.");
    return;
  }
  const trimmedDesc = String(nextDesc || "").trim();
  if (trimmedName === project.name && trimmedDesc === (project.description || "")) return;
  if (isDemo){
    project.name = trimmedName;
    project.description = trimmedDesc || null;
    const match = (state.projects || []).find(p => p.id === project.id);
    if (match){
      match.name = project.name;
      match.description = project.description;
    }
    renderProjects();
    toast("Project updated", "Project updated.");
    return;
  }
  if (!state.client){
    toast("Update failed", "Client not ready.");
    return;
  }
  const { error } = await state.client
    .from("projects")
    .update({ name: trimmedName, description: trimmedDesc || null })
    .eq("id", project.id);
  if (error){
    toast("Update failed", error.message);
    return;
  }
  project.name = trimmedName;
  project.description = trimmedDesc || null;
  const match = (state.projects || []).find(p => p.id === project.id);
  if (match){
    match.name = project.name;
    match.description = project.description;
  }
  renderProjects();
  toast("Project updated", "Project updated.");
};

SpecCom.helpers.deleteSiteFromPanel = async function(){
  const site = state.activeSite;
  if (!site || site.is_pending){
    toast("Site required", "Select a site to delete.");
    return;
  }
  if (!SpecCom.helpers.isRoot()){
    toast("Not allowed", "Root role required.");
    return;
  }
  const confirmDelete = confirm("Are you sure you want to delete this site? This cannot be undone.");
  if (!confirmDelete) return;
  if (!state.client){
    toast("Delete failed", "Client not ready.");
    return;
  }
  try{
    if (!isDemo){
      await state.client.from("site_media").delete().eq("site_id", site.id);
      await state.client.from("site_codes").delete().eq("site_id", site.id);
      await state.client.from("site_entries").delete().eq("site_id", site.id);
      const { error } = await state.client.from("sites").delete().eq("id", site.id);
      if (error) throw error;
    }
    state.projectSites = (state.projectSites || []).filter(s => s.id !== site.id);
    state.pendingSites = (state.pendingSites || []).filter(s => s.id !== site.id);
    const siteKey = toSiteIdKey(site.id);
    if (state.map?.instance && state.map?.markers?.has(siteKey)){
      const marker = state.map.markers.get(siteKey);
      if (marker){
        try{
          const pinsLayer = state.map.layers?.pins;
          if (pinsLayer?.removeLayer) pinsLayer.removeLayer(marker);
          else state.map.instance.removeLayer(marker);
        } catch {}
      }
      state.map.markers.delete(siteKey);
      state.map.featureMarkerMeta.delete(siteKey);
    }
    state.map.siteCodesBySiteId.delete(siteKey);
    state.map.sitePhotosBySiteId.delete(siteKey);
    closeSitePanel();
    renderSiteList();
    if (state.map?.instance){
      const rows = getVisibleSites();
      updateMapMarkers(rows);
      renderDerivedMapLayers(rows);
    }
    toast("Deleted", "Site deleted.");
  } catch (err){
    console.error("Delete site failed", err);
    toast("Delete failed", err.message || "Delete failed.");
  }
};

SpecCom.helpers.ensureMediaViewerModal = function(){
  let modal = document.getElementById("mediaViewerModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "mediaViewerModal";
  modal.className = "modal";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="card modal-card" style="max-width:980px;">
      <div class="modal-header">
        <h2>Photo</h2>
        <button id="btnMediaViewerClose" class="btn ghost small" type="button">Close</button>
      </div>
      <div id="mediaViewerBody" class="row" style="gap:16px; align-items:flex-start; flex-wrap:wrap;">
        <div style="flex:1 1 520px; min-width:260px;">
          <img id="mediaViewerImg" src="" alt="site media" style="width:100%; max-height:70vh; object-fit:contain; background:#0d0d0d; border-radius:12px;" />
          <div class="row" style="justify-content:space-between; margin-top:10px;">
            <button id="btnMediaPrev" class="btn ghost small" type="button">Previous</button>
            <button id="btnMediaNext" class="btn ghost small" type="button">Next</button>
          </div>
        </div>
        <div style="flex:1 1 260px; min-width:220px;">
          <div class="note">
            <div id="mediaViewerMetaSite" style="font-weight:700;"></div>
            <div id="mediaViewerMetaProject" class="muted small" style="margin-top:4px;"></div>
            <div id="mediaViewerMetaTime" class="muted small" style="margin-top:4px;"></div>
            <div id="mediaViewerMetaGps" class="muted small" style="margin-top:4px;"></div>
          </div>
          <div id="mediaViewerActions" class="row" style="justify-content:flex-end; margin-top:12px; display:none;">
            <button id="btnMediaDelete" class="btn danger small" type="button">Delete photo</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector("#btnMediaViewerClose");
  if (closeBtn){
    closeBtn.addEventListener("click", () => SpecCom.helpers.closeMediaViewer());
  }
  modal.addEventListener("click", (e) => {
    if (e.target === modal) SpecCom.helpers.closeMediaViewer();
  });
  modal.querySelector("#btnMediaPrev")?.addEventListener("click", () => SpecCom.helpers.navigateMedia(-1));
  modal.querySelector("#btnMediaNext")?.addEventListener("click", () => SpecCom.helpers.navigateMedia(1));
  modal.querySelector("#btnMediaDelete")?.addEventListener("click", async () => {
    await SpecCom.helpers.deleteActiveMedia();
  });

  if (!SpecCom.helpers._mediaKeyListener){
    SpecCom.helpers._mediaKeyListener = true;
    document.addEventListener("keydown", (e) => {
      if (!state.mediaViewer.open) return;
      if (e.key === "ArrowLeft") SpecCom.helpers.navigateMedia(-1);
      if (e.key === "ArrowRight") SpecCom.helpers.navigateMedia(1);
      if (e.key === "Escape") SpecCom.helpers.closeMediaViewer();
    });
  }

  return modal;
};

SpecCom.helpers.openMediaViewer = function(index){
  const modal = SpecCom.helpers.ensureMediaViewerModal();
  const items = state.siteMedia || [];
  if (!items.length) return;
  const bounded = Math.max(0, Math.min(index, items.length - 1));
  state.mediaViewer.open = true;
  state.mediaViewer.index = bounded;
  SpecCom.helpers.renderMediaViewer();
  modal.style.display = "";
};

SpecCom.helpers.closeMediaViewer = function(){
  const modal = document.getElementById("mediaViewerModal");
  if (modal) modal.style.display = "none";
  state.mediaViewer.open = false;
};

SpecCom.helpers.navigateMedia = function(delta){
  const items = state.siteMedia || [];
  if (!items.length) return;
  const next = (state.mediaViewer.index + delta + items.length) % items.length;
  state.mediaViewer.index = next;
  SpecCom.helpers.renderMediaViewer();
};

SpecCom.helpers.renderMediaViewer = function(){
  const modal = SpecCom.helpers.ensureMediaViewerModal();
  const img = modal.querySelector("#mediaViewerImg");
  const metaSite = modal.querySelector("#mediaViewerMetaSite");
  const metaProject = modal.querySelector("#mediaViewerMetaProject");
  const metaTime = modal.querySelector("#mediaViewerMetaTime");
  const metaGps = modal.querySelector("#mediaViewerMetaGps");
  const actions = modal.querySelector("#mediaViewerActions");
  const items = state.siteMedia || [];
  const item = items[state.mediaViewer.index];
  if (!item || !img) return;
  img.src = item.previewUrl || "";
  const site = state.activeSite;
  const project = state.activeProject;
  if (metaSite){
    const label = site ? getSiteDisplayName(site) : "Site";
    const idLabel = site?.id ? ` (${String(site.id).slice(0, 8)})` : "";
    metaSite.textContent = `${label}${idLabel}`;
  }
  if (metaProject) metaProject.textContent = project ? `Project: ${project.name || project.id}` : "Project";
  if (metaTime){
    const ts = item.created_at ? new Date(item.created_at).toLocaleString() : "Timestamp unknown";
    metaTime.textContent = `Uploaded: ${ts}`;
  }
  if (metaGps){
    const lat = item.gps_lat;
    const lng = item.gps_lng;
    metaGps.textContent = (Number.isFinite(lat) && Number.isFinite(lng))
      ? `GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
      : "GPS: unavailable";
  }
  if (actions){
    actions.style.display = SpecCom.helpers.isRoot() ? "" : "none";
  }
};

SpecCom.helpers.deleteActiveMedia = async function(){
  if (!SpecCom.helpers.isRoot()) return;
  const items = state.siteMedia || [];
  const item = items[state.mediaViewer.index];
  if (!item) return;
  const ok = confirm("Delete this photo? This cannot be undone.");
  if (!ok) return;
  if (!state.client){
    toast("Delete failed", "Client not ready.");
    return;
  }
  const { error } = await state.client.from("site_media").delete().eq("id", item.id);
  if (error){
    toast("Delete failed", error.message);
    return;
  }
  state.siteMedia = items.filter((m) => m.id !== item.id);
  renderSitePanel();
  if (!state.siteMedia.length){
    SpecCom.helpers.closeMediaViewer();
    return;
  }
  if (state.mediaViewer.index >= state.siteMedia.length){
    state.mediaViewer.index = state.siteMedia.length - 1;
  }
  SpecCom.helpers.renderMediaViewer();
  toast("Deleted", "Photo deleted.");
};

SpecCom.helpers.parseInvoiceSpreadsheet = async function(file){
  if (!file) throw new Error("No file selected.");
  const name = String(file.name || "").toLowerCase();
  if (!name.endsWith(".xlsx")){
    throw new Error("Unsupported file type. Upload .xlsx.");
  }
  if (!window.XLSX){
    throw new Error("XLSX parser unavailable. Refresh and try again.");
  }
  const data = await file.arrayBuffer();
  const workbook = window.XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (!rows.length) return [];
  const headers = rows[0].map(SpecCom.helpers.normalizeImportHeader);
  return rows.slice(1).filter((r) => r && r.length).map((r, idx) => {
    const row = Object.fromEntries(
      headers.map((h, i) => [h, String(r[i] ?? "").trim()])
    );
    row.__rowNumber = idx + 2;
    return row;
  });
};

SpecCom.helpers.prepareInvoiceImportPreview = function(rows){
  const siteMap = new Map((state.projectSites || []).map((s) => [String(s.name || "").trim().toLowerCase(), s]));
  const preview = [];
  const missing = [];
  for (const row of rows){
    const rawName = String(row.location_name || "").trim();
    if (!rawName) continue;
    const key = rawName.toLowerCase();
    const site = siteMap.get(key) || null;
    const items = [];
    Object.keys(row).forEach((k) => {
      const keyName = String(k || "").toLowerCase();
      if (!keyName.startsWith("item_")) return;
      const idx = keyName.replace("item_", "");
      const qtyKey = `qty_${idx}`;
      const code = String(row[k] || "").trim();
      const qtyVal = Number(row[qtyKey] || 0);
      if (!code) return;
      if (!Number.isFinite(qtyVal) || qtyVal <= 0) return;
      items.push({ code, qty: qtyVal });
    });
    if (!site){
      missing.push({ name: rawName, row: row.__rowNumber });
      continue;
    }
    preview.push({
      site,
      location_name: rawName,
      finish_date: String(row.finish_date || "").trim() || null,
      items,
      rowNumber: row.__rowNumber,
    });
  }
  return { preview, missing };
};

SpecCom.helpers.renderInvoiceImportPreview = function(){
  const summary = $("invoiceImportSummary");
  const list = $("invoiceImportList");
  const exportBtn = $("btnInvoiceImportExport");
  const applyBtn = $("btnInvoiceImportApply");
  const data = state.invoiceAgent.importPreview;
  if (!summary || !list) return;
  if (!data){
    summary.textContent = "";
    list.innerHTML = "";
    if (exportBtn) exportBtn.style.display = "none";
    if (applyBtn) applyBtn.style.display = "none";
    return;
  }
  const total = data.preview.length;
  const missing = data.missing.length;
  summary.textContent = total
    ? `Parsed ${total} sites. Missing ${missing}.`
    : "No matching sites found.";
  list.innerHTML = data.preview.slice(0, 60).map((row) => {
    const codes = row.items.map(i => `${i.code} (${i.qty})`).join(", ");
    return `<div class="muted small">Row ${row.rowNumber}: ${escapeHtml(row.location_name)} → ${escapeHtml(codes || "No items")}</div>`;
  }).join("");
  if (missing){
    list.innerHTML += data.missing.slice(0, 20).map((row) => (
      `<div class="muted small" style="color:#b45309;">Missing site: ${escapeHtml(row.name)} (Row ${row.row})</div>`
    )).join("");
  }
  if (exportBtn) exportBtn.style.display = total ? "" : "none";
  if (applyBtn) applyBtn.style.display = total ? "" : "none";
};

SpecCom.helpers.exportInvoiceImportCsv = function(){
  const data = state.invoiceAgent.importPreview;
  if (!data?.preview?.length) return;
  const rows = [];
  rows.push(["location_name", "code", "qty", "site_id"].join(","));
  data.preview.forEach((row) => {
    row.items.forEach((item) => {
      rows.push([escapeCsv(row.location_name), escapeCsv(item.code), item.qty, row.site.id].join(","));
    });
  });
  downloadFile("invoice-import-preview.csv", rows.join("\n"), "text/csv");
};

SpecCom.helpers.applyInvoiceImport = async function(){
  const data = state.invoiceAgent.importPreview;
  if (!data || !data.preview.length){
    toast("No data", "Import a spreadsheet first.");
    return;
  }
  if (!state.client){
    toast("Import failed", "Client not ready.");
    return;
  }
  const siteIds = data.preview.map(r => r.site.id);
  const { data: existing } = await state.client
    .from("site_entries")
    .select("site_id")
    .in("site_id", siteIds);
  const existingSet = new Set((existing || []).map(r => r.site_id));
  if (existingSet.size){
    const ok = confirm("Some sites already have billing entries. Overwrite existing billing entries?");
    if (!ok) return;
  }

  const payload = [];
  data.preview.forEach((row) => {
    row.items.forEach((item) => {
      payload.push({
        site_id: row.site.id,
        description: item.code,
        quantity: item.qty,
      });
    });
  });
  if (!payload.length){
    toast("No items", "No billable items found.");
    return;
  }
  if (existingSet.size){
    await state.client.from("site_entries").delete().in("site_id", siteIds);
  }
  const { error } = await state.client.from("site_entries").insert(payload);
  if (error){
    toast("Import failed", error.message);
    return;
  }
  toast("Billing updated", `Updated billing for ${siteIds.length} sites.`);
  await SpecCom.helpers.generateProjectInvoiceFromImport();
};

SpecCom.helpers.generateProjectInvoiceFromImport = async function(){
  const data = state.invoiceAgent.importPreview;
  if (!data || !data.preview.length) return;
  if (!state.client || !state.activeProject){
    toast("Invoice failed", "Project not ready.");
    return;
  }
  const totals = new Map();
  data.preview.forEach((row) => {
    row.items.forEach((item) => {
      const key = item.code;
      totals.set(key, (totals.get(key) || 0) + item.qty);
    });
  });
  const { data: invoiceRow, error: invoiceErr } = await state.client
    .from("invoices")
    .insert({
      project_id: state.activeProject.id,
      status: "draft",
      created_by: state.user?.id || null,
      subtotal: 0,
      tax: 0,
      total: 0,
    })
    .select("id")
    .single();
  if (invoiceErr){
    toast("Invoice failed", invoiceErr.message);
    return;
  }
  const invoiceId = invoiceRow?.id;
  const itemsPayload = Array.from(totals.entries()).map(([code, qty], idx) => ({
    invoice_id: invoiceId,
    work_code_id: null,
    description: code,
    unit: "",
    qty,
    rate: 0,
    sort_order: idx,
  }));
  if (itemsPayload.length){
    const { error } = await state.client.from("invoice_items").insert(itemsPayload);
    if (error){
      toast("Invoice failed", error.message);
      return;
    }
  }
  toast("Invoice draft created", "Project invoice generated.");
};

function getNodeUnits(node){
  const allowed = node.units_allowed ?? node.allowed_units ?? 0;
  const used = node.units_used ?? node.used_units ?? 0;
  return { allowed, used };
}

function computeNodeCompletion(node){
  // completion = (all splice locations complete) and (inventory checklist complete)
  const locs = getSortedSpliceLocations(node);
  const inv = node.inventory_checks || [];
  const locOk = locs.length > 0 && locs.every(l => l.completed);
  const invOk = inv.length > 0 && inv.every(i => i.completed);
  const pct = (locOk && invOk) ? 100 : (locOk || invOk) ? 60 : 15;
  return { locOk, invOk, pct };
}

function computeProofStatus(node){
  const locs = node.splice_locations || [];
  const locPhotosOk = locs.length > 0 && locs.every((l) => hasAllRequiredSlotPhotos(l));
  const missingUsage = getMissingUsageProof(node.id);
  const usagePhotosOk = missingUsage.length === 0;
  return { locPhotosOk, usagePhotosOk, photosOk: locPhotosOk && usagePhotosOk };
}

function updateKPI(){
  const node = state.activeNode;
  if (!node){
    setText("kpiNode", "None");
    setText("kpiCompletion", "0%");
    setText("kpiUnits", "0 / 0");
    setText("dashNode", "None");
    setText("dashCompletion", "0%");
    setText("dashUnits", "0 / 0");
    const chipStatus = $("chipStatus");
    if (chipStatus){
      chipStatus.innerHTML = '<span class="dot warn"></span><span>Waiting</span>';
    }
    return;
  }

  setText("kpiNode", node.node_number);
  setText("dashNode", node.node_number);
  const c = computeNodeCompletion(node);
  setText("kpiCompletion", `${c.pct}%`);
  setText("dashCompletion", `${c.pct}%`);

  const units = getNodeUnits(node);
  setText("kpiUnits", `${units.used} / ${units.allowed}`);
  setText("dashUnits", `${units.used} / ${units.allowed}`);

  // status chip
  const ratio = units.allowed > 0 ? (units.used / units.allowed) : 0;
  const dot = c.pct === 100 ? "ok" : ratio >= 0.9 ? "warn" : "warn";
  const label = c.pct === 100 ? "Ready" : "In progress";
  const chipStatus = $("chipStatus");
  if (chipStatus){
    chipStatus.innerHTML = `<span class="dot ${dot}"></span><span>${label}</span>`;
  }

  // unit alert
  if (units.allowed > 0){
    if (ratio >= 1.0){
      toast("Units exceeded", "Used units are over the allowed units. Project Manager should review immediately.");
    } else if (ratio >= 0.9){
      toast("Units nearing limit", "Used units are above 90% of allowed. Project Manager gets an alert.");
    }
  }
}

function setRoleBasedVisibility(){
  const isTech = isTechnician();
  const allowedViews = isTech
    ? new Set(["viewTechnician", "viewMap", "viewSettings", "viewDailyReport"])
    : new Set(["viewDashboard", "viewNodes", "viewPhotos", "viewBilling", "viewInvoices", "viewMap", "viewCatalog", "viewAlerts", "viewAdmin", "viewSettings", "viewLabor", "viewDispatch", "viewDailyReport"]);

  document.querySelectorAll(".nav-item").forEach((btn) => {
    const viewId = btn.dataset.view;
    let visible = allowedViews.has(viewId);
    if (!isTech && viewId === "viewLabor") visible = canViewLabor();
    if (!isTech && viewId === "viewDispatch") visible = canViewDispatch();
    if (!isTech && viewId === "viewTechnician") visible = false;
    btn.style.display = visible ? "" : "none";
  });

  document.querySelectorAll(".view").forEach((view) => {
    const viewId = view.id;
    let visible = allowedViews.has(viewId);
    if (!isTech && viewId === "viewLabor") visible = canViewLabor();
    if (!isTech && viewId === "viewDispatch") visible = canViewDispatch();
    if (!isTech && viewId === "viewTechnician") visible = false;
    view.style.display = visible ? "" : "none";
  });

  const activeView = document.querySelector(".view.active");
  if (activeView && !isViewAllowed(activeView.id)){
    setActiveView(getDefaultView());
  }
}

SpecCom.helpers.loadYourInvoices = async function(projectId){
  if (!projectId){
    state.invoices = [];
    renderInvoicePanel();
    return;
  }
  if (isDemo){
    state.invoices = [];
    renderInvoicePanel();
    return;
  }
  if (!state.client) return;
  const { data, error } = await state.client
    .from("invoices")
    .select("id, invoice_number, status, total, site_id, billed_by_org_id, billed_to_org_id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error){
    toast("Invoices load error", error.message);
    return;
  }
  state.invoices = data || [];
  renderInvoicePanel();
};

function setRoleUI(){
  const roleCode = getRoleCode();
  const roleChip = $("chipRole");
  if (roleChip){
    roleChip.innerHTML = `<span class="dot ok"></span><span>${t("roleLabel")}: ${formatRoleLabel(roleCode)}</span>`;
  }

  // Pricing visibility notice
  const pricingHidden = roleCode === ROLES.USER_LEVEL_1;
  const pricingChip = $("chipPricing");
  if (pricingChip){
    pricingChip.style.display = "none";
    pricingChip.innerHTML = pricingHidden
      ? `<span class="dot bad"></span><span>${t("pricingHiddenSplicer")}</span>`
      : `<span class="dot ok"></span><span>${t("pricingProtected")}</span>`;
  }

  const buildChip = $("chipBuildMode");
  if (buildChip){
    buildChip.style.display = BUILD_MODE ? "inline-flex" : "none";
  }
  const invoiceAgentBtn = $("btnInvoiceAgent");
  if (invoiceAgentBtn){
    invoiceAgentBtn.style.display = SpecCom.helpers.isInvoiceAgentAllowed() ? "" : "none";
  }
  document.querySelectorAll(".no-pay-banner").forEach((el) => {
    el.style.display = BUILD_MODE ? "none" : "";
  });

  updateAlertsBadge();
  renderAlerts();
  applyDemoRestrictions();
  setRoleBasedVisibility();
  renderTechnicianDashboard();
  renderTechnicianWorkOrders();
  renderDispatchTable();
  renderDispatchWarnings();
  setDprEditState();
}

function getLocalDateISO(){
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeShort(value){
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDurationMinutes(totalMinutes){
  const minutes = Number(totalMinutes || 0);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${String(remainder).padStart(2, "0")}m`;
}

function formatEventLabel(eventType){
  switch (eventType){
    case "START_JOB":
      return t("techStartJob");
    case "PAUSE_JOB":
      return t("techPauseJob");
    case "LUNCH":
      return t("techLunch");
    case "BREAK_15":
      return t("techBreak");
    case "TRUCK_INSPECTION":
      return t("techTruckInspection");
    case "END_JOB":
      return t("techEndJob");
    default:
      return eventType || "";
  }
}

function computeTechnicianSummary(events){
  let paidMinutes = 0;
  let unpaidMinutes = 0;
  let inspections = 0;
  (events || []).forEach((event) => {
    if (!event.started_at || !event.ended_at) return;
    const minutes = Number(event.duration_minutes || 0);
    if (event.event_type === "TRUCK_INSPECTION"){
      paidMinutes += minutes;
      inspections += 1;
      return;
    }
    if (event.event_type === "START_JOB"){
      paidMinutes += minutes;
      return;
    }
    if (event.event_type === "LUNCH" || event.event_type === "BREAK_15" || event.event_type === "PAUSE_JOB"){
      unpaidMinutes += minutes;
    }
  });
  return {
    paidMinutes,
    unpaidMinutes,
    totalMinutes: paidMinutes,
    inspections,
  };
}

function renderTechnicianDashboard(){
  const logWrap = $("techEventLog");
  if (!logWrap) return;
  const timesheet = state.technician.timesheet;
  const events = state.technician.events || [];
  const activeEvent = state.technician.activeEvent;

  const clockStatus = $("techClockStatus");
  const jobState = $("techJobState");
  const summaryEl = $("techSummary");
  const trailEl = $("techLocationTrail");

  if (clockStatus){
    if (!timesheet){
      clockStatus.textContent = t("techNoTimesheet");
    } else {
      const projectName = state.projects.find(p => p.id === timesheet.project_id)?.name || "Project";
      const clockInText = t("techClockedInAt", { time: formatTimeShort(timesheet.clock_in_at) });
      const clockOutText = timesheet.clock_out_at ? t("techClockedOutAt", { time: formatTimeShort(timesheet.clock_out_at) }) : "";
      clockStatus.textContent = `${clockInText}${clockOutText ? ` • ${clockOutText}` : ""} • ${projectName}`;
    }
  }

  if (jobState){
    if (activeEvent){
      jobState.innerHTML = `<span class="dot ok"></span><span>${formatEventLabel(activeEvent.event_type)}</span>`;
    } else if (timesheet && !timesheet.clock_out_at){
      jobState.innerHTML = `<span class="dot warn"></span><span>${t("techStateIdle")}</span>`;
    } else {
      jobState.innerHTML = `<span class="dot bad"></span><span>${t("techStateOffClock")}</span>`;
    }
  }

  if (summaryEl){
    const summary = computeTechnicianSummary(events);
    state.technician.summary = summary;
    summaryEl.innerHTML = `
      <div class="kpi">
        <div class="tile">
          <div class="label">${t("techSummaryTotal")}</div>
          <div class="value">${formatDurationMinutes(summary.totalMinutes)}</div>
        </div>
        <div class="tile">
          <div class="label">${t("techSummaryPaid")}</div>
          <div class="value">${formatDurationMinutes(summary.paidMinutes)}</div>
        </div>
        <div class="tile">
          <div class="label">${t("techSummaryUnpaid")}</div>
          <div class="value">${formatDurationMinutes(summary.unpaidMinutes)}</div>
        </div>
        <div class="tile">
          <div class="label">${t("techSummaryInspections")}</div>
          <div class="value">${summary.inspections}</div>
        </div>
      </div>
    `;
  }

  if (trailEl){
    const trail = state.technician.locationTrail || [];
    if (!trail.length){
      trailEl.textContent = t("techNoTrail");
    } else {
      trailEl.innerHTML = trail.slice(-10).map(point => {
        const time = formatTimeShort(point.at);
        return `<div>${time} • ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}</div>`;
      }).join("");
    }
  }

  if (events.length){
    logWrap.innerHTML = events.map((event) => {
      const title = formatEventLabel(event.event_type);
      const start = event.started_at ? formatTimeShort(event.started_at) : "Pending";
      const end = event.ended_at ? formatTimeShort(event.ended_at) : (event.started_at ? "Active" : "Pending");
      const duration = Number(event.duration_minutes || 0);
      const durationLabel = duration ? `${duration} min` : "";
      return `
        <div class="event-row">
          <div>
            <div class="event-title">${title}</div>
            <div class="event-meta">${start}${end ? ` → ${end}` : ""}</div>
          </div>
          <div class="event-meta">${durationLabel}</div>
        </div>
      `;
    }).join("");
  } else {
    logWrap.innerHTML = `<div class="muted small">${t("techNoEvents")}</div>`;
  }

  const clockInBtn = $("btnTechClockIn");
  const clockOutBtn = $("btnTechClockOut");
  const eventButtons = [
    $("btnTechStartJob"),
    $("btnTechPauseJob"),
    $("btnTechLunch"),
    $("btnTechBreak"),
    $("btnTechTruckInspection"),
    $("btnTechEndJob"),
  ].filter(Boolean);

  const hasOpenTimesheet = Boolean(timesheet && !timesheet.clock_out_at);
  const activeJob = Boolean(activeEvent && activeEvent.event_type === "START_JOB");
  if (clockInBtn) clockInBtn.disabled = !state.activeProject || hasOpenTimesheet;
  if (clockOutBtn) clockOutBtn.disabled = !hasOpenTimesheet || activeJob;
  eventButtons.forEach((btn) => {
    btn.disabled = !hasOpenTimesheet;
  });
}

function recordTechnicianTrail(pos){
  if (!isTechnician()) return;
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  state.technician.locationTrail.push({ lat, lng, at: new Date().toISOString() });
  if (state.technician.locationTrail.length > 50){
    state.technician.locationTrail.shift();
  }
  renderTechnicianDashboard();
}

function startOfDay(date){
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date){
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function isSameDay(a, b){
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function statusPillClass(status){
  if (status === "COMPLETE") return "ok";
  if (status === "BLOCKED" || status === "CANCELED") return "bad";
  return "warn";
}

function renderWorkOrderCard(order, { showActions = false } = {}){
  const scheduled = order.scheduled_start ? new Date(order.scheduled_start) : null;
  const end = order.scheduled_end ? new Date(order.scheduled_end) : null;
  const timeLabel = scheduled
    ? `${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${end ? ` - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}`
    : "Unscheduled";
  const statusClass = statusPillClass(order.status);
  const isClosed = order.status === "COMPLETE" || order.status === "CANCELED";
  const buttons = showActions ? `
    <div class="row" style="margin-top:10px; flex-wrap:wrap;">
      <button class="btn ghost" data-action="woEnRoute" data-id="${order.id}" ${isClosed ? "disabled" : ""}>${t("woActionEnRoute")}</button>
      <button class="btn ghost" data-action="woOnSite" data-id="${order.id}" ${isClosed ? "disabled" : ""}>${t("woActionOnSite")}</button>
      <button class="btn" data-action="woStart" data-id="${order.id}" ${isClosed ? "disabled" : ""}>${t("woActionStart")}</button>
      <button class="btn secondary" data-action="woBlocked" data-id="${order.id}" ${isClosed ? "disabled" : ""}>${t("woActionBlocked")}</button>
      <button class="btn danger" data-action="woComplete" data-id="${order.id}" ${isClosed ? "disabled" : ""}>${t("woActionComplete")}</button>
    </div>
  ` : "";
  return `
    <div class="wo-card">
      <div class="wo-header">
        <div>
          <div style="font-weight:800;">${escapeHtml(order.customer_label || "Work order")}</div>
          <div class="muted small">${escapeHtml(order.address || "")}</div>
          <div class="muted small">${timeLabel}</div>
        </div>
        <div class="status-pill ${statusClass}">${escapeHtml(order.status || "")}</div>
      </div>
      ${order.notes ? `<div class="muted small" style="margin-top:6px;">${escapeHtml(order.notes)}</div>` : ""}
      ${buttons}
    </div>
  `;
}

function renderTechnicianWorkOrders(){
  const todayWrap = $("techWorkOrdersToday");
  const tomorrowWrap = $("techWorkOrdersTomorrow");
  if (!todayWrap || !tomorrowWrap) return;
  const orders = state.workOrders.assigned || [];
  if (!orders.length){
    todayWrap.innerHTML = `<div class="muted small">${t("woNoOrders")}</div>`;
    tomorrowWrap.innerHTML = `<div class="muted small">${t("woNoOrders")}</div>`;
    return;
  }
  const today = startOfDay(new Date());
  const tomorrow = startOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const todayOrders = [];
  const tomorrowOrders = [];
  orders.forEach((order) => {
    if (!order.scheduled_start){
      todayOrders.push(order);
      return;
    }
    const dt = new Date(order.scheduled_start);
    if (isSameDay(dt, today)) todayOrders.push(order);
    else if (isSameDay(dt, tomorrow)) tomorrowOrders.push(order);
  });
  todayWrap.innerHTML = todayOrders.length
    ? todayOrders.map(order => renderWorkOrderCard(order, { showActions: true })).join("")
    : `<div class="muted small">${t("woNoOrders")}</div>`;
  tomorrowWrap.innerHTML = tomorrowOrders.length
    ? tomorrowOrders.map(order => renderWorkOrderCard(order, { showActions: true })).join("")
    : `<div class="muted small">${t("woNoOrders")}</div>`;
}

async function loadAssignedWorkOrders(){
  if (!state.features.dispatch){
    state.workOrders.assigned = [];
    renderTechnicianWorkOrders();
    return;
  }
  if (!isTechnician()){
    state.workOrders.assigned = [];
    renderTechnicianWorkOrders();
    return;
  }
  if (isDemo){
    ensureDemoSeed();
    state.workOrders.assigned = state.demo.workOrders || [];
    renderTechnicianWorkOrders();
    return;
  }
  if (!state.client || !state.user){
    state.workOrders.assigned = [];
    renderTechnicianWorkOrders();
    return;
  }
  const todayStart = startOfDay(new Date());
  const tomorrowEnd = endOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const { data, error } = await state.client
    .from("work_orders")
    .select("id, project_id, type, status, scheduled_start, scheduled_end, address, customer_label, notes, priority, sla_due_at, assigned_to_user_id")
    .eq("assigned_to_user_id", state.user.id)
    .or(`scheduled_start.is.null,and(scheduled_start.gte.${todayStart.toISOString()},scheduled_start.lte.${tomorrowEnd.toISOString()})`)
    .order("scheduled_start", { ascending: true, nullsFirst: true })
    .order("priority", { ascending: true });
  if (error){
    if (isMissingTable(error)){
      state.features.dispatch = false;
      state.workOrders.assigned = [];
      renderTechnicianWorkOrders();
      return;
    }
    toast("Work orders load error", error.message);
    return;
  }
  state.workOrders.assigned = data || [];
  renderTechnicianWorkOrders();
}

async function insertWorkOrderEvent(workOrderId, eventType, payload = {}){
  if (!state.client || !state.user || isDemo) return;
  await state.client
    .from("work_order_events")
    .insert({
      work_order_id: workOrderId,
      actor_user_id: state.user.id,
      event_type: eventType,
      payload,
    });
}

async function captureNoAccessGps(timeoutMs = 9000){
  if (state.lastGPS && Number.isFinite(state.lastGPS.lat) && Number.isFinite(state.lastGPS.lng)){
    return { ...state.lastGPS };
  }
  if (!navigator?.geolocation){
    return null;
  }
  return await new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gps = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
        };
        state.lastGPS = gps;
        finish(gps);
      },
      () => finish(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 15000 }
    );
    setTimeout(() => finish(null), timeoutMs + 400);
  });
}

function buildWorkOrderNoAccessProofMessage(workOrder, proof){
  const capturedAt = proof?.captured_at ? new Date(proof.captured_at) : new Date();
  const when = Number.isNaN(capturedAt.getTime()) ? new Date().toLocaleString() : capturedAt.toLocaleString();
  const customer = workOrder?.customer_label || "Customer";
  const address = workOrder?.address || "N/A";
  const reporter = state.profile?.display_name || state.user?.email || state.user?.id || "Unknown";
  const notes = String(proof?.notes || "").trim();
  const lat = Number.isFinite(Number(proof?.gps?.lat)) ? Number(proof.gps.lat) : null;
  const lng = Number.isFinite(Number(proof?.gps?.lng)) ? Number(proof.gps.lng) : null;
  const acc = Number.isFinite(Number(proof?.gps?.accuracy_m)) ? Math.round(Number(proof.gps.accuracy_m)) : null;
  const gpsLine = lat != null && lng != null
    ? `${lat.toFixed(6)}, ${lng.toFixed(6)}${acc != null ? ` (+/-${acc}m)` : ""}`
    : "Not captured";
  const mapLink = lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : "";
  const lines = [
    "NO ACCESS PROOF",
    `Project: ${state.activeProject?.name || "N/A"}${state.activeProject?.job_number ? ` (Job ${state.activeProject.job_number})` : ""}`,
    `Work Order ID: ${workOrder?.id || "N/A"}`,
    `Customer: ${customer}`,
    `Address: ${address}`,
    `Captured At: ${when}`,
    `Reported By: ${reporter}`,
    `Notes: ${notes || "N/A"}`,
    `GPS: ${gpsLine}`,
  ];
  if (mapLink) lines.push(`Map: ${mapLink}`);
  return lines.join("\n");
}

function buildSiteNoAccessProofMessage(site, proof){
  const capturedAt = proof?.captured_at ? new Date(proof.captured_at) : new Date();
  const when = Number.isNaN(capturedAt.getTime()) ? new Date().toLocaleString() : capturedAt.toLocaleString();
  const reporter = state.profile?.display_name || state.user?.email || state.user?.id || "Unknown";
  const notes = String(proof?.notes || "").trim();
  const lat = Number.isFinite(Number(proof?.gps?.lat))
    ? Number(proof.gps.lat)
    : Number.isFinite(Number(site?.gps_lat ?? site?.lat))
      ? Number(site?.gps_lat ?? site?.lat)
      : null;
  const lng = Number.isFinite(Number(proof?.gps?.lng))
    ? Number(proof.gps.lng)
    : Number.isFinite(Number(site?.gps_lng ?? site?.lng))
      ? Number(site?.gps_lng ?? site?.lng)
      : null;
  const acc = Number.isFinite(Number(proof?.gps?.accuracy_m)) ? Math.round(Number(proof.gps.accuracy_m)) : null;
  const gpsLine = lat != null && lng != null
    ? `${lat.toFixed(6)}, ${lng.toFixed(6)}${acc != null ? ` (+/-${acc}m)` : ""}`
    : "Not captured";
  const mapLink = lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : "";
  const siteName = getSiteDisplayName(site || {});
  const lines = [
    "NO ACCESS PROOF",
    `Project: ${state.activeProject?.name || "N/A"}${state.activeProject?.job_number ? ` (Job ${state.activeProject.job_number})` : ""}`,
    `Location: ${siteName || "N/A"}`,
    `Site ID: ${site?.id || "N/A"}`,
    proof?.attempt_label && Number.isFinite(Number(proof?.attempt_number))
      ? `Attempt: ${proof.attempt_label} (${proof.attempt_number}/3)`
      : null,
    `Captured At: ${when}`,
    `Reported By: ${reporter}`,
    `Notes: ${notes || "N/A"}`,
    `GPS: ${gpsLine}`,
  ].filter(Boolean);
  if (mapLink) lines.push(`Map: ${mapLink}`);
  return lines.join("\n");
}

function getNoAccessAttemptLabel(attemptNumber){
  if (attemptNumber === 1) return "First";
  if (attemptNumber === 2) return "Second";
  if (attemptNumber === 3) return "Third";
  return `${attemptNumber}th`;
}

async function getNoAccessAttemptNumberForSite(site){
  if (!site?.id || !state.activeProject?.id || !state.client || !state.messagesEnabled || !state.features.messages){
    return 1;
  }
  try{
    const { data, error } = await state.client
      .from("messages")
      .select("id")
      .eq("project_id", state.activeProject.id)
      .ilike("body", "%NO ACCESS PROOF%")
      .ilike("body", `%Site ID: ${site.id}%`);
    if (error) return 1;
    const count = Array.isArray(data) ? data.length : 0;
    return count + 1;
  } catch {
    return 1;
  }
}

async function saveNoAccessProofToSiteNotes(site, messageBody){
  if (!site?.id || !state.client || site.is_pending) return false;
  const existing = String(site.notes || "").trim();
  const nextNotes = existing
    ? `${existing}\n\n${messageBody}`
    : messageBody;
  const { error } = await state.client
    .from("sites")
    .update({ notes: nextNotes })
    .eq("id", site.id);
  if (error) return false;
  site.notes = nextNotes;
  const match = (state.projectSites || []).find((row) => row.id === site.id);
  if (match) match.notes = nextNotes;
  if (state.activeSite?.id === site.id){
    state.activeSite.notes = nextNotes;
    if (state.pinOverview.open){
      SpecCom.helpers.renderPinOverview();
    } else {
      renderSitePanel();
    }
  }
  return true;
}

async function postNoAccessProofMessageToApp(body, projectId){
  if (!state.messagesEnabled || !state.features.messages){
    return { posted: false, body, missingMessagesTable: true };
  }
  if (!state.client || !state.user){
    return { posted: false, body };
  }
  const payload = {
    project_id: projectId || state.activeProject?.id || null,
    sender_id: state.user.id,
    body,
    priority: 2,
  };
  const { error } = await state.client.from("messages").insert(payload);
  if (error){
    if (isMissingTable(error)){
      state.features.messages = false;
      disableMessagesModule("missing_table");
      return { posted: false, body, missingMessagesTable: true };
    }
    return { posted: false, body, error };
  }
  return { posted: true, body };
}

async function postWorkOrderNoAccessProofToApp(workOrder, proof){
  const body = buildWorkOrderNoAccessProofMessage(workOrder, proof);
  return postNoAccessProofMessageToApp(body, state.activeProject?.id || workOrder?.project_id || null);
}

async function postSiteNoAccessProofToApp(site, proof){
  const body = buildSiteNoAccessProofMessage(site, proof);
  return postNoAccessProofMessageToApp(body, state.activeProject?.id || site?.project_id || null);
}

async function reportNoAccess(workOrderId){
  const workOrder = (state.workOrders.assigned || []).find((r) => r.id === workOrderId)
    || (state.workOrders.dispatch || []).find((r) => r.id === workOrderId);
  const customer = workOrder?.customer_label || "work order";
  const notes = prompt(`No-access proof notes for ${customer} (required):`) || "";
  const trimmed = String(notes || "").trim();
  if (!trimmed){
    toast("Proof required", "Enter no-access notes before blocking.");
    return;
  }
  const gps = await captureNoAccessGps();
  await updateWorkOrderStatus(workOrderId, "BLOCKED", {
    eventPayload: {
      reason: "NO_ACCESS",
      proof_notes: trimmed,
      proof_gps: gps || null,
      proof_captured_at: new Date().toISOString(),
    },
    noAccessProof: {
      notes: trimmed,
      gps,
      captured_at: new Date().toISOString(),
    },
  });
}

async function updateWorkOrderStatus(workOrderId, nextStatus, options = {}){
  if (!state.client || !state.user) return;
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const current = (state.workOrders.assigned || []).find(r => r.id === workOrderId)
    || (state.workOrders.dispatch || []).find(r => r.id === workOrderId);
  const { error } = await state.client
    .from("work_orders")
    .update({ status: nextStatus })
    .eq("id", workOrderId);
  if (error){
    toast("Status update failed", error.message);
    return;
  }
  const payload = {
    from: current?.status || null,
    to: nextStatus,
    ...(options.eventPayload || {}),
  };
  await insertWorkOrderEvent(workOrderId, "STATUS_CHANGE", payload);

  if (nextStatus === "BLOCKED" && options.noAccessProof){
    try{
      const result = await postWorkOrderNoAccessProofToApp(
        current || { id: workOrderId, project_id: state.activeProject?.id || null },
        options.noAccessProof
      );
      if (navigator?.clipboard?.writeText){
        navigator.clipboard.writeText(result.body).catch(() => {});
      }
      if (result.posted){
        toast("Proof posted", "No-access proof posted to app messages. Copied for easy sharing.");
      } else if (result.missingMessagesTable){
        toast("Proof captured", "Messages module is not installed in this environment. Proof copied for manual sharing.");
      } else {
        const reason = result.error?.message ? ` (${result.error.message})` : "";
        toast("Proof captured", `No-access proof captured locally${reason}. Copied for manual sharing.`);
      }
    } catch (proofErr){
      toast("Proof captured", proofErr.message || "No-access proof captured. Share manually.");
    }
  }
  await loadAssignedWorkOrders();
  await loadDispatchWorkOrders();
}

SpecCom.helpers.reportNoAccessFromPinOverview = async function(){
  const site = state.activeSite;
  if (!site){
    toast("Location required", "Select a location first.");
    return;
  }
  if (!state.activeProject?.id){
    toast("Project required", "Select a project first.");
    return;
  }
  const siteName = getSiteDisplayName(site);
  const notes = prompt(`No-access proof notes for ${siteName} (required):`) || "";
  const trimmed = String(notes || "").trim();
  if (!trimmed){
    toast("Proof required", "Enter no-access notes before submitting.");
    return;
  }
  const attemptNumber = await getNoAccessAttemptNumberForSite(site);
  const attemptLabel = getNoAccessAttemptLabel(attemptNumber);
  const proof = {
    notes: trimmed,
    gps: await captureNoAccessGps(),
    captured_at: new Date().toISOString(),
    attempt_number: attemptNumber,
    attempt_label: attemptLabel,
  };
  const messageWithAttempt = buildSiteNoAccessProofMessage(site, proof);
  try{
    const result = await postNoAccessProofMessageToApp(
      messageWithAttempt,
      state.activeProject?.id || site?.project_id || null
    );
    if (navigator?.clipboard?.writeText){
      navigator.clipboard.writeText(messageWithAttempt).catch(() => {});
    }
    if (result.posted){
      toast("Proof posted", `${attemptLabel} attempt saved to app messages. Copied for easy sharing.`);
      await loadMessages();
      renderMessages();
    } else if (result.missingMessagesTable){
      const savedToNotes = await saveNoAccessProofToSiteNotes(site, messageWithAttempt);
      toast(
        "Proof captured",
        savedToNotes
          ? `${attemptLabel} attempt saved in site notes. Messages module missing; copied for sharing.`
          : "Messages module is not installed in this environment. Proof copied for manual sharing."
      );
    } else {
      const savedToNotes = await saveNoAccessProofToSiteNotes(site, messageWithAttempt);
      const reason = result.error?.message ? ` (${result.error.message})` : "";
      toast(
        "Proof captured",
        savedToNotes
          ? `${attemptLabel} attempt saved in site notes${reason}. Copied for manual sharing.`
          : `No-access proof captured locally${reason}. Copied for manual sharing.`
      );
    }
  } catch (err){
    const savedToNotes = await saveNoAccessProofToSiteNotes(site, messageWithAttempt);
    if (savedToNotes){
      toast("Proof captured", `${attemptLabel} attempt saved in site notes. ${err?.message || "Share manually."}`);
    } else {
      toast("Proof captured", err?.message || "No-access proof captured. Share manually.");
    }
  }
};

async function startWorkOrder(workOrderId){
  if (!state.client || !state.user) return;
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const { error } = await state.client.rpc("fn_start_work_order", { work_order_id: workOrderId });
  if (error){
    toast("Start failed", error.message);
    return;
  }
  await loadAssignedWorkOrders();
  await loadDispatchWorkOrders();
}

async function completeWorkOrder(workOrderId, notes = null){
  if (!state.client || !state.user) return;
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const { error } = await state.client.rpc("fn_complete_work_order", { work_order_id: workOrderId, notes });
  if (error){
    toast("Complete failed", error.message);
    return;
  }
  await loadAssignedWorkOrders();
  await loadDispatchWorkOrders();
}

async function loadDispatchTechnicians(){
  const select = $("dispatchAssignUser");
  if (!state.features.dispatch) return;
  if (!canViewDispatch() || !state.activeProject || !state.client || isDemo){
    state.workOrders.technicians = [];
    if (select) select.innerHTML = `<option value="">Unassigned</option>`;
    return;
  }
  const { data, error } = await state.client
    .from("project_members")
    .select("user_id, role_code")
    .eq("project_id", state.activeProject.id)
    .in("role_code", [ROLES.USER_LEVEL_1, ROLES.USER_LEVEL_2]);
  if (error){
    toast("Technicians load error", error.message);
    return;
  }
  const ids = (data || []).map(r => r.user_id);
  let profiles = [];
  if (ids.length){
    const { data: profileRows } = await state.client
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    profiles = profileRows || [];
  }
  const nameById = new Map(profiles.map(p => [p.id, p.display_name || p.id]));
  state.workOrders.technicians = ids.map(id => ({ id, name: nameById.get(id) || id }));
  if (select){
    select.innerHTML = `<option value="">Unassigned</option>` + state.workOrders.technicians
      .map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`)
      .join("");
  }
}

function syncDispatchStatusFilter(){
  const statusSelect = $("dispatchStatusFilter");
  if (!statusSelect) return;
  const current = statusSelect.value;
  statusSelect.innerHTML = `<option value="">${t("dispatchStatusAll")}</option>` + WORK_ORDER_STATUSES
    .map(status => `<option value="${status}">${status}</option>`)
    .join("");
  if (current){
    statusSelect.value = current;
  }
}

async function loadDispatchWorkOrders(){
  const wrap = $("dispatchTable");
  if (!wrap) return;
  if (!state.features.dispatch){
    state.workOrders.dispatch = [];
    renderDispatchTable();
    return;
  }
  if (!canViewDispatch()){
    state.workOrders.dispatch = [];
    renderDispatchTable();
    return;
  }
  if (!state.activeProject || !state.client || isDemo){
    state.workOrders.dispatch = [];
    renderDispatchTable();
    return;
  }
  let query = state.client
    .from("work_orders")
    .select("id, project_id, type, status, scheduled_start, scheduled_end, address, customer_label, notes, priority, assigned_to_user_id, external_source, external_id, sla_due_at, contact_phone, lat, lng, created_at, updated_at")
    .eq("project_id", state.activeProject.id);

  const dateValue = $("dispatchDateFilter")?.value || "";
  if (dateValue){
    const target = new Date(`${dateValue}T00:00:00`);
    const start = startOfDay(target).toISOString();
    const end = endOfDay(target).toISOString();
    query = query.gte("scheduled_start", start).lte("scheduled_start", end);
  }
  const statusValue = $("dispatchStatusFilter")?.value || "";
  if (statusValue){
    query = query.eq("status", statusValue);
  }
  const assignValue = $("dispatchAssignFilter")?.value || "all";
  if (assignValue === "assigned"){
    query = query.not("assigned_to_user_id", "is", null);
  } else if (assignValue === "unassigned"){
    query = query.is("assigned_to_user_id", null);
  }

  const { data, error } = await query
    .order("scheduled_start", { ascending: true, nullsFirst: true })
    .order("priority", { ascending: true });
  if (error){
    if (isMissingTable(error)){
      state.features.dispatch = false;
      state.workOrders.dispatch = [];
      renderDispatchTable();
      return;
    }
    toast("Dispatch load error", error.message);
    return;
  }
  state.workOrders.dispatch = data || [];
  renderDispatchTable();
  renderDispatchWarnings();
}

function renderDispatchTable(){
  const wrap = $("dispatchTable");
  if (!wrap) return;
  if (!state.activeProject){
    wrap.innerHTML = `<div class="muted small">${t("laborNoProject")}</div>`;
    return;
  }
  if (!canViewDispatch()){
    wrap.innerHTML = `<div class="muted small">Dispatch is limited to privileged roles.</div>`;
    return;
  }
  const rows = state.workOrders.dispatch || [];
  if (!rows.length){
    wrap.innerHTML = `<div class="muted small">${t("woNoOrders")}</div>`;
    return;
  }
  const techOptions = state.workOrders.technicians || [];
  wrap.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Scheduled</th>
          <th>Type</th>
          <th>Status</th>
          <th>Customer</th>
          <th>Address</th>
          <th>Priority</th>
          <th>Assigned</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => {
          const scheduled = row.scheduled_start ? new Date(row.scheduled_start).toLocaleString() : "Unscheduled";
          const statusClass = statusPillClass(row.status);
          const assignedName = techOptions.find(t => t.id === row.assigned_to_user_id)?.name || "";
          return `
            <tr>
              <td>${escapeHtml(scheduled)}</td>
              <td>${escapeHtml(row.type || "")}</td>
              <td><span class="status-pill ${statusClass}">${escapeHtml(row.status || "")}</span></td>
              <td>${escapeHtml(row.customer_label || "")}</td>
              <td>${escapeHtml(row.address || "")}</td>
              <td>${escapeHtml(String(row.priority ?? ""))}</td>
              <td>
                <select class="input compact" data-action="assignWorkOrder" data-id="${row.id}">
                  <option value="">Unassigned</option>
                  ${techOptions.map(t => `
                    <option value="${t.id}" ${t.id === row.assigned_to_user_id ? "selected" : ""}>${escapeHtml(t.name)}</option>
                  `).join("")}
                </select>
                ${assignedName ? `<div class="muted small">${escapeHtml(assignedName)}</div>` : ""}
              </td>
              <td><button class="btn ghost" data-action="editWorkOrder" data-id="${row.id}">Edit</button></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderDispatchWarnings(){
  const wrap = $("dispatchImportWarnings");
  if (!wrap) return;
  const warnings = state.workOrders.importWarnings || [];
  if (!warnings.length){
    wrap.style.display = "none";
    wrap.innerHTML = "";
    return;
  }
  wrap.style.display = "";
  wrap.innerHTML = `
    <div style="font-weight:900;">Import warnings</div>
    <ul class="muted small" style="margin-top:6px;">
      ${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join("")}
    </ul>
  `;
}

function openDispatchModal(order = null){
  const modal = $("dispatchModal");
  if (!modal) return;
  state.workOrders.editing = order ? order.id : null;
  $("dispatchType").value = order?.type || "INSTALL";
  $("dispatchStatus").value = order?.status || "NEW";
  $("dispatchScheduledStart").value = order?.scheduled_start ? order.scheduled_start.slice(0, 16) : "";
  $("dispatchScheduledEnd").value = order?.scheduled_end ? order.scheduled_end.slice(0, 16) : "";
  $("dispatchCustomerLabel").value = order?.customer_label || "";
  $("dispatchAddress").value = order?.address || "";
  $("dispatchLat").value = Number.isFinite(order?.lat) ? String(order.lat) : "";
  $("dispatchLng").value = Number.isFinite(order?.lng) ? String(order.lng) : "";
  $("dispatchContactPhone").value = order?.contact_phone || "";
  $("dispatchPriority").value = Number.isFinite(order?.priority) ? String(order.priority) : "3";
  $("dispatchSlaDueAt").value = order?.sla_due_at ? order.sla_due_at.slice(0, 16) : "";
  $("dispatchNotes").value = order?.notes || "";
  $("dispatchAssignUser").value = order?.assigned_to_user_id || "";
  modal.style.display = "flex";
}

function closeDispatchModal(){
  const modal = $("dispatchModal");
  if (modal) modal.style.display = "none";
  state.workOrders.editing = null;
}

async function saveDispatchWorkOrder(){
  if (!state.client || !state.user || !state.activeProject) return;
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const payload = {
    project_id: state.activeProject.id,
    type: $("dispatchType").value,
    status: $("dispatchStatus").value,
    scheduled_start: $("dispatchScheduledStart").value ? new Date($("dispatchScheduledStart").value).toISOString() : null,
    scheduled_end: $("dispatchScheduledEnd").value ? new Date($("dispatchScheduledEnd").value).toISOString() : null,
    customer_label: $("dispatchCustomerLabel").value.trim() || null,
    address: $("dispatchAddress").value.trim() || null,
    lat: Number.isFinite(Number($("dispatchLat").value)) ? Number($("dispatchLat").value) : null,
    lng: Number.isFinite(Number($("dispatchLng").value)) ? Number($("dispatchLng").value) : null,
    contact_phone: $("dispatchContactPhone").value.trim() || null,
    priority: Number.isFinite(Number($("dispatchPriority").value)) ? Number($("dispatchPriority").value) : 3,
    sla_due_at: $("dispatchSlaDueAt").value ? new Date($("dispatchSlaDueAt").value).toISOString() : null,
    notes: $("dispatchNotes").value.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const assignedUserId = $("dispatchAssignUser").value || null;
  const previous = state.workOrders.dispatch.find(r => r.id === state.workOrders.editing);
  const previousAssigned = previous?.assigned_to_user_id || null;
  let workOrderId = state.workOrders.editing;
  if (!workOrderId){
    payload.created_by = state.user.id;
    const { data, error } = await state.client
      .from("work_orders")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error){
      toast("Create failed", error.message);
      return;
    }
    workOrderId = data?.id || null;
    if (workOrderId){
      await insertWorkOrderEvent(workOrderId, "CREATED", payload);
    }
  } else {
    const { error } = await state.client
      .from("work_orders")
      .update(payload)
      .eq("id", workOrderId);
    if (error){
      toast("Update failed", error.message);
      return;
    }
    await insertWorkOrderEvent(workOrderId, "UPDATED", payload);
  }

  if (workOrderId && assignedUserId && assignedUserId !== previousAssigned){
    const { error } = await state.client.rpc("fn_assign_work_order", {
      work_order_id: workOrderId,
      technician_user_id: assignedUserId,
    });
    if (error){
      toast("Assign failed", error.message);
    }
  } else if (workOrderId && !assignedUserId && previousAssigned){
    await state.client
      .from("work_orders")
      .update({ assigned_to_user_id: null })
      .eq("id", workOrderId);
  }

  closeDispatchModal();
  await loadDispatchWorkOrders();
}

function parseCsv(text){
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1){
    const char = text[i];
    const next = text[i + 1];
    if (char === "\""){
      if (inQuotes && next === "\""){
        value += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes){
      row.push(value);
      value = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes){
      if (value.length || row.length){
        row.push(value);
        rows.push(row);
        row = [];
        value = "";
      }
      continue;
    }
    value += char;
  }
  if (value.length || row.length){
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function findHeaderIndex(headers, names){
  for (const name of names){
    const idx = headers.indexOf(name);
    if (idx >= 0) return idx;
  }
  return -1;
}

async function readLocationImportRows(file){
  const name = String(file?.name || "").toLowerCase();
  if (name.endsWith(".kmz")){
    const parsed = await parseKmzFile(file);
    if (!parsed.length) return [];
    const headers = ["location_name", "latitude", "longitude", "notes", "billing_codes", "photo_urls", "progress_notes", "finish_date", "map_url", "gps_status"];
    const gridRows = parsed.map((row) => [
      row.location_name || "",
      row.latitude ?? "",
      row.longitude ?? "",
      row.notes || "",
      Array.isArray(row.billing_codes) ? row.billing_codes.join("|") : (row.billing_codes || row.billing_code || ""),
      Array.isArray(row.photo_urls) ? row.photo_urls.join("|") : (row.photo_urls || ""),
      row.progress_notes || "",
      row.finish_date || "",
      row.map_url || "",
      row.gps_status || "",
    ]);
    return [headers, ...gridRows];
  }
  throw new Error("Unsupported file type. Upload .kmz.");
}

async function resolveUserIdByIdentifier(identifier){
  if (!identifier || !state.client) return null;
  const { data, error } = await state.client.rpc("fn_resolve_user_id", { identifier });
  if (error) return null;
  return data || null;
}

async function importDispatchCsv(file){
  if (!file || !state.client || !state.activeProject) return;
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  state.workOrders.importWarnings = [];
  renderDispatchWarnings();
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) return;
  const headers = rows[0].map((h, idx) => {
    const trimmed = String(h || "").trim();
    return idx === 0 ? trimmed.replace(/^\uFEFF/, "") : trimmed;
  });
  const index = (name) => headers.indexOf(name);
  const required = ["external_id", "type"];
  const missing = required.filter(name => index(name) === -1);
  if (missing.length){
    toast("CSV error", `Missing headers: ${missing.join(", ")}`);
    return;
  }
  const dataRows = rows.slice(1).filter(r => r.length && r.some(cell => String(cell || "").trim().length));
  const payloads = [];
  const assignments = [];
  dataRows.forEach((row, rowIndex) => {
    const externalId = String(row[index("external_id")] || "").trim();
    if (!externalId) return;
    const typeValue = String(row[index("type")] || "").trim().toUpperCase();
    const type = WORK_ORDER_TYPES.includes(typeValue) ? typeValue : "INSTALL";
    const scheduledStart = row[index("scheduled_start")] ? new Date(row[index("scheduled_start")]).toISOString() : null;
    const scheduledEnd = row[index("scheduled_end")] ? new Date(row[index("scheduled_end")]).toISOString() : null;
    const priority = Number(row[index("priority")] || 3);
    const payload = {
      project_id: state.activeProject.id,
      external_source: "CSV",
      external_id: externalId,
      type,
      status: "NEW",
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      address: String(row[index("address")] || "").trim() || null,
      lat: Number.isFinite(Number(row[index("lat")])) ? Number(row[index("lat")]) : null,
      lng: Number.isFinite(Number(row[index("lng")])) ? Number(row[index("lng")]) : null,
      customer_label: String(row[index("customer_label")] || "").trim() || null,
      notes: String(row[index("notes")] || "").trim() || null,
      priority: Number.isFinite(priority) ? priority : 3,
      sla_due_at: row[index("sla_due_at")] ? new Date(row[index("sla_due_at")]).toISOString() : null,
      created_by: state.user?.id || null,
      updated_at: new Date().toISOString(),
    };
    payloads.push(payload);
    const assignEmail = String(row[index("assigned_to_email")] || "").trim();
    const assignEmployeeId = String(row[index("assigned_to_employee_id")] || "").trim();
    if (assignEmail || assignEmployeeId){
      assignments.push({
        external_id: externalId,
        email: assignEmail,
        employee_id: assignEmployeeId,
        row_number: rowIndex + 2,
      });
    }
  });
  if (!payloads.length){
    toast("CSV error", "No valid rows.");
    return;
  }

  const externalIds = payloads.map(p => p.external_id);
  const { data: existingRows } = await state.client
    .from("work_orders")
    .select("id, external_id")
    .eq("project_id", state.activeProject.id)
    .eq("external_source", "CSV")
    .in("external_id", externalIds);
  const existingMap = new Map((existingRows || []).map(r => [r.external_id, r.id]));

  const { error } = await state.client
    .from("work_orders")
    .upsert(payloads, { onConflict: "project_id,external_source,external_id" });
  if (error){
    toast("Import failed", error.message);
    return;
  }

  const { data: allRows } = await state.client
    .from("work_orders")
    .select("id, external_id")
    .eq("project_id", state.activeProject.id)
    .eq("external_source", "CSV")
    .in("external_id", externalIds);
  const idMap = new Map((allRows || []).map(r => [r.external_id, r.id]));

  for (const payload of payloads){
    const workOrderId = idMap.get(payload.external_id);
    if (!workOrderId) continue;
    const wasExisting = existingMap.has(payload.external_id);
    await insertWorkOrderEvent(workOrderId, wasExisting ? "UPDATED" : "CREATED", payload);
  }

  const warnings = [];
  for (const assignment of assignments){
    const workOrderId = idMap.get(assignment.external_id);
    if (!workOrderId) continue;
    const identifier = assignment.employee_id || assignment.email;
    const userId = await resolveUserIdByIdentifier(identifier);
    if (!userId){
      warnings.push(`Row ${assignment.row_number}: no match for ${identifier}`);
      continue;
    }
    await state.client.rpc("fn_assign_work_order", {
      work_order_id: workOrderId,
      technician_user_id: userId,
    });
  }

  await loadDispatchWorkOrders();
  state.workOrders.importWarnings = warnings;
  renderDispatchWarnings();
  if (warnings.length){
    toast("Import complete", `Imported ${payloads.length} work orders. ${warnings.length} warnings.`);
  } else {
    toast("Import complete", `Imported ${payloads.length} work orders.`);
  }
}

async function handleLocationImport(file){
  if (!file){
    const input = $("importLocationsInput");
    if (input){
      input.value = "";
      input.click();
    }
    return;
  }
  const activeProjectId = state.activeProject?.id || null;
  if (!activeProjectId){
    toast("Project required", "Select a project before importing.");
    return;
  }

  dlog("Import handler reached, file selected:", file.name);
  const name = file.name.toLowerCase();
  let rows = [];
  try{
    if (name.endsWith(".kmz")){
      rows = await parseKmzFile(file);
    } else {
      toast("Import error", "Unsupported file type. Upload KMZ.");
      return;
    }
  } catch (error){
    reportErrorToast("Import failed", error);
    return;
  }
  if (!rows.length){
    toast("Import error", "No data rows found.");
    return;
  }
  dlog("Parsed rows:", rows);
  const kmzAllRows = Array.isArray(rows.__allKmzRows) ? rows.__allKmzRows : rows;
  const kmzLayerNames = getOrderedKmzLayerList(rows.__kmlLayerNames || kmzAllRows.map((row) => row?.__kml_layer || row?.__kml_layer_raw));
  state.map.kmzLayerCatalog = kmzLayerNames;

  const normalized = rows.map((row) => ({
    location_name: String(row.location_name).trim(),
    latitude: Number.parseFloat(row.latitude),
    longitude: Number.parseFloat(row.longitude),
    notes: row.progress_notes
      ? String(row.progress_notes).trim()
      : (row.notes ? String(row.notes).trim() : null),
    finish_date: row.finish_date ? String(row.finish_date).trim() : null,
    map_url: row.map_url ? String(row.map_url).trim() : null,
    gps_status: row.gps_status ? String(row.gps_status).trim() : null,
    items: Array.isArray(row.items) ? row.items : buildItemsFromRow(row),
    billing_codes: buildBillingCodesFromRow(row),
    photo_urls: buildPhotoUrlsFromRow(row),
    __kml_layer: canonicalKmzLayerName(row.__kml_layer || row.__kml_layer_raw || ""),
    __kml_layer_raw: String(row.__kml_layer_raw || row.__kml_layer || "").trim() || null,
    __rowNumber: row.__rowNumber,
  }));

  const validation = validateLocationImportRows(normalized);

  state.importPreview.projectId = activeProjectId;
  state.importPreview.rawRows = normalized;
  state.importPreview.rows = validation.validRows;
  state.importPreview.validation = validation;
  state.importPreview.preview = renderImportPreviewMarkers(validation.validRows);
  renderKmzPreviewFeatures(kmzAllRows, file.name || "KMZ Import");

  openImportLocationsModal(validation.validRows, state.activeProject);
}

async function importLocationsFile(file){
  if (!file) return;
  if (!state.activeProject){
    toast("Project required", "Select a project before importing.");
    return;
  }
  if (!isPrivilegedRole()){
    toast("Not allowed", "Only Admin or Project Manager can import.");
    return;
  }
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  if (!state.client || !state.user){
    toast("Import unavailable", "Sign in to import locations.");
    return;
  }
  let rows = [];
  try{
    rows = await readLocationImportRows(file);
  } catch (error){
    reportErrorToast("Import failed", error);
    return;
  }
  if (!rows.length){
    toast("Import error", "No rows found.");
    return;
  }
  const headers = rows[0].map(SpecCom.helpers.normalizeImportHeader);
  const nameIdx = findHeaderIndex(headers, ["location_name", "name"]);
  const latIdx = findHeaderIndex(headers, ["lat", "latitude"]);
  const lngIdx = findHeaderIndex(headers, ["lng", "longitude"]);
  const dropIdx = findHeaderIndex(headers, ["drop_number"]);
  const workTypeIdx = findHeaderIndex(headers, ["work_type"]);
  const notesIdx = findHeaderIndex(headers, ["notes"]);
  const billingIdx = findHeaderIndex(headers, ["billing_code_default"]);

  const missingHeaders = [];
  if (latIdx < 0) missingHeaders.push("lat/latitude");
  if (lngIdx < 0) missingHeaders.push("lng/longitude");
  if (missingHeaders.length){
    toast("Import error", `Missing headers: ${missingHeaders.join(", ")}`);
    return;
  }

  const dataRows = rows.slice(1).filter((row) => row?.length && row.some(cell => String(cell || "").trim().length));
  if (!dataRows.length){
    toast("Import error", "No data rows found.");
    return;
  }

  let skipped = 0;
  const skippedRows = [];
  const payloads = [];
  dataRows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const lat = Number(String(row[latIdx] ?? "").trim());
    const lng = Number(String(row[lngIdx] ?? "").trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)){
      skipped += 1;
      skippedRows.push(rowNumber);
      return;
    }
    const rawName = nameIdx >= 0 ? String(row[nameIdx] ?? "").trim() : "";
    const name = rawName || `Location ${rowNumber - 1}`;
    const payload = {
      project_id: state.activeProject.id,
      name,
      gps_lat: lat,
      gps_lng: lng,
      created_by: state.user?.id || null,
    };
    const dropNumber = dropIdx >= 0 ? String(row[dropIdx] ?? "").trim() : "";
    const workType = workTypeIdx >= 0 ? String(row[workTypeIdx] ?? "").trim() : "";
    const notes = notesIdx >= 0 ? String(row[notesIdx] ?? "").trim() : "";
    const billingCode = billingIdx >= 0 ? String(row[billingIdx] ?? "").trim() : "";
    if (dropNumber) payload.drop_number = dropNumber;
    if (workType) payload.work_type = workType;
    if (notes) payload.notes = notes;
    if (billingCode) payload.billing_code_default = billingCode;
    payloads.push(payload);
  });

  if (!payloads.length){
    toast("Import error", "No rows with valid coordinates.");
    return;
  }

  const { error } = await state.client
    .from("sites")
    .insert(payloads);
  if (error){
    reportErrorToast("Import failed", error);
    return;
  }
  await loadProjectSites(state.activeProject?.id || null);
  if (skippedRows.length){
    console.warn("Import skipped rows with missing/invalid coordinates:", skippedRows);
  }
  toast("Import complete", `Imported ${payloads.length} locations, skipped ${skipped} rows.`);
}

async function importLocationsSpreadsheetForProject(file, projectId){
  if (!file) return { inserted: 0, updated: 0, skipped: 0 };
  if (!projectId){
    toast("Project required", "Select a project before importing.");
    return null;
  }
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return null;
  }
  if (!state.client || !state.user){
    toast("Import unavailable", "Sign in to import locations.");
    return null;
  }
  let rows = [];
  try{
    rows = await readLocationImportRows(file);
  } catch (error){
    reportErrorToast("Import failed", error);
    return null;
  }
  if (!rows.length){
    toast("Import error", "No rows found.");
    return null;
  }
  const headers = rows[0].map(SpecCom.helpers.normalizeImportHeader);
  const nameIdx = findHeaderIndex(headers, ["location_name", "name"]);
  const latIdx = findHeaderIndex(headers, ["lat", "latitude"]);
  const lngIdx = findHeaderIndex(headers, ["lng", "longitude"]);
  const dropIdx = findHeaderIndex(headers, ["drop_number"]);
  const workTypeIdx = findHeaderIndex(headers, ["work_type"]);
  const notesIdx = findHeaderIndex(headers, ["notes"]);
  const billingIdx = findHeaderIndex(headers, ["billing_code_default"]);

  const missingHeaders = [];
  if (latIdx < 0) missingHeaders.push("lat/latitude");
  if (lngIdx < 0) missingHeaders.push("lng/longitude");
  if (missingHeaders.length){
    toast("Import error", `Missing headers: ${missingHeaders.join(", ")}`);
    return null;
  }

  const dataRows = rows.slice(1).filter((row) => row?.length && row.some(cell => String(cell || "").trim().length));
  if (!dataRows.length){
    toast("Import error", "No data rows found.");
    return null;
  }

  const { data: existingSites, error: existingError } = await state.client
    .from("sites")
    .select("id, name")
    .eq("project_id", projectId);
  if (existingError){
    reportErrorToast("Import failed", existingError);
    return null;
  }
  const byName = new Map((existingSites || []).map((s) => [String(s.name || "").trim().toLowerCase(), s]));

  let skipped = 0;
  const skippedRows = [];
  const inserts = [];
  const updates = [];

  dataRows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const lat = Number(String(row[latIdx] ?? "").trim());
    const lng = Number(String(row[lngIdx] ?? "").trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)){
      skipped += 1;
      skippedRows.push(rowNumber);
      return;
    }
    const rawName = nameIdx >= 0 ? String(row[nameIdx] ?? "").trim() : "";
    const name = rawName || `Location ${rowNumber - 1}`;
    const dropNumber = dropIdx >= 0 ? String(row[dropIdx] ?? "").trim() : "";
    const workType = workTypeIdx >= 0 ? String(row[workTypeIdx] ?? "").trim() : "";
    const notes = notesIdx >= 0 ? String(row[notesIdx] ?? "").trim() : "";
    const billingCode = billingIdx >= 0 ? String(row[billingIdx] ?? "").trim() : "";

    const existing = byName.get(String(name).trim().toLowerCase()) || null;
    if (existing){
      const update = {
        id: existing.id,
        data: {
          gps_lat: lat,
          gps_lng: lng,
        },
      };
      if (dropNumber) update.data.drop_number = dropNumber;
      if (workType) update.data.work_type = workType;
      if (notes) update.data.notes = notes;
      if (billingCode) update.data.billing_code_default = billingCode;
      updates.push(update);
    } else {
      const payload = {
        project_id: projectId,
        name,
        gps_lat: lat,
        gps_lng: lng,
        created_by: state.user?.id || null,
      };
      if (dropNumber) payload.drop_number = dropNumber;
      if (workType) payload.work_type = workType;
      if (notes) payload.notes = notes;
      if (billingCode) payload.billing_code_default = billingCode;
      inserts.push(payload);
    }
  });

  if (!inserts.length && !updates.length){
    toast("Import error", "No rows with valid coordinates.");
    return null;
  }

  let inserted = 0;
  let updated = 0;
  if (updates.length){
    for (const update of updates){
      const { error } = await state.client
        .from("sites")
        .update(update.data)
        .eq("id", update.id);
      if (error){
        reportErrorToast("Import failed", error);
        return null;
      }
      updated += 1;
    }
  }
  if (inserts.length){
    const { error } = await state.client
      .from("sites")
      .insert(inserts);
    if (error){
      reportErrorToast("Import failed", error);
      return null;
    }
    inserted = inserts.length;
  }

  if (skippedRows.length){
    console.warn("Import skipped rows with missing/invalid coordinates:", skippedRows);
  }
  toast("Import complete", `Added ${inserted} new locations, updated ${updated}, skipped ${skipped}.`);
  return { inserted, updated, skipped };
}

async function loadTechnicianTimesheet(){
  if (!state.features.labor) return;
  if (!isTechnician()){
    state.technician.timesheet = null;
    state.technician.events = [];
    state.technician.activeEvent = null;
    renderTechnicianDashboard();
    return;
  }
  if (!state.client || !state.user || isDemo){
    state.technician.timesheet = null;
    state.technician.events = [];
    state.technician.activeEvent = null;
    renderTechnicianDashboard();
    return;
  }
  const workDate = getLocalDateISO();
  const { data, error } = await state.client
    .from("technician_timesheets")
    .select("id, user_id, project_id, work_date, clock_in_at, clock_out_at, total_minutes_worked, created_at")
    .eq("user_id", state.user.id)
    .eq("work_date", workDate)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error){
    if (isMissingTable(error)){
      state.features.labor = false;
      state.technician.timesheet = null;
      state.technician.events = [];
      state.technician.activeEvent = null;
      renderTechnicianDashboard();
      return;
    }
    toast("Timesheet load error", error.message);
    return;
  }
  state.technician.timesheet = data?.[0] || null;
  await loadTechnicianEvents();
  await loadAssignedWorkOrders();
}

async function loadTechnicianEvents(){
  if (!state.client || !state.user || isDemo || !state.technician.timesheet){
    state.technician.events = [];
    state.technician.activeEvent = null;
    renderTechnicianDashboard();
    return;
  }
  const { data, error } = await state.client
    .from("technician_time_events")
    .select("id, event_type, started_at, ended_at, duration_minutes, created_at")
    .eq("timesheet_id", state.technician.timesheet.id)
    .order("created_at", { ascending: true });
  if (error){
    toast("Event load error", error.message);
    return;
  }
  state.technician.events = data || [];
  state.technician.activeEvent = state.technician.events.find(e => e.started_at && !e.ended_at) || null;
  renderTechnicianDashboard();
}

async function startTechnicianTimesheet(){
  if (!state.activeProject){
    toast("Project required", "Select a project before clocking in.");
    return;
  }
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  if (!state.client || !state.user) return;
  const { data, error } = await state.client.rpc("fn_start_timesheet", {
    user_id: state.user.id,
    project_id: state.activeProject.id,
  });
  if (error){
    toast("Clock in failed", error.message);
    return;
  }
  state.technician.timesheet = data || null;
  await loadTechnicianEvents();
  renderTechnicianDashboard();
}

async function logTechnicianEvent(eventType){
  if (!state.technician.timesheet){
    toast("Clock in required", t("techNoTimesheet"));
    return;
  }
  if (state.technician.timesheet.clock_out_at){
    toast("Clocked out", "Clock back in before logging events.");
    return;
  }
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const { error } = await state.client.rpc("fn_log_time_event", {
    timesheet_id: state.technician.timesheet.id,
    event_type: eventType,
  });
  if (error){
    toast("Event failed", error.message);
    return;
  }
  await loadTechnicianEvents();
}

async function endTechnicianTimesheet(){
  if (!state.technician.timesheet) return;
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const activeEvent = state.technician.activeEvent;
  if (activeEvent && activeEvent.event_type === "START_JOB"){
    toast("Active job", "End the job before clocking out.");
    return;
  }
  const { data, error } = await state.client.rpc("fn_end_timesheet", {
    timesheet_id: state.technician.timesheet.id,
  });
  if (error){
    toast("Clock out failed", error.message);
    return;
  }
  state.technician.timesheet = data || state.technician.timesheet;
  await loadTechnicianEvents();
  renderTechnicianDashboard();
}

async function loadLaborRows(){
  const wrap = $("laborTable");
  if (!wrap) return;
  if (!state.features.labor){
    state.labor.rows = [];
    renderLaborTable();
    return;
  }
  if (!canViewLabor()){
    state.labor.rows = [];
    renderLaborTable();
    return;
  }
  if (!state.activeProject){
    state.labor.rows = [];
    renderLaborTable();
    return;
  }
  if (isDemo){
    state.labor.rows = [];
    renderLaborTable();
    return;
  }
  const { data, error } = await state.client
    .from("technician_timesheets")
    .select("id, user_id, work_date, total_minutes_worked, clock_in_at, clock_out_at, created_at")
    .eq("project_id", state.activeProject.id)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error){
    if (isMissingTable(error)){
      state.features.labor = false;
      state.labor.rows = [];
      renderLaborTable();
      return;
    }
    toast("Labor load error", error.message);
    return;
  }
  const rows = data || [];
  const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
  let nameById = new Map();
  if (userIds.length){
    const { data: profiles, error: profileError } = await state.client
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    if (!profileError){
      nameById = new Map((profiles || []).map(p => [p.id, p.display_name || p.id]));
    }
  }

  const pendingIds = rows.filter(r => r.total_minutes_worked == null).map(r => r.id);
  const paidByTimesheet = new Map();
  if (pendingIds.length){
    const { data: events } = await state.client
      .from("technician_time_events")
      .select("timesheet_id, event_type, duration_minutes, started_at, ended_at")
      .in("timesheet_id", pendingIds);
    const bySheet = new Map();
    (events || []).forEach((event) => {
      if (!bySheet.has(event.timesheet_id)) bySheet.set(event.timesheet_id, []);
      bySheet.get(event.timesheet_id).push(event);
    });
    bySheet.forEach((evs, id) => {
      const summary = computeTechnicianSummary(evs);
      paidByTimesheet.set(id, summary.paidMinutes);
    });
  }

  state.labor.rows = rows.map((row) => {
    const paidMinutes = Number(row.total_minutes_worked ?? paidByTimesheet.get(row.id) ?? 0);
    return {
      id: row.id,
      user_id: row.user_id,
      name: nameById.get(row.user_id) || row.user_id,
      work_date: row.work_date,
      paid_minutes: paidMinutes,
      clock_in_at: row.clock_in_at,
      clock_out_at: row.clock_out_at,
    };
  });
  renderLaborTable();
}

function renderLaborTable(){
  const wrap = $("laborTable");
  if (!wrap) return;
  if (!state.activeProject){
    wrap.innerHTML = `<div class="muted small">${t("laborNoProject")}</div>`;
    return;
  }
  const rows = state.labor.rows || [];
  if (!rows.length){
    wrap.innerHTML = `<div class="muted small">${t("laborNoRows")}</div>`;
    return;
  }
  wrap.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>${t("laborTechLabel")}</th>
          <th>${t("laborDateLabel")}</th>
          <th>${t("laborPaidHoursLabel")}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => {
          const hours = (Number(row.paid_minutes || 0) / 60).toFixed(2);
          return `
            <tr>
              <td>${escapeHtml(row.name || "")}</td>
              <td>${escapeHtml(row.work_date || "")}</td>
              <td>${hours}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function exportLaborCsv(){
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const rows = state.labor.rows || [];
  if (!rows.length) return;
  const header = [t("laborTechLabel"), t("laborDateLabel"), t("laborPaidHoursLabel")];
  const csvRows = rows.map((row) => ([
    row.name || "",
    row.work_date || "",
    (Number(row.paid_minutes || 0) / 60).toFixed(2),
  ]));
  const csv = [header.map(escapeCsv).join(",")]
    .concat(csvRows.map(r => r.map(escapeCsv).join(",")))
    .join("\n");
  const projectLabel = state.activeProject?.job_number || state.activeProject?.name || "project";
  downloadFile(`labor-${projectLabel}.csv`, csv, "text/csv");
}

function showAuth(show){
  $("viewAuth").style.display = show ? "" : "none";
  $("viewApp").style.display = show ? "none" : "";
}

function setWhoami(){
  const authed = isDemo || Boolean(state.user);
  const signOutBtn = $("btnSignOut");
  if (signOutBtn) signOutBtn.style.display = authed ? "" : "none";
  ["btnProjects", "btnMenu", "btnOpenProjects", "btnMapToggle"].forEach((id) => {
    const el = $(id);
    if (el) el.style.display = authed ? "" : "none";
  });
  const messagesBtn = $("btnMessages");
  if (messagesBtn) messagesBtn.style.display = authed && state.messagesEnabled && state.features.messages ? "" : "none";
  updateMessagesBadge();
  setDemoBadge();
}

function setDemoBadge(){
  const badge = $("demoEnvBadge");
  if (!badge) return;
  badge.textContent = t("demoEnvBadge");
  badge.style.display = isDemoUser() ? "inline-flex" : "none";
}

function applyDemoLock(el){
  if (!el) return;
  el.disabled = true;
  el.title = t("availableInProduction");
  el.setAttribute("aria-disabled", "true");
}

function applyDemoRestrictions(root = document){
  if (!isDemoUser()) return;
  [
    "#btnCreateInvoice",
    "#btnMarkNodeReady",
    "#btnBillingExportCsv",
    "#btnBillingPrint",
    "#btnImportUsage",
    "#btnBillingSave",
    "#btnBillingReady",
    "#btnAddLineItem",
    "#btnAdminCreateUser",
    "#btnDemoLogin",
    "#btnTechClockIn",
    "#btnTechClockOut",
    "#btnTechStartJob",
    "#btnTechPauseJob",
    "#btnTechLunch",
    "#btnTechBreak",
    "#btnTechTruckInspection",
    "#btnTechEndJob",
    "#btnLaborExportCsv",
    "#btnDispatchCreate",
    "#btnDispatchImportCsv",
    "#btnDispatchSave",
  ].forEach((selector) => applyDemoLock(root.querySelector(selector)));
}

function ensureDemoSeed(){
  if (!isDemo) return;
  if (state.demo.seeded) return;
  const projectId = state.demo.project?.id || "demo-project-1";
  const today = new Date();
  const todayStart = new Date(today);
  todayStart.setHours(9, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 60 * 60 * 1000);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 90 * 60 * 1000);

  state.demo.project = state.demo.project || {
    id: projectId,
    name: "SpecCom Demo",
    location: "Ruidoso, NM",
    job_number: "DEMO-001",
    is_demo: true,
  };

  state.demo.workOrders = [
    {
      id: "demo-wo-trouble",
      project_id: projectId,
      type: "TROUBLE_TICKET",
      status: "ASSIGNED",
      scheduled_start: todayStart.toISOString(),
      scheduled_end: todayEnd.toISOString(),
      address: "201 Pine Ridge Ln",
      customer_label: "Trouble ticket: Fiber drop",
      notes: "No signal reported. Check ONT and splice enclosure.",
      priority: 2,
      sla_due_at: todayEnd.toISOString(),
      assigned_to_user_id: "demo-tech",
    },
    {
      id: "demo-wo-service",
      project_id: projectId,
      type: "MAINTENANCE",
      status: "ASSIGNED",
      scheduled_start: tomorrowStart.toISOString(),
      scheduled_end: tomorrowEnd.toISOString(),
      address: "418 Cedar Park Ave",
      customer_label: "Service order: Site audit",
      notes: "Verify enclosure condition and capture photos.",
      priority: 3,
      sla_due_at: tomorrowEnd.toISOString(),
      assigned_to_user_id: "demo-tech",
    },
  ];

  state.demo.sites = [
    {
      id: "demo-site-1",
      project_id: projectId,
      name: "Site 1",
      notes: "Demo site notes.",
      gps_lat: 33.3946,
      gps_lng: -105.6731,
      gps_accuracy_m: 8,
      created_at: new Date().toISOString(),
    },
  ];
  state.demo.siteMedia = [];
  state.demo.siteCodes = [];
  state.demo.siteEntries = [];

  state.demo.seeded = true;
}

function renderProjects(){
  const summary = $("projectSummary");
  const meta = $("projectMeta");
  const currentCard = $("currentProjectCard");
  const infoCard = $("projectInfoCard");
  const hasProject = Boolean(state.activeProject);
  if (currentCard) currentCard.style.display = hasProject ? "" : "none";
  if (infoCard) infoCard.style.display = hasProject ? "" : "none";
  if (summary){
    summary.textContent = state.activeProject
      ? (state.activeProject.job_number ? `${state.activeProject.name} (Job ${state.activeProject.job_number})` : (state.activeProject.name || "Project"))
      : "";
    summary.style.display = hasProject ? "" : "none";
  }
  if (state.activeProject){
    if (meta){
      const job = state.activeProject.job_number ? `Job ${state.activeProject.job_number}` : "Job -";
      const loc = state.activeProject.location ? ` | ${state.activeProject.location}` : "";
      meta.textContent = `${job}${loc}`;
    }
    setText("jobTitle", state.activeProject.job_number ? `Job ${state.activeProject.job_number}` : "Job -");
    setText("jobSubtitle", state.activeProject.name || "Project");
  } else if (meta){
    meta.textContent = "";
    setText("jobTitle", "Job -");
    setText("jobSubtitle", "Project");
  }
  renderProjectInfo();
  renderProjectsList();
  syncDprProjectSelection();
  renderDprProjectOptions();
  updateProjectScopedControls();
}

function renderProjectInfo(){
  const wrap = $("projectInfoBody");
  if (!wrap) return;
  const project = state.activeProject;
  if (!project){
    wrap.innerHTML = "";
    return;
  }
  const name = escapeHtml(project.name || "Project");
  const description = project.description ? escapeHtml(project.description) : "";
  const createdAt = project.created_at ? new Date(project.created_at).toLocaleDateString() : "";
  const createdBy = project.created_by || project.created_by_id || "";
  const createdByLabel = createdBy
    ? (createdBy === state.user?.id ? "You" : String(createdBy).slice(0, 8))
    : "";
  const canDelete = isOwnerOrAdmin();
  const canEdit = SpecCom.helpers.isRoot() || getRoleCode() === ROLES.PROJECT_MANAGER || isOwnerOrAdmin();
  wrap.innerHTML = `
    <div class="project-info-row"><span class="project-info-label">Name</span><span class="project-info-value">${name}</span></div>
    ${description ? `<div class="project-info-row"><span class="project-info-label">Description</span><span class="project-info-value">${description}</span></div>` : ""}
    ${createdAt ? `<div class="project-info-row"><span class="project-info-label">Created</span><span class="project-info-value">${createdAt}</span></div>` : ""}
    ${createdByLabel ? `<div class="project-info-row"><span class="project-info-label">Created by</span><span class="project-info-value">${createdByLabel}</span></div>` : ""}
    <div class="row" style="margin-top:12px; justify-content:flex-end; gap:8px;">
      ${canEdit ? `<button id="btnEditProject" class="btn secondary small" type="button">Edit project</button>` : ""}
      ${canDelete ? `<button id="btnDeleteProject" class="btn danger small" type="button">Delete project</button>` : ""}
    </div>
  `;
  const editBtn = $("btnEditProject");
  if (editBtn){
    editBtn.addEventListener("click", () => SpecCom.helpers.editProject());
  }
  const deleteBtn = $("btnDeleteProject");
  if (deleteBtn){
    deleteBtn.addEventListener("click", () => openDeleteProjectModal());
  }
}

function renderProjectsList(){
  const list = $("projectsList");
  if (!list) return;
  list.innerHTML = "";
  const empty = $("projectsEmpty");
  const footer = $("projectsFooter");
  if (empty) empty.style.display = state.projects.length ? "none" : "";
  list.style.display = state.projects.length ? "" : "none";
  if (footer) footer.style.display = state.projects.length ? "" : "none";
  state.projects.forEach((project) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "project-row";
    row.dataset.projectId = project.id;
    if (state.activeProject?.id === project.id){
      row.classList.add("active");
    }
    const title = project.job_number ? `${project.name} (Job ${project.job_number})` : (project.name || "Project");
    const meta = project.location ? project.location : (project.description || "");
    row.innerHTML = `
      <div class="project-row-title">${escapeHtml(title)}</div>
      ${meta ? `<div class="project-row-meta">${escapeHtml(meta)}</div>` : ""}
    `;
    row.addEventListener("click", () => {
      setActiveProjectById(project.id);
      closeProjectsModal();
    });
    list.appendChild(row);
  });
}

function updateProjectScopedControls(){
  const importBtn = $("btnImportLocations");
  const hasProject = Boolean(state.activeProject);
  const demoLocked = isDemoUser();
  const allowed = SpecCom.helpers.isRoot() || isPrivilegedRole();
  if (importBtn){
    importBtn.style.display = "";
    if (SpecCom.helpers.isRoot()){
      importBtn.disabled = !hasProject;
      importBtn.title = hasProject ? "" : "Select a project first.";
    } else {
      importBtn.disabled = !hasProject || !allowed || demoLocked;
      if (!hasProject){
        importBtn.title = "Select a project first.";
      } else if (demoLocked){
        importBtn.title = t("availableInProduction");
      } else if (!allowed){
        importBtn.title = "Admin or Project Manager required.";
      } else {
        importBtn.title = "";
      }
    }
  }

  const canManageProjects = isOwnerOrAdmin();
  const createBtn = $("btnProjectsCreate");
  const emptyCreateBtn = $("btnProjectsEmptyCreate");
  if (createBtn) createBtn.style.display = canManageProjects ? "" : "none";
  if (emptyCreateBtn) emptyCreateBtn.style.display = canManageProjects ? "" : "none";
}

function openProjectsModal(){
  const modal = $("projectsModal");
  if (!modal) return;
  renderProjectsList();
  modal.style.display = "";
}

function closeProjectsModal(){
  const modal = $("projectsModal");
  if (!modal) return;
  modal.style.display = "none";
}

function openMessagesModal(){
  if (!state.features.messages || !state.messagesEnabled) return;
  const modal = $("messagesModal");
  if (!modal) return;
  loadMessages().then(async () => {
    if (!state.messagesEnabled) return;
    await loadMessageRecipients();
    applyMessagesUiLabels();
    syncMessageComposerMode();
    renderMessages();
    markMessagesRead();
    modal.style.display = "";
  });
}

function closeMessagesModal(){
  const modal = $("messagesModal");
  if (!modal) return;
  modal.style.display = "none";
}

function openMenuModal(){
  const modal = $("menuModal");
  if (!modal) return;
  if (isMapViewActive() && isMobileViewport() && state.map.drawerOpen !== false){
    setDrawerOpen(false);
  }
  const parent = modal.querySelector("[data-places-expand='project']");
  const children = modal.querySelector("[data-places-group='project']");
  if (parent) parent.classList.add("is-open");
  if (children) children.classList.add("is-open");
  renderMapLayerPanel();
  modal.style.display = "";
}

function closeMenuModal(){
  const modal = $("menuModal");
  if (!modal) return;
  modal.style.display = "none";
}

function openPriceSheetModal(){
  if (!SpecCom.helpers.isRoot()){
    toast("Not allowed", "Only ROOT can import pricing.");
    return;
  }
  const modal = $("priceSheetModal");
  if (!modal) return;
  const input = $("priceSheetInput");
  if (input) input.value = "";
  modal.style.display = "";
}

function closePriceSheetModal(){
  const modal = $("priceSheetModal");
  if (!modal) return;
  modal.style.display = "none";
}

function openStakingProjectModal(){
  if (!SpecCom.helpers.isRoot()){
    toast("Not allowed", "Only ROOT can create projects from staking PDFs.");
    return;
  }
  const modal = $("stakingProjectModal");
  if (!modal) return;
  const input = $("stakingProjectInput");
  const locationsInput = $("stakingLocationsInput");
  const summary = $("stakingProjectSummary");
  if (input) input.value = "";
  if (locationsInput) locationsInput.value = "";
  if (summary) summary.textContent = "";
  modal.style.display = "";
}

function closeStakingProjectModal(){
  const modal = $("stakingProjectModal");
  if (!modal) return;
  modal.style.display = "none";
}

function openTestResultsModal(){
  if (!SpecCom.helpers.isRoot()){
    toast("Not allowed", "Only ROOT can import test results.");
    return;
  }
  const modal = $("testResultsModal");
  if (!modal) return;
  const input = $("testResultsInput");
  const summary = $("testResultsSummary");
  if (input) input.value = "";
  if (summary) summary.textContent = "";
  modal.style.display = "";
}

function closeTestResultsModal(){
  const modal = $("testResultsModal");
  if (!modal) return;
  modal.style.display = "none";
}

async function loadJsZip(){
  if (window.JSZip) return window.JSZip;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.JSZip;
}

async function loadTesseract(){
  if (window.Tesseract) return window.Tesseract;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.Tesseract;
}

function extractLatLng(text){
  const raw = String(text || "");
  if (!raw.trim()) return null;
  const normalized = raw
    .replace(/\u00B0/g, " ")
    .replace(/\u00BA/g, " ")
    .replace(/\u2019/g, "'")
    .replace(/\u201C|\u201D/g, "\"")
    .replace(/(\d),(\d)/g, "$1.$2");

  const isValid = (lat, lng) => (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
  const dirLat = (d) => {
    const v = String(d || "").toUpperCase();
    // OCR often confuses "N" as "M" on screenshot overlays.
    if (v === "S") return -1;
    if (v === "N" || v === "M") return 1;
    return null;
  };
  const dirLng = (d) => {
    const v = String(d || "").toUpperCase();
    if (v === "W") return -1;
    if (v === "E") return 1;
    return null;
  };

  const latFirst = /(\d{1,2}\.\d+)\s*([NSM])[\s,;|]+(\d{1,3}\.\d+)\s*([EW])/i;
  const latFirstMatch = normalized.match(latFirst);
  if (latFirstMatch){
    const latSign = dirLat(latFirstMatch[2]);
    const lngSign = dirLng(latFirstMatch[4]);
    const lat = Number(latFirstMatch[1]) * (latSign ?? 1);
    const lng = Number(latFirstMatch[3]) * (lngSign ?? 1);
    if (isValid(lat, lng)) return { lat, lng };
  }

  const dirFirst = /([NSM])\s*(\d{1,2}\.\d+)[\s,;|]+([EW])\s*(\d{1,3}\.\d+)/i;
  const dirFirstMatch = normalized.match(dirFirst);
  if (dirFirstMatch){
    const latSign = dirLat(dirFirstMatch[1]);
    const lngSign = dirLng(dirFirstMatch[3]);
    const lat = Number(dirFirstMatch[2]) * (latSign ?? 1);
    const lng = Number(dirFirstMatch[4]) * (lngSign ?? 1);
    if (isValid(lat, lng)) return { lat, lng };
  }

  const pairWithTrail = /(-?\d{1,2}\.\d+)\s*([NSM])?[\s,;|]+(-?\d{1,3}\.\d+)\s*([EW])/i;
  const pairWithTrailMatch = normalized.match(pairWithTrail);
  if (pairWithTrailMatch){
    const latSign = pairWithTrailMatch[2] ? dirLat(pairWithTrailMatch[2]) : null;
    const lngSign = dirLng(pairWithTrailMatch[4]);
    const lat = Math.abs(Number(pairWithTrailMatch[1])) * (latSign ?? (Number(pairWithTrailMatch[1]) < 0 ? -1 : 1));
    const lng = Math.abs(Number(pairWithTrailMatch[3])) * (lngSign ?? (Number(pairWithTrailMatch[3]) < 0 ? -1 : 1));
    if (isValid(lat, lng)) return { lat, lng };
  }

  const dms = /(\d{1,2})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([NSM])[\s,;|]+(\d{1,3})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([EW])/i;
  const dmsMatch = normalized.match(dms);
  if (dmsMatch){
    const latDeg = Number(dmsMatch[1]);
    const latMin = Number(dmsMatch[2]);
    const latSec = Number(dmsMatch[3]);
    const lngDeg = Number(dmsMatch[5]);
    const lngMin = Number(dmsMatch[6]);
    const lngSec = Number(dmsMatch[7]);
    const latSign = dirLat(dmsMatch[4]);
    const lngSign = dirLng(dmsMatch[8]);
    const lat = (latDeg + (latMin / 60) + (latSec / 3600)) * (latSign ?? 1);
    const lng = (lngDeg + (lngMin / 60) + (lngSec / 3600)) * (lngSign ?? 1);
    if (isValid(lat, lng)) return { lat, lng };
  }

  const basic = /(-?\d{1,2}\.\d+)\s*[,;\s|]+\s*(-?\d{1,3}\.\d+)/;
  const basicMatch = normalized.match(basic);
  if (basicMatch){
    const lat = Number(basicMatch[1]);
    const lng = Number(basicMatch[2]);
    if (isValid(lat, lng)) return { lat, lng };
  }

  return null;
}

function extractLocationTokens(text){
  const tokens = [];
  const npMatch = text.match(/\b([A-Za-z]*NetworkPoint-\d+)\b/);
  if (npMatch) tokens.push(npMatch[1]);
  const nodeMatch = text.match(/\bNODE\d+[_-]?[A-Z0-9_-]*\b/i);
  if (nodeMatch) tokens.push(nodeMatch[0]);
  const codeMatch = text.match(/\b[A-Z]{2,4}_\d{2,6}\b/);
  if (codeMatch) tokens.push(codeMatch[0]);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  lines.forEach((line) => {
    if (/^\d{3,6}$/.test(line)) tokens.push(line);
  });
  return Array.from(new Set(tokens));
}

const TEST_RESULTS_GPS_MATCH_RADIUS_KM = 0.5;

function findNearestSiteByGps(lat, lng){
  const sites = state.projectSites || [];
  let best = null;
  let bestDist = Infinity;
  const toRad = (x) => (x * Math.PI) / 180;
  for (const s of sites){
    if (s.gps_lat == null || s.gps_lng == null) continue;
    const dLat = toRad(lat - s.gps_lat);
    const dLng = toRad(lng - s.gps_lng);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(s.gps_lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = 6371 * c;
    if (dist < bestDist){
      bestDist = dist;
      best = s;
    }
  }
  return best ? { site: best, distanceKm: bestDist } : null;
}

function findSiteByName(name){
  if (!name) return null;
  const key = String(name).trim().toLowerCase();
  const sites = state.projectSites || [];
  return sites.find((s) => String(s.name || "").trim().toLowerCase() === key) || null;
}

function findSiteByToken(token){
  if (!token) return null;
  const key = String(token).trim().toLowerCase();
  const sites = state.projectSites || [];
  return sites.find((s) => String(s.name || "").trim().toLowerCase().includes(key)) || null;
}

function parseExifGpsFromArrayBuffer(buffer){
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xFFD8) return null;
  const readAscii = (offset, len) => {
    let out = "";
    for (let i = 0; i < len && (offset + i) < view.byteLength; i += 1){
      const c = view.getUint8(offset + i);
      if (c === 0) break;
      out += String.fromCharCode(c);
    }
    return out;
  };

  let segOffset = 2;
  while ((segOffset + 4) < view.byteLength){
    if (view.getUint8(segOffset) !== 0xFF){
      segOffset += 1;
      continue;
    }
    const marker = view.getUint8(segOffset + 1);
    if (marker === 0xDA || marker === 0xD9) break;
    const segLen = view.getUint16(segOffset + 2, false);
    if (!segLen || (segOffset + 2 + segLen) > view.byteLength) break;
    if (marker === 0xE1){
      const exifStart = segOffset + 4;
      if (readAscii(exifStart, 6) !== "Exif") {
        segOffset += 2 + segLen;
        continue;
      }
      const tiffStart = exifStart + 6;
      const byteOrder = readAscii(tiffStart, 2);
      const littleEndian = byteOrder === "II";
      if (!littleEndian && byteOrder !== "MM") return null;
      const get16 = (off) => {
        if ((off + 2) > view.byteLength) return null;
        return view.getUint16(off, littleEndian);
      };
      const get32 = (off) => {
        if ((off + 4) > view.byteLength) return null;
        return view.getUint32(off, littleEndian);
      };
      if (get16(tiffStart + 2) !== 0x002A) return null;
      const ifd0Rel = get32(tiffStart + 4);
      if (ifd0Rel == null) return null;
      const ifd0 = tiffStart + ifd0Rel;
      const ifd0Count = get16(ifd0);
      if (ifd0Count == null) return null;
      let gpsIfdRel = null;
      for (let i = 0; i < ifd0Count; i += 1){
        const entry = ifd0 + 2 + (i * 12);
        const tag = get16(entry);
        if (tag === 0x8825){
          gpsIfdRel = get32(entry + 8);
          break;
        }
      }
      if (!gpsIfdRel) return null;
      const gpsIfd = tiffStart + gpsIfdRel;
      const gpsCount = get16(gpsIfd);
      if (gpsCount == null) return null;

      const typeSize = (type) => ({
        1: 1, // BYTE
        2: 1, // ASCII
        3: 2, // SHORT
        4: 4, // LONG
        5: 8, // RATIONAL
      }[type] || 0);
      const entryDataOffset = (entry, type, count) => {
        const bytes = typeSize(type) * count;
        if (!bytes) return null;
        if (bytes <= 4) return entry + 8;
        const rel = get32(entry + 8);
        if (rel == null) return null;
        return tiffStart + rel;
      };
      const readRationals = (offset, count) => {
        const out = [];
        for (let i = 0; i < count; i += 1){
          const num = get32(offset + (i * 8));
          const den = get32(offset + (i * 8) + 4);
          if (num == null || den == null || !den) return null;
          out.push(num / den);
        }
        return out;
      };

      let latRef = null;
      let lngRef = null;
      let latVals = null;
      let lngVals = null;
      for (let i = 0; i < gpsCount; i += 1){
        const entry = gpsIfd + 2 + (i * 12);
        const tag = get16(entry);
        const type = get16(entry + 2);
        const count = get32(entry + 4);
        if (tag == null || type == null || count == null) continue;
        const dataOffset = entryDataOffset(entry, type, count);
        if (dataOffset == null) continue;
        if (tag === 0x0001 && type === 2){
          latRef = readAscii(dataOffset, count).trim().toUpperCase();
        }
        if (tag === 0x0002 && type === 5){
          latVals = readRationals(dataOffset, count);
        }
        if (tag === 0x0003 && type === 2){
          lngRef = readAscii(dataOffset, count).trim().toUpperCase();
        }
        if (tag === 0x0004 && type === 5){
          lngVals = readRationals(dataOffset, count);
        }
      }
      if (!latVals || !lngVals || latVals.length < 3 || lngVals.length < 3) return null;
      let lat = latVals[0] + (latVals[1] / 60) + (latVals[2] / 3600);
      let lng = lngVals[0] + (lngVals[1] / 60) + (lngVals[2] / 3600);
      if (latRef === "S") lat *= -1;
      if (lngRef === "W") lng *= -1;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      return { lat, lng };
    }
    segOffset += 2 + segLen;
  }
  return null;
}

async function extractExifGps(blob){
  try{
    const buffer = await blob.arrayBuffer();
    return parseExifGpsFromArrayBuffer(buffer);
  } catch {
    return null;
  }
}

async function uploadSiteMediaForSite(file, site, gps, capturedAt){
  if (!site || !file) return null;
  const uploadPath = await uploadProofPhoto(file, site.id, "site-media");
  if (!uploadPath) return null;
  const { error } = await state.client
    .from("site_media")
    .insert({
      site_id: site.id,
      media_path: uploadPath,
      gps_lat: gps?.lat ?? null,
      gps_lng: gps?.lng ?? null,
      gps_accuracy_m: gps?.accuracy ?? null,
      created_at: capturedAt || new Date().toISOString(),
    });
  if (error){
    toast("Media save error", error.message);
    return null;
  }
  return uploadPath;
}

async function ocrImageTopRight(blob){
  const Tesseract = await loadTesseract();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const cropW = Math.floor(bitmap.width * 0.45);
  const cropH = Math.floor(bitmap.height * 0.35);
  const sx = bitmap.width - cropW;
  const sy = 0;
  canvas.width = cropW;
  canvas.height = cropH;
  ctx.filter = "contrast(1.4) grayscale(1)";
  ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
  const { data } = await Tesseract.recognize(canvas, "eng");
  return data?.text || "";
}

async function ocrImageBottomRight(blob){
  const Tesseract = await loadTesseract();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const cropW = Math.floor(bitmap.width * 0.45);
  const cropH = Math.floor(bitmap.height * 0.42);
  const sx = bitmap.width - cropW;
  const sy = bitmap.height - cropH;
  canvas.width = cropW;
  canvas.height = cropH;
  ctx.filter = "contrast(1.4) grayscale(1)";
  ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
  const { data } = await Tesseract.recognize(canvas, "eng");
  return data?.text || "";
}

async function ocrImageFullFrame(blob){
  const Tesseract = await loadTesseract();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const maxWidth = 1800;
  const scale = Math.min(1, maxWidth / bitmap.width);
  canvas.width = Math.max(1, Math.floor(bitmap.width * scale));
  canvas.height = Math.max(1, Math.floor(bitmap.height * scale));
  ctx.filter = "contrast(1.35) grayscale(1)";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const { data } = await Tesseract.recognize(canvas, "eng");
  return data?.text || "";
}

async function confirmImportTestResults(){
  if (!SpecCom.helpers.isRoot()){
    toast("Not allowed", "Only ROOT can import test results.");
    return;
  }
  if (!state.activeProject){
    toast("Project required", "Select a project first.");
    return;
  }
  if (!state.client){
    toast("Import failed", "Client not ready.");
    return;
  }
  const sites = state.projectSites || [];
  if (!sites.length){
    toast("Import unavailable", "No sites in this project. Add sites before importing test results.");
    const summary = $("testResultsSummary");
    if (summary) summary.textContent = "No sites in this project. Add sites before importing test results.";
    return;
  }
  const input = $("testResultsInput");
  const summary = $("testResultsSummary");
  const confirmBtn = $("btnTestResultsConfirm");
  if (state.testResultsImportRunning){
    toast("Import in progress", "A test-results import is already running.");
    return;
  }
  const file = input?.files?.[0] || null;
  const setSummary = (msg) => {
    if (summary) summary.textContent = msg;
  };
  if (!file){
    toast("File required", "Choose a ZIP file.");
    return;
  }
  state.testResultsImportRunning = true;
  if (confirmBtn) confirmBtn.disabled = true;

  let heartbeat = null;
  try{
    setSummary("Preparing import...");
    setSummary("Loading ZIP parser...");
    const JSZip = await loadJsZip();
    setSummary("Loading OCR engine (first run can take up to 30 seconds)...");
    await loadTesseract();
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files || {}).filter((f) => !f.dir);
    const images = entries.filter((f) => /\.(png|jpe?g)$/i.test(f.name));
    if (!images.length){
      toast("Import failed", "No images found in ZIP.");
      return;
    }
    toast("Import started", `Processing ${images.length} images...`);
    setSummary(`Starting import: 0/${images.length} processed.`);
    let matched = 0;
    let skipped = 0;
    let skippedNoSignal = 0;
    let skippedNoMatch = 0;
    const attachedDebugRows = [];
    const skippedDebugRows = [];
    const progress = {
      current: 0,
      total: images.length,
      phase: "Initializing...",
    };
    const renderProgress = () => {
      setSummary(`[${progress.current}/${progress.total}] ${progress.phase} | Attached ${matched}, skipped ${skipped}`);
    };
    renderProgress();
    heartbeat = setInterval(renderProgress, 1500);
    for (const [index, entry] of images.entries()){
      progress.current = index + 1;
      const entryName = entry.name || `test-result-${index + 1}.png`;
      const fileName = entryName.split("/").pop() || `test-result-${index + 1}.png`;
      progress.phase = `Reading ${entryName}`;
      renderProgress();
      try{
        const blob = await entry.async("blob");
        let gpsSource = null;
        let text = await ocrImageTopRight(blob);
        if (isDebug) dlog("[test-results] OCR text (top-right):", text);
        const bottomRightText = await ocrImageBottomRight(blob);
        if (isDebug) dlog("[test-results] OCR text (bottom-right):", bottomRightText);
        text = `${text}\n${bottomRightText}`;
        let gps = extractLatLng(text);
        let tokens = extractLocationTokens(text);
        if (gps){
          gpsSource = "ocr";
        }
        if (!gps && !tokens.length){
          progress.phase = `Scanning full frame (${entryName})`;
          renderProgress();
          const fullText = await ocrImageFullFrame(blob);
          text = `${text}\n${fullText}`;
          if (isDebug) dlog("[test-results] OCR text (full):", fullText);
          gps = extractLatLng(text);
          tokens = extractLocationTokens(text);
          if (gps){
            gpsSource = "ocr-full";
          }
        }
        if (!gps){
          const exifGps = await extractExifGps(blob);
          if (exifGps){
            gps = exifGps;
            gpsSource = "exif";
          }
        }
        if (!gps && !tokens.length){
          skipped += 1;
          skippedNoSignal += 1;
          skippedDebugRows.push({
            zip_entry: entryName,
            file_name: fileName,
            reason: "missing_gps_and_tokens",
            gps_source: gpsSource || "",
            parsed_lat: "",
            parsed_lng: "",
            nearest_site: "",
            nearest_distance_km: "",
            tokens: "",
            ocr_excerpt: String(text || "").replace(/\s+/g, " ").trim().slice(0, 280),
          });
          continue;
        }
        let target = null;
        let nearest = null;
        if (gps){
          nearest = findNearestSiteByGps(gps.lat, gps.lng);
          if (nearest && nearest.distanceKm <= TEST_RESULTS_GPS_MATCH_RADIUS_KM){
            target = nearest.site;
          }
        }
        if (!target && tokens.length){
          for (const token of tokens){
            target = findSiteByName(token) || findSiteByToken(token);
            if (target) break;
          }
        }
        if (!target){
          skipped += 1;
          skippedNoMatch += 1;
          skippedDebugRows.push({
            zip_entry: entryName,
            file_name: fileName,
            reason: "no_site_match",
            gps_source: gpsSource || "",
            parsed_lat: gps?.lat ?? "",
            parsed_lng: gps?.lng ?? "",
            nearest_site: nearest?.site?.name || "",
            nearest_distance_km: nearest?.distanceKm != null ? Number(nearest.distanceKm).toFixed(4) : "",
            tokens: tokens.join(" | "),
            ocr_excerpt: String(text || "").replace(/\s+/g, " ").trim().slice(0, 280),
          });
          continue;
        }
        progress.phase = `Uploading ${entryName} -> ${target.name || target.id}`;
        renderProgress();
        const fileObj = new File([blob], fileName, { type: blob.type || "image/png" });
        const uploadPath = await uploadSiteMediaForSite(fileObj, target, gps, new Date().toISOString());
        if (!uploadPath){
          skipped += 1;
          skippedDebugRows.push({
            zip_entry: entryName,
            file_name: fileName,
            reason: "upload_failed",
            gps_source: gpsSource || "",
            parsed_lat: gps?.lat ?? "",
            parsed_lng: gps?.lng ?? "",
            nearest_site: nearest?.site?.name || "",
            nearest_distance_km: nearest?.distanceKm != null ? Number(nearest.distanceKm).toFixed(4) : "",
            tokens: tokens.join(" | "),
            ocr_excerpt: "uploadProofPhoto/site_media insert returned no path",
          });
          continue;
        }
        matched += 1;
        attachedDebugRows.push({
          zip_entry: entryName,
          file_name: fileName,
          site_name: target.name || "",
          site_id: target.id || "",
          gps_source: gpsSource || "",
          parsed_lat: gps?.lat ?? "",
          parsed_lng: gps?.lng ?? "",
          nearest_site: nearest?.site?.name || "",
          nearest_distance_km: nearest?.distanceKm != null ? Number(nearest.distanceKm).toFixed(4) : "",
          tokens: tokens.join(" | "),
          media_path: uploadPath,
        });
      } catch (err){
        skipped += 1;
        skippedDebugRows.push({
          zip_entry: entry.name || `test-result-${index + 1}.png`,
          file_name: entry.name.split("/").pop() || `test-result-${index + 1}.png`,
          reason: "exception",
          gps_source: "",
          parsed_lat: "",
          parsed_lng: "",
          nearest_site: "",
          nearest_distance_km: "",
          tokens: "",
          ocr_excerpt: String(err?.message || err || "").slice(0, 280),
        });
        setSummary(`Last error: ${err.message || err}`);
      }
    }
    const details = [];
    if (skippedNoSignal) details.push(`${skippedNoSignal} missing GPS/text`);
    if (skippedNoMatch) details.push(`${skippedNoMatch} no site match`);
    const detailText = details.length ? ` (${details.join(", ")})` : "";
    const finalText = `Attached ${matched} images. Skipped ${skipped}.${detailText}`;
    toast("Import complete", finalText);
    setSummary(finalText);
    if (attachedDebugRows.length){
      const attachedHeader = [
        "zip_entry",
        "file_name",
        "site_name",
        "site_id",
        "gps_source",
        "parsed_lat",
        "parsed_lng",
        "nearest_site",
        "nearest_distance_km",
        "tokens",
        "media_path",
      ];
      const attachedCsv = [attachedHeader.join(",")]
        .concat(attachedDebugRows.map((row) => attachedHeader.map((key) => escapeCsv(row[key])).join(",")))
        .join("\n");
      downloadFile(`test-results-attached-${Date.now()}.csv`, attachedCsv, "text/csv");
    }
    if (skippedDebugRows.length){
      const header = [
        "zip_entry",
        "file_name",
        "reason",
        "gps_source",
        "parsed_lat",
        "parsed_lng",
        "nearest_site",
        "nearest_distance_km",
        "tokens",
        "ocr_excerpt",
      ];
      const csv = [header.join(",")]
        .concat(skippedDebugRows.map((row) => header.map((key) => escapeCsv(row[key])).join(",")))
        .join("\n");
      downloadFile(`test-results-debug-${Date.now()}.csv`, csv, "text/csv");
    }
    await loadProjectSites(state.activeProject.id);
  } catch (err){
    const message = err?.message || String(err);
    toast("Import failed", message);
    setSummary(`Import failed: ${message}`);
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    state.testResultsImportRunning = false;
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

async function parseStakingPdf(file){
  const pdfjsLib = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i += 1){
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    text += `${pageText}\n`;
  }
  const matchPackage = text.match(/\b(\d{3,6}[A-Z]{1,3}_\d{1,3})\b/);
  const matchClarity = text.match(/\bPR\d{6}\b/);
  const matchWbs = text.match(/\bTC-\d+\b/);
  const matchCompany = text.match(/Company:\s*([A-Za-z0-9 .,&-]+)/i);
  const packageId = matchPackage ? matchPackage[1] : "Staking Project";
  const clarityId = matchClarity ? matchClarity[0] : "";
  const wbs = matchWbs ? matchWbs[0] : "";
  const company = matchCompany ? matchCompany[1].trim() : "";
  const networkPointMatches = Array.from(text.matchAll(/\b([A-Za-z]*NetworkPoint-\d+)\b/g)).map(m => m[1]);
  const networkPoints = Array.from(new Set(networkPointMatches));
  return {
    packageId,
    clarityId,
    wbs,
    company,
    networkPoints,
  };
}

async function confirmCreateProjectFromStaking(){
  if (!SpecCom.helpers.isRoot()){
    toast("Not allowed", "Only ROOT can create projects from staking PDFs.");
    return;
  }
  const input = $("stakingProjectInput");
  const locationsInput = $("stakingLocationsInput");
  const summary = $("stakingProjectSummary");
  const file = input?.files?.[0] || null;
  const locationsFile = locationsInput?.files?.[0] || null;
  if (!file){
    toast("File required", "Choose a staking PDF.");
    return;
  }
  let parsed = null;
  try{
    parsed = await parseStakingPdf(file);
  } catch (err){
    reportErrorToast("Parse failed", err);
    return;
  }
  if (!parsed){
    toast("Parse failed", "Unable to read PDF.");
    return;
  }
  const projectName = parsed.packageId || "Staking Project";
  const descriptionParts = [];
  if (parsed.clarityId) descriptionParts.push(`Clarity ID: ${parsed.clarityId}`);
  if (parsed.wbs) descriptionParts.push(`WBS: ${parsed.wbs}`);
  if (parsed.company) descriptionParts.push(`Company: ${parsed.company}`);
  const description = descriptionParts.join(" | ");
  const sites = parsed.networkPoints || [];
  if (summary){
    summary.textContent = `Parsed ${sites.length} network points for ${projectName}.`;
  }
  const client = await supabaseReady;
  if (!client){
    toast("Create failed", "Supabase client unavailable.");
    return;
  }
  const { data, error } = await client.rpc("fn_create_project_from_staking", {
    p_project_name: projectName,
    p_description: description,
    p_sites: sites,
  });
  if (error){
    toast("Create failed", error.message || "Create failed.");
    return;
  }
  toast("Project created", `Created ${projectName}.`);
  closeStakingProjectModal();
  await loadProjects();
  if (data?.project_id){
    setActiveProjectById(data.project_id);
    if (locationsFile){
      const importSummary = await importLocationsSpreadsheetForProject(locationsFile, data.project_id);
      if (importSummary){
        toast("Locations merged", `Added ${importSummary.inserted} new locations, updated ${importSummary.updated}, skipped ${importSummary.skipped}.`);
      }
      await loadProjectSites(data.project_id);
    }
  }
}

function normalizeHeaderRow(row){
  return row.map((cell) => SpecCom.helpers.normalizeImportHeader(cell));
}

function findHeaderRowIndex(gridRows){
  const maxScan = Math.min(gridRows.length, 25);
  const headerTargets = ["tds unit", "component price", "unit price", "millennium desc"];
  let best = { idx: -1, score: 0 };
  for (let i = 0; i < maxScan; i += 1){
    const row = gridRows[i] || [];
    const normalized = normalizeHeaderRow(row);
    const score = headerTargets.reduce((acc, h) => acc + (normalized.includes(h) ? 1 : 0), 0);
    if (score > best.score){
      best = { idx: i, score };
    }
  }
  return best.score >= 2 ? best.idx : -1;
}

function parsePriceSheetRows(rows, gridMode = false){
  if (!rows.length) return [];
  let headers = [];
  let dataRows = [];
  if (gridMode){
    const headerIdx = findHeaderRowIndex(rows);
    if (headerIdx < 0){
      throw new Error("Header row not found");
    }
    headers = normalizeHeaderRow(rows[headerIdx]);
    dataRows = rows.slice(headerIdx + 1).filter((row) => row?.length && row.some(cell => String(cell || "").trim().length));
  } else {
    headers = rows[0].map(SpecCom.helpers.normalizeImportHeader);
    dataRows = rows.slice(1).filter((row) => row?.length && row.some(cell => String(cell || "").trim().length));
  }
  const codeIdx = findHeaderIndex(headers, ["tds unit", "code", "billing_code", "work_code"]);
  const descIdx = findHeaderIndex(headers, ["millennium desc.", "millennium desc", "description", "desc"]);
  const unitIdx = findHeaderIndex(headers, ["unit", "units"]);
  const componentIdx = findHeaderIndex(headers, ["component price"]);
  const unitPriceIdx = findHeaderIndex(headers, ["unit price", "rate", "price", "unit_price"]);
  if (codeIdx < 0 || (componentIdx < 0 && unitPriceIdx < 0)){
    throw new Error("Missing headers: code and price are required");
  }
  return dataRows.map((row, idx) => {
    const rawCode = String(row[codeIdx] ?? "").trim();
    const rawRatePrimary = componentIdx >= 0 ? String(row[componentIdx] ?? "").trim() : "";
    const rawRateFallback = unitPriceIdx >= 0 ? String(row[unitPriceIdx] ?? "").trim() : "";
    const rawRate = rawRatePrimary || rawRateFallback;
    const rate = Number(rawRate.replace(/[^0-9.\-]/g, ""));
    return {
      code: rawCode,
      description: descIdx >= 0 ? String(row[descIdx] ?? "").trim() : "",
      unit: unitIdx >= 0 ? String(row[unitIdx] ?? "").trim() : "",
      rate: Number.isFinite(rate) ? rate : null,
      __rowNumber: idx + 2,
    };
  }).filter(r => r.code);
}

async function readPriceSheetRows(file){
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")){
    if (!window.XLSX) throw new Error("XLSX parser not available");
    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return { gridMode: true, rows };
  }
  if (name.endsWith(".csv")){
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const parsed = lines.map((line) => line.split(","));
    return { gridMode: true, rows: parsed };
  }
  if (name.endsWith(".pdf")){
    const pdfRows = await parsePdfFile(file);
    const headers = Object.keys(pdfRows[0] || {});
    const grid = [headers].concat(pdfRows.map((row) => headers.map((h) => row[h])));
    return { gridMode: true, rows: grid };
  }
  throw new Error("Unsupported file type");
}

async function confirmImportPriceSheet(){
  if (!SpecCom.helpers.isRoot()){
    toast("Not allowed", "Only ROOT can import pricing.");
    return;
  }
  if (!state.activeProject){
    toast("Project required", "Select a project first.");
    return;
  }
  const input = $("priceSheetInput");
  const file = input?.files?.[0] || null;
  if (!file){
    toast("File required", "Choose a price sheet file.");
    return;
  }
  let payloadRows = [];
  try{
    const parsed = await readPriceSheetRows(file);
    if (!parsed.rows.length){
      toast("Import error", "No data rows found.");
      return;
    }
    payloadRows = parsePriceSheetRows(parsed.rows, parsed.gridMode);
  } catch (err){
    reportErrorToast("Import failed", err);
    return;
  }
  const invalid = payloadRows.filter(r => !r.code || r.rate == null);
  if (invalid.length){
    toast("Import error", "Some rows are missing code or rate.");
    return;
  }
  const client = await supabaseReady;
  if (!client){
    toast("Import failed", "Supabase client unavailable.");
    return;
  }
  const { data, error } = await client.rpc("fn_import_rate_cards_tiered", {
    p_project_id: state.activeProject.id,
    p_rows: payloadRows,
  });
  if (error){
    toast("Import failed", error.message || "Import failed.");
    return;
  }
  const imported = data?.imported ?? payloadRows.length;
  toast("Pricing imported", `Imported ${imported} codes.`);
  closePriceSheetModal();
  await loadRateCards(state.activeProject.id);
}

function openGrantAccessModal(){
  if (!SpecCom.helpers.isPlatformAdmin()){
    toast("Not allowed", "Only ROOT or SUPPORT can grant project access.");
    return;
  }
  const modal = $("grantAccessModal");
  if (!modal) return;
  const userInput = $("grantAccessUser");
  const roleSelect = $("grantAccessRole");
  const note = $("grantAccessNote");
  if (userInput) userInput.value = "";
  if (roleSelect) roleSelect.value = "USER_LEVEL_1";
  if (note){
    const projectName = state.activeProject?.name || "current project";
    note.textContent = `Access will be granted for ${projectName}.`;
  }
  modal.style.display = "";
}

function closeGrantAccessModal(){
  const modal = $("grantAccessModal");
  if (!modal) return;
  modal.style.display = "none";
}

function normalizeRoleForGrant(role){
  const raw = String(role || "").toUpperCase().trim();
  if (raw === "USER1" || raw === "USER_LEVEL_1") return "USER_LEVEL_1";
  if (raw === "USER2" || raw === "USER_LEVEL_2") return "USER_LEVEL_2";
  if (raw === "PM" || raw === "PROJECT_MANAGER") return "PROJECT_MANAGER";
  return raw;
}

async function confirmGrantAccess(){
  if (!SpecCom.helpers.isPlatformAdmin()){
    toast("Not allowed", "Only ROOT or SUPPORT can grant project access.");
    return;
  }
  if (!state.activeProject){
    toast("Project required", "Select a project first.");
    return;
  }
  const userInput = $("grantAccessUser")?.value.trim();
  const roleSelect = $("grantAccessRole")?.value || "USER_LEVEL_1";
  if (!userInput){
    toast("User required", "Enter an email or user id.");
    return;
  }
  const client = await supabaseReady;
  if (!client){
    toast("Access failed", "Supabase client unavailable.");
    return;
  }
  const roleCode = normalizeRoleForGrant(roleSelect);
  const { data, error } = await client.rpc("fn_grant_project_access", {
    p_project_id: state.activeProject.id,
    p_user_identifier: userInput,
    p_role_code: roleCode,
  });
  if (error){
    toast("Access failed", error.message || "Access failed.");
    return;
  }
  toast("Access granted", `Granted ${roleCode} access.`);
  closeGrantAccessModal();
  return data;
}

function openCreateProjectModal(){
  const modal = $("createProjectModal");
  if (!modal) return;
  const name = $("createProjectName");
  const desc = $("createProjectDescription");
  if (name) name.value = "";
  if (desc) desc.value = "";
  modal.style.display = "";
}

function closeCreateProjectModal(){
  const modal = $("createProjectModal");
  if (!modal) return;
  modal.style.display = "none";
}

function openDeleteProjectModal(){
  if (!state.activeProject){
    toast("Project required", "Select a project to delete.");
    return;
  }
  if (!isOwnerOrAdmin()){
    toast("Not allowed", "Only Owner or Admin can delete projects.");
    return;
  }
  const modal = $("deleteProjectModal");
  if (!modal) return;
  const input = $("deleteProjectConfirm");
  if (input) input.value = "";
  modal.style.display = "";
}

function closeDeleteProjectModal(){
  const modal = $("deleteProjectModal");
  if (!modal) return;
  modal.style.display = "none";
}

async function deleteProjectRpc(client, projectId) {
  const { error } = await client.rpc("fn_delete_project", {
    p_project_id: projectId,
  });

  if (error) {
    throw error;
  }

  return true;
}

async function deleteProject(){
  if (!state.activeProject){
    toast("Project required", "Select a project to delete.");
    return;
  }
  if (!isOwnerOrAdmin()){
    toast("Not allowed", "Only Owner or Admin can delete projects.");
    return;
  }
  if (!state.client){
    toast("Delete failed", "Client not ready.");
    return;
  }
  const confirmText = $("deleteProjectConfirm")?.value.trim();
  if (confirmText !== "DELETE"){
    toast("Confirmation required", "Type DELETE to confirm.");
    return;
  }

  const projectId = state.activeProject.id;
  try {
    await deleteProjectRpc(state.client, projectId);
    toast("Project deleted", "Project deleted.");
    state.projects = (state.projects || []).filter(p => p.id !== projectId);
    state.activeProject = null;
    closeDeleteProjectModal();
    closeProjectsModal();
  } catch (err) {
    console.error("Delete failed", err);
    toast("Delete failed", "Delete failed.");
  }
}

async function createProject(){
  const name = $("createProjectName")?.value.trim();
  const description = $("createProjectDescription")?.value.trim() || null;
  if (!name){
    toast("Project name required", "Enter a project name.");
    return;
  }
  if (!isOwnerOrAdmin()){
    toast("Not allowed", "Only Owner or Admin can create projects.");
    return;
  }
  if (isDemo){
    const project = {
      id: `demo-project-${Date.now()}`,
      name,
      description,
      created_at: new Date().toISOString(),
      created_by: state.user?.id || "demo-user",
      is_demo: true,
    };
    state.demo.project = project;
    state.projects = (state.projects || []).concat(project);
    state.activeProject = project;
    renderProjects();
    closeCreateProjectModal();
    closeProjectsModal();
    refreshLocations();
    toast("Project created", "Project created.");
    return;
  }
  if (!state.client){
    toast("Project error", "Client not ready.");
    return;
  }

  const orgId = state.profile?.org_id || null;
  const creatorId = state.user?.id || null;
  let { data: projectId, error } = await state.client
    .rpc("fn_create_project", { p_name: name, p_description: description ?? null, p_org_id: orgId });
  if (error){
    debugLog("[createProject] rpc error", error);
    if (isRpc404(error)){
      const fallback = await state.client
        .from("projects")
        .insert({ name, description: description ?? null, org_id: orgId, created_by: creatorId })
        .select("id")
        .single();
      if (fallback.error){
        debugLog("[createProject] fallback error", fallback.error);
        reportErrorToast("Create project failed", fallback.error);
        return;
      }
      projectId = fallback.data?.id || null;
    } else if (isDuplicateKeyError(error)){
      const existing = await fetchProjectByName(name, orgId);
      if (existing){
        if (!state.projects.find(p => p.id === existing.id)){
          state.projects = (state.projects || []).concat(existing);
        }
        setActiveProjectById(existing.id);
        closeCreateProjectModal();
        closeProjectsModal();
        refreshLocations();
        toast("Project already exists", "Project already exists — opened it.");
        await loadProjects();
        return;
      }
      reportErrorToast("Create project failed", error);
      return;
    } else {
      reportErrorToast("Create project failed", error);
      return;
    }
  }
  await loadProjects();
  const newProjectId = typeof projectId === "string" ? projectId : (projectId?.id || null);
  if (newProjectId){
    setActiveProjectById(newProjectId);
  } else {
    const match = state.projects.find(p => p.name === name);
    if (match) setActiveProjectById(match.id);
  }
  closeCreateProjectModal();
  closeProjectsModal();
  refreshLocations();
  toast("Project created", "Project created.");
}

async function fetchProjectByName(name, orgId){
  if (!state.client) return null;
  const baseSelect = "id, name, description, created_at, location, job_number, created_by";
  let query = state.client
    .from("projects")
    .select(baseSelect)
    .eq("name", name)
    .limit(1);
  if (orgId){
    query = query.eq("org_id", orgId);
  }
  let { data, error } = await query;
  if (error && orgId){
    const message = String(error.message || "").toLowerCase();
    if (message.includes("org_id") && message.includes("does not exist")){
      ({ data, error } = await state.client
        .from("projects")
        .select(baseSelect)
        .eq("name", name)
        .limit(1));
    }
  }
  if (error){
    debugLog("[fetchProjectByName] error", error);
    return null;
  }
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

function getDprDefaultMetrics(){
  return {
    sites_created_today: 0,
    splice_locations_created_today: 0,
    work_orders_completed_today: 0,
    blocked_items_today: 0,
  };
}

function syncDprProjectSelection(){
  if (!state.dpr.projectId && state.activeProject?.id){
    state.dpr.projectId = state.activeProject.id;
  }
  const select = $("dprProjectSelect");
  if (select) select.value = state.dpr.projectId || "";
}

function renderDprProjectOptions(){
  const select = $("dprProjectSelect");
  if (!select) return;
  select.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = t("selectProject");
  select.appendChild(opt);
  state.projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.job_number ? `${project.name} (Job ${project.job_number})` : (project.name || "Project");
    select.appendChild(option);
  });
  select.value = state.dpr.projectId || "";
}

function renderDprMetrics(){
  const wrap = $("dprMetrics");
  if (!wrap) return;
  if (!state.dpr.metrics){
    wrap.innerHTML = `<div class="muted small">${t("dprNoMetrics")}</div>`;
    return;
  }
  const metrics = { ...getDprDefaultMetrics(), ...state.dpr.metrics };
  wrap.innerHTML = `
    <div class="dpr-metric-row"><span>${t("dprMetricSites")}</span><span>${metrics.sites_created_today}</span></div>
    <div class="dpr-metric-row"><span>${t("dprMetricSplice")}</span><span>${metrics.splice_locations_created_today}</span></div>
    <div class="dpr-metric-row"><span>${t("dprMetricWorkOrders")}</span><span>${metrics.work_orders_completed_today}</span></div>
    <div class="dpr-metric-row"><span>${t("dprMetricBlocked")}</span><span>${metrics.blocked_items_today}</span></div>
  `;
}

function setDprEditState(){
  const canEdit = isPrivilegedRole();
  const refreshBtn = $("btnDprRefresh");
  const saveBtn = $("btnDprSave");
  const comments = $("dprComments");
  const hasProject = Boolean(state.dpr.projectId);
  if (refreshBtn) refreshBtn.disabled = !canEdit || !hasProject;
  if (saveBtn) saveBtn.disabled = !canEdit || !hasProject || !state.dpr.reportId;
  if (comments) comments.disabled = !canEdit || !hasProject;
  const note = $("dprNote");
  if (note){
    if (!state.dpr.projectId){
      note.textContent = t("dprNoProject");
      return;
    }
    note.textContent = canEdit ? "" : t("dprReadOnlyNote");
  }
}

async function loadDailyProgressReport(){
  const select = $("dprProjectSelect");
  const dateInput = $("dprDate");
  if (select) state.dpr.projectId = select.value || null;
  if (dateInput) state.dpr.reportDate = dateInput.value || getTodayDate();
  const projectId = state.dpr.projectId;
  if (!projectId){
    state.dpr.reportId = null;
    state.dpr.metrics = null;
    if ($("dprComments")) $("dprComments").value = "";
    renderDprMetrics();
    setDprEditState();
    return;
  }
  if (isDemo){
    const list = state.demo.dprReports || [];
    const row = list.find((r) => r.project_id === projectId && r.report_date === state.dpr.reportDate) || null;
    state.dpr.reportId = row?.id || null;
    state.dpr.metrics = row?.metrics || null;
    if ($("dprComments")) $("dprComments").value = row?.comments || "";
    renderDprMetrics();
    setDprEditState();
    return;
  }
  if (!state.client){
    renderDprMetrics();
    setDprEditState();
    return;
  }
  const { data, error } = await state.client
    .from("daily_progress_reports")
    .select("id, project_id, report_date, metrics, comments")
    .eq("project_id", projectId)
    .eq("report_date", state.dpr.reportDate)
    .maybeSingle();
  if (error){
    toast("Daily report load error", error.message);
    return;
  }
  state.dpr.reportId = data?.id || null;
  state.dpr.metrics = data?.metrics || null;
  if ($("dprComments")) $("dprComments").value = data?.comments || "";
  renderDprMetrics();
  setDprEditState();
}

async function generateDailyProgressReport(){
  if (!isPrivilegedRole()){
    toast("Not allowed", "Admin or Project Manager required.");
    return;
  }
  const projectId = state.dpr.projectId;
  if (!projectId){
    toast("Project required", t("dprNoProject"));
    return;
  }
  const dateInput = $("dprDate");
  if (dateInput) state.dpr.reportDate = dateInput.value || getTodayDate();
  const comments = $("dprComments")?.value || null;
  if (isDemo){
    const metrics = getDprDefaultMetrics();
    const row = {
      id: `demo-dpr-${Date.now()}`,
      project_id: projectId,
      report_date: state.dpr.reportDate,
      metrics,
      comments,
    };
    state.demo.dprReports = state.demo.dprReports || [];
    const existingIndex = state.demo.dprReports.findIndex((r) => r.project_id === projectId && r.report_date === state.dpr.reportDate);
    if (existingIndex >= 0){
      state.demo.dprReports[existingIndex] = { ...state.demo.dprReports[existingIndex], metrics, comments };
      state.dpr.reportId = state.demo.dprReports[existingIndex].id;
    } else {
      state.demo.dprReports.unshift(row);
      state.dpr.reportId = row.id;
    }
    state.dpr.metrics = metrics;
    renderDprMetrics();
    setDprEditState();
    toast("Daily report", "Report saved.");
    return;
  }
  if (!state.client){
    toast("Daily report error", "Client not ready.");
    return;
  }
  const { data, error } = await state.client
    .rpc("fn_upsert_daily_progress_report", {
      p_project_id: projectId,
      p_date: state.dpr.reportDate,
      p_comments: comments,
    });
  if (error){
    toast("Daily report error", error.message);
    return;
  }
  state.dpr.reportId = data;
  const { data: metricsData, error: metricsError } = await state.client
    .rpc("fn_build_dpr_metrics", { p_project_id: projectId, p_date: state.dpr.reportDate });
  if (metricsError){
    toast("Metrics error", metricsError.message);
    return;
  }
  state.dpr.metrics = metricsData || getDprDefaultMetrics();
  renderDprMetrics();
  setDprEditState();
  toast("Daily report", "Report saved.");
}

async function saveDailyProgressComments(){
  if (!isPrivilegedRole()){
    toast("Not allowed", "Admin or Project Manager required.");
    return;
  }
  if (!state.dpr.reportId){
    toast("Generate report", "Generate the report before saving comments.");
    return;
  }
  const comments = $("dprComments")?.value || null;
  if (isDemo){
    const list = state.demo.dprReports || [];
    const row = list.find((r) => r.id === state.dpr.reportId);
    if (row) row.comments = comments;
    toast("Daily report", "Comments saved.");
    return;
  }
  if (!state.client){
    toast("Daily report error", "Client not ready.");
    return;
  }
  const { error } = await state.client
    .from("daily_progress_reports")
    .update({ comments })
    .eq("id", state.dpr.reportId);
  if (error){
    toast("Save failed", error.message);
    return;
  }
  toast("Daily report", "Comments saved.");
}

const MESSAGE_READ_KEY = "messages_last_read_";

function getMessageIdentityLabel(userId){
  if (!userId) return t("messageSenderUnknown");
  if (userId === state.user?.id) return t("messageSenderYou");
  return state.messageIdentityMap.get(userId) || String(userId).slice(0, 8);
}

function setMessagesFilter(filter = "board"){
  state.messageFilter = ["board", "direct"].includes(filter) ? filter : "board";
  document.querySelectorAll("#messagesModal [data-filter]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === state.messageFilter);
  });
  const modeSelect = $("messageMode");
  if (modeSelect) modeSelect.value = state.messageFilter;
  syncMessageComposerMode();
  renderMessages();
}

function syncMessageComposerMode(){
  const modeSelect = $("messageMode");
  const recipientSelect = $("messageRecipient");
  if (!modeSelect || !recipientSelect) return;
  if (!["board", "direct"].includes(modeSelect.value)){
    modeSelect.value = state.messageFilter === "direct" ? "direct" : "board";
  }
  state.messageMode = modeSelect.value || "board";
  const showRecipient = state.messageMode === "direct";
  recipientSelect.style.display = showRecipient ? "" : "none";
}

function renderMessageRecipients(){
  const recipientSelect = $("messageRecipient");
  if (!recipientSelect) return;
  const current = recipientSelect.value;
  const recipients = state.messageRecipients || [];
  const options = ['<option value="">' + escapeHtml(t("messageRecipientPlaceholder")) + "</option>"]
    .concat(recipients.map((row) => `<option value="${row.id}">${escapeHtml(row.name)}</option>`));
  if (!recipients.length){
    options.push(`<option value="" disabled>${escapeHtml("No recipients available")}</option>`);
  }
  recipientSelect.innerHTML = options.join("");
  recipientSelect.disabled = !recipients.length;
  if (current && (state.messageRecipients || []).some((row) => row.id === current)){
    recipientSelect.value = current;
  }
}

function applyMessagesUiLabels(){
  const boardBtn = $("btnMessagesFilterBoard");
  const directBtn = $("btnMessagesFilterDirect");
  if (boardBtn) boardBtn.textContent = t("messagesFilterProject");
  if (directBtn) directBtn.textContent = t("messagesFilterDirect");
  const modeSelect = $("messageMode");
  if (modeSelect){
    const opts = Array.from(modeSelect.options || []);
    if (opts[0]) opts[0].text = t("messageModeProject");
    if (opts[1]) opts[1].text = t("messageModeDirect");
  }
  renderMessageRecipients();
}

async function loadMessageRecipients(){
  state.messageRecipients = [];
  state.messageIdentityMap = new Map();
  if (!state.client || !state.user){
    renderMessageRecipients();
    return;
  }
  state.messageIdentityMap.set(state.user.id, t("messageSenderYou"));
  if (!state.profile?.org_id && !SpecCom.helpers.isRoot()){
    renderMessageRecipients();
    return;
  }
  let query = state.client
    .from("profiles")
    .select("id, display_name")
    .neq("id", state.user.id)
    .limit(500);
  if (!SpecCom.helpers.isRoot()){
    query = query.eq("org_id", state.profile.org_id);
  }
  const { data, error } = await query;
  if (error){
    toast("Messages load error", error.message);
    renderMessageRecipients();
    return;
  }
  const recipients = (data || []).map((row) => {
    const label = String(row.display_name || "").trim() || String(row.id || "").slice(0, 8);
    if (row.id) state.messageIdentityMap.set(row.id, label);
    return { id: row.id, name: label };
  }).filter((row) => row.id);
  state.messageRecipients = recipients.sort((a, b) => a.name.localeCompare(b.name));
  renderMessageRecipients();
}

function disableMessagesModule(reason = "missing_table"){
  if (!state.messagesEnabled) return;
  state.messagesEnabled = false;
  state.messagesDisabledReason = reason;
  const messagesBtn = $("btnMessages");
  if (messagesBtn) messagesBtn.style.display = "none";
  const badge = $("messagesBadge");
  if (badge) badge.style.display = "none";
  const modal = $("messagesModal");
  if (modal) modal.style.display = "none";
}

function getMessageReadKey(filter){
  const orgKey = state.profile?.org_id || "global";
  return `${MESSAGE_READ_KEY}${orgKey}_${filter || "board"}`;
}

function getLastMessageReadAt(filter){
  const raw = safeLocalStorageGet(getMessageReadKey(filter));
  const parsed = raw ? Date.parse(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function setLastMessageReadAt(filter, iso){
  safeLocalStorageSet(getMessageReadKey(filter), iso);
}

function countUnreadMessages(){
  const lastRead = getLastMessageReadAt(state.messageFilter);
  return (state.messages || []).filter((msg) => {
    if (msg.sender_id === state.user?.id) return false;
    const stamp = Date.parse(msg.created_at || "");
    return Number.isFinite(stamp) && stamp > lastRead;
  }).length;
}

function updateMessagesBadge(){
  const badge = $("messagesBadge");
  if (!badge) return;
  if (!state.messagesEnabled){
    badge.textContent = "0";
    badge.style.display = "none";
    return;
  }
  const count = countUnreadMessages();
  if (count > 0){
    badge.textContent = String(count);
    badge.style.display = "inline-flex";
  } else {
    badge.textContent = "0";
    badge.style.display = "none";
  }
}

function markMessagesRead(){
  const latest = state.messages?.[0]?.created_at;
  if (!latest) return;
  setLastMessageReadAt(state.messageFilter, latest);
  updateMessagesBadge();
}

async function loadMessages(){
  if (!state.messagesEnabled || !state.features.messages) return;
  if (!state.storageAvailable && !isDemo) return;
  if (isDemo){
    const list = state.demo.messages || [];
    state.messages = list.filter((msg) => {
      const channel = msg.channel || (msg.recipient_id ? "DM" : "BOARD");
      if (state.messageFilter === "board") return channel === "BOARD";
      return channel === "DM" && (msg.sender_id === state.user?.id || msg.recipient_id === state.user?.id);
    });
    updateMessagesBadge();
    return;
  }
  if (!state.client || !state.user){
    state.messages = [];
    updateMessagesBadge();
    return;
  }
  if (!SpecCom.helpers.isRoot() && !state.profile?.org_id){
    state.messages = [];
    updateMessagesBadge();
    return;
  }
  let query = state.client
    .from("messages")
    .select("id, org_id, channel, sender_id, recipient_id, body, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (state.messageFilter === "board"){
    if (state.profile?.org_id && !SpecCom.helpers.isRoot()){
      query = query.eq("org_id", state.profile.org_id);
    }
    query = query.eq("channel", "BOARD");
  } else {
    if (state.profile?.org_id && !SpecCom.helpers.isRoot()){
      query = query.eq("org_id", state.profile.org_id);
    }
    query = query.eq("channel", "DM");
    query = query.or(`sender_id.eq.${state.user.id},recipient_id.eq.${state.user.id}`);
  }
  const { data, error } = await query;
  if (error){
    if (isMissingTable(error)){
      state.features.messages = false;
      disableMessagesModule("missing_table");
      return;
    }
    toast("Messages load error", error.message);
    return;
  }
  state.messages = data || [];
  updateMessagesBadge();
  const modal = $("messagesModal");
  if (modal && modal.style.display !== "none"){
    renderMessages();
  }
}

function renderMessages(){
  const list = $("messagesList");
  const empty = $("messagesEmpty");
  const scope = $("messagesScope");
  if (!list) return;
  if (!state.messagesEnabled){
    list.innerHTML = "";
    if (empty) empty.style.display = "";
    return;
  }
  if (scope){
    scope.textContent = state.messageFilter === "board" ? t("messagesScopeProject") : t("messagesFilterDirect");
  }
  const filtered = (state.messages || []).filter((msg) => {
    if (state.messageFilter === "board") return msg.channel === "BOARD";
    return msg.channel === "DM";
  });
  if (!filtered.length){
    list.innerHTML = "";
    if (empty) empty.style.display = "";
    return;
  }
  if (empty) empty.style.display = "none";
  list.innerHTML = filtered.map((msg) => {
    const sender = getMessageIdentityLabel(msg.sender_id);
    const outgoing = msg.sender_id === state.user?.id;
    const time = msg.created_at ? new Date(msg.created_at).toLocaleString() : "";
    const scopeLabel = msg.channel === "BOARD" ? t("messageProjectTag") : t("messageDirectTag");
    const recipientLabel = msg.recipient_id
      ? t("messageDirectTo", { name: getMessageIdentityLabel(msg.recipient_id) })
      : "";
    const body = escapeHtml(msg.body || "").replace(/\n/g, "<br>");
    const metaParts = [sender, recipientLabel, time].filter(Boolean);
    return `
      <div class="message-card ${outgoing ? "outgoing" : "incoming"}">
        <div class="message-meta">
          ${scopeLabel ? `<span class="message-chip">${escapeHtml(scopeLabel)}</span>` : ""}
          <span>${escapeHtml(metaParts.join(" | "))}</span>
        </div>
        <div>${body}</div>
      </div>
    `;
  }).join("");
}

async function sendMessage(){
  if (!state.messagesEnabled){
    toast("Messages", "Messages module not installed yet.", "error");
    return;
  }
  const input = $("messageInput");
  const modeSelect = $("messageMode");
  const recipientSelect = $("messageRecipient");
  const text = input?.value.trim();
  if (!text){
    toast("Message required", "Write a message.");
    return;
  }
  const mode = modeSelect?.value || "board";
  const recipientId = recipientSelect?.value || null;
  if (mode === "direct" && !recipientId){
    toast("Recipient required", "Select a recipient for direct message.");
    return;
  }
  const roleCode = getRoleCode();
  const canPostBoard = SpecCom.helpers.isRoot()
    || roleCode === ROLES.OWNER
    || roleCode === ROLES.ADMIN
    || roleCode === ROLES.PROJECT_MANAGER
    || roleCode === ROLES.SUPPORT;
  if (mode === "board" && !canPostBoard){
    toast("Not allowed", "Only Owner/Admin/PM/Support can post to Main Board.");
    return;
  }
  if (isDemo){
    const row = {
      id: `demo-message-${Date.now()}`,
      org_id: state.profile?.org_id || null,
      channel: mode === "direct" ? "DM" : "BOARD",
      sender_id: state.user?.id || "demo-user",
      recipient_id: mode === "direct" ? recipientId : null,
      body: text,
      created_at: new Date().toISOString(),
    };
    state.demo.messages = state.demo.messages || [];
    state.demo.messages.unshift(row);
    input.value = "";
    await loadMessages();
    renderMessages();
    markMessagesRead();
    return;
  }
  if (!state.client || !state.user){
    toast("Messages unavailable", "Sign in to send messages.");
    return;
  }
  if (!SpecCom.helpers.isRoot() && !state.profile?.org_id){
    toast("Messages unavailable", "Your profile is missing an organization.");
    return;
  }
  const payload = {
    org_id: state.profile?.org_id || null,
    channel: mode === "direct" ? "DM" : "BOARD",
    sender_id: state.user.id,
    recipient_id: mode === "direct" ? recipientId : null,
    body: text,
  };
  const { error } = await state.client
    .from("messages")
    .insert(payload);
  if (error){
    toast("Send failed", error.message);
    return;
  }
  input.value = "";
  await loadMessages();
  renderMessages();
  markMessagesRead();
}

async function loadProjects(){
  if (isDemo){
    state.projects = state.demo.project ? [state.demo.project] : [];
    state.activeProject = state.projects[0] || null;
    renderProjects();
    loadMessages();
    return;
  }
  if (!state.client || !state.user){
    state.projects = [];
    renderProjects();
    return;
  }
  const baseSelect = "id, name, description, created_at, location, job_number, is_demo, created_by";
  let projects = [];

  if (SpecCom.helpers.isRoot()){
    const { data, error } = await state.client
      .from("projects")
      .select(baseSelect)
      .order("name");
    if (error){
      toast("Projects load error", error.message);
      return;
    }
    projects = data || [];
    state.projects = projects;
    if (state.activeProject){
      const match = state.projects.find(p => p.id === state.activeProject.id);
      state.activeProject = match || null;
    }
    if (!state.activeProject && state.projects.length){
      setActiveProjectById(state.projects[0].id);
    }
    renderProjects();
    return;
  }

  const { data: memberRows, error: memberError } = await state.client
    .from("project_members")
    .select(`
      project_id,
      role,
      role_code,
      projects (
        ${baseSelect}
      )
    `)
    .eq("user_id", state.user.id);
  if (memberError){
    toast("Projects load error", memberError.message);
    return;
  }
  projects = (memberRows || [])
    .map((row) => {
      if (!row?.projects) return null;
      return {
        ...row.projects,
        role: row.role || null,
        role_code: row.role_code || null,
      };
    })
    .filter(Boolean);

  // Fallback: include projects created by the user (legacy rows missing membership)
  const createdResp = await state.client
    .from("projects")
    .select(baseSelect)
    .eq("created_by", state.user.id)
    .order("name");
  if (!createdResp.error){
    const existing = new Set(projects.map(p => p.id));
    (createdResp.data || []).forEach((row) => {
      if (!existing.has(row.id)) projects.push(row);
    });
  } else {
    const message = String(createdResp.error.message || "").toLowerCase();
    if (message.includes("created_by") && message.includes("does not exist")){
      const { data } = await state.client
        .from("projects")
        .select(baseSelect.replace(", created_by", ""))
        .order("name");
      projects = data || projects;
    }
  }

  state.projects = projects;
  if (state.activeProject){
    const match = state.projects.find(p => p.id === state.activeProject.id);
    state.activeProject = match || null;
  }
  if (!state.activeProject){
    const preferred = state.profile?.current_project_id || getSavedProjectPreference();
    const match = preferred ? state.projects.find(p => p.id === preferred) : null;
    if (match){
      setActiveProjectById(match.id);
    } else if (state.projects.length === 1){
      setActiveProjectById(state.projects[0].id);
    }
  }
  debugLog("Loaded projects", state.projects);
  debugLog("Current project id", state.activeProject?.id || null);
  renderProjects();
}

async function loadAdminProfiles(){
  const gate = $("adminBuildGate");
  const panel = $("adminUsersPanel");
  const allowed = SpecCom.helpers.isRoot() || (BUILD_MODE && isOwner());
  if (gate) gate.style.display = allowed ? "none" : "";
  if (panel) panel.style.display = allowed ? "" : "none";
  if (!allowed) return;
  if (!state.client || !state.user) return;
  if (isDemo){
    state.adminProfiles = [];
    renderAdminProfiles();
    return;
  }
  const { data, error } = await state.client
    .from("profiles")
    .select("id, display_name, role, role_code, created_at")
    .order("created_at", { ascending: true });
  if (error){
    toast("Profiles load error", error.message);
    return;
  }
  state.adminProfiles = data || [];
  renderAdminProfiles();
}

function renderAdminProfiles(){
  const wrap = $("adminUsersList");
  if (!wrap) return;
  if (!SpecCom.helpers.isRoot() && (!BUILD_MODE || !isOwner())){
    wrap.innerHTML = "";
    return;
  }
  const rows = state.adminProfiles || [];
  if (!rows.length){
    wrap.innerHTML = `<div class="muted small">${t("noProfilesFound")}</div>`;
    return;
  }
  wrap.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>User id</th>
          <th>Name</th>
          <th>Role</th>
          <th>Created</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td class="muted small">${escapeHtml(row.id)}</td>
            <td>
              <input class="input compact" data-field="display_name" data-id="${row.id}" value="${escapeHtml(row.display_name || "")}" />
            </td>
            <td>
              <select class="input compact" data-field="role" data-id="${row.id}">
                ${APP_ROLE_OPTIONS.map(role => `
                  <option value="${role}" ${String(row.role || "").toUpperCase() === role ? "selected" : ""}>${formatRoleLabel(role)}</option>
                `).join("")}
              </select>
            </td>
            <td class="muted small">${row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}</td>
            <td>
              <div class="row" style="justify-content:flex-end;">
                <button class="btn secondary small" data-action="adminUpdateUser" data-id="${row.id}">Save</button>
                <button class="btn danger small" data-action="adminDeleteUser" data-id="${row.id}">Delete</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function createAdminProfile(){
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  if (!SpecCom.helpers.isRoot() && (!BUILD_MODE || !isOwner())){
    toast("Not allowed", "Admin role required.");
    return;
  }
  const userId = $("adminUserId")?.value.trim();
  const email = $("adminUserEmail")?.value.trim();
  const nextRole = $("adminUserRole")?.value || DEFAULT_ROLE;
  const nextRoleCode = normalizeRole(nextRole);
  if (!userId){
    toast("User id required", "Enter the auth user id (UUID).");
    return;
  }
  if (isDemo){
    toast("Demo disabled", "Profiles are not available in demo mode.");
    return;
  }
  const { error } = await state.client
    .from("profiles")
    .insert({
      id: userId,
      display_name: email || null,
      role: nextRole,
      role_code: nextRoleCode,
    });
  if (error){
    toast("Create failed", error.message);
    return;
  }
  if ($("adminUserId")) $("adminUserId").value = "";
  if ($("adminUserEmail")) $("adminUserEmail").value = "";
  await loadAdminProfiles();
  toast("Profile created", "User profile created.");
}

async function updateAdminProfile(userId){
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  if (!SpecCom.helpers.isRoot() && (!BUILD_MODE || !isOwner())){
    toast("Not allowed", "Admin role required.");
    return;
  }
  const roleEl = document.querySelector(`[data-field="role"][data-id="${userId}"]`);
  const nameEl = document.querySelector(`[data-field="display_name"][data-id="${userId}"]`);
  if (!roleEl || !nameEl) return;
  const nextRole = roleEl.value;
  const nextRoleCode = normalizeRole(nextRole);
  const nextName = String(nameEl.value || "").trim();
  if (isDemo){
    toast("Demo disabled", "Profiles are not available in demo mode.");
    return;
  }
  const { error } = await state.client
    .from("profiles")
    .update({ role: nextRole, role_code: nextRoleCode, display_name: nextName || null })
    .eq("id", userId);
  if (error){
    toast("Update failed", error.message);
    return;
  }
  await loadAdminProfiles();
  toast("Profile updated", "User profile saved.");
}

async function deleteAdminProfile(userId){
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  if (!SpecCom.helpers.isRoot() && (!BUILD_MODE || !isOwner())){
    toast("Not allowed", "Owner role required.");
    return;
  }
  if (!confirm("Delete user profile?\nThis removes the profile row (not the auth user).")) return;
  const typed = prompt("Type DELETE to confirm.");
  if (typed !== "DELETE"){
    toast("Delete canceled", "Type DELETE to confirm.");
    return;
  }
  if (isDemo){
    toast("Demo disabled", "Profiles are not available in demo mode.");
    return;
  }
  const { error } = await state.client
    .from("profiles")
    .delete()
    .eq("id", userId);
  if (error){
    toast("Delete failed", error.message);
    return;
  }
  await loadAdminProfiles();
  toast("Profile deleted", "User profile removed.");
}

async function loadProjectNodes(projectId){
  if (isDemo){
    state.projectNodes = (state.demo.nodesList || []).filter(n => !projectId || n.project_id === projectId);
    renderNodeCards();
    return;
  }
  if (!projectId){
    state.projectNodes = [];
    renderNodeCards();
    return;
  }
  const { data, error } = await state.client
    .from("nodes")
    .select("id, node_number, description, status, started_at, completed_at, project_id")
    .eq("project_id", projectId)
    .order("node_number");
  if (error){
    toast("Sites load error", error.message);
    return;
  }
  state.projectNodes = data || [];
  renderNodeCards();
}

const PENDING_SITES_KEY = "pending_sites";

function loadPendingSitesFromStorage(){
  const raw = safeLocalStorageGet(PENDING_SITES_KEY);
  if (!raw) return [];
  try{
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingSitesToStorage(list){
  safeLocalStorageSet(PENDING_SITES_KEY, JSON.stringify(list || []));
}

function getPendingSitesForProject(projectId){
  if (!projectId) return [];
  return (state.pendingSites || []).filter((site) => site.project_id === projectId).map((site) => ({
    ...site,
    is_pending: true,
  }));
}

function getVisibleSites(){
  const pending = getPendingSitesForProject(state.activeProject?.id || null);
  const live = (state.projectSites || []).map((site) => ({ ...site, is_pending: false }));
  return live.concat(pending);
}

function normalizeLocationSearchText(value){
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseLocationCoordinateQuery(raw){
  const match = String(raw || "").trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number.parseFloat(match[1]);
  const lng = Number.parseFloat(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function getSiteSearchBlob(site){
  if (!site?.id) return "";
  const cacheKey = [
    site.name || "",
    site.notes || "",
    site.id || "",
    site.project_id || "",
    site.gps_lat ?? site.lat ?? "",
    site.gps_lng ?? site.lng ?? "",
  ].join("|");
  const cached = state.map.siteSearchIndex.get(site.id);
  if (cached?.cacheKey === cacheKey) return cached.blob;
  const blob = normalizeLocationSearchText([
    site.name,
    site.notes,
    site.id,
    site.project_id,
    site.gps_lat,
    site.gps_lng,
    site.lat,
    site.lng,
  ].filter((v) => v != null && String(v).trim()).join(" "));
  state.map.siteSearchIndex.set(site.id, { cacheKey, blob });
  return blob;
}

function getNearestSitesToCoordinate(rows, coord, limit = 5){
  const scored = (rows || []).map((site) => {
    const coords = getSiteCoords(site);
    if (!coords) return null;
    return { site, distanceM: distanceMeters(coord, coords) };
  }).filter(Boolean).sort((a, b) => a.distanceM - b.distanceM);
  return scored.slice(0, Math.max(1, limit));
}

function getSiteSearchResultSet(){
  const all = getVisibleSites();
  const rawQuery = String(state.mapFilters.search || "").trim();
  if (!rawQuery){
    return {
      rawQuery,
      normalizedQuery: "",
      coordQuery: null,
      rows: all,
      nearest: [],
    };
  }
  const coordQuery = parseLocationCoordinateQuery(rawQuery);
  if (coordQuery){
    const nearest = getNearestSitesToCoordinate(all, coordQuery, 5);
    return {
      rawQuery,
      normalizedQuery: "",
      coordQuery,
      rows: nearest.map((x) => x.site),
      nearest,
    };
  }
  const normalizedQuery = normalizeLocationSearchText(rawQuery);
  const rows = all.filter((site) => getSiteSearchBlob(site).includes(normalizedQuery));
  return {
    rawQuery,
    normalizedQuery,
    coordQuery: null,
    rows,
    nearest: [],
  };
}

function highlightLocationMatch(text, query){
  const value = String(text || "");
  const q = String(query || "").trim();
  if (!value || !q || parseLocationCoordinateQuery(q)) return escapeHtml(value);
  const lower = value.toLowerCase();
  const qLower = q.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx < 0) return escapeHtml(value);
  const start = escapeHtml(value.slice(0, idx));
  const hit = escapeHtml(value.slice(idx, idx + q.length));
  const end = escapeHtml(value.slice(idx + q.length));
  return `${start}<mark>${hit}</mark>${end}`;
}

function setSiteSearchBanner(message = ""){
  const banner = $("siteSearchBanner");
  if (!banner) return;
  banner.textContent = message || "";
  banner.style.display = message ? "" : "none";
}

function updateSiteSearchUiSummary(resultSet){
  const clearBtn = $("btnClearMapSearch");
  if (clearBtn){
    clearBtn.style.display = resultSet.rawQuery ? "" : "none";
  }
  const meta = $("siteSearchMeta");
  if (!meta) return;
  if (!state.activeProject){
    meta.textContent = "";
    return;
  }
  const total = getVisibleSites().length;
  if (!resultSet.rawQuery){
    meta.textContent = `${total} site${total === 1 ? "" : "s"}`;
    return;
  }
  meta.textContent = `${resultSet.rows.length} match${resultSet.rows.length === 1 ? "" : "es"}`;
}

function syncMapToSearchResults(resultSet){
  if (!state.map.instance || !window.L) return;
  const rows = resultSet.rows || [];
  if (resultSet.coordQuery){
    const key = `${resultSet.coordQuery.lat.toFixed(6)},${resultSet.coordQuery.lng.toFixed(6)}`;
    if (state.map.searchJumpKey !== key){
      state.map.searchJumpKey = key;
      state.map.instance.setView([resultSet.coordQuery.lat, resultSet.coordQuery.lng], 18);
    }
    if (resultSet.nearest[0]){
      const nearest = resultSet.nearest[0];
      const siteName = getSiteDisplayName(nearest.site);
      const meters = Math.round(nearest.distanceM);
      setSiteSearchBanner(`Jumped to coordinate - nearest site: ${siteName} (${meters}m)`);
      setActiveSite(nearest.site.id, { openOverview: false }).then(() => focusSiteOnMap(nearest.site.id));
    } else {
      setSiteSearchBanner("Jumped to coordinate - no nearby site found.");
    }
    return;
  }
  state.map.searchJumpKey = "";
  setSiteSearchBanner("");
  if (!rows.length) return;
  const bounds = [];
  rows.forEach((site) => {
    const coords = getSiteCoords(site);
    if (coords) bounds.push([coords.lat, coords.lng]);
  });
  if (!bounds.length) return;
  if (bounds.length === 1){
    state.map.instance.setView(bounds[0], Math.max(state.map.instance.getZoom() || 0, 17));
    setActiveSite(rows[0].id, { openOverview: false }).then(() => focusSiteOnMap(rows[0].id));
    return;
  }
  state.map.instance.fitBounds(window.L.latLngBounds(bounds), { padding: [24, 24], maxZoom: 16 });
}

async function loadProjectSites(projectId){
  if (isDemo){
    state.projectSites = (state.demo.sites || []).filter(s => !projectId || s.project_id === projectId);
    state.pendingSites = loadPendingSitesFromStorage();
    state.map.siteSearchIndex.clear();
    state.map.siteCodesBySiteId.clear();
    state.map.sitePhotosBySiteId.clear();
    renderSiteList();
    return;
  }
  if (!projectId){
    state.projectSites = [];
    state.pendingSites = loadPendingSitesFromStorage();
    state.map.siteSearchIndex.clear();
    state.map.siteCodesBySiteId.clear();
    state.map.sitePhotosBySiteId.clear();
    renderSiteList();
    return;
  }
  const { data, error } = await fetchSitesByProject(projectId);
  if (error){
    toast("Sites load error", error.message);
    return;
  }
  state.projectSites = data || [];
  state.pendingSites = loadPendingSitesFromStorage();
  state.map.siteSearchIndex.clear();
  state.map.siteCodesBySiteId.clear();
  state.map.sitePhotosBySiteId.clear();
  const visibleIds = new Set(getVisibleSites().map((site) => toSiteIdKey(site?.id)));
  if (state.activeSite && !visibleIds.has(toSiteIdKey(state.activeSite.id))){
    closeSitePanel();
  }
  renderSiteList();
  if (state.map.instance){
    const rows = getSiteSearchResultSet().rows;
    updateMapMarkers(rows);
    renderDerivedMapLayers(rows);
  }
}

function getNextSiteName(){
  const sites = getVisibleSites();
  const numbers = sites
    .map((site) => {
      const match = String(site.name || "").match(/site\s+(\d+)/i);
      return match ? Number(match[1]) : null;
    })
    .filter((val) => Number.isFinite(val));
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  if (!Number.isFinite(next)) return `Site ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  return `Site ${next}`;
}

function renderSiteList(){
  const wrap = $("siteList");
  if (!wrap) return;
  const resultSet = getSiteSearchResultSet();
  updateSiteSearchUiSummary(resultSet);
  if (!state.activeProject){
    wrap.innerHTML = `<div class="muted small">${t("mapStatusNoProject")}</div>`;
    return;
  }
  const rows = resultSet.rows;
  if (!rows.length){
    wrap.innerHTML = `<div class="muted small">${resultSet.rawQuery ? "No matching sites." : t("mapStatusNoSites")}</div>`;
    return;
  }
  const rawSearch = String(state.mapFilters.search || "").trim();
  wrap.innerHTML = rows.map((site) => {
    const isActive = toSiteIdKey(state.activeSite?.id) === toSiteIdKey(site?.id);
    const status = site.is_pending ? ` <span class="muted small">(${t("siteStatusPending")})</span>` : "";
    const label = getSiteDisplayName(site);
    return `
      <button class="site-row${isActive ? " is-selected" : ""}" data-site-id="${site.id}">
        <span>${highlightLocationMatch(label, rawSearch)}${status}</span>
      </button>
    `;
  }).join("");
}

function scheduleLocationSearchRefresh({ syncMap = true } = {}){
  if (state.map.searchDebounceId){
    clearTimeout(state.map.searchDebounceId);
  }
  state.map.searchDebounceId = setTimeout(async () => {
    state.map.searchDebounceId = null;
    renderSiteList();
    const resultSet = getSiteSearchResultSet();
    if (state.map.instance){
      updateMapMarkers(resultSet.rows);
      renderDerivedMapLayers(resultSet.rows);
      if (syncMap){
        syncMapToSearchResults(resultSet);
      }
    }
  }, 300);
}

function clearLocationSearch(){
  state.mapFilters.search = "";
  const input = $("mapSearch");
  if (input) input.value = "";
  setSiteSearchBanner("");
  state.map.searchJumpKey = "";
  renderSiteList();
  if (state.map.instance){
    updateMapMarkers(getVisibleSites());
    renderDerivedMapLayers(getVisibleSites());
  }
}

function focusFirstSearchResult(){
  const resultSet = getSiteSearchResultSet();
  if (!resultSet.rows.length) return;
  const first = resultSet.rows[0];
  setActiveSite(first.id, { openOverview: false }).then(() => {
    focusSiteOnMap(first.id);
  });
}

async function setActiveSite(siteId, { openOverview = false, autoDrawerTab = true } = {}){
  const siteKey = toSiteIdKey(siteId);
  const site = getVisibleSites().find((row) => toSiteIdKey(row?.id) === siteKey) || null;
  state.activeSite = site;
  if (site){
    if (autoDrawerTab){
      switchSidebarTab("site");
    }
    const feature = buildSiteFeature(site);
    const coords = getSiteCoords(site);
    if (coords){
      const set = getFeatureSetByPoint(coords.lat, coords.lng);
      state.map.selectedSet = set.length ? set : [feature];
      state.map.selectedIndex = Math.max(0, state.map.selectedSet.findIndex((f) => toSiteIdKey(f?.properties?.id) === siteKey));
      if (state.map.selectedIndex < 0) state.map.selectedIndex = 0;
      state.map.selectedFeature = state.map.selectedSet[state.map.selectedIndex] || feature;
      drawFeatureHighlight(state.map.selectedFeature);
    } else {
      state.map.selectedSet = [feature];
      state.map.selectedIndex = 0;
      state.map.selectedFeature = feature;
      drawFeatureHighlight(feature);
    }
  } else {
    closeFeatureDrawer();
  }
  state.siteMedia = [];
  state.siteCodes = [];
  state.siteEntries = [];
  renderSiteList();
  renderSitePanel();
  renderFeatureDrawer();
  if (openOverview){
    SpecCom.helpers.openPinOverview();
    SpecCom.helpers.renderPinOverview();
  } else if (typeof SpecCom.helpers.closePinOverview === "function"){
    SpecCom.helpers.closePinOverview();
  }
  if (!site || site.is_pending) return;
  await Promise.all([
    loadSiteMedia(site.id),
    loadSiteCodes(site.id),
    loadSiteEntries(site.id),
  ]);
  renderSitePanel();
  renderFeatureDrawer();
  if (openOverview){
    SpecCom.helpers.renderPinOverview();
  } else if (typeof SpecCom.helpers.closePinOverview === "function"){
    SpecCom.helpers.closePinOverview();
  }
}

function closeSitePanel(){
  state.activeSite = null;
  state.siteMedia = [];
  state.siteCodes = [];
  state.siteEntries = [];
  SpecCom.helpers.closePinOverview();
  renderSiteList();
  renderSitePanel();
  renderFeatureDrawer();
}

SpecCom.helpers.ensurePinOverviewModal = function(){
  let modal = document.getElementById("pinOverviewModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "pinOverviewModal";
  modal.className = "modal pin-overview-modal";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="card modal-card pin-overview-card">
      <div class="pin-overview-top">
        <div class="pin-overview-title">Task Overview</div>
      </div>
      <div class="pin-overview-head">
        <div>
          <div id="pinOverviewTaskNumber" class="pin-overview-task-number">-</div>
          <div id="pinOverviewTaskRef" class="pin-overview-task-ref muted small">Task @ -</div>
        </div>
        <div id="pinOverviewStatus" class="pin-overview-status">PENDING</div>
      </div>
      <div class="pin-overview-meta">
        <div>
          <div class="muted tiny">DATE CREATED</div>
          <div id="pinOverviewDateCreated">-</div>
        </div>
        <div>
          <div class="muted tiny">LAST UPDATED</div>
          <div id="pinOverviewDateUpdated">-</div>
        </div>
      </div>
      <div class="pin-overview-section">
        <div class="muted tiny">WORK TYPE</div>
        <div id="pinOverviewWorkType" class="pin-overview-work-list"></div>
      </div>
      <div class="pin-overview-section">
        <div class="muted tiny">GPS COORDINATES</div>
        <div id="pinOverviewGps" class="pin-overview-inline-value">-</div>
      </div>
      <div class="pin-overview-section">
        <div class="muted tiny">PROGRESS REPORT NOTES</div>
        <div id="pinOverviewNotes" class="pin-overview-notes">-</div>
      </div>
      <div id="pinOverviewManualEditor" class="pin-overview-manual-editor" style="display:none;">
        <div class="muted tiny">MANUAL ENTRY (ROOT/OWNER ONLY)</div>
        <div class="row" style="margin-top:8px;">
          <input id="pinOverviewGpsLatInput" class="input compact" type="number" step="any" placeholder="GPS Lat" />
          <input id="pinOverviewGpsLngInput" class="input compact" type="number" step="any" placeholder="GPS Lng" />
        </div>
        <textarea id="pinOverviewNotesInput" class="input" rows="3" placeholder="Progress report notes"></textarea>
        <div class="row" style="justify-content:flex-end; margin-top:8px;">
          <button id="btnPinOverviewSaveManual" class="btn secondary" type="button">Save details</button>
        </div>
      </div>
      <div id="pinOverviewPhotos" class="pin-overview-photo-grid"></div>
      <div class="row" style="justify-content:center; gap:8px; flex-wrap:wrap;">
        <button id="btnPinOverviewNoAccess" class="btn secondary" type="button">Report No Access</button>
        <button id="btnPinOverviewClose" class="btn ghost" type="button">Close Overview</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const closeBtn = modal.querySelector("#btnPinOverviewClose");
  if (closeBtn){
    closeBtn.addEventListener("click", () => SpecCom.helpers.closePinOverview());
  }
  const saveManualBtn = modal.querySelector("#btnPinOverviewSaveManual");
  if (saveManualBtn){
    saveManualBtn.addEventListener("click", async () => {
      await SpecCom.helpers.savePinOverviewManualDetails();
    });
  }
  const noAccessBtn = modal.querySelector("#btnPinOverviewNoAccess");
  if (noAccessBtn){
    noAccessBtn.addEventListener("click", async () => {
      await SpecCom.helpers.reportNoAccessFromPinOverview();
    });
  }
  modal.addEventListener("click", (e) => {
    if (e.target === modal) SpecCom.helpers.closePinOverview();
  });
  if (!SpecCom.helpers._pinOverviewKeyListener){
    SpecCom.helpers._pinOverviewKeyListener = true;
    document.addEventListener("keydown", (e) => {
      if (!state.pinOverview.open) return;
      if (e.key === "Escape") SpecCom.helpers.closePinOverview();
    });
  }
  return modal;
};

SpecCom.helpers.openPinOverview = function(){
  const modal = SpecCom.helpers.ensurePinOverviewModal();
  modal.style.display = "";
  state.pinOverview.open = true;
};

SpecCom.helpers.closePinOverview = function(){
  const modal = document.getElementById("pinOverviewModal");
  if (modal) modal.style.display = "none";
  state.pinOverview.open = false;
};

SpecCom.helpers.renderPinOverview = function(){
  const modal = SpecCom.helpers.ensurePinOverviewModal();
  const taskNumber = modal.querySelector("#pinOverviewTaskNumber");
  const taskRef = modal.querySelector("#pinOverviewTaskRef");
  const statusEl = modal.querySelector("#pinOverviewStatus");
  const dateCreatedEl = modal.querySelector("#pinOverviewDateCreated");
  const dateUpdatedEl = modal.querySelector("#pinOverviewDateUpdated");
  const workTypeEl = modal.querySelector("#pinOverviewWorkType");
  const gpsEl = modal.querySelector("#pinOverviewGps");
  const notesEl = modal.querySelector("#pinOverviewNotes");
  const manualEditor = modal.querySelector("#pinOverviewManualEditor");
  const manualLatInput = modal.querySelector("#pinOverviewGpsLatInput");
  const manualLngInput = modal.querySelector("#pinOverviewGpsLngInput");
  const manualNotesInput = modal.querySelector("#pinOverviewNotesInput");
  const saveManualBtn = modal.querySelector("#btnPinOverviewSaveManual");
  const noAccessBtn = modal.querySelector("#btnPinOverviewNoAccess");
  const photosEl = modal.querySelector("#pinOverviewPhotos");
  const canManualProofEdit = SpecCom.helpers.isRoot() || isOwner();
  const site = state.activeSite || null;
  if (manualEditor){
    manualEditor.style.display = canManualProofEdit ? "" : "none";
  }
  if (!site){
    if (taskNumber) taskNumber.textContent = "-";
    if (taskRef) taskRef.textContent = "Task @ -";
    if (statusEl){
      statusEl.textContent = "PENDING";
      statusEl.classList.remove("is-complete");
    }
    if (dateCreatedEl) dateCreatedEl.textContent = "-";
    if (dateUpdatedEl) dateUpdatedEl.textContent = "-";
    if (workTypeEl) workTypeEl.innerHTML = `<div class="muted small">-</div>`;
    if (gpsEl) gpsEl.textContent = "-";
    if (notesEl) notesEl.textContent = "-";
    if (manualLatInput) manualLatInput.value = "";
    if (manualLngInput) manualLngInput.value = "";
    if (manualNotesInput) manualNotesInput.value = "";
    if (saveManualBtn) saveManualBtn.disabled = true;
    if (noAccessBtn) noAccessBtn.disabled = true;
    if (photosEl) photosEl.innerHTML = "";
    return;
  }

  const idLabel = String(site.id || "").slice(0, 4).toUpperCase();
  const nameLabel = String(getSiteDisplayName(site) || "").trim();
  const numericMatch = nameLabel.match(/\d+/);
  const primaryTask = numericMatch ? numericMatch[0] : (idLabel || "0000");
  if (taskNumber) taskNumber.textContent = primaryTask;
  if (taskRef) taskRef.textContent = `Task @ ${idLabel || primaryTask}`;

  const isComplete = SpecCom.helpers.getSiteCompletionState(site) && !site.is_pending;
  if (statusEl){
    statusEl.textContent = isComplete ? "COMPLETED" : "PENDING";
    statusEl.classList.toggle("is-complete", isComplete);
  }

  const createdAt = site.created_at ? new Date(site.created_at) : null;
  const updatedAt = site.updated_at ? new Date(site.updated_at) : createdAt;
  if (dateCreatedEl){
    dateCreatedEl.textContent = createdAt && Number.isFinite(createdAt.getTime())
      ? createdAt.toLocaleDateString()
      : "-";
  }
  if (dateUpdatedEl){
    dateUpdatedEl.textContent = updatedAt && Number.isFinite(updatedAt.getTime())
      ? updatedAt.toLocaleDateString()
      : "-";
  }

  if (workTypeEl){
    const fromEntries = (state.siteEntries || []).map((row) => ({
      label: String(row.description || "").trim(),
      qty: Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : 1,
    })).filter((row) => row.label);
    const fromCodes = (state.siteCodes || []).map((row) => ({
      label: String(row.code || "").trim(),
      qty: 1,
    })).filter((row) => row.label);
    const items = fromEntries.length ? fromEntries : fromCodes;
    if (!items.length){
      workTypeEl.innerHTML = `<div class="muted small">-</div>`;
    } else {
      workTypeEl.innerHTML = items.map((row) => (
        `<div class="pin-overview-work-item"><span>${escapeHtml(row.label)}</span><span>x${escapeHtml(row.qty)}</span></div>`
      )).join("");
    }
  }

  if (gpsEl){
    const coords = getSiteCoords(site);
    gpsEl.textContent = coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "-";
  }

  if (notesEl){
    const notes = String(site.notes || "").trim();
    notesEl.textContent = notes || "-";
  }
  if (manualLatInput || manualLngInput){
    const coords = getSiteCoords(site);
    if (manualLatInput){
      manualLatInput.value = coords ? String(coords.lat) : "";
      manualLatInput.disabled = !canManualProofEdit || site.is_pending;
    }
    if (manualLngInput){
      manualLngInput.value = coords ? String(coords.lng) : "";
      manualLngInput.disabled = !canManualProofEdit || site.is_pending;
    }
  }
  if (manualNotesInput){
    manualNotesInput.value = String(site.notes || "");
    manualNotesInput.disabled = !canManualProofEdit || site.is_pending;
  }
  if (saveManualBtn){
    saveManualBtn.disabled = !canManualProofEdit || site.is_pending;
  }
  if (noAccessBtn){
    noAccessBtn.disabled = site.is_pending || !state.activeProject?.id;
  }

  if (photosEl){
    const items = state.siteMedia || [];
    if (!items.length){
      photosEl.innerHTML = `<div class="muted small">No photos yet.</div>`;
    } else {
      photosEl.innerHTML = items.map((item, idx) => (
        `<button class="pin-overview-photo-card" type="button" data-action="openOverviewMedia" data-index="${idx}">
          ${item.previewUrl ? `<img src="${item.previewUrl}" alt="task photo ${idx + 1}" />` : ""}
        </button>`
      )).join("");
    }
    if (!photosEl.dataset.bound){
      photosEl.dataset.bound = "1";
      photosEl.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='openOverviewMedia']");
        if (!btn) return;
        const idx = Number(btn.dataset.index);
        if (!Number.isFinite(idx)) return;
        SpecCom.helpers.openMediaViewer(idx);
      });
    }
  }
};

SpecCom.helpers.savePinOverviewManualDetails = async function(){
  const site = state.activeSite;
  if (!site || site.is_pending) return;
  if (!(SpecCom.helpers.isRoot() || isOwner())){
    toast("Permission denied", "Only ROOT or OWNER can manually edit GPS and progress notes.", "error");
    return;
  }
  const latRaw = String($("pinOverviewGpsLatInput")?.value || "").trim();
  const lngRaw = String($("pinOverviewGpsLngInput")?.value || "").trim();
  const notes = String($("pinOverviewNotesInput")?.value || "").trim();
  const hasLat = latRaw !== "";
  const hasLng = lngRaw !== "";
  if (hasLat !== hasLng){
    toast("GPS invalid", "Enter both latitude and longitude, or leave both empty.", "error");
    return;
  }
  const hasGps = hasLat && hasLng;
  const latNum = hasGps ? Number(latRaw) : null;
  const lngNum = hasGps ? Number(lngRaw) : null;
  if (hasGps && (!Number.isFinite(latNum) || !Number.isFinite(lngNum))){
    toast("GPS invalid", "Enter valid numeric latitude/longitude.", "error");
    return;
  }

  if (isDemo){
    state.demo.sites = (state.demo.sites || []).map((row) => {
      if (row.id !== site.id) return row;
      const next = { ...row, notes };
      if (hasGps){
        next.gps_lat = latNum;
        next.gps_lng = lngNum;
      }
      return next;
    });
    state.projectSites = (state.projectSites || []).map((row) => {
      if (row.id !== site.id) return row;
      const next = { ...row, notes };
      if (hasGps){
        next.gps_lat = latNum;
        next.gps_lng = lngNum;
      }
      return next;
    });
    state.activeSite = (state.projectSites || []).find((row) => row.id === site.id) || state.activeSite;
    updateMapMarkers(getVisibleSites());
    renderSitePanel();
    toast("Saved", "Manual details updated.");
    return;
  }

  if (!state.client){
    toast("Update failed", "Client not ready.", "error");
    return;
  }

  const payload = { notes };
  if (hasGps){
    payload.gps_lat = latNum;
    payload.gps_lng = lngNum;
  }

  let res = await state.client
    .from("sites")
    .update(payload)
    .eq("id", site.id)
    .select("id")
    .single();
  if (res.error && hasGps && isMissingGpsColumnError(res.error)){
    const legacyPayload = { ...payload, lat: latNum, lng: lngNum };
    delete legacyPayload.gps_lat;
    delete legacyPayload.gps_lng;
    res = await state.client
      .from("sites")
      .update(legacyPayload)
      .eq("id", site.id)
      .select("id")
      .single();
  }
  if (res.error){
    toast("Update failed", res.error.message, "error");
    return;
  }

  const siteRes = await fetchSiteById(site.id);
  if (siteRes.error){
    toast("Refresh failed", siteRes.error.message, "error");
    return;
  }
  if (siteRes.data){
    state.projectSites = (state.projectSites || []).filter((row) => row.id !== siteRes.data.id).concat(siteRes.data);
    state.activeSite = siteRes.data;
  }
  if (hasGps){
    updateMapMarkers(getVisibleSites());
  }
  renderSitePanel();
  toast("Saved", "Manual details updated.");
};

function renderSitePanel(){
  const subtitle = $("sitePanelSubtitle");
  const mediaGallery = $("siteMediaGallery");
  const codesList = $("siteCodesList");
  const entriesList = $("siteEntriesList");
  const notesInput = $("siteNotesInput");
  const codesInput = $("siteCodesInput");
  const entryDesc = $("siteEntryDescription");
  const entryQty = $("siteEntryQuantity");
  const siteNameInput = $("siteNameInput");
  const saveNameBtn = $("btnSaveSiteName");
  const mediaInput = $("siteMediaInput");
  const saveCodesBtn = $("btnSaveCodes");
  const addEntryBtn = $("btnAddEntry");
  const saveNotesBtn = $("btnSaveNotes");
  const editLocationBtn = $("btnEditSiteLocation");
  const isRoot = SpecCom.helpers.isRoot();
  const canManualProofEdit = isRoot || isOwner();

  const site = state.activeSite;
  const isPending = Boolean(site?.is_pending);
  const disabled = !site || isPending;
  if (subtitle){
    if (!site){
      subtitle.textContent = t("noSiteSelected");
    } else {
      const when = site.created_at ? new Date(site.created_at).toLocaleString() : "-";
      const pendingLabel = site.is_pending ? ` • ${t("siteStatusPending")}` : "";
      subtitle.textContent = `${getSiteDisplayName(site)} • ${when}${pendingLabel}`;
    }
  }

  if (mediaInput) mediaInput.disabled = disabled;
  if (codesInput) codesInput.disabled = disabled;
  if (entryDesc) entryDesc.disabled = disabled;
  if (entryQty) entryQty.disabled = disabled;
  if (notesInput) notesInput.disabled = disabled || !canManualProofEdit;
  if (siteNameInput) siteNameInput.disabled = disabled;
  if (saveNameBtn) saveNameBtn.disabled = disabled;
  if (saveCodesBtn) saveCodesBtn.disabled = disabled;
  if (addEntryBtn) addEntryBtn.disabled = disabled;
  if (saveNotesBtn) saveNotesBtn.disabled = disabled || !canManualProofEdit;
  if (editLocationBtn) editLocationBtn.disabled = disabled || !canManualProofEdit;

  const nameRow = siteNameInput?.closest(".row");
  if (nameRow && !document.getElementById("btnDeleteSite")){
    const btn = document.createElement("button");
    btn.id = "btnDeleteSite";
    btn.type = "button";
    btn.className = "btn danger";
    btn.textContent = "Delete site";
    nameRow.appendChild(btn);
  }
  const deleteSiteBtn = $("btnDeleteSite");
  if (deleteSiteBtn){
    deleteSiteBtn.style.display = (isRoot && site && !isPending) ? "" : "none";
    deleteSiteBtn.disabled = disabled;
    deleteSiteBtn.onclick = async () => {
      await SpecCom.helpers.deleteSiteFromPanel();
    };
  }

  if (codesInput) codesInput.value = (state.siteCodes || []).map((row) => row.code).join(", ");
  if (notesInput) notesInput.value = site?.notes || "";
  if (siteNameInput) siteNameInput.value = site?.name || "";
  if (editLocationBtn){
    editLocationBtn.style.display = canManualProofEdit ? "" : "none";
    editLocationBtn.onclick = () => {
      if (!site || isPending) return;
      if (!canManualProofEdit){
        toast("Permission denied", "Only ROOT or OWNER can manually edit GPS and progress notes.", "error");
        return;
      }
      ensureMap();
      state.map.dropPinMode = true;
      state.map.pinTargetSiteId = site.id;
      toast("Move pin", "Click on the map to update this pin.");
    };
  }

  if (mediaGallery){
    if (!mediaGallery.dataset.viewerBound){
      mediaGallery.dataset.viewerBound = "true";
      mediaGallery.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='openMedia']");
        if (!btn) return;
        const idx = Number(btn.dataset.index);
        if (!Number.isFinite(idx)) return;
        SpecCom.helpers.openMediaViewer(idx);
      });
    }
    if (!site){
      mediaGallery.innerHTML = `<div class="muted small">${t("noSiteSelected")}</div>`;
    } else if (!(state.siteMedia || []).length){
      mediaGallery.innerHTML = `<div class="muted small">${t("mediaSubtitle")}</div>`;
    } else {
      mediaGallery.innerHTML = state.siteMedia.map((item, idx) => `
        <button class="media-card" type="button" data-action="openMedia" data-index="${idx}">
          ${item.previewUrl ? `<img src="${item.previewUrl}" alt="media" />` : ""}
          <div class="media-meta">${escapeHtml(new Date(item.created_at).toLocaleString())}</div>
        </button>
      `).join("");
    }
  }

  if (codesList){
    codesList.innerHTML = (state.siteCodes || []).length
      ? (state.siteCodes || []).map((row) => `<span class="code-chip">${escapeHtml(row.code)}</span>`).join("")
      : `<div class="muted small">${t("codesSubtitle")}</div>`;
  }

  if (entriesList){
    if (!(state.siteEntries || []).length){
      entriesList.innerHTML = `<div class="muted small">${t("entriesSubtitle")}</div>`;
    } else {
      entriesList.innerHTML = (state.siteEntries || []).map((row) => {
        const qty = row.quantity == null ? "-" : row.quantity;
        return `
          <div class="entry-row">
            <div>${escapeHtml(row.description || "")}</div>
            <div class="muted">Qty: ${escapeHtml(qty)}</div>
          </div>
        `;
      }).join("");
    }
  }
  if (state.map.instance){
    renderDerivedMapLayers(getSiteSearchResultSet().rows);
  }
  if (state.pinOverview.open){
    SpecCom.helpers.renderPinOverview();
  }
}

async function saveSiteName(){
  const site = state.activeSite;
  if (!site){
    toast("Site missing", "Site not found.");
    return;
  }
  const input = $("siteNameInput");
  const nextName = String(input?.value || "").trim() || "Pinned site";

  if (site.is_pending){
    state.pendingSites = loadPendingSitesFromStorage().map((row) => (
      row.id === site.id ? { ...row, name: nextName } : row
    ));
    savePendingSitesToStorage(state.pendingSites);
    state.activeSite = { ...site, name: nextName };
    renderSiteList();
    renderSitePanel();
    toast("Saved", "Location name updated.");
    return;
  }

  if (!state.client){
    toast("Update failed", "Client not ready.");
    return;
  }
  const { error } = await state.client
    .from("sites")
    .update({ name: nextName })
    .eq("id", site.id);
  if (error){
    toast("Update failed", error.message);
    return;
  }
  state.projectSites = (state.projectSites || []).map((row) => (
    row.id === site.id ? { ...row, name: nextName } : row
  ));
  state.activeSite = { ...site, name: nextName };
  renderSiteList();
  renderSitePanel();
  toast("Saved", "Location name updated.");
}

async function loadSiteMedia(siteId){
  if (isDemo){
    state.siteMedia = (state.demo.siteMedia || []).filter((row) => row.site_id === siteId);
    setCachedSitePhotos(siteId, state.siteMedia.map((row) => ({
      url: String(row?.previewUrl || row?.media_path || "").trim(),
      createdAt: row?.created_at || "",
    })).filter((row) => row.url));
    return;
  }
  const { data, error } = await state.client
    .from("site_media")
    .select("id, site_id, media_path, gps_lat, gps_lng, gps_accuracy_m, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  if (error){
    toast("Media load error", error.message);
    state.siteMedia = [];
    setCachedSitePhotos(siteId, []);
    return;
  }
  const rows = data || [];
  const withUrls = [];
  for (const row of rows){
    const previewUrl = row.media_path
      ? (/^https?:\/\//i.test(String(row.media_path)) ? String(row.media_path) : await getPublicOrSignedUrl("proof-photos", row.media_path))
      : "";
    withUrls.push({ ...row, previewUrl });
  }
  state.siteMedia = withUrls;
  setCachedSitePhotos(siteId, withUrls.map((row) => ({
    url: String(row?.previewUrl || "").trim(),
    createdAt: row?.created_at || "",
  })).filter((row) => row.url));
}

async function loadSiteCodes(siteId){
  if (isDemo){
    state.siteCodes = (state.demo.siteCodes || []).filter((row) => row.site_id === siteId);
    setCachedSiteCodes(siteId, state.siteCodes.map((row) => row.code));
    return;
  }
  const { data, error } = await state.client
    .from("site_codes")
    .select("id, site_id, code, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: true });
  if (error){
    toast("Codes load error", error.message);
    state.siteCodes = [];
    setCachedSiteCodes(siteId, []);
    return;
  }
  state.siteCodes = data || [];
  setCachedSiteCodes(siteId, state.siteCodes.map((row) => row.code));
}

async function loadSiteEntries(siteId){
  if (isDemo){
    state.siteEntries = (state.demo.siteEntries || []).filter((row) => row.site_id === siteId);
    return;
  }
  const { data, error } = await state.client
    .from("site_entries")
    .select("id, site_id, description, quantity, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  if (error){
    toast("Entries load error", error.message);
    state.siteEntries = [];
    return;
  }
  state.siteEntries = data || [];
}

async function saveSiteNotes(){
  const site = state.activeSite;
  if (!site || site.is_pending) return;
  if (!(SpecCom.helpers.isRoot() || isOwner())){
    toast("Permission denied", "Only ROOT or OWNER can manually edit GPS and progress notes.", "error");
    return;
  }
  const notes = $("siteNotesInput")?.value || "";
  if (isDemo){
    const demoSite = (state.demo.sites || []).find((row) => row.id === site.id);
    if (demoSite) demoSite.notes = notes;
    state.activeSite.notes = notes;
    renderSitePanel();
    return;
  }
  const { error } = await state.client
    .from("sites")
    .update({ notes })
    .eq("id", site.id);
  if (error){
    toast("Notes save error", error.message);
    return;
  }
  const match = (state.projectSites || []).find((row) => row.id === site.id);
  if (match) match.notes = notes;
  state.activeSite = match || { ...site, notes };
  renderSitePanel();
}

function parseCodes(raw){
  const list = String(raw || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
  return Array.from(new Set(list));
}

async function saveSiteCodes(){
  const site = state.activeSite;
  if (!site || site.is_pending) return;
  const raw = $("siteCodesInput")?.value || "";
  const codes = parseCodes(raw);
  if (isDemo){
    state.demo.siteCodes = (state.demo.siteCodes || []).filter((row) => row.site_id !== site.id);
    state.demo.siteCodes.push(...codes.map((code) => ({
      id: `demo-code-${Date.now()}-${code}`,
      site_id: site.id,
      code,
      created_at: new Date().toISOString(),
    })));
    state.siteCodes = state.demo.siteCodes.filter((row) => row.site_id === site.id);
    setCachedSiteCodes(site.id, state.siteCodes.map((row) => row.code));
    renderSitePanel();
    return;
  }
  await state.client.from("site_codes").delete().eq("site_id", site.id);
  if (codes.length){
    const payload = codes.map((code) => ({ site_id: site.id, code }));
    const { error } = await state.client.from("site_codes").insert(payload);
    if (error){
      toast("Codes save error", error.message);
      return;
    }
  }
  await loadSiteCodes(site.id);
  renderSitePanel();
}

async function addSiteEntry(){
  const site = state.activeSite;
  if (!site || site.is_pending) return;
  const desc = $("siteEntryDescription")?.value.trim();
  const qtyRaw = $("siteEntryQuantity")?.value;
  if (!desc){
    toast("Entry required", "Add a description for the entry.");
    return;
  }
  const quantity = qtyRaw === "" ? null : Number(qtyRaw);
  if (qtyRaw !== "" && !Number.isFinite(quantity)){
    toast("Quantity invalid", "Enter a valid quantity or leave it blank.");
    return;
  }
  if (isDemo){
    const row = {
      id: `demo-entry-${Date.now()}`,
      site_id: site.id,
      description: desc,
      quantity,
      created_at: new Date().toISOString(),
    };
    state.demo.siteEntries = state.demo.siteEntries || [];
    state.demo.siteEntries.unshift(row);
    state.siteEntries = state.demo.siteEntries.filter((item) => item.site_id === site.id);
    renderSitePanel();
  } else {
    const { error } = await state.client
      .from("site_entries")
      .insert({ site_id: site.id, description: desc, quantity });
    if (error){
      toast("Entry save error", error.message);
      return;
    }
    await loadSiteEntries(site.id);
    renderSitePanel();
  }
  const descInput = $("siteEntryDescription");
  const qtyInput = $("siteEntryQuantity");
  if (descInput) descInput.value = "";
  if (qtyInput) qtyInput.value = "";
}

function getCurrentGps({ enableHighAccuracy = true, timeout = 12000, maximumAge = 0 } = {}){
  return new Promise((resolve) => {
    if (!navigator.geolocation){
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        });
      },
      () => resolve(null),
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
}

async function addSiteMedia(file){
  const site = state.activeSite;
  if (!site || site.is_pending || !file) return;
  const capturedAt = new Date().toISOString();
  const gps = await getCurrentGps();
  const fallbackGps = (site.gps_lat != null && site.gps_lng != null)
    ? { lat: site.gps_lat, lng: site.gps_lng, accuracy: site.gps_accuracy_m || null }
    : null;
  const finalGps = gps || fallbackGps;

  if (isDemo){
    state.demo.siteMedia = state.demo.siteMedia || [];
    state.demo.siteMedia.unshift({
      id: `demo-media-${Date.now()}`,
      site_id: site.id,
      media_path: "demo-only",
      created_at: capturedAt,
      gps_lat: finalGps?.lat ?? null,
      gps_lng: finalGps?.lng ?? null,
      gps_accuracy_m: finalGps?.accuracy ?? null,
      previewUrl: URL.createObjectURL(file),
    });
    state.siteMedia = state.demo.siteMedia.filter((row) => row.site_id === site.id);
    renderSitePanel();
    return;
  }
  const uploadPath = await uploadProofPhoto(file, site.id, "site-media");
  if (!uploadPath) return;
  const { error } = await state.client
    .from("site_media")
    .insert({
      site_id: site.id,
      media_path: uploadPath,
      gps_lat: finalGps?.lat ?? null,
      gps_lng: finalGps?.lng ?? null,
      gps_accuracy_m: finalGps?.accuracy ?? null,
      created_at: capturedAt,
    });
  if (error){
    toast("Media save error", error.message);
    return;
  }
  await loadSiteMedia(site.id);
  renderSitePanel();
}

async function dropPin(){
  if (!state.activeProject){
    toast("Project required", "Select a project to drop a pin.");
    return;
  }
  ensureMap();
  const pendingLatLng = state.map.pendingLatLng;
  if (!pendingLatLng){
    toast("Pin required", "Click the map to choose a location first.");
    return;
  }
  const lat = Number(pendingLatLng.lat);
  const lng = Number(pendingLatLng.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)){
    toast("Pin required", "Click the map to choose a location first.");
    return;
  }
  const siteName = $("dropPinName")?.value.trim() || "";
  await createSiteFromMapClick({ lat, lng }, siteName);
  const nameInput = $("dropPinName");
  if (nameInput) nameInput.value = "";
}

async function createSiteFromMapClick(coords, siteName){
  ensureMap();
  const latNum = Number(coords.lat);
  const lngNum = Number(coords.lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)){
    toast("Pin error", "Invalid map coordinates.");
    clearPendingPinMarker();
    return;
  }
  if (state.map.instance){
    state.map.instance.setView([latNum, lngNum], 17);
  }
  const finalName = String(siteName || "").trim() || "Pinned site";
  const payload = {
    project_id: state.activeProject?.id || null,
    name: finalName,
    gps_lat: latNum,
    gps_lng: lngNum,
    gps_accuracy_m: null,
    created_at: new Date().toISOString(),
  };
  try{
    if (isDemo){
      const demoSite = { id: `demo-site-${Date.now()}`, ...payload };
      state.demo.sites = state.demo.sites || [];
      state.demo.sites.push(demoSite);
      state.projectSites = state.demo.sites.filter((row) => row.project_id === payload.project_id);
      renderSiteList();
      updateMapMarkers(getVisibleSites());
      await setActiveSite(demoSite.id);
      toast(t("pinDroppedTitle"), t("pinDroppedBody"));
      return;
    }

    if (!navigator.onLine || !state.client){
      const pending = {
        id: `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...payload,
      };
      state.pendingSites = loadPendingSitesFromStorage();
      state.pendingSites.push(pending);
      savePendingSitesToStorage(state.pendingSites);
      renderSiteList();
      updateMapMarkers(getVisibleSites());
      await setActiveSite(pending.id);
      toast(t("pinQueuedTitle"), t("pinQueuedBody"));
      return;
    }

    let createdSite = null;
    let siteId = null;
    const rpcRes = await state.client
      .rpc("fn_create_site_pin", {
        p_project_id: state.activeProject?.id || null,
        p_lat: latNum,
        p_lng: lngNum,
      });
    if (rpcRes.error){
      debugLog("[dropPin] rpc error", rpcRes.error);
      const errorMessage = String(rpcRes.error.message || "").toLowerCase();
      if (errorMessage.includes("schema cache")){
        console.error(rpcRes.error);
        toast("Pin save error", "Schema cache is out of date. Refresh and try again.", "error");
        return;
      }
      if (isRpc404(rpcRes.error) || isMissingGpsColumnError(rpcRes.error)){
        const basePayload = { ...payload, created_by: state.user?.id || null };
        let fallback = await state.client
          .from("sites")
          .insert(basePayload)
          .select("id")
          .single();
        if (fallback.error && isMissingGpsColumnError(fallback.error)){
          fallback = await state.client
            .from("sites")
            .insert({ ...stripGpsFields(basePayload), lat: latNum, lng: lngNum })
            .select("id")
            .single();
        }
        if (fallback.error){
          debugLog("[dropPin] fallback error", fallback.error);
          reportPinErrorToast("Pin save error", fallback.error);
          return;
        }
        siteId = fallback.data?.id || null;
      } else {
        reportPinErrorToast("Pin save error", rpcRes.error);
        return;
      }
    } else {
      siteId = rpcRes.data || null;
    }

    if (siteId){
      if (finalName){
        const nameUpdate = await state.client
          .from("sites")
          .update({ name: finalName })
          .eq("id", siteId);
        if (nameUpdate.error){
          reportPinErrorToast("Pin save error", nameUpdate.error);
          return;
        }
      }
      const siteRes = await fetchSiteById(siteId);
      if (siteRes.error){
        reportPinErrorToast("Pin save error", siteRes.error);
        return;
      }
      createdSite = siteRes.data || null;
    }

    if (siteId){
      if (createdSite){
        state.projectSites = (state.projectSites || []).filter((row) => row.id !== createdSite.id).concat(createdSite);
        renderSiteList();
        updateMapMarkers(getVisibleSites());
        await setActiveSite(createdSite.id);
      } else {
        await loadProjectSites(state.activeProject?.id || null);
        await setActiveSite(siteId);
      }
    }
    toast(t("pinDroppedTitle"), t("pinDroppedBody"));
  } finally {
    clearPendingPinMarker();
  }
}

async function updateSiteLocationFromMapClick(siteId, coords){
  if (!siteId){
    clearPendingPinMarker();
    return;
  }
  if (!(SpecCom.helpers.isRoot() || isOwner())){
    toast("Permission denied", "Only ROOT or OWNER can manually edit GPS and progress notes.", "error");
    clearPendingPinMarker();
    return;
  }
  if (!state.client){
    toast("Pin update error", "Client not ready.");
    clearPendingPinMarker();
    return;
  }
  const latNum = Number(coords.lat);
  const lngNum = Number(coords.lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)){
    toast("Pin update error", "Invalid coordinates.");
    clearPendingPinMarker();
    return;
  }
  try{
    let res = await state.client
      .from("sites")
      .update({ gps_lat: latNum, gps_lng: lngNum })
      .eq("id", siteId)
      .select("id")
      .single();
    if (res.error && isMissingGpsColumnError(res.error)){
      res = await state.client
        .from("sites")
        .update({ lat: latNum, lng: lngNum })
        .eq("id", siteId)
        .select("id")
        .single();
    }
    if (res.error){
      reportPinErrorToast("Pin update error", res.error);
      return;
    }
    const siteRes = await fetchSiteById(siteId);
    if (siteRes.error){
      reportPinErrorToast("Pin update error", siteRes.error);
      return;
    }
    if (siteRes.data){
      state.projectSites = (state.projectSites || []).filter((row) => row.id !== siteRes.data.id).concat(siteRes.data);
      updateMapMarkers(getVisibleSites());
      await setActiveSite(siteRes.data.id);
    }
    toast("Pin updated", "Location updated.");
  } finally {
    clearPendingPinMarker();
  }
}

async function syncPendingSites(){
  if (isDemo || !state.client || !navigator.onLine || !state.storageAvailable) return;
  const pending = loadPendingSitesFromStorage();
  if (!pending.length) return;
  const remaining = [];
  for (const site of pending){
    const { id, is_pending, ...payload } = site;
    const gpsPayload = { ...payload };
    delete gpsPayload.lat;
    delete gpsPayload.lng;
    delete gpsPayload.latitude;
    delete gpsPayload.longitude;
    let insertRes = await state.client
      .from("sites")
      .insert(gpsPayload)
      .select("id")
      .single();
    if (insertRes.error && isMissingGpsColumnError(insertRes.error)){
      const legacyPayload = {
        ...stripGpsFields(payload),
        lat: payload.gps_lat ?? payload.lat ?? payload.latitude ?? null,
        lng: payload.gps_lng ?? payload.lng ?? payload.longitude ?? null,
      };
      insertRes = await state.client
        .from("sites")
        .insert(legacyPayload)
        .select("id")
        .single();
    }
    if (insertRes.error || !insertRes.data?.id){
      remaining.push(site);
      continue;
    }
    const siteRes = await fetchSiteById(insertRes.data.id);
    if (siteRes.error || !siteRes.data){
      remaining.push(site);
      continue;
    }
    if (state.activeSite?.id === site.id){
      state.activeSite = siteRes.data;
    }
    if (siteRes.data.project_id === state.activeProject?.id){
      state.projectSites = (state.projectSites || []).concat(siteRes.data);
    }
  }
  state.pendingSites = remaining;
  savePendingSitesToStorage(remaining);
  renderSiteList();
  updateMapMarkers(getVisibleSites());
  renderSitePanel();
}

function renderNodeCards(){
  const wrap = $("nodeCards");
  if (!wrap) return;
  if (!state.projectNodes.length){
    wrap.innerHTML = `<div class="muted small">${t("selectProjectNodes")}</div>`;
    return;
  }
  const showBuildControls = SpecCom.helpers.isRoot() || (BUILD_MODE && isOwner());
  const activeNode = state.projectNodes.find(n => n.status === "ACTIVE");
  wrap.innerHTML = state.projectNodes.map((node) => {
    const status = node.status || "NOT_STARTED";
    const isActive = status === "ACTIVE";
    const isComplete = status === "COMPLETE";
    const canStart = !activeNode || activeNode.id === node.id || isComplete;
    const actionLabel = isComplete ? t("completeLabel") : isActive ? t("continueLabel") : t("startLabel");
    const disabled = !canStart && !isActive;
    const completeDisabled = !isActive && !isComplete;
    const deleting = Boolean(node.isDeleting);
    const demoAttrs = isDemoUser() ? `disabled title="${t("availableInProduction")}"` : "";
    const buildButtons = showBuildControls
      ? `
        <button class="btn ghost" data-action="editNode" data-id="${node.id}" ${deleting ? "disabled" : ""}>${t("editLabel")}</button>
        <button class="btn danger" data-action="deleteNode" data-id="${node.id}" ${deleting ? "disabled" : ""} ${demoAttrs}>${deleting ? t("deletingLabel") : t("deleteLabel")}</button>
      `
      : "";
    const descriptionHtml = renderTranslatedText(node.description || t("jobSubtitle"));
    return `
      <div class="node-card">
        <div class="node-meta">
          <div class="node-title">${escapeHtml(node.node_number)}</div>
          ${descriptionHtml}
        </div>
        <div class="node-status ${status.toLowerCase()}">${status.replace("_", " ")}</div>
        <div class="row">
          <button class="btn ${isActive ? "" : "secondary"}" data-action="openNode" data-id="${node.id}" ${disabled ? "disabled" : ""}>${actionLabel}</button>
          <button class="btn ghost" data-action="completeNode" data-id="${node.id}" ${completeDisabled ? "disabled" : ""}>${t("completeAction")}</button>
          ${buildButtons}
        </div>
      </div>
    `;
  }).join("");
  hydrateTranslations(wrap);
}

function getActiveProjectNode(){
  return state.projectNodes.find(n => n.status === "ACTIVE") || null;
}

async function startNode(nodeId){
  const node = state.projectNodes.find(n => n.id === nodeId);
  if (!node){
    toast("Site missing", "Site not found.");
    return;
  }
  const active = getActiveProjectNode();
  if (active && active.id !== nodeId && active.status !== "COMPLETE"){
    toast("Active site in progress", `Finish ${active.node_number} before starting another site.`);
    return;
  }
  if (isDemo){
    node.status = "ACTIVE";
    node.started_at = nowISO();
    state.demo.nodes[node.node_number].status = "ACTIVE";
    state.activeNode = state.demo.nodes[node.node_number];
    renderNodeCards();
    await openNode(node.node_number);
    setActiveView("viewNodes");
    return;
  }
  const { error } = await state.client
    .from("nodes")
    .update({ status: "ACTIVE", started_at: new Date().toISOString() })
    .eq("id", node.id);
  if (error){
    toast("Start failed", error.message);
    return;
  }
  node.status = "ACTIVE";
  await openNode(node.node_number);
  await loadProjectNodes(node.project_id);
  setActiveView("viewNodes");
}

async function completeNode(nodeId){
  const node = state.projectNodes.find(n => n.id === nodeId);
  if (!node){
    toast("Site missing", "Site not found.");
    return;
  }
  const roleCode = getRoleCode();
  const canComplete = SpecCom.helpers.isRoot()
    ? true
    : (BUILD_MODE
      ? (roleCode === "ADMIN" || roleCode === "PROJECT_MANAGER" || roleCode === "SUPPORT")
      : (roleCode === "PROJECT_MANAGER" || roleCode === "ADMIN" || roleCode === "SUPPORT"));
  if (!canComplete){
    toast("Not allowed", "Only Admin or Project Manager can complete a site.");
    return;
  }
  if (!state.activeNode || state.activeNode.node_number !== node.node_number){
    toast("Open site", "Open the site before marking it complete.");
    return;
  }
  const photos = computeProofStatus(state.activeNode);
  if (!BUILD_MODE && !photos.photosOk){
    toast("No pay", "Photos missing. Completion is blocked.");
    return;
  }
  if (isDemo){
    node.status = "COMPLETE";
    node.completed_at = nowISO();
    state.demo.nodes[node.node_number].status = "COMPLETE";
    renderNodeCards();
    return;
  }
  const { error } = await state.client
    .from("nodes")
    .update({ status: "COMPLETE", completed_at: new Date().toISOString() })
    .eq("id", node.id);
  if (error){
    toast("Complete failed", error.message);
    return;
  }
  node.status = "COMPLETE";
  await loadProjectNodes(node.project_id);
}

async function editNodeMeta(nodeId){
  if (!SpecCom.helpers.isRoot() && (!BUILD_MODE || !isOwner())){
    toast("Not allowed", "Admin role required.");
    return;
  }
  const node = state.projectNodes.find(n => n.id === nodeId);
  if (!node){
    toast("Site missing", "Site not found.");
    return;
  }
  const nextNumber = prompt("Edit site number", node.node_number || "");
  if (nextNumber === null) return;
  const nextDesc = prompt("Edit site description", node.description || "");
  if (nextDesc === null) return;
  const trimmedNumber = String(nextNumber).trim() || node.node_number;
  const trimmedDesc = String(nextDesc).trim();
  if (trimmedNumber === node.node_number && trimmedDesc === (node.description || "")) return;

  if (isDemo){
    const demoNode = state.demo.nodes[node.node_number];
    if (demoNode){
      delete state.demo.nodes[node.node_number];
      demoNode.node_number = trimmedNumber;
      demoNode.description = trimmedDesc;
      state.demo.nodes[trimmedNumber] = demoNode;
    }
    node.node_number = trimmedNumber;
    node.description = trimmedDesc;
    state.demo.nodesList = (state.demo.nodesList || []).map((row) => (
      row.id === node.id ? { ...row, node_number: trimmedNumber, description: trimmedDesc } : row
    ));
    renderNodeCards();
    return;
  }

  const { error } = await state.client
    .from("nodes")
    .update({ node_number: trimmedNumber, description: trimmedDesc })
    .eq("id", node.id);
  if (error){
    toast("Update failed", error.message);
    return;
  }
  node.node_number = trimmedNumber;
  node.description = trimmedDesc;
  if (state.activeNode?.id === node.id){
    state.activeNode.node_number = trimmedNumber;
    state.activeNode.description = trimmedDesc;
    updateKPI();
  }
  renderNodeCards();
}

async function deleteNode(nodeId){
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  if (!SpecCom.helpers.isRoot() && (!BUILD_MODE || !isOwner())){
    toast("Not allowed", "Admin role required.");
    return;
  }
  const node = state.projectNodes.find(n => n.id === nodeId);
  if (!node){
    toast("Site missing", "Site not found.");
    return;
  }
  if (!confirm("Delete site?\nThis will remove the site and all related data. This cannot be undone.")) return;
  const typed = prompt("Type DELETE to confirm.");
  if (typed !== "DELETE"){
    toast("Delete canceled", "Type DELETE to confirm.");
    return;
  }
  node.isDeleting = true;
  renderNodeCards();

  if (isDemo){
    delete state.demo.nodes[node.node_number];
    state.demo.nodesList = (state.demo.nodesList || []).filter(n => n.id !== node.id);
    state.projectNodes = state.projectNodes.filter(n => n.id !== node.id);
    if (state.activeNode?.id === node.id){
      state.activeNode = null;
      clearProof();
    }
    renderNodeCards();
    renderLocations();
    renderInventory();
    renderInvoicePanel();
    renderProofChecklist();
    updateKPI();
    renderBillingDetail();
    toast("Deleted", "Site deleted.");
    return;
  }

  const { error } = await state.client
    .from("nodes")
    .delete()
    .eq("id", node.id);
  if (error){
    toast("Delete failed", error.message);
    node.isDeleting = false;
    renderNodeCards();
    return;
  }
  if (state.activeNode?.id === node.id){
    state.activeNode = null;
    clearProof();
  }
  await loadProjectNodes(node.project_id);
  await loadBillingLocations(state.activeProject?.id || null);
  renderLocations();
  renderInventory();
  renderInvoicePanel();
  renderProofChecklist();
  updateKPI();
  renderBillingDetail();
  toast("Deleted", "Site deleted.");
}

async function loadUnitTypes(){
  if (isDemo){
    state.unitTypes = state.demo.unitTypes || [];
    return;
  }
  const { data, error } = await state.client
    .from("unit_types")
    .select("id, code, description")
    .order("code");
  if (error){
    toast("Unit types error", error.message);
    return;
  }
  state.unitTypes = data || [];
}

async function loadAllowedQuantities(nodeId){
  if (isDemo){
    state.allowedQuantities = (state.demo.allowedQuantities || [])
      .filter(a => !nodeId || a.node_id === nodeId)
      .map((row) => {
        const unit = getUnitTypeMeta(row.unit_type_id);
        return {
          ...row,
          unit_code: unit.code,
          unit_description: unit.description,
        };
      });
    return;
  }
  if (!nodeId){
    state.allowedQuantities = [];
    return;
  }
  const { data, error } = await state.client
    .from("allowed_quantities")
    .select("id, node_id, unit_type_id, allowed_qty, alert_threshold_pct, alert_threshold_abs, unit_types(code, description)")
    .eq("node_id", nodeId);
  if (error){
    toast("Allowed qty error", error.message);
    return;
  }
  state.allowedQuantities = (data || []).map((row) => ({
    id: row.id,
    node_id: row.node_id,
    unit_type_id: row.unit_type_id,
    unit_code: row.unit_types?.code || "-",
    unit_description: row.unit_types?.description || "",
    allowed_qty: row.allowed_qty,
    alert_threshold_pct: row.alert_threshold_pct,
    alert_threshold_abs: row.alert_threshold_abs,
  }));
}

async function loadMaterialCatalog(){
  if (isDemo){
    state.materialCatalog = state.demo.materialCatalog || [];
    return;
  }
  const { data, error } = await state.client
    .from("material_catalog")
    .select("id, millennium_part, mfg_sku, description, photo_url")
    .eq("active", true)
    .order("millennium_part");
  if (error){
    toast("Catalog error", error.message);
    return;
  }
  state.materialCatalog = data || [];
}

async function loadAlerts(nodeId){
  if (isDemo){
    state.alerts = (state.demo.alerts || []).filter(a => !nodeId || a.node_id === nodeId);
    updateAlertsBadge();
    return;
  }
  let query = state.client
    .from("alerts")
    .select("id, node_id, unit_type_id, allowed_qty, used_qty, remaining_qty, message, severity, status, created_at, unit_types(code)")
    .order("created_at", { ascending: false });
  if (nodeId){
    query = query.eq("node_id", nodeId);
  }
  const { data, error } = await query;
  if (error){
    toast("Alerts error", error.message);
    return;
  }
  state.alerts = data || [];
  updateAlertsBadge();
}

async function loadWorkCodes(){
  if (isDemo){
    state.workCodes = state.demo.workCodes || [];
    return;
  }
  const { data, error } = await state.client
    .from("work_codes")
    .select("id, code, description, unit, default_rate")
    .order("code");
  if (error){
    toast("Work codes error", error.message);
    return;
  }
  state.workCodes = data || [];
}

SpecCom.helpers.loadOrgs = async function(){
  if (isDemo){
    state.orgs = state.demo.orgs || [];
    return;
  }
  const { data, error } = await state.client
    .from("orgs")
    .select("id, name, role")
    .order("name");
  if (error){
    toast("Orgs error", error.message);
    return;
  }
  state.orgs = data || [];
};

async function loadRateCards(projectId){
  if (isDemo){
    state.rateCards = state.demo.rateCards || [];
    return;
  }
  let query = state.client
    .from("rate_cards")
    .select("id, name, project_id")
    .order("created_at", { ascending: false });
  if (projectId){
    query = query.or(`project_id.eq.${projectId},project_id.is.null`);
  }
  const { data, error } = await query;
  if (error){
    toast("Rate cards error", error.message);
    return;
  }
  state.rateCards = data || [];
  const roleCode = getRoleCode();
  const roleCardName = (roleCode === ROLES.USER_LEVEL_1)
    ? "USER_LEVEL_1"
    : (roleCode === ROLES.USER_LEVEL_2)
      ? "USER_LEVEL_2"
      : (roleCode === ROLES.OWNER || SpecCom.helpers.isRoot())
        ? "OWNER"
        : null;
  if (roleCardName){
    const roleCard = state.rateCards.find(r => r.name === roleCardName);
    if (roleCard) state.activeRateCardId = roleCard.id;
  }
  if (DEFAULT_RATE_CARD_NAME){
    const named = state.rateCards.find(r => r.name === DEFAULT_RATE_CARD_NAME);
    if (named) state.activeRateCardId = named.id;
  }
  if (!state.activeRateCardId && state.rateCards.length){
    state.activeRateCardId = state.rateCards[0].id;
  } else if (state.activeRateCardId){
    const exists = state.rateCards.find(r => r.id === state.activeRateCardId);
    if (!exists && state.rateCards.length){
      state.activeRateCardId = state.rateCards[0].id;
    }
  }
  if (state.activeRateCardId){
    await loadRateCardItems(state.activeRateCardId);
  }
}

async function loadRateCardItems(rateCardId){
  if (!rateCardId) {
    state.rateCardItems = [];
    return;
  }
  if (isDemo){
    state.rateCardItems = (state.demo.rateCardItems || []).filter(r => r.rate_card_id === rateCardId);
    return;
  }
  const { data, error } = await state.client
    .from("rate_card_items")
    .select("id, rate_card_id, work_code_id, rate")
    .eq("rate_card_id", rateCardId);
  if (error){
    toast("Rate card items error", error.message);
    return;
  }
  state.rateCardItems = data || [];
}

async function loadLocationProofRequirements(projectId){
  if (isDemo){
    state.locationProofRules = state.demo.locationProofRules || [];
    return;
  }
  if (!projectId){
    state.locationProofRules = [];
    return;
  }
  const { data, error } = await state.client
    .from("location_proof_requirements")
    .select("id, project_id, location_type, required_photos, enforce_geofence")
    .eq("project_id", projectId);
  if (error){
    toast("Proof rules error", error.message);
    return;
  }
  state.locationProofRules = data || [];
}

async function loadNodeProofStatus(nodeId){
  if (!nodeId || isDemo) return;
  const { data, error } = await state.client
    .rpc("node_proof_status", { p_node_id: nodeId });
  if (error){
    toast("Proof status error", error.message);
    return;
  }
  state.nodeProofStatus = data || null;
  renderBackfillPanel();
}

async function loadOwnerOverrides(nodeId){
  if (!nodeId || isDemo) return;
  const { data, error } = await state.client
    .from("owner_overrides")
    .select("id, override_type, reason, created_at, node_id, invoice_id")
    .eq("node_id", nodeId)
    .order("created_at", { ascending: false });
  if (error){
    toast("Overrides load error", error.message);
    return;
  }
  state.ownerOverrides = data || [];
}

async function loadBillingLocations(projectId){
  if (!projectId){
    state.billingLocations = [];
    renderBillingLocations();
    return;
  }
  if (isDemo){
    const rows = Object.values(state.demo.nodes || {}).flatMap(node => (node.splice_locations || []).map((loc) => ({
      id: loc.id,
      node_id: node.id,
      label: loc.label ?? null,
      location_label: loc.location_label || loc.name,
      completed: loc.completed,
      terminal_ports: loc.terminal_ports,
      photo_count: getLocationProofUploaded(loc),
      node_number: node.node_number,
      invoice_status: "draft",
    })));
    state.billingLocations = rows;
    state.locationWorkCodes = new Map();
    renderBillingLocations();
    return;
  }
  if (!state.client) return;
  const { data: locs, error: locErr } = await state.client
    .from("splice_locations")
    .select("id, node_id, label, location_label, completed, terminal_ports, sort_order, nodes!inner(project_id,node_number)")
    .eq("nodes.project_id", projectId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (locErr){
    toast("Locations load error", locErr.message);
    return;
  }
  const locationIds = (locs || []).map(l => l.id);
  let counts = new Map();
  let invoiceStatus = new Map();
  let invoiceIdsByLocation = new Map();
  let proofRequiredByLocation = new Map();
  let proofUploadedByLocation = new Map();
  if (locationIds.length){
    const { data: photos, error: photoErr } = await state.client
      .from("splice_location_photos")
      .select("splice_location_id")
      .in("splice_location_id", locationIds);
    if (photoErr){
      toast("Proof load error", photoErr.message);
    } else {
      (photos || []).forEach((row) => {
        counts.set(row.splice_location_id, (counts.get(row.splice_location_id) || 0) + 1);
      });
    }
    const { data: proofRows, error: proofErr } = await state.client
      .from("location_proof_status")
      .select("location_id, proof_required, proof_uploaded")
      .in("location_id", locationIds);
    if (!proofErr){
      (proofRows || []).forEach((row) => {
        proofRequiredByLocation.set(row.location_id, Number(row.proof_required || 0));
        proofUploadedByLocation.set(row.location_id, Number(row.proof_uploaded || 0));
      });
    }
    const { data: invoices } = await state.client
      .from("invoices")
      .select("id, location_id, status")
      .in("location_id", locationIds);
    (invoices || []).forEach((row) => {
      if (row.location_id) invoiceStatus.set(row.location_id, row.status);
      if (row.location_id && row.id) invoiceIdsByLocation.set(row.location_id, row.id);
    });

    const invoiceIds = Array.from(invoiceIdsByLocation.values());
    if (invoiceIds.length){
      const locationByInvoice = new Map();
      invoiceIdsByLocation.forEach((invId, locId) => {
        locationByInvoice.set(invId, locId);
      });
      const { data: items } = await state.client
        .from("invoice_items")
        .select("invoice_id, work_codes(code)")
        .in("invoice_id", invoiceIds);
      const codeMap = new Map();
      (items || []).forEach((row) => {
        const code = row.work_codes?.code;
        if (!code) return;
        const locId = locationByInvoice.get(row.invoice_id);
        if (!locId) return;
        if (!codeMap.has(locId)) codeMap.set(locId, new Set());
        codeMap.get(locId).add(code);
      });
      state.locationWorkCodes = codeMap;
    } else {
      state.locationWorkCodes = new Map();
    }
  }
  state.billingLocations = (locs || []).map((loc) => ({
    id: loc.id,
    node_id: loc.node_id,
    label: loc.label ?? null,
    location_label: loc.location_label,
    completed: loc.completed,
    terminal_ports: normalizeTerminalPorts(loc.terminal_ports ?? DEFAULT_TERMINAL_PORTS),
    photo_count: proofUploadedByLocation.get(loc.id) ?? counts.get(loc.id) ?? 0,
    proof_required: proofRequiredByLocation.get(loc.id),
    node_number: loc.nodes?.node_number || "",
    invoice_status: invoiceStatus.get(loc.id) || "draft",
  }));
  if (state.billingLocation){
    const updated = state.billingLocations.find(l => l.id === state.billingLocation.id);
    if (updated) state.billingLocation = updated;
  }
  renderBillingLocations();
}

function setActiveProjectById(id){
  const next = state.projects.find(p => p.id === id) || null;
  state.activeProject = next;
  state.mapFilters.search = "";
  const mapSearch = $("mapSearch");
  if (mapSearch) mapSearch.value = "";
  state.map.searchJumpKey = "";
  setSiteSearchBanner("");
  saveCurrentProjectPreference(next?.id || null);
  renderProjects();
  loadProjectNodes(state.activeProject?.id || null);
  loadProjectSites(state.activeProject?.id || null);
  state.activeSite = null;
  renderSitePanel();
  loadRateCards(state.activeProject?.id || null);
  loadLocationProofRequirements(state.activeProject?.id || null);
  loadBillingLocations(state.activeProject?.id || null);
  SpecCom.helpers.loadYourInvoices(state.activeProject?.id || null);
  state.billingLocation = null;
  state.billingInvoice = null;
  state.billingItems = [];
  renderBillingDetail();
  const activeViewId = document.querySelector(".view.active")?.id || null;
  if (activeViewId === "viewTechnician" && state.features.labor){
    loadTechnicianTimesheet();
  }
  if (activeViewId === "viewLabor" && state.features.labor){
    loadLaborRows();
  }
  if (activeViewId === "viewDispatch" && state.features.dispatch){
    loadDispatchTechnicians();
    loadDispatchWorkOrders();
  }
}

async function saveCurrentProjectPreference(projectId){
  setSavedProjectPreference(projectId);
  if (!state.client || !state.user || isDemo) return;
  try{
    const { error } = await state.client
      .from("profiles")
      .update({ current_project_id: projectId })
      .eq("id", state.user.id);
    if (!error && state.profile){
      state.profile.current_project_id = projectId;
      window.currentUserProfile = state.profile;
    }
  } catch {}
}

function canSeedDemo(){
  const roleCode = getRoleCode();
  return SpecCom.helpers.isRoot() || roleCode === "ADMIN" || roleCode === "PROJECT_MANAGER" || roleCode === "SUPPORT";
}

async function seedDemoNode(){
  toast("Demo disabled", "Demo mode is disabled in LIVE mode.");
}

function renderLocations(){
  const wrap = $("locations");
  wrap.innerHTML = "";
  const node = state.activeNode;
  if (!node){
    wrap.innerHTML = `<div class="muted small">${t("openNodePrompt")}</div>`;
    return;
  }

  const rows = getSortedSpliceLocations(node);
  if (!rows.length){
    wrap.innerHTML = `<div class="muted small">${t("noLocationsYet")} ${t("addSpliceLocation")}.</div>`;
    return;
  }

  const list = document.createElement("div");
  list.className = "location-list";
  rows.forEach((r, index) => {
    r.terminal_ports = normalizeTerminalPorts(r.terminal_ports ?? DEFAULT_TERMINAL_PORTS);
    r.photosBySlot = r.photosBySlot || {};
    r.work_codes = Array.isArray(r.work_codes) ? r.work_codes : [];
    r.work_description = r.work_description || "";
    r.isEditingName = Boolean(r.isEditingName);
    r.isEditingPorts = Boolean(r.isEditingPorts);
    r.isEditingCodes = Boolean(r.isEditingCodes);
    r.isDeleting = Boolean(r.isDeleting);
    const activePorts = normalizeTerminalPorts(r.isEditingPorts ? (r.pending_ports ?? r.terminal_ports) : r.terminal_ports);
    const portValue = [2, 4, 6, 8].includes(activePorts) ? String(activePorts) : "custom";
    const customValue = portValue === "custom" ? activePorts : "";
    const customStyle = portValue === "custom" ? "" : 'style="display:none;"';
    const counts = countRequiredSlotUploads(r);
    const missing = SpecCom.helpers.isRoot() ? false : counts.uploaded < counts.required;
    const disableToggle = r.isDeleting || (!r.completed && missing);
    const billingLocked = isLocationBillingLocked(r.id);
    if (billingLocked && r.isEditingName) r.isEditingName = false;
    if (billingLocked && r.isEditingPorts) r.isEditingPorts = false;
    const displayName = getSpliceLocationDisplayName(r, index);
    const inputValue = r.pending_label ?? (r.label ?? "");
    const canDelete = SpecCom.helpers.isRoot() || (BUILD_MODE ? true : getRoleCode() === "ADMIN");
    const disableActions = r.isDeleting;
    const nameHtml = r.isEditingName
      ? `
        <div class="field-stack" style="gap:6px;">
          <input class="input compact" data-action="nameInput" data-id="${r.id}" value="${escapeHtml(inputValue)}" ${billingLocked ? "disabled" : ""} data-autofocus="true" />
          <div class="muted small">Optional label (e.g., "MST-3 / East Pedestal").</div>
          <div class="row" style="justify-content:flex-end;">
            <button class="btn ghost small" data-action="cancelName" data-id="${r.id}" ${disableActions ? "disabled" : ""}>Cancel</button>
            <button class="btn secondary small" data-action="saveName" data-id="${r.id}" ${billingLocked || disableActions ? "disabled" : ""}>Save</button>
          </div>
        </div>
      `
      : `<div style="font-weight:900">${escapeHtml(displayName)}</div>`;
    const workCodes = state.locationWorkCodes?.get(r.id);
    const workCodesLabel = workCodes && workCodes.size ? Array.from(workCodes).join(", ") : "None";
    const done = SINGLE_PROOF_PHOTO_MODE
      ? ""
      : (r.completed ? '<span class="pill-ok">COMPLETE</span>' : '<span class="pill-warn">INCOMPLETE</span>');
    const demoAttrs = isDemoUser() ? `disabled title="${t("availableInProduction")}"` : "";
    const editNameBtn = r.isEditingName
      ? ""
      : `<button class="btn ghost small" data-action="editName" data-id="${r.id}" ${billingLocked || disableActions ? "disabled" : ""}>Edit name</button>`;
    const deleteBtn = canDelete && !r.isEditingPorts
      ? `<button class="btn danger small" data-action="deleteLocation" data-id="${r.id}" ${disableActions ? "disabled" : ""} ${demoAttrs}>${r.isDeleting ? "Deleting..." : "Delete location"}</button>`
      : "";

    const card = document.createElement("div");
    card.className = "card location-card";
    card.innerHTML = `
      <div class="row" style="justify-content:space-between;">
        <div>
          ${nameHtml}
          <div class="muted small">${escapeHtml(r.id)}</div>
          ${SINGLE_PROOF_PHOTO_MODE ? "" : `<div class="muted small">Photos uploaded: <b>${counts.uploaded}/${FIXED_LOCATION_PHOTO_SLOTS}</b></div>`}
          <div class="muted small">Work codes logged here: <b>${escapeHtml(workCodesLabel)}</b></div>
        </div>
        <div>
          ${done ? `<div style="display:flex; justify-content:flex-end;">${done}</div>` : ""}
          <div class="row" style="justify-content:flex-end; margin-top:6px;">
            ${editNameBtn}
          </div>
        </div>
      </div>
      <div class="hr"></div>
      ${r.isEditingPorts ? `
        <div class="row" style="align-items:flex-end;">
          <div class="muted small">Terminal ports</div>
          <select class="input" data-action="portsSelect" data-id="${r.id}" style="width:140px; flex:0 0 auto;">
            <option value="2" ${portValue === "2" ? "selected" : ""}>2</option>
            <option value="4" ${portValue === "4" ? "selected" : ""}>4</option>
            <option value="6" ${portValue === "6" ? "selected" : ""}>6</option>
            <option value="8" ${portValue === "8" ? "selected" : ""}>8</option>
            <option value="custom" ${portValue === "custom" ? "selected" : ""}>Custom</option>
          </select>
          <input class="input" type="number" min="1" max="8" step="1" data-action="portsCustom" data-id="${r.id}" value="${customValue}" ${customStyle} style="width:120px; flex:0 0 auto;" />
          ${SINGLE_PROOF_PHOTO_MODE ? "" : `<div class="muted small">Photo slots available: ${FIXED_LOCATION_PHOTO_SLOTS} per location.</div>`}
        </div>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn ghost" data-action="cancelPorts" data-id="${r.id}" ${disableActions ? "disabled" : ""}>Cancel</button>
          <button class="btn secondary" data-action="savePorts" data-id="${r.id}" ${disableActions ? "disabled" : ""}>Save ports</button>
        </div>
        ${SINGLE_PROOF_PHOTO_MODE ? "" : '<div class="muted small">Photo slots stay fixed at 8.</div>'}
      ` : `
        <div class="row" style="align-items:center; justify-content:space-between;">
          <div class="muted small">Ports required: <b>${activePorts}</b></div>
          <div class="row" style="justify-content:flex-end;">
            <button class="btn ghost" data-action="editPorts" data-id="${r.id}" ${billingLocked || disableActions ? "disabled" : ""}>Edit ports</button>
            ${deleteBtn}
          </div>
        </div>
      `}
      <div class="hr"></div>
      ${renderSplicePhotoGrid(r)}
      <div class="hr"></div>
      ${renderCodesSection(r)}
      <div class="hr"></div>
      <div class="row">
        <button class="btn ghost" data-action="toggleComplete" data-id="${r.id}" ${disableToggle ? "disabled" : ""}>${r.completed ? "Undo complete" : "Mark complete"}</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.addEventListener("change", async (e) => {
    const target = e.target;
    if (!target) return;
    if (target.matches('input[type="file"][data-slot-key]')){
      const locId = target.dataset.locationId;
      const slotKey = target.dataset.slotKey;
      const file = target.files?.[0];
      await handleSpliceSlotPhotoUpload(locId, slotKey, file);
      target.value = "";
      return;
    }
    if (target.dataset.action === "nameInput"){
      const loc = node.splice_locations.find(x => x.id === target.dataset.id);
      if (!loc) return;
      loc.pending_label = target.value;
      return;
    }
    if (target.dataset.action === "portsSelect"){
      const loc = node.splice_locations.find(x => x.id === target.dataset.id);
      if (!loc) return;
      if (target.value === "custom"){
        loc.pending_ports = normalizeTerminalPorts(loc.pending_ports ?? loc.terminal_ports ?? DEFAULT_TERMINAL_PORTS);
        renderLocations();
        return;
      }
      loc.pending_ports = normalizeTerminalPorts(target.value);
      renderLocations();
      return;
    }
    if (target.dataset.action === "portsCustom"){
      const loc = node.splice_locations.find(x => x.id === target.dataset.id);
      if (!loc) return;
      const nextPorts = normalizeTerminalPorts(target.value);
      loc.pending_ports = nextPorts;
      target.value = String(nextPorts);
    }
  });

  list.addEventListener("click", async (e) => {
    const openPhoto = e.target.closest("[data-action='openSlotPhoto']");
    if (openPhoto){
      e.preventDefault();
      e.stopPropagation();
      const url = openPhoto.dataset.url;
      if (url) window.open(url, "_blank", "noopener");
      return;
    }
    const retakeBtn = e.target.closest("[data-action='retakeSlotPhoto']");
    if (retakeBtn){
      e.preventDefault();
      e.stopPropagation();
      const inputId = retakeBtn.dataset.inputId;
      const input = list.querySelector(`input[type="file"][data-input-id="${inputId}"]`);
      if (input) input.click();
      return;
    }
    const btn = e.target.closest("button");
    const removeBtn = e.target.closest("[data-action='removeSlotPhoto']");
    if (removeBtn){
      e.preventDefault();
      e.stopPropagation();
      const locId = removeBtn.dataset.locationId;
      const slotKey = removeBtn.dataset.slotKey;
      await deleteSpliceSlotPhoto(locId, slotKey);
      return;
    }
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === "editName"){
      const loc = node.splice_locations.find(x => x.id === id);
      if (!loc) return;
      if (isLocationBillingLocked(loc.id)){
        toast("Billing locked", "Location name is locked after billing is ready.");
        return;
      }
      loc.isEditingName = true;
      loc.pending_label = loc.label ?? "";
      renderLocations();
      return;
    }
    if (action === "saveName"){
      const input = list.querySelector(`[data-action="nameInput"][data-id="${id}"]`);
      await saveSpliceLocationName(id, input ? input.value : "");
      return;
    }
    if (action === "cancelName"){
      cancelSpliceLocationNameEdit(id);
      return;
    }
    if (action === "deleteLocation"){
      openDeleteSpliceLocationModal(id);
      return;
    }
    if (action === "editPorts"){
      const loc = node.splice_locations.find(x => x.id === id);
      if (!loc) return;
      if (isLocationBillingLocked(loc.id)){
        toast("Billing locked", "Terminal ports are locked after billing is ready.");
        return;
      }
      loc.isEditingPorts = true;
      loc.pending_ports = loc.terminal_ports;
      renderLocations();
      return;
    }
    if (action === "cancelPorts"){
      const loc = node.splice_locations.find(x => x.id === id);
      if (!loc) return;
      loc.isEditingPorts = false;
      loc.pending_ports = null;
      renderLocations();
      return;
    }
    if (action === "savePorts"){
      const loc = node.splice_locations.find(x => x.id === id);
      if (!loc) return;
      const nextPorts = normalizeTerminalPorts(loc.pending_ports ?? loc.terminal_ports);
      const ok = await updateTerminalPorts(loc.id, nextPorts);
      if (ok){
        loc.isEditingPorts = false;
        loc.pending_ports = null;
        renderLocations();
      }
      return;
    }
    if (action === "editCodes"){
      const loc = node.splice_locations.find(x => x.id === id);
      if (!loc) return;
      loc.isEditingCodes = true;
      loc.pending_work_codes = Array.isArray(loc.work_codes) ? [...loc.work_codes] : [];
      loc.pending_work_description = loc.work_description || "";
      renderLocations();
      return;
    }
    if (action === "cancelCodes"){
      const loc = node.splice_locations.find(x => x.id === id);
      if (!loc) return;
      loc.isEditingCodes = false;
      loc.pending_work_codes = null;
      loc.pending_work_description = null;
      renderLocations();
      return;
    }
    if (action === "saveCodes"){
      const loc = node.splice_locations.find(x => x.id === id);
      if (!loc) return;
      const codesInput = list.querySelector(`[data-action="codesInput"][data-location-id="${id}"]`);
      const descInput = list.querySelector(`[data-action="descInput"][data-location-id="${id}"]`);
      const nextCodes = normalizeWorkCodes(codesInput?.value || "");
      const nextDesc = String(descInput?.value || "").trim();
      const ok = await updateSpliceLocationCodes(id, nextCodes, nextDesc);
      if (ok){
        loc.isEditingCodes = false;
        loc.pending_work_codes = null;
        loc.pending_work_description = null;
        renderLocations();
      }
      return;
    }
    if (action === "toggleComplete"){
      const loc = node.splice_locations.find(x => x.id === id);
      if (!loc) return;
      if (!hasAllRequiredSlotPhotos(loc)){
        toast("Photos required", "All required splice photos are needed before completion.");
        return;
      }
      const next = !loc.completed;
      if (isDemo){
        loc.completed = next;
        renderLocations();
        updateKPI();
        renderProofChecklist();
        return;
      }
      const { error } = await state.client
        .from("splice_locations")
        .update({ completed: next, completed_by: state.user?.id || null })
        .eq("id", loc.id);
      if (error){
        toast("Update failed", error.message);
        return;
      }
      loc.completed = next;
      renderLocations();
      updateKPI();
      renderProofChecklist();
    }
  });

  wrap.appendChild(list);

  const nameInput = wrap.querySelector("[data-autofocus='true']");
  if (nameInput){
    setTimeout(() => {
      nameInput.focus();
      nameInput.select();
    }, 0);
    nameInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter"){
        e.preventDefault();
        await saveSpliceLocationName(nameInput.dataset.id, nameInput.value);
      }
      if (e.key === "Escape"){
        e.preventDefault();
        cancelSpliceLocationNameEdit(nameInput.dataset.id);
      }
    });
  }
}

function renderSplicePhotoGrid(loc){
  const requiredSlots = getRequiredSlotsForLocation(loc);
  const photos = loc.photosBySlot || {};
  const extraSlots = Object.keys(photos).filter((slot) => !requiredSlots.includes(slot));
  const orderedExtras = extraSlots.sort((a, b) => {
    const aNum = Number.parseInt(String(a).replace("port_", ""), 10);
    const bNum = Number.parseInt(String(b).replace("port_", ""), 10);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
    return String(a).localeCompare(String(b));
  });
  const slots = requiredSlots.concat(orderedExtras);
  return `
    <div class="photo-grid">
      ${slots.map((slotKey) => renderSpliceSlotCard(loc, slotKey, requiredSlots.includes(slotKey))).join("")}
    </div>
  `;
}

function getSlotInputId(locId, slotKey){
  return `slot-${String(locId || "").replace(/[^a-zA-Z0-9_-]/g, "_")}-${String(slotKey || "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function renderSpliceSlotCard(loc, slotKey, isRequired){
  const photo = loc.photosBySlot?.[slotKey];
  const label = getSlotLabel(slotKey);
  const badge = isRequired ? "" : '<span class="slot-badge">Extra</span>';
  const timestamp = photo?.taken_at ? new Date(photo.taken_at).toLocaleString() : "";
  const locked = isLocationBillingLocked(loc.id);
  const demoLocked = isDemoUser();
  const demoAttrs = demoLocked ? `disabled title="${t("availableInProduction")}"` : "";
  const thumbUrl = photo?.previewUrl || "";
  const thumb = thumbUrl
    ? `<img class="photo-thumb" src="${thumbUrl}" alt="${escapeHtml(label)} photo" data-action="openSlotPhoto" data-url="${thumbUrl}"/>`
    : photo
      ? `<div class="muted small">Photo captured</div>`
      : "";
  const placeholder = `
    <div class="slot-placeholder">
      <div class="camera-icon" aria-hidden="true"></div>
      <div class="muted small">Tap to capture</div>
    </div>
  `;
  const inputId = getSlotInputId(loc.id, slotKey);
  const inputEl = `<input id="${inputId}" class="file-input-hidden" type="file" accept="image/*" capture="environment" data-location-id="${loc.id}" data-slot-key="${slotKey}" data-input-id="${inputId}" />`;
  if (!photo){
    return `
      <label class="photo-slot ${isRequired ? "" : "extra"}" for="${inputId}">
        ${inputEl}
        <div class="row" style="justify-content:space-between; width:100%;">
          <div class="slot-title">${escapeHtml(label)}</div>
          ${badge}
        </div>
        ${placeholder}
      </label>
    `;
  }
  return `
    <div class="photo-slot ${isRequired ? "" : "extra"}">
      ${inputEl}
      <div class="row" style="justify-content:space-between; width:100%;">
        <div class="slot-title">${escapeHtml(label)}</div>
        ${badge}
      </div>
      ${thumb}
      <div class="slot-meta">${timestamp || "Timestamp pending"}</div>
      <div class="row" style="justify-content:flex-end; width:100%;">
        ${locked ? "" : `<button type="button" class="btn ghost small" data-action="retakeSlotPhoto" data-input-id="${inputId}" ${demoAttrs}>Upload / Retake</button>`}
        ${locked ? "" : `<button type="button" class="btn ghost small" data-action="removeSlotPhoto" data-location-id="${loc.id}" data-slot-key="${slotKey}" ${demoAttrs}>Remove</button>`}
      </div>
    </div>
  `;
}

async function updateTerminalPorts(locationId, nextPorts){
  const node = state.activeNode;
  if (!node) return false;
  const loc = node.splice_locations.find(x => x.id === locationId);
  if (!loc) return false;
  if (isLocationBillingLocked(loc.id)){
    toast("Billing locked", "Terminal ports are locked after billing is ready.");
    return false;
  }
  const normalized = normalizeTerminalPorts(nextPorts);
  if (normalized === loc.terminal_ports) return true;
  if (isDemo){
    loc.terminal_ports = normalized;
    renderLocations();
    renderProofChecklist();
    toast("Ports saved", `Terminal ports set to ${normalized}.`);
    return true;
  }
  const { error } = await state.client
    .from("splice_locations")
    .update({ terminal_ports: normalized })
    .eq("id", loc.id);
  if (error){
    toast("Update failed", error.message);
    return false;
  }
  loc.terminal_ports = normalized;
  renderLocations();
  renderProofChecklist();
  toast("Ports saved", `Terminal ports set to ${normalized}.`);
  return true;
}

function cancelSpliceLocationNameEdit(locationId){
  const node = state.activeNode;
  if (!node) return;
  const loc = node.splice_locations.find(x => x.id === locationId);
  if (!loc) return;
  loc.isEditingName = false;
  loc.pending_label = null;
  renderLocations();
}

async function saveSpliceLocationName(locationId, nextName){
  const node = state.activeNode;
  if (!node) return;
  const loc = node.splice_locations.find(x => x.id === locationId);
  if (!loc) return;
  if (isLocationBillingLocked(loc.id)){
    toast("Billing locked", "Location name is locked after billing is ready.");
    loc.isEditingName = false;
    loc.pending_label = null;
    renderLocations();
    return;
  }
  const trimmed = String(nextName || "").trim();
  const currentLabel = String(loc.label || "").trim();
  if (trimmed === currentLabel){
    loc.isEditingName = false;
    loc.pending_label = null;
    renderLocations();
    return;
  }
  const ordered = getSortedSpliceLocations(node);
  const index = ordered.findIndex((row) => row.id === loc.id);
  const fallbackName = getSpliceLocationDefaultName(index);
  const nextLabel = trimmed || null;
  const nextLegacyLabel = trimmed || fallbackName;
  if (isDemo){
    loc.label = nextLabel;
    loc.location_label = nextLegacyLabel;
    loc.isEditingName = false;
    loc.pending_label = null;
    renderLocations();
    return;
  }
  const { error } = await state.client
    .from("splice_locations")
    .update({ label: nextLabel, location_label: nextLegacyLabel })
    .eq("id", loc.id);
  if (error){
    toast("Rename failed", error.message);
    return;
  }
  loc.label = nextLabel;
  loc.location_label = nextLegacyLabel;
  loc.isEditingName = false;
  loc.pending_label = null;
  renderLocations();
}

async function updateSpliceLocationCodes(locationId, workCodes, workDescription){
  const node = state.activeNode;
  if (!node) return false;
  const loc = node.splice_locations.find(x => x.id === locationId);
  if (!loc) return false;
  if (isDemo){
    loc.work_codes = Array.isArray(workCodes) ? workCodes : [];
    loc.work_description = workDescription || "";
    toast("Saved", "Codes and description updated.");
    return true;
  }
  const { error } = await state.client
    .from("splice_locations")
    .update({
      work_codes: Array.isArray(workCodes) ? workCodes : [],
      work_description: workDescription || "",
    })
    .eq("id", locationId);
  if (error){
    toast("Save failed", error.message);
    return false;
  }
  loc.work_codes = Array.isArray(workCodes) ? workCodes : [];
  loc.work_description = workDescription || "";
  toast("Saved", "Codes and description updated.");
  return true;
}

let deleteSpliceModalState = { locationId: null };

function ensureDeleteSpliceModal(){
  let modal = document.getElementById("deleteSpliceModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "deleteSpliceModal";
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">Delete splice location?</div>
      <div class="modal-body">This removes this location and all photos. This cannot be undone.</div>
      <input id="deleteSpliceConfirmInput" class="input compact" placeholder="Type DELETE to confirm" />
      <div class="modal-actions">
        <button class="btn ghost" data-action="cancel">Cancel</button>
        <button class="btn danger" data-action="confirm" disabled>Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const input = modal.querySelector("#deleteSpliceConfirmInput");
  const cancelBtn = modal.querySelector("[data-action='cancel']");
  const confirmBtn = modal.querySelector("[data-action='confirm']");

  const updateState = () => {
    confirmBtn.disabled = input.value.trim() !== "DELETE";
  };

  input.addEventListener("input", updateState);
  cancelBtn.addEventListener("click", () => closeDeleteSpliceModal());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeDeleteSpliceModal();
  });
  confirmBtn.addEventListener("click", async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    const prior = confirmBtn.textContent;
    confirmBtn.textContent = "Deleting...";
    const ok = await deleteSpliceLocation(deleteSpliceModalState.locationId, { skipConfirm: true });
    confirmBtn.textContent = prior;
    updateState();
    if (ok) closeDeleteSpliceModal();
  });
  updateState();
  return modal;
}

function openDeleteSpliceLocationModal(locationId){
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const node = state.activeNode;
  if (!node) return;
  const canDelete = SpecCom.helpers.isRoot() || (BUILD_MODE ? true : getRoleCode() === "ADMIN");
  if (!canDelete){
    toast("Not allowed", "Only Admin can delete locations.");
    return;
  }
  const modal = ensureDeleteSpliceModal();
  deleteSpliceModalState.locationId = locationId;
  const input = modal.querySelector("#deleteSpliceConfirmInput");
  const confirmBtn = modal.querySelector("[data-action='confirm']");
  input.value = "";
  confirmBtn.disabled = true;
  modal.classList.add("show");
  setTimeout(() => input.focus(), 0);
}

function closeDeleteSpliceModal(){
  const modal = document.getElementById("deleteSpliceModal");
  if (!modal) return;
  modal.classList.remove("show");
  deleteSpliceModalState.locationId = null;
}

async function deleteSpliceLocation(locationId, options = {}){
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return false;
  }
  const node = state.activeNode;
  if (!node) return false;
  const loc = node.splice_locations.find(l => l.id === locationId);
  if (!loc) return false;
  const canDelete = SpecCom.helpers.isRoot() || (BUILD_MODE ? true : getRoleCode() === "ADMIN");
  if (!canDelete){
    toast("Not allowed", "Only Admin can delete locations.");
    return false;
  }
  if (loc.isDeleting) return false;
  if (!options.skipConfirm){
    const confirmText = "Delete splice location?\nThis will remove the splice location and all its photos. This cannot be undone.";
    if (!confirm(confirmText)) return false;
    const typed = prompt("Type DELETE to confirm.");
    if (typed !== "DELETE"){
      toast("Delete canceled", "Type DELETE to confirm.");
      return false;
    }
  }

  loc.isDeleting = true;
  renderLocations();

  if (isDemo){
    node.splice_locations = (node.splice_locations || []).filter(l => l.id !== loc.id);
    if (state.billingLocation?.id === loc.id){
      state.billingLocation = null;
      renderBillingDetail();
    }
    renderLocations();
    updateKPI();
    renderProofChecklist();
    await loadBillingLocations(state.activeProject?.id || null);
    toast("Deleted", "Splice location deleted.");
    return true;
  }

  const { data: photos, error: photoErr } = await state.client
    .from("splice_location_photos")
    .select("photo_path")
    .eq("splice_location_id", loc.id);
  if (photoErr){
    toast("Delete failed", photoErr.message);
    loc.isDeleting = false;
    renderLocations();
    return false;
  }

  const photoPaths = (photos || []).map(row => row.photo_path).filter(Boolean);
  if (photoPaths.length){
    const { error: storageErr } = await state.client
      .storage
      .from("proof-photos")
      .remove(photoPaths);
    if (storageErr){
      toast("Storage cleanup failed", storageErr.message);
    }
  }

  const { error: deletePhotosErr } = await state.client
    .from("splice_location_photos")
    .delete()
    .eq("splice_location_id", loc.id);
  if (deletePhotosErr){
    toast("Delete failed", deletePhotosErr.message);
    loc.isDeleting = false;
    renderLocations();
    return false;
  }

  const { error: deleteLocErr } = await state.client
    .from("splice_locations")
    .delete()
    .eq("id", loc.id);
  if (deleteLocErr){
    toast("Delete failed", deleteLocErr.message);
    loc.isDeleting = false;
    renderLocations();
    return false;
  }

  node.splice_locations = (node.splice_locations || []).filter(l => l.id !== loc.id);
  if (state.billingLocation?.id === loc.id){
    state.billingLocation = null;
    renderBillingDetail();
  }
  renderLocations();
  updateKPI();
  renderProofChecklist();
  await loadBillingLocations(state.activeProject?.id || null);
  toast("Deleted", "Splice location deleted.");
  return true;
}

async function handleSpliceSlotPhotoUpload(locationId, slotKey, file){
  const node = state.activeNode;
  if (!node) return;
  if (!file){
    toast("Choose a photo", "Pick a photo file first.");
    return;
  }
  const loc = node.splice_locations.find(l => l.id === locationId);
  if (!loc){
    toast("Location missing", "Splice location not found.");
    return;
  }
  if (isLocationBillingLocked(loc.id)){
    toast("Billing locked", "Photos are locked after billing is ready.");
    return;
  }
  const takenAt = nowISO();
  const previewUrl = URL.createObjectURL(file);
  loc.photosBySlot = loc.photosBySlot || {};
  loc.photosBySlot[slotKey] = { previewUrl, taken_at: takenAt, pending: true };
  renderLocations();
  renderProofChecklist();

  if (isDemo){
    loc.photosBySlot[slotKey] = { previewUrl, taken_at: takenAt };
    renderLocations();
    renderProofChecklist();
    return;
  }

  const uploadPath = await uploadProofPhoto(file, node.id, `splice-location/${locationId}`);
  if (!uploadPath){
    delete loc.photosBySlot[slotKey];
    renderLocations();
    renderProofChecklist();
    return;
  }

  const gps = state.lastGPS;
  const { data, error } = await state.client
    .from("splice_location_photos")
    .upsert({
      splice_location_id: loc.id,
      slot_key: slotKey,
      photo_path: uploadPath,
      taken_at: takenAt,
      gps_lat: gps?.lat ?? null,
      gps_lng: gps?.lng ?? null,
      gps_accuracy_m: gps?.accuracy_m ?? null,
      uploaded_by: state.user?.id || null,
    }, { onConflict: "splice_location_id,slot_key" })
    .select("photo_path, taken_at, gps_lat, gps_lng, gps_accuracy_m")
    .maybeSingle();

  if (error){
    delete loc.photosBySlot[slotKey];
    renderLocations();
    renderProofChecklist();
    toast("Upload failed", error.message);
    return;
  }

  loc.photosBySlot[slotKey] = {
    path: data?.photo_path || uploadPath,
    taken_at: data?.taken_at || takenAt,
    gps: data?.gps_lat != null && data?.gps_lng != null
      ? { lat: data.gps_lat, lng: data.gps_lng, accuracy_m: data.gps_accuracy_m }
      : null,
    previewUrl,
  };
  await loadSplicePhotos(node.id, [loc]);
  renderLocations();
  renderProofChecklist();
}

async function deleteSpliceSlotPhoto(locationId, slotKey){
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const node = state.activeNode;
  if (!node) return;
  const loc = node.splice_locations.find(l => l.id === locationId);
  if (!loc) return;
  if (isLocationBillingLocked(loc.id)){
    toast("Billing locked", "Photos are locked after billing is ready.");
    return;
  }
  const existing = loc.photosBySlot?.[slotKey];
  if (!existing){
    toast("No photo", "No photo found for this slot.");
    return;
  }
  if (isDemo){
    delete loc.photosBySlot[slotKey];
    renderLocations();
    renderProofChecklist();
    return;
  }

  const path = existing.path || existing.photo_path;
  if (path){
    const { error: storageErr } = await state.client
      .storage
      .from("proof-photos")
      .remove([path]);
    if (storageErr){
      toast("Remove failed", storageErr.message);
    }
  }

  const { error } = await state.client
    .from("splice_location_photos")
    .delete()
    .eq("splice_location_id", loc.id)
    .eq("slot_key", slotKey);
  if (error){
    toast("Remove failed", error.message);
    return;
  }
  delete loc.photosBySlot[slotKey];
  renderLocations();
  renderProofChecklist();
}

function renderInventory(){
  const wrap = $("inventory");
  wrap.innerHTML = "";
  const node = state.activeNode;
  if (!node){
    wrap.innerHTML = `<div class="muted small">${t("openNodePrompt")}</div>`;
    return;
  }
  const items = node.inventory_checks || [];
  if (!items.length){
    wrap.innerHTML = `<div class="muted small">${t("noInventoryItems")}</div>`;
    return;
  }

  items.forEach((it) => {
    const planned = Number.isFinite(it.planned_qty) ? it.planned_qty : (it.qty_used || 0);
    const remaining = getRemainingForItem(it);
    const usageItemId = getUsageItemId(it);
    const defaultQty = it.qty_used || 1;

    const card = document.createElement("div");
    card.className = "card";
    card.style.marginBottom = "12px";
    card.innerHTML = `
      <div class="row" style="justify-content:space-between;">
        <div>
          <div style="font-weight:900">${escapeHtml(it.item_name)}</div>
          <div class="muted small">${escapeHtml(it.item_code)}</div>
          <div class="muted small">Planned: <b>${planned}</b> | Remaining: <b>${remaining}</b></div>
          <div class="muted small">Default qty: <b>${defaultQty}</b></div>
        </div>
        <div class="row">
          <span class="chip"><span class="dot ${it.completed ? "ok" : "warn"}"></span><span>${it.completed ? "Checked" : "Pending"}</span></span>
          <input class="input" style="width:90px;" type="number" min="1" step="1" value="${defaultQty}" data-qty-for="${usageItemId}"/>
          <button class="btn secondary" data-action="submitUsage" data-id="${usageItemId}">Submit usage</button>
          <button class="btn secondary" data-action="toggleInv" data-id="${it.id}">${it.completed ? "Uncheck" : "Check"}</button>
        </div>
      </div>
      <div style="height:10px"></div>
      <img class="item-photo" src="${it.photo}" alt="item photo"/>
    `;
    card.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === "toggleInv"){
        const item = node.inventory_checks.find(x => x.id === id);
        if (!item) return;
        const next = !item.completed;
        if (isDemo){
          item.completed = next;
          renderInventory();
          updateKPI();
        } else {
          const { error } = await state.client
            .from("node_inventory")
            .update({ completed: next, completed_by: state.user?.id || null })
            .eq("id", item.id);
          if (error){
            toast("Update failed", error.message);
            return;
          }
          item.completed = next;
          renderInventory();
          updateKPI();
        }
      } else if (action === "submitUsage"){
        const qtyInput = card.querySelector(`[data-qty-for="${id}"]`);
        const qty = Number.parseInt(qtyInput?.value || "0", 10);
        submitUsage(id, qty);
      }
    });
    wrap.appendChild(card);
  });
}

function setProofStatus(){
  const el = $("photoStatus");
  const mini = $("photoStatusMini");
  if (!state.lastProof){
    if (el) el.textContent = "No photo captured";
    if (mini) mini.textContent = "No photo captured yet.";
    renderProofPreview();
    return;
  }
  const gps = state.lastProof.gps
    ? `${state.lastProof.gps.lat.toFixed(6)}, ${state.lastProof.gps.lng.toFixed(6)}`
    : "GPS missing";
  if (el) el.textContent = `Photo ready: ${state.lastProof.captured_at} (${gps})`;
  if (mini) mini.textContent = `Photo ready: ${state.lastProof.captured_at}`;
  renderProofPreview();
}

function renderProofPreview(){
  const wrap = $("photoPreview");
  if (!wrap) return;
  const items = [
    state.lastProof ? { label: "Usage photo", data: state.lastProof } : null,
  ].filter(Boolean);

  if (!items.length){
    wrap.innerHTML = '<div class="muted small">No photo captured yet.</div>';
    return;
  }

  wrap.innerHTML = items.map((item) => {
    const photoUrl = item.data.previewUrl || "";
    const gps = item.data.gps
      ? `${item.data.gps.lat.toFixed(6)}, ${item.data.gps.lng.toFixed(6)}`
      : "GPS missing";
    return `
      <div class="row" style="gap:16px; align-items:flex-start;">
        ${photoUrl ? `<img src="${photoUrl}" alt="usage photo" />` : ""}
        <div>
          <div style="font-weight:900">${item.label}</div>
          <div class="muted small">${item.data.captured_at}</div>
          <div class="muted small">${gps}</div>
        </div>
      </div>
    `;
  }).join("<div class=\"hr\"></div>");
}

function clearProof(){
  state.lastProof = null;
  state.cameraInvalidated = false;
  setProofStatus();
  renderProofPreview();
}

function clearUsageProof(){
  state.lastProof = null;
  state.cameraInvalidated = false;
  setProofStatus();
  renderProofPreview();
}

async function captureUsageProof(){
  const shot = await captureFrame();
  if (!shot) return;
  state.lastProof = {
    file: makeFileFromBlob(shot.blob),
    captured_at: shot.captured_at,
    gps: shot.gps,
    previewUrl: shot.previewUrl,
    camera: true,
  };
  setProofStatus();
}

async function uploadBackfillPhoto(file, projectId, nodeId, locationId, photoType){
  if (!state.client) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ts = Date.now();
  const root = projectId || "project";
  const path = `${root}/${nodeId}/${locationId}/${photoType}/${ts}-${safeName}`;
  const { data, error } = await state.client
    .storage
    .from("proof-photos")
    .upload(path, file, { contentType: file.type });
  if (error){
    toast("Upload failed", error.message);
    return null;
  }
  return data?.path || path;
}

async function handleBackfillPhotoUpload(photoType, file){
  const node = state.activeNode;
  const projectId = state.activeProject?.id || null;
  if (!node){
    toast("Open a site", "Select or open a site first.");
    return;
  }
  if (!isOwner()){
    toast("Not allowed", "Admin role required.");
    return;
  }
  if (!state.nodeProofStatus?.backfill_allowed){
    toast("Backfill locked", "Backfill is not enabled for this site.");
    return;
  }
  if (!file){
    toast("Choose a photo", "Pick a photo file first.");
    return;
  }
  const locId = $("backfillLocationSelect")?.value;
  if (!locId){
    toast("Location required", "Select a splice location first.");
    return;
  }
  const loc = node.splice_locations.find(l => l.id === locId);
  if (!loc){
    toast("Location missing", "Splice location not found.");
    return;
  }
  const slotKey = getBackfillSlotKey(loc, photoType);
  if (!slotKey){
    toast("Slots full", "All 8 photo slots already have photos. Use the slot grid to retake.");
    return;
  }
  const previewUrl = URL.createObjectURL(file);
  const exifTakenAt = file.lastModified ? new Date(file.lastModified).toISOString() : null;
  const takenAt = exifTakenAt || nowISO();
  loc.photosBySlot = loc.photosBySlot || {};
  loc.photosBySlot[slotKey] = { previewUrl, taken_at: takenAt, pending: true, backfilled: true };
  renderLocations();
  renderProofChecklist();

  if (isDemo){
    loc.photosBySlot[slotKey] = { previewUrl, taken_at: takenAt, backfilled: true };
    renderLocations();
    renderProofChecklist();
    return;
  }

  const uploadPath = await uploadBackfillPhoto(file, projectId, node.id, loc.id, photoType);
  if (!uploadPath){
    delete loc.photosBySlot[slotKey];
    renderLocations();
    renderProofChecklist();
    return;
  }

  const { data, error } = await state.client
    .from("splice_location_photos")
    .upsert({
      splice_location_id: loc.id,
      slot_key: slotKey,
      photo_path: uploadPath,
      taken_at: takenAt,
      uploaded_by: state.user?.id || null,
      source: "upload",
      backfilled: true,
      exif_taken_at: exifTakenAt,
    }, { onConflict: "splice_location_id,slot_key" })
    .select("photo_path, taken_at")
    .maybeSingle();

  if (error){
    delete loc.photosBySlot[slotKey];
    renderLocations();
    renderProofChecklist();
    toast("Upload failed", error.message);
    return;
  }

  loc.photosBySlot[slotKey] = {
    path: data?.photo_path || uploadPath,
    taken_at: data?.taken_at || takenAt,
    previewUrl,
    backfilled: true,
  };
  await loadNodeProofStatus(node.id);
  renderLocations();
  renderProofChecklist();
}

async function uploadProofPhoto(file, nodeId, prefix){
  if (!state.client) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const folder = `${prefix || "photos"}/node-${nodeId}`;
  const path = `${folder}/${Date.now()}-${safeName}`;
  const { data, error } = await state.client
    .storage
    .from("proof-photos")
    .upload(path, file, { contentType: file.type });
  if (error){
    toast("Upload failed", error.message);
    return null;
  }
  return data?.path || path;
}

async function recordProofUpload(payload){
  if (isDemo) return;
  if (!state.client) return;
  const { error } = await state.client.from("proof_uploads").insert({
    device_info: navigator.userAgent,
    camera: true,
    ...payload,
  });
  if (error){
    toast("Photo log failed", error.message);
  }
}

async function submitUsage(itemId, qty){
  const node = state.activeNode;
  if (!node) return;
  if (!Number.isFinite(qty) || qty <= 0){
    toast("Qty required", "Enter a valid quantity to submit.");
    return;
  }
  if (!state.lastProof?.file || !state.lastProof?.gps || !state.lastProof?.captured_at || state.cameraInvalidated){
    toast("Photos required", "Capture a live photo with GPS before submitting usage.");
    return;
  }
  if (!state.lastProof.camera){
    toast("Camera required", "Camera capture required. Gallery uploads are not allowed.");
    return;
  }
  const jobNumber = state.activeProject?.job_number;
  if (!jobNumber){
    toast("Job required", "Job number required to submit usage photos.");
    return;
  }

  const plannedItem = node.inventory_checks.find(i => getUsageItemId(i) === itemId);
  if (!plannedItem){
    toast("Item missing", "This item is no longer available.");
    return;
  }
  const unitTypeId = resolveUnitTypeIdForItem(plannedItem);
  const remaining = getRemainingForItem(plannedItem);
  const status = qty > remaining ? "needs_approval" : "approved";

  if (isDemo){
    state.demo.usageEvents.push({
      id: `use-${Date.now()}`,
      node_id: node.id,
      item_id: itemId,
      unit_type_id: unitTypeId,
      qty,
      status,
      captured_at: state.lastProof.captured_at,
      captured_at_client: state.lastProof.captured_at,
      gps_lat: state.lastProof.gps.lat,
      gps_lng: state.lastProof.gps.lng,
      gps_accuracy_m: state.lastProof.gps.accuracy_m,
      photo_path: "demo-only",
      proof_required: true,
      camera: true,
    });
    if (status === "needs_approval"){
      toast("Needs approval", "Overage submitted and pending approval.");
    } else {
      toast("Usage submitted", "Approved usage recorded.");
    }
    if (unitTypeId){
      maybeCreateDemoAlert(node.id, unitTypeId);
      state.alerts = state.demo.alerts || [];
      updateAlertsBadge();
      renderAlerts();
    }
    clearUsageProof();
    state.cameraInvalidated = false;
    renderInventory();
    renderAllowedQuantities();
    renderProofChecklist();
    return;
  }

  const uploadPath = await uploadProofPhoto(state.lastProof.file, node.id, "usage");
  if (!uploadPath) return;

  const { data, error } = await state.client
    .from("usage_events")
    .insert({
      node_id: node.id,
      item_id: itemId,
      unit_type_id: unitTypeId,
      qty,
      status,
      photo_path: uploadPath,
      captured_at_client: state.lastProof.captured_at,
      gps_lat: state.lastProof.gps.lat,
      gps_lng: state.lastProof.gps.lng,
      gps_accuracy_m: state.lastProof.gps.accuracy_m,
      proof_required: true,
      camera: true,
    })
    .select("id");

  if (error){
    toast("Usage error", error.message);
    return;
  }
  const usageId = data?.[0]?.id;
  if (usageId){
    await recordProofUpload({
      node_id: node.id,
      usage_event_id: usageId,
      photo_url: uploadPath,
      lat: state.lastProof.gps.lat,
      lng: state.lastProof.gps.lng,
      captured_at_client: state.lastProof.captured_at,
      job_number: jobNumber,
      camera: true,
      captured_by: state.user?.id || null,
    });
  }
  if (status === "needs_approval"){
    toast("Needs approval", "Overage submitted and pending approval.");
  } else {
    toast("Usage submitted", "Approved usage recorded.");
  }
  clearUsageProof();
  state.cameraInvalidated = false;
  await loadUsageEvents(node.id);
  await loadAlerts(node.id);
  renderInventory();
  renderAllowedQuantities();
  renderAlerts();
  renderProofChecklist();
}

async function loadUsageEvents(nodeId){
  if (isDemo) return;
  const { data, error } = await state.client
    .from("usage_events")
    .select("id,node_id,item_id,unit_type_id,qty,status,photo_path,gps_lat,gps_lng,captured_at_server,captured_at_client,proof_required,camera")
    .eq("node_id", nodeId);
  if (error){
    toast("Usage load error", error.message);
    return;
  }
  state.usageEvents = data || [];
}

async function loadInvoices(nodeId){
  if (isDemo) return;
  const [subRes, primeRes] = await Promise.all([
    state.client
      .from("sub_invoices")
      .select("id, invoice_number, status, total, currency")
      .eq("node_id", nodeId),
    state.client
      .from("prime_invoices")
      .select("id, invoice_number, status, total, currency")
      .eq("node_id", nodeId),
  ]);
  if (subRes.error){
    toast("Invoice load error", subRes.error.message);
  }
  if (primeRes.error){
    toast("Invoice load error", primeRes.error.message);
  }
  if (state.activeNode && state.activeNode.id === nodeId){
    state.activeNode.invoices = {
      sub: subRes.data || [],
      prime: primeRes.data || [],
    };
  }
}

function subscribeUsageEvents(nodeId){
  if (isDemo || !state.client) return;
  if (state.realtime.usageChannel){
    state.client.removeChannel(state.realtime.usageChannel);
    state.realtime.usageChannel = null;
  }
  state.realtime.usageChannel = state.client
    .channel(`usage-events-${nodeId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "usage_events", filter: `node_id=eq.${nodeId}` },
      async () => {
        await loadUsageEvents(nodeId);
        await loadAlerts(nodeId);
        renderInventory();
        renderAllowedQuantities();
        renderProofChecklist();
        renderAlerts();
      }
    )
    .subscribe();
}

function renderInvoicePanel(){
  const wrap = $("invoicePanel");
  if (!wrap) return;
  const invoices = state.invoices || [];
  if (!state.activeProject){
    wrap.innerHTML = `<div class="muted small">${t("selectProjectLocations")}</div>`;
    return;
  }
  if (!invoices.length){
    wrap.innerHTML = `<div class="muted small">${t("yourInvoicesEmpty")}</div>`;
    return;
  }
  const orgId = state.profile?.org_id || null;
  const rows = invoices.map((inv) => {
    const site = (state.projectSites || []).find(s => s.id === inv.site_id) || null;
    const siteName = site ? getSiteDisplayName(site) : inv.site_id || "-";
    const roleLabel = orgId && inv.billed_by_org_id === orgId ? t("issuerLabel") : t("recipientLabel");
    return `
      <tr>
        <td>${escapeHtml(inv.invoice_number || "-")}</td>
        <td>${escapeHtml(siteName)}</td>
        <td>${escapeHtml(inv.status || "draft")}</td>
        <td>${roleLabel}</td>
        <td>${formatMoney(inv.total)}</td>
      </tr>
    `;
  }).join("");
  wrap.innerHTML = `
    <div class="muted small" style="margin-bottom:8px;">${t("yourInvoicesTitle")}</div>
    <table class="table">
      <thead><tr><th>${t("invoiceNumberLabel")}</th><th>${t("locationLabel")}</th><th>${t("statusLabel")}</th><th>${t("roleLabel")}</th><th>${t("amountLabel")}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}


function renderBillingLocations(){
  const wrap = $("billingLocationList");
  const status = $("billingStatus");
  if (!wrap || !status) return;
  if (!state.activeProject){
    wrap.innerHTML = `<div class="muted small">${t("selectProjectLocations")}</div>`;
    status.textContent = "";
    return;
  }
  const rows = state.billingLocations || [];
  status.textContent = rows.length ? t("billingStatusLocations", { count: rows.length }) : t("noLocations");
  if (!rows.length){
    wrap.innerHTML = `<div class="muted small">${t("noLocationsYet")}</div>`;
    return;
  }
  wrap.innerHTML = rows.map((loc) => {
    const required = getLocationRequiredPhotos(loc, state.activeProject?.id);
    const uploaded = loc.photo_count || 0;
    const proofOk = uploaded >= required;
    const proofLabel = required === 0 ? t("proofNotRequired") : t("proofProgress", { uploaded, required });
    const invoiceStatus = loc.invoice_status || "draft";
    const invoiceLabel = invoiceStatus.toUpperCase();
    const disabled = false;
    const nameHtml = renderTranslatedText(getSpliceLocationDisplayName(loc), { valueClass: "" });
    return `
      <div class="billing-location-card ${disabled ? "disabled" : ""}">
        <div class="row" style="justify-content:space-between;">
          <div>
            <div style="font-weight:900">${nameHtml}</div>
            <div class="muted small">${escapeHtml(loc.node_number || "")}</div>
          </div>
          <span class="status-pill ${proofOk ? "ok" : "warn"}">${proofLabel} ${proofOk ? t("ok") : t("locked")}</span>
        </div>
        <div class="row" style="justify-content:space-between;">
          <span class="status-pill">${invoiceLabel}</span>
          <button class="btn secondary" data-action="openBilling" data-id="${loc.id}" ${disabled ? "disabled" : ""}>${t("billingOpen")}</button>
        </div>
      </div>
    `;
  }).join("");
  hydrateTranslations(wrap);
}


function renderBillingDetail(){
  const wrap = $("billingDetail");
  if (!wrap) return;
  const loc = state.billingLocation;
  const exportBtn = $("btnBillingExportCsv");
  const printBtn = $("btnBillingPrint");
  const importBtn = $("btnImportUsage");
  if (!loc){
    wrap.innerHTML = `<div class="muted small">${t("selectLocationToBill")}</div>`;
    if (exportBtn) exportBtn.disabled = true;
    if (printBtn) printBtn.disabled = true;
    if (importBtn) importBtn.disabled = true;
    return;
  }
  const invoice = state.billingInvoice;
  const items = state.billingItems || [];
  const canEditRates = isBillingManager();
  const proofRequired = getLocationRequiredPhotos(loc, state.activeProject?.id);
  const proofUploaded = loc.photo_count || 0;
  const proofOk = proofUploaded >= proofRequired;
  const proofLabel = proofRequired === 0 ? t("proofNotRequired") : t("proofProgress", { uploaded: proofUploaded, required: proofRequired });
  const totals = computeInvoiceTotals(items);
  const status = invoice?.status || "draft";
  const locked = SpecCom.helpers.isRoot() ? false : ["submitted", "paid", "void"].includes(status);
  const billingUnlocked = isBillingUnlocked();
  const editLocked = locked || !billingUnlocked;
  const rateCard = state.rateCards.find(r => r.id === state.activeRateCardId);
  const overrides = state.ownerOverrides || [];
  const hasOverride = overrides.length > 0;
  const showOverrideAction = false;
  const buildModeStatusControls = (BUILD_MODE && invoice)
    ? `
      <div class="note" style="margin-top:12px;">
        <div style="font-weight:900;">Invoice status (build mode)</div>
        <div class="row" style="flex-wrap:wrap; margin-top:8px;">
          <select id="buildInvoiceStatus" class="input" style="min-width:180px;">
            <option value="draft" ${status === "draft" ? "selected" : ""}>Draft</option>
            <option value="sent" ${status === "sent" ? "selected" : ""}>Sent</option>
            <option value="paid" ${status === "paid" ? "selected" : ""}>Paid</option>
          </select>
          <button id="btnBuildInvoiceStatus" class="btn secondary" data-action="buildInvoiceStatus">Update status</button>
        </div>
      </div>
    `
    : "";

  wrap.innerHTML = `
    <div class="note">
      <div style="font-weight:900;">${escapeHtml(getSpliceLocationDisplayName(loc))}</div>
      <div class="muted small">${t("nodeLabel")}: ${escapeHtml(loc.node_number || "-")}</div>
      <div class="muted small">${proofLabel} ${proofOk ? t("ok") : t("locked")}</div>
      <div class="muted small">${t("rateCardLabel")}: ${escapeHtml(rateCard?.name || "Default")}</div>
      <div class="muted small">${t("statusLabel")}: ${escapeHtml(status.toUpperCase())}</div>
      ${hasOverride ? '<div class="muted small">Override: ACTIVE</div>' : ""}
    </div>
    ${(!billingUnlocked && !MVP_UNGATED) ? `
      <div class="note warning" style="margin-top:12px;">
        <div style="font-weight:900;">Billing locked</div>
        <div class="muted small">Proof is incomplete for this site. Owner can apply an override if needed.</div>
        ${showOverrideAction ? '<button id="btnOwnerOverride" class="btn secondary" data-action="ownerOverride" style="margin-top:10px;">Owner override</button>' : ""}
      </div>
    ` : ""}
    ${buildModeStatusControls}
    ${showOverrideAction ? `
      <div id="ownerOverridePanel" class="note override-panel" style="display:none; margin-top:12px;">
        <div style="font-weight:900;">Owner override</div>
        <div class="muted small" style="margin-bottom:8px;">Reason is required for audit.</div>
        <div class="row" style="flex-wrap:wrap;">
          <select id="ownerOverrideType" class="input" style="width:220px;">
            <option value="BILLING_UNLOCKED">Unlock billing</option>
            <option value="BACKFILL_ALLOWED">Allow backfill uploads</option>
          </select>
          <input id="ownerOverrideReason" class="input" placeholder="Reason (required)" style="min-width:220px; flex:1 1 auto;" />
          <button id="btnApplyOwnerOverride" class="btn" data-action="applyOwnerOverride">Apply</button>
        </div>
      </div>
    ` : ""}
    <div class="hr"></div>
    <table class="table billing-table">
      <thead>
        <tr>
          <th>${t("workCodeLabel")}</th>
          <th>${t("descriptionLabel")}</th>
          <th>${t("unitLabel")}</th>
          <th>${t("qtyLabel")}</th>
          <th>${t("rateLabel")}</th>
          <th>${t("amountLabel")}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, idx) => renderBillingItemRow(item, idx, canEditRates && !editLocked, editLocked)).join("")}
      </tbody>
    </table>
    <div class="billing-actions">
      <button id="btnAddLineItem" class="btn secondary" data-action="addLineItem" ${editLocked ? "disabled" : ""}>${t("addLineItemLabel")}</button>
    </div>
    <div class="hr"></div>
    <div class="billing-summary">
      <div>${t("subtotalLabel")}: <b>${formatMoney(totals.subtotal)}</b></div>
      <div>${t("taxLabel")}: <b>${formatMoney(totals.tax)}</b></div>
      <div>${t("totalLabel")}: <b>${formatMoney(totals.total)}</b></div>
    </div>
    <div class="hr"></div>
    <div>
      <div class="muted small">${t("notesLabel")}</div>
      <textarea id="billingNotes" class="input" rows="3" style="width:100%;" ${editLocked ? "disabled" : ""}>${escapeHtml(invoice?.notes || "")}</textarea>
    </div>
    <div class="billing-actions">
      <button id="btnBillingSave" class="btn" data-action="billingSave" ${editLocked ? "disabled" : ""}>Save</button>
      <button id="btnBillingReady" class="btn secondary" data-action="billingReady" ${editLocked || !hasBillableItems(items) ? "disabled" : ""}>Ready to submit</button>
    </div>
  `;

  const canExport = BUILD_MODE || ["ready", "submitted", "paid"].includes(status);
  if (exportBtn) exportBtn.disabled = !canExport;
  if (printBtn) printBtn.disabled = !canExport;
  if (importBtn) importBtn.disabled = editLocked;
  applyDemoRestrictions(wrap);
}

function renderBillingItemRow(item, idx, canEditRates, locked){
  const workCodes = state.workCodes || [];
  const options = ['<option value="">Select</option>'].concat(
    workCodes.map((code) => `<option value="${code.id}" ${code.id === item.work_code_id ? "selected" : ""}>${escapeHtml(code.code)}</option>`)
  );
  const amount = Number(item.qty || 0) * Number(item.rate || 0);
  const desc = item.description || "";
  const unit = item.unit || "";
  return `
    <tr>
      <td><select data-action="codeChange" data-index="${idx}" ${locked ? "disabled" : ""}>${options.join("")}</select></td>
      <td>${escapeHtml(desc)}</td>
      <td>${escapeHtml(unit)}</td>
      <td><input data-action="qtyChange" data-index="${idx}" type="number" min="0" step="0.01" value="${item.qty ?? 0}" ${locked ? "disabled" : ""} /></td>
      <td><input data-action="rateChange" data-index="${idx}" type="number" min="0" step="0.01" value="${item.rate ?? 0}" ${canEditRates ? "" : "disabled"} /></td>
      <td>${formatMoney(amount)}</td>
      <td><button class="btn ghost small" data-action="removeLine" data-index="${idx}" ${locked ? "disabled" : ""}>Remove</button></td>
    </tr>
  `;
}

function computeInvoiceTotals(items){
  const subtotal = (items || []).reduce((sum, item) => {
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    return sum + qty * rate;
  }, 0);
  const tax = 0;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

function hasBillableItems(items){
  return (items || []).some(item => Number(item.qty || 0) > 0);
}

function getWorkCodeById(id){
  return (state.workCodes || []).find(code => code.id === id) || null;
}

function getRateForWorkCode(workCodeId){
  const cardItem = (state.rateCardItems || []).find(r => r.work_code_id === workCodeId);
  if (cardItem) return Number(cardItem.rate || 0);
  const work = getWorkCodeById(workCodeId);
  return Number(work?.default_rate || 0);
}

function addBillingItem(){
  state.billingItems = state.billingItems || [];
  state.billingItems.push({
    work_code_id: "",
    description: "",
    unit: "",
    qty: 0,
    rate: 0,
    sort_order: state.billingItems.length,
  });
  renderBillingDetail();
}

function removeBillingItem(index){
  state.billingItems = (state.billingItems || []).filter((_, idx) => idx !== index);
  renderBillingDetail();
}

function handleBillingItemChange(index, field, value){
  const item = (state.billingItems || [])[Number(index)];
  if (!item) return;
  if (field === "work_code_id"){
    item.work_code_id = value;
    const code = getWorkCodeById(value);
    item.description = code?.description || "";
    item.unit = code?.unit || "";
    item.rate = getRateForWorkCode(value);
  } else if (field === "qty"){
    item.qty = Number(value || 0);
  } else if (field === "rate"){
    if (isBillingManager()){
      item.rate = Number(value || 0);
    }
  }
  renderBillingDetail();
}

async function openBillingLocation(locationId){
  const loc = (state.billingLocations || []).find(l => l.id === locationId);
  if (!loc) return;
  state.billingLocation = loc;
  await loadNodeProofStatus(loc.node_id);
  await loadOwnerOverrides(loc.node_id);
  if (!state.activeRateCardId && state.rateCards.length){
    state.activeRateCardId = state.rateCards[0].id;
    await loadRateCardItems(state.activeRateCardId);
  }
  await ensureBillingInvoice();
  renderBillingDetail();
}

async function ensureBillingInvoice(){
  const loc = state.billingLocation;
  if (!loc) return;
  if (isDemo){
    state.billingInvoice = {
      id: `inv-${loc.id}`,
      project_id: state.activeProject?.id || null,
      location_id: loc.id,
      invoice_number: `SC-${new Date().getFullYear()}-0001`,
      status: "draft",
      notes: "",
    };
    state.billingItems = state.billingItems?.length ? state.billingItems : [];
    return;
  }
  const { data, error } = await state.client
    .from("invoices")
    .select("id, project_id, location_id, invoice_number, status, notes, subtotal, tax, total")
    .eq("project_id", state.activeProject?.id || null)
    .eq("location_id", loc.id)
    .maybeSingle();
  if (error){
    toast("Invoice load error", error.message);
    return;
  }
  if (data){
    state.billingInvoice = data;
    await loadInvoiceItems(data.id);
    return;
  }
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const invoiceNumber = await generateInvoiceNumber();
  const { data: created, error: createErr } = await state.client
    .from("invoices")
    .insert({
      project_id: state.activeProject?.id || null,
      location_id: loc.id,
      invoice_number: invoiceNumber,
      status: "draft",
      created_by: state.user?.id || null,
    })
    .select("id, project_id, location_id, invoice_number, status, notes, subtotal, tax, total")
    .maybeSingle();
  if (createErr){
    toast("Invoice create error", createErr.message);
    return;
  }
  state.billingInvoice = created;
  state.billingItems = [];
}

async function loadInvoiceItems(invoiceId){
  if (!invoiceId){
    state.billingItems = [];
    return;
  }
  if (isDemo){
    return;
  }
  const { data, error } = await state.client
    .from("invoice_items")
    .select("id, invoice_id, work_code_id, description, unit, qty, rate, sort_order")
    .eq("invoice_id", invoiceId)
    .order("sort_order");
  if (error){
    toast("Line items error", error.message);
    return;
  }
  state.billingItems = (data || []).map((row) => {
    const work = getWorkCodeById(row.work_code_id);
    return {
      ...row,
      description: row.description || work?.description || "",
      unit: row.unit || work?.unit || "",
    };
  });
}

async function saveBillingInvoice(){
  const invoice = state.billingInvoice;
  if (!invoice){
    toast("No invoice", "Select a location first.");
    return;
  }
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  if (!isBillingUnlocked()){
    toast("Billing locked", "Proof is incomplete for this site.");
    return;
  }
  const totals = computeInvoiceTotals(state.billingItems);
  const notes = $("billingNotes")?.value || "";

  if (isDemo){
    state.billingInvoice = { ...invoice, notes, ...totals };
    toast("Saved", "Invoice saved (demo).");
    renderBillingDetail();
    return;
  }

  const { error: invErr } = await state.client
    .from("invoices")
    .update({
      notes,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id);
  if (invErr){
    toast("Save failed", invErr.message);
    return;
  }

  await upsertInvoiceItems(invoice.id, state.billingItems || []);
  toast("Saved", "Invoice saved.");
  await loadBillingLocations(state.activeProject?.id || null);
}

async function upsertInvoiceItems(invoiceId, items){
  if (isDemoUser()) return;
  if (isDemo) return;
  const payload = (items || []).map((item, idx) => ({
    invoice_id: invoiceId,
    work_code_id: item.work_code_id || null,
    description: item.description || "",
    unit: item.unit || "",
    qty: Number(item.qty || 0),
    rate: Number(item.rate || 0),
    sort_order: item.sort_order ?? idx,
  })).map((row, idx) => {
    const item = items[idx];
    if (item && item.id) row.id = item.id;
    return row;
  });
  if (!payload.length){
    await state.client.from("invoice_items").delete().eq("invoice_id", invoiceId);
    return;
  }
  const keepIds = payload.map(r => r.id).filter(Boolean);
  if (keepIds.length){
    const idList = keepIds.map(id => `"${id}"`).join(",");
    await state.client
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoiceId)
      .not("id", "in", `(${idList})`);
  }
  const { error } = await state.client
    .from("invoice_items")
    .upsert(payload, { onConflict: "id" });
  if (error){
    toast("Line items save failed", error.message);
  }
}

async function markInvoiceReady(){
  const invoice = state.billingInvoice;
  if (!invoice){
    toast("No invoice", "Select a location first.");
    return;
  }
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  if (!isBillingUnlocked()){
    toast("Billing locked", "Proof is incomplete for this site.");
    return;
  }
  if (!hasBillableItems(state.billingItems)){
    toast("Missing items", "Add at least one line item with qty.");
    return;
  }
  if (isDemo){
    state.billingInvoice.status = "ready";
    toast("Ready", "Invoice marked ready (demo).");
    renderBillingDetail();
    return;
  }
  const { error } = await state.client
    .from("invoices")
    .update({ status: "ready", updated_at: new Date().toISOString() })
    .eq("id", invoice.id);
  if (error){
    toast("Update failed", error.message);
    return;
  }
  state.billingInvoice.status = "ready";
  toast("Ready", "Invoice marked ready.");
  await loadBillingLocations(state.activeProject?.id || null);
  renderBillingDetail();
}

async function updateInvoiceStatus(){
  if (!SpecCom.helpers.isRoot() && (!BUILD_MODE || !isOwner())){
    toast("Not allowed", "Admin role required.");
    return;
  }
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const invoice = state.billingInvoice;
  if (!invoice){
    toast("No invoice", "Select a location first.");
    return;
  }
  const nextStatus = $("buildInvoiceStatus")?.value || "draft";
  if (isDemo){
    state.billingInvoice.status = nextStatus;
    renderBillingDetail();
    toast("Status updated", `Invoice set to ${nextStatus}.`);
    return;
  }
  const { error } = await state.client
    .from("invoices")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", invoice.id);
  if (error){
    toast("Update failed", error.message);
    return;
  }
  state.billingInvoice.status = nextStatus;
  await loadBillingLocations(state.activeProject?.id || null);
  renderBillingDetail();
  toast("Status updated", `Invoice set to ${nextStatus}.`);
}

async function createOwnerOverride(overrideType, reason){
  if (!isOwner()){
    toast("Not allowed", "Owner role required.");
    return;
  }
  const loc = state.billingLocation;
  const projectId = state.activeProject?.id || null;
  const nodeId = loc?.node_id || null;
  const trimmed = String(reason || "").trim();
  if (!projectId || !nodeId){
    toast("Missing context", "Select a location first.");
    return;
  }
  if (!trimmed){
    toast("Reason required", "Provide a reason for the override.");
    return;
  }
  if (isDemo){
    state.ownerOverrides = state.ownerOverrides || [];
    state.ownerOverrides.unshift({
      id: `override-${Date.now()}`,
      override_type: overrideType,
      reason: trimmed,
      created_at: nowISO(),
      node_id: nodeId,
    });
    toast("Override added", "Override applied (demo).");
    renderBillingDetail();
    return;
  }
  const { error } = await state.client
    .rpc("create_owner_override", {
      project_id: projectId,
      node_id: nodeId,
      override_type: overrideType,
      reason: trimmed,
      splice_location_id: null,
    });
  if (error){
    toast("Override failed", error.message);
    return;
  }
  toast("Override added", "Override applied.");
  await loadOwnerOverrides(nodeId);
  await loadNodeProofStatus(nodeId);
  renderBillingDetail();
}

async function generateInvoiceNumber(){
  const year = new Date().getFullYear();
  if (isDemo) return `SC-${year}-0001`;
  const { data } = await state.client
    .from("invoices")
    .select("invoice_number")
    .ilike("invoice_number", `SC-${year}-%`);
  const used = (data || []).map(r => Number(String(r.invoice_number || "").split("-")[2] || 0)).filter(n => Number.isFinite(n));
  const next = (used.length ? Math.max(...used) + 1 : 1);
  return `SC-${year}-${String(next).padStart(4, "0")}`;
}

function exportInvoiceCsv(){
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const invoice = state.billingInvoice;
  const loc = state.billingLocation;
  if (!invoice || !loc) return;
  const project = state.activeProject;
  const overrideUsed = (state.ownerOverrides || []).length > 0;
  const header = [
    ["Invoice Number", invoice.invoice_number || ""],
    ["Project", project?.name || ""],
    ["Job Number", project?.job_number || ""],
    ["Location", getSpliceLocationDisplayName(loc)],
    ["Prepared By", state.profile?.display_name || state.user?.email || ""],
    ["Prepared At", new Date().toLocaleString()],
    ["Work Codes", (state.billingItems || []).map(i => getWorkCodeById(i.work_code_id)?.code).filter(Boolean).join(", ")],
    ["Status", invoice.status || ""],
    ["Override Used", overrideUsed ? "Yes" : "No"],
  ];
  const rows = (state.billingItems || []).map((item) => ([
    getWorkCodeById(item.work_code_id)?.code || "",
    item.description || "",
    item.unit || "",
    item.qty ?? 0,
    item.rate ?? 0,
    (Number(item.qty || 0) * Number(item.rate || 0)).toFixed(2),
  ]));
  const csv = []
    .concat(header.map(row => row.map(escapeCsv).join(",")))
    .concat([["Work Code","Description","Unit","Qty","Rate","Amount"].join(",")])
    .concat(rows.map(row => row.map(escapeCsv).join(",")))
    .join("\n");
  downloadFile(`invoice-${invoice.invoice_number || "draft"}.csv`, csv, "text/csv");
}

function escapeCsv(value){
  const str = String(value ?? "");
  if (/[",\n]/.test(str)){
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadFile(filename, content, type){
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function printInvoice(){
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const invoice = state.billingInvoice;
  const loc = state.billingLocation;
  if (!invoice || !loc) return;
  const project = state.activeProject;
  const items = state.billingItems || [];
  const totals = computeInvoiceTotals(items);
  const now = new Date().toLocaleString();
  const codeList = items.map(i => getWorkCodeById(i.work_code_id)?.code).filter(Boolean).join(", ");
  const overrideUsed = (state.ownerOverrides || []).length > 0;
  const html = `
    <html>
      <head>
        <title>Invoice ${invoice.invoice_number || ""}</title>
        <style>
          body{font-family:Arial, sans-serif; padding:24px; color:#111;}
          h1{margin:0 0 8px;}
          table{width:100%; border-collapse:collapse; margin-top:16px;}
          th,td{border-bottom:1px solid #ccc; text-align:left; padding:8px;}
          .meta{margin-top:12px; font-size:14px;}
          .totals{margin-top:16px; text-align:right;}
        </style>
      </head>
      <body>
        <h1>Invoice ${invoice.invoice_number || ""}</h1>
        <div class="meta">Project: ${escapeHtml(project?.name || "")} (${escapeHtml(project?.job_number || "")})</div>
        <div class="meta">Location: ${escapeHtml(getSpliceLocationDisplayName(loc))}</div>
        <div class="meta">Prepared by: ${escapeHtml(state.profile?.display_name || state.user?.email || "")}</div>
        <div class="meta">Prepared at: ${escapeHtml(now)}</div>
        <div class="meta">Work codes: ${escapeHtml(codeList || "-")}</div>
        <div class="meta">Override used: ${overrideUsed ? "Yes" : "No"}</div>
        <table>
          <thead><tr><th>Work Code</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td>${escapeHtml(getWorkCodeById(item.work_code_id)?.code || "")}</td>
                <td>${escapeHtml(item.description || "")}</td>
                <td>${escapeHtml(item.unit || "")}</td>
                <td>${Number(item.qty || 0)}</td>
                <td>${formatMoney(item.rate)}</td>
                <td>${formatMoney(Number(item.qty || 0) * Number(item.rate || 0))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="totals">
          <div>Subtotal: ${formatMoney(totals.subtotal)}</div>
          <div>Tax: ${formatMoney(totals.tax)}</div>
          <div><b>Total: ${formatMoney(totals.total)}</b></div>
        </div>
      </body>
    </html>
  `;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

async function importUsageToInvoice(){
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const invoice = state.billingInvoice;
  if (!invoice){
    toast("No invoice", "Select a location first.");
    return;
  }
  const nodeId = state.billingLocation?.node_id;
  if (!nodeId){
    toast("No site", "Site data unavailable for this location.");
    return;
  }
  if (isDemo){
    toast("Imported", "Usage imported (demo).");
    return;
  }
  const { data, error } = await state.client
    .from("usage_events")
    .select("qty, unit_type_id, unit_types(code, description)")
    .eq("node_id", nodeId)
    .eq("status", "approved");
  if (error){
    toast("Usage load error", error.message);
    return;
  }
  const map = new Map();
  (data || []).forEach((row) => {
    const code = row.unit_types?.code;
    if (!code) return;
    map.set(code, (map.get(code) || 0) + Number(row.qty || 0));
  });
  const items = [];
  map.forEach((qty, code) => {
    const work = (state.workCodes || []).find(w => w.code === code);
    if (!work) return;
    items.push({
      work_code_id: work.id,
      description: work.description || "",
      unit: work.unit || "",
      qty,
      rate: getRateForWorkCode(work.id),
    });
  });
  if (!items.length){
    toast("No matches", "No usage matches work codes.");
    return;
  }
  state.billingItems = items;
  renderBillingDetail();
  toast("Imported", "Usage imported into invoice.");
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function getUsageItemId(item){
  return item.item_id || item.id;
}

function resolveUnitTypeIdForItem(item){
  const code = String(item.unit_type_code || item.item_code || "").toUpperCase();
  const match = state.unitTypes.find(u => String(u.code || "").toUpperCase() === code);
  return match?.id || null;
}

function getApprovedUsageQty(itemId){
  const events = isDemo ? state.demo.usageEvents : state.usageEvents;
  const nodeId = state.activeNode?.id;
  return events
    .filter(e => e.item_id === itemId && e.status === "approved" && (!nodeId || e.node_id === nodeId))
    .reduce((sum, e) => sum + e.qty, 0);
}

function getApprovedUsageByUnitType(unitTypeId){
  const events = isDemo ? state.demo.usageEvents : state.usageEvents;
  const nodeId = state.activeNode?.id;
  return events
    .filter(e => e.unit_type_id === unitTypeId && e.status === "approved" && (!nodeId || e.node_id === nodeId))
    .reduce((sum, e) => sum + e.qty, 0);
}

function getMissingUsageProof(nodeId){
  const events = isDemo ? state.demo.usageEvents : state.usageEvents;
  return events.filter((e) => {
    if (nodeId && e.node_id !== nodeId) return false;
    if (e.proof_required === false) return false;
    if (e.camera !== true) return true;
    const serverTime = e.captured_at_server || e.captured_at;
    return !e.photo_path || e.gps_lat == null || e.gps_lng == null || !serverTime;
  });
}

function getUnitTypeMeta(unitTypeId){
  const unit = state.unitTypes.find(u => u.id === unitTypeId);
  if (!unit) return { code: "-", description: "" };
  return { code: unit.code, description: unit.description || "" };
}

function getLocationProofRule(projectId){
  if (!projectId) return null;
  return (state.locationProofRules || []).find(r => r.project_id === projectId && !r.location_type) || null;
}

function getLocationRequiredPhotos(loc, projectId){
  if (SINGLE_PROOF_PHOTO_MODE) return 1;
  if (loc && Number.isFinite(loc.proof_required)){
    return Math.max(0, Number(loc.proof_required || 0));
  }
  const rule = getLocationProofRule(projectId);
  if (rule && Number.isFinite(rule.required_photos)){
    return Math.max(0, rule.required_photos);
  }
  return 0;
}

function getLocationProofUploaded(loc){
  const photos = loc?.photosBySlot || {};
  return Object.keys(photos).length;
}

function getLocationBillingStatus(locationId){
  const row = (state.billingLocations || []).find(l => l.id === locationId);
  return row?.invoice_status || "draft";
}

function isLocationBillingLocked(locationId){
  if (SpecCom.helpers.isRoot()) return false;
  if (BUILD_MODE) return false;
  const status = getLocationBillingStatus(locationId);
  return ["ready", "submitted", "paid", "void"].includes(String(status).toLowerCase());
}

function getRemainingForItem(item){
  const planned = Number.isFinite(item.planned_qty) ? item.planned_qty : (item.qty_used || 0);
  const approved = getApprovedUsageQty(getUsageItemId(item));
  return planned - approved;
}

function updateAlertsBadge(){
  const roleCode = getRoleCode();
  const canSeeAlerts = SpecCom.helpers.isRoot() || roleCode === "PROJECT_MANAGER" || roleCode === "ADMIN" || roleCode === "SUPPORT";
  const openAlerts = canSeeAlerts ? (state.alerts || []).filter(a => a.status === "open") : [];
  const count = openAlerts.length;
  const badge = $("alertsBadge");
  if (badge){
    badge.textContent = canSeeAlerts
      ? (count ? `${count} alert${count > 1 ? "s" : ""}` : "No alerts")
      : "Alerts for PMs only";
    badge.classList.toggle("warn", count > 0 && canSeeAlerts);
  }
  const navBadge = $("alertsNavBadge");
  if (navBadge){
    navBadge.textContent = count ? String(count) : "";
    navBadge.style.display = count && canSeeAlerts ? "inline-flex" : "none";
  }
}

async function loadSplicePhotos(nodeId, locs){
  if (isDemo){
    locs.forEach((loc) => {
      loc.photosBySlot = loc.photosBySlot || {};
    });
    return;
  }
  if (!state.client || !locs.length) return;
  const locIds = locs.map((loc) => loc.id);
  const { data, error } = await state.client
    .from("splice_location_photos")
    .select("splice_location_id, slot_key, photo_path, taken_at, gps_lat, gps_lng, gps_accuracy_m")
    .in("splice_location_id", locIds);
  if (error){
    toast("Photos load error", error.message);
    return;
  }
  const byLoc = new Map();
  for (const row of (data || [])){
    if (!row.slot_key) continue;
    const key = row.splice_location_id;
    if (!byLoc.has(key)) byLoc.set(key, {});
    const current = byLoc.get(key);
    const previewUrl = row.photo_path ? await getPublicOrSignedUrl("proof-photos", row.photo_path) : "";
    current[row.slot_key] = {
      path: row.photo_path,
      taken_at: row.taken_at,
      previewUrl,
      gps: row.gps_lat != null && row.gps_lng != null
        ? { lat: row.gps_lat, lng: row.gps_lng, accuracy_m: row.gps_accuracy_m }
        : null,
    };
  }
  locs.forEach((loc) => {
    const photos = byLoc.get(loc.id) || {};
    const existing = loc.photosBySlot || {};
    const merged = {};
    Object.keys(photos).forEach((slotKey) => {
      const previewUrl = photos[slotKey]?.previewUrl || existing[slotKey]?.previewUrl || null;
      merged[slotKey] = {
        ...photos[slotKey],
        previewUrl,
      };
    });
    loc.photosBySlot = merged;
  });
}

function renderAlerts(){
  const roleCode = getRoleCode();
  const canSeeAlerts = SpecCom.helpers.isRoot() || roleCode === "PROJECT_MANAGER" || roleCode === "ADMIN" || roleCode === "SUPPORT";
  const list = canSeeAlerts ? (state.alerts || []) : [];
  const targets = [$("alertsFeed"), $("alertsFeedFull")].filter(Boolean);
  if (!targets.length) return;
  const html = list.length
    ? list.map((alert) => {
        const unit = getUnitTypeMeta(alert.unit_type_id);
        const unitCode = alert.unit_types?.code || unit.code;
        const unitDesc = unit.description;
        const created = alert.created_at ? new Date(alert.created_at).toLocaleString() : "";
        const nodeLabel = state.activeNode?.node_number || (alert.node_id ? String(alert.node_id).slice(0, 8) : "-");
        return `
          <div class="alert-card">
            <div class="row" style="justify-content:space-between;">
              <div>
                <div style="font-weight:900">Site ${escapeHtml(nodeLabel)}</div>
                <div class="muted small">${escapeHtml(unitCode)} ${escapeHtml(unitDesc)}</div>
              </div>
              <span class="chip"><span class="dot warn"></span><span>${escapeHtml(alert.severity || "warning")}</span></span>
            </div>
            <div class="muted small" style="margin-top:6px;">Allowed: ${alert.allowed_qty ?? "-"} | Used: ${alert.used_qty ?? "-"} | Remaining: ${alert.remaining_qty ?? "-"}</div>
            <div style="margin-top:6px;">${escapeHtml(alert.message || "")}</div>
            <div class="muted small" style="margin-top:6px;">${created}</div>
          </div>
        `;
      }).join("")
    : `<div class="muted small">${canSeeAlerts ? "No alerts right now." : "Alerts are available to Admin / Project Manager."}</div>`;
  targets.forEach((el) => {
    el.innerHTML = html;
  });
}

function renderAllowedQuantities(){
  const wrap = $("allowedQuantities");
  if (!wrap) return;
  const rows = state.allowedQuantities || [];
  if (!state.activeNode || !rows.length){
    wrap.innerHTML = `<div class="muted small">${t("openNodeAllowedQuantities")}</div>`;
    return;
  }
  wrap.innerHTML = `
    <table class="table">
      <thead><tr><th>Unit type</th><th>Allowed</th><th>Used</th><th>Remaining</th><th>Threshold</th></tr></thead>
      <tbody>
        ${rows.map((row) => {
          const used = getApprovedUsageByUnitType(row.unit_type_id);
          const remaining = row.allowed_qty - used;
          const pct = row.alert_threshold_pct != null ? `${Math.round(row.alert_threshold_pct * 100)}%` : "-";
          const abs = row.alert_threshold_abs != null ? row.alert_threshold_abs : "-";
          return `
            <tr>
              <td>${escapeHtml(row.unit_code || "-")}</td>
              <td>${row.allowed_qty}</td>
              <td>${used}</td>
              <td>${remaining}</td>
              <td>${pct} / ${abs}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function maybeCreateDemoAlert(nodeId, unitTypeId){
  if (!isDemo) return;
  const row = (state.demo.allowedQuantities || []).find(a => a.node_id === nodeId && a.unit_type_id === unitTypeId);
  if (!row) return;
  const used = getApprovedUsageByUnitType(unitTypeId);
  const remaining = row.allowed_qty - used;
  const thresholdPct = row.alert_threshold_pct ?? 0.15;
  const thresholdAbs = row.alert_threshold_abs ?? null;
  const hitPct = row.allowed_qty > 0 && (remaining / row.allowed_qty) <= thresholdPct;
  const hitAbs = thresholdAbs != null && remaining <= thresholdAbs;
  if (!(hitPct || hitAbs)) return;
  const exists = (state.demo.alerts || []).some(a => a.node_id === nodeId && a.unit_type_id === unitTypeId && a.status === "open");
  if (exists) return;
  state.demo.alerts = state.demo.alerts || [];
  state.demo.alerts.unshift({
    id: `alert-${Date.now()}`,
    node_id: nodeId,
    unit_type_id: unitTypeId,
    allowed_qty: row.allowed_qty,
    used_qty: used,
    remaining_qty: remaining,
    message: "Remaining units below threshold. Request approval for additional units.",
    severity: "warning",
    status: "open",
    created_at: nowISO(),
  });
}

function filterCatalog(term){
  const needle = (term || "").trim().toLowerCase();
  if (!needle) return state.materialCatalog || [];
  return (state.materialCatalog || []).filter((item) => {
    return [
      item.millennium_part,
      item.mfg_sku,
      item.description,
    ].some((field) => String(field || "").toLowerCase().includes(needle));
  });
}

function renderCatalogResults(targetId, term){
  const target = $(targetId);
  if (!target) return;
  const results = filterCatalog(term);
  if (!results.length){
    target.innerHTML = '<div class="muted small">No matching catalog items.</div>';
    return;
  }
  target.innerHTML = results.map((item) => `
    <div class="catalog-card">
      <img class="catalog-photo" src="${item.photo_url || "./assets/millennium_example.png"}" alt="catalog photo"/>
      <div>
        <div class="catalog-title">${escapeHtml(item.description || "Catalog item")}</div>
        <div class="muted small">Millennium: <b>${escapeHtml(item.millennium_part || "-")}</b></div>
        <div class="muted small">MFG SKU: <b>${escapeHtml(item.mfg_sku || "-")}</b></div>
      </div>
    </div>
  `).join("");
}

function renderProofChecklist(){
  const wrap = $("photoChecklist");
  const summary = $("photoChecklistSummary");
  const node = state.activeNode;
  if (!wrap || !summary){
    return;
  }
  if (!node){
    wrap.innerHTML = `<div class="muted small">${t("openNodePhotoRequirements")}</div>`;
    summary.innerHTML = `<div class="muted small">${t("noNodeSelected")}</div>`;
    renderBackfillPanel();
    return;
  }

  const locs = node.splice_locations || [];
  const missingLocs = locs.filter(l => !hasAllRequiredSlotPhotos(l));
  const slotCounts = locs.map((loc) => {
    const requiredSlots = getRequiredSlotsForLocation(loc);
    const photos = loc.photosBySlot || {};
    const missingSlots = requiredSlots.filter((slot) => !photos[slot]).length;
    return {
      required: requiredSlots.length,
      missing: missingSlots,
      uploaded: requiredSlots.length - missingSlots,
    };
  });
  const missingSlotCount = SINGLE_PROOF_PHOTO_MODE
    ? missingLocs.length
    : slotCounts.reduce((sum, row) => sum + row.missing, 0);
  const missingUsage = getMissingUsageProof(node.id);

  summary.innerHTML = `
    <div style="font-weight:900;">Photos required</div>
    <div class="muted small">${missingLocs.length} splice locations missing photos (${missingSlotCount} slots), ${missingUsage.length} usage entries missing photos.</div>
  `;

  if (!locs.length){
    wrap.innerHTML = '<div class="muted small">No splice locations yet.</div>';
    return;
  }

  wrap.innerHTML = `
    <table class="table">
      <thead><tr><th>Location</th><th>Photos</th><th>Status</th></tr></thead>
      <tbody>
        ${locs.map((loc, index) => {
          const counts = countRequiredSlotUploads(loc);
          const ok = counts.uploaded >= counts.required;
          return `
            <tr>
              <td>${escapeHtml(getSpliceLocationDisplayName(loc, index))}</td>
              <td>${counts.uploaded}/${counts.required}</td>
              <td>${ok ? '<span class="pill-ok">OK</span>' : '<span class="pill-warn">Missing</span>'}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
  renderBackfillPanel();
}

function renderBackfillPanel(){
  const panel = $("backfillPanel");
  const select = $("backfillLocationSelect");
  if (!panel || !select) return;
  const node = state.activeNode;
  const allowed = isOwner() && Boolean(state.nodeProofStatus?.backfill_allowed) && !isDemo;
  if (!node || !allowed){
    panel.style.display = "none";
    return;
  }
  panel.style.display = "";
  const locs = getSortedSpliceLocations(node);
  const current = select.value;
  const options = ['<option value=\"\">Select splice location</option>'].concat(
    locs.map((loc, index) => `<option value=\"${loc.id}\">${escapeHtml(getSpliceLocationDisplayName(loc, index))}</option>`)
  );
  select.innerHTML = options.join("");
  if (current && locs.some(l => l.id === current)){
    select.value = current;
  }
}

async function captureGPS(){
  if (!navigator.geolocation){
    toast(t("gpsMissing"), t("gpsMissingBody"));
    return;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.lastGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: pos.coords.accuracy };
        toast(t("gpsCaptured"), `${state.lastGPS.lat.toFixed(6)}, ${state.lastGPS.lng.toFixed(6)} (+/-${Math.round(state.lastGPS.accuracy_m)}m)`);
        if (state.lastProof){
          state.lastProof.gps = { ...state.lastGPS };
          setProofStatus();
        }
        resolve(state.lastGPS);
      },
      (err) => {
        toast(t("gpsError"), err.message || t("gpsMissingBody"));
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );
  });
}

async function startCamera(){
  const video = $("cameraStream");
  const videoNodes = $("cameraStreamNodes");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    toast("Camera required", "Camera access required. Gallery uploads are not allowed.");
    return false;
  }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    state.cameraStream = stream;
    state.cameraReady = true;
    state.cameraInvalidated = false;
    state.cameraStartedAt = Date.now();
    if (video){
      video.srcObject = stream;
    }
    if (videoNodes){
      videoNodes.srcObject = stream;
    }
    return true;
  } catch (err){
    toast("Camera required", "Camera access required. Gallery uploads are not allowed.");
    state.cameraReady = false;
    return false;
  }
}

function ensureCameraReady(){
  if (!state.cameraReady){
    toast("Camera required", "Start the camera before capturing photos.");
    return false;
  }
  if (state.cameraInvalidated){
    toast("Capture blocked", "Page focus changed. Restart the camera to capture photos.");
    return false;
  }
  return true;
}

async function captureFrame(){
  const video = $("cameraStream");
  if (!video){
    toast("Camera required", "Camera access required. Gallery uploads are not allowed.");
    return null;
  }
  if (!ensureCameraReady()){
    return null;
  }
  if (document.hidden){
    toast("Capture blocked", "Camera capture must be in the foreground.");
    return null;
  }
  if (state.lastVisibilityChangeAt && state.cameraStartedAt && state.lastVisibilityChangeAt > state.cameraStartedAt){
    toast("Capture blocked", "Page focus changed. Restart the camera to capture photos.");
    return null;
  }
  const gps = await captureGPS();
  if (!gps){
    toast(t("gpsRequired"), t("gpsRequired"));
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob){
    toast("Capture failed", "Unable to capture camera frame.");
    return null;
  }
  return { blob, gps, captured_at: nowISO(), previewUrl: URL.createObjectURL(blob) };
}

function makeFileFromBlob(blob){
  return new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
}

async function addSpliceLocation(){
  const node = state.activeNode;
  if (!node) return;
  const nextSortOrder = Math.max(...(node.splice_locations || []).map(l => l.sort_order || 0), 0) + 1;
  const tempName = getSpliceLocationDefaultName(nextSortOrder - 1);
  if (isDemo){
    node.splice_locations = node.splice_locations || [];
    node.splice_locations.push({
      id: `loc-${Date.now()}`,
      label: null,
      location_label: tempName,
      gps: null,
      photo: null,
      taken_at: null,
      completed: false,
      terminal_ports: DEFAULT_TERMINAL_PORTS,
      work_codes: [],
      work_description: "",
      photosBySlot: {},
      sort_order: nextSortOrder,
      isEditingName: true,
    });
    renderLocations();
    updateKPI();
    renderProofChecklist();
    return;
  }

  const { data, error } = await state.client
    .from("splice_locations")
    .insert({
      node_id: node.id,
      location_label: tempName,
      label: null,
      terminal_ports: DEFAULT_TERMINAL_PORTS,
      sort_order: nextSortOrder,
    })
    .select("id, label, location_label, gps_lat, gps_lng, gps_accuracy_m, photo_path, taken_at, completed, terminal_ports, sort_order, created_at, work_codes, work_description")
    .maybeSingle();

  if (error){
    toast("Add location failed", error.message);
    return;
  }
  node.splice_locations = node.splice_locations || [];
  node.splice_locations.push({
    id: data.id,
    label: data.label,
    location_label: data.location_label,
    gps: (data.gps_lat != null && data.gps_lng != null)
      ? { lat: data.gps_lat, lng: data.gps_lng, accuracy_m: data.gps_accuracy_m }
      : null,
    photo: data.photo_path ? { kind:"storage", path:data.photo_path } : null,
    taken_at: data.taken_at,
    completed: data.completed,
    terminal_ports: normalizeTerminalPorts(data.terminal_ports ?? DEFAULT_TERMINAL_PORTS),
    work_codes: Array.isArray(data.work_codes) ? data.work_codes : [],
    work_description: data.work_description || "",
    photosBySlot: {},
    sort_order: data.sort_order ?? nextSortOrder,
    created_at: data.created_at,
    isEditingName: true,
  });
  renderLocations();
  updateKPI();
  renderProofChecklist();
}

async function openNode(nodeNumber){
  ensureDemoSeed();
  const roleCode = getRoleCode();

  const n = (nodeNumber || "").trim();
  if (!n){
    toast("Site number needed", "Enter a site number (example: SITE-1001).");
    return;
  }
  clearProof();

  if (isDemo){
    if (!state.demo.nodes[n]){
      toast("Not found", "That site doesn't exist in demo. Click Create site to add it.");
      return;
    }

    const nodeMeta = (state.demo.nodesList || []).find(x => x.node_number === n);
    const activeMeta = (state.demo.nodesList || []).find(x => x.status === "ACTIVE");
    if (nodeMeta && activeMeta && activeMeta.node_number !== n && activeMeta.status !== "COMPLETE"){
      toast("Active site in progress", `Finish ${activeMeta.node_number} before starting another site.`);
      return;
    }
    if (nodeMeta && nodeMeta.status !== "COMPLETE"){
      nodeMeta.status = "ACTIVE";
    }

    state.activeNode = state.demo.nodes[n];
    state.unitTypes = state.demo.unitTypes || [];
    await loadAllowedQuantities(state.activeNode.id);
    await loadAlerts(state.activeNode.id);
    state.activeNode.splice_locations = (state.activeNode.splice_locations || []).map((loc) => ({
      ...loc,
      terminal_ports: normalizeTerminalPorts(loc.terminal_ports ?? DEFAULT_TERMINAL_PORTS),
      work_codes: Array.isArray(loc.work_codes) ? loc.work_codes : [],
      work_description: loc.work_description || "",
      photosBySlot: loc.photosBySlot || {},
    }));

    // In real app, pricing is server-side protected.
    // Here we just display message.
    setRoleUI();
    renderLocations();
    renderInventory();
    renderInvoicePanel();
    renderAllowedQuantities();
    renderAlerts();
    renderProofChecklist();
    updateKPI();
    renderNodeCards();

  // Project Manager alert when near units
    if (roleCode === "PROJECT_MANAGER" && state.activeNode.units_allowed > 0){
      const ratio = state.activeNode.units_used / state.activeNode.units_allowed;
      if (ratio >= 0.9){
        toast("Project Manager alert", "Units are close to the allowed threshold for this site.");
      }
    }
    return;
  }

  const nodeQuery = state.client
    .from("nodes")
    .select("id, node_number, description, status, allowed_units, used_units, ready_for_billing, project_id")
    .eq("node_number", n);

  if (state.activeProject?.id){
    nodeQuery.eq("project_id", state.activeProject.id);
  }

  const { data: nodeRow, error: nodeErr } = await nodeQuery.maybeSingle();
  if (nodeErr){
    toast("Site error", nodeErr.message);
    return;
  }
  if (!nodeRow){
    toast("Not found", "That site doesn't exist. Click Create site to add it.");
    return;
  }

  const activeNodeMeta = state.projectNodes.find(n => n.status === "ACTIVE");
  if (activeNodeMeta && activeNodeMeta.node_number !== nodeRow.node_number){
    toast("Active site in progress", `Finish ${activeNodeMeta.node_number} before starting another site.`);
    return;
  }

  if (nodeRow.status !== "COMPLETE" && nodeRow.status !== "ACTIVE"){
    const { error: statusErr } = await state.client
      .from("nodes")
      .update({ status: "ACTIVE", started_at: new Date().toISOString() })
      .eq("id", nodeRow.id);
    if (statusErr){
      toast("Site start failed", statusErr.message);
      return;
    }
    nodeRow.status = "ACTIVE";
  }

  const node = {
    id: nodeRow.id,
    node_number: nodeRow.node_number,
    description: nodeRow.description,
    status: nodeRow.status,
    units_allowed: nodeRow.allowed_units || 0,
    units_used: nodeRow.used_units || 0,
    ready_for_billing: nodeRow.ready_for_billing,
    project_id: nodeRow.project_id,
  };

  const [spliceRes, invRes, subInvRes, primeInvRes] = await Promise.all([
    state.client
      .from("splice_locations")
      .select("id, label, location_label, gps_lat, gps_lng, gps_accuracy_m, photo_path, taken_at, completed, terminal_ports, sort_order, created_at, work_codes, work_description")
      .eq("node_id", node.id)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    state.client
      .from("node_inventory")
      .select("id, item_id, qty_used, planned_qty, completed, inventory_items(id, vendor_code, display_name, photo_path)")
      .eq("node_id", node.id),
    state.client
      .from("sub_invoices")
      .select("id, invoice_number, status, total, currency")
      .eq("node_id", node.id),
    state.client
      .from("prime_invoices")
      .select("id, invoice_number, status, total, currency")
      .eq("node_id", node.id),
  ]);

  if (spliceRes.error){
    toast("Splice load error", spliceRes.error.message);
  }
  if (invRes.error){
    toast("Inventory load error", invRes.error.message);
  }
  if (subInvRes.error){
    toast("Invoice load error", subInvRes.error.message);
  }
  if (primeInvRes.error){
    toast("Invoice load error", primeInvRes.error.message);
  }

  node.splice_locations = (spliceRes.data || []).map((r) => ({
    id: r.id,
    label: r.label ?? null,
    location_label: r.location_label,
    gps: (r.gps_lat != null && r.gps_lng != null)
      ? { lat: r.gps_lat, lng: r.gps_lng, accuracy_m: r.gps_accuracy_m }
      : null,
    photo: r.photo_path ? { kind:"storage", path:r.photo_path } : null,
    taken_at: r.taken_at,
    completed: r.completed,
    terminal_ports: normalizeTerminalPorts(r.terminal_ports ?? DEFAULT_TERMINAL_PORTS),
    work_codes: Array.isArray(r.work_codes) ? r.work_codes : [],
    work_description: r.work_description || "",
    photosBySlot: {},
    sort_order: r.sort_order,
    created_at: r.created_at,
  }));

  node.inventory_checks = (invRes.data || []).map((r) => ({
    id: r.id,
    item_id: r.item_id,
    item_code: r.inventory_items?.vendor_code || "-",
    item_name: r.inventory_items?.display_name || "Item",
    photo: r.inventory_items?.photo_path || "./assets/millennium_example.png",
    qty_used: r.qty_used || 0,
    planned_qty: Number.isFinite(r.planned_qty) ? r.planned_qty : r.qty_used || 0,
    completed: r.completed,
  }));

  node.invoices = {
    sub: subInvRes.data || [],
    prime: primeInvRes.data || [],
  };

  state.activeNode = node;
  await loadUsageEvents(node.id);
  await loadSplicePhotos(node.id, node.splice_locations);
  await loadAllowedQuantities(node.id);
  await loadAlerts(node.id);
  await loadNodeProofStatus(node.id);
  await loadOwnerOverrides(node.id);
  subscribeUsageEvents(node.id);

  setRoleUI();
  renderLocations();
  renderInventory();
  renderInvoicePanel();
  renderAllowedQuantities();
  renderAlerts();
  renderProofChecklist();
  renderBillingDetail();
  updateKPI();
  await loadProjectNodes(node.project_id);
}

async function createNode(nodeNumber){
  ensureDemoSeed();
  const n = (nodeNumber || "").trim();
  if (!n){
    toast("Site number needed", "Enter a site number then click Create site.");
    return;
  }
  if (isDemo){
    if (state.demo.nodes[n]){
      toast("Already exists", "That site already exists.");
      return;
    }
    const newNode = {
      id: `demo-${Date.now()}`,
      node_number: n,
      description: "New site",
      status: "NOT_STARTED",
      project_id: state.activeProject?.id || state.demo.project?.id,
      units_allowed: 120,
      units_used: 0,
      splice_locations: [],
      inventory_checks: [
        { id:`inv-${Date.now()}-1`, item_code:"HAFO(OFDC-B8G)", item_name:"ADMIN Millennium example", photo:"./assets/millennium_example.png", qty_used: 1, planned_qty: 8, completed:false },
      ],
      ready_for_billing: false,
    };
    state.demo.nodes[n] = newNode;
    state.demo.nodesList = state.demo.nodesList || [];
    state.demo.nodesList.push({
      id: newNode.id,
      node_number: newNode.node_number,
      description: newNode.description,
      status: newNode.status,
      project_id: newNode.project_id,
    });
    renderNodeCards();
    toast("Site created", `Created site ${n}. Now click Open site.`);
    return;
  }

  const { error } = await state.client
    .from("nodes")
    .insert({
      node_number: n,
      allowed_units: 0,
      used_units: 0,
      project_id: state.activeProject?.id || null,
      status: "NOT_STARTED",
    });

  if (error){
    toast("Create failed", error.message);
    return;
  }
  await loadProjectNodes(state.activeProject?.id || null);
  toast("Site created", `Created site ${n}. Now click Open site.`);
}

async function markNodeReady(){
  const node = state.activeNode;
  if (!node) return;
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }
  const roleCode = getRoleCode();
  if (roleCode === ROLES.USER_LEVEL_1){
    toast("Not allowed", "Only billing roles can mark sites ready.");
    return;
  }

  const c = computeNodeCompletion(node);
  if (!BUILD_MODE && !MVP_UNGATED && !(c.locOk && c.invOk)){
    toast("Not ready", "Finish all splice locations + inventory checklist first.");
    return;
  }
  const photos = computeProofStatus(node);
  if (!BUILD_MODE && !MVP_UNGATED && !photos.photosOk){
    toast("Photos required", "Take photos (GPS + photo + timestamp) before marking the site ready.");
    return;
  }
  if (isDemo){
    node.ready_for_billing = true;
  } else {
    const { error } = await state.client
      .from("nodes")
      .update({ ready_for_billing: true })
      .eq("id", node.id);
    if (error){
      toast("Update failed", error.message);
      return;
    }
    node.ready_for_billing = true;
  }
  $("readyNote").style.display = "";
  $("readyNote").innerHTML = `
    <div style="font-weight:900;">Site READY</div>
    <div class="muted small">Site is ready for billing. Invoices are available in this MVP.</div>
  `;
  renderInvoicePanel();
  updateKPI();
}

async function createInvoice(){
  const node = state.activeNode;
  if (!node) return;
  if (isDemoUser()){
    toast("Demo restriction", t("availableInProduction"));
    return;
  }

  const roleCode = getRoleCode();
  if (roleCode === ROLES.USER_LEVEL_1){
    toast("Nope", "User Level 1 can't create invoices.");
    return;
  }

  const completion = computeNodeCompletion(node);
  if (!BUILD_MODE && !MVP_UNGATED && !(completion.pct === 100 && node.ready_for_billing)){
    toast("Blocked", "Invoices are blocked until documentation is complete and site is marked READY.");
    return;
  }
  const photos = computeProofStatus(node);
  if (!BUILD_MODE && !MVP_UNGATED && !photos.photosOk){
    toast("Blocked", "Photos are required before invoice submission.");
    return;
  }

  // Minimal demo invoice routing
  let to = null;
  if (roleCode === ROLES.USER_LEVEL_1 || roleCode === ROLES.USER_LEVEL_2) to = ROLES.PROJECT_MANAGER;
  else if (roleCode === ROLES.SUPPORT) to = ROLES.OWNER;
  else if (roleCode === ROLES.PROJECT_MANAGER) to = ROLES.ADMIN;
  else if (roleCode === ROLES.ADMIN) to = ROLES.OWNER;
  else if (roleCode === ROLES.OWNER || roleCode === ROLES.ROOT) to = ROLES.PROJECT_MANAGER;
  else to = ROLES.PROJECT_MANAGER;

  if (isDemo){
    state.demo.invoices.push({
      id: `inv-${Date.now()}`,
      node_number: node.node_number,
      from: roleCode,
      to,
      status: "Draft",
      amount_hidden: false,
    });
    toast("Invoice created", `${formatRoleLabel(roleCode)} -> ${formatRoleLabel(to)} (demo). Visibility depends on role.`);
    renderInvoicePanel();
    return;
  }

  if (roleCode === ROLES.USER_LEVEL_1 || roleCode === ROLES.USER_LEVEL_2){
    const { error } = await state.client
      .from("sub_invoices")
      .insert({ node_id: node.id, status: "Draft" });
    if (error){
      toast("Invoice error", error.message);
      return;
    }
  } else if (roleCode === ROLES.PROJECT_MANAGER || roleCode === ROLES.OWNER || roleCode === ROLES.ADMIN || roleCode === ROLES.SUPPORT || roleCode === ROLES.ROOT){
    const { error } = await state.client
      .from("prime_invoices")
      .insert({ node_id: node.id, status: "Draft" });
    if (error){
      toast("Invoice error", error.message);
      return;
    }
  }
  await loadInvoices(node.id);
  toast("Invoice created", `${formatRoleLabel(roleCode)} -> ${formatRoleLabel(to)}. Visibility depends on role.`);
  renderInvoicePanel();
}

async function initAuth(){
  setAppModeUI();
  setEnvWarning();

  state.storageAvailable = storageOk();
  if (!state.storageAvailable && !isDemo){
    showAuth(true);
    setWhoami();
    showStorageBlockedWarning();
    return;
  }

  if (appMode === "real" && !hasSupabaseConfig){
    showAuth(true);
    setWhoami();
    setAuthButtonsDisabled(false);
  }

  try{
    const env = await loadRuntimeEnv();
    if (!env?.SUPABASE_URL || !env?.SUPABASE_ANON_KEY){
      throw new Error("Missing Supabase env");
    }
  } catch (err){
    console.warn("Runtime env load failed", err);
  }

  state.client = await makeClient();
  if (!state.client){
    showAuth(true);
    setAuthButtonsDisabled(false);
    return;
  }
  supabase = state.client;
  setAuthButtonsDisabled(false);
  window.addEventListener("online", () => syncPendingSites());
  SpecCom.helpers.applyAuthModeFromHash();
  window.addEventListener("hashchange", () => SpecCom.helpers.applyAuthModeFromHash());

  if (window.location.pathname.endsWith("/demo-login")){
    await demoLogin();
  }

  // Demo: choose role via prompt for now
    if (isDemo){
      ensureDemoSeed();
      showAuth(false);
      const pick = prompt(`Demo mode: choose a role (${APP_ROLE_OPTIONS.join(", ")})`, state.demo.role) || state.demo.role;
      const normalized = normalizeRole(pick);
      state.demo.role = normalized;
      await loadProjects();
      await loadProjectNodes(state.activeProject?.id || null);
      await loadProjectSites(state.activeProject?.id || null);
      await loadUnitTypes();
      await loadWorkCodes();
      await loadRateCards(state.activeProject?.id || null);
      await loadLocationProofRequirements(state.activeProject?.id || null);
      await loadBillingLocations(state.activeProject?.id || null);
      await loadMaterialCatalog();
    setWhoami();
    setRoleUI();
    renderLocations();
    renderInventory();
    renderInvoicePanel();
    renderAllowedQuantities();
    renderAlerts();
    renderProofChecklist();
    renderBillingLocations();
    updateKPI();
    setProofStatus();
      renderCatalogResults("catalogResults", "");
      renderCatalogResults("catalogResultsQuick", "");
      setActiveView(getDefaultView());
      return;
    }

  // Supabase session
  const { data } = await state.client.auth.getSession();
  state.session = data.session;
  state.user = data.session?.user || null;

  state.client.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    state.user = session?.user || null;
    await loadProfile(state.client, state.user?.id);
    setWhoami();
      if (state.user) {
        showAuth(false);
        await loadProjects();
        await loadProjectNodes(state.activeProject?.id || null);
        await loadProjectSites(state.activeProject?.id || null);
        await loadUnitTypes();
        await loadWorkCodes();
        await loadRateCards(state.activeProject?.id || null);
        await loadLocationProofRequirements(state.activeProject?.id || null);
        await loadBillingLocations(state.activeProject?.id || null);
        await loadMaterialCatalog();
      await loadAlerts();
      renderAlerts();
      renderCatalogResults("catalogResults", "");
        renderCatalogResults("catalogResultsQuick", "");
        renderBillingLocations();
        setActiveView(getDefaultView());
        startLocationPolling();
        syncPendingSites();
      } else {
        showAuth(true);
        state.activeNode = null;
        state.usageEvents = [];
        clearProof();
      showProfileSetupModal(false);
      stopLocationWatch();
      stopLocationPolling();
      if (state.realtime.usageChannel){
        state.client.removeChannel(state.realtime.usageChannel);
        state.realtime.usageChannel = null;
      }
    }
  });

    await loadProfile(state.client, state.user?.id);
    if (state.user){
      await loadProjects();
      await loadProjectNodes(state.activeProject?.id || null);
      await loadProjectSites(state.activeProject?.id || null);
      await loadUnitTypes();
      await loadWorkCodes();
      await loadRateCards(state.activeProject?.id || null);
      await loadLocationProofRequirements(state.activeProject?.id || null);
      await loadBillingLocations(state.activeProject?.id || null);
      await loadMaterialCatalog();
    await loadAlerts();
    renderAlerts();
    renderCatalogResults("catalogResults", "");
      renderCatalogResults("catalogResultsQuick", "");
      renderBillingLocations();
      setActiveView(getDefaultView());
      startLocationPolling();
      syncPendingSites();
    }
  setWhoami();
  showAuth(!state.user);
  setProofStatus();
}

async function loadProfile(client, userId){
  if (isDemo) return;

  if (!client || !userId){
    state.profile = null;
    return;
  }

  // Expect a public.profiles row keyed by auth.uid()
  let { data, error } = await client
    .from("profiles")
    .select("role, role_code, display_name, preferred_language, is_demo, current_project_id")
    .eq("id", userId)
    .maybeSingle();

  if (error){
    const message = String(error.message || "").toLowerCase();
    if (message.includes("does not exist")){
      ({ data, error } = await client
        .from("profiles")
        .select("role, role_code, display_name")
        .eq("id", userId)
        .maybeSingle());
    }
  }

  if (error){
    toast("Profile error", error.message);
    state.profile = null;
    return;
  }
  state.profile = data || null;
  if (state.profile){
    state.profile.role = normalizeRole(state.profile.role);
  }
  window.currentUserProfile = state.profile;
  if (state.profile?.preferred_language){
    setPreferredLanguage(state.profile.preferred_language);
  }
  syncLanguageControls();
  showProfileSetupModal(!state.profile || !state.profile.preferred_language);
  setRoleUI();
  setDemoBadge();
  applyDemoRestrictions();
  renderInvoicePanel();
  updateProjectScopedControls();
  renderLocations();
}

async function demoLogin(){
  if (isDemo) return;
  if (!state.client) return;
  const creds = getDemoCredentials();
  if (!creds.password){
    toast("Demo login unavailable", "Set DEMO_PASSWORD to enable demo login.");
    return;
  }
  const { error } = await state.client.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });
  if (error){
    toast("Demo login failed", error.message);
  } else {
    toast("Demo session", t("demoLoginNote"));
  }
}

let uiWired = false;
const emailInput = $("email");
const passwordInput = $("password");

function showToast(message){
  toast("Sign-in", message);
}

async function postLoginBootstrap(client, user){
  state.client = client;
  state.user = user || state.user;
  await loadProfile(client, state.user?.id);
  if (state.user){
    showAuth(false);
    await loadProjects();
    await loadProjectNodes(state.activeProject?.id || null);
    await loadProjectSites(state.activeProject?.id || null);
    await loadUnitTypes();
    await loadWorkCodes();
    await SpecCom.helpers.loadOrgs();
    await loadRateCards(state.activeProject?.id || null);
    await loadLocationProofRequirements(state.activeProject?.id || null);
    await loadBillingLocations(state.activeProject?.id || null);
    await SpecCom.helpers.loadYourInvoices(state.activeProject?.id || null);
    await loadMaterialCatalog();
    await loadAlerts();
    renderAlerts();
    renderCatalogResults("catalogResults", "");
    renderCatalogResults("catalogResultsQuick", "");
    renderBillingLocations();
    setActiveView(getDefaultView());
    startLocationPolling();
    syncPendingSites();
  }
  setWhoami();
}

function navigateToApp(){
  showAuth(false);
}

async function handleSignIn(e) {
  e?.preventDefault?.();

  dlog("SIGN IN CLICKED");

  const client = await supabaseReady;

  if (!client) {
    showToast("Supabase client unavailable");
    return;
  }

  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    showToast(error.message);
    return;
  }

  // IMPORTANT: data.session is the truth
  if (!data?.session) {
    showToast("No session returned");
    return;
  }

  // Success path
  dlog("Logged in:", data.user.email);

  await postLoginBootstrap(client, data.user); // projects, profile, etc.
  navigateToApp(); // or window.location = "/"
}

function wireUI(){
  if (uiWired) return;
  uiWired = true;
  applyDrawerStateFromStorage();
  initMapWorkspaceUi();
  window.addEventListener("resize", () => {
    applyDrawerUiState();
    queueMapInvalidate(120);
  });
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.view));
  });
  syncDispatchStatusFilter();

  const nodeCards = $("nodeCards");
  if (nodeCards){
    nodeCards.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!id) return;
      if (action === "openNode"){
        startNode(id);
      } else if (action === "completeNode"){
        completeNode(id);
      } else if (action === "editNode"){
        editNodeMeta(id);
      } else if (action === "deleteNode"){
        deleteNode(id);
      }
    });
  }

  const billingView = $("viewBilling");
  if (billingView){
    billingView.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      if (!action) return;
      if (action === "openBilling"){
        openBillingLocation(btn.dataset.id);
        return;
      }
      if (action === "buildInvoiceStatus"){
        await updateInvoiceStatus();
        return;
      }
      if (action === "ownerOverride"){
        const panel = $("ownerOverridePanel");
        if (panel){
          const isHidden = panel.style.display === "none";
          panel.style.display = isHidden ? "" : "none";
          if (isHidden){
            const nodeId = state.billingLocation?.node_id;
            if (nodeId) await loadOwnerOverrides(nodeId);
          }
        }
        return;
      }
      if (action === "applyOwnerOverride"){
        const overrideType = $("ownerOverrideType")?.value || "";
        const reason = $("ownerOverrideReason")?.value || "";
        if (!String(reason).trim()){
          toast("Reason required", "Provide a reason for the override.");
          return;
        }
        await createOwnerOverride(overrideType, reason);
        const panel = $("ownerOverridePanel");
        if (panel) panel.style.display = "none";
        renderBillingDetail();
        return;
      }
      if (action === "addLineItem"){
        addBillingItem();
        return;
      }
      if (action === "billingSave"){
        await saveBillingInvoice();
        return;
      }
      if (action === "billingReady"){
        if (!hasBillableItems(state.billingItems)){
          toast("Missing items", "Add at least one line item with qty.");
          return;
        }
        await markInvoiceReady();
      }
    });
  }

  const adminList = $("adminUsersList");
  if (adminList){
    adminList.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!id) return;
      if (action === "adminUpdateUser"){
        updateAdminProfile(id);
      } else if (action === "adminDeleteUser"){
        deleteAdminProfile(id);
      }
    });
  }

  const importBtn = $("btnImportUsage");
  if (importBtn){
    importBtn.addEventListener("click", () => importUsageToInvoice());
  }
  const exportBtn = $("btnBillingExportCsv");
  if (exportBtn){
    exportBtn.addEventListener("click", () => exportInvoiceCsv());
  }
  const printBtn = $("btnBillingPrint");
  if (printBtn){
    printBtn.addEventListener("click", () => printInvoice());
  }
  const laborExportBtn = $("btnLaborExportCsv");
  if (laborExportBtn){
    laborExportBtn.addEventListener("click", () => exportLaborCsv());
  }

  const techClockInBtn = $("btnTechClockIn");
  if (techClockInBtn){
    techClockInBtn.addEventListener("click", () => startTechnicianTimesheet());
  }
  const techClockOutBtn = $("btnTechClockOut");
  if (techClockOutBtn){
    techClockOutBtn.addEventListener("click", () => endTechnicianTimesheet());
  }
  const techStartBtn = $("btnTechStartJob");
  if (techStartBtn){
    techStartBtn.addEventListener("click", () => logTechnicianEvent("START_JOB"));
  }
  const techPauseBtn = $("btnTechPauseJob");
  if (techPauseBtn){
    techPauseBtn.addEventListener("click", () => logTechnicianEvent("PAUSE_JOB"));
  }
  const techLunchBtn = $("btnTechLunch");
  if (techLunchBtn){
    techLunchBtn.addEventListener("click", () => logTechnicianEvent("LUNCH"));
  }
  const techBreakBtn = $("btnTechBreak");
  if (techBreakBtn){
    techBreakBtn.addEventListener("click", () => logTechnicianEvent("BREAK_15"));
  }
  const techInspectBtn = $("btnTechTruckInspection");
  if (techInspectBtn){
    techInspectBtn.addEventListener("click", () => logTechnicianEvent("TRUCK_INSPECTION"));
  }
  const techEndBtn = $("btnTechEndJob");
  if (techEndBtn){
    techEndBtn.addEventListener("click", () => logTechnicianEvent("END_JOB"));
  }

  const techOrdersToday = $("techWorkOrdersToday");
  if (techOrdersToday){
    techOrdersToday.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (!id || !action) return;
      if (action === "woEnRoute") updateWorkOrderStatus(id, "EN_ROUTE");
      else if (action === "woOnSite") updateWorkOrderStatus(id, "ON_SITE");
      else if (action === "woStart") startWorkOrder(id);
      else if (action === "woBlocked") reportNoAccess(id);
      else if (action === "woComplete") completeWorkOrder(id);
    });
  }
  const techOrdersTomorrow = $("techWorkOrdersTomorrow");
  if (techOrdersTomorrow){
    techOrdersTomorrow.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (!id || !action) return;
      if (action === "woEnRoute") updateWorkOrderStatus(id, "EN_ROUTE");
      else if (action === "woOnSite") updateWorkOrderStatus(id, "ON_SITE");
      else if (action === "woStart") startWorkOrder(id);
      else if (action === "woBlocked") reportNoAccess(id);
      else if (action === "woComplete") completeWorkOrder(id);
    });
  }

  const dispatchCreateBtn = $("btnDispatchCreate");
  if (dispatchCreateBtn){
    dispatchCreateBtn.addEventListener("click", () => openDispatchModal());
  }
  const dispatchCancelBtn = $("btnDispatchCancel");
  if (dispatchCancelBtn){
    dispatchCancelBtn.addEventListener("click", () => closeDispatchModal());
  }
  const dispatchSaveBtn = $("btnDispatchSave");
  if (dispatchSaveBtn){
    dispatchSaveBtn.addEventListener("click", () => saveDispatchWorkOrder());
  }
  const dispatchImportBtn = $("btnDispatchImportCsv");
  const dispatchCsvInput = $("dispatchCsvInput");
  if (dispatchImportBtn && dispatchCsvInput){
    dispatchImportBtn.addEventListener("click", () => dispatchCsvInput.click());
    dispatchCsvInput.addEventListener("change", () => {
      if (dispatchCsvInput.files?.length){
        importDispatchCsv(dispatchCsvInput.files[0]);
        dispatchCsvInput.value = "";
      }
    });
  }
  const dispatchDateFilter = $("dispatchDateFilter");
  if (dispatchDateFilter){
    dispatchDateFilter.addEventListener("change", () => loadDispatchWorkOrders());
  }
  const dispatchStatusFilter = $("dispatchStatusFilter");
  if (dispatchStatusFilter){
    dispatchStatusFilter.addEventListener("change", () => loadDispatchWorkOrders());
  }
  const dispatchAssignFilter = $("dispatchAssignFilter");
  if (dispatchAssignFilter){
    dispatchAssignFilter.addEventListener("change", () => loadDispatchWorkOrders());
  }
  const dispatchTable = $("dispatchTable");
  if (dispatchTable){
    dispatchTable.addEventListener("change", (e) => {
      const select = e.target.closest("select");
      if (!select) return;
      if (select.dataset.action !== "assignWorkOrder") return;
      const id = select.dataset.id;
      const userId = select.value || null;
      if (!id) return;
      if (!userId){
        state.client.from("work_orders").update({ assigned_to_user_id: null }).eq("id", id);
        return;
      }
      state.client.rpc("fn_assign_work_order", { work_order_id: id, technician_user_id: userId });
    });
    dispatchTable.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      if (btn.dataset.action !== "editWorkOrder") return;
      const id = btn.dataset.id;
      const row = (state.workOrders.dispatch || []).find(r => r.id === id);
      if (row) openDispatchModal(row);
    });
  }

  const signOutBtn = $("btnSignOut");
  if (signOutBtn){
    signOutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await SpecCom.helpers.handleSignOut();
    });
  }

  $("btnSignIn")?.addEventListener("click", (e) => {
    e.preventDefault();
    handleSignIn();
  });
  const authForm = $("authForm");
  if (authForm){
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSignIn();
    });
  }
  const forgotBtn = $("btnForgotPassword");
  if (forgotBtn){
    forgotBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await SpecCom.helpers.handleForgotPassword();
    });
  }
  const resetBtn = $("btnResetPassword");
  if (resetBtn){
    resetBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await SpecCom.helpers.handleResetSubmit();
    });
  }

  const btnMagic = $("btnMagicLink");
  if (btnMagic){
    btnMagic.addEventListener("click", async () => {
      if (isDemo) return;
      if (!ensureStorageAvailable()) return;
      const email = $("email").value.trim();
      if (!email){
        toast("Email needed", "Enter your email address first.");
        return;
      }
      const { error } = await state.client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) toast("Magic link failed", error.message);
      else toast("Magic link sent", "Check your email to finish sign-in.");
    });
  }

  $("btnSignUp").addEventListener("click", async () => {
    if (isDemo) return;
    if (!ensureStorageAvailable()) return;
    const email = $("email").value.trim();
    if (!email){
      toast("Email needed", "Enter your email address first.");
      return;
    }
    const { error } = await state.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) toast("Invite failed", error.message);
    else toast("Invite sent", "Magic link sent. User is created on first login.");
  });

  const demoLoginBtn = $("btnDemoLogin");
  if (demoLoginBtn){
    demoLoginBtn.addEventListener("click", async () => {
      await demoLogin();
    });
  }

  const signInBtn = $("btnSignIn");
  const emailInput = $("email");
  const passwordInput = $("password");
  const forceEnableSignIn = () => {
    if (signInBtn) signInBtn.disabled = false;
  };
  if (emailInput) emailInput.addEventListener("input", forceEnableSignIn);
  if (passwordInput) passwordInput.addEventListener("input", forceEnableSignIn);
  if (signInBtn) signInBtn.disabled = false;

  const catalogSearch = $("catalogSearch");
  if (catalogSearch){
    catalogSearch.addEventListener("input", (e) => {
      renderCatalogResults("catalogResults", e.target.value);
    });
  }
  const catalogSearchQuick = $("catalogSearchQuick");
  if (catalogSearchQuick){
    catalogSearchQuick.addEventListener("input", (e) => {
      renderCatalogResults("catalogResultsQuick", e.target.value);
    });
  }
  const catalogClear = $("btnCatalogClear");
  if (catalogClear){
    catalogClear.addEventListener("click", () => {
      if (catalogSearch) catalogSearch.value = "";
      renderCatalogResults("catalogResults", "");
    });
  }

  const btnOpenNode = $("btnOpenNode");
  if (btnOpenNode){
    btnOpenNode.addEventListener("click", () => openNode($("nodeNumber").value));
  }
  const btnNewNode = $("btnNewNode");
  if (btnNewNode){
    btnNewNode.addEventListener("click", () => createNode($("nodeNumber").value));
  }

  const btnAdminCreate = $("btnAdminCreateUser");
  if (btnAdminCreate){
    btnAdminCreate.addEventListener("click", () => createAdminProfile());
  }

  const projectsBtn = $("btnProjects");
  if (projectsBtn){
    projectsBtn.addEventListener("click", () => openProjectsModal());
  }
  const mapToggleBtn = $("btnMapToggle");
  if (mapToggleBtn){
    mapToggleBtn.addEventListener("click", () => toggleMapPanel());
  }
  const projectsOpenBtn = $("btnOpenProjects");
  if (projectsOpenBtn){
    projectsOpenBtn.addEventListener("click", () => openProjectsModal());
  }
  const projectsCloseBtn = $("btnProjectsClose");
  if (projectsCloseBtn){
    projectsCloseBtn.addEventListener("click", () => closeProjectsModal());
  }
  const projectsCreateBtn = $("btnProjectsCreate");
  if (projectsCreateBtn){
    projectsCreateBtn.addEventListener("click", () => {
      closeProjectsModal();
      openCreateProjectModal();
    });
  }
  const projectsEmptyCreateBtn = $("btnProjectsEmptyCreate");
  if (projectsEmptyCreateBtn){
    projectsEmptyCreateBtn.addEventListener("click", () => {
      closeProjectsModal();
      openCreateProjectModal();
    });
  }
  const messagesBtn = $("btnMessages");
  if (messagesBtn){
    messagesBtn.addEventListener("click", () => openMessagesModal());
  }
  const messagesCloseBtn = $("btnMessagesClose");
  if (messagesCloseBtn){
    messagesCloseBtn.addEventListener("click", () => closeMessagesModal());
  }
  const sendMessageBtn = $("btnSendMessage");
  if (sendMessageBtn){
    sendMessageBtn.addEventListener("click", () => sendMessage());
  }
  const messageInput = $("messageInput");
  if (messageInput){
    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey){
        e.preventDefault();
        sendMessage();
      }
    });
  }
  const messageMode = $("messageMode");
  if (messageMode){
    messageMode.addEventListener("change", () => syncMessageComposerMode());
  }
  const messageFilters = document.querySelectorAll("#messagesModal [data-filter]");
  messageFilters.forEach((btn) => {
    btn.addEventListener("click", () => setMessagesFilter(btn.dataset.filter || "board"));
  });
  setMessagesFilter(state.messageFilter);
  const menuBtn = $("btnMenu");
  if (menuBtn){
    menuBtn.addEventListener("click", () => {
      const modal = $("menuModal");
      const isOpen = modal && modal.style.display !== "none";
      if (isOpen) closeMenuModal();
      else openMenuModal();
    });
  }
  const menuCloseBtn = $("btnMenuClose");
  if (menuCloseBtn){
    menuCloseBtn.addEventListener("click", () => closeMenuModal());
  }
  const grantAccessBtn = $("btnGrantProjectAccess");
  if (grantAccessBtn){
    grantAccessBtn.addEventListener("click", () => {
      closeMenuModal();
      openGrantAccessModal();
    });
  }
  const importPriceBtn = $("btnImportPriceSheet");
  if (importPriceBtn){
    importPriceBtn.addEventListener("click", () => {
      closeMenuModal();
      openPriceSheetModal();
    });
  }
  const stakingProjectBtn = $("btnCreateProjectFromStaking");
  if (stakingProjectBtn){
    stakingProjectBtn.addEventListener("click", () => {
      closeMenuModal();
      openStakingProjectModal();
    });
  }
  const testResultsBtn = $("btnImportTestResults");
  if (testResultsBtn){
    testResultsBtn.addEventListener("click", () => {
      closeMenuModal();
      openTestResultsModal();
    });
  }
  document.querySelectorAll(".menu-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const viewId = btn.dataset.view;
      if (!viewId) return;
      setActiveView(viewId);
      closeMenuModal();
    });
  });
  document.querySelectorAll("#menuModal .segmented-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang") || "en";
      savePreferredLanguage(lang);
      refreshLanguageSensitiveUI();
      syncMenuLanguageToggle();
    });
  });

  const createProjectCancelBtn = $("btnCreateProjectCancel");
  if (createProjectCancelBtn){
    createProjectCancelBtn.addEventListener("click", () => closeCreateProjectModal());
  }
  const createProjectSaveBtn = $("btnCreateProjectSave");
  if (createProjectSaveBtn){
    createProjectSaveBtn.addEventListener("click", () => createProject());
  }
  const deleteProjectCancelBtn = $("btnDeleteProjectCancel");
  if (deleteProjectCancelBtn){
    deleteProjectCancelBtn.addEventListener("click", () => closeDeleteProjectModal());
  }
  const deleteProjectConfirmBtn = $("btnDeleteProjectConfirm");
  if (deleteProjectConfirmBtn){
    deleteProjectConfirmBtn.addEventListener("click", () => deleteProject());
  }
  const dprProjectSelect = $("dprProjectSelect");
  if (dprProjectSelect){
    dprProjectSelect.addEventListener("change", () => loadDailyProgressReport());
  }
  const dprDate = $("dprDate");
  if (dprDate){
    if (!dprDate.value) dprDate.value = getTodayDate();
    state.dpr.reportDate = dprDate.value;
    dprDate.addEventListener("change", () => loadDailyProgressReport());
  }
  const dprRefreshBtn = $("btnDprRefresh");
  if (dprRefreshBtn){
    dprRefreshBtn.addEventListener("click", () => generateDailyProgressReport());
  }
  const dprSaveBtn = $("btnDprSave");
  if (dprSaveBtn){
    dprSaveBtn.addEventListener("click", () => saveDailyProgressComments());
  }
  const languageSelect = $("languageSelect");
  if (languageSelect){
    languageSelect.addEventListener("change", (e) => {
      setPreferredLanguage(e.target.value);
      refreshLanguageSensitiveUI();
    });
  }
  const saveLanguageBtn = $("btnSaveLanguage");
  if (saveLanguageBtn){
    saveLanguageBtn.addEventListener("click", () => {
      savePreferredLanguage($("languageSelect")?.value || "en");
    });
  }
  const profileLanguageBtn = $("btnSaveProfileLanguage");
  if (profileLanguageBtn){
    profileLanguageBtn.addEventListener("click", () => {
      const value = $("profileLanguageSelect")?.value || "en";
      savePreferredLanguage(value, { closeModal: true });
    });
  }
  const mapActiveOnly = $("mapActiveOnly");
  if (mapActiveOnly){
    mapActiveOnly.addEventListener("change", (e) => {
      state.mapFilters.activeOnly = e.target.checked;
      refreshLocations();
    });
  }
  const mapSearch = $("mapSearch");
  if (mapSearch){
    mapSearch.addEventListener("input", (e) => {
      state.mapFilters.search = e.target.value || "";
      scheduleLocationSearchRefresh({ syncMap: true });
    });
    mapSearch.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      focusFirstSearchResult();
    });
  }
  const clearMapSearchBtn = $("btnClearMapSearch");
  if (clearMapSearchBtn){
    clearMapSearchBtn.addEventListener("click", () => clearLocationSearch());
  }
  registerMapUiBindings();
  const dropPinBtn = $("btnDropPin");
  if (dropPinBtn){
    dropPinBtn.addEventListener("click", () => dropPin());
  }
  const importLocationsBtn = $("btnImportLocations");
  const importLocationsInput = $("importLocationsInput");
  if (importLocationsBtn && importLocationsInput){
    importLocationsBtn.addEventListener("click", () => {
      importLocationsInput.click();
    });
    importLocationsInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0] || null;
      await handleLocationImport(file);
      e.target.value = "";
    });
  }
  const invoiceAgentBtn = $("btnInvoiceAgent");
  if (invoiceAgentBtn){
    invoiceAgentBtn.addEventListener("click", () => SpecCom.helpers.openInvoiceAgentModal());
  }
  const siteList = $("siteList");
  if (siteList){
    siteList.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-site-id]");
      if (!btn) return;
      const siteId = btn.dataset.siteId;
      dlog("siteList click", { siteId });
      await setActiveSite(siteId);
      focusSiteOnMap(siteId);
    });
  }
  const closePanelBtn = $("btnCloseSitePanel");
  if (closePanelBtn){
    closePanelBtn.addEventListener("click", () => closeSitePanel());
  }
  const importCloseBtn = $("btnImportLocationsClose");
  if (importCloseBtn){
    importCloseBtn.addEventListener("click", () => closeImportLocationsModal());
  }
  const importCancelBtn = $("btnImportLocationsCancel");
  if (importCancelBtn){
    importCancelBtn.addEventListener("click", () => closeImportLocationsModal());
  }
  const importConfirmBtn = $("btnImportLocationsConfirm");
  if (importConfirmBtn){
    importConfirmBtn.addEventListener("click", () => confirmImportLocations());
  }
  const importTemplateBtn = $("btnImportLocationsTemplate");
  if (importTemplateBtn){
    importTemplateBtn.addEventListener("click", () => downloadLocationImportTemplate());
  }
  const importErrorsBtn = $("btnImportLocationsErrors");
  if (importErrorsBtn){
    importErrorsBtn.addEventListener("click", () => downloadLocationImportErrorReport());
  }
  const grantAccessCloseBtn = $("btnGrantAccessClose");
  if (grantAccessCloseBtn){
    grantAccessCloseBtn.addEventListener("click", () => closeGrantAccessModal());
  }
  const grantAccessCancelBtn = $("btnGrantAccessCancel");
  if (grantAccessCancelBtn){
    grantAccessCancelBtn.addEventListener("click", () => closeGrantAccessModal());
  }
  const grantAccessConfirmBtn = $("btnGrantAccessConfirm");
  if (grantAccessConfirmBtn){
    grantAccessConfirmBtn.addEventListener("click", () => confirmGrantAccess());
  }
  const priceSheetCloseBtn = $("btnPriceSheetClose");
  if (priceSheetCloseBtn){
    priceSheetCloseBtn.addEventListener("click", () => closePriceSheetModal());
  }
  const priceSheetCancelBtn = $("btnPriceSheetCancel");
  if (priceSheetCancelBtn){
    priceSheetCancelBtn.addEventListener("click", () => closePriceSheetModal());
  }
  const priceSheetConfirmBtn = $("btnPriceSheetConfirm");
  if (priceSheetConfirmBtn){
    priceSheetConfirmBtn.addEventListener("click", () => confirmImportPriceSheet());
  }
  const stakingProjectCloseBtn = $("btnStakingProjectClose");
  if (stakingProjectCloseBtn){
    stakingProjectCloseBtn.addEventListener("click", () => closeStakingProjectModal());
  }
  const stakingProjectCancelBtn = $("btnStakingProjectCancel");
  if (stakingProjectCancelBtn){
    stakingProjectCancelBtn.addEventListener("click", () => closeStakingProjectModal());
  }
  const stakingProjectConfirmBtn = $("btnStakingProjectConfirm");
  if (stakingProjectConfirmBtn){
    stakingProjectConfirmBtn.addEventListener("click", () => confirmCreateProjectFromStaking());
  }
  const testResultsCloseBtn = $("btnTestResultsClose");
  if (testResultsCloseBtn){
    testResultsCloseBtn.addEventListener("click", () => closeTestResultsModal());
  }
  const testResultsCancelBtn = $("btnTestResultsCancel");
  if (testResultsCancelBtn){
    testResultsCancelBtn.addEventListener("click", () => closeTestResultsModal());
  }
  const testResultsConfirmBtn = $("btnTestResultsConfirm");
  if (testResultsConfirmBtn){
    testResultsConfirmBtn.addEventListener("click", () => confirmImportTestResults());
  }
  const invoiceAgentCloseBtn = $("btnInvoiceAgentClose");
  if (invoiceAgentCloseBtn){
    invoiceAgentCloseBtn.addEventListener("click", () => SpecCom.helpers.closeInvoiceAgentModal());
  }
  const invoiceAgentCancelBtn = $("btnInvoiceAgentCancel");
  if (invoiceAgentCancelBtn){
    invoiceAgentCancelBtn.addEventListener("click", () => SpecCom.helpers.closeInvoiceAgentModal());
  }
  const invoiceAgentConfirmBtn = $("btnInvoiceAgentConfirm");
  if (invoiceAgentConfirmBtn){
    invoiceAgentConfirmBtn.addEventListener("click", () => SpecCom.helpers.confirmInvoiceAgentGenerate());
  }
  const invoiceImportBtn = $("btnInvoiceImport");
  const invoiceImportInput = $("invoiceImportInput");
  if (invoiceImportBtn && invoiceImportInput){
    invoiceImportBtn.addEventListener("click", () => invoiceImportInput.click());
    invoiceImportInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0] || null;
      try{
        const rows = await SpecCom.helpers.parseInvoiceSpreadsheet(file);
        const { preview, missing } = SpecCom.helpers.prepareInvoiceImportPreview(rows);
        state.invoiceAgent.importPreview = { preview, missing };
        SpecCom.helpers.renderInvoiceImportPreview();
      } catch (err){
        console.error(err);
        toast("Import failed", err.message || "Import failed.");
      } finally {
        e.target.value = "";
      }
    });
  }
  const invoiceImportExport = $("btnInvoiceImportExport");
  if (invoiceImportExport){
    invoiceImportExport.addEventListener("click", () => SpecCom.helpers.exportInvoiceImportCsv());
  }
  const invoiceImportApply = $("btnInvoiceImportApply");
  if (invoiceImportApply){
    invoiceImportApply.addEventListener("click", async () => {
      await SpecCom.helpers.applyInvoiceImport();
    });
  }
  const invoiceAgentSelectAll = $("invoiceAgentSelectAll");
  if (invoiceAgentSelectAll){
    invoiceAgentSelectAll.addEventListener("change", (e) => {
      const eligible = state.invoiceAgent.candidates.filter(c => c.eligible).map(c => c.id);
      state.invoiceAgent.selectedIds = e.target.checked ? eligible : [];
      SpecCom.helpers.renderInvoiceAgentModal();
    });
  }
  const invoiceAgentFromOrg = $("invoiceAgentFromOrg");
  if (invoiceAgentFromOrg){
    invoiceAgentFromOrg.addEventListener("change", () => SpecCom.helpers.renderInvoiceAgentModal());
  }
  const invoiceAgentToOrg = $("invoiceAgentToOrg");
  if (invoiceAgentToOrg){
    invoiceAgentToOrg.addEventListener("change", () => SpecCom.helpers.renderInvoiceAgentModal());
  }
  const invoiceAgentAllowDuplicates = $("invoiceAgentAllowDuplicates");
  if (invoiceAgentAllowDuplicates){
    invoiceAgentAllowDuplicates.addEventListener("change", (e) => {
      state.invoiceAgent.allowDuplicates = e.target.checked;
    });
  }
  const invoiceAgentList = $("invoiceAgentList");
  if (invoiceAgentList){
    invoiceAgentList.addEventListener("change", (e) => {
      const checkbox = e.target.closest("input[type='checkbox'][data-site-id]");
      if (!checkbox) return;
      const siteId = checkbox.dataset.siteId;
      if (!siteId) return;
      if (checkbox.checked){
        if (!state.invoiceAgent.selectedIds.includes(siteId)){
          state.invoiceAgent.selectedIds.push(siteId);
        }
      } else {
        state.invoiceAgent.selectedIds = state.invoiceAgent.selectedIds.filter(id => id !== siteId);
      }
      SpecCom.helpers.renderInvoiceAgentModal();
    });
  }
  const invoiceAgentResults = $("invoiceAgentResults");
  if (invoiceAgentResults){
    invoiceAgentResults.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const invoiceId = btn.dataset.invoiceId;
      const siteId = btn.dataset.siteId;
      if (!invoiceId) return;
      try{
        const { invoice, items } = await SpecCom.helpers.loadInvoiceAgentExportData(invoiceId);
        const site = state.invoiceAgent.siteMap.get(siteId) || null;
        if (action === "invoiceAgentExportCsv"){
          const csv = SpecCom.helpers.exportInvoiceAgentCsvPayload(invoice, site, items);
          downloadFile(`invoice-${invoice.invoice_number || invoice.id}.csv`, csv, "text/csv");
        }
        if (action === "invoiceAgentExportPdf"){
          SpecCom.helpers.printInvoiceAgentPayload(invoice, site, items);
        }
      } catch (err){
        console.error(err);
        toast("Export failed", err.message || "Unable to export invoice.");
      }
    });
  }
  const siteMediaInput = $("siteMediaInput");
  if (siteMediaInput){
    siteMediaInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0] || null;
      await addSiteMedia(file);
      e.target.value = "";
    });
  }
  const saveSiteNameBtn = $("btnSaveSiteName");
  if (saveSiteNameBtn){
    saveSiteNameBtn.addEventListener("click", () => saveSiteName());
  }
  const saveCodesBtn = $("btnSaveCodes");
  if (saveCodesBtn){
    saveCodesBtn.addEventListener("click", () => saveSiteCodes());
  }
  const addEntryBtn = $("btnAddEntry");
  if (addEntryBtn){
    addEntryBtn.addEventListener("click", () => addSiteEntry());
  }
  const saveNotesBtn = $("btnSaveNotes");
  if (saveNotesBtn){
    saveNotesBtn.addEventListener("click", () => saveSiteNotes());
  }
  const btnAddLocation = $("btnAddLocation");
  if (btnAddLocation){
    btnAddLocation.addEventListener("click", () => addSpliceLocation());
  }

  const startCameraBtn = $("btnStartCamera");
  if (startCameraBtn){
    startCameraBtn.addEventListener("click", () => startCamera());
  }
  const startCameraNodesBtn = $("btnStartCameraNodes");
  if (startCameraNodesBtn){
    startCameraNodesBtn.addEventListener("click", () => startCamera());
  }

  const photoBtn = $("btnCapturePhoto");
  if (photoBtn){
    photoBtn.addEventListener("click", () => captureUsageProof());
  }

  const backfillPortInput = $("backfillPortInput");
  if (backfillPortInput){
    backfillPortInput.addEventListener("change", async (e) => {
      await handleBackfillPhotoUpload("port_test", e.target.files?.[0] || null);
      e.target.value = "";
    });
  }
  const backfillSpliceInput = $("backfillSpliceInput");
  if (backfillSpliceInput){
    backfillSpliceInput.addEventListener("change", async (e) => {
      await handleBackfillPhotoUpload("splice_complete", e.target.files?.[0] || null);
      e.target.value = "";
    });
  }

  const btnMarkNodeReady = $("btnMarkNodeReady");
  if (btnMarkNodeReady){
    btnMarkNodeReady.addEventListener("click", () => markNodeReady());
  }
  const btnCreateInvoice = $("btnCreateInvoice");
  if (btnCreateInvoice){
    btnCreateInvoice.addEventListener("click", () => createInvoice());
  }

  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action=\"toggleTranslation\"]");
    if (!btn) return;
    const block = btn.closest(".translated-text");
    if (!block) return;
    const valueEl = block.querySelector(".translated-value");
    const translated = block.dataset.translatedText || "";
    const source = block.getAttribute("data-source-text") || "";
    if (!valueEl) return;
    if (block.dataset.showing === "translated"){
      valueEl.textContent = source;
      block.dataset.showing = "original";
      btn.textContent = t("viewTranslation");
    } else {
      valueEl.textContent = translated || source;
      block.dataset.showing = "translated";
      btn.textContent = t("viewOriginal");
    }
  });
}

startVisibilityWatch();
window.addEventListener("DOMContentLoaded", wireUI);
wireUI();
applyI18n();
syncLanguageControls();
initAuth();

