/* Web3Jobs Company Dashboard Core — non-payment functionality only. */
"use strict";
(() => {
  let sb = null;
  let user = null;
  let profile = null;
  let company = null;
  let plan = { code: "free", name: "Free", limit: 2 };
  let jobs = [];

  const getClient = () => {
    if (sb) return sb;
    sb = window.supabaseClient || window.__web3jobsSupabase || null;
    return sb;
  };

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  const alertBox = (message, type = "success") => {
    const el = document.getElementById("dashboard-alert");
    if (!el) return;
    el.textContent = message;
    el.className = type;
    el.style.display = "block";
    clearTimeout(alertBox.timer);
    alertBox.timer = setTimeout(() => { el.style.display = "none"; }, 7000);
  };
  window.showDashboardAlert = alertBox;

  const getUser = async () => {
    const client = getClient();
    if (!client?.auth) throw new Error("Supabase connection is not initialized.");
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    user = data?.user || null;
    if (!user) { location.href = "login.html"; return null; }
    return user;
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await getClient().from("profiles").select("*").eq("id", user.id).maybeSingle();
    profile = data || null;
    updateCompanyName();
  };

  const loadCompany = async () => {
    if (!user) return;
    const { data } = await getClient().from("company_profiles").select("*").eq("id", user.id).maybeSingle();
    company = data || null;
    updateCompanyName();
  };

  const companyName = () => company?.company_name || company?.name || profile?.company_name ||
    profile?.name || profile?.full_name || user?.user_metadata?.company_name ||
    user?.user_metadata?.name || user?.email?.split("@")[0] || "Company";

  const updateCompanyName = () => {
    const name = companyName();
    const input = document.getElementById("job-company");
    const side = document.getElementById("sidebar-company-name");
    if (input && !input.value) input.value = name;
    if (side) side.textContent = name;
  };

  const loadSubscription = async () => {
    if (!user) return;
    try {
      const { data, error } = await getClient().from("company_plans").select("*")
        .eq("company_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error || !data) { plan = { code: "free", name: "Free", limit: 2 }; }
      else {
        const code = String(data.plan_code || data.plan || data.code || "free").toLowerCase();
        const limits = { free: 2, starter: 5, professional: 20, enterprise: Infinity };
        const names = { free: "Free", starter: "Starter", professional: "Professional", enterprise: "Enterprise" };
        const expired = data.expires_at && new Date(data.expires_at) <= new Date();
        plan = expired ? { code: "free", name: "Free", limit: 2 } : { code, name: names[code] || "Free", limit: limits[code] ?? 2 };
      }
    } catch (_) { plan = { code: "free", name: "Free", limit: 2 }; }
    updatePlanUI();
  };

  const updatePlanUI = () => {
    document.querySelectorAll(".plan-button").forEach(b => b.classList.toggle("active", b.dataset.plan === plan.code));
    const note = document.getElementById("publish-note");
    if (note) note.textContent = `Current plan: ${plan.name} — ${plan.limit === Infinity ? "Unlimited" : plan.limit} jobs / month.`;
    const status = document.getElementById("subscription-status");
    if (status) status.textContent = plan.code === "free" ? "Free plan" : `${plan.name} plan active`;
  };

  const renderJobs = () => {
    const list = document.getElementById("company-jobs-list");
    if (!list) return;
    if (!jobs.length) { list.innerHTML = '<div class="empty-state">You have not published any jobs yet.</div>'; return; }
    list.innerHTML = jobs.map(job => `<article class="job-card"><div class="job-card-header"><div><div class="job-title">${esc(job.title || "Untitled Job")}</div><div class="job-meta"><span>${esc(job.company || companyName())}</span><span>${esc(job.location || "Remote")}</span><span>${esc(job.type || "Full-time")}</span></div></div><div class="job-actions">${job.apply_link ? `<a class="small-button" href="${esc(job.apply_link)}" target="_blank" rel="noopener noreferrer">View Apply Link</a>` : ""}<button class="small-button delete" type="button" data-delete-job="${esc(job.id)}">Delete</button></div></div><div class="job-description">${esc(String(job.description || "").slice(0, 500))}</div></article>`).join("");
    list.querySelectorAll("[data-delete-job]").forEach(b => b.addEventListener("click", () => deleteJob(b.dataset.deleteJob)));
  };

  const loadJobs = async () => {
    const list = document.getElementById("company-jobs-list");
    if (!user || !list) return;
    const { data, error } = await getClient().from("jobs").select("*").eq("company_id", user.id).order("created_at", { ascending: false });
    if (error) { list.innerHTML = '<div class="empty-state">Unable to load your jobs.</div>'; return; }
    jobs = data || []; renderJobs();
  };

  const deleteJob = async id => {
    if (!user || !id || !confirm("Delete this job?")) return;
    const { error } = await getClient().from("jobs").delete().eq("id", id).eq("company_id", user.id);
    if (error) { alertBox("Unable to delete the job.", "error"); return; }
    alertBox("Job deleted successfully."); await loadJobs();
  };

  const addJob = async form => {
    if (!user) throw new Error("You are not signed in.");
    if (plan.limit !== Infinity && jobs.length >= plan.limit) throw new Error(`Your ${plan.name} plan allows ${plan.limit} job postings. Please upgrade your plan.`);
    const fd = new FormData(form);
    const payload = { title: String(fd.get("title") || "").trim(), company: String(fd.get("company") || companyName()).trim(), location: String(fd.get("location") || "").trim(), type: String(fd.get("type") || "Full-time").trim(), apply_link: String(fd.get("apply_link") || "").trim(), description: String(fd.get("description") || "").trim(), company_id: user.id };
    if (!payload.title || !payload.company || !payload.description) throw new Error("Please complete all required fields.");
    const { error } = await getClient().from("jobs").insert(payload);
    if (error) throw error;
    form.reset(); updateCompanyName(); alertBox("Job published successfully."); await loadJobs();
  };

  const loadApplications = async () => {
    const body = document.getElementById("applications-table-body");
    if (!user || !body) return;
    const { data, error } = await getClient().from("applications").select("*, jobs(title, company_id)").eq("jobs.company_id", user.id).order("created_at", { ascending: false });
    if (error || !data?.length) { body.innerHTML = '<tr><td colspan="4" class="empty-state">No applications yet.</td></tr>'; return; }
    body.innerHTML = data.map(a => `<tr><td>${esc(a.candidate_name || a.name || a.email || a.user_id || "Candidate")}</td><td>${esc(a.jobs?.title || "Job")}</td><td><span class="status">${esc(a.status || "submitted")}</span></td><td>${a.created_at ? esc(new Date(a.created_at).toLocaleDateString()) : "—"}</td></tr>`).join("");
  };

  const init = async () => {
    try {
      getClient();
      await getUser();
      if (!user) return;
      await loadProfile(); await loadCompany(); await loadSubscription(); await loadJobs(); await loadApplications();
      const form = document.getElementById("post-job-form");
      if (form && !form.dataset.wjBound) {
        form.dataset.wjBound = "1";
        form.addEventListener("submit", async e => {
          e.preventDefault();
          const button = document.getElementById("publish-job-button");
          if (button) button.disabled = true;
          try { await addJob(form); } catch (error) { alertBox(error?.message || "Unable to publish the job.", "error"); }
          finally { if (button) button.disabled = false; }
        });
      }
      const loader = document.getElementById("loading-spinner");
      const dashboard = document.getElementById("dashboard-content");
      if (loader) loader.style.display = "none";
      if (dashboard) dashboard.style.display = "block";
    } catch (error) {
      console.error("Company dashboard initialization error:", error);
      const loader = document.getElementById("loading-spinner");
      if (loader) loader.innerHTML = `<div class="loading-card"><div class="loading-logo">W3</div><h2>Unable to load dashboard</h2><p>${esc(error?.message || "An unexpected error occurred.")}</p><button type="button" onclick="location.reload()">Try Again</button></div>`;
    }
  };

  window.Web3JobsCompanyDashboard = {
    getCurrentPlan: () => plan,
    getConnectedWallet: () => null,
    plans: { free: { code: "free", name: "Free", limit: 2 }, starter: { code: "starter", name: "Starter", limit: 5 }, professional: { code: "professional", name: "Professional", limit: 20 }, enterprise: { code: "enterprise", name: "Enterprise", limit: Infinity } },
    connectWallet: () => window.Web3JobsCanonicalSubscription?.verifyWallet?.(),
    payUSDT: () => { throw new Error("Legacy payment path disabled. Use the canonical subscription controller."); }
  };
  window.handlePlanSelection = code => {
    const button = document.querySelector(`.plan-button[data-plan="${CSS.escape(String(code).toLowerCase())}"], [data-pay-plan="${CSS.escape(String(code).toLowerCase())}"]`);
    if (button) { button.click(); return; }
    throw new Error("Use the canonical subscription controller.");
  };
  window.selectPlan = window.handlePlanSelection;
  window.connectPaymentWallet = () => window.Web3JobsCanonicalSubscription?.verifyWallet?.();

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
