/* Web3Jobs v3 - reliable public jobs loader */
"use strict";

(function () {
    const state = {
        jobs: [],
        filteredJobs: [],
        loading: false,
        search: "",
        type: "",
        location: ""
    };

    function client() {
        try {
            if (window.Web3JobsSupabase && typeof window.Web3JobsSupabase.getClient === "function") {
                const c = window.Web3JobsSupabase.getClient();
                if (c && typeof c.from === "function") return c;
            }
        } catch (e) {
            console.error("Web3Jobs: Supabase client error", e);
        }
        if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
            return window.supabaseClient;
        }
        return null;
    }

    function container() {
        return document.querySelector("#jobs-list, #jobs-container, .jobs-list, .jobs-container, [data-jobs-list], [data-jobs-container]");
    }

    function esc(v) {
        return String(v == null ? "" : v)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function text(v, fallback) {
        const s = String(v == null ? "" : v).trim();
        return s || (fallback || "");
    }

    function date(v) {
        if (!v) return "";
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }

    function showLoading() {
        const el = container();
        if (el) el.innerHTML = '<div class="jobs-loading"><h3>Loading jobs...</h3><p>Loading the latest Web3 opportunities.</p></div>';
    }

    function showError(message) {
        const el = container();
        if (!el) return;
        el.innerHTML = '<div class="no-jobs"><h3>Unable to load jobs</h3><p>' + esc(message || "The jobs database could not be loaded.") + '</p><button id="jobs-retry-button" type="button" style="margin-top:20px;min-height:45px;padding:0 25px;border:0;border-radius:10px;cursor:pointer;background:#6366f1;color:#fff;font-weight:700">Retry</button></div>';
        const b = document.getElementById("jobs-retry-button");
        if (b) b.addEventListener("click", loadAllJobs);
    }

    function card(job) {
        const title = text(job.title, "Untitled Job");
        const company = text(job.company || job.company_name, "Web3 Company");
        const location = text(job.location, "Remote");
        const type = text(job.type, "Full Time");
        const salary = text(job.salary, "");
        const description = text(job.description, "No description available.");
        const skills = text(job.skills, "");
        const apply = text(job.application_url || job.apply_link || job.application_link || job.apply_url, "");
        const created = date(job.created_at || job.source_updated_at || job.updated_at);
        let applyHtml = "";
        if (/^https?:\/\//i.test(apply)) {
            applyHtml = '<a class="job-apply-button" href="' + esc(apply) + '" target="_blank" rel="noopener noreferrer">Apply</a>';
        }
        return '<article class="job-card" data-job-id="' + esc(job.id) + '">' +
            '<div class="job-card-header"><div class="job-card-title"><h3>' + esc(title) + '</h3><div class="job-company">' + esc(company) + '</div></div></div>' +
            '<div class="job-meta"><span>📍 ' + esc(location) + '</span><span>💼 ' + esc(type) + '</span>' +
            (salary ? '<span>💰 ' + esc(salary) + '</span>' : "") +
            (created ? '<span>📅 ' + esc(created) + '</span>' : "") + '</div>' +
            (skills ? '<div class="job-skills">' + esc(skills) + '</div>' : "") +
            '<p class="job-description">' + esc(description) + '</p>' +
            '<div class="job-card-actions"><a class="job-view-button" href="job.html?id=' + encodeURIComponent(job.id == null ? "" : job.id) + '">View Details</a>' + applyHtml + '</div>' +
            '</article>';
    }

    function render() {
        const el = container();
        if (!el) return;
        if (!state.filteredJobs.length) {
            el.innerHTML = '<div class="no-jobs"><h3>No jobs found</h3><p>There are currently no jobs matching your search.</p></div>';
            return;
        }
        el.innerHTML = state.filteredJobs.map(card).join("");
    }

    function matches(job) {
        const q = state.search.toLowerCase().trim();
        const t = text(job.type).toLowerCase();
        const l = text(job.location).toLowerCase();
        if (state.type && t !== state.type.toLowerCase().trim()) return false;
        if (state.location && !l.includes(state.location.toLowerCase().trim())) return false;
        if (!q) return true;
        return [job.title, job.company, job.company_name, job.location, job.type, job.description, job.skills, job.salary]
            .map(v => text(v).toLowerCase()).join(" ").includes(q);
    }

    function filter() {
        state.filteredJobs = state.jobs.filter(matches);
        render();
    }

    async function queryRange(c, from, to) {
        const result = await Promise.race([
            c.from("jobs").select("*").order("created_at", { ascending: false }).range(from, to),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Supabase jobs request timed out.")), 15000))
        ]);
        if (result.error) throw result.error;
        return Array.isArray(result.data) ? result.data : [];
    }

    async function loadAllJobs() {
        if (state.loading) return state.jobs;
        const el = container();
        if (!el) return [];
        const c = client();
        if (!c) {
            showError("Supabase client is unavailable. Please refresh the page.");
            return [];
        }

        state.loading = true;
        showLoading();

        try {
            /* Supabase normally returns at most 1,000 rows per request. Fetch in pages so all 1,867+ jobs are available. */
            const all = [];
            let from = 0;
            const pageSize = 1000;
            while (true) {
                const page = await queryRange(c, from, from + pageSize - 1);
                all.push.apply(all, page);
                if (page.length < pageSize) break;
                from += pageSize;
                if (from >= 10000) break;
            }

            state.jobs = all;
            state.filteredJobs = all.filter(matches);
            render();
            console.log("Web3Jobs: loaded", all.length, "jobs from Supabase.");
            return all;
        } catch (error) {
            console.error("Web3Jobs: jobs query failed", error);
            state.jobs = [];
            state.filteredJobs = [];
            showError(error && error.message ? error.message : "The jobs database could not be loaded.");
            return [];
        } finally {
            state.loading = false;
        }
    }

    function bindFilters() {
        const search = document.getElementById("job-search");
        const type = document.getElementById("job-type-filter");
        const location = document.getElementById("job-location-filter") || document.getElementById("location-filter");
        if (search) search.addEventListener("input", e => { state.search = e.target.value; filter(); });
        if (type) type.addEventListener("change", e => { state.type = e.target.value; filter(); });
        if (location) location.addEventListener("input", e => { state.location = e.target.value; filter(); });
        if (location && location.tagName === "SELECT") location.addEventListener("change", e => { state.location = e.target.value; filter(); });
    }

    window.Web3JobsJobs = {
        loadAllJobs,
        getJobs: () => state.jobs.slice(),
        searchJobs: value => { state.search = value || ""; filter(); },
        filterJobsByType: value => { state.type = value || ""; filter(); },
        filterJobsByLocation: value => { state.location = value || ""; filter(); },
        clearJobFilters: () => { state.search = state.type = state.location = ""; filter(); }
    };

    function init() {
        bindFilters();
        loadAllJobs();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }

    /* Also retry after the unified Supabase client becomes available. */
    window.addEventListener("web3jobs:supabase-ready", loadAllJobs);
})();
