/* =========================================================
   Web3Jobs v3
   File: js/supabase.js
   Unified Supabase Client
   ========================================================= */
"use strict";
const SUPABASE_URL="https://jqhemwskrnlycximjpag.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";
const SUPABASE_STORAGE_KEY="web3jobs-auth";
let web3jobsSupabaseClient=null;
function initializeSupabase(){
  if(web3jobsSupabaseClient&&typeof web3jobsSupabaseClient.from==="function") return web3jobsSupabaseClient;
  if(typeof window==="undefined"||!window.supabase||typeof window.supabase.createClient!=="function"){console.error("Web3Jobs: Supabase library is not loaded.");return null;}
  try{
    web3jobsSupabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:SUPABASE_STORAGE_KEY}});
    window.supabaseClient=web3jobsSupabaseClient;
    return web3jobsSupabaseClient;
  }catch(error){console.error("Web3Jobs: Supabase initialization failed:",error);web3jobsSupabaseClient=null;window.supabaseClient=null;return null;}
}
function getSupabaseClient(){
  if(web3jobsSupabaseClient&&typeof web3jobsSupabaseClient.from==="function") return web3jobsSupabaseClient;
  if(window.supabaseClient&&typeof window.supabaseClient.from==="function"){web3jobsSupabaseClient=window.supabaseClient;return web3jobsSupabaseClient;}
  return initializeSupabase();
}
function getClient(){return getSupabaseClient();}
async function getSupabaseSession(){const c=getSupabaseClient();if(!c)return null;try{const {data,error}=await c.auth.getSession();if(error){console.error("Web3Jobs: getSession error:",error);return null;}return data?.session||null;}catch(e){console.error("Web3Jobs: getSession exception:",e);return null;}}
async function getSupabaseUser(){const c=getSupabaseClient();if(!c)return null;try{const {data,error}=await c.auth.getUser();if(error){console.error("Web3Jobs: getUser error:",error);return null;}return data?.user||null;}catch(e){console.error("Web3Jobs: getUser exception:",e);return null;}}
function onAuthStateChange(callback){const c=getSupabaseClient();if(!c||!c.auth||typeof callback!=="function")return null;try{return c.auth.onAuthStateChange(callback);}catch(e){console.error("Web3Jobs: auth state listener error:",e);return null;}}
async function signOutSupabase(){const c=getSupabaseClient();if(!c)return false;try{const {error}=await c.auth.signOut();if(error)return false;try{localStorage.removeItem("web3jobs_account_type");localStorage.removeItem("web3jobs_user_id");}catch{}return true;}catch(e){return false;}}
async function hasActiveSession(){const s=await getSupabaseSession();return Boolean(s?.user);}
async function getAuthenticatedUserId(){const s=await getSupabaseSession();return s?.user?.id||null;}
window.Web3JobsSupabase={url:SUPABASE_URL,publishableKey:SUPABASE_PUBLISHABLE_KEY,storageKey:SUPABASE_STORAGE_KEY,initialize:initializeSupabase,getClient:getSupabaseClient,getSupabaseClient:getSupabaseClient,getSession:getSupabaseSession,getSupabaseSession:getSupabaseSession,hasActiveSession,getAuthenticatedUserId,getUser:getSupabaseUser,getSupabaseUser,onAuthStateChange,signOut:signOutSupabase};
const initialSupabaseClient=initializeSupabase();
if(initialSupabaseClient)window.supabaseClient=initialSupabaseClient;
window.getSupabaseClient=getSupabaseClient;window.getSupabaseSession=getSupabaseSession;window.getSupabaseUser=getSupabaseUser;window.hasActiveSupabaseSession=hasActiveSession;
/* Load the live company subscription system from the same trusted repository. */
(function loadCompanySubscriptionBootstrap(){
  function add(){
    if(document.querySelector('script[data-web3jobs-subscription-bootstrap]')) return;
    const s=document.createElement('script');s.src='js/company-subscription-bootstrap.js';s.dataset.web3jobsSubscriptionBootstrap='1';s.defer=false;document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',add,{once:true}); else add();
})();
console.log("Web3Jobs Supabase System Loaded");
