"use strict";

(function () {
  const params = new URLSearchParams(window.location.search);
  const companyName = (params.get("company") || "").trim();
  const esc = (v) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const text = (v, fallback = "") => String(v ?? "").trim() || fallback;
  const container = document.getElementById("company-jobs");

  function client() { return window.Web3JobsSupabase?.waitForClient ? window.Web3JobsSupabase.waitForClient() : Promise.resolve(window.Web3JobsSupabase?.getClient?.() || window.supabaseClient || null); }

  function classify(j) {
    const v = [j.title,j.description,j.skills,j.type].map(x=>text(x).toLowerCase()).join(" ");
    if (/smart contract|solidity|vyper/.test(v)) return "Smart Contract";
    if (/blockchain|protocol|layer 1|layer 2|l2/.test(v)) return "Blockchain";
    if (/frontend|front-end|react|next\.js|typescript/.test(v)) return "Frontend";
    if (/backend|back-end|node\.js|python|golang|java/.test(v)) return "Backend";
    if (/security|cybersecurity|audit|penetration/.test(v)) return "Security";
    if (/marketing|growth|seo|social media/.test(v)) return "Marketing";
    if (/community|devrel/.test(v)) return "Community";
    if (/finance|accounting|treasury/.test(v)) return "Finance";
    return "Web3";
  }

  function mode(j) {
    const v = [j.location,j.description,j.type,j.work_mode,j.remote_type].map(x=>text(x).toLowerCase()).join(" ");
    if (/hybrid/.test(v)) return "Hybrid";
    if (/remote|work from home|distributed/.test(v)) return "Remote";
    if (/on[- ]site|onsite|in office/.test(v)) return "On-site";
    return "Not specified";
  }

  function card(j) {
    const title=text(j.title,"Untitled Job"), location=text(j.location,"Location not specified"), type=text(j.type,"Job"), apply=text(j.application_url||j.apply_link||j.application_link||j.apply_url);
    const applyHtml=/^https?:\/\//i.test(apply)?`<a class="company-job-button" href="${esc(apply)}" target="_blank" rel="noopener noreferrer">Apply</a>`:"";
    return `<article class="company-job-card"><div><span class="company-job-tag">${esc(classify(j))}</span><span class="company-job-tag">${esc(mode(j))}</span><h3>${esc(title)}</h3><p>📍 ${esc(location)} • 💼 ${esc(type)}</p></div><div class="company-job-actions"><a class="company-job-button secondary" href="job.html?id=${encodeURIComponent(j.id ?? "")}">View Details</a>${applyHtml}</div></article>`;
  }

  async function init() {
    if (!companyName) { document.title = "Company | Web3Jobs"; if(container) container.innerHTML='<div class="company-empty"><h2>Company not specified</h2><a href="companies.html">Back to Companies</a></div>'; return; }
    document.getElementById("company-name").textContent = companyName;
    document.title = `${companyName} Jobs | Web3Jobs`;
    try {
      const sb = await client();
      if (!sb) throw new Error("Supabase client is unavailable.");
      const { data, error } = await sb.from("jobs").select("*").ilike("company", companyName).order("created_at", { ascending:false });
      if (error) throw error;
      const jobs = data || [];
      document.getElementById("company-job-count").textContent = `${jobs.length.toLocaleString()} active jobs`;
      document.getElementById("company-location").textContent = [...new Set(jobs.map(j=>text(j.location)).filter(Boolean))].slice(0,3).join(" • ") || "Global / Various locations";
      container.innerHTML = jobs.length ? jobs.map(card).join("") : '<div class="company-empty"><h2>No active jobs found</h2><p>This company is connected to Web3Jobs but currently has no matching active listings.</p></div>';
    } catch (error) {
      console.error("Company page error:", error);
      container.innerHTML = `<div class="company-empty"><h2>Unable to load company jobs</h2><p>${esc(error?.message || "Please refresh the page.")}</p></div>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true }); else init();
})();
