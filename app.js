import { appMode, hasSupabaseConfig, isDemo, makeClient } from "./supabaseClient.js";

const $ = (id) => document.getElementById(id);

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
  pendingSites: [],
  billingLocations: [],
  billingLocation: null,
  billingInvoice: null,
  billingItems: [],
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
  adminProfiles: [],
  locationWatchId: null,
  locationPollId: null,
  map: {
    instance: null,
    markers: new Map(),
    userNames: new Map(),
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
  labor: {
    rows: [],
  },
  mapFilters: {
    activeOnly: true,
    search: "",
  },
  storageUrlCache: new Map(),
  realtime: {
    usageChannel: null,
  },
  demo: {
    roles: ["ADMIN", "OWNER", "PRIME", "TDS", "SUB", "SPLICER", "TECHNICIAN"],
    role: "SPLICER",
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
  },
};

const WORK_ORDER_TYPES = ["INSTALL", "TROUBLE_TICKET", "MAINTENANCE", "SURVEY"];
const WORK_ORDER_STATUSES = ["NEW", "ASSIGNED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "BLOCKED", "COMPLETE", "CANCELED"];

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
    pricingHidden: "Pricing hidden from splicers",
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
      mapSearchPlaceholder: "Search by name",
      dropPin: "Drop Pin",
      siteListTitle: "Sites",
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
      pinDroppedBody: "Site created from GPS pin.",
      pinQueuedTitle: "Pin queued",
      pinQueuedBody: "Offline pin saved. Sync will run when online.",
      mediaTitle: "Media",
      mediaSubtitle: "Add images from camera or gallery.",
      addMedia: "Add media",
      codesTitle: "Codes",
      codesSubtitle: "Add one or more codes for this site.",
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
    subInvoicesLabel: "SUB invoices:",
    tdsInvoicesLabel: "TDS invoices:",
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
    pricingHiddenSplicer: "Pricing hidden (splicer view)",
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
    pricingHidden: "Precios ocultos para empalmadores",
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
      mapSearchPlaceholder: "Buscar por nombre",
      dropPin: "Colocar pin",
      siteListTitle: "Sitios",
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
      pinDroppedBody: "Sitio creado desde un pin GPS.",
      pinQueuedTitle: "Pin en cola",
      pinQueuedBody: "Pin sin conexión guardado. Se sincronizará al estar en línea.",
      mediaTitle: "Media",
      mediaSubtitle: "Agrega imágenes desde cámara o galería.",
      addMedia: "Agregar media",
      codesTitle: "Códigos",
      codesSubtitle: "Agrega uno o más códigos para este sitio.",
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
    subInvoicesLabel: "Facturas SUB:",
    tdsInvoicesLabel: "Facturas TDS:",
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
    pricingHiddenSplicer: "Precios ocultos (vista empalmador)",
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
  return lang === "es" ? "es" : "en";
}

function getPreferredLanguage(){
  const profileLang = window.currentUserProfile?.preferred_language || state.profile?.preferred_language;
  const stored = localStorage.getItem("preferred_language");
  return normalizeLanguage(profileLang || stored || "en");
}

function setPreferredLanguage(lang, { persist = true } = {}){
  const next = normalizeLanguage(lang);
  if (persist){
    localStorage.setItem("preferred_language", next);
  }
  if (state.profile){
    state.profile.preferred_language = next;
  }
  window.currentUserProfile = state.profile;
  applyI18n();
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

function toast(title, body){
  $("toastTitle").textContent = title;
  $("toastBody").textContent = body;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 4200);
}

function nowISO(){ return new Date().toISOString(); }

const DEFAULT_TERMINAL_PORTS = 2;
const MAX_TERMINAL_PORTS = 8;
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

function getRuntimeEnv(){
  return window.__ENV__ || window.__ENV || window.ENV || {};
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

function requiredSlotsForPorts(ports){
  const count = normalizeTerminalPorts(ports);
  const slots = [];
  for (let i = 1; i <= count; i += 1){
    slots.push(`port_${i}`);
  }
  slots.push("splice_completion");
  return slots;
}

function getSlotLabel(slotKey){
  if (slotKey === "splice_completion") return "Splice completion";
  const match = String(slotKey || "").match(/^port_(\d+)$/);
  if (match) return `Port ${match[1]}`;
  return slotKey;
}

function getRequiredSlotsForLocation(loc){
  return requiredSlotsForPorts(loc?.terminal_ports ?? DEFAULT_TERMINAL_PORTS);
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
  return { uploaded, required: required.length };
}

function hasAllRequiredSlotPhotos(loc){
  const photos = loc?.photosBySlot || {};
  if (SINGLE_PROOF_PHOTO_MODE){
    return Object.keys(photos).length > 0;
  }
  const required = getRequiredSlotsForLocation(loc);
  return required.length > 0 && required.every((slot) => Boolean(photos[slot]));
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
  if (photoType === "splice_complete") return "splice_completion";
  const photos = loc?.photosBySlot || {};
  const requiredPorts = getRequiredSlotsForLocation(loc).filter(slot => slot.startsWith("port_"));
  const missingRequired = requiredPorts.find(slot => !photos[slot]);
  if (missingRequired) return missingRequired;
  for (let i = 1; i <= MAX_TERMINAL_PORTS; i += 1){
    const slot = `port_${i}`;
    if (!photos[slot]) return slot;
  }
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
    banner.textContent = "Live mode configuration is required before using the app.";
  } else {
    banner.style.display = "none";
    banner.textContent = "";
  }
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
    loadTechnicianTimesheet();
  }
  if (viewId === "viewDispatch"){
    loadDispatchTechnicians();
    loadDispatchWorkOrders();
  }
  if (viewId === "viewLabor"){
    loadLaborRows();
  }
  if (viewId === "viewMap"){
    ensureMap();
    if (state.map.instance){
      setTimeout(() => state.map.instance.invalidateSize(), 50);
    }
    refreshLocations();
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

function ensureMap(){
  if (state.map.instance || !window.L) return;
  const mapEl = $("liveMap");
  if (!mapEl) return;
  const map = window.L.map(mapEl).setView([39.5, -98.35], 4);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  state.map.instance = map;
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
  const markers = state.map.markers;
  const seen = new Set();
  rows.forEach((row) => {
    if (row.gps_lat == null || row.gps_lng == null) return;
    const id = row.id;
    if (!id) return;
    const coords = [row.gps_lat, row.gps_lng];
    let marker = markers.get(id);
    const color = row.is_pending ? "#f59e0b" : "#2f6feb";
    if (!marker){
      marker = window.L.circleMarker(coords, {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 2,
      });
      marker.addTo(state.map.instance);
      marker.on("click", () => setActiveSite(id));
      markers.set(id, marker);
    } else {
      marker.setLatLng(coords);
      if (marker.setStyle){
        marker.setStyle({ color, fillColor: color });
      }
    }
    const time = row.created_at ? new Date(row.created_at).toLocaleTimeString() : "-";
    const pendingLabel = row.is_pending ? ` • ${t("siteStatusPending")}` : "";
    marker.bindPopup(`<b>${escapeHtml(row.name || "Site")}</b>${pendingLabel}<br>${escapeHtml(time)}`);
    seen.add(id);
  });
  markers.forEach((marker, id) => {
    if (!seen.has(id)){
      state.map.instance.removeLayer(marker);
      markers.delete(id);
    }
  });
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
  const rows = getVisibleSites();
  updateMapMarkers(rows);
  if (status){
    if (!state.activeProject){
      status.textContent = t("mapStatusNoProject");
    } else if (!rows.length){
      status.textContent = t("mapStatusNoSites");
    } else {
      status.textContent = t("mapStatusSites", { count: rows.length });
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
    const { error } = await state.client
      .from("profiles")
      .update({ preferred_language: next })
      .eq("id", state.user.id);
    if (error){
      toast("Language save failed", error.message);
      return;
    }
  } else {
    const { error } = await state.client
      .from("profiles")
      .insert({
        id: state.user.id,
        display_name: state.user?.email || null,
        preferred_language: next,
      });
    if (error){
      toast("Profile needed", "Ask an OWNER to create your profile. Language saved locally.");
    }
  }
  await loadProfile();
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
  applyI18n();
  refreshLocations();
}

function getRole(){
  return state.profile?.role || state.demo.role;
}

function isDemoUser(){
  return Boolean(state.profile?.is_demo);
}

function isBillingManager(){
  const role = getRole();
  return isPrivilegedRole(role) || role === "TDS";
}

function isOwner(){
  return getRole() === "OWNER";
}

function isPrivilegedRole(role = getRole()){
  return role === "ADMIN" || role === "OWNER" || role === "PRIME";
}

function isTechnician(){
  return getRole() === "TECHNICIAN";
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
  const role = getRole();
  if (role === "TECHNICIAN"){
    return ["viewTechnician", "viewMap", "viewSettings"].includes(viewId);
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
  return Boolean(state.nodeProofStatus?.billing_unlocked);
}

function formatMoney(value){
  const num = Number(value || 0);
  return `$${num.toFixed(2)}`;
}

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
      toast("Units exceeded", "Used units are over the allowed units. PRIME should review immediately.");
    } else if (ratio >= 0.9){
      toast("Units nearing limit", "Used units are above 90% of allowed. PRIME gets an alert.");
    }
  }
}

function setRoleBasedVisibility(){
  const role = getRole();
  const isTech = role === "TECHNICIAN";
  const allowedViews = isTech
    ? new Set(["viewTechnician", "viewMap", "viewSettings"])
    : new Set(["viewDashboard", "viewNodes", "viewPhotos", "viewBilling", "viewInvoices", "viewMap", "viewCatalog", "viewAlerts", "viewAdmin", "viewSettings", "viewLabor", "viewDispatch"]);

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

function setRoleUI(){
  const role = getRole();
  const roleChip = $("chipRole");
  if (roleChip){
    roleChip.innerHTML = `<span class="dot ok"></span><span>${t("roleLabel")}: ${role}</span>`;
  }

  // Pricing visibility notice
  const pricingHidden = (role === "SPLICER" || role === "TECHNICIAN");
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

async function updateWorkOrderStatus(workOrderId, nextStatus){
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
  await insertWorkOrderEvent(workOrderId, "STATUS_CHANGE", { from: current?.status || null, to: nextStatus });
  await loadAssignedWorkOrders();
  await loadDispatchWorkOrders();
}

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
  if (!canViewDispatch() || !state.activeProject || !state.client || isDemo){
    state.workOrders.technicians = [];
    if (select) select.innerHTML = `<option value="">Unassigned</option>`;
    return;
  }
  const { data, error } = await state.client
    .from("project_members")
    .select("user_id, role")
    .eq("project_id", state.activeProject.id)
    .eq("role", "TECHNICIAN");
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

async function loadTechnicianTimesheet(){
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
  if (isDemo){
    $("whoami").textContent = t("signedInDemo", { role: state.demo.role });
    $("btnSignOut").style.display = "";
    return;
  }

  if (state.user){
    const role = state.profile?.role ? ` -> ${state.profile.role}` : "";
    $("whoami").textContent = `${t("signedIn")} (${state.user.email}${role})`;
    $("btnSignOut").style.display = "";
  } else {
    $("whoami").textContent = t("signedOut");
    $("btnSignOut").style.display = "none";
  }
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
  const select = $("projectSelect");
  const meta = $("projectMeta");
  if (!select) return;
  select.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "Select project";
  select.appendChild(opt);

  state.projects.forEach((p) => {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = p.job_number ? `${p.name} (Job ${p.job_number})` : p.name;
    select.appendChild(o);
  });

  if (state.activeProject){
    select.value = state.activeProject.id;
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
  const createBtn = $("btnCreateProject");
  if (createBtn){
    createBtn.style.display = isPrivilegedRole() ? "" : "none";
  }
  renderProjectInfo();
}

function renderProjectInfo(){
  const wrap = $("projectInfoBody");
  if (!wrap) return;
  const project = state.activeProject;
  if (!project){
    wrap.innerHTML = `<div class="muted small">Select a project to see details.</div>`;
    return;
  }
  const name = escapeHtml(project.name || "Project");
  const description = project.description ? escapeHtml(project.description) : "";
  const createdAt = project.created_at ? new Date(project.created_at).toLocaleDateString() : "";
  const createdBy = project.created_by || project.created_by_id || "";
  const createdByLabel = createdBy
    ? (createdBy === state.user?.id ? "You" : String(createdBy).slice(0, 8))
    : "";
  wrap.innerHTML = `
    <div class="project-info-row"><span class="project-info-label">Name</span><span class="project-info-value">${name}</span></div>
    ${description ? `<div class="project-info-row"><span class="project-info-label">Description</span><span class="project-info-value">${description}</span></div>` : ""}
    ${createdAt ? `<div class="project-info-row"><span class="project-info-label">Created</span><span class="project-info-value">${createdAt}</span></div>` : ""}
    ${createdByLabel ? `<div class="project-info-row"><span class="project-info-label">Created by</span><span class="project-info-value">${createdByLabel}</span></div>` : ""}
  `;
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

async function createProject(){
  if (!isPrivilegedRole()){
    toast("Not allowed", "Admin or owner role required.");
    return;
  }
  const name = $("createProjectName")?.value.trim();
  const description = $("createProjectDescription")?.value.trim() || null;
  if (!name){
    toast("Project name required", "Enter a project name.");
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
    toast("Project created", "Project created.");
    return;
  }
  if (!state.client){
    toast("Project error", "Client not ready.");
    return;
  }
  const payload = {
    name,
    description,
    created_by: state.user?.id || null,
  };
  const selectFields = "id, name, description, created_at, created_by, location, job_number, is_demo";
  let { data, error } = await state.client
    .from("projects")
    .insert(payload)
    .select(selectFields)
    .single();
  if (error && /description|created_by/i.test(error.message || "")){
    const retry = await state.client
      .from("projects")
      .insert({ name })
      .select("id, name, created_at, location, job_number, is_demo")
      .single();
    data = retry.data;
    error = retry.error;
  }
  if (error){
    toast("Project create failed", error.message || "Unable to create project.");
    return;
  }
  state.projects = (state.projects || []).concat(data).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  state.activeProject = data;
  renderProjects();
  setActiveProjectById(data.id);
  closeCreateProjectModal();
  toast("Project created", "Project created.");
}

async function loadProjects(){
  if (isDemo){
    state.projects = state.demo.project ? [state.demo.project] : [];
    state.activeProject = state.projects[0] || null;
    renderProjects();
    return;
  }
  const { data, error } = await state.client
    .from("projects")
    .select("id, name, description, created_at, created_by, location, job_number, is_demo")
    .order("name");
  if (error){
    toast("Projects load error", error.message);
    return;
  }
  state.projects = data || [];
  if (state.activeProject){
    const match = state.projects.find(p => p.id === state.activeProject.id);
    state.activeProject = match || null;
  }
  renderProjects();
}

async function loadAdminProfiles(){
  const gate = $("adminBuildGate");
  const panel = $("adminUsersPanel");
  const allowed = BUILD_MODE && isOwner();
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
    .select("id, display_name, role, created_at")
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
  if (!BUILD_MODE || !isOwner()){
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
                ${state.demo.roles.map(role => `
                  <option value="${role}" ${String(row.role) === role ? "selected" : ""}>${role}</option>
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
  if (!BUILD_MODE || !isOwner()){
    toast("Not allowed", "Owner role required.");
    return;
  }
  const userId = $("adminUserId")?.value.trim();
  const email = $("adminUserEmail")?.value.trim();
  const role = $("adminUserRole")?.value || "SPLICER";
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
      role,
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
  if (!BUILD_MODE || !isOwner()){
    toast("Not allowed", "Owner role required.");
    return;
  }
  const roleEl = document.querySelector(`[data-field="role"][data-id="${userId}"]`);
  const nameEl = document.querySelector(`[data-field="display_name"][data-id="${userId}"]`);
  if (!roleEl || !nameEl) return;
  const nextRole = roleEl.value;
  const nextName = String(nameEl.value || "").trim();
  if (isDemo){
    toast("Demo disabled", "Profiles are not available in demo mode.");
    return;
  }
  const { error } = await state.client
    .from("profiles")
    .update({ role: nextRole, display_name: nextName || null })
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
  if (!BUILD_MODE || !isOwner()){
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
  try{
    const raw = localStorage.getItem(PENDING_SITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingSitesToStorage(list){
  try{
    localStorage.setItem(PENDING_SITES_KEY, JSON.stringify(list || []));
  } catch {}
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

async function loadProjectSites(projectId){
  if (isDemo){
    state.projectSites = (state.demo.sites || []).filter(s => !projectId || s.project_id === projectId);
    state.pendingSites = loadPendingSitesFromStorage();
    renderSiteList();
    return;
  }
  if (!projectId){
    state.projectSites = [];
    state.pendingSites = loadPendingSitesFromStorage();
    renderSiteList();
    return;
  }
  const { data, error } = await state.client
    .from("sites")
    .select("id, project_id, name, notes, gps_lat, gps_lng, gps_accuracy_m, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error){
    toast("Sites load error", error.message);
    return;
  }
  state.projectSites = data || [];
  state.pendingSites = loadPendingSitesFromStorage();
  const visibleIds = new Set(getVisibleSites().map((site) => site.id));
  if (state.activeSite && !visibleIds.has(state.activeSite.id)){
    closeSitePanel();
  }
  renderSiteList();
  if (state.map.instance){
    updateMapMarkers(getVisibleSites());
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
  if (!state.activeProject){
    wrap.innerHTML = `<div class="muted small">${t("mapStatusNoProject")}</div>`;
    return;
  }
  const rows = getVisibleSites();
  if (!rows.length){
    wrap.innerHTML = `<div class="muted small">${t("mapStatusNoSites")}</div>`;
    return;
  }
  wrap.innerHTML = rows.map((site) => {
    const isActive = state.activeSite?.id === site.id;
    const status = site.is_pending ? ` <span class="muted small">(${t("siteStatusPending")})</span>` : "";
    return `
      <button class="btn ${isActive ? "" : "secondary"} small" data-site-id="${site.id}">
        <span>${escapeHtml(site.name || "Site")}${status}</span>
      </button>
    `;
  }).join("");
}

async function setActiveSite(siteId){
  const site = getVisibleSites().find((row) => row.id === siteId) || null;
  state.activeSite = site;
  state.siteMedia = [];
  state.siteCodes = [];
  state.siteEntries = [];
  renderSiteList();
  renderSitePanel();
  if (!site || site.is_pending) return;
  await Promise.all([
    loadSiteMedia(site.id),
    loadSiteCodes(site.id),
    loadSiteEntries(site.id),
  ]);
  renderSitePanel();
}

function closeSitePanel(){
  state.activeSite = null;
  state.siteMedia = [];
  state.siteCodes = [];
  state.siteEntries = [];
  renderSiteList();
  renderSitePanel();
}

function renderSitePanel(){
  const subtitle = $("sitePanelSubtitle");
  const mediaGallery = $("siteMediaGallery");
  const codesList = $("siteCodesList");
  const entriesList = $("siteEntriesList");
  const notesInput = $("siteNotesInput");
  const codesInput = $("siteCodesInput");
  const entryDesc = $("siteEntryDescription");
  const entryQty = $("siteEntryQuantity");
  const mediaInput = $("siteMediaInput");
  const saveCodesBtn = $("btnSaveCodes");
  const addEntryBtn = $("btnAddEntry");
  const saveNotesBtn = $("btnSaveNotes");

  const site = state.activeSite;
  const isPending = Boolean(site?.is_pending);
  const disabled = !site || isPending;
  if (subtitle){
    if (!site){
      subtitle.textContent = t("noSiteSelected");
    } else {
      const when = site.created_at ? new Date(site.created_at).toLocaleString() : "-";
      const pendingLabel = site.is_pending ? ` • ${t("siteStatusPending")}` : "";
      subtitle.textContent = `${site.name || "Site"} • ${when}${pendingLabel}`;
    }
  }

  if (mediaInput) mediaInput.disabled = disabled;
  if (codesInput) codesInput.disabled = disabled;
  if (entryDesc) entryDesc.disabled = disabled;
  if (entryQty) entryQty.disabled = disabled;
  if (notesInput) notesInput.disabled = disabled;
  if (saveCodesBtn) saveCodesBtn.disabled = disabled;
  if (addEntryBtn) addEntryBtn.disabled = disabled;
  if (saveNotesBtn) saveNotesBtn.disabled = disabled;

  if (codesInput) codesInput.value = (state.siteCodes || []).map((row) => row.code).join(", ");
  if (notesInput) notesInput.value = site?.notes || "";

  if (mediaGallery){
    if (!site){
      mediaGallery.innerHTML = `<div class="muted small">${t("noSiteSelected")}</div>`;
    } else if (!(state.siteMedia || []).length){
      mediaGallery.innerHTML = `<div class="muted small">${t("mediaSubtitle")}</div>`;
    } else {
      mediaGallery.innerHTML = state.siteMedia.map((item) => `
        <div class="media-card">
          ${item.previewUrl ? `<img src="${item.previewUrl}" alt="media" />` : ""}
          <div class="media-meta">${escapeHtml(new Date(item.created_at).toLocaleString())}</div>
        </div>
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
}

async function loadSiteMedia(siteId){
  if (isDemo){
    state.siteMedia = (state.demo.siteMedia || []).filter((row) => row.site_id === siteId);
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
    return;
  }
  const rows = data || [];
  const withUrls = [];
  for (const row of rows){
    const previewUrl = row.media_path ? await getPublicOrSignedUrl("proof-photos", row.media_path) : "";
    withUrls.push({ ...row, previewUrl });
  }
  state.siteMedia = withUrls;
}

async function loadSiteCodes(siteId){
  if (isDemo){
    state.siteCodes = (state.demo.siteCodes || []).filter((row) => row.site_id === siteId);
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
    return;
  }
  state.siteCodes = data || [];
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
  const gps = await getCurrentGps();
  if (!gps){
    toast(t("pinMissingGps"), t("pinMissingGpsBody"));
    return;
  }
  if (gps.accuracy != null && gps.accuracy > 50){
    toast(t("pinAccuracyWarnTitle"), t("pinAccuracyWarnBody"));
  }
  await createSiteFromPin(gps);
}

async function createSiteFromPin(gps){
  ensureMap();
  if (state.map.instance){
    state.map.instance.setView([gps.lat, gps.lng], 17);
  }
  const siteName = getNextSiteName();
  const payload = {
    project_id: state.activeProject?.id || null,
    name: siteName,
    gps_lat: gps.lat,
    gps_lng: gps.lng,
    gps_accuracy_m: gps.accuracy,
    created_at: new Date().toISOString(),
  };
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

  const { data, error } = await state.client
    .from("sites")
    .insert(payload)
    .select("id, project_id, name, notes, gps_lat, gps_lng, gps_accuracy_m, created_at")
    .single();
  if (error){
    toast("Pin save error", error.message);
    return;
  }
  state.projectSites = (state.projectSites || []).concat(data);
  renderSiteList();
  updateMapMarkers(getVisibleSites());
  await setActiveSite(data.id);
  toast(t("pinDroppedTitle"), t("pinDroppedBody"));
}

async function syncPendingSites(){
  if (isDemo || !state.client || !navigator.onLine) return;
  const pending = loadPendingSitesFromStorage();
  if (!pending.length) return;
  const remaining = [];
  for (const site of pending){
    const { id, is_pending, ...payload } = site;
    const { data, error } = await state.client
      .from("sites")
      .insert(payload)
      .select("id, project_id, name, notes, gps_lat, gps_lng, gps_accuracy_m, created_at")
      .single();
    if (error || !data){
      remaining.push(site);
      continue;
    }
    if (state.activeSite?.id === site.id){
      state.activeSite = data;
    }
    if (data.project_id === state.activeProject?.id){
      state.projectSites = (state.projectSites || []).concat(data);
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
  const showBuildControls = BUILD_MODE && isOwner();
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
  const role = getRole();
  const canComplete = BUILD_MODE ? (role === "OWNER" || role === "PRIME") : (role === "PRIME" || role === "OWNER");
  if (!canComplete){
    toast("Not allowed", "Only PRIME/OWNER can complete a site.");
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
  if (!BUILD_MODE || !isOwner()){
    toast("Not allowed", "Owner role required.");
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
  if (!BUILD_MODE || !isOwner()){
    toast("Not allowed", "Owner role required.");
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
  renderProjects();
  loadProjectNodes(state.activeProject?.id || null);
  loadProjectSites(state.activeProject?.id || null);
  state.activeSite = null;
  renderSitePanel();
  loadRateCards(state.activeProject?.id || null);
  loadLocationProofRequirements(state.activeProject?.id || null);
  loadBillingLocations(state.activeProject?.id || null);
  state.billingLocation = null;
  state.billingInvoice = null;
  state.billingItems = [];
  renderBillingDetail();
  if (isTechnician()){
    loadTechnicianTimesheet();
  }
  if (canViewLabor()){
    loadLaborRows();
  }
  if (canViewDispatch()){
    loadDispatchTechnicians();
    loadDispatchWorkOrders();
  }
}

function canSeedDemo(){
  const role = getRole();
  return role === "OWNER" || role === "PRIME";
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
    const missing = counts.uploaded < counts.required;
    const disableToggle = r.isDeleting || (!r.completed && missing);
    const billingLocked = isLocationBillingLocked(r.id);
    if (billingLocked && r.isEditingName) r.isEditingName = false;
    if (billingLocked && r.isEditingPorts) r.isEditingPorts = false;
    const displayName = getSpliceLocationDisplayName(r, index);
    const inputValue = r.pending_label ?? (r.label ?? "");
    const canDelete = BUILD_MODE ? true : getRole() === "OWNER";
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
          ${SINGLE_PROOF_PHOTO_MODE ? "" : `<div class="muted small">Photos: <b>${counts.uploaded}/${counts.required}</b> required</div>`}
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
          ${SINGLE_PROOF_PHOTO_MODE ? "" : '<div class="muted small">Required = ports + 1 completion.</div>'}
        </div>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn ghost" data-action="cancelPorts" data-id="${r.id}" ${disableActions ? "disabled" : ""}>Cancel</button>
          <button class="btn secondary" data-action="savePorts" data-id="${r.id}" ${disableActions ? "disabled" : ""}>Save ports</button>
        </div>
        ${SINGLE_PROOF_PHOTO_MODE ? "" : '<div class="muted small">Required photos update after Save.</div>'}
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
  const canDelete = BUILD_MODE ? true : getRole() === "OWNER";
  if (!canDelete){
    toast("Not allowed", "Only OWNER can delete locations.");
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
  const canDelete = BUILD_MODE ? true : getRole() === "OWNER";
  if (!canDelete){
    toast("Not allowed", "Only OWNER can delete locations.");
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
    toast("Not allowed", "Owner role required.");
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
    toast("Slots full", "All port slots already have photos. Use the slot grid to retake.");
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
  const role = getRole();
  const node = state.activeNode;

  const canSeeSubInvoices = (role === "PRIME" || role === "SUB" || role === "OWNER");
  const canSeeTdsInvoices = (role === "TDS" || role === "PRIME" || role === "OWNER");
  const canSeeAnyPricing = (role !== "SPLICER" && role !== "TECHNICIAN");

  let html = "";
  html += `<div class="row">
    <span class="chip"><span class="dot ${canSeeAnyPricing ? "ok" : "bad"}"></span><span>${canSeeAnyPricing ? t("pricingVisible") : t("pricingHiddenLabel")}</span></span>
    <span class="chip"><span class="dot ${canSeeSubInvoices ? "ok" : "bad"}"></span><span>${t("subInvoicesLabel")} ${canSeeSubInvoices ? t("visible") : t("hidden")}</span></span>
    <span class="chip"><span class="dot ${canSeeTdsInvoices ? "ok" : "bad"}"></span><span>${t("tdsInvoicesLabel")} ${canSeeTdsInvoices ? t("visible") : t("hidden")}</span></span>
  </div>`;

  html += `<div class="hr"></div>`;

  if (!node){
    html += `<div class="muted small">${t("openNodeInvoices")}</div>`;
    wrap.innerHTML = html;
    return;
  }

  const eligible = true;

  html += `<div class="note">
    <div style="font-weight:900;">${t("billingGateTitle")}</div>
    <div class="muted small">${t("billingGateBypass")}</div>
    <div style="margin-top:8px;">${t("statusLabel")}: ${eligible ? `<span class="pill-ok">${t("eligibleLabel")}</span>` : `<span class="pill-warn">${t("notReadyLabel")}</span>`}</div>
  </div>`;

  html += `<div class="hr"></div>`;

  if (isDemo){
    const invoices = state.demo.invoices.filter(i => i.node_number === node.node_number);
    if (!invoices.length){
      html += `<div class="muted small">${t("noInvoices")}</div>`;
    } else {
      html += `<table class="table">
        <thead><tr><th>${t("fromLabel")}</th><th>${t("toLabel")}</th><th>${t("statusLabel")}</th><th>${t("amountLabel")}</th></tr></thead><tbody>
        ${invoices.map(inv => {
          const showAmount = canSeeAnyPricing && ( (inv.from === "SUB" && canSeeSubInvoices) || (inv.to === "SUB" && canSeeSubInvoices) || (inv.to === "TDS" && canSeeTdsInvoices) || (inv.from === "TDS" && canSeeTdsInvoices) );
          const amt = showAmount ? "$1,234.00 (demo)" : t("hidden");
          return `<tr><td>${inv.from}</td><td>${inv.to}</td><td>${inv.status}</td><td>${amt}</td></tr>`;
        }).join("")}
        </tbody></table>`;
    }
    wrap.innerHTML = html;
    return;
  }

  const sub = node.invoices?.sub || [];
  const prime = node.invoices?.prime || [];
  const rows = [];

  if (canSeeSubInvoices){
    sub.forEach(inv => rows.push({
      from: "SUB",
      to: "PRIME",
      status: inv.status || "Draft",
      amount: inv.total,
      number: inv.invoice_number || "-",
    }));
  }
  if (canSeeTdsInvoices){
    prime.forEach(inv => rows.push({
      from: "PRIME",
      to: "TDS",
      status: inv.status || "Draft",
      amount: inv.total,
      number: inv.invoice_number || "-",
    }));
  }

  if (!rows.length){
    html += `<div class="muted small">${t("noInvoices")}</div>`;
  } else {
    html += `<table class="table">
      <thead><tr><th>${t("fromLabel")}</th><th>${t("toLabel")}</th><th>${t("invoiceNumberLabel")}</th><th>${t("statusLabel")}</th><th>${t("amountLabel")}</th></tr></thead><tbody>
      ${rows.map(inv => {
        const amt = (canSeeAnyPricing && inv.amount != null) ? `$${Number(inv.amount).toFixed(2)}` : t("hidden");
        return `<tr><td>${inv.from}</td><td>${inv.to}</td><td>${inv.number}</td><td>${inv.status}</td><td>${amt}</td></tr>`;
      }).join("")}
      </tbody></table>`;
  }

  wrap.innerHTML = html;
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
  const locked = ["submitted", "paid", "void"].includes(status);
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
  if (!BUILD_MODE || !isOwner()){
    toast("Not allowed", "Owner role required.");
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
  const slots = requiredSlotsForPorts(loc?.terminal_ports ?? DEFAULT_TERMINAL_PORTS);
  return slots.length;
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
  const role = getRole();
  const canSeeAlerts = role === "PRIME" || role === "OWNER";
  const openAlerts = canSeeAlerts ? (state.alerts || []).filter(a => a.status === "open") : [];
  const count = openAlerts.length;
  const badge = $("alertsBadge");
  if (badge){
    badge.textContent = canSeeAlerts
      ? (count ? `${count} alert${count > 1 ? "s" : ""}` : "No alerts")
      : "Alerts for PRIME only";
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
  const role = getRole();
  const canSeeAlerts = role === "PRIME" || role === "OWNER";
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
    : `<div class="muted small">${canSeeAlerts ? "No alerts right now." : "Alerts are available to PRIME / OWNER."}</div>`;
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
  const role = getRole();

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

    // PRIME alert when near units
    if (role === "PRIME" && state.activeNode.units_allowed > 0){
      const ratio = state.activeNode.units_used / state.activeNode.units_allowed;
      if (ratio >= 0.9){
        toast("Prime alert", "Units are close to the allowed threshold for this site.");
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
        { id:`inv-${Date.now()}-1`, item_code:"HAFO(OFDC-B8G)", item_name:"TDS Millennium example", photo:"./assets/millennium_example.png", qty_used: 1, planned_qty: 8, completed:false },
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
  const role = getRole();
  if (role === "SPLICER" || role === "TECHNICIAN"){
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

  const role = getRole();
  if (role === "SPLICER" || role === "TECHNICIAN"){
    toast("Nope", "Splicers and technicians can't create invoices.");
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
  if (role === "SUB") to = "PRIME";
  else if (role === "PRIME") to = "TDS";
  else if (role === "OWNER") to = "PRIME";
  else if (role === "TDS") to = "OWNER";
  else to = "PRIME";

  if (isDemo){
    state.demo.invoices.push({
      id: `inv-${Date.now()}`,
      node_number: node.node_number,
      from: role,
      to,
      status: "Draft",
      amount_hidden: false,
    });
    toast("Invoice created", `${role} -> ${to} (demo). Visibility depends on role.`);
    renderInvoicePanel();
    return;
  }

  if (role === "SUB"){
    const { error } = await state.client
      .from("sub_invoices")
      .insert({ node_id: node.id, status: "Draft" });
    if (error){
      toast("Invoice error", error.message);
      return;
    }
  } else if (role === "PRIME" || role === "OWNER"){
    const { error } = await state.client
      .from("prime_invoices")
      .insert({ node_id: node.id, status: "Draft" });
    if (error){
      toast("Invoice error", error.message);
      return;
    }
  }
  await loadInvoices(node.id);
  toast("Invoice created", `${role} -> ${to}. Visibility depends on role.`);
  renderInvoicePanel();
}

async function initAuth(){
  setAppModeUI();
  setEnvWarning();

  if (appMode === "real" && !hasSupabaseConfig){
    showAuth(true);
    setWhoami();
    setAuthButtonsDisabled(true);
    return;
  }

  state.client = await makeClient();
  if (!state.client){
    showAuth(true);
    setAuthButtonsDisabled(true);
    return;
  }
  setAuthButtonsDisabled(false);
  window.addEventListener("online", () => syncPendingSites());

  if (window.location.pathname.endsWith("/demo-login")){
    await demoLogin();
  }

  // Demo: choose role via prompt for now
    if (isDemo){
      ensureDemoSeed();
      showAuth(false);
      const pick = prompt("Demo mode: choose a role (ADMIN, OWNER, PRIME, TDS, SUB, SPLICER, TECHNICIAN)", state.demo.role) || state.demo.role;
      const role = state.demo.roles.includes(pick.toUpperCase()) ? pick.toUpperCase() : state.demo.role;
      state.demo.role = role;
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
      loadTechnicianTimesheet();
      loadLaborRows();
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
    await loadProfile();
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
      if (canViewDispatch()){
        await loadDispatchTechnicians();
        await loadDispatchWorkOrders();
      }
      await loadAlerts();
      renderAlerts();
      renderCatalogResults("catalogResults", "");
        renderCatalogResults("catalogResultsQuick", "");
        renderBillingLocations();
        loadTechnicianTimesheet();
        loadLaborRows();
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

    await loadProfile();
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
    if (canViewDispatch()){
      await loadDispatchTechnicians();
      await loadDispatchWorkOrders();
    }
    await loadAlerts();
    renderAlerts();
    renderCatalogResults("catalogResults", "");
      renderCatalogResults("catalogResultsQuick", "");
      renderBillingLocations();
      loadTechnicianTimesheet();
      loadLaborRows();
      setActiveView(getDefaultView());
      startLocationPolling();
      syncPendingSites();
    }
  setWhoami();
  showAuth(!state.user);
  setProofStatus();
}

async function loadProfile(){
  if (isDemo) return;

  if (!state.user){
    state.profile = null;
    return;
  }

  // Expect a public.profiles row keyed by auth.uid()
  const { data, error } = await state.client
    .from("profiles")
    .select("role, display_name, preferred_language, is_demo")
    .eq("id", state.user.id)
    .maybeSingle();

  if (error){
    toast("Profile error", error.message);
    state.profile = null;
    return;
  }
  state.profile = data || null;
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

function wireUI(){
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
      else if (action === "woBlocked") updateWorkOrderStatus(id, "BLOCKED");
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
      else if (action === "woBlocked") updateWorkOrderStatus(id, "BLOCKED");
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

  $("btnSignOut").addEventListener("click", async () => {
    if (isDemo){
      // reset
      state.activeNode = null;
      showAuth(true);
      $("btnSignOut").style.display = "none";
      $("whoami").textContent = t("signedOut");
      clearProof();
      return;
    }
    await state.client.auth.signOut();
  });

  $("btnSignIn").addEventListener("click", async () => {
    if (isDemo) return;
    const email = $("email").value.trim();
    const password = $("password").value;
    const { error } = await state.client.auth.signInWithPassword({ email, password });
    if (error) toast("Sign-in failed", error.message);
  });

  const btnMagic = $("btnMagicLink");
  if (btnMagic){
    btnMagic.addEventListener("click", async () => {
      if (isDemo) return;
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

  const projectSelect = $("projectSelect");
  if (projectSelect){
    projectSelect.addEventListener("change", () => {
      setActiveProjectById(projectSelect.value);
    });
  }
  const createProjectBtn = $("btnCreateProject");
  if (createProjectBtn){
    createProjectBtn.addEventListener("click", () => openCreateProjectModal());
  }
  const createProjectCancelBtn = $("btnCreateProjectCancel");
  if (createProjectCancelBtn){
    createProjectCancelBtn.addEventListener("click", () => closeCreateProjectModal());
  }
  const createProjectSaveBtn = $("btnCreateProjectSave");
  if (createProjectSaveBtn){
    createProjectSaveBtn.addEventListener("click", () => createProject());
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
      state.mapFilters.search = e.target.value;
      refreshLocations();
    });
  }
  const dropPinBtn = $("btnDropPin");
  if (dropPinBtn){
    dropPinBtn.addEventListener("click", () => dropPin());
  }
  const siteList = $("siteList");
  if (siteList){
    siteList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-site-id]");
      if (!btn) return;
      setActiveSite(btn.dataset.siteId);
    });
  }
  const closePanelBtn = $("btnCloseSitePanel");
  if (closePanelBtn){
    closePanelBtn.addEventListener("click", () => closeSitePanel());
  }
  const siteMediaInput = $("siteMediaInput");
  if (siteMediaInput){
    siteMediaInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0] || null;
      await addSiteMedia(file);
      e.target.value = "";
    });
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
wireUI();
applyI18n();
syncLanguageControls();
initAuth();
