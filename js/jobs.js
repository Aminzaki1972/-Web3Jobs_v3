/* Web3Jobs v3 - jobs loader and advanced multi-filter search */
"use strict";

(function () {
    const state = { jobs: [], filteredJobs: [], loading: false, search: "", type: "", location: "", category: "", specialization: "", workMode: "", company: "" };

    const CATEGORY_RULES = {
        "Development":["developer","development","engineer","engineering","software","programmer","coding"],
        "Smart Contract":["smart contract","solidity","vyper","move","ink!","contract developer"],
        "Blockchain":["blockchain","protocol","layer 1","layer 2","l2","l1","cryptography"],
        "Web3":["web3","web 3","dapp","dapps","decentralized","defi","dao","crypto"],
        "AI / Web3 AI":["artificial intelligence","machine learning"," ai ","llm","generative ai"],
        "Security":["security","cybersecurity","smart contract audit","penetration","infosec"],
        "Frontend":["frontend","front-end","react","next.js","vue","angular","javascript","typescript"],
        "Backend":["backend","back-end","node.js","python","golang","java","api engineer"],
        "Full Stack":["full stack","full-stack"],
        "DevOps / Infrastructure":["devops","infrastructure","kubernetes","docker","cloud engineer","sre","site reliability"],
        "Data / Analytics":["data scientist","data analyst","analytics","data engineer","sql","business intelligence"],
        "Design":["designer","design","ui/ux","ux","ui designer","product design","graphic design"],
        "Product":["product manager","product owner","product lead","product management"],
        "Marketing":["marketing","growth","seo","social media","brand"],
        "Sales / BD":["sales","business development","account executive","partnerships","bd manager"],
        "Community":["community","community manager","developer relations","devrel"],
        "Content":["content","copywriter","writer","editor","technical writer"],
        "Finance":["finance","accounting","accountant","financial analyst","treasury"],
        "Legal / Compliance":["legal","lawyer","compliance","regulatory","aml","kyc"],
        "Operations":["operations","operations manager","people operations","hr","human resources"],
        "Support":["customer support","customer success","technical support","support specialist"],
        "Research":["research","researcher","economist","quant","research scientist"],
        "Internship":["intern","internship","graduate","apprentice"],
        "Freelance":["freelance","freelancer","contractor","contract position"]
    };

    const SPECIALIZATION_RULES = {
        "Solidity":["solidity"],"Rust":["rust"],"Ethereum":["ethereum","evm"],"DeFi":["defi","decentralized finance"],
        "NFT":["nft","non-fungible"],"DAO":["dao","decentralized autonomous organization"],"Layer 2":["layer 2","l2","rollup","zk-rollup"],
        "Bitcoin":["bitcoin","btc"],"Trading":["trading","trader","market maker"],"Wallets":["wallet","wallets","account abstraction"],
        "Payments":["payments","payment infrastructure"],"AI":["artificial intelligence","machine learning","llm"," ai "]
    };

    function client(){
        try { if(window.Web3JobsSupabase && typeof window.Web3JobsSupabase.getClient === "function"){ const c=window.Web3JobsSupabase.getClient(); if(c&&typeof c.from==="function") return c; } } catch(e){ console.error("Web3Jobs: Supabase client error",e); }
        return window.supabaseClient && typeof window.supabaseClient.from === "function" ? window.supabaseClient : null;
    }
    function container(){ return document.querySelector("#jobs-list,#jobs-container,.jobs-list,.jobs-container,[data-jobs-list],[data-jobs-container]"); }
    function esc(v){ return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;"); }
    function text(v,f){ const s=String(v==null?"":v).trim(); return s||(f||""); }
    function date(v){ if(!v)return ""; const d=new Date(v); return Number.isNaN(d.getTime())?"":d.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}); }
    function jobText(j){ return [j.title,j.company,j.company_name,j.location,j.type,j.description,j.skills,j.salary,j.category,j.specialization,j.work_mode,j.remote_type].map(v=>text(v).toLowerCase()).join(" "); }
    function classify(j){ const v=jobText(j); return {categories:Object.keys(CATEGORY_RULES).filter(k=>CATEGORY_RULES[k].some(x=>v.includes(x))),specializations:Object.keys(SPECIALIZATION_RULES).filter(k=>SPECIALIZATION_RULES[k].some(x=>v.includes(x.toLowerCase())))}; }
    function workMode(j){ const v=jobText(j), e=text(j.work_mode||j.workMode||j.remote_type).toLowerCase(); if(e.includes("hybrid"))return "Hybrid"; if(e.includes("remote"))return "Remote"; if(/on[- ]?site|onsite/.test(e))return "On-site"; if(/\bremote\b|work from home|distributed|fully remote/.test(v))return "Remote"; if(/\bhybrid\b/.test(v))return "Hybrid"; if(/\bon[- ]?site\b|in office|office based/.test(v))return "On-site"; return ""; }

    function card(j){
        const title=text(j.title,"Untitled Job"), company=text(j.company||j.company_name,"Web3 Company"), location=text(j.location,"Remote"), type=text(j.type,"Full Time"), salary=text(j.salary), description=text(j.description,"No description available."), skills=text(j.skills), apply=text(j.application_url||j.apply_link||j.application_link||j.apply_url), created=date(j.created_at||j.source_updated_at||j.updated_at), mode=workMode(j), c=classify(j);
        const tags=[].concat(c.categories.slice(0,2),mode?[mode]:[]).map(x=>'<span class="job-filter-tag">'+esc(x)+'</span>').join("");
        const applyHtml=/^https?:\/\//i.test(apply)?'<a class="job-apply-button" href="'+esc(apply)+'" target="_blank" rel="noopener noreferrer">Apply</a>':"";
        return '<article class="job-card" data-job-id="'+esc(j.id)+'"><div class="job-card-header"><div class="job-card-title"><h3>'+esc(title)+'</h3><div class="job-company">'+esc(company)+'</div></div></div><div class="job-meta"><span>📍 '+esc(location)+'</span><span>💼 '+esc(type)+'</span>'+(salary?'<span>💰 '+esc(salary)+'</span>':"")+(created?'<span>📅 '+esc(created)+'</span>':"")+'</div>'+(tags?'<div class="job-filter-tags">'+tags+'</div>':"")+(skills?'<div class="job-skills">'+esc(skills)+'</div>':"")+'<p class="job-description">'+esc(description)+'</p><div class="job-card-actions"><a class="job-view-button" href="job.html?id='+encodeURIComponent(j.id==null?"":j.id)+'">View Details</a>'+applyHtml+'</div></article>';
    }
    function render(){ const el=container(); if(!el)return; el.innerHTML=state.filteredJobs.length?state.filteredJobs.map(card).join(""):'<div class="no-jobs"><h3>No jobs found</h3><p>Try changing or clearing your filters.</p></div>'; updateCount(); }
    function matches(j){
        const q=state.search.toLowerCase().trim(), t=text(j.type).toLowerCase(), l=text(j.location).toLowerCase(), company=text(j.company||j.company_name).toLowerCase(), v=jobText(j), mode=workMode(j), c=classify(j);
        if(state.type&&!t.includes(state.type.toLowerCase().trim()))return false;
        if(state.location&&!l.includes(state.location.toLowerCase().trim()))return false;
        if(state.company&&!company.includes(state.company.toLowerCase().trim()))return false;
        if(state.category&&!c.categories.includes(state.category))return false;
        if(state.specialization&&!c.specializations.includes(state.specialization))return false;
        if(state.workMode&&mode!==state.workMode)return false;
        return !q||v.includes(q);
    }
    function filter(){ state.filteredJobs=state.jobs.filter(matches); render(); }
    function updateCount(){ const el=document.getElementById("jobs-result-count"); if(el)el.textContent=state.filteredJobs.length.toLocaleString()+" jobs found"; }
    function companies(){ return [...new Set(state.jobs.map(j=>text(j.company||j.company_name)).filter(Boolean))].sort((a,b)=>a.localeCompare(b)); }

    function injectAdvancedFilters(){
        if(document.getElementById("web3jobs-advanced-filters"))return;
        /* Remove the legacy search/filter controls to prevent duplicate IDs and conflicting handlers. */
        document.getElementById("job-search-form")?.remove();
        document.querySelector(".jobs-filters")?.remove();
        const host=container(); if(!host||!host.parentNode)return;
        const box=document.createElement("section"); box.id="web3jobs-advanced-filters"; box.setAttribute("aria-label","Advanced job search");
        box.innerHTML='<div class="wj-filter-search"><span>⌕</span><input id="job-search" type="search" placeholder="Search jobs, skills, companies..." autocomplete="off" aria-label="Search jobs"></div><div class="wj-filter-grid"><select id="job-category-filter" aria-label="Job category"><option value="">All fields</option>'+Object.keys(CATEGORY_RULES).map(x=>'<option>'+esc(x)+'</option>').join("")+'</select><select id="job-specialization-filter" aria-label="Specialization"><option value="">All specializations</option>'+Object.keys(SPECIALIZATION_RULES).map(x=>'<option>'+esc(x)+'</option>').join("")+'</select><select id="job-work-mode-filter" aria-label="Work mode"><option value="">All work modes</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select><select id="job-type-filter" aria-label="Job type"><option value="">All job types</option><option>Full Time</option><option>Part Time</option><option>Contract</option><option>Internship</option><option>Freelance</option></select><input id="job-location-filter" type="search" placeholder="Location" aria-label="Location"><select id="job-company-filter" aria-label="Company"><option value="">All companies</option></select></div><div class="wj-filter-footer"><span id="jobs-result-count">0 jobs found</span><button id="job-clear-filters" type="button">↺ Clear filters</button></div>';
        host.parentNode.insertBefore(box,host);
        const cs=box.querySelector("#job-company-filter"); companies().forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;cs.appendChild(o);});
        const bind=(id,key)=>{const el=box.querySelector("#"+id);if(el)el.addEventListener(el.tagName==="INPUT"?"input":"change",e=>{state[key]=e.target.value;filter();});};
        bind("job-search","search");bind("job-category-filter","category");bind("job-specialization-filter","specialization");bind("job-work-mode-filter","workMode");bind("job-type-filter","type");bind("job-location-filter","location");bind("job-company-filter","company");
        box.querySelector("#job-clear-filters").addEventListener("click",()=>{Object.keys(state).forEach(k=>{if(k!=="jobs"&&k!=="filteredJobs"&&k!=="loading")state[k]="";});box.querySelectorAll("input").forEach(x=>x.value="");box.querySelectorAll("select").forEach(x=>x.selectedIndex=0);filter();});
    }

    function addStyles(){
        if(document.getElementById("web3jobs-filter-style"))return;
        const s=document.createElement("style");s.id="web3jobs-filter-style";s.textContent=`#web3jobs-advanced-filters{width:min(1150px,calc(100% - 40px));margin:0 auto 35px;padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(255,255,255,.055);backdrop-filter:blur(14px);box-sizing:border-box;box-shadow:0 18px 50px rgba(0,0,0,.12)}.wj-filter-search{display:flex;align-items:center;gap:10px;padding:0 15px;margin-bottom:12px;min-height:58px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(0,0,0,.2)}.wj-filter-search span{font-size:25px;opacity:.7}.wj-filter-search input{flex:1;border:0;outline:0;background:transparent;color:inherit;font-size:16px;min-width:0}.wj-filter-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.wj-filter-grid select,.wj-filter-grid input{width:100%;min-height:48px;padding:0 13px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:rgba(0,0,0,.2);color:inherit;box-sizing:border-box;outline:0}.wj-filter-grid select:focus,.wj-filter-grid input:focus{border-color:#6366f1}.wj-filter-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px}.wj-filter-footer #jobs-result-count{font-weight:800;opacity:.8}.wj-filter-footer button{min-height:42px;padding:0 16px;border:0;border-radius:10px;background:rgba(99,102,241,.15);color:#a5b4fc;cursor:pointer;font-weight:700}.job-filter-tags{display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 14px}.job-filter-tag{padding:5px 8px;border-radius:999px;background:rgba(99,102,241,.12);font-size:11px;font-weight:700}.jobs-loading,.no-jobs{grid-column:1/-1}@media(max-width:800px){#web3jobs-advanced-filters{width:calc(100% - 24px)}.wj-filter-grid{grid-template-columns:1fr 1fr}}@media(max-width:500px){.wj-filter-grid{grid-template-columns:1fr}.wj-filter-footer{align-items:flex-start;flex-direction:column}}`;document.head.appendChild(s);
    }

    async function queryRange(c,from,to){ const r=await Promise.race([c.from("jobs").select("*").order("created_at",{ascending:false}).range(from,to),new Promise((_,rej)=>setTimeout(()=>rej(new Error("Supabase jobs request timed out.")),15000))]);if(r.error)throw r.error;return Array.isArray(r.data)?r.data:[]; }
    async function loadAllJobs(){
        if(state.loading)return state.jobs; const el=container();if(!el)return[];const c=client();if(!c){showError("Supabase client is unavailable. Please refresh the page.");return[];}state.loading=true;showLoading();
        try{const all=[];let from=0;const size=1000;while(true){const page=await queryRange(c,from,from+size-1);all.push(...page);if(page.length<size)break;from+=size;if(from>=10000)break;}state.jobs=all;injectAdvancedFilters();addStyles();state.filteredJobs=all.filter(matches);render();console.log("Web3Jobs: loaded",all.length,"jobs from Supabase.");return all;}catch(e){console.error("Web3Jobs: jobs query failed",e);state.jobs=[];state.filteredJobs=[];showError(e&&e.message?e.message:"The jobs database could not be loaded.");return [];}finally{state.loading=false;}
    }
    function showLoading(){const el=container();if(el)el.innerHTML='<div class="jobs-loading"><h3>Loading jobs...</h3><p>Loading the latest Web3 opportunities.</p></div>';}
    function showError(msg){const el=container();if(!el)return;el.innerHTML='<div class="no-jobs"><h3>Unable to load jobs</h3><p>'+esc(msg||"The jobs database could not be loaded.")+'</p><button id="jobs-retry-button" type="button">Retry</button></div>';document.getElementById("jobs-retry-button")?.addEventListener("click",loadAllJobs);}

    window.Web3JobsJobs={loadAllJobs,getJobs:()=>state.jobs.slice(),searchJobs:v=>{state.search=v||"";filter()},filterJobsByType:v=>{state.type=v||"";filter()},filterJobsByLocation:v=>{state.location=v||"";filter()},clearJobFilters:()=>{state.search=state.type=state.location=state.category=state.specialization=state.workMode=state.company="";filter()}};
    function init(){addStyles();loadAllJobs();}
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
    window.addEventListener("web3jobs:supabase-ready",loadAllJobs);
})();
