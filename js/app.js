/* =========================================================
   Web3Jobs v3 - Main Application
   File: js/app.js
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
    "https://uewocyaspztybnvnkbmo.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_ap9UMOBhdHdIkW0WFD25nA_NurNviS0";

/* =========================================================
   CREATE SUPABASE CLIENT
   ========================================================= */

let supabaseClient = null;

function initializeSupabase() {
    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {
        console.error("Supabase library was not loaded.");
        return false;
    }

    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );

        return true;
    } catch (error) {
        console.error("Supabase initialization failed:", error);
        return false;
    }
}

/* =========================================================
   GLOBAL APP STATE
   ========================================================= */

const Web3Jobs = {
    user: null,
    profile: null,
    jobs: [],
    initialized: false
};

/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

/* =========================================================
   MESSAGE SYSTEM
   ========================================================= */

function showMessage(message, type = "info") {
    let box = $("#app-message");

    if (!box) {
        box = document.createElement("div");
        box.id = "app-message";

        box.style.position = "fixed";
        box.style.top = "20px";
        box.style.right = "20px";
        box.style.zIndex = "9999";
        box.style.maxWidth = "360px";
        box.style.padding = "14px 18px";
        box.style.borderRadius = "10px";
        box.style.fontSize = "14px";
        box.style.lineHeight = "1.5";
        box.style.boxShadow = "0 8px 25px rgba(0,0,0,.15)";

        document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "success") {
        box.style.background = "#198754";
        box.style.color = "#fff";
    } else if (type === "error") {
        box.style.background = "#dc3545";
        box.style.color = "#fff";
    } else if (type === "warning") {
        box.style.background = "#ffc107";
        box.style.color = "#111";
    } else {
        box.style.background = "#212529";
        box.style.color = "#fff";
    }

    box.style.display = "block";

    clearTimeout(box._timer);

    box._timer = setTimeout(() => {
        box.style.display = "none";
    }, 4000);
}

/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(dateValue) {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {
    if (value === null || value === undefined) {
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
   GET CURRENT USER
   ========================================================= */

async function getCurrentUser() {
    if (!supabaseClient) {
        return null;
    }

    try {
        const {
            data,
            error
        } = await supabaseClient.auth.getUser();

        if (error) {
            console.warn("Could not get current user:", error);
            return null;
        }

        Web3Jobs.user = data?.user || null;

        return Web3Jobs.user;
    } catch (error) {
        console.error("getCurrentUser error:", error);
        return null;
    }
}

/* =========================================================
   GET USER PROFILE
   ========================================================= */

async function getUserProfile(userId = null) {
    if (!supabaseClient) {
        return null;
    }

    const id = userId || Web3Jobs.user?.id;

    if (!id) {
        return null;
    }

    try {
        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.warn("Profile could not be loaded:", error);
            return null;
        }

        Web3Jobs.profile = data || null;

        return Web3Jobs.profile;
    } catch (error) {
        console.error("getUserProfile error:", error);
        return null;
    }
}

/* =========================================================
   GET ACCOUNT TYPE
   ========================================================= */

function getAccountType() {
    if (!Web3Jobs.profile) {
        return null;
    }

    return (
        Web3Jobs.profile.account_type ||
        Web3Jobs.profile.user_type ||
        Web3Jobs.profile.role ||
        null
    );
}

/* =========================================================
   LOAD JOBS
   ========================================================= */

async function loadJobs() {
    if (!supabaseClient) {
        console.error("Supabase is not initialized.");
        return [];
    }

    try {
        const {
            data,
            error
        } = await supabaseClient
            .from("jobs")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (error) {
            console.error("Failed to load jobs:", error);
            showMessage(
                "Failed to load jobs. Please check the database connection.",
                "error"
            );
            return [];
        }

        Web3Jobs.jobs = data || [];

        return Web3Jobs.jobs;
    } catch (error) {
        console.error("loadJobs error:", error);
        return [];
    }
}

/* =========================================================
   CREATE JOB CARD
   ========================================================= */

function createJobCard(job) {
    const title = escapeHTML(job.title || "Untitled Job");
    const company = escapeHTML(job.company || "Web3 Company");
    const location = escapeHTML(job.location || "Remote");
    const type = escapeHTML(job.type || "Not specified");
    const description = escapeHTML(
        job.description || "No description available."
    );

    const date = formatDate(job.created_at);

    return `
        <article class="job-card" data-job-id="${escapeHTML(job.id)}">

            <div class="job-card-header">

                <div>
                    <h3 class="job-title">
                        ${title}
                    </h3>

                    <div class="job-company">
                        ${company}
                    </div>
                </div>

            </div>

            <div class="job-meta">

                <span>
                    📍 ${location}
                </span>

                <span>
                    💼 ${type}
                </span>

                ${
                    date
                        ? `<span>📅 ${date}</span>`
                        : ""
                }

            </div>

            <p class="job-description">
                ${description}
            </p>

            <div class="job-actions">

                <button
                    type="button"
                    class="view-job-btn"
                    data-job-id="${escapeHTML(job.id)}"
                >
                    View Job
                </button>

            </div>

        </article>
    `;
}

/* =========================================================
   RENDER JOBS
   ========================================================= */

function renderJobs(jobs = Web3Jobs.jobs) {
    const containers = [
        "#jobs-list",
        "#jobs-container",
        ".jobs-list",
        ".jobs-container"
    ];

    let container = null;

    for (const selector of containers) {
        const element = $(selector);

        if (element) {
            container = element;
            break;
        }
    }

    if (!container) {
        return;
    }

    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="no-jobs">
                <h3>No jobs available</h3>
                <p>
                    New Web3 opportunities will appear here.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML = jobs
        .map(createJobCard)
        .join("");
}

/* =========================================================
   SEARCH JOBS
   ========================================================= */

function searchJobs(keyword = "") {
    const query = String(keyword)
        .trim()
        .toLowerCase();

    if (!query) {
        renderJobs(Web3Jobs.jobs);
        return Web3Jobs.jobs;
    }

    const results = Web3Jobs.jobs.filter(job => {
        const searchableText = [
            job.title,
            job.company,
            job.location,
            job.type,
            job.description
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchableText.includes(query);
    });

    renderJobs(results);

    return results;
}

/* =========================================================
   SEARCH FORM
   ========================================================= */

function initializeSearch() {
    const forms = $$(
        "#search-form, .search-form, form[data-search]"
    );

    forms.forEach(form => {
        form.addEventListener("submit", event => {
            event.preventDefault();

            const input =
                form.querySelector(
                    'input[type="search"], input[name="search"], input[name="q"], input'
                );

            if (!input) {
                return;
            }

            searchJobs(input.value);
        });
    });

    const inputs = $$(
        "#search-input, .search-input, input[data-job-search]"
    );

    inputs.forEach(input => {
        input.addEventListener("input", () => {
            searchJobs(input.value);
        });
    });
}

/* =========================================================
   VIEW JOB
   ========================================================= */

function viewJob(jobId) {
    const job = Web3Jobs.jobs.find(
        item => String(item.id) === String(jobId)
    );

    if (!job) {
        showMessage("Job not found.", "error");
        return;
    }

    /*
     * If a dedicated job page exists, use it.
     */
    if (window.location.pathname.includes("jobs.html")) {
        const url =
            `jobs.html?id=${encodeURIComponent(job.id)}`;

        window.location.href = url;
        return;
    }

    /*
     * Otherwise show a simple modal.
     */
    showJobModal(job);
}

/* =========================================================
   JOB MODAL
   ========================================================= */

function showJobModal(job) {
    let modal = $("#job-modal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "job-modal";

        modal.innerHTML = `
            <div class="job-modal-overlay"></div>

            <div class="job-modal-content">

                <button
                    type="button"
                    id="close-job-modal"
                    class="close-job-modal"
                    aria-label="Close"
                >
                    ×
                </button>

                <div id="job-modal-body"></div>

            </div>
        `;

        Object.assign(modal.style, {
            position: "fixed",
            inset: "0",
            zIndex: "10000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(0,0,0,.65)"
        });

        document.body.appendChild(modal);

        modal
            .querySelector("#close-job-modal")
            .addEventListener("click", closeJobModal);

        modal
            .querySelector(".job-modal-overlay")
            .addEventListener("click", closeJobModal);
    }

    const body = modal.querySelector("#job-modal-body");

    body.innerHTML = `
        <h2>
            ${escapeHTML(job.title || "Untitled Job")}
        </h2>

        <p>
            <strong>Company:</strong>
            ${escapeHTML(job.company || "Not specified")}
        </p>

        <p>
            <strong>Location:</strong>
            ${escapeHTML(job.location || "Remote")}
        </p>

        <p>
            <strong>Type:</strong>
            ${escapeHTML(job.type || "Not specified")}
        </p>

        <hr>

        <p>
            ${escapeHTML(
                job.description || "No description available."
            )}
        </p>

        <div style="margin-top:20px;">

            <button
                type="button"
                id="apply-job-btn"
                data-job-id="${escapeHTML(job.id)}"
            >
                Apply Now
            </button>

        </div>
    `;

    const applyButton =
        body.querySelector("#apply-job-btn");

    if (applyButton) {
        applyButton.addEventListener(
            "click",
            () => applyToJob(job.id)
        );
    }

    modal.style.display = "flex";
}

/* =========================================================
   CLOSE JOB MODAL
   ========================================================= */

function closeJobModal() {
    const modal = $("#job-modal");

    if (modal) {
        modal.style.display = "none";
    }
}

/* =========================================================
   APPLY TO JOB
   ========================================================= */

async function applyToJob(jobId) {
    if (!supabaseClient) {
        showMessage(
            "The platform is not connected to Supabase.",
            "error"
        );
        return;
    }

    const user = Web3Jobs.user || await getCurrentUser();

    if (!user) {
        showMessage(
            "Please sign in before applying for a job.",
            "warning"
        );

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1000);

        return;
    }

    /*
     * We first try the applications table.
     */
    try {
        const {
            error
        } = await supabaseClient
            .from("applications")
            .insert({
                job_id: jobId,
                user_id: user.id
            });

        if (error) {
            console.error(
                "Application error:",
                error
            );

            showMessage(
                "Unable to submit your application. Please try again.",
                "error"
            );

            return;
        }

        showMessage(
            "Application submitted successfully.",
            "success"
        );

        closeJobModal();

    } catch (error) {
        console.error(
            "applyToJob error:",
            error
        );

        showMessage(
            "An unexpected error occurred.",
            "error"
        );
    }
}

/* =========================================================
   SIGN OUT
   ========================================================= */

async function signOut() {
    if (!supabaseClient) {
        return;
    }

    try {
        const {
            error
        } = await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }

        Web3Jobs.user = null;
        Web3Jobs.profile = null;

        showMessage(
            "You have been signed out.",
            "success"
        );

        setTimeout(() => {
            window.location.href = "index.html";
        }, 700);

    } catch (error) {
        console.error(
            "Sign out error:",
            error
        );

        showMessage(
            "Unable to sign out.",
            "error"
        );
    }
}

/* =========================================================
   UPDATE AUTH UI
   ========================================================= */

function updateAuthUI() {
    const loggedIn = !!Web3Jobs.user;

    $$("[data-auth]").forEach(element => {
        const mode = element.dataset.auth;

        if (mode === "logged-in") {
            element.style.display =
                loggedIn ? "" : "none";
        }

        if (mode === "logged-out") {
            element.style.display =
                loggedIn ? "none" : "";
        }
    });

    $$("[data-user-name]").forEach(element => {
        element.textContent =
            Web3Jobs.profile?.full_name ||
            Web3Jobs.user?.email ||
            "User";
    });

    $$("[data-user-email]").forEach(element => {
        element.textContent =
            Web3Jobs.user?.email || "";
    });

    $$("[data-account-type]").forEach(element => {
        element.textContent =
            getAccountType() || "";
    });
}

/* =========================================================
   LOGOUT BUTTONS
   ========================================================= */

function initializeLogoutButtons() {
    $$(
        "#logout-btn, .logout-btn, [data-action='logout']"
    ).forEach(button => {
        button.addEventListener(
            "click",
            event => {
                event.preventDefault();
                signOut();
            }
        );
    });
}

/* =========================================================
   JOB BUTTON EVENTS
   ========================================================= */

function initializeJobEvents() {
    document.addEventListener("click", event => {
        const button =
            event.target.closest(".view-job-btn");

        if (!button) {
            return;
        }

        const jobId =
            button.dataset.jobId;

        if (jobId) {
            viewJob(jobId);
        }
    });
}

/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

function initializeAuthListener() {
    if (!supabaseClient) {
        return;
    }

    supabaseClient.auth.onAuthStateChange(
        async (_event, session) => {

            Web3Jobs.user =
                session?.user || null;

            if (Web3Jobs.user) {
                await getUserProfile(
                    Web3Jobs.user.id
                );
            } else {
                Web3Jobs.profile = null;
            }

            updateAuthUI();
        }
    );
}

/* =========================================================
   INITIALIZE APP
   ========================================================= */

async function initializeApp() {
    if (Web3Jobs.initialized) {
        return;
    }

    Web3Jobs.initialized = true;

    const connected =
        initializeSupabase();

    if (!connected) {
        showMessage(
            "Supabase library is missing. Add the Supabase script before app.js.",
            "error"
        );

        return;
    }

    await getCurrentUser();

    if (Web3Jobs.user) {
        await getUserProfile();
    }

    updateAuthUI();

    initializeAuthListener();
    initializeLogoutButtons();
    initializeSearch();
    initializeJobEvents();

    /*
     * Load jobs only when the page has
     * a jobs section.
     */
    const hasJobsSection =
        $("#jobs-list") ||
        $("#jobs-container") ||
        $(".jobs-list") ||
        $(".jobs-container");

    if (hasJobsSection) {
        await loadJobs();
        renderJobs();
    }

    console.log(
        "Web3Jobs v3 initialized successfully."
    );
}

/* =========================================================
   GLOBAL API
   ========================================================= */

window.Web3Jobs = Web3Jobs;

window.Web3JobsApp = {
    initializeApp,
    loadJobs,
    renderJobs,
    searchJobs,
    viewJob,
    applyToJob,
    signOut,
    getCurrentUser,
    getUserProfile,
    getAccountType
};

/* =========================================================
   START APPLICATION
   ========================================================= */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );
} else {
    initializeApp();
}
