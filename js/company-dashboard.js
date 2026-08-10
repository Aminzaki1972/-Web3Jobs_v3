"use strict";

/* =========================================================
   Web3Jobs
   Company Dashboard
   Company Supabase Project
   ========================================================= */

const COMPANY_SUPABASE_URL =
    "https://jqhemwskrnlycximjpag.supabase.co";

const COMPANY_SUPABASE_KEY =
    "sb_publishable_JZuODPmD72gqSauHBTGNYg_cbN7gVsp";

let companySupabase = null;

const CompanyDashboard = {
    user: null,
    profile: null,
    jobs: [],
    initialized: false
};


/* =========================================================
   SUPABASE
   ========================================================= */

function initializeCompanySupabase() {

    if (companySupabase) {
        return companySupabase;
    }

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Supabase library not loaded."
        );

        return null;
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
            "Company Supabase initialized:",
            COMPANY_SUPABASE_URL
        );

        return companySupabase;

    } catch (error) {

        console.error(
            "Supabase initialization error:",
            error
        );

        return null;
    }
}


/* =========================================================
   GET SESSION
   ========================================================= */

async function getCompanySession() {

    const client =
        initializeCompanySupabase();

    if (!client) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await client.auth.getSession();

        if (error) {

            console.error(
                "Session error:",
                error
            );

            return null;
        }

        console.log(
            "Company session:",
            data?.session
        );

        return data?.session || null;

    } catch (error) {

        console.error(
            "Unexpected session error:",
            error
        );

        return null;
    }
}


/* =========================================================
   GET USER
   ========================================================= */

async function getCompanyUser() {

    const client =
        initializeCompanySupabase();

    if (!client) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await client.auth.getUser();

        if (error) {

            console.error(
                "getUser error:",
                error
            );

            return null;
        }

        CompanyDashboard.user =
            data?.user || null;

        console.log(
            "Company authenticated user:",
            CompanyDashboard.user
        );

        return CompanyDashboard.user;

    } catch (error) {

        console.error(
            "Unexpected getUser error:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadCompanyProfile() {

    const client =
        initializeCompanySupabase();

    const user =
        CompanyDashboard.user ||
        await getCompanyUser();

    if (!client || !user) {
        return null;
    }

    try {

        /*
         * We search by USER ID.
         */

        let result =
            await client
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();


        /*
         * If no profile was found by ID,
         * try the email as a second check.
         */

        if (
            !result.data &&
            !result.error
        ) {

            result =
                await client
                    .from("profiles")
                    .select("*")
                    .eq("email", user.email)
                    .maybeSingle();
        }


        if (result.error) {

            console.error(
                "Profile query error:",
                result.error
            );

            return null;
        }


        CompanyDashboard.profile =
            result.data || null;


        console.log(
            "Company profile:",
            CompanyDashboard.profile
        );


        return CompanyDashboard.profile;

    } catch (error) {

        console.error(
            "Profile loading error:",
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
            "لا توجد جلسة دخول لحساب الشركة.",
            "error"
        );

        return false;
    }


    const profile =
        CompanyDashboard.profile ||
        await loadCompanyProfile();


    if (!profile) {

        console.error(
            "Company profile was not found."
        );

        showCompanyMessage(
            "لم يتم العثور على ملف حساب الشركة.",
            "error"
        );

        return false;
    }


    const accountType =
        String(
            profile.account_type || ""
        )
        .trim()
        .toLowerCase();


    console.log(
        "Detected account type:",
        accountType
    );


    if (accountType === "company") {

        console.log(
            "Company account verified successfully."
        );

        return true;
    }


    showCompanyMessage(
        "هذا الحساب ليس حساب شركة.",
        "error"
    );


    console.error(
        "Wrong account type:",
        accountType,
        profile
    );


    return false;
}


/* =========================================================
   RENDER COMPANY INFORMATION
   ========================================================= */

function renderCompanyInformation() {

    const profile =
        CompanyDashboard.profile;

    const user =
        CompanyDashboard.user;


    const name =
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        "Company";


    const email =
        profile?.email ||
        user?.email ||
        "";


    document
        .querySelectorAll(
            "#company-name, [data-company-name], .company-name"
        )
        .forEach(
            function (element) {

                element.textContent =
                    name;

            }
        );


    document
        .querySelectorAll(
            "#company-email, [data-company-email], .company-email"
        )
        .forEach(
            function (element) {

                element.textContent =
                    email;

            }
        );
}


/* =========================================================
   LOAD JOBS
   ========================================================= */

async function loadCompanyJobs() {

    const client =
        initializeCompanySupabase();

    const user =
        CompanyDashboard.user;


    if (!client || !user) {
        return [];
    }


    try {

        const {
            data,
            error
        } =
            await client
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
                "Jobs loading error:",
                error
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
        document.getElementById(
            "company-jobs-list"
        );


    if (!container) {
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

                return `

                    <article class="company-job-card">

                        <div class="company-job-content">

                            <h3>
                                ${escapeCompanyHTML(
                                    job.title ||
                                    "Untitled Job"
                                )}
                            </h3>

                            <div class="company-job-meta">

                                <span>
                                    📍
                                    ${escapeCompanyHTML(
                                        job.location ||
                                        "Remote"
                                    )}
                                </span>

                                <span>
                                    💼
                                    ${escapeCompanyHTML(
                                        job.type ||
                                        "Full Time"
                                    )}
                                </span>

                            </div>

                            <p>
                                ${escapeCompanyHTML(
                                    job.description ||
                                    ""
                                )}
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
        )
        .join("");
}


/* =========================================================
   CREATE JOB
   ========================================================= */

async function createCompanyJob(jobData) {

    const client =
        initializeCompanySupabase();

    const user =
        CompanyDashboard.user;


    if (!client || !user) {

        showCompanyMessage(
            "انتهت جلسة تسجيل الدخول.",
            "error"
        );

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


    try {

        const {
            data,
            error
        } =
            await client
                .from("jobs")
                .insert({

                    title: title,

                    company:
                        jobData.company ||
                        CompanyDashboard.profile?.full_name ||
                        "Company",

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

        return null;
    }
}


/* =========================================================
   DELETE JOB
   ========================================================= */

async function deleteCompanyJob(jobId) {

    const client =
        initializeCompanySupabase();

    const user =
        CompanyDashboard.user;


    if (!client || !user) {
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
            await client
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
                "Delete job error:",
                error
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


        return true;

    } catch (error) {

        console.error(
            "Unexpected delete error:",
            error
        );

        return false;
    }
}


/* =========================================================
   STATISTICS
   ========================================================= */

function updateCompanyStats() {

    const total =
        CompanyDashboard.jobs.length;


    const totalElement =
        document.getElementById(
            "total-jobs"
        );


    const activeElement =
        document.getElementById(
            "active-jobs"
        );


    const applicationsElement =
        document.getElementById(
            "total-applications"
        );


    if (totalElement) {
        totalElement.textContent =
            total;
    }


    if (activeElement) {
        activeElement.textContent =
            total;
    }


    if (applicationsElement) {
        applicationsElement.textContent =
            "0";
    }
}


/* =========================================================
   FORM
   ========================================================= */

function initializeCompanyJobForm() {

    const form =
        document.getElementById(
            "create-job-form"
        );


    if (!form) {
        return;
    }


    if (
        form.dataset.initialized ===
        "true"
    ) {
        return;
    }


    form.dataset.initialized =
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
                    document.getElementById(
                        "create-job-form"
                    );


                if (form) {

                    form.scrollIntoView({
                        behavior: "smooth"
                    });

                }

                return;
            }


            const logoutButton =
                event.target.closest(
                    '[data-action="logout"]'
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

    const client =
        initializeCompanySupabase();


    if (!client) {
        return;
    }


    await client.auth.signOut();


    window.location.href =
        "login.html";
}


/* =========================================================
   ESCAPE HTML
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

                padding: "14px 18px",

                borderRadius: "10px",

                fontSize: "14px",

                boxShadow:
                    "0 8px 25px rgba(0,0,0,.2)"

            }
        );


        document.body.appendChild(
            box
        );
    }


    box.textContent =
        message;


    if (type === "error") {

        box.style.background =
            "#dc3545";

        box.style.color =
            "#fff";

    } else if (type === "success") {

        box.style.background =
            "#198754";

        box.style.color =
            "#fff";

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
            function () {

                box.style.display =
                    "none";

            },
            5000
        );
}


/* =========================================================
   INITIALIZE
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
        "Starting Company Dashboard..."
    );


    const client =
        initializeCompanySupabase();


    if (!client) {

        showCompanyMessage(
            "تعذر تشغيل Supabase.",
            "error"
        );

        return;
    }


    const session =
        await getCompanySession();


    if (!session) {

        showCompanyMessage(
            "لا توجد جلسة دخول في مشروع الشركة.",
            "error"
        );

        setTimeout(
            function () {

                window.location.href =
                    "login.html";

            },
            1500
        );

        return;
    }


    const user =
        await getCompanyUser();


    if (!user) {

        showCompanyMessage(
            "تعذر قراءة المستخدم.",
            "error"
        );

        return;
    }


    await loadCompanyProfile();


    const verified =
        await verifyCompanyAccount();


    if (!verified) {
        return;
    }


    renderCompanyInformation();


    await loadCompanyJobs();


    initializeCompanyJobForm();


    initializeCompanyEvents();


    console.log(
        "Company Dashboard READY."
    );
}


/* =========================================================
   GLOBAL
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
