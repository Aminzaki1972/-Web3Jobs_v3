/* Web3Jobs v3 - jobs loader and advanced multi-filter search */
"use strict";

(function () {
    const state = {
        jobs: [], filteredJobs: [], loading: false,
        search: "", type: "", location: "", category: "",
        specialization: "", workMode: "", company: ""
    };

    const CATEGORY_RULES = {
        "Development": ["developer", "development", "engineer", "engineering", "software", "programmer", "coding"],
        "Smart Contract": ["smart contract", "solidity", "vyper", "move", "ink!", "contract developer"],
        "Blockchain": ["blockchain", "protocol", "layer 1", "layer 2", "l2", "l1", "cryptography"],
        "Web3": ["web3", "web 3", "dapp", "dapps", "decentralized", "defi", "dao", "crypto"],
        "AI / Web3 AI": ["artificial intelligence", "machine learning", " ai ", "llm", "generative ai"],
        "Security": ["security", "cybersecurity", "smart contract audit", "penetration", "infosec"],
        "Frontend": ["frontend", "front-end", "react", "next.js", "vue", "angular", "javascript", "typescript"],
        "Backend": ["backend", "back-end", "node.js", "python", "golang", "java", "api engineer"],
        "Full Stack": ["full stack", "full-stack"],
        "DevOps / Infrastructure": ["devops", "infrastructure", "kubernetes", "docker", "cloud engineer", "sre", "site reliability"],
        "Data / Analytics": ["data scientist", "data analyst", "analytics", "data engineer", "sql", "business intelligence"],
        "Design": ["designer", "design", "ui/ux", "ux", "ui designer", "product design", "graphic design"],
        "Product": ["product manager", "product owner", "product lead", "product management"],
        "Marketing": ["marketing", "growth", "seo", "social media", "brand"],
        "Sales / BD": ["sales", "business development", "account executive", "partnerships", "bd manager"],
        "Community": ["community", "community manager", "developer relations", "devrel"],
        "Content": ["content", "copywriter", "writer", "editor", "technical writer"],
        "Finance": ["finance", "accounting", "accountant", "financial analyst", "treasury"],
        "Legal / Compliance": ["legal", "lawyer", "compliance", "regulatory", "aml", "kyc"],
        "Operations": ["operations", "operations manager", "people operations", "hr", "human resources"],
        "Support": ["customer support", "customer success", "technical support", "support specialist"],
        "Research": ["research", "researcher", "economist", "quant", "research scientist"],
        "Internship": ["intern", "internship", "graduate", "apprentice"],
        "Freelance": ["freelance", "freelancer", "contractor", "contract position"]
    };

    const SPECIALIZATION_RULES = {
        "Solidity": ["solidity"], "Rust": ["rust"], "Ethereum": ["ethereum", "evm"],
        "DeFi": ["defi", "decentralized finance"], "NFT": ["nft", "non-fungible"],
        "DAO": ["dao", "decentralized autonomous organization"], "Layer 2": ["layer 2", "l2", "rollup", "zk-rollup"],
        "Bitcoin": ["bitcoin", "btc"], "Trading": ["trading", "trader", "market maker"],
        "Wallets": ["wallet", "wallets", "account abstraction"], "Payments": ["payments", "payment infrastructure"],
        "AI": ["artificial intelligence", "machine learning", "llm", " ai "]
    };

    function client() {
        try {
            if (window.Web3JobsSupabase && typeof window.Web3JobsSupabase.getClient === "function") {
                const c = window.Web3JobsSupabase.getClient();
                if (c && typeof c.from === "function") return c;
            }
        } catch (e) { console.error("Web3Jobs: Supabase client error", e); }
        if (window.supabaseClient && typeof window.supabaseClient.from === "function") return window.supabaseClient;
        return null;
    }

    function container() {
        return document.querySelector("#jobs-list, #jobs-container, .jobs-list, .jobs-container, [data-jobs-list], [data-jobs-container]");
    }

    function esc(v) {
        return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
    }
    function text(v, fallback) { const s = String(v == null ? "" : v).trim(); return s || (fallback || ""); }
    function date(v) { if (!v) return ""; const d = new Date(v); return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", {year:"numeric",month:"short",day:"numeric"}); }
    function jobText(job) { return [job.title, job.company, job.company_name, job.location, job.type, job.description, job.skills, job.salary, job.category, job.specialization, job.work_mode].map(v => text(v).toLowerCase()).join(" "); }

    function classify(job) {
        const value = jobText(job);
        const categories = Object.keys(CATEGORY_RULES).filter(k => CATEGORY_RULES[k].some(x => value.includes(x)));
        const specs = Object.keys(SPECIALIZATION_RULES).filter(k => SPECIALIZATION_RULES[k].some(x => value.includes(x.toLowerCase())));
        return { categories, specializations: specs };
    }

    function detectWorkMode(job) {
        const value = jobText(job);
        const explicit = text(job.work_mode || job.workMode || job.remote_type).toLowerCase();
        if (explicit.includes("hybrid")) return "Hybrid";
        if (explicit.includes("remote")) return "Remote";
        if (explicit.includes("on-site") || explicit.includes("onsite") || explicit.includes("on site")) return "On-site";
        if (/\bremote\b|work from home|distributed|fully remote/.test(value)) return "Remote";
        if (/\bhybrid\b/.test(value)) return "Hybrid";
        if (/\bon[- ]?site\b|in office|office based/.test(value)) return "On-site";
        return "";
    }

    function showLoading() { const el = container(); if (el) el.innerHTML = '<div class="jobs-loading"><h3>Loading jobs...</h3><p>Loading the latest Web3 opportunities.</p></div>'; }
    function showError(message) {
        const el = container(); if (!el) return;
        el.innerHTML = '<div class="no-jobs"><h3>Unable to load jobs</h3><p>' + esc(message || "The jobs database could not be loaded.") + '</p><button id="jobs-retry-button" type="button" style="margin-top:20px;min-height:45px;padding:0 25px;border:0;border-radius:10px;cursor:pointer;background:#6366f1;color:#fff;font-weight:700">Retry</button></div>';
        const b = document.getElementById("jobs-retry-button"); if (b) b.addEventListener("click", loadAllJobs);
    }

    function card(job) {
        const title = text(job.title, "Untitled Job"), company = text(job.company || job.company_name, "Web3 Company");
        const location = text(job.location, "Remote"), type = text(job.type, "Full Time"), salary = text(job.salary, "");
        const description = text(job.description, "No description available."), skills = text(job.skills, ""), apply = text(job.application_url || job.apply_link || job.application_link || job.apply_url, "");
        const created = date(job.created_at || job.source_updated_at || job.updated_at), mode = detectWorkMode(job), cls = classify(job);
        let applyHtml = "";
        if (/^https?:\/\//i.test(apply)) applyHtml = '<a class="job-apply-button" href="' + esc(apply) + '" target="_blank" rel="noopener noreferrer">Apply</a>';
        const tags = [].concat(cls.categories.slice(0,2), mode ? [mode] : []).map(x => '<span class="job-filter-tag">' + esc(x) + '</span>').join("");
        return '<article class="job-card" data-job-id="' + esc(job.id) + '"><div class="job-card-header"><div class="job-card-title"><h3>' + esc(title) + '</h3><div class="job-company">' + esc(company) + '</div></div></div><div class="job-meta"><span>📍 ' + esc(location) + '</span><span>💼 ' + esc(type) + '</span>' + (salary ? '<span>💰 ' + esc(salary) + '</span>' : "") + (created ? '<span>📅 ' + esc(created) + '</span>' : "") + '</div>' + (tags ? '<div class="job-filter-tags">' + tags + '</div>' : "") + (skills ? '<div class="job-skills">' + esc(skills) + '</div>' : "") + '<p class="job-description">' + esc(description) + '</p><div class="job-card-actions"><a class="job-view-button" href="job.html?id=' + encodeURIComponent(job.id == null ? "" : job.id) + '">View Details</a>' + applyHtml + '</div></article>';
    }

    function render() {
        const el = container(); if (!el) return;
        if (!state.filteredJobs.length) { el.innerHTML = '<div class="no-jobs"><h3>No jobs found</h3><p>Try changing or clearing your filters.</p></div>'; return; }
        el.innerHTML = state.filteredJobs.map(card).join("");
    }

    function matches(job) {
        const q = state.search.toLowerCase().trim(), t = text(job.type).toLowerCase(), l = text(job.location).toLowerCase();
        const company = text(job.company || job.company_name).toLowerCase(), value = jobText(job), mode = detectWorkMode(job), cls = classify(job);
        if (state.type && !t.includes(state.type.toLowerCase().trim())) return false;
        if (state.location && !l.includes(state.location.toLowerCase().trim())) return false;
        if (state.company && !company.includes(state.company.toLowerCase().trim())) return false;
        if (state.category && !cls.categories.includes(state.category)) return false;
        if (state.specialization && !cls.specializations.includes(state.specialization)) return false;
        if (state.workMode && mode !== state.workMode) return false;
        if (q && !value.includes(q)) return false;
        return true;
    }
    function filter() { state.filteredJobs = state.jobs.filter(matches); render(); updateCount(); }
    function updateCount() { const el = document.getElementById("jobs-result-count"); if (el) el.textContent = state.filteredJobs.length + " jobs found"; }

    function uniqueCompanies() { return [...new Set(state.jobs.map(j => text(j.company || j.company_name)).filter(Boolean))].sort((a,b)=>a.localeCompare(b)); }
    function injectAdvancedFilters() {
        if (document.getElementById("web3jobs-advanced-filters")) return;
        const host = document.querySelector("#jobs-list, #jobs-container, .jobs-list, .jobs-container, [data-jobs-list], [data-jobs-container]");
        if (!host || !host.parentNode) return;
        const box = document.createElement("div"); box.id = "web3jobs-advanced-filters";
        box.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:0 0 20px;padding:16px;border:1px solid rgba(148,163,184,.25);border-radius:14px;background:rgba(15,23,42,.55);";
        const categories = Object.keys(CATEGORY_RULES), specs = Object.keys(SPECIALIZATION_RULES);
        box.innerHTML = '<input id="job-search" type="search" placeholder="Search jobs, skills, companies..." aria-label="Search jobs">' +
            '<select id="job-category-filter"><option value="">All fields</option>' + categories.map(x=>'<option>'+esc(x)+'</option>').join("") + '</select>' +
            '<select id="job-specialization-filter"><option value="">All specializations</option>' + specs.map(x=>'<option>'+esc(x)+'</option>').join("") + '</select>' +
            '<select id="job-work-mode-filter"><option value="">All work modes</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select>' +
            '<select id="job-type-filter"><option value="">All job types</option><option value="Full Time">Full Time</option><option value="Part Time">Part Time</option><option value="Contract">Contract</option><option value="Internship">Internship</option><option value="Freelance">Freelance</option></select>' +
            '<input id="job-location-filter" type="search" placeholder="Location" aria-label="Filter by location">' +
            '<select id="job-company-filter"><option value="">All companies</option></select>' +
            '<button id="job-clear-filters" type="button">Clear filters</button>' +
            '<div id="jobs-result-count" style="grid-column:1/-1;font-weight:700;opacity:.85"></div>';
        host.parentNode.insertBefore(box, host);
        const companySelect = box.querySelector("#job-company-filter");
        uniqueCompanies().forEach(c => { const o=document.createElement("option"); o.value=c; o.textContent=c; companySelect.appendChild(o); });
        const bind = (id, key) => { const el=document.getElementById(id); if(el) el.addEventListener(el.tagName === "INPUT" ? "input" : "change", e=>{state[key]=e.target.value;filter();}); };
        bind("job-search","search"); bind("job-category-filter","category"); bind("job-specialization-filter","specialization"); bind("job-work-mode-filter","workMode"); bind("job-type-filter","type"); bind("job-location-filter","location"); bind("job-company-filter","company");
        document.getElementById("job-clear-filters").addEventListener("click",()=>{state.search=state.type=state.location=state.category=state.specialization=state.workMode=state.company="";box.querySelectorAll("input").forEach(x=>x.value="");box.querySelectorAll("select").forEach(x=>x.selectedIndex=0);filter();});
    }

    async function queryRange(c, from, to) {
        const result = await Promise.race([c.from("jobs").select("*").order("created_at", {ascending:false}).range(from,to), new Promise((_,reject)=>setTimeout(()=>reject(new Error("Supabase jobs request timed out.")),15000))]);
        if (result.error) throw result.error; return Array.isArray(result.data) ? result.data : [];
    }
    async function loadAllJobs() {
        if (state.loading) return state.jobs; const el=container(); if(!el)return[]; const c=client();
        if(!c){showError("Supabase client is unavailable. Please refresh the page.");return[];}
        state.loading=true; showLoading();
        try { const all=[]; let from=0; const pageSize=1000; while(true){const page=await queryRange(c,from,from+pageSize-1);all.push.apply(all,page);if(page.length<pageSize)break;from+=pageSize;if(from>=10000)break;} state.jobs=all; injectAdvancedFilters(); state.filteredJobs=all.filter(matches); render(); updateCount(); console.log("Web3Jobs: loaded",all.length,"jobs from Supabase."); return all; }
        catch(error){console.error("Web3Jobs: jobs query failed",error);state.jobs=[];state.filteredJobs=[];showError(error&&error.message?error.message:"The jobs database could not be loaded.");return[];}
        finally{state.loading=false;}
    }

    window.Web3JobsJobs = {
        loadAllJobs, getJobs:()=>state.jobs.slice(), searchJobs:value=>{state.search=value||"";filter();},
        filterJobsByType:value=>{state.type=value||"";filter();}, filterJobsByLocation:value=>{state.location=value||"";filter();},
        filterJobsByCategory:value=>{state.category=value||"";filter();}, filterJobsBySpecialization:value=>{state.specialization=value||"";filter();},
        filterJobsByWorkMode:value=>{state.workMode=value||"";filter();}, clearJobFilters:()=>{state.search=state.type=state.location=state.category=state.specialization=state.workMode=state.company="";filter();}
    };

    function init(){bindLegacyFilters();loadAllJobs();}
    function bindLegacyFilters(){
        const search=document.getElementById("job-search"), type=document.getElementById("job-type-filter"), location=document.getElementById("job-location-filter")||document.getElementById("location-filter");
        if(search&&!search.dataset.web3jobsBound){search.dataset.web3jobsBound="1";search.addEventListener("input",e=>{state.search=e.target.value;filter();});}
        if(type&&!type.dataset.web3jobsBound){type.dataset.web3jobsBound="1";type.addEventListener("change",e=>{state.type=e.target.value;filter();});}
        if(location&&!location.dataset.web3jobsBound){location.dataset.web3jobsBound="1";location.addEventListener(location.tagName==="SELECT"?"change":"input",e=>{state.location=e.target.value;filter();});}
    }
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
    window.addEventListener("web3jobs:supabase-ready",loadAllJobs);
})();
