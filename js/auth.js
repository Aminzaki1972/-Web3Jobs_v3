/* Web3Jobs v3 - unified authentication */
"use strict";
(function () {
  const WALLET_AUTH_URL = "https://jqhemwskrnlycximjpag.supabase.co/functions/v1/wallet-auth";

  function getClient() {
    return window.Web3JobsSupabase?.getClient?.() || window.supabaseClient || null;
  }
  async function getCurrentSession() {
    const c = getClient(); if (!c) return null;
    try { const {data,error}=await c.auth.getSession(); if(error) throw error; return data?.session||null; } catch(e){ console.warn("Web3Jobs session unavailable"); return null; }
  }
  async function getCurrentUser(){ return (await getCurrentSession())?.user||null; }
  function normalizeAccountType(v){
    const t=String(v||"").trim().toLowerCase();
    if(["admin","administrator","superadmin","super_admin"].includes(t)) return "admin";
    if(["company","business","employer","organization","company_account","company-account"].includes(t)) return "company";
    if(["individual","person","user","candidate","freelancer","individual_account","individual-account"].includes(t)) return "individual";
    return null;
  }
  async function getAccountType(userId=null){
    const c=getClient(), u=await getCurrentUser(), id=userId||u?.id; if(!c||!id) return "individual";
    try{
      const {data,error}=await c.from("profiles").select("account_type,role").eq("id",id).maybeSingle();
      if(!error&&data){ if(normalizeAccountType(data.role)==="admin") return "admin"; return normalizeAccountType(data.account_type)||normalizeAccountType(data.role)||"individual"; }
    }catch(_){ }
    return "individual";
  }
  function getBaseUrl(){ const p=location.pathname, i=p.lastIndexOf("/"); return location.origin+(i>=0?p.slice(0,i+1):"/"); }
  function getLoginUrl(){ return getBaseUrl()+"login.html"; }
  function getDashboardUrl(type){ type=normalizeAccountType(type); return getBaseUrl()+(type==="admin"?"admin-dashboard.html":type==="company"?"company-dashboard.html":"dashboard.html"); }
  function showAuthMessage(ar,en,type="info"){
    const el=document.getElementById("auth-message")||document.getElementById("register-message")||document.getElementById("loginStatus");
    if(!el){ console.warn(en); return; }
    el.textContent=ar+" "+en; el.className=(el.id==="loginStatus"?"status-message ":"auth-message-box ")+"auth-message-"+type; el.style.display="block";
  }
  function showAuthError(e){
    const raw=String(e?.message||e?.error_description||e||"Authentication failed");
    const t=raw.toLowerCase();
    if(t.includes("invalid login credentials")) return showAuthMessage("البريد الإلكتروني أو كلمة المرور غير صحيحة.","Invalid email or password.","error");
    if(t.includes("email not confirmed")) return showAuthMessage("البريد الإلكتروني غير مؤكد.","Email address is not confirmed.","error");
    if(t.includes("rate limit")||t.includes("too many")) return showAuthMessage("تم تجاوز عدد المحاولات. حاول لاحقًا.","Too many attempts. Please try again later.","error");
    showAuthMessage("تعذر إتمام تسجيل الدخول.","Authentication could not be completed.","error");
    console.error("Web3Jobs auth:",e);
  }
  async function loginUser(email,password){
    const c=getClient(); if(!c) return {success:false};
    try{
      const {data,error}=await c.auth.signInWithPassword({email:String(email||"").trim().toLowerCase(),password:String(password||"")});
      if(error) throw error; const u=data?.user,s=data?.session; if(!u||!s) return {success:false};
      const accountType=await getAccountType(u.id); localStorage.setItem("web3jobs_account_type",accountType); localStorage.setItem("web3jobs_user_id",u.id);
      return {success:true,user:u,session:s,accountType,dashboardUrl:getDashboardUrl(accountType)};
    }catch(e){showAuthError(e);return {success:false,error:e};}
  }
  async function getEthereumAddress(){
    if(!window.ethereum) return "";
    try{ const a=await window.ethereum.request({method:"eth_accounts"}); return a?.[0]||""; }catch(_){return "";}
  }
  async function switchToBsc(){
    if(!window.ethereum) return;
    try{ await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x38"}]}); }
    catch(e){
      if(e?.code===4902){ await window.ethereum.request({method:"wallet_addEthereumChain",params:[{chainId:"0x38",chainName:"BNB Smart Chain",nativeCurrency:{name:"BNB",symbol:"BNB",decimals:18},rpcUrls:["https://bsc-dataseed.binance.org/"],blockExplorerUrls:["https://bscscan.com/"]}]}); }
      else throw e;
    }
  }
  async function provisionWalletProfile(session,wallet,accountType){
    if(!session?.access_token||!wallet) return false;
    const r=await fetch(WALLET_AUTH_URL,{method:"POST",headers:{Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:JSON.stringify({action:"provision",wallet,accountType:accountType==="company"?"company":"individual"})});
    let body={}; try{body=await r.json();}catch(_){ }
    if(!r.ok||body.success!==true){ console.error("Web3Jobs wallet provisioning failed",body); return false; }
    return true;
  }
  async function signInWithWallet(accountType="individual"){
    const c=getClient(); if(!c) return {success:false};
    if(!window.ethereum){ showAuthMessage("لم يتم العثور على محفظة.","No Web3 wallet detected.","error"); return {success:false}; }
    accountType=accountType==="company"?"company":"individual";
    try{
      await switchToBsc();
      await window.ethereum.request({method:"eth_requestAccounts"});
      const wallet=await getEthereumAddress(); if(!wallet) return {success:false};
      if(typeof c.auth.signInWithWeb3!=="function") throw new Error("Web3 authentication is unavailable.");
      const {data,error}=await c.auth.signInWithWeb3({chain:"ethereum",statement:"I accept the Web3Jobs Terms of Service."});
      if(error) throw error;
      const user=data?.user, session=data?.session; if(!user||!session) throw new Error("No authenticated session was created.");
      const ok=await provisionWalletProfile(session,wallet,accountType);
      if(!ok) return {success:false};
      const realType=await getAccountType(user.id)||accountType;
      localStorage.setItem("web3jobs_account_type",realType); localStorage.setItem("web3jobs_user_id",user.id);
      location.replace(getDashboardUrl(realType));
      return {success:true,user,session,accountType:realType,dashboardUrl:getDashboardUrl(realType)};
    }catch(e){showAuthError(e);return {success:false,error:e};}
  }
  async function protectDashboard(required=null){
    const s=await getCurrentSession(); if(!s?.user){location.replace(getLoginUrl());return false;}
    const type=await getAccountType(s.user.id); if(required&&normalizeAccountType(required)!==type){location.replace(getDashboardUrl(type));return false;}
    return {authenticated:true,user:s.user,session:s,accountType:type,emailConfirmed:Boolean(s.user.email_confirmed_at||s.user.confirmed_at)};
  }
  async function logoutUser(){const c=getClient();try{await c?.auth.signOut();}catch(_){} try{localStorage.removeItem("web3jobs_account_type");localStorage.removeItem("web3jobs_user_id");}catch(_){} location.replace(getLoginUrl());}
  async function resetPassword(email){const c=getClient();if(!c)return false;try{const {error}=await c.auth.resetPasswordForEmail(String(email||"").trim().toLowerCase(),{redirectTo:getLoginUrl()});if(error)throw error;showAuthMessage("تم إرسال رابط إعادة تعيين كلمة المرور.","Password reset link sent.","success");return true;}catch(e){showAuthError(e);return false;}}
  async function resendConfirmation(email){const c=getClient();if(!c)return false;try{const {error}=await c.auth.resend({type:"signup",email:String(email||"").trim().toLowerCase(),options:{emailRedirectTo:getLoginUrl()}});if(error)throw error;showAuthMessage("تم إرسال رسالة تأكيد جديدة.","A new confirmation email has been sent.","success");return true;}catch(e){showAuthError(e);return false;}}
  function initializeWalletButtons(){
    document.querySelectorAll("#wallet-register-button,.wallet-button").forEach(b=>{
      if(b.dataset.web3jobsWalletBound==="1") return; b.dataset.web3jobsWalletBound="1";
      b.addEventListener("click",async ev=>{ev.preventDefault();ev.stopImmediatePropagation();b.disabled=true;const old=b.textContent;b.textContent="جاري الاتصال بالمحفظة...";try{const selected=document.querySelector('input[name="account-type"]:checked')?.value||"individual";await signInWithWallet(selected);}finally{b.disabled=false;b.textContent=old;}},true);
    });
  }
  const api={getClient,getCurrentUser,getCurrentSession,getAccountType,login:loginUser,loginUser,logout:logoutUser,logoutUser,resetPassword,resendConfirmation,signInWithWallet,protectDashboard,protectAdminDashboard:()=>protectDashboard("admin"),protectCompanyDashboard:()=>protectDashboard("company"),protectIndividualDashboard:()=>protectDashboard("individual"),getDashboardUrl,getLoginUrl,isEmailConfirmed:u=>Boolean(u?.email_confirmed_at||u?.confirmed_at),normalizeAccountType,showMessage:showAuthMessage,showError:showAuthError};
  window.Web3JobsAuth=api; window.getCurrentUser=getCurrentUser; window.getCurrentSession=getCurrentSession; window.getAccountType=getAccountType; window.protectDashboard=protectDashboard; window.protectAdminDashboard=api.protectAdminDashboard; window.protectCompanyDashboard=api.protectCompanyDashboard; window.protectIndividualDashboard=api.protectIndividualDashboard;
  function init(){if(getClient()) initializeWalletButtons();}
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();