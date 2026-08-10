/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js

   Company Dashboard
   Supabase Project:
   https://jqhemwskrnlycximjpag.supabase.co
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
   STATE
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
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Company Dashboard: Supabase library not loaded."
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
            "Company Dashboard: Supabase initialized."
        );


        return companySupabase;


    } catch (error) {

        console.error(
            "Company Dashboard Supabase error:",
            error
        );

        return null;
    }
}


/* =========================================================
   CURRENT USER
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
                "Company Dashboard getUser error:",
                error
            );

            return null;
        }


        CompanyDashboard.user =
            data?.user || null;


        return CompanyDashboard.user;


    } catch (error) {

        console.error(
            "Company Dashboard user error:",
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

        const {
            data,
            error
        } =
            await client
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    user.id
                )
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


        console.log(
            "Company profile:",
            CompanyDashboard.profile
        );


        return CompanyDashboard.profile;


    } catch (error) {

        console.error(
            "Company profile exception:",
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
            "لم يتم العثور على المستخدم.",
            "User not found.",
            "error"
        );

        return false;
    }


    const profile =
        CompanyDashboard.profile ||
        await loadCompanyProfile();


    const profileType =
        profile?.account_type;


    const metadataType =
        user.user_metadata?.account_type;


    const accountType =
        String(
            profileType ||
            metadataType ||
            ""
        )
        .trim()
        .toLowerCase();


    console.log(
        "Company Dashboard account_type:",
        accountType
    );


    if (
        accountType !== "company"
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
   RENDER COMPANY INFO
   ========================================================= */

function renderCompanyInformation() {

    const user =
        CompanyDashboard.user;

    const profile =
        CompanyDashboard.profile;


    if (!user) {

        return;
    }


    const companyName =
        profile?.company_name ||
        profile?.full_name ||
        profile?.name ||
        user.user_metadata?.company_name ||
        user.user_metadata?.full_name ||
        user.email ||
        "Company";


    const email =
        profile?.email ||
        user.email ||
        "";


    const nameElements =
        document.querySelectorAll(
            "[data-company-name], #company-name"
        );


    nameElements.forEach(
        element => {

            element.textContent =
                companyName;

        }
    );


    const emailElements =
        document.querySelectorAll(
            "[data-company-email], #company-email"
        );


    emailElements.forEach(
        element => {

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
        CompanyDashboard.user ||
        await getCompanyUser();


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
                "Company jobs error:",
                error
            );


            showCompanyMessage(
                "تعذر تحميل الوظائف.",
                "Unable to load jobs.",
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
            "Load jobs exception:",
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

        console.error(
            "company-jobs-list was not found."
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
                    id="create-first-job"
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

                return `

                    <article
                        class="company-job-card"
                    >

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
                                data-delete-job="${job.id}"
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

async function createCompanyJob(
    jobData
) {

    const client =
        initializeCompanySupabase();


    const user =
        CompanyDashboard.user ||
        await getCompanyUser();


    if (!client || !user) {

        return null;
    }


    const title =
        String(
            jobData.title || ""
        )
        .trim();


    if (!title) {

        showCompanyMessage(
            "يرجى كتابة اسم الوظيفة.",
            "Please enter a job title.",
            "error"
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

                    title,

                    company:
                        jobData.company ||
                        CompanyDashboard.profile?.name ||
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
                "Create job error:",
                error
            );


            showCompanyMessage(
                "تعذر نشر الوظيفة.",
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
            "تم نشر الوظيفة بنجاح.",
            "Job published successfully.",
            "success"
        );


        return data;


    } catch (error) {

        console.error(
            "Create job exception:",
            error
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
        initializeCompanySupabase();


    const user =
        CompanyDashboard.user ||
        await getCompanyUser();


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

            showCompanyMessage(
                "تعذر حذف الوظيفة.",
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
            "تم حذف الوظيفة.",
            "Job deleted successfully.",
            "success"
        );


        return true;


    } catch (error) {

        console.error(
            "Delete job exception:",
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

        console.warn(
            "Create job form not found."
        );

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
        async function(event) {

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
        async function(event) {


            /* DELETE */

            const deleteButton =
                event.target.closest(
                    "[data-delete-job]"
                );


            if (deleteButton) {

                await deleteCompanyJob(
                    deleteButton.dataset.deleteJob
                );

                return;
            }


            /* CREATE FIRST JOB */

            const createButton =
                event.target.closest(
                    "#create-first-job"
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


            /* LOGOUT */

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


    try {

        await client.auth.signOut();


        window.location.replace(
            "login.html"
        );


    } catch (error) {

        console.error(
            "Company logout error:",
            error
        );
    }
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeCompanyHTML(value) {

    return String(
        value ?? ""
    )
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
    messageEn,
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

                zIndex: "99999",

                padding: "15px 20px",

                borderRadius: "10px",

                color: "#fff",

                background:
                    type === "error"
                        ? "#dc3545"
                        : type === "success"
                            ? "#198754"
                            : "#212529",

                boxShadow:
                    "0 8px 25px rgba(0,0,0,.2)",

                maxWidth: "380px"

            }
        );


        document.body.appendChild(
            box
        );
    }


    box.textContent =
        messageAr +
        " — " +
        messageEn;


    box.style.display =
        "block";


    clearTimeout(
        box._timer
    );


    box._timer =
        setTimeout(
            function() {

                box.style.display =
                    "none";

            },
            4000
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
        "Company Dashboard starting..."
    );


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

        console.error(
            "Company Dashboard: No authenticated user."
        );

        window.location.replace(
            "login.html"
        );

        return;
    }


    console.log(
        "Company Dashboard user:",
        user.email
    );


    const profile =
        await loadCompanyProfile();


    console.log(
        "Company Dashboard profile:",
        profile
    );


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
        "Company Dashboard initialized successfully."
    );
}


/* =========================================================
   GLOBAL
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


/* =========================================================
   END
   ========================================================= */
