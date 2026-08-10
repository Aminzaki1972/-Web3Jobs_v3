/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js

   COMPANY DASHBOARD
   ---------------------------------------------------------
   Compatible with current Supabase jobs table:

   jobs:
   - id
   - title
   - company
   - location
   - type
   - description
   - skills
   - salary
   - application_url
   - company_id
   - created_at
   - updated_at

   IMPORTANT:
   company_id is used instead of created_by.
   ========================================================= */

"use strict";


/* =========================================================
   SUPABASE
   ========================================================= */

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

    /*
     * Use the central Supabase client first.
     */

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.auth !== "undefined"
    ) {

        companySupabase =
            window.supabaseClient;

        console.log(
            "Web3Jobs Company: Using central Supabase client."
        );

        return true;
    }


    /*
     * Fallback to Web3JobsSupabase.
     */

    if (
        window.Web3JobsSupabase &&
        typeof window.Web3JobsSupabase.getClient === "function"
    ) {

        try {

            companySupabase =
                window.Web3JobsSupabase.getClient();

            if (companySupabase) {

                console.log(
                    "Web3Jobs Company: Connected through Web3JobsSupabase."
                );

                return true;
            }

        } catch (error) {

            console.error(
                "Web3Jobs Company: Supabase client error:",
                error
            );

        }

    }


    /*
     * Last fallback:
     * create client from central configuration.
     */

    if (
        window.supabase &&
        typeof window.supabase.createClient === "function" &&
        window.Web3JobsSupabase
    ) {

        try {

            companySupabase =
                window.supabase.createClient(
                    window.Web3JobsSupabase.url,
                    window.Web3JobsSupabase.publishableKey
                );

            console.log(
                "Web3Jobs Company: Fallback Supabase client created."
            );

            return true;

        } catch (error) {

            console.error(
                "Web3Jobs Company: Fallback initialization error:",
                error
            );

        }

    }


    console.error(
        "Web3Jobs Company: Supabase client is not available."
    );

    return false;
}


/* =========================================================
   GET CURRENT USER
   ========================================================= */

async function getCompanyUser() {

    if (!companySupabase) {

        if (
            !initializeCompanySupabase()
        ) {

            return null;
        }

    }


    try {

        const {
            data,
            error
        } =
            await companySupabase.auth.getUser();


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
            "Web3Jobs Company: getCompanyUser error:",
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

        /*
         * Only request columns that are known
         * to exist in the profiles table.
         */

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
                "Web3Jobs Company: Profile loading error:",
                error
            );

            return null;
        }


        CompanyDashboard.profile =
            data || null;


        return CompanyDashboard.profile;


    } catch (error) {

        console.error(
            "Web3Jobs Company: loadCompanyProfile error:",
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


    const profileType =
        profile?.account_type;


    const metadataType =
        user.user_metadata?.account_type ||
        user.user_metadata?.accountType ||
        user.user_metadata?.role;


    const accountType =
        String(
            profileType ||
            metadataType ||
            ""
        )
        .trim()
        .toLowerCase();


    console.log(
        "Web3Jobs Company: Account type:",
        accountType
    );


    if (
        accountType !== "company"
    ) {

        console.error(
            "Web3Jobs Company: This is not a company account.",
            {
                userId:
                    user.id,

                email:
                    user.email,

                profile:
                    profile,

                metadata:
                    user.user_metadata
            }
        );


        showCompanyMessage(
            "هذا ليس حساب شركة.",
            "This is not a company account.",
            "error"
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

        redirectToLogin();

        return [];
    }


    try {

        console.log(
            "Web3Jobs Company: Loading jobs for company:",
            user.id
        );


        /*
         * IMPORTANT:
         *
         * jobs.company_id = profiles.id
         * jobs.company_id is UUID.
         *
         * We DO NOT use created_by.
         */

        const {
            data,
            error
        } =
            await companySupabase
                .from("jobs")
                .select("*")
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
                "Web3Jobs Company: Unable to load jobs:",
                error
            );


            showCompanyMessage(
                "تعذر تحميل الوظائف.",
                "Unable to load your jobs.",
                "error"
            );


            CompanyDashboard.jobs =
                [];


            renderCompanyJobs();

            updateCompanyStats();

            return [];
        }


        CompanyDashboard.jobs =
            Array.isArray(data)
                ? data
                : [];


        console.log(
            "Web3Jobs Company: Jobs loaded:",
            CompanyDashboard.jobs
        );


        renderCompanyJobs();

        updateCompanyStats();


        return CompanyDashboard.jobs;


    } catch (error) {

        console.error(
            "Web3Jobs Company: loadCompanyJobs exception:",
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
            "Web3Jobs Company: Jobs container not found."
        );

        return;
    }


    const jobs =
        CompanyDashboard.jobs || [];


    /*
     * No jobs.
     */

    if (!jobs.length) {

        container.innerHTML = `

            <div class="no-company-jobs">

                <h3>
                    لا توجد وظائف منشورة بعد
                </h3>

                <p>
                    لم تقم الشركة بنشر أي وظيفة حتى الآن.
                </p>

                <button
                    type="button"
                    class="company-create-job-button"
                    data-action="create-job"
                >
                    إنشاء وظيفة
                </button>

            </div>

        `;


        return;
    }


    /*
     * Render jobs.
     */

    container.innerHTML =
        jobs
            .map(
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


                    const skills =
                        escapeCompanyHTML(
                            job.skills ||
                            ""
                        );


                    const salary =
                        escapeCompanyHTML(
                            job.salary ||
                            ""
                        );


                    const applicationUrl =
                        escapeCompanyHTML(
                            job.application_url ||
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
                                    description
                                        ? `
                                            <p>
                                                ${description}
                                            </p>
                                          `
                                        : ""
                                }


                                ${
                                    skills
                                        ? `
                                            <p>
                                                <strong>
                                                    Skills:
                                                </strong>
                                                ${skills}
                                            </p>
                                          `
                                        : ""
                                }


                                ${
                                    salary
                                        ? `
                                            <p>
                                                <strong>
                                                    Salary:
                                                </strong>
                                                ${salary}
                                            </p>
                                          `
                                        : ""
                                }


                                ${
                                    applicationUrl
                                        ? `
                                            <p>
                                                <a
                                                    href="${applicationUrl}"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    Application Link
                                                </a>
                                            </p>
                                          `
                                        : ""
                                }

                            </div>


                            <div class="company-job-actions">

                                <button
                                    type="button"
                                    data-action="delete-job"
                                    data-job-id="${job.id}"
                                >
                                    حذف الوظيفة
                                </button>

                            </div>

                        </article>

                    `;
                }
            )
            .join("");
}


/* =========================================================
   CREATE COMPANY JOB
   ========================================================= */

async function createCompanyJob(
    jobData = {}
) {

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
        )
        .trim();


    if (!title) {

        showCompanyMessage(
            "عنوان الوظيفة مطلوب.",
            "Job title is required.",
            "warning"
        );

        return null;
    }


    /*
     * Determine company name.
     */

    const companyName =
        jobData.company ||
        CompanyDashboard.profile?.company_name ||
        CompanyDashboard.profile?.name ||
        CompanyDashboard.profile?.full_name ||
        user.user_metadata?.company_name ||
        user.user_metadata?.full_name ||
        "Web3 Company";


    try {

        /*
         * IMPORTANT:
         *
         * company_id is the correct column.
         *
         * Do NOT use created_by.
         */

        const insertData = {

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
        };


        console.log(
            "Web3Jobs Company: Creating job:",
            insertData
        );


        const {
            data,
            error
        } =
            await companySupabase
                .from("jobs")
                .insert(
                    insertData
                )
                .select()
                .single();


        if (error) {

            console.error(
                "Web3Jobs Company: Create job error:",
                error
            );


            showCompanyMessage(
                "تعذر نشر الوظيفة.",
                "Unable to publish job.",
                "error"
            );


            return null;
        }


        /*
         * Add to local state.
         */

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
            "Web3Jobs Company: createCompanyJob exception:",
            error
        );


        showCompanyMessage(
            "حدث خطأ غير متوقع.",
            "An unexpected error occurred.",
            "error"
        );


        return null;
    }
}


/* =========================================================
   DELETE COMPANY JOB
   ========================================================= */

async function deleteCompanyJob(
    jobId
) {

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
            "هل تريد حذف هذه الوظيفة؟"
        );


    if (!confirmed) {

        return false;
    }


    try {

        /*
         * Delete using company_id.
         */

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
                    "company_id",
                    user.id
                );


        if (error) {

            console.error(
                "Web3Jobs Company: Delete job error:",
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
            "تم حذف الوظيفة بنجاح.",
            "Job deleted successfully.",
            "success"
        );


        return true;


    } catch (error) {

        console.error(
            "Web3Jobs Company: deleteCompanyJob exception:",
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


    const totalJobsElements =
        document.querySelectorAll(
            "#total-jobs, " +
            "#company-total-jobs, " +
            "[data-total-jobs]"
        );


    totalJobsElements.forEach(
        element => {

            element.textContent =
                totalJobs;

        }
    );


    const activeJobsElements =
        document.querySelectorAll(
            "#active-jobs, " +
            "#company-active-jobs, " +
            "[data-active-jobs]"
        );


    activeJobsElements.forEach(
        element => {

            element.textContent =
                totalJobs;

        }
    );
}


/* =========================================================
   RENDER COMPANY INFORMATION
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


                    const getValue =
                        name => {

                            const value =
                                formData.get(name);


                            if (
                                value !== null &&
                                value !== undefined
                            ) {

                                return String(value).trim();

                            }


                            return (
                                form.querySelector(
                                    `[name="${name}"]`
                                )?.value ||
                                ""
                            )
                            .trim();

                        };


                    const jobData = {

                        title:
                            getValue("title"),

                        company:
                            getValue("company"),

                        location:
                            getValue("location") ||
                            "Remote",

                        type:
                            getValue("type") ||
                            "Full Time",

                        description:
                            getValue("description"),

                        skills:
                            getValue("skills"),

                        salary:
                            getValue("salary"),

                        application_url:
                            getValue(
                                "application_url"
                            )

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
   DASHBOARD EVENTS
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

                        behavior:
                            "smooth",

                        block:
                            "start"

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
                "Web3Jobs Company: Logout error:",
                error
            );


            showCompanyMessage(
                "تعذر تسجيل الخروج.",
                "Unable to sign out.",
                "error"
            );


            return;
        }


        window.location.href =
            "login.html";


    } catch (error) {

        console.error(
            "Web3Jobs Company: companyLogout error:",
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

                position:
                    "fixed",

                top:
                    "20px",

                right:
                    "20px",

                zIndex:
                    "100000",

                maxWidth:
                    "380px",

                padding:
                    "14px 18px",

                borderRadius:
                    "10px",

                boxShadow:
                    "0 8px 25px rgba(0,0,0,.2)",

                fontSize:
                    "14px",

                lineHeight:
                    "1.6"

            }
        );


        document.body.appendChild(
            box
        );

    }


    box.innerHTML = `

        <div>
            ${escapeCompanyHTML(messageAr)}
        </div>

        ${
            messageEn
                ? `
                    <div>
                        ${escapeCompanyHTML(messageEn)}
                    </div>
                  `
                : ""
        }

    `;


    if (
        type === "success"
    ) {

        box.style.background =
            "#198754";

        box.style.color =
            "#fff";

    } else if (
        type === "error"
    ) {

        box.style.background =
            "#dc3545";

        box.style.color =
            "#fff";

    } else if (
        type === "warning"
    ) {

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


    console.log(
        "========================================"
    );

    console.log(
        "Web3Jobs Company Dashboard starting..."
    );

    console.log(
        "========================================"
    );


    /*
     * Initialize Supabase.
     */

    const initialized =
        initializeCompanySupabase();


    if (!initialized) {

        showCompanyMessage(
            "تعذر الاتصال بـ Supabase.",
            "Supabase is not available.",
            "error"
        );


        return;
    }


    /*
     * Get authenticated user.
     */

    const user =
        await getCompanyUser();


    if (!user) {

        redirectToLogin();

        return;
    }


    console.log(
        "Web3Jobs Company: Logged user:",
        user.email
    );


    /*
     * Load profile.
     */

    await loadCompanyProfile();


    /*
     * Verify company.
     */

    const isCompany =
        await verifyCompanyAccount();


    if (!isCompany) {

        /*
         * Do NOT redirect immediately.
         *
         * This allows us to see the actual
         * problem instead of getting a blank page.
         */

        return;
    }


    /*
     * Render company information.
     */

    renderCompanyInformation();


    /*
     * Load jobs.
     */

    await loadCompanyJobs();


    /*
     * Initialize forms/events.
     */

    initializeCompanyJobForm();

    initializeCompanyEvents();


    console.log(
        "========================================"
    );

    console.log(
        "Web3Jobs Company Dashboard initialized."
    );

    console.log(
        "========================================"
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


/* =========================================================
   END OF FILE
   ========================================================= */
