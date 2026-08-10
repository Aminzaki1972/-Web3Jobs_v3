/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js
   Company Dashboard
   Supabase Project: Company Accounts
   ========================================================= */

"use strict";

/* =========================================================
   COMPANY SUPABASE
   ========================================================= */

const COMPANY_SUPABASE_URL =
    "https://jqhemwskrnlycximjpag.supabase.co";

const COMPANY_SUPABASE_KEY =
    "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";


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

    if (companySupabase) {
        return true;
    }

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Web3Jobs: Supabase library is not loaded."
        );

        return false;
    }

    try {

        companySupabase =
            window.supabase.createClient(
                COMPANY_SUPABASE_URL,
                COMPANY_SUPABASE_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );

        console.log(
            "Web3Jobs: Company Supabase initialized."
        );

        return true;

    } catch (error) {

        console.error(
            "Web3Jobs: Company Supabase initialization failed.",
            error
        );

        return false;
    }
}


/* =========================================================
   GET SESSION
   ========================================================= */

async function getCompanySession() {

    if (!companySupabase) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await companySupabase.auth.getSession();

        if (error) {

            console.error(
                "Company session error:",
                error
            );

            return null;
        }

        return data?.session || null;

    } catch (error) {

        console.error(
            "Unexpected company session error:",
            error
        );

        return null;
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
                "Company user error:",
                error
            );

            return null;
        }

        CompanyDashboard.user =
            data?.user || null;

        return CompanyDashboard.user;

    } catch (error) {

        console.error(
            "Unexpected company user error:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD COMPANY PROFILE
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
                .eq("id", user.id)
                .maybeSingle();

        if (error) {

            console.error(
                "Company profile error:",
                error
            );

            return null;
        }

        CompanyDashboard.profile =
            data || null;

        return CompanyDashboard.profile;

    } catch (error) {

        console.error(
            "Unexpected profile error:",
            error
        );

        return null;
    }
}


/* =========================================================
   VERIFY COMPANY
   ========================================================= */

async function verifyCompanyAccount() {

    const user =
        CompanyDashboard.user ||
        await getCompanyUser();

    if (!user) {

        showCompanyMessage(
            "لم يتم العثور على جلسة تسجيل الدخول.",
            "error"
        );

        redirectToLogin();

        return false;
    }


    const profile =
        CompanyDashboard.profile ||
        await loadCompanyProfile();


    const accountType =
        String(
            profile?.account_type ||
            user.user_metadata?.account_type ||
            user.user_metadata?.user_type ||
            ""
        )
        .trim()
        .toLowerCase();


    console.log(
        "Web3Jobs company account type:",
        accountType
    );


    if (accountType !== "company") {

        console.error(
            "This account is not a company account.",
            {
                user: user.email,
                accountType: accountType
            }
        );

        showCompanyMessage(
            "هذا الحساب ليس حساب شركة.",
            "error"
        );

        setTimeout(
            function () {

                window.location.href =
                    "login.html";

            },
            1500
        );

        return false;
    }


    return true;
}


/* =========================================================
   REDIRECT
   ========================================================= */

function redirectToLogin() {

    window.location.href =
        "login.html";
}


/* =========================================================
   RENDER COMPANY INFORMATION
   ========================================================= */

function renderCompanyInformation() {

    const user =
        CompanyDashboard.user;

    const profile =
        CompanyDashboard.profile;


    if (!user && !profile) {
        return;
    }


    const companyName =
        profile?.company_name ||
        profile?.full_name ||
        user?.user_metadata?.company_name ||
        user?.user_metadata?.full_name ||
        user?.email ||
        "Company";


    const email =
        profile?.email ||
        user?.email ||
        "";


    const nameElements =
        document.querySelectorAll(
            "[data-company-name], #company-name, .company-name"
        );


    nameElements.forEach(
        function (element) {

            element.textContent =
                companyName;

        }
    );


    const emailElements =
        document.querySelectorAll(
            "[data-company-email], #company-email, .company-email"
        );


    emailElements.forEach(
        function (element) {

            element.textContent =
                email;

        }
    );
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
                .eq("created_by", user.id)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Company jobs loading error:",
                error
            );

            showCompanyMessage(
                "تعذر تحميل الوظائف. تحقق من صلاحيات جدول jobs.",
                "error"
            );

            CompanyDashboard.jobs = [];

            renderCompanyJobs();

            updateCompanyStats();

            return [];
        }


        CompanyDashboard.jobs =
            data || [];


        renderCompanyJobs();

        updateCompanyStats();


        return CompanyDashboard.jobs;

    } catch (error) {

        console.error(
            "Unexpected jobs error:",
            error
        );

        return [];
    }
}


/* =========================================================
   RENDER JOBS
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
            "Company jobs container was not found."
        );

        return;
    }


    const jobs =
        CompanyDashboard.jobs || [];


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
            function (job) {

                const title =
                    escapeCompanyHTML(
                        job.title ||
                        "Untitled Job"
                    );


                const company =
                    escapeCompanyHTML(
                        job.company ||
                        CompanyDashboard.profile?.full_name ||
                        "Web3 Company"
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
                        data-job-id="${escapeCompanyHTML(job.id)}"
                    >

                        <div class="company-job-content">

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

                            </div>

                            <p>
                                ${description}
                            </p>

                        </div>

                        <div class="company-job-actions">

                            <button
                                type="button"
                                data-action="delete-job"
                                data-job-id="${escapeCompanyHTML(job.id)}"
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

        showCompanyMessage(
            "انتهت جلسة تسجيل الدخول.",
            "error"
        );

        redirectToLogin();

        return null;
    }


    const title =
        String(
            jobData.title || ""
        ).trim();


    if (!title) {

        showCompanyMessage(
            "يرجى إدخال اسم الوظيفة.",
            "warning"
        );

        return null;
    }


    const companyName =
        String(
            jobData.company ||
            CompanyDashboard.profile?.company_name ||
            CompanyDashboard.profile?.full_name ||
            "Web3 Company"
        ).trim();


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
                        companyName,

                    location:
                        String(
                            jobData.location ||
                            "Remote"
                        ).trim(),

                    type:
                        String(
                            jobData.type ||
                            "Full Time"
                        ).trim(),

                    description:
                        String(
                            jobData.description ||
                            ""
                        ).trim(),

                    created_by:
                        user.id

                })
                .select()
                .single();


        if (error) {

            console.error(
                "Create job error:",
                error
            );

            showCompanyMessage(
                "تعذر نشر الوظيفة: " +
                error.message,
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
            "تم نشر الوظيفة بنجاح.",
            "success"
        );


        return data;

    } catch (error) {

        console.error(
            "Unexpected create job error:",
            error
        );

        showCompanyMessage(
            "حدث خطأ غير متوقع.",
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


    if (
        !window.confirm(
            "Are you sure you want to delete this job?"
        )
    ) {

        return false;
    }


    try {

        const {
            error
        } =
            await companySupabase
                .from("jobs")
                .delete()
                .eq("id", jobId)
                .eq("created_by", user.id);


        if (error) {

            console.error(
                "Delete job error:",
                error
            );

            showCompanyMessage(
                "تعذر حذف الوظيفة: " +
                error.message,
                "error"
            );

            return false;
        }


        CompanyDashboard.jobs =
            CompanyDashboard.jobs.filter(
                function (job) {

                    return String(job.id) !==
                        String(jobId);

                }
            );


        renderCompanyJobs();

        updateCompanyStats();


        showCompanyMessage(
            "تم حذف الوظيفة.",
            "success"
        );


        return true;

    } catch (error) {

        console.error(
            "Unexpected delete job error:",
            error
        );

        return false;
    }
}


/* =========================================================
   STATISTICS
   ========================================================= */

function updateCompanyStats() {

    const jobs =
        CompanyDashboard.jobs || [];


    const totalJobs =
        jobs.length;


    const activeJobs =
        jobs.filter(
            function (job) {

                if (
                    job.is_active === false ||
                    job.active === false ||
                    job.status === "closed"
                ) {

                    return false;
                }

                return true;
            }
        ).length;


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
            activeJobs;
    }


    const applicationsElement =
        document.querySelector(
            "#total-applications"
        );


    if (applicationsElement) {

        applicationsElement.textContent =
            "0";
    }
}


/* =========================================================
   CREATE JOB FORM
   ========================================================= */

function initializeCompanyJobForm() {

    const form =
        document.querySelector(
            "#create-job-form, " +
            ".create-job-form, " +
            "[data-create-job-form]"
        );


    if (!form) {

        console.warn(
            "Create job form not found."
        );

        return;
    }


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
        async function (event) {

            event.preventDefault();


            const formData =
                new FormData(form);


            const result =
                await createCompanyJob({

                    title:
                        formData.get("title"),

                    company:
                        formData.get("company"),

                    location:
                        formData.get("location"),

                    type:
                        formData.get("type"),

                    description:
                        formData.get("description")

                });


            if (result) {

                form.reset();

            }

        }
    );
}


/* =========================================================
   EVENTS
   ========================================================= */

function initializeCompanyEvents() {

    if (
        document.body.dataset.companyEventsInitialized ===
        "true"
    ) {

        return;
    }


    document.body.dataset.companyEventsInitialized =
        "true";


    document.addEventListener(
        "click",
        async function (event) {


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
                "Company logout error:",
                error
            );

            showCompanyMessage(
                "تعذر تسجيل الخروج.",
                "error"
            );

            return;
        }


        window.location.href =
            "login.html";


    } catch (error) {

        console.error(
            "Unexpected logout error:",
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
   MESSAGE
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

                zIndex: "999999",

                maxWidth: "380px",

                padding: "14px 18px",

                borderRadius: "10px",

                boxShadow:
                    "0 8px 25px rgba(0,0,0,.20)",

                fontSize: "14px",

                lineHeight: "1.6"

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
            "#ffffff";

    } else if (type === "error") {

        box.style.background =
            "#dc3545";

        box.style.color =
            "#ffffff";

    } else if (type === "warning") {

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
            function () {

                box.style.display =
                    "none";

            },
            5000
        );
}


/* =========================================================
   INITIALIZE DASHBOARD
   ========================================================= */

async function initializeCompanyDashboard() {

    if (
        CompanyDashboard.initialized
    ) {

        return;
    }


    CompanyDashboard.initialized =
        true;


    console.log(
        "Web3Jobs: Starting Company Dashboard..."
    );


    /* ---------------------------------------------------------
       SUPABASE
       --------------------------------------------------------- */

    const initialized =
        initializeCompanySupabase();


    if (!initialized) {

        showCompanyMessage(
            "تعذر تحميل Supabase.",
            "error"
        );

        return;
    }


    /* ---------------------------------------------------------
       SESSION
       --------------------------------------------------------- */

    const session =
        await getCompanySession();


    console.log(
        "Company session:",
        session
    );


    if (!session) {

        showCompanyMessage(
            "لا توجد جلسة دخول لحساب الشركة.",
            "error"
        );


        setTimeout(
            function () {

                redirectToLogin();

            },
            1000
        );


        return;
    }


    /* ---------------------------------------------------------
       USER
       --------------------------------------------------------- */

    const user =
        await getCompanyUser();


    if (!user) {

        showCompanyMessage(
            "تعذر قراءة حساب الشركة.",
            "error"
        );


        setTimeout(
            function () {

                redirectToLogin();

            },
            1000
        );


        return;
    }


    console.log(
        "Company user:",
        user.email,
        user.id
    );


    /* ---------------------------------------------------------
       PROFILE
       --------------------------------------------------------- */

    await loadCompanyProfile();


    console.log(
        "Company profile:",
        CompanyDashboard.profile
    );


    /* ---------------------------------------------------------
       VERIFY ACCOUNT
       --------------------------------------------------------- */

    const isCompany =
        await verifyCompanyAccount();


    if (!isCompany) {
        return;
    }


    /* ---------------------------------------------------------
       RENDER
       --------------------------------------------------------- */

    renderCompanyInformation();


    /* ---------------------------------------------------------
       JOBS
       --------------------------------------------------------- */

    await loadCompanyJobs();


    /* ---------------------------------------------------------
       FORM
       --------------------------------------------------------- */

    initializeCompanyJobForm();


    /* ---------------------------------------------------------
       EVENTS
       --------------------------------------------------------- */

    initializeCompanyEvents();


    console.log(
        "Web3Jobs: Company Dashboard initialized successfully."
    );
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.CompanyDashboard =
    CompanyDashboard;


window.Web3JobsCompany = {

    initializeCompanyDashboard,

    getCompanySession,

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


/* =========================================================
   END OF FILE
   ========================================================= */
