/* =========================================================
   Web3Jobs v3
   File: js/supabase.js
   Unified Supabase Client - hardened bootstrap
   ========================================================= */
"use strict";

const SUPABASE_URL = "https://jqhemwskrnlycximjpag.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";
const SUPABASE_STORAGE_KEY = "web3jobs-auth";

let web3jobsSupabaseClient = null;
let supabaseInitPromise = null;

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
  if (web3jobsSupabaseClient && typeof web3jobsSupabaseClient.from === "function") {
    return web3jobsSupabaseClient;
  }

  if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
    web3jobsSupabaseClient = window.supabaseClient;
    return web3jobsSupabaseClient;
  }

  return initializeSupabase();
}

function getClient() {
  return getSupabaseClient();
}

async function waitForSupabase(timeoutMs = 10000) {
  const existing = getSupabaseClient();
  if (existing) return existing;

  if (!supabaseInitPromise) {
    supabaseInitPromise = new Promise((resolve) => {
      const started = Date.now();

      const tryInit = () => {
        const client = initializeSupabase();
        if (client) {
          resolve(client);
          return;
        }

        if (Date.now() - started >= timeoutMs) {
          resolve(null);
          return;
        }

        window.setTimeout(tryInit, 100);
      };

      tryInit();
    }).finally(() => {
      supabaseInitPromise = null;
    });
  }

  return supabaseInitPromise;
}

async function getSupabaseSession() {
  const c = await waitForSupabase();
  if (!c) return null;
  try {
    const { data, error } = await c.auth.getSession();
    if (error) {
      console.error("Web3Jobs: getSession error:", error);
      return null;
    }
    return data?.session || null;
  } catch (e) {
    console.error("Web3Jobs: getSession exception:", e);
    return null;
  }
}

async function getSupabaseUser() {
  const c = await waitForSupabase();
  if (!c) return null;
  try {
    const { data, error } = await c.auth.getUser();
    if (error) {
      console.error("Web3Jobs: getUser error:", error);
      return null;
    }
    return data?.user || null;
  } catch (e) {
    console.error("Web3Jobs: getUser exception:", e);
    return null;
  }
}

function onAuthStateChange(callback) {
  const c = getSupabaseClient();
  if (!c || !c.auth || typeof callback !== "function") return null;
  try {
    return c.auth.onAuthStateChange(callback);
  } catch (e) {
    console.error("Web3Jobs: auth state listener error:", e);
    return null;
  }
}

async function signOutSupabase() {
  const c = await waitForSupabase();
  if (!c) return false;
  try {
    const { error } = await c.auth.signOut();
    if (error) return false;
    try {
      localStorage.removeItem("web3jobs_account_type");
      localStorage.removeItem("web3jobs_user_id");
    } catch (_) {}
    return true;
  } catch (_) {
    return false;
  }
}

async function hasActiveSession() {
  const s = await getSupabaseSession();
  return Boolean(s?.user);
}

async function getAuthenticatedUserId() {
  const s = await getSupabaseSession();
  return s?.user?.id || null;
}

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

// Attempt immediately, then keep retrying briefly in case the CDN library loads late.
initializeSupabase();
(function delayedSupabaseBootstrap() {
  if (getSupabaseClient()) return;
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (initializeSupabase() || attempts >= 100) {
      window.clearInterval(timer);
    }
  }, 100);
})();

window.getSupabaseClient = getSupabaseClient;
window.getSupabaseSession = getSupabaseSession;
window.getSupabaseUser = getSupabaseUser;
window.hasActiveSupabaseSession = hasActiveSession;
window.waitForSupabase = waitForSupabase;

/* Load shared auth systems once. */
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

console.log("Web3Jobs Supabase System Loaded");
