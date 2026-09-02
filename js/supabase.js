/* Web3Jobs v3 - Unified Supabase client */
"use strict";

const SUPABASE_URL = "https://jqhemwskrnlycximjpag.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";
const SUPABASE_STORAGE_KEY = "web3jobs-auth";
const SUPABASE_SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4.4.112.4/dist/umd/supabase.min.js";

let web3jobsSupabaseClient = null;
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
        if (Date.now() - started > 10000) return resolve(null);
        setTimeout(wait, 100);
      };
      wait();
      return;
    }
    const script = document.createElement("script");
    script.src = SUPABASE_SDK_URL;
    script.async = false;
    script.dataset.web3jobsSupabaseSdk = "1";
    script.onload = () => resolve(window.supabase?.createClient ? window.supabase : null);
    script.onerror = () => resolve(null);
    (document.head || document.documentElement).appendChild(script);
  }).finally(() => { supabaseSdkPromise = null; });
  return supabaseSdkPromise;
}

function initializeSupabase() {
  if (web3jobsSupabaseClient) return web3jobsSupabaseClient;
  if (!window.supabase?.createClient) return null;
  try {
    web3jobsSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: SUPABASE_STORAGE_KEY,
        flowType: "pkce"
      }
    });
    window.supabaseClient = web3jobsSupabaseClient;
    window.Web3JobsSupabaseReady = true;
    window.dispatchEvent(new CustomEvent("web3jobs:supabase-ready"));
    return web3jobsSupabaseClient;
  } catch (error) {
    console.error("Web3Jobs: Supabase initialization failed", error);
    return null;
  }
}

function getSupabaseClient() {
  return web3jobsSupabaseClient || window.supabaseClient || initializeSupabase();
}
async function waitForSupabase(timeoutMs = 15000) {
  const existing = getSupabaseClient();
  if (existing) return existing;
  const sdk = await loadSupabaseSdk();
  if (sdk) return initializeSupabase();
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const client = initializeSupabase();
    if (client) return client;
    await new Promise(r => setTimeout(r, 100));
  }
  return null;
}
async function getSupabaseSession() {
  const c = await waitForSupabase();
  if (!c) return null;
  try { const {data,error}=await c.auth.getSession(); if(error) throw error; return data?.session||null; }
  catch(e){ console.warn("Web3Jobs: session unavailable"); return null; }
}
async function getSupabaseUser() {
  const c = await waitForSupabase();
  if (!c) return null;
  try { const {data,error}=await c.auth.getUser(); if(error) throw error; return data?.user||null; }
  catch(e){ console.warn("Web3Jobs: user unavailable"); return null; }
}
function onAuthStateChange(callback) {
  const c=getSupabaseClient();
  if(!c?.auth || typeof callback!=="function") return null;
  try{return c.auth.onAuthStateChange(callback);}catch(_){return null;}
}
async function signOutSupabase(){const c=await waitForSupabase();if(!c)return false;try{await c.auth.signOut();localStorage.removeItem("web3jobs_account_type");localStorage.removeItem("web3jobs_user_id");return true;}catch(_){return false;}}

window.Web3JobsSupabase={url:SUPABASE_URL,publishableKey:SUPABASE_PUBLISHABLE_KEY,storageKey:SUPABASE_STORAGE_KEY,initialize:initializeSupabase,getClient:getSupabaseClient,getSupabaseClient,waitForClient:waitForSupabase,getSession:getSupabaseSession,getSupabaseSession,hasActiveSession:async()=>Boolean((await getSupabaseSession())?.user),getAuthenticatedUserId:async()=>(await getSupabaseSession())?.user?.id||null,getUser:getSupabaseUser,getSupabaseUser,onAuthStateChange,signOut:signOutSupabase};
window.getSupabaseClient=getSupabaseClient;
window.getSupabaseSession=getSupabaseSession;
window.getSupabaseUser=getSupabaseUser;
window.waitForSupabase=waitForSupabase;

loadSupabaseSdk().then(initializeSupabase);
