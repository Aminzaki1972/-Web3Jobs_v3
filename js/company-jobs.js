/* Web3Jobs canonical company-jobs loader. */
(function () {
  "use strict";
  if (window.__WEB3JOBS_COMPANY_JOBS_LOADED__) return;
  window.__WEB3JOBS_COMPANY_JOBS_LOADED__ = true;
  var script = document.createElement("script");
  script.src = "company-jobs-core.js";
  script.async = false;
  script.onerror = function () { console.error("Web3Jobs: failed to load company jobs core."); };
  (document.head || document.documentElement).appendChild(script);
})();
