/* Web3Jobs compatibility loader.
 * company-jobs.html references js/company-jobs.js while the legacy
 * implementation is stored at js.company-jobs.js.
 * The unified js/supabase.js client is loaded first, so the legacy
 * module reuses the correct production Supabase client and never
 * falls back to its stale project URL.
 */
(function () {
  "use strict";

  if (window.__WEB3JOBS_COMPANY_JOBS_LOADED__) return;
  window.__WEB3JOBS_COMPANY_JOBS_LOADED__ = true;

  var script = document.createElement("script");
  script.src = "../js.company-jobs.js";
  script.async = false;
  script.onerror = function () {
    console.error("Web3Jobs: failed to load company jobs module.");
  };
  (document.head || document.documentElement).appendChild(script);
})();
