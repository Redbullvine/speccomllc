/**
 * SpecCom Operations Review presentation data.
 *
 * Frontend-only content for presentation.html.
 * This file does not connect to Supabase or read production records.
 */

window.PRESENTATION_STORY_SCENES = [
  {
    id: "arrival",
    title: "Arrival",
    mode: "split",
    caption: "Same job. Same crew skill. Same field conditions.",
    left: {
      type: "note",
      title: "SpecCom Workflow",
      body: "The crew arrives at the work location with the job ready to document.",
    },
    right: {
      type: "note",
      title: "Scattered Phone Workflow",
      body: "The crew arrives at the same work location and plans to keep updates on the phone.",
    },
  },
  {
    id: "safety",
    title: "Safety Setup",
    mode: "split",
    caption: "Both crews do the work. The difference is how the work gets documented.",
    left: {
      type: "note",
      title: "Setup Logged",
      body: "Truck, cones, location, and crew activity are ready to connect to the job record.",
    },
    right: {
      type: "note",
      title: "Setup Happened",
      body: "Truck, cones, and crew activity happen in the field, but the record depends on memory and messages.",
    },
  },
  {
    id: "start",
    title: "Starting the Job",
    mode: "split",
    caption: "Texting can tell someone you started. SpecCom creates a company record that proves it.",
    left: {
      type: "phone",
      title: "SpecCom",
      lines: [
        "Job opened",
        "GPS/time captured",
        "Work status: On Site",
        "Notes ready",
        "Photo proof ready",
      ],
    },
    right: {
      type: "text",
      message: "On the job. Ready to knock this out.",
    },
  },
  {
    id: "later",
    title: "A Few Hours Later",
    mode: "full",
    caption: "The work moves forward. Documentation either stays organized as it happens, or starts drifting into separate places.",
  },
  {
    id: "completed",
    title: "Work Completed",
    mode: "split",
    caption: "Both workers took photos. Only one created organized company proof.",
    left: {
      type: "photos",
      title: "Photos Attach To SpecCom",
      tone: "approval",
      body: "GPS proof, timestamp, job/ticket link, notes, and closeout status stay together.",
    },
    right: {
      type: "photos",
      title: "Photos Stay Scattered",
      tone: "warning",
      body: "Photos remain spread across phone storage, text threads, and camera roll folders.",
    },
  },
  {
    id: "supervisor",
    title: "Supervisor Review",
    mode: "split",
    caption: "No proof, no approval. Pay approval and billing can be delayed when proof is missing.",
    left: {
      type: "review",
      title: "Let's verify this week's completed work.",
      tone: "approval",
      listType: "proof",
      items: [
        "Completed job",
        "Photos",
        "GPS/time proof",
        "Notes",
        "Materials",
        "Ready for closeout/billing",
      ],
      response: "Approved. Everything is documented.",
    },
    right: {
      type: "review",
      title: "Let's verify this week's completed work.",
      preface: "Wait... where did all my photos go?",
      tone: "warning",
      listType: "lost",
      items: [
        "Toddler playing with phone",
        "Deleted photos icon",
        "Phone storage full",
        "Lost text thread",
        "Wrong photo folder",
      ],
      response: "I need proof before this can be approved.",
    },
  },
  {
    id: "point",
    title: "The Point",
    mode: "full",
    caption: "This reduces chasing, searching, re-entry, billing confusion, and lost documentation.",
  },
  {
    id: "company",
    title: "Company-wide Value",
    mode: "full",
    caption: "How SpecCom could organize {companyPossessive} field operations across owners, supervisors, field crews, warehouse, office, and billing.",
  },
  {
    id: "final",
    title: "Final Call To Action",
    mode: "full",
    caption: "{companyPossessive} field work, documentation, and billing flow can be organized in one reviewable system.",
  },
];

window.PRESENTATION_WORKFLOW_CHAIN = [
  "Start Work",
  "GPS / Time Proof",
  "Photos",
  "Notes",
  "Materials",
  "Supervisor Review",
  "Invoice Verification",
  "Closeout Package",
];

window.PRESENTATION_ROLE_STRIP = [
  { role: "Owner", value: "Sees work without chasing everybody." },
  { role: "Supervisor", value: "Reviews proof before approving completion." },
  { role: "Splicer", value: "Documents closures, redlines, and materials." },
  { role: "I&R Tech", value: "Works by ticket, address, or daily assignment - not forced into project-first logic." },
  { role: "Warehouse", value: "Tracks material usage and shortages." },
  { role: "Office / Billing", value: "Verifies invoices against real field proof." },
];

window.PRESENTATION_OVERVIEW_PANELS = [
  {
    title: "Field Proof",
    body: "Photos, GPS, time, notes, and completion status stay attached to the work.",
  },
  {
    title: "Company Organization",
    body: "Jobs, tickets, projects, materials, maps, uploads, invoices, and closeouts live in one system.",
  },
  {
    title: "Supervisor Control",
    body: "Supervisors see what is active, blocked, completed, and ready for review.",
  },
  {
    title: "Billing Confidence",
    body: "Office staff can verify invoices against field proof instead of digging through texts and folders.",
  },
];

window.PRESENTATION_UPLOAD_FILE_TYPES = [
  "Photos",
  "PDF Invoices",
  "Excel / CSV",
  "KMZ / KML Maps",
  "ZIP Closeout Packages",
  "Job Sheets",
  "Material Lists",
];

window.PRESENTATION_UPLOAD_STEPS = [
  "Upload",
  "Identify",
  "Choose Destination",
  "Attach",
];

window.PRESENTATION_OSP_EXAMPLES = [
  {
    title: "Node 54 Fiber Closeout",
    summary: "Closure documentation, photo proof, redline cleanup, and closeout readiness.",
    splicer: "Documents splice closure photos, fiber notes, redlines, and materials used.",
    supervisor: "Reviews completion proof, missing items, and closeout readiness.",
    billing: "Receives verified proof tied to the closeout package.",
  },
  {
    title: "FTTH Splice Verification",
    summary: "A verification flow for splice points, address coverage, and completion proof.",
    splicer: "Captures splice photos, route notes, address context, and exceptions.",
    supervisor: "Checks proof against the assigned route and marks items ready for review.",
    billing: "Receives job-linked documentation that supports invoice verification.",
  },
  {
    title: "Cabinet Turnup Prep",
    summary: "Cabinet readiness, labels, material checks, and proof before activation work.",
    splicer: "Documents cabinet prep, labels, jumpers, photos, and material shortages.",
    supervisor: "Reviews readiness, blockers, material needs, and next steps.",
    billing: "Receives documented work status and supporting material records.",
  },
];
