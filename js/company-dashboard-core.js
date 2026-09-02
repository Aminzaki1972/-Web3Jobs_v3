/* Web3Jobs Company Dashboard Core — canonical company/job/subscription logic. */
"use strict";
(() => {
  let sb = null;
  let user = null;
  let profile = null;
  let company = null;
  let plan = { code: "free", name: "Free", limit: 2, used: 0 };
  let jobs = [];

  const PLANS = Object.freeze({
    free: { code: "free", name: "Free", limit: 2 },
    starter: { code: "starter", name: "Starter", limit: 10 },
    professional: { code: "professional", name: "Professional", limit: 30 },
    enterprise: { code: "enterprise", name: "Enterprise", limit: Infinity }
  });

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
    if (!user) { location.href = "login.html?redirect=company-dashboard.html"; return null; }
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
    const { data } = await getClient().from("company_profiles").select("*").eq("user_id", user.id).maybeSingle();
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

  const normalizePlanCode = value => {
    const raw = String(value || "free").trim().toLowerCase();
    if (PLANS[raw]) return raw;
    const match = raw.match(/(free|starter|professional|enterprise)/);
    return match ? match[1] : "free";
  };

  const loadSubscription = async () => {
    plan = { ...PLANS.free, used: 0 };
    if (!user) return;
    try {
      const { data, error } = await getClient().from("subscriptions").select("plan_name,status,current_period_end,current_period_start,started_at,amount,currency")
        .eq("user_id", user.id).in("status", ["active", "trialing"]).order("current_period_end", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
      if (!error && data) {
        const end = data.current_period_end ? new Date(data.current_period_end) : null;
        if (!end || end > new Date()) {
          const code = normalizePlanCode(data.plan_name);
          plan = { ...PLANS[code], used: 0, periodEnd: data.current_period_end || null };
        }
      }
      const { count, error: countError } = await getClient().from("jobs").select("id", { count: "exact", head: true })
        .eq("company_id", user.id).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
      if (!countError) plan.used = Number(count || 0);
    } catch (_) {
      plan = { ...PLANS.free, used: 0 };
    }
    updatePlanUI();
  };

  const updatePlanUI = () => {
    document.querySelectorAll(".plan-button").forEach(b => b.classList.toggle("active", b.dataset.plan === plan.code));
    const remaining = plan.limit === Infinity ? "Unlimited" : Math.max(0, plan.limit - plan.used);
    const note = document.getElementById("publish-note");
    if (note) note.textContent = `Current plan: ${plan.name} — ${plan.limit === Infinity ? "Unlimited" : plan.limit} jobs / month. Used: ${plan.used}. Remaining: ${remaining}.`;
    const status = document.getElementById("subscription-status");
    if (status) status.textContent = plan.code === "free" ? "Free plan" : `${plan.name} plan active`;
  };

  const renderJobs = () => {
    const list = document.getElementById("company-jobs-list");
    if (!list) return;
    if (!jobs.length) { list.innerHTML = '<div class="empty-state">You have not published any jobs yet.</div>'; return; }
    list.innerHTML = jobs.map(job => `<article class="job-card"><div class="job-card-header"><div><div class="job-title">${esc(job.title || "Untitled Job")}</div><div class="job-meta"><span>${esc(job.company || companyName())}</span><span>${esc(job.location || "Remote")}</span><span>${esc(job.type || "Full-time")}</span></div></div><div class="job-actions">${job.apply_link || job.application_url ? `<a class="small-button" href="${esc(job.apply_link || job.application_url)}" target="_blank" rel="noopener noreferrer">View Apply Link</a>` : ""}<button class="small-button delete" type="button" data-delete-job="${esc(job.id)}">Delete</button></div></div><div class="job-description">${esc(String(job.description || "").slice(0, 500))}</div></article>`).join("");
    list.querySelectorAll("[data-delete-job]").forEach(b => b.addEventListener("click", () => deleteJob(b.dataset.deleteJob)));
  };

  const loadJobs = async () => {
    const list = document.getElementById("company-jobs-list");
    if (!user || !list) return;
    const { data, error } = await getClient().from("jobs").select("*").eq("company_id", user.id).order("created_at", { ascending: false });
    if (error) { list.innerHTML = '<div class="empty-state">Unable to load your jobs.</div>'; return; }
    jobs = data || [];
    renderJobs();
  };

  const deleteJob = async id => {
    if (!user || !id || !confirm("Delete this job?")) return;
    const { error } = await getClient().from("jobs").delete().eq("id", id).eq("company_id", user.id);
    if (error) { alertBox("Unable to delete the job.", "error"); return; }
    alertBox("Job deleted successfully.");
    await loadJobs();
    await loadSubscription();
  };

  const addJob = async form => {
    if (!user) throw new Error("You are not signed in.");
    if (plan.limit !== Infinity && plan.used >= plan.limit) throw new Error(`Your ${plan.name} plan has reached its monthly limit of ${plan.limit} job postings. Please upgrade your plan.`);
    const fd = new FormData(form);
    const payload = {
      title: String(fd.get("title") || "").trim(),
      company: String(fd.get("company") || companyName()).trim(),
      location: String(fd.get("location") || "").trim(),
      type: String(fd.get("type") || "Full-time").trim(),
      apply_link: String(fd.get("apply_link") || fd.get("application_url") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      company_id: user.id,
      user_id: user.id,
      is_active: true,
      published_at: new Date().toISOString()
    };
    if (!payload.title || !payload.company || !payload.description) throw new Error("Please complete all required fields.");
    const { error } = await getClient().from("jobs").insert(payload);
    if (error) throw error;
    form.reset();
    updateCompanyName();
    alertBox("Job published successfully.");
    await loadJobs();
    await loadSubscription();
  };

  const loadApplications = async () => {
    const body = document.getElementById("applications-table-body");
    if (!user || !body) return;
    const { data, error } = await getClient().rpc("get_company_applications");
    if (error || !Array.isArray(data) || !data.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-state">No applications yet.</td></tr>';
      return;
    }
    body.innerHTML = data.map(a => `<tr><td>${esc(a.candidate_name || a.candidate_email || a.user_id || "Candidate")}</td><td>${esc(a.job_title || "Job")}</td><td><span class="status">${esc(a.status || "submitted")}</span></td><td>${esc(a.created_at ? new Date(a.created_at).toLocaleDateString() : "—")}</td><td>${a.candidate_cv_url ? "CV available" : (a.resume_url ? "CV available" : "No CV")}</td></tr>`).join("");
  };

  const init = async () => {
    try {
      getClient();
      await getUser();
      if (!user) return;
      await loadProfile();
      await loadCompany();
      await loadSubscription();
      await loadJobs();
      await loadApplications();
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
    plans: PLANS,
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
