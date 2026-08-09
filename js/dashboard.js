/* =========================================================
   Web3Jobs v3
   File: js/dashboard.js
   Dashboard Management System
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

const DASHBOARD_SUPABASE_URL =
    "https://uewocyaspztybnvnkbmo.supabase.co";

const DASHBOARD_SUPABASE_KEY =
    "sb_publishable_ap9UMOBhdHdIkW0WFD25nA_NurNviS0";

let dashboardSupabase = null;


/* =========================================================
   DASHBOARD STATE
   ========================================================= */

const DashboardSystem = {

    user: null,

    profile: null,

    jobs: [],

    applications: [],

    initialized: false

};


/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeDashboardSupabase() {

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

        dashboardSupabase =
            window.supabase.createClient(
                DASHBOARD_SUPABASE_URL,
                DASHBOARD_SUPABASE_KEY
            );

        return true;

    } catch (error) {

        console.error(
            "Dashboard Supabase error:",
            error
        );

        return false;
    }
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function dashboardEscapeHTML(value) {

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
   DATE FORMAT
   ========================================================= */

function dashboardFormatDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


/* =========================================================
   SHOW MESSAGE
   ========================================================= */

function showDashboardMessage(
    message,
    type = "info"
) {

    let box =
        document.getElementById(
            "dashboard-message"
        );


    if (!box) {

        box =
            document.createElement(
                "div"
            );

        box.id =
            "dashboard-message";


        Object.assign(
            box.style,
            {

                position: "fixed",

                top: "20px",

                right: "20px",

                zIndex: "99999",

                maxWidth: "360px",

                padding: "14px 18px",

                borderRadius: "10px",

                boxShadow:
                    "0 8px 25px rgba(0,0,0,.2)",

                fontSize: "14px",

                lineHeight: "1.5"

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
   GET CURRENT USER
   ========================================================= */

async function getDashboardUser() {

    if (!dashboardSupabase) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await dashboardSupabase
                .auth
                .getUser();


        if (error) {

            console.error(
                "Get user error:",
                error
            );

            return null;
        }


        DashboardSystem.user =
            data?.user || null;


        return DashboardSystem.user;

    } catch (error) {

        console.error(
            "getDashboardUser error:",
            error
        );

        return null;
    }
}


/* =========================================================
   GET PROFILE
   ========================================================= */

async function getDashboardProfile() {

    if (
        !dashboardSupabase ||
        !DashboardSystem.user
    ) {

        return null;
    }


    try {

        const {
            data,
            error
        } =
            await dashboardSupabase

                .from("profiles")

                .select("*")

                .eq(
                    "id",
                    DashboardSystem.user.id
                )

                .maybeSingle();


        if (error) {

            console.warn(
                "Profile error:",
                error
            );

            return null;
        }


        DashboardSystem.profile =
            data || null;


        return DashboardSystem.profile;

    } catch (error) {

        console.error(
            "getDashboardProfile error:",
            error
        );

        return null;
    }
}


/* =========================================================
   ACCOUNT TYPE
   ========================================================= */

function getDashboardAccountType() {

    return (

        DashboardSystem.profile?.account_type ||

        DashboardSystem.profile?.user_type ||

        DashboardSystem.profile?.role ||

        null

    );
}


/* =========================================================
   UPDATE USER INFORMATION
   ========================================================= */

function updateDashboardUserUI() {

    const profile =
        DashboardSystem.profile;

    const user =
        DashboardSystem.user;


    const name =
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.email ||
        "User";


    const email =
        user?.email ||
        "";


    document
        .querySelectorAll(
            "[data-dashboard-name]"
        )
        .forEach(
            element => {

                element.textContent =
                    name;
            }
        );


    document
        .querySelectorAll(
            "[data-dashboard-email]"
        )
        .forEach(
            element => {

                element.textContent =
                    email;
            }
        );


    document
        .querySelectorAll(
            "[data-dashboard-account]"
        )
        .forEach(
            element => {

                element.textContent =
                    getDashboardAccountType() ||
                    "User";
            }
        );
}


/* =========================================================
   LOAD COMPANY JOBS
   ========================================================= */

async function loadCompanyJobs() {

    if (
        !dashboardSupabase ||
        !DashboardSystem.user
    ) {

        return [];
    }


    try {

        const {
            data,
            error
        } =
            await dashboardSupabase

                .from("jobs")

                .select("*")

                .eq(
                    "created_by",
                    DashboardSystem.user.id
                )

                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Company jobs error:",
                error
            );

            return [];
        }


        DashboardSystem.jobs =
            data || [];


        return DashboardSystem.jobs;

    } catch (error) {

        console.error(
            "loadCompanyJobs error:",
            error
        );

        return [];
    }
}


/* =========================================================
   LOAD USER APPLICATIONS
   ========================================================= */

async function loadUserApplications() {

    if (
        !dashboardSupabase ||
        !DashboardSystem.user
    ) {

        return [];
    }


    try {

        const {
            data,
            error
        } =
            await dashboardSupabase

                .from("applications")

                .select("*")

                .eq(
                    "user_id",
                    DashboardSystem.user.id
                )

                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Applications error:",
                error
            );

            return [];
        }


        DashboardSystem.applications =
            data || [];


        return DashboardSystem.applications;

    } catch (error) {

        console.error(
            "loadUserApplications error:",
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
            "#company-jobs, #my-jobs, [data-company-jobs]"
        );


    if (!container) {
        return;
    }


    if (
        !DashboardSystem.jobs ||
        DashboardSystem.jobs.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-dashboard">

                <h3>
                    No jobs published yet
                </h3>

                <p>
                    Create your first Web3 job
                    opportunity.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML =
        DashboardSystem.jobs
            .map(
                job => `

                    <div
                        class="dashboard-job"
                        data-job-id="${dashboardEscapeHTML(job.id)}"
                    >

                        <div>

                            <h3>
                                ${dashboardEscapeHTML(
                                    job.title ||
                                    "Untitled Job"
                                )}
                            </h3>

                            <p>
                                ${dashboardEscapeHTML(
                                    job.location ||
                                    "Remote"
                                )}
                            </p>

                            <small>
                                ${dashboardFormatDate(
                                    job.created_at
                                )}
                            </small>

                        </div>


                        <div
                            class="dashboard-job-actions"
                        >

                            <button
                                type="button"
                                data-delete-job="${dashboardEscapeHTML(job.id)}"
                            >
                                Delete
                            </button>

                        </div>

                    </div>

                `
            )
            .join("");
}


/* =========================================================
   RENDER APPLICATIONS
   ========================================================= */

async function renderUserApplications() {

    const container =
        document.querySelector(
            "#my-applications, #applications-list, [data-user-applications]"
        );


    if (!container) {
        return;
    }


    if (
        !DashboardSystem.applications ||
        DashboardSystem.applications.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-dashboard">

                <h3>
                    No applications yet
                </h3>

                <p>
                    Jobs you apply for will
                    appear here.
                </p>

            </div>

        `;

        return;
    }


    /*
     * Load related jobs individually.
     */

    const rows = [];


    for (
        const application
        of DashboardSystem.applications
    ) {

        let job = null;


        try {

            const {
                data
            } =
                await dashboardSupabase

                    .from("jobs")

                    .select(
                        "id,title,company,location,type"
                    )

                    .eq(
                        "id",
                        application.job_id
                    )

                    .maybeSingle();


            job = data || null;

        } catch (error) {

            console.warn(
                "Application job lookup failed:",
                error
            );
        }


        rows.push({

            application,

            job

        });
    }


    container.innerHTML =
        rows
            .map(
                row => {

                    const job =
                        row.job;

                    const application =
                        row.application;


                    return `

                        <div
                            class="application-card"
                        >

                            <h3>
                                ${dashboardEscapeHTML(
                                    job?.title ||
                                    "Job"
                                )}
                            </h3>


                            <p>
                                <strong>
                                    Company:
                                </strong>

                                ${dashboardEscapeHTML(
                                    job?.company ||
                                    "Not specified"
                                )}
                            </p>


                            <p>
                                <strong>
                                    Location:
                                </strong>

                                ${dashboardEscapeHTML(
                                    job?.location ||
                                    "Remote"
                                )}
                            </p>


                            <p>
                                <strong>
                                    Status:
                                </strong>

                                ${dashboardEscapeHTML(
                                    application.status ||
                                    "Submitted"
                                )}
                            </p>


                            <small>
                                Applied:
                                ${dashboardFormatDate(
                                    application.created_at
                                )}
                            </small>

                        </div>

                    `;
                }
            )
            .join("");
}


/* =========================================================
   DASHBOARD STATISTICS
   ========================================================= */

function updateDashboardStats() {

    const jobsCount =
        DashboardSystem.jobs.length;


    const applicationsCount =
        DashboardSystem.applications.length;


    document
        .querySelectorAll(
            "[data-stat='jobs'], #jobs-count"
        )
        .forEach(
            element => {

                element.textContent =
                    jobsCount;
            }
        );


    document
        .querySelectorAll(
            "[data-stat='applications'], #applications-count"
        )
        .forEach(
            element => {

                element.textContent =
                    applicationsCount;
            }
        );


    document
        .querySelectorAll(
            "[data-stat='total']"
        )
        .forEach(
            element => {

                element.textContent =
                    jobsCount +
                    applicationsCount;
            }
        );
}


/* =========================================================
   DELETE COMPANY JOB
   ========================================================= */

async function deleteDashboardJob(
    jobId
) {

    if (
        !dashboardSupabase ||
        !DashboardSystem.user
    ) {

        showDashboardMessage(
            "Please sign in first.",
            "warning"
        );

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

        const {
            error
        } =
            await dashboardSupabase

                .from("jobs")

                .delete()

                .eq(
                    "id",
                    jobId
                )

                .eq(
                    "created_by",
                    DashboardSystem.user.id
                );


        if (error) {

            console.error(
                "Delete dashboard job error:",
                error
            );


            showDashboardMessage(
                "Unable to delete the job.",
                "error"
            );

            return;
        }


        DashboardSystem.jobs =
            DashboardSystem.jobs.filter(
                job =>
                    String(job.id) !==
                    String(jobId)
            );


        renderCompanyJobs();

        updateDashboardStats();


        showDashboardMessage(
            "Job deleted successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "deleteDashboardJob error:",
            error
        );


        showDashboardMessage(
            "An unexpected error occurred.",
            "error"
        );
    }
}


/* =========================================================
   CREATE JOB FROM DASHBOARD FORM
   ========================================================= */

async function createDashboardJob(
    form
) {

    if (
        !dashboardSupabase ||
        !DashboardSystem.user
    ) {

        showDashboardMessage(
            "Please sign in first.",
            "warning"
        );

        return;
    }


    const formData =
        new FormData(form);


    const title =
        String(
            formData.get("title") ||
            ""
        ).trim();


    const company =
        String(
            formData.get("company") ||
            ""
        ).trim();


    const location =
        String(
            formData.get("location") ||
            "Remote"
        ).trim();


    const type =
        String(
            formData.get("type") ||
            "Full Time"
        ).trim();


    const description =
        String(
            formData.get("description") ||
            ""
        ).trim();


    if (!title) {

        showDashboardMessage(
            "Job title is required.",
            "warning"
        );

        return;
    }


    try {

        const {
            data,
            error
        } =
            await dashboardSupabase

                .from("jobs")

                .insert({

                    title,

                    company,

                    location,

                    type,

                    description,

                    created_by:
                        DashboardSystem.user.id

                })

                .select()

                .single();


        if (error) {

            console.error(
                "Create dashboard job error:",
                error
            );


            showDashboardMessage(
                "Unable to publish the job.",
                "error"
            );

            return;
        }


        DashboardSystem.jobs.unshift(
            data
        );


        renderCompanyJobs();

        updateDashboardStats();


        form.reset();


        showDashboardMessage(
            "Job published successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "createDashboardJob error:",
            error
        );


        showDashboardMessage(
            "An unexpected error occurred.",
            "error"
        );
    }
}


/* =========================================================
   FORM EVENT
   ========================================================= */

function initializeDashboardForms() {

    document
        .querySelectorAll(
            "#create-job-form, [data-create-job-form]"
        )
        .forEach(
            form => {

                form.addEventListener(
                    "submit",
                    event => {

                        event.preventDefault();

                        createDashboardJob(
                            form
                        );
                    }
                );
            }
        );
}


/* =========================================================
   DASHBOARD CLICK EVENTS
   ========================================================= */

function initializeDashboardEvents() {

    document.addEventListener(
        "click",
        event => {

            const deleteButton =
                event.target.closest(
                    "[data-delete-job]"
                );


            if (
                deleteButton
            ) {

                const jobId =
                    deleteButton.dataset.deleteJob;


                if (jobId) {

                    deleteDashboardJob(
                        jobId
                    );
                }
            }
        }
    );
}


/* =========================================================
   PROTECT DASHBOARD
   ========================================================= */

async function protectDashboard() {

    if (!DashboardSystem.user) {

        showDashboardMessage(
            "Please sign in to access your dashboard.",
            "warning"
        );


        setTimeout(
            () => {

                window.location.href =
                    "login.html";

            },
            900
        );


        return false;
    }


    return true;
}


/* =========================================================
   LOAD DASHBOARD
   ========================================================= */

async function loadDashboardData() {

    const accountType =
        getDashboardAccountType();


    if (
        accountType === "company" ||
        accountType === "business"
    ) {

        await loadCompanyJobs();

    } else {

        await loadUserApplications();
    }


    updateDashboardUserUI();

    renderCompanyJobs();

    await renderUserApplications();

    updateDashboardStats();
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function dashboardLogout() {

    if (!dashboardSupabase) {
        return;
    }


    try {

        const {
            error
        } =
            await dashboardSupabase
                .auth
                .signOut();


        if (error) {
            throw error;
        }


        DashboardSystem.user =
            null;

        DashboardSystem.profile =
            null;


        window.location.href =
            "index.html";


    } catch (error) {

        console.error(
            "Dashboard logout error:",
            error
        );


        showDashboardMessage(
            "Unable to sign out.",
            "error"
        );
    }
}


/* =========================================================
   LOGOUT BUTTONS
   ========================================================= */

function initializeDashboardLogout() {

    document
        .querySelectorAll(
            "#logout-btn, .logout-btn, [data-dashboard-logout]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        dashboardLogout();
                    }
                );
            }
        );
}


/* =========================================================
   INITIALIZE DASHBOARD
   ========================================================= */

async function initializeDashboard() {

    if (
        DashboardSystem.initialized
    ) {

        return;
    }


    DashboardSystem.initialized =
        true;


    const initialized =
        initializeDashboardSupabase();


    if (!initialized) {

        showDashboardMessage(
            "Supabase is not available.",
            "error"
        );

        return;
    }


    await getDashboardUser();


    const protectedPage =
        document.querySelector(
            "[data-dashboard-protected]"
        ) ||
        document.querySelector(
            ".dashboard"
        ) ||
        document.querySelector(
            "#dashboard"
        );


    if (
        protectedPage &&
        !DashboardSystem.user
    ) {

        await protectDashboard();

        return;
    }


    if (
        DashboardSystem.user
    ) {

        await getDashboardProfile();

        await loadDashboardData();
    }


    initializeDashboardForms();

    initializeDashboardEvents();

    initializeDashboardLogout();


    console.log(
        "Web3Jobs Dashboard initialized."
    );
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.DashboardSystem =
    DashboardSystem;


window.Web3JobsDashboard = {

    initializeDashboard,

    getDashboardUser,

    getDashboardProfile,

    getDashboardAccountType,

    loadCompanyJobs,

    loadUserApplications,

    loadDashboardData,

    createDashboardJob,

    deleteDashboardJob,

    dashboardLogout

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
        initializeDashboard
    );

} else {

    initializeDashboard();
              }
