/* Web3Jobs — canonical company jobs module. */
(function () {
  "use strict";

  if (window.__WEB3JOBS_COMPANY_JOBS_CORE__) return;
  window.__WEB3JOBS_COMPANY_JOBS_CORE__ = true;

  let currentUser = null;
  let currentCompanyProfile = null;
  let companyJobs = [];
  let initialized = false;

  function client() {
    const c = window.supabaseClient || window.Web3JobsSupabase?.getClient?.();
    if (!c || typeof c.from !== "function") throw new Error("Supabase client is not available. Check js/supabase.js.");
    return c;
  }
  function $(id) { return document.getElementById(id); }
  function escapeHtml(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;"); }
  function formatDate(value) { if (!value) return "—"; const d=new Date(value); return Number.isNaN(d.getTime())?"—":d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}); }
  function capitalize(value) { const s=String(value||""); return s.charAt(0).toUpperCase()+s.slice(1); }
  function showAlert(message,type) { const el=$("jobs-alert")||$("dashboard-alert"); if(!el){console.log(message);return;} el.textContent=message;el.className="alert "+(type||"success");el.style.display="block";clearTimeout(showAlert.timer);showAlert.timer=setTimeout(()=>{el.style.display="none"},5000); }

  async function getCurrentUser() {
    const {data,error}=await client().auth.getSession();
    if(error) throw error;
    return data?.session?.user||null;
  }
  async function loadCompanyProfile() {
    if(!currentUser)return null;
    const {data,error}=await client().from("company_profiles").select("*").eq("user_id",currentUser.id).maybeSingle();
    if(error)throw error;
    currentCompanyProfile=data||null;
    return currentCompanyProfile;
  }
  function getCompanyName(){return currentCompanyProfile?.company_name||currentCompanyProfile?.name||currentUser?.user_metadata?.company_name||currentUser?.user_metadata?.name||currentUser?.email?.split("@")[0]||"Company";}

  async function loadCompanyJobs(){
    if(!currentUser)return[];
    const {data,error}=await client().from("jobs").select("*").eq("company_id",currentUser.id).order("created_at",{ascending:false});
    if(error)throw error;
    companyJobs=data||[];renderJobs();updateStatistics();return companyJobs;
  }
  function updateStatistics(){
    const total=companyJobs.length;
    ["jobs-count","total-jobs","published-jobs-count","job-count"].forEach(id=>{if($(id))$(id).textContent=String(total);});
    const active=companyJobs.filter(j=>j.is_active!==false&&!(["closed","inactive","draft"].includes(String(j.status||"active").toLowerCase()))).length;
    if($("active-jobs-count"))$("active-jobs-count").textContent=String(active);
  }
  function renderJobCard(job){
    const status=String(job.status||(job.is_active===false?"inactive":"active")).toLowerCase();
    const safeStatus=["active","closed","inactive","draft"].includes(status)?status:"active";
    const apply=job.apply_link||job.application_url;
    return `<article class="company-job-card" data-job-id="${escapeHtml(job.id)}"><div class="company-job-card-header"><div class="company-job-main"><h3>${escapeHtml(job.title||"Untitled Job")}</h3><div class="company-job-meta"><span>🏢 ${escapeHtml(job.company||getCompanyName())}</span><span>📍 ${escapeHtml(job.location||"Remote")}</span><span>💼 ${escapeHtml(job.type||"Full-time")}</span><span>📅 ${formatDate(job.created_at)}</span></div></div><span class="job-status ${safeStatus}">${capitalize(safeStatus)}</span></div>${job.description?`<p class="company-job-description">${escapeHtml(job.description)}</p>`:""}<div class="company-job-footer"><div class="job-id">Job #${escapeHtml(job.id)}</div><div class="job-actions">${apply?`<a href="${escapeHtml(apply)}" target="_blank" rel="noopener noreferrer" class="small-button">View Apply Link</a>`:""}<button type="button" class="small-button danger" data-delete-job="${escapeHtml(job.id)}">Delete</button></div></div></article>`;
  }
  function renderJobs(list){
    const container=$("company-jobs-list")||$("jobs-list")||$("jobs-container");if(!container)return;
    const jobs=list||companyJobs;
    if(!jobs.length){container.innerHTML=`<div class="empty-state"><div class="empty-icon">💼</div><h3>No Jobs Published Yet</h3><p>You have not published any jobs. Create your first Web3 job opportunity.</p><a href="company-dashboard.html" class="primary-button">Post a New Job</a></div>`;return;}
    container.innerHTML=jobs.map(renderJobCard).join("");
    container.querySelectorAll("[data-delete-job]").forEach(b=>b.addEventListener("click",()=>deleteJob(b.dataset.deleteJob)));
  }
  async function deleteJob(jobId){
    if(!jobId||!currentUser)return;if(!window.confirm("Are you sure you want to delete this job?"))return;
    const {error}=await client().from("jobs").delete().eq("id",jobId).eq("company_id",currentUser.id);
    if(error){console.error(error);showAlert(error.message||"Unable to delete the job.","error");return;}
    showAlert("Job deleted successfully.","success");await loadCompanyJobs();
  }
  function setupSearch(){
    const input=$("job-search")||$("jobs-search")||$("search-jobs");if(!input||input.dataset.web3jobsSearchReady)return;
    input.dataset.web3jobsSearchReady="1";input.addEventListener("input",()=>{const q=input.value.trim().toLowerCase();renderJobs(companyJobs.filter(job=>[job.title,job.company,job.location,job.type,job.description].filter(Boolean).join(" ").toLowerCase().includes(q)));});
  }
  async function initializeCompanyJobs(){
    if(initialized)return;initialized=true;
    try{currentUser=await getCurrentUser();if(!currentUser){window.location.href="login.html?redirect=company-jobs.html";return;}await loadCompanyProfile();await loadCompanyJobs();setupSearch();const spinner=$("loading-spinner"),content=$("dashboard-content");if(spinner)spinner.style.display="none";if(content)content.style.display="block";}
    catch(error){console.error("Company jobs initialization failed:",error);showAlert(error.message||"Unable to load company jobs.","error");const spinner=$("loading-spinner");if(spinner)spinner.style.display="none";}
  }
  window.getCurrentUser=getCurrentUser;window.loadCompanyProfile=loadCompanyProfile;window.loadCompanyJobs=loadCompanyJobs;window.renderJobs=renderJobs;window.deleteJob=deleteJob;window.setupSearch=setupSearch;window.initializeCompanyJobs=initializeCompanyJobs;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initializeCompanyJobs);else initializeCompanyJobs();
})();
