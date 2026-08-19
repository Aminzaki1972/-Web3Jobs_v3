"use strict";

(function () {
  const PAGE_SIZE = 1000;
  const state = { jobs: [], companies: [], search: "" };

  async function client() {
    if (window.Web3JobsSupabase?.waitForClient) return window.Web3JobsSupabase.waitForClient();
    return window.Web3JobsSupabase?.getClient?.() || window.supabaseClient || null;
  }

  const text = (v, fallback = "") => String(v ?? "").trim() || fallback;
  const esc = (v) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const initials = (name) => text(name, "C").split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase();

  async function fetchJobs(sb) {
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      // jobs.company is the real column in the current schema.
      // Do not request the removed/nonexistent company_name column.
      const { data, error } = await sb.from("jobs").select("company,title,location,type,created_at,is_active").eq("is_active", true).order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < PAGE_SIZE) break;
      if (from >= 10000) break;
    }
    return rows;
  }

  function buildCompanies(rows) {
    const map = new Map();
    rows.forEach(job => {
      const name = text(job.company);
      if (!name) return;
      const key = name.toLowerCase().replace(/\s+/g," ").trim();
      const existing = map.get(key) || { name, jobs: 0, locations: new Set(), types: new Set(), latest: job.created_at || null };
      existing.jobs++;
      if (job.location) existing.locations.add(text(job.location));
      if (job.type) existing.types.add(text(job.type));
      if (!existing.latest || new Date(job.created_at || 0) > new Date(existing.latest || 0)) existing.latest = job.created_at;
      map.set(key, existing);
    });
    return [...map.values()].sort((a,b) => b.jobs - a.jobs || a.name.localeCompare(b.name));
  }

  function render() {
    const grid = document.getElementById("companies-grid");
    const count = document.getElementById("companies-count");
    if (!grid) return;
    const q = state.search.toLowerCase().trim();
    const list = state.companies.filter(c => !q || c.name.toLowerCase().includes(q));
    if (count) count.textContent = `${list.length.toLocaleString()} companies • ${state.jobs.length.toLocaleString()} active jobs`;
    grid.innerHTML = list.length ? list.map(c => {
      const location = [...c.locations][0] || "Global / Various locations";
      const href = `company.html?company=${encodeURIComponent(c.name)}`;
      return `<article class="company-card">
        <div class="company-logo">${esc(initials(c.name))}</div>
        <div class="company-card-body">
          <span class="company-tag">Web3 Jobs Partner</span>
          <h3>${esc(c.name)}</h3>
          <p>${c.jobs.toLocaleString()} active job${c.jobs === 1 ? "" : "s"} • ${esc(location)}</p>
          <a class="company-button" href="${href}">View Company & Jobs</a>
        </div>
      </article>`;
    }).join("") : `<div class="companies-empty"><h3>No companies found</h3><p>Try another company name.</p></div>`;
  }

  async function init() {
    const grid = document.getElementById("companies-grid");
    if (!grid) return;
    try {
      const sb = await client();
      if (!sb) throw new Error("Supabase client is unavailable.");
      state.jobs = await fetchJobs(sb);
      state.companies = buildCompanies(state.jobs);
      render();
    } catch (error) {
      console.error("Company directory error:", error);
      grid.innerHTML = `<div class="companies-empty"><h3>Unable to load companies</h3><p>${esc(error?.message || "Please refresh the page.")}</p></div>`;
    }
    document.getElementById("company-search")?.addEventListener("input", e => { state.search = e.target.value; render(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
