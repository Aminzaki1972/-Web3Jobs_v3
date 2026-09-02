/* Web3Jobs Company Dashboard Core
 * Subscription payments are intentionally NOT handled here.
 * The sole subscription payment path is company-subscription-canonical.js.
 */
"use strict";
(() => {
  // Preserve the core module as a compatibility shell while subscription
  // payment execution is owned exclusively by the canonical controller.
  window.Web3JobsCompanyDashboardCore = window.Web3JobsCompanyDashboardCore || {
    paymentMode: "canonical-only"
  };
})();
