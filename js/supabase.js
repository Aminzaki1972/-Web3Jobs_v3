/* =========================================================
   Web3Jobs v3
   File: js/supabase.js
   Unified Supabase Client - hardened bootstrap
   ========================================================= */
"use strict";

const SUPABASE_URL = "https://jqhemwskrnlycximjpag.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";
const SUPABASE_STORAGE_KEY = "web3jobs-auth";
const SUPABASE_SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";

let web3jobsSupabaseClient = null;
let supabaseInitPromise = null;
let supabaseSdkPromise = null;

function loadSupabaseSdk() {
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);
  if (supabaseSdkPromise) return supabaseSdkPromise;

  supabaseSdkPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-web3jobs-supabase-sdk="1"]');
    if (existing) {
      const started = Date.now();
      const wait = () => {
        if (window.supabase?.createClient) return resolve(window.supabase);
        if (Date.now() - started >= 10000) return resolve(null);
        window.setTimeout(wait, 100);
      };
      wait();
      return;
    }

    const script = document.createElement("script");
    script.src = SUPABASE_SDK_URL;
    script.async = false;
    script.dataset.web3jobsSupabaseSdk = "1";
    script.onload = () => resolve(window.supabase?.createClient ? window.supabase : null);
    script.onerror = (error) => {
      console.error("Web3Jobs: Supabase SDK failed to load:", error);
      resolve(null);
    };
    (document.head || document.documentElement).appendChild(script);
  }).finally(() => {
    supabaseSdkPromise = null;
  });

  return supabaseSdkPromise;
}

function initializeSupabase() {
  if (web3jobsSupabaseClient && typeof web3jobsSupabaseClient.from === "function") {
    return web3jobsSupabaseClient;
  }

  if (typeof window === "undefined" || !window.supabase || typeof window.supabase.createClient !== "function") {
    return null;
  }

  try {
    web3jobsSupabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: SUPABASE_STORAGE_KEY
        }
      }
    );

    window.supabaseClient = web3jobsSupabaseClient;
    window.Web3JobsSupabaseReady = true;

    try {
      window.dispatchEvent(new CustomEvent("web3jobs:supabase-ready"));
    } catch (_) {}

    return web3jobsSupabaseClient;
  } catch (error) {
    console.error("Web3Jobs: Supabase initialization failed:", error);
    web3jobsSupabaseClient = null;
    return null;
  }
}

function getSupabaseClient() {
  if (web3jobsSupabaseClient && typeof web3jobsSupabaseClient.from === "function") return web3jobsSupabaseClient;
  if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
    web3jobsSupabaseClient = window.supabaseClient;
    return web3jobsSupabaseClient;
  }
  return initializeSupabase();
}

function getClient() { return getSupabaseClient(); }

async function waitForSupabase(timeoutMs = 15000) {
  const existing = getSupabaseClient();
  if (existing) return existing;

  if (!supabaseInitPromise) {
    supabaseInitPromise = (async () => {
      const sdk = await loadSupabaseSdk();
      if (sdk) {
        const client = initializeSupabase();
        if (client) return client;
      }

      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        const client = initializeSupabase();
        if (client) return client;
        await new Promise(resolve => window.setTimeout(resolve, 100));
      }
      return null;
    })().finally(() => { supabaseInitPromise = null; });
  }
  return supabaseInitPromise;
}

async function getSupabaseSession() {
  const c = await waitForSupabase();
  if (!c) return null;
  try {
    const { data, error } = await c.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  } catch (e) {
    console.error("Web3Jobs: getSession error:", e);
    return null;
  }
}

async function getSupabaseUser() {
  const c = await waitForSupabase();
  if (!c) return null;
  try {
    const { data, error } = await c.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  } catch (e) {
    console.error("Web3Jobs: getUser error:", e);
    return null;
  }
}

function onAuthStateChange(callback) {
  const c = getSupabaseClient();
  if (!c?.auth || typeof callback !== "function") return null;
  try { return c.auth.onAuthStateChange(callback); }
  catch (e) { console.error("Web3Jobs: auth state listener error:", e); return null; }
}

async function signOutSupabase() {
  const c = await waitForSupabase();
  if (!c) return false;
  try {
    const { error } = await c.auth.signOut();
    if (error) return false;
    localStorage.removeItem("web3jobs_account_type");
    localStorage.removeItem("web3jobs_user_id");
    return true;
  } catch (_) { return false; }
}

async function hasActiveSession() { return Boolean((await getSupabaseSession())?.user); }
async function getAuthenticatedUserId() { return (await getSupabaseSession())?.user?.id || null; }

window.Web3JobsSupabase = {
  url: SUPABASE_URL,
  publishableKey: SUPABASE_PUBLISHABLE_KEY,
  storageKey: SUPABASE_STORAGE_KEY,
  initialize: initializeSupabase,
  getClient: getSupabaseClient,
  getSupabaseClient,
  waitForClient: waitForSupabase,
  getSession: getSupabaseSession,
  getSupabaseSession,
  hasActiveSession,
  getAuthenticatedUserId,
  getUser: getSupabaseUser,
  getSupabaseUser,
  onAuthStateChange,
  signOut: signOutSupabase
};

window.getSupabaseClient = getSupabaseClient;
window.getSupabaseSession = getSupabaseSession;
window.getSupabaseUser = getSupabaseUser;
window.hasActiveSupabaseSession = hasActiveSession;
window.waitForSupabase = waitForSupabase;

(async function bootstrapSupabase() {
  const sdk = await loadSupabaseSdk();
  if (sdk) initializeSupabase();
})();

(function loadWeb3JobsAuthBootstrap() {
  function add(path, marker) {
    if (document.querySelector("script[" + marker + "]")) return;
    const s = document.createElement("script");
    s.src = path;
    s.dataset.web3jobsAuthBootstrap = "1";
    s.defer = false;
    document.head.appendChild(s);
  }

  function boot() {
    add("js/auth.js", "data-web3jobs-auth-bootstrap");
    if (!document.querySelector("script[data-web3jobs-subscription-bootstrap]")) {
      const s = document.createElement("script");
      s.src = "js/company-subscription-bootstrap.js";
      s.dataset.web3jobsSubscriptionBootstrap = "1";
      s.defer = false;
      document.head.appendChild(s);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();

(function removeLegacyHomepageSearch() {
  function remove() {
    const form = document.getElementById("jobSearchForm");
    if (form) {
      form.remove();
      console.log("Web3Jobs: legacy homepage job search removed; use Jobs page filters.");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", remove, { once: true });
  else remove();
})();

/* =========================================================
   COMPANY SUBSCRIPTION PAYMENT GATE
   ---------------------------------------------------------
   This capture-phase handler is intentionally installed from the
   earliest shared script. It prevents the legacy dashboard payment
   listener from bypassing the subscription confirmation screen.
   ========================================================= */
(function installSubscriptionPaymentGate() {
  const CONFIG = {
    chain: "BNB Smart Chain",
    chainId: "0x38",
    token: "USDT",
    tokenContract: "0x55d398326f99059fF775485246999027B3197955",
    receivingWallet: "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",
    duration: "30 days"
  };

  const PRICES = {
    free: 0,
    starter: 19,
    professional: 49,
    enterprise: 99
  };

  let open = false;

  function esc(value) {
    return String(value ?? "").replace(/[&<>\"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
    })[c]);
  }

  function closeModal() {
    const modal = document.getElementById("web3jobs-payment-confirm-modal");
    if (modal) modal.remove();
    open = false;
  }

  function showModal(code) {
    if (open) return;
    open = true;
    const price = PRICES[code] ?? 0;
    const name = code.charAt(0).toUpperCase() + code.slice(1);

    const modal = document.createElement("div");
    modal.id = "web3jobs-payment-confirm-modal";
    modal.style.cssText = "position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.78);backdrop-filter:blur(8px);font-family:Inter,system-ui,sans-serif";
    modal.innerHTML = `
      <div style="width:min(100%,520px);background:#0b1727;border:1px solid #294663;border-radius:18px;padding:24px;color:#f5f8ff;box-shadow:0 25px 90px rgba(0,0,0,.55)">
        <h2 style="margin:0 0 6px;font-size:21px">Confirm monthly subscription</h2>
        <p style="margin:0 0 18px;color:#8ea3bc;font-size:12px">Review the payment details before connecting your wallet.</p>
        <div style="display:grid;gap:9px;font-size:12px">
          <div><strong>Plan:</strong> ${esc(name)}</div>
          <div><strong>Price:</strong> ${price} USDT / month</div>
          <div><strong>Network:</strong> ${CONFIG.chain}</div>
          <div><strong>USDT contract:</strong><br><code style="word-break:break-all;color:#6ee7b7">${CONFIG.tokenContract}</code></div>
          <div><strong>Receiving wallet:</strong><br><code style="word-break:break-all;color:#60a5fa">${CONFIG.receivingWallet}</code></div>
          <div><strong>Duration:</strong> ${CONFIG.duration}</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:22px">
          <button id="web3jobs-payment-cancel" style="flex:1;padding:12px;border:1px solid #294663;border-radius:10px;background:#0d1d31;color:#f5f8ff;cursor:pointer">Cancel</button>
          <button id="web3jobs-payment-confirm" style="flex:1;padding:12px;border:0;border-radius:10px;background:#6ee7b7;color:#06101d;font-weight:800;cursor:pointer">Connect Wallet & Pay</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector("#web3jobs-payment-cancel").onclick = closeModal;
    modal.querySelector("#web3jobs-payment-confirm").onclick = async () => {
      const button = modal.querySelector("#web3jobs-payment-confirm");
      button.disabled = true;
      button.textContent = "Opening wallet...";
      try {
        if (price <= 0) {
          if (window.Web3JobsCompanyDashboard?.payUSDT) {
            await window.Web3JobsCompanyDashboard.payUSDT({code,name,price,limit:2,durationDays:30});
          }
        } else if (window.Web3JobsCompanyDashboard?.payUSDT) {
          await window.Web3JobsCompanyDashboard.payUSDT({code,name,price,limit:code === "enterprise" ? Infinity : code === "professional" ? 20 : 5,durationDays:30});
        } else {
          throw new Error("Subscription payment system is still loading. Please try again.");
        }
        closeModal();
      } catch (error) {
        button.disabled = false;
        button.textContent = "Connect Wallet & Pay";
        console.error("Web3Jobs subscription payment:", error);
        if (typeof window.showDashboardAlert === "function") {
          window.showDashboardAlert(error?.message || "Unable to complete subscription.", "error");
        } else {
          alert(error?.message || "Unable to complete subscription.");
        }
      }
    };
  }

  document.addEventListener("click", function (event) {
    const button = event.target.closest?.("[data-pay-plan]");
    if (!button) return;
    const code = String(button.dataset.payPlan || "").trim().toLowerCase();
    if (!PRICES.hasOwnProperty(code)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    showModal(code);
  }, true);
})();

console.log("Web3Jobs Supabase System Loaded");
