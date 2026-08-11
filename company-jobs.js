/* =========================================================
   Web3Jobs
   File: js/company-jobs.js

   Company Jobs Management
   Supabase + Authentication + Company Jobs
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const COMPANY_JOBS_CONFIG = {
    supabaseUrl:
        "https://uewocyaspztybnvnkbmo.supabase.co"
};


/* =========================================================
   STATE
   ========================================================= */

let supabaseClient = null;
let currentUser = null;
let currentCompanyProfile = null;
let companyJobs = [];
let jobsInitialized = false;


/* =========================================================
   SUPABASE
   ========================================================= */

function getSupabaseClient() {

    if (supabaseClient) {
        return supabaseClient;
    }

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {
        supabaseClient = window.supabaseClient;
        return supabaseClient;
    }

    if (
        window.supabase &&
        typeof window.supabase.createClient === "function"
    ) {

        const key =
            window.SUPABASE_ANON_KEY ||
            window.SUPABASE_KEY ||
            window.supabaseKey ||
            window.SUPABASE_PUBLISHABLE_KEY;

        if (!key) {
            throw new Error(
                "Supabase key is missing."
            );
        }

        supabaseClient =
            window.supabase.createClient(
                COMPANY_JOBS_CONFIG.supabaseUrl,
                key
            );

        return supabaseClient;
    }

    throw new Error(
        "Supabase client is not available. Check js/supabase.js."
    );
}


/* =========================================================
   DOM
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function setText(id, value) {

    const element = $(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : String(value);
}


/* =========================================================
   HTML SECURITY
   ========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   ALERT
   ========================================================= */

function showAlert(
    message,
    type = "success"
) {

    const alert =
        $("jobs-alert") ||
        $("dashboard-alert");

    if (!alert) {

        console.log(message);

        return;
    }

    alert.textContent =
        message;

    alert.className =
        "alert " + type;

    alert.style.display =
        "block";

    window.clearTimeout(
        showAlert.timer
    );

    showAlert.timer =
        setTimeout(
            () => {
                alert.style.display =
                    "none";
            },
            5000
        );
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function getCurrentUser() {

    const client =
        getSupabaseClient();

    const {
        data,
        error
    } =
        await client.auth.getSession();

    if (error) {
        throw error;
    }

    if (
        data &&
        data.session &&
        data.session.user
    ) {
        return data.session.user;
    }

    const {
        data: userData,
        error: userError
    } =
        await client.auth.getUser();

    if (userError) {
        return null;
    }

    return userData?.user || null;
}


/* =========================================================
   COMPANY PROFILE
   ========================================================= */

async function loadCompanyProfile() {

    if (!currentUser) {
        return null;
    }

    const client =
        getSupabaseClient();

    let result =
        await client
            .from("company_profiles")
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .maybeSingle();

    if (
        result.error &&
        String(
            result.error.message || ""
        )
            .toLowerCase()
            .includes("user_id")
    ) {

        result =
            await client
                .from("company_profiles")
                .select("*")
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();
    }

    if (result.error) {

        console.warn(
            "Company profile could not be loaded:",
            result.error.message
        );

        return null;
    }

    currentCompanyProfile =
        result.data || null;

    return currentCompanyProfile;
}


/* =========================================================
   COMPANY NAME
   ========================================================= */

function getCompanyName() {

    return (
        currentCompanyProfile?.company_name ||
        currentCompanyProfile?.name ||
        currentUser?.user_metadata?.company_name ||
        currentUser?.user_metadata?.name ||
        currentUser?.email?.split("@")[0] ||
        "Company"
    );
}


/* =========================================================
   LOAD JOBS
   ========================================================= */

async function loadCompanyJobs() {

    if (!currentUser) {
        return [];
    }

    const client =
        getSupabaseClient();

    let result =
        await client
            .from("jobs")
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

    /*
     * Fallback for older jobs tables
     * that do not contain user_id.
     */

    if (
        result.error &&
        String(
            result.error.message || ""
        )
            .toLowerCase()
            .includes("user_id")
    ) {

        result =
            await client
                .from("jobs")
                .select("*")
                .eq(
                    "company",
                    getCompanyName()
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );
    }

    if (result.error) {

        console.error(
            "Jobs loading error:",
            result.error
        );

        companyJobs = [];

        renderJobs();

        showAlert(
            "Unable to load company jobs.",
            "error"
        );

        return [];
    }

    companyJobs =
        result.data || [];

    renderJobs();

    updateStatistics();

    return companyJobs;
}


/* =========================================================
   STATISTICS
   ========================================================= */

function updateStatistics() {

    const total =
        companyJobs.length;

    setText(
        "jobs-count",
        total
    );

    setText(
        "total-jobs",
        total
    );

    setText(
        "published-jobs-count",
        total
    );

    setText(
        "job-count",
        total
    );

    const active =
        companyJobs.filter(
            job => {

                const status =
                    String(
                        job.status ||
                        "active"
                    ).toLowerCase();

                return (
                    status !== "closed" &&
                    status !== "inactive" &&
                    status !== "draft"
                );
            }
        ).length;

    setText(
        "active-jobs-count",
        active
    );
}


/* =========================================================
   RENDER JOBS
   ========================================================= */

function renderJobs() {

    const container =
        $("company-jobs-list") ||
        $("jobs-list") ||
        $("jobs-container");

    if (!container) {
        return;
    }

    if (!companyJobs.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    💼
                </div>

                <h3>
                    No Jobs Published Yet
                </h3>

                <p>
                    You have not published any jobs.
                    Create your first Web3 job opportunity.
                </p>

                <a
                    href="company-dashboard.html"
                    class="primary-button"
                >
                    Post a New Job
                </a>

            </div>
        `;

        return;
    }

    container.innerHTML =
        companyJobs
            .map(
                job => renderJobCard(job)
            )
            .join("");

    setupJobActions();
}


/* =========================================================
   JOB CARD
   ========================================================= */

function renderJobCard(job) {

    const title =
        escapeHtml(
            job.title ||
            "Untitled Job"
        );

    const company =
        escapeHtml(
            job.company ||
            getCompanyName()
        );

    const location =
        escapeHtml(
            job.location ||
            "Remote"
        );

    const type =
        escapeHtml(
            job.type ||
            "Full-time"
        );

    const description =
        escapeHtml(
            job.description ||
            ""
        );

    const status =
        String(
            job.status ||
            "active"
        ).toLowerCase();

    const safeStatus =
        [
            "active",
            "closed",
            "inactive",
            "draft"
        ].includes(status)
            ? status
            : "active";

    return `
        <article
            class="company-job-card"
            data-job-id="${escapeHtml(job.id)}"
        >

            <div class="company-job-card-header">

                <div class="company-job-main">

                    <h3>
                        ${title}
                    </h3>

                    <div class="company-job-meta">

                        <span>
                            🏢 ${company}
                        </span>

                        <span>
                            📍 ${location}
                        </span>

                        <span>
                            💼 ${type}
                        </span>

                        <span>
                            📅 ${formatDate(
                                job.created_at
                            )}
                        </span>

                    </div>

                </div>

                <span
                    class="job-status ${safeStatus}"
                >
                    ${capitalize(
                        safeStatus
                    )}
                </span>

            </div>

            ${
                description
                    ? `
                        <p class="company-job-description">
                            ${description}
                        </p>
                      `
                    : ""
            }

            <div class="company-job-footer">

                <div class="job-id">
                    Job #${escapeHtml(
                        job.id
                    )}
                </div>

                <div class="job-actions">

                    ${
                        job.apply_link
                            ? `
                                <a
                                    href="${escapeHtml(
                                        job.apply_link
                                    )}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="small-button"
                                >
                                    View Apply Link
                                </a>
                              `
                            : ""
                    }

                    <button
                        type="button"
                        class="small-button danger"
                        data-delete-job="${escapeHtml(
                            job.id
                        )}"
                    >
                        Delete
                    </button>

                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   JOB ACTIONS
   ========================================================= */

function setupJobActions() {

    document
        .querySelectorAll(
            "[data-delete-job]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const jobId =
                            button.dataset
                                .deleteJob;

                        deleteJob(jobId);
                    }
                );
            }
        );
}


/* =========================================================
   DELETE JOB
   ========================================================= */

async function deleteJob(jobId) {

    if (!jobId) {
        return;
    }

    const confirmed =
        window.confirm(
            "Are you sure you want to delete this job?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const client =
            getSupabaseClient();

        let result =
            await client
                .from("jobs")
                .delete()
                .eq(
                    "id",
                    jobId
                )
                .eq(
                    "user_id",
                    currentUser.id
                );

        /*
         * Older database fallback.
         */

        if (
            result.error &&
            String(
                result.error.message || ""
            )
                .toLowerCase()
                .includes("user_id")
        ) {

            result =
                await client
                    .from("jobs")
                    .delete()
                    .eq(
                        "id",
                        jobId
                    );
        }

        if (result.error) {
            throw result.error;
        }

        showAlert(
            "Job deleted successfully.",
            "success"
        );

        await loadCompanyJobs();

    } catch (error) {

        console.error(
            "Delete job error:",
            error
        );

        showAlert(
            error.message ||
            "Unable to delete the job.",
            "error"
        );
    }
}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

    const input =
        $("job-search") ||
        $("jobs-search") ||
        $("search-jobs");

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLowerCase();

            const filtered =
                companyJobs.filter(
                    job => {

                        const text =
                            [
                                job.title,
                                job.company,
                                job.location,
                                job.type,
                                job.description
                            ]
                                .filter(Boolean)
                                .join(" ")
                                .toLowerCase();

                        return text.includes(
                            query
                        );
                    }
                );

            renderFilteredJobs(
                filtered
            );
        }
    );
}


/* =========================================================
   FILTERED JOBS
   ========================================================= */

function renderFilteredJobs(
    jobs
) {

    const container =
        $("company-jobs-list") ||
        $("jobs-list") ||
        $("jobs-container");

    if (!container) {
        return;
    }

    if (!jobs.length) {

        container.innerHTML = `
            <div class="empty-state">

                <h3>
                    No matching jobs
                </h3>

                <p>
                    Try a different search term.
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML =
        jobs
            .map(
                job =>
                    renderJobCard(job)
            )
            .join("");

    setupJobActions();
}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


/* =========================================================
   CAPITALIZE
   ========================================================= */

function capitalize(value) {

    if (!value) {
        return "";
    }

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

    try {

        const client =
            getSupabaseClient();

        await client.auth.signOut();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );
    }

    window.location.href =
        "login.html";
}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEventListeners() {

    const logoutButton =
        $("logout-button");

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );
    }

    const refreshButton =
        $("refresh-jobs-button");

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async () => {

                refreshButton.disabled =
                    true;

                try {

                    await loadCompanyJobs();

                } finally {

                    refreshButton.disabled =
                        false;
                }
            }
        );
    }

    setupSearch();
}


/* =========================================================
   AUTH LISTENER
   ========================================================= */

function setupAuthListener() {

    const client =
        getSupabaseClient();

    client.auth.onAuthStateChange(
        event => {

            if (
                event ===
                "SIGNED_OUT"
            ) {

                window.location.href =
                    "login.html";
            }
        }
    );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeCompanyJobs() {

    if (jobsInitialized) {
        return;
    }

    jobsInitialized =
        true;

    try {

        getSupabaseClient();

        currentUser =
            await getCurrentUser();

        if (!currentUser) {

            window.location.href =
                "login.html";

            return;
        }

        await loadCompanyProfile();

        await loadCompanyJobs();

        setupEventListeners();

        setupAuthListener();

        /*
         * Show company name if the HTML
         * contains one of these IDs.
         */

        setText(
            "company-name",
            getCompanyName()
        );

        setText(
            "company-email",
            currentUser.email || "—"
        );

    } catch (error) {

        console.error(
            "Company jobs initialization error:",
            error
        );

        showAlert(
            error.message ||
            "Unable to load company jobs.",
            "error"
        );
    }
}


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeCompanyJobs
    );

} else {

    initializeCompanyJobs();
}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.companyJobs = {

    load:
        loadCompanyJobs,

    delete:
        deleteJob,

    getJobs:
        () => companyJobs

};
