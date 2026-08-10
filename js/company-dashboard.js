/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js

   COMPANY DASHBOARD - FIXED

   FIXES:
   - Correct company Supabase project
   - Correct company_id column
   - No created_by
   - Loads company jobs
   - Creates jobs with company_id
   - Deletes jobs with company_id
   - Checks company account correctly
   ========================================================= */

"use strict";


/* =========================================================
   SUPABASE
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

        return companySupabase;
    }


    if (
        typeof window === "undefined" ||
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Web3Jobs Company: Supabase library not loaded."
        );

        return null;
    }


    try {

        companySupabase =
            window.supabase.createClient(
                COMPANY_SUPABASE_URL,
                COMPANY_SUPABASE_KEY
            );


        console.log(
            "Web3Jobs Company: Supabase initialized."
        );


        return companySupabase;

    } catch (error) {

        console.error(
            "Web3Jobs Company: Supabase initialization error:",
            error
        );

        companySupabase = null;

        return null;
    }
}


/* =========================================================
   GET USER
   ========================================================= */

async function getCompanyUser() {

    const client =
        companySupabase ||
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
                "Web3Jobs Company: getUser error:",
                error
            );

            return null;
        }


        CompanyDashboard.user =
            data?.user || null;


        return CompanyDashboard.user;

    } catch (error) {

        console.error(
            "Web3Jobs Company: unexpected getUser error:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD COMPANY PROFILE
   ========================================================= */

async function loadCompanyProfile() {

    const client =
        companySupabase ||
        initializeCompanySupabase();


    if (!client) {

        return null;
    }


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
            await client
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();


        if (error) {

            console.error(
                "Web3Jobs Company: profile error:",
                error
            );

            return null;
        }


        CompanyDashboard.profile =
            data || null;


        console.log(
            "Web3Jobs Company: profile:",
            CompanyDashboard.profile
        );


        return CompanyDashboard.profile;

    } catch (error) {

        console.error(
            "Web3Jobs Company: unexpected profile error:",
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

        setTimeout(
            () => {

                window.location.href =
                    "login.html";

            },
            1200
        );

        return false;
    }


    const profile =
        CompanyDashboard.profile ||
        await loadCompanyProfile();


    const accountType =
        profile?.account_type ||
        user.user_metadata?.account_type ||
        user.user_metadata?.accountType ||
        user.user_metadata?.role ||
        "";


    console.log(
        "Web3Jobs Company: account_type =",
        accountType
    );


    if (
        String(accountType)
            .trim()
            .toLowerCase() !==
        "company"
    ) {

        showCompanyMessage(
            "هذا الحساب ليس حساب شركة.",
            "This is not a company account.",
            "error"
        );

        return false;
    }


    return true;
}


/* =========================================================
   LOAD COMPANY JOBS
   =========================================================
   
   IMPORTANT:
   jobs table uses:
   
   company_id
   
   NOT:
   
   created_by
   ========================================================= */

async function loadCompanyJobs() {

    const client =
        companySupabase ||
        initializeCompanySupabase();


    if (!client) {

        showCompanyMessage(
            "تعذر الاتصال بقاعدة البيانات.",
            "Unable to connect to database.",
            "error"
        );

        return [];
    }


    const user =
        CompanyDashboard.user ||
        await getCompanyUser();


    if (!user) {

        showCompanyMessage(
            "جلسة تسجيل الدخول غير موجودة.",
            "Login session not found.",
            "error"
        );

        return [];
    }


    console.log(
        "Web3Jobs Company: Loading jobs for company:",
        user.id
    );


    try {

        const {
            data,
            error
        } =
            await client
                .from("jobs")
                .select(
                    "id, title, company, location, type, description, skills, salary, application_url, company_id, created_at, updated_at"
                )
                .eq(
                    "company_id",
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
                "Web3Jobs Company: LOAD JOBS ERROR:",
                error
            );


            showCompanyMessage(
                "تعذر تحميل الوظائف: " +
                error.message,
                "Unable to load jobs: " +
                error.message,
                "error"
            );


            return [];
        }


        CompanyDashboard.jobs =
            data || [];


        console.log(
            "Web3Jobs Company: Jobs loaded:",
            CompanyDashboard.jobs
        );


        renderCompanyJobs();

        updateCompanyStats();


        return CompanyDashboard.jobs;

    } catch (error) {

        console.error(
            "Web3Jobs Company: unexpected load jobs error:",
            error
        );


        showCompanyMessage(
            "حدث خطأ أثناء تحميل الوظائف.",
            "An error occurred while loading jobs.",
            "error"
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
            "Web3Jobs Company: jobs container not found."
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


                const company =
                    escapeCompanyHTML(
                        job.company ||
                        "Company"
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


                const salary =
                    escapeCompanyHTML(
                        job.salary ||
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
                                    🏢 ${company}
                                </span>

                                <span>
                                    📍 ${location}
                                </span>

                                <span>
                                    💼 ${type}
                                </span>

                            </div>

                            ${
                                salary
                                ?
                                `
                                <div>
                                    💰 ${salary}
                                </div>
                                `
                                :
                                ""
                            }

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

async function createCompanyJob(
    jobData = {}
) {

    const client =
        companySupabase ||
        initializeCompanySupabase();


    if (!client) {

        return null;
    }


    const user =
        CompanyDashboard.user ||
        await getCompanyUser();


    if (!user) {

        showCompanyMessage(
            "يجب تسجيل الدخول أولاً.",
            "You must be logged in.",
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
            "عنوان الوظيفة مطلوب.",
            "Job title is required.",
            "warning"
        );

        return null;
    }


    const companyName =
        jobData.company ||
        CompanyDashboard.profile?.company_name ||
        CompanyDashboard.profile?.name ||
        CompanyDashboard.profile?.full_name ||
        user.user_metadata?.company_name ||
        user.user_metadata?.full_name ||
        user.email ||
        "Web3 Company";


    try {

        const {
            data,
            error
        } =
            await client
                .from("jobs")
                .insert({

                    title:
                        title,

                    company:
                        companyName,

                    location:
                        jobData.location ||
                        "Remote",

                    type:
                        jobData.type ||
                        "Full Time",

                    description:
                        jobData.description ||
                        "",

                    skills:
                        jobData.skills ||
                        "",

                    salary:
                        jobData.salary ||
                        "",

                    application_url:
                        jobData.application_url ||
                        "",

                    company_id:
                        user.id

                })
                .select()
                .single();


        if (error) {

            console.error(
                "Web3Jobs Company: CREATE JOB ERROR:",
                error
            );


            showCompanyMessage(
                "تعذر نشر الوظيفة: " +
                error.message,
                "Unable to publish job: " +
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
            "Job published successfully.",
            "success"
        );


        return data;

    } catch (error) {

        console.error(
            "Web3Jobs Company: create job exception:",
            error
        );


        showCompanyMessage(
            "حدث خطأ أثناء نشر الوظيفة.",
            "An error occurred while publishing the job.",
            "error"
        );


        return null;
    }
}


/* =========================================================
   DELETE JOB
   ========================================================= */

async function deleteCompanyJob(
    jobId
) {

    const client =
        companySupabase ||
        initializeCompanySupabase();


    if (!client) {

        return false;
    }


    const user =
        CompanyDashboard.user ||
        await getCompanyUser();


    if (!user) {

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
            await client
                .from("jobs")
                .delete()
                .eq(
                    "id",
                    jobId
                )
                .eq(
                    "company_id",
                    user.id
                );


        if (error) {

            console.error(
                "Web3Jobs Company: DELETE JOB ERROR:",
                error
            );


            showCompanyMessage(
                "تعذر حذف الوظيفة: " +
                error.message,
                "Unable to delete job: " +
                error.message,
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
            "تم حذف الوظيفة بنجاح.",
            "Job deleted successfully.",
            "success"
        );


        return true;

    } catch (error) {

        console.error(
            "Web3Jobs Company: delete job exception:",
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


    const totalElements =
        document.querySelectorAll(
            "#total-jobs, " +
            "#company-total-jobs, " +
            "[data-total-jobs]"
        );


    totalElements.forEach(
        element => {

            element.textContent =
                total;

        }
    );


    const activeElements =
        document.querySelectorAll(
            "#active-jobs, " +
            "#company-active-jobs, " +
            "[data-active-jobs]"
        );


    activeElements.forEach(
        element => {

            element.textContent =
                total;

        }
    );
}


/* =========================================================
   COMPANY INFORMATION
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
        profile?.name ||
        profile?.full_name ||
        user?.user_metadata?.company_name ||
        user?.user_metadata?.full_name ||
        user?.email ||
        "Company";


    const email =
        profile?.email ||
        user?.email ||
        "";


    document
        .querySelectorAll(
            "[data-company-name], #company-name, .company-name"
        )
        .forEach(
            element => {

                element.textContent =
                    companyName;

            }
        );


    document
        .querySelectorAll(
            "[data-company-email], #company-email, .company-email"
        )
        .forEach(
            element => {

                element.textContent =
                    email;

            }
        );
}


/* =========================================================
   JOB FORM
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


                    const result =
                        await createCompanyJob({

                            title:
                                formData.get("title") ||
                                "",

                            company:
                                formData.get("company") ||
                                "",

                            location:
                                formData.get("location") ||
                                "Remote",

                            type:
                                formData.get("type") ||
                                "Full Time",

                            description:
                                formData.get("description") ||
                                "",

                            skills:
                                formData.get("skills") ||
                                "",

                            salary:
                                formData.get("salary") ||
                                "",

                            application_url:
                                formData.get("application_url") ||
                                ""

                        });


                    if (result) {

                        form.reset();

                    }

                }
            );

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

    const client =
        companySupabase ||
        initializeCompanySupabase();


    if (!client) {

        return;
    }


    try {

        const {
            error
        } =
            await client.auth.signOut();


        if (error) {

            console.error(
                "Web3Jobs Company: logout error:",
                error
            );

            return;
        }


        window.location.href =
            "login.html";

    } catch (error) {

        console.error(
            "Web3Jobs Company: logout exception:",
            error
        );

    }
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeCompanyHTML(
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
   MESSAGE
   ========================================================= */

function showCompanyMessage(
    messageAr,
    messageEn = "",
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

                maxWidth: "420px",

                padding: "14px 18px",

                borderRadius: "10px",

                boxShadow:
                    "0 8px 25px rgba(0,0,0,.2)",

                fontSize: "14px",

                lineHeight: "1.6"

            }
        );


        document.body.appendChild(
            box
        );
    }


    box.innerHTML =
        `
            <div>
                ${escapeCompanyHTML(messageAr)}
            </div>

            ${
                messageEn
                ?
                `
                <div>
                    ${escapeCompanyHTML(messageEn)}
                </div>
                `
                :
                ""
            }
        `;


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


    const client =
        initializeCompanySupabase();


    if (!client) {

        showCompanyMessage(
            "تعذر الاتصال بـ Supabase.",
            "Unable to connect to Supabase.",
            "error"
        );

        return;
    }


    const user =
        await getCompanyUser();


    if (!user) {

        window.location.href =
            "login.html";

        return;
    }


    console.log(
        "Web3Jobs Company: Logged user:",
        user.email
    );


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
        "Web3Jobs Company Dashboard initialized successfully."
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
