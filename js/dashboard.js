/* =========================================================
   Web3Jobs v3
   File: js/dashboard.js
   Dashboard Management System
   ========================================================= */

"use strict";


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
   GET CENTRAL SUPABASE CLIENT
   ========================================================= */

function getDashboardSupabase() {

    if (
        !window.Web3JobsSupabase ||
        typeof
            window.Web3JobsSupabase.getSupabaseClient
            !== "function"
    ) {

        console.error(
            "Web3Jobs Supabase system is not available."
        );

        return null;
    }


    const client =
        window.Web3JobsSupabase
            .getSupabaseClient();


    if (!client) {

        console.error(
            "Unable to get Supabase client."
        );

        return null;
    }


    return client;
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function dashboardEscapeHTML(
    value
) {

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

function dashboardFormatDate(
    value
) {

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

                padding:
                    "14px 18px",

                borderRadius:
                    "10px",

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


    if (
        type === "success"
    ) {

        box.style.background =
            "#198754";

        box.style.color =
            "#ffffff";

    } else if (
        type === "error"
    ) {

        box.style.background =
            "#dc3545";

        box.style.color =
            "#ffffff";

    } else if (
        type === "warning"
    ) {

        box.style.background =
            "#ffc107";

        box.style.color =
            "#111111";

    } else {

        box.style.background =
            "#212529";

        box.style.color =
            "#ffffff";
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

    /*
     * Prefer the central authentication system.
     */

    if (
        window.Web3JobsAuth &&
        typeof
            window.Web3JobsAuth.getCurrentUser
            === "function"
    ) {

        const user =
            await window.Web3JobsAuth
                .getCurrentUser();


        DashboardSystem.user =
            user || null;


        return DashboardSystem.user;
    }


    /*
     * Fallback to the central Supabase
     * client if auth.js is unavailable.
     */

    const supabase =
        getDashboardSupabase();


    if (!supabase) {

        DashboardSystem.user =
            null;

        return null;
    }


    try {

        const {
            data,
            error
        } =
            await supabase
                .auth
                .getUser();


        if (error) {

            console.error(
                "Get dashboard user error:",
                error
            );


            DashboardSystem.user =
                null;


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


        DashboardSystem.user =
            null;


        return null;
    }
}


/* =========================================================
   GET PROFILE
   ========================================================= */

async function getDashboardProfile() {

    if (
        !DashboardSystem.user
    ) {

        return null;
    }


    /*
     * Prefer central auth system.
     */

    if (
        window.Web3JobsAuth &&
        typeof
            window.Web3JobsAuth.getUserProfile
            === "function"
    ) {

        const profile =
            await window.Web3JobsAuth
                .getUserProfile(
                    DashboardSystem.user.id
                );


        DashboardSystem.profile =
            profile || null;


        return DashboardSystem.profile;
    }


    const supabase =
        getDashboardSupabase();


    if (!supabase) {

        return null;
    }


    try {

        const {
            data,
            error
        } =
            await supabase
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
   GET ACCOUNT TYPE
   ========================================================= */

async function getDashboardAccountType() {

    if (
        DashboardSystem.user &&
        window.Web3JobsAuth &&
        typeof
            window.Web3JobsAuth.getAccountType
            === "function"
    ) {

        const accountType =
            await window.Web3JobsAuth
                .getAccountType(
                    DashboardSystem.user
                );


        return String(
            accountType ||
            "individual"
        ).toLowerCase();
    }


    const profile =
        DashboardSystem.profile;


    if (
        profile?.account_type
    ) {

        return String(
            profile.account_type
        ).toLowerCase();
    }


    if (
        profile?.user_type
    ) {

        return String(
            profile.user_type
        ).toLowerCase();
    }


    if (
        profile?.role
    ) {

        return String(
            profile.role
        ).toLowerCase();
    }


    const metadata =
        DashboardSystem.user
            ?.user_metadata ||
        {};


    return String(
        metadata.account_type ||
        "individual"
    ).toLowerCase();
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
                    "individual";

            }
        );


    const nameElement =
        document.getElementById(
            "dashboard-user-name"
        );


    if (nameElement) {

        nameElement.textContent =
            name;

    }


    const accountElement =
        document.getElementById(
            "account-type"
        );


    if (accountElement) {

        accountElement.textContent =
            "Individual";

    }
}


/* =========================================================
   LOAD COMPANY JOBS
   ========================================================= */

async function loadCompanyJobs() {

    const supabase =
        getDashboardSupabase();


    if (
        !supabase ||
        !DashboardSystem.user
    ) {

        return [];
    }


    try {

        const {
            data,
            error
        } =
            await supabase

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

    const supabase =
        getDashboardSupabase();


    if (
        !supabase ||
        !DashboardSystem.user
    ) {

        return [];
    }


    try {

        const {
            data,
            error
        } =
            await supabase

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

            console.warn(
                "Applications loading warning:",
                error
            );


            DashboardSystem.applications =
                [];


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


        DashboardSystem.applications =
            [];


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
                        data-job-id="${dashboardEscapeHTML(
                            job.id
                        )}"
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
                                data-delete-job="${dashboardEscapeHTML(
                                    job.id
                                )}"
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


    const supabase =
        getDashboardSupabase();


    if (!supabase) {

        return;
    }


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
                await supabase

                    .from("jobs")

                    .select(
                        "id,title,company,location,type"
                    )

                    .eq(
                        "id",
                        application.job_id
                    )

                    .maybeSingle();


            job =
                data || null;

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


    const applicationsElement =
        document.getElementById(
            "applications-count"
        );


    if (applicationsElement) {

        applicationsElement.textContent =
            applicationsCount;

    }
}


/* =========================================================
   DELETE COMPANY JOB
   ========================================================= */

async function deleteDashboardJob(
    jobId
) {

    const supabase =
        getDashboardSupabase();


    if (
        !supabase ||
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
            await supabase

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

    const supabase =
        getDashboardSupabase();


    if (
        !supabase ||
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
            formData
