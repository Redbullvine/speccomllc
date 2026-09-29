/*
 * SpecCom -> "Splicing" launcher.
 *
 * Splicing is a separate product. This file is the ONLY place its address is
 * written down. Nothing rides along with the navigation: no query string, no
 * hash, no project code, no token, no user id, no email.
 */
(function () {
  "use strict";

  var SPLICING_URL = "https://telecomengine.app/";
  var HANDOFF_MS = 600; // hard ceiling is 700 ms
  var launching = false;

  var STYLE = [
    "#splicingHandoff{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;",
    "background:radial-gradient(ellipse at 50% 40%,#0f2a1c 0%,#06120b 70%);opacity:0;animation:spHandIn 160ms ease-out forwards;}",
    "#splicingHandoff svg.sph-strands{position:absolute;inset:0;width:100%;height:100%}",
    "#splicingHandoff .sph-strand{fill:none;stroke:#1d7a45;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:900;stroke-dashoffset:900;animation:spHandDraw 520ms cubic-bezier(.16,1,.3,1) forwards}",
    "#splicingHandoff .sph-strand.b{stroke:#5fd08a;animation-delay:70ms}",
    "#splicingHandoff img{position:relative;height:48px;width:auto;filter:drop-shadow(0 0 18px rgba(29,122,69,.6))}",
    "#splicingHandoff .sph-label{position:relative;font:600 12px/1 'Exo 2',system-ui,sans-serif;letter-spacing:4px;text-transform:uppercase;color:rgba(160,220,185,.85)}",
    "@keyframes spHandIn{to{opacity:1}}",
    "@keyframes spHandDraw{to{stroke-dashoffset:0}}",
    "@media (prefers-reduced-motion:reduce){#splicingHandoff,#splicingHandoff .sph-strand{animation-duration:1ms}}"
  ].join("");

  function showHandoff() {
    if (!document.getElementById("splicingHandoffStyle")) {
      var st = document.createElement("style");
      st.id = "splicingHandoffStyle";
      st.textContent = STYLE;
      document.head.appendChild(st);
    }
    var el = document.createElement("div");
    el.id = "splicingHandoff";
    el.setAttribute("role", "status");
    el.setAttribute("aria-label", "Opening Splicing");
    el.innerHTML =
      '<svg class="sph-strands" viewBox="0 0 800 540" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      '<path class="sph-strand" d="M-20,260 C120,200 260,320 400,260 S680,200 820,260"/>' +
      '<path class="sph-strand b" d="M-20,290 C120,350 260,230 400,290 S680,350 820,290"/>' +
      "</svg>" +
      '<img src="assets/speccom_logo_2.png" alt="SpecCom">' +
      '<div class="sph-label">Splicing</div>';
    document.body.appendChild(el);
  }

  function launch() {
    if (launching) return false;
    launching = true;
    showHandoff();
    setTimeout(function () {
      window.location.assign(SPLICING_URL); // same tab, exact URL, nothing appended
    }, HANDOFF_MS);
    return true;
  }

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-splicing-launch]") : null;
    if (!target) return;
    event.preventDefault();
    launch();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var target = event.target && event.target.closest ? event.target.closest("[data-splicing-launch]") : null;
    if (!target || target.tagName === "BUTTON") return;
    event.preventDefault();
    launch();
  });

  window.SpecComSplicing = {
    url: function () { return SPLICING_URL; },
    handoffMs: HANDOFF_MS,
    launch: launch
  };
})();
