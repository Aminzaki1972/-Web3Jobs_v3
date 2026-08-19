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

// Start loading the SDK immediately. This fixes pages that previously showed
// "تعذر الاتصال بـ Supabase" because the CDN SDK was not loaded before auth.js.
(async function bootstrapSupabase() {
  const sdk = await loadSupabaseSdk();
  if (sdk) initializeSupabase();
})();

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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();

console.log("Web3Jobs Supabase System Loaded");
