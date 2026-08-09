/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js
   Company Dashboard System
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

const COMPANY_SUPABASE_URL =
    "https://uewocyaspztybnvnkbmo.supabase.co";

const COMPANY_SUPABASE_KEY =
    "sb_publishable_ap9UMOBhdHdIkW0WFD25nA_NurNviS0";

let companySupabase = null;


/* =========================================================
   DASHBOARD STATE
   ========================================================= */

const CompanyDashboard = {

    user: null,

    profile: null,

    jobs: [],

    initialized: false

};


/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeCompanySupabase() {

    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Supabase library is not available."
        );

        return false;
    }

    try {

        companySupabase =
            window.supabase.createClient(
                COMPANY_SUPABASE_URL,
                COMPANY_SUPABASE_KEY
            );

        return true;

    } catch (error) {

        console.error(
            "Supabase initialization error:",
            error
        );

        return false;
    }
}


/* =========================================================
   GET CURRENT USER
   ========================================================= */

async function getCompanyUser() {

    if (!companySupabase) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await companySupabase.auth.getUser();

        if (error) {

            console.error(
                "Unable to get current user:",
                error
            );

            return null;
        }

        CompanyDashboard.user =
            data?.user || null;

        return CompanyDashboard.user;

    } catch (error) {

        console.error(
            "getCompanyUser error:",
            error
        );

        return null;
    }
}


/* =========================================================
   GET COMPANY PROFILE
   ========================================================= */

async function loadCompanyProfile() {

    const user =
        CompanyDashboard.user ||
        await getCompanyUser();

    if (!user) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await companySupabase
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    user.id
                )
                .maybeSingle();

        if (error) {

            console.error(
                "Profile loading error:",
                error
            );

            return null;
        }

        CompanyDashboard.profile =
            data || null;

        return CompanyDashboard.profile;

    } catch (error) {

        console.error(
            "loadCompanyProfile error:",
            error
        );

        return null;
    }
}


/* =========================================================
   VERIFY COMPANY ACCOUNT
   ========================================================= */

async function verifyCompanyAccount() {

    const user =
        CompanyDashboard.user ||
        await getCompanyUser();

    if (!user) {

        redirectToLogin();

        return false;
    }

    const profile =
        CompanyDashboard.profile ||
        await loadCompanyProfile();

    /*
     * Account type can come from profiles
     * or user metadata.
     */

    const accountType =
        profile?.account_type ||
        user.user_metadata?.account_type ||
        user.user_metadata?.user_type ||
        "";

    if (
        String(accountType)
            .toLowerCase()
            !== "company"
    ) {

        showCompanyMessage(
            "This dashboard is available for company accounts only.",
            "warning"
        );

        setTimeout(
            () => {

                window.location.href =
                    "dashboard.html";

            },
            1200
        );

        return false;
    }

    return true;
}


/* =========================================================
   REDIRECT TO LOGIN
   ========================================================= */

function redirectToLogin() {

    window.location.href =
        "login.html";
}


/* =========================================================
   LOAD COMPANY JOBS
   ========================================================= */

async function loadCompanyJobs() {

    const user =
        CompanyDashboard.user ||
        await getCompanyUser();

    if (!user) {
        return [];
    }

    try {

        const {
            data,
            error
        } =
            await companySupabase
                .from("jobs")
                .select("*")
                .eq(
                    "created_by",
                    user.id
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {

            console.error(
                "Unable to load company jobs:",
                error
            );

            showCompanyMessage(
                "Unable to load your jobs.",
                "error"
            );

            return [];
        }

        CompanyDashboard.jobs =
            data || [];

        renderCompanyJobs();

        updateCompanyStats();

        return CompanyDashboard.jobs;

    } catch (error) {

        console.error(
            "loadCompanyJobs error:",
            error
        );

        return [];
    }
}


/* =========================================================
   RENDER COMPANY JOBS
   ========================================================= */

function renderCompanyJobs() {

    const container =
        document.querySelector(
            "#company-jobs-list, " +
            "#my-jobs, " +
            ".company-jobs-list, " +
            "[data-company-jobs]"
        );

    if (!container) {

        console.warn(
            "Company jobs container not found."
        );

        return;
    }

    const jobs =
        CompanyDashboard.jobs;

    if (!jobs.length) {

        container.innerHTML = `

            <div class="no-company-jobs">

                <h3>
                    No jobs published yet
                </h3>

                <p>
                    Create your first job opportunity.
                </p>

                <button
                    type="button"
                    class="company-create-job-button"
                    data-action="create-job"
                >
                    Create Job
                </button>

            </div>

        `;

        return;
    }

    container.innerHTML =
        jobs.map(
            job => {

                const title =
                    escapeCompanyHTML(
                        job.title ||
                        "Untitled Job"
                    );

                const location =
                    escapeCompanyHTML(
                        job.location ||
                        "Remote"
                    );

                const type =
                    escapeCompanyHTML(
                        job.type ||
                        "Full Time"
                    );

                const description =
                    escapeCompanyHTML(
                        job.description ||
                        ""
                    );

                return `

                    <article
                        class="company-job-card"
                        data-job-id="${job.id}"
                    >

                        <div class="company-job-content">

                            <h3>
                                ${title}
                            </h3>

                            <div class="company-job-meta">

                                <span>
                                    📍 ${location}
                                </span>

                                <span>
                                    💼 ${type}
                                </span>

                            </div>

                            <p>
                                ${description}
                            </p>

                        </div>

                        <div class="company-job-actions">

                            <button
                                type="button"
                                data-action="delete-job"
                                data-job-id="${job.id}"
                            >
                                Delete
                            </button>

                        </div>

                    </article>

                `;
            }
        ).join("");
}


/* =========================================================
   CREATE JOB
   ========================================================= */

async function createCompanyJob(jobData = {}) {

    const user =
        CompanyDashboard.user ||
        await getCompanyUser();

    if (!user) {

        redirectToLogin();

        return null;
    }

    const title =
        String(
            jobData.title || ""
        ).trim();

    if (!title) {

        showCompanyMessage(
            "Job title is required.",
            "warning"
        );

        return null;
    }

    try {

        const {
            data,
            error
        } =
            await companySupabase
                .from("jobs")
                .insert({

                    title: title,

                    company:
                        jobData.company ||
                        CompanyDashboard.profile?.full_name ||
                        CompanyDashboard.profile?.company_name ||
                        "Web3 Company",

                    location:
                        jobData.location ||
                        "Remote",

                    type:
                        jobData.type ||
                        "Full Time",

                    description:
                        jobData.description ||
                        "",

                    created_by:
                        user.id

                })
                .select()
                .single();

        if (error) {

            console.error(
                "Create company job error:",
                error
            );

            showCompanyMessage(
                "Unable to publish job.",
                "error"
            );

            return null;
        }

        CompanyDashboard.jobs.unshift(
            data
        );

        renderCompanyJobs();

        updateCompanyStats();

        showCompanyMessage(
            "Job published successfully.",
            "success"
        );

        return data;

    } catch (error) {

        console.error(
            "createCompanyJob error:",
            error
        );

        showCompanyMessage(
            "An unexpected error occurred.",
            "error"
        );

        return null;
    }
}


/* =========================================================
   DELETE JOB
   ========================================================= */

async function deleteCompanyJob(jobId) {

    const user =
        CompanyDashboard.user ||
        await getCompanyUser();

    if (!user) {

        redirectToLogin();

        return false;
    }

    if (!jobId) {
        return false;
    }

    const confirmed =
        window.confirm(
            "Are you sure you want to delete this job?"
        );

    if (!confirmed) {
        return false;
    }

    try {

        const {
            error
        } =
            await companySupabase
                .from("jobs")
                .delete()
                .eq(
                    "id",
                    jobId
                )
                .eq(
                    "created_by",
                    user.id
                );

        if (error) {

            console.error(
                "Delete company job error:",
                error
            );

            showCompanyMessage(
                "Unable to delete job.",
                "error"
            );

            return false;
        }

        CompanyDashboard.jobs =
            CompanyDashboard.jobs.filter(
                job =>
                    String(job.id) !==
                    String(jobId)
            );

        renderCompanyJobs();

        updateCompanyStats();

        showCompanyMessage(
            "Job deleted successfully.",
            "success"
        );

        return true;

    } catch (error) {

        console.error(
            "deleteCompanyJob error:",
            error
        );

        return false;
    }
}


/* =========================================================
   COMPANY STATISTICS
   ========================================================= */

function updateCompanyStats() {

    const totalJobs =
        CompanyDashboard.jobs.length;

    const totalJobsElement =
        document.querySelector(
            "#total-jobs, " +
            "#company-total-jobs, " +
            "[data-total-jobs]"
        );

    if (totalJobsElement) {

        totalJobsElement.textContent =
            totalJobs;
    }


    const activeJobsElement =
        document.querySelector(
            "#active-jobs, " +
            "#company-active-jobs, " +
            "[data-active-jobs]"
        );

    if (activeJobsElement) {

        activeJobsElement.textContent =
            totalJobs;
    }
}


/* =========================================================
   DISPLAY COMPANY INFORMATION
   ========================================================= */

function renderCompanyInformation() {

    const profile =
        CompanyDashboard.profile;

    const user =
        CompanyDashboard.user;

    if (!profile && !user) {
        return;
    }

    const companyName =
        profile?.company_name ||
        profile?.full_name ||
        user?.user_metadata?.company_name ||
        user?.email ||
        "Company";


    const email =
        profile?.email ||
        user?.email ||
        "";


    const nameElements =
        document.querySelectorAll(
            "[data-company-name], " +
            "#company-name, " +
            ".company-name"
        );

    nameElements.forEach(
        element => {

            element.textContent =
                companyName;

        }
    );


    const emailElements =
        document.querySelectorAll(
            "[data-company-email], " +
            "#company-email, " +
            ".company-email"
        );

    emailElements.forEach(
        element => {

            element.textContent =
                email;

        }
    );
}


/* =========================================================
   CREATE JOB FORM
   ========================================================= */

function initializeCompanyJobForm() {

    const forms =
        document.querySelectorAll(
            "#create-job-form, " +
            ".create-job-form, " +
            "[data-create-job-form]"
        );

    forms.forEach(
        form => {

            if (
                form.dataset.companyInitialized ===
                "true"
            ) {
                return;
            }

            form.dataset.companyInitialized =
                "true";

            form.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    const formData =
                        new FormData(form);

                    const jobData = {

                        title:
                            formData.get("title") ||
                            form.querySelector(
                                '[name="title"]'
                            )?.value ||
                            "",

                        company:
                            formData.get("company") ||
                            form.querySelector(
                                '[name="company"]'
                            )?.value ||
                            "",

                        location:
                            formData.get("location") ||
                            form.querySelector(
                                '[name="location"]'
                            )?.value ||
                            "Remote",

                        type:
                            formData.get("type") ||
                            form.querySelector(
                                '[name="type"]'
                            )?.value ||
                            "Full Time",

                        description:
                            formData.get("description") ||
                            form.querySelector(
                                '[name="description"]'
                            )?.value ||
                            ""

                    };

                    const result =
                        await createCompanyJob(
                            jobData
                        );

                    if (result) {
                        form.reset();
                    }

                }
            );
        }
    );
}


/* =========================================================
   DASHBOARD CLICK EVENTS
   ========================================================= */

function initializeCompanyEvents() {

    document.addEventListener(
        "click",
        async event => {

            const deleteButton =
                event.target.closest(
                    '[data-action="delete-job"]'
                );

            if (deleteButton) {

                await deleteCompanyJob(
                    deleteButton.dataset.jobId
                );

                return;
            }


            const createButton =
                event.target.closest(
                    '[data-action="create-job"]'
                );

            if (createButton) {

                const form =
                    document.querySelector(
                        "#create-job-form, " +
                        ".create-job-form, " +
                        "[data-create-job-form]"
                    );

                if (form) {

                    form.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

                return;
            }


            const logoutButton =
                event.target.closest(
                    '[data-action="logout"], ' +
                    "#company-logout, " +
                    ".company-logout"
                );

            if (logoutButton) {

                await companyLogout();

            }

        }
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function companyLogout() {

    if (!companySupabase) {
        return;
    }

    try {

        const {
            error
        } =
            await companySupabase.auth.signOut();

        if (error) {

            console.error(
                "Logout error:",
                error
            );

            showCompanyMessage(
                "Unable to sign out.",
                "error"
            );

            return;
        }

        window.location.href =
            "login.html";

    } catch (error) {

        console.error(
            "companyLogout error:",
            error
        );

    }
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeCompanyHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   MESSAGE SYSTEM
   ========================================================= */

function showCompanyMessage(
    message,
    type = "info"
) {

    let box =
        document.getElementById(
            "company-message"
        );

    if (!box) {

        box =
            document.createElement(
                "div"
            );

        box.id =
            "company-message";

        Object.assign(
            box.style,
            {

                position: "fixed",

                top: "20px",

                right: "20px",

                zIndex: "100000",

                maxWidth: "360px",

                padding: "14px 18px",

                borderRadius: "10px",

                boxShadow:
                    "0 8px 25px rgba(0,0,0,.2)",

                fontSize: "14px"

            }
        );

        document.body.appendChild(
            box
        );
    }


    box.textContent =
        message;


    if (type === "success") {

        box.style.background =
            "#198754";

        box.style.color =
            "#fff";

    } else if (type === "error") {

        box.style.background =
            "#dc3545";

        box.style.color =
            "#fff";

    } else if (type === "warning") {

        box.style.background =
            "#ffc107";

        box.style.color =
            "#111";

    } else {

        box.style.background =
            "#212529";

        box.style.color =
            "#fff";
    }


    box.style.display =
        "block";


    clearTimeout(
        box._timer
    );


    box._timer =
        setTimeout(
            () => {

                box.style.display =
                    "none";

            },
            4000
        );
}


/* =========================================================
   INITIALIZE COMPANY DASHBOARD
   ========================================================= */

async function initializeCompanyDashboard() {

    if (
        CompanyDashboard.initialized
    ) {
        return;
    }

    CompanyDashboard.initialized =
        true;


    const initialized =
        initializeCompanySupabase();

    if (!initialized) {

        showCompanyMessage(
            "Supabase is not available.",
            "error"
        );

        return;
    }


    const user =
        await getCompanyUser();

    if (!user) {

        redirectToLogin();

        return;
    }


    const profile =
        await loadCompanyProfile();


    const isCompany =
        await verifyCompanyAccount();

    if (!isCompany) {
        return;
    }


    renderCompanyInformation();

    await loadCompanyJobs();

    initializeCompanyJobForm();

    initializeCompanyEvents();


    console.log(
        "Web3Jobs Company Dashboard initialized."
    );
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.CompanyDashboard =
    CompanyDashboard;


window.Web3JobsCompany = {

    initializeCompanyDashboard,

    getCompanyUser,

    loadCompanyProfile,

    verifyCompanyAccount,

    loadCompanyJobs,

    renderCompanyJobs,

    createCompanyJob,

    deleteCompanyJob,

    updateCompanyStats,

    renderCompanyInformation,

    companyLogout

};


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeCompanyDashboard
    );

} else {

    initializeCompanyDashboard();
}
