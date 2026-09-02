/* Web3Jobs canonical company-jobs loader. */
(function () {
  "use strict";
  if (window.__WEB3JOBS_COMPANY_JOBS_LOADED__) return;
  window.__WEB3JOBS_COMPANY_JOBS_LOADED__ = true;
  var scripts = [
    "company-jobs-core.js",
    "js/company-jobs-payment-canonical.js?v=20260902-1"
  ];
  scripts.forEach(function (src) {
    var script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onerror = function () { console.error("Web3Jobs: failed to load " + src); };
    (document.head || document.documentElement).appendChild(script);
  });
})();
