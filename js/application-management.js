/* Web3Jobs v3 - secure company application management */
"use strict";
(() => {
  const getClient = () => window.Web3JobsSupabase?.getClient?.() || window.supabaseClient || null;
  const statuses = ["submitted", "reviewing", "shortlisted", "accepted", "rejected"];
  const esc = value => {
    const d = document.createElement("div");
    d.textContent = value == null ? "" : String(value);
    return d.innerHTML;
  };
  const cvUrl = async path => {
    if (!path) return null;
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.storage.from("candidate-cvs").createSignedUrl(path, 3600);
    return error ? null : data?.signedUrl || null;
  };
  async function load() {
    const body = document.getElementById("applications-table-body");
    const client = getClient();
    if (!body || !client) return;
    const { data, error } = await client.rpc("get_company_applications");
    if (error) {
      console.error("Company applications load failed:", error);
      body.innerHTML = `<tr><td colspan="5">Unable to load applications.</td></tr>`;
      return;
    }
    if (!Array.isArray(data) || !data.length) {
      body.innerHTML = `<tr><td colspan="5">No applications yet.</td></tr>`;
      return;
    }
    body.innerHTML = data.map(a => `
      <tr>
        <td>${esc(a.candidate_name || a.candidate_email || a.user_id || "Candidate")}</td>
        <td>${esc(a.job_title || "Job")}</td>
        <td>
          <select class="application-status-select" data-application-id="${esc(a.id)}" aria-label="Application status">
            ${statuses.map(s => `<option value="${s}" ${s === a.status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </td>
        <td>${esc(a.created_at ? new Date(a.created_at).toLocaleDateString() : "—")}</td>
        <td>
          ${a.candidate_cv_url ? `<button type="button" class="small-button application-cv" data-cv-path="${esc(a.candidate_cv_url)}">View CV</button>` : "No CV"}
        </td>
      </tr>`).join("");
    body.querySelectorAll(".application-status-select").forEach(select => {
      select.addEventListener("change", async () => {
        const id = select.dataset.applicationId;
        const next = select.value;
        select.disabled = true;
        const { error: updateError } = await client.from("applications").update({ status: next, updated_at: new Date().toISOString() }).eq("id", id);
        select.disabled = false;
        if (updateError) {
          console.error("Application status update failed:", updateError);
          alert("Unable to update application status.");
          await load();
          return;
        }
        select.dataset.saved = next;
      });
    });
    body.querySelectorAll(".application-cv").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        const url = await cvUrl(button.dataset.cvPath);
        button.disabled = false;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        else alert("Unable to open the CV.");
      });
    });
  }
  const init = () => { load().catch(err => console.error("Application management init failed:", err)); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
