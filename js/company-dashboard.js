/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js
   Company Dashboard
   FINAL COMPANY VERSION
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
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Web3Jobs: Supabase library not loaded."
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
            "Web3Jobs Company: Supabase connected."
        );

        return companySupabase;

    } catch (error) {

        console.error(
            "Web3Jobs Company: Supabase initialization error:",
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
            data
        );

        return CompanyDashboard.profile;

    } catch (error) {

        console.error(
            "Web3Jobs Company: profile exception:",
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

        console.error(
            "Web3Jobs Company: No authenticated user."
        );

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
        "Web3Jobs Company: account_type =",
        accountType
    );

    if (accountType === "company") {

        return true;
    }

    console.error(
        "Web3Jobs Company: This is not a company account.",
        {
            profile,
            metadata: user.user_metadata,
            email: user.email
        }
    );

    showCompanyMessage(
        "هذا الحساب ليس حساب شركة.",
        "This is not a company account.",
        "error"
    );

    return false;
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
                .eq("created_by", user.id)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {

            console.error(
                "Web3Jobs Company: jobs error:",
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
            "Web3Jobs Company: load jobs exception:",
            error
        );

        return [];
    }
}


/* =========================================================
   RENDER INFORMATION
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

    const companyInput =
        document.querySelector(
            "#job-company"
        );

    if (
        companyInput &&
        !companyInput.value
    ) {

        companyInput.value =
            companyName;
    }
}


/* =========================================================
   RENDER JOBS
   ========================================================= */

function renderCompanyJobs() {

    const container =
        document.querySelector(
            "#company-jobs-list"
        );

    if (!container) {

        console.error(
            "Web3Jobs Company: #company-jobs-list not found."
        );

        return;
    }

    if (!CompanyDashboard.jobs.length) {

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
        CompanyDashboard.jobs
            .map(
                job => {

                    return `

                        <article
                            class="company-job-card"
                            data-job-id="${escapeHTML(job.id)}"
                        >

                            <div class="company-job-content">

                                <h3>
                                    ${escapeHTML(
                                        job.title ||
                                        "Untitled Job"
                                    )}
                                </h3>

                                <div class="company-job-meta">

                                    <span>
                                        📍
                                        ${escapeHTML(
                                            job.location ||
                                            "Remote"
                                        )}
                                    </span>

                                    <span>
                                        💼
                                        ${escapeHTML(
                                            job.type ||
                                            "Full Time"
                                        )}
                                    </span>

                                </div>

                                <p>
                                    ${escapeHTML(
                                        job.description ||
                                        ""
                                    )}
                                </p>

                            </div>

                            <div class="company-job-actions">

                                <button
                                    type="button"
                                    data-action="delete-job"
                                    data-job-id="${escapeHTML(job.id)}"
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
        CompanyDashboard.user ||
        await getCompanyUser();

    if (!client || !user) {

        showCompanyMessage(
            "انتهت جلسة تسجيل الدخول.",
            "Your login session has expired.",
            "error"
        );

        return null;
    }

    const title =
        String(
            jobData?.title || ""
        ).trim();

    if (!title) {

        showCompanyMessage(
            "اكتب اسم الوظيفة.",
            "Please enter the job title.",
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

                    title,

                    company:
                        jobData.company ||
                        CompanyDashboard.profile?.name ||
                        CompanyDashboard.profile?.full_name ||
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
                "Web3Jobs Company: create job error:",
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
            "Web3Jobs Company: create job exception:",
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
        CompanyDashboard.user ||
        await getCompanyUser();

    if (!client || !user || !jobId) {

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
                .eq("id", jobId)
                .eq("created_by", user.id);

        if (error) {

            console.error(
                "Web3Jobs Company: delete error:",
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

        return true;

    } catch (error) {

        console.error(
            "Web3Jobs Company: delete exception:",
            error
        );

        return false;
    }
}


/* =========================================================
   STATS
   ========================================================= */

function updateCompanyStats() {

    const total =
        CompanyDashboard.jobs.length;

    const totalElement =
        document.querySelector(
            "#total-jobs"
        );

    const activeElement =
        document.querySelector(
            "#active-jobs"
        );

    if (totalElement) {

        totalElement.textContent =
            total;
    }

    if (activeElement) {

        activeElement.textContent =
            total;
    }
}


/* =========================================================
   FORM
   ========================================================= */

function initializeCompanyJobForm() {

    const form =
        document.querySelector(
            "#create-job-form"
        );

    if (!form) {

        console.error(
            "Web3Jobs Company: create job form not found."
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
        async event => {

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

                renderCompanyInformation();
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
                        "#create-job-form"
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
   HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

                zIndex: "999999",

                maxWidth: "380px",

                padding: "15px 18px",

                borderRadius: "10px",

                fontSize: "14px",

                lineHeight: "1.6",

                boxShadow:
                    "0 8px 25px rgba(0,0,0,.2)"

            }
        );

        document.body.appendChild(
            box
        );
    }

    box.innerHTML =
        `
            <strong>
                ${escapeHTML(messageAr)}
            </strong>
            <br>
            ${escapeHTML(messageEn)}
        `;

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
        "========================================"
    );

    console.log(
        "Web3Jobs Company Dashboard starting..."
    );

    console.log(
        "Supabase:",
        COMPANY_SUPABASE_URL
    );

    console.log(
        "========================================"
    );


    const client =
        initializeCompanySupabase();

    if (!client) {

        showCompanyMessage(
            "تعذر تشغيل Supabase.",
            "Supabase could not be initialized.",
            "error"
        );

        return;
    }


    const user =
        await getCompanyUser();

    if (!user) {

        showCompanyMessage(
            "لا توجد جلسة تسجيل دخول.",
            "No active login session.",
            "error"
        );

        setTimeout(
            () => {

                window.location.href =
                    "login.html";

            },
            1800
        );

        return;
    }


    console.log(
        "Web3Jobs Company User:",
        user.email,
        user.id
    );


    const profile =
        await loadCompanyProfile();


    const isCompany =
        await verifyCompanyAccount();


    if (!isCompany) {

        /*
         * لا نقوم بإعادة التوجيه هنا.
         * حتى لا ندخل في حلقة Redirect.
         */

        return;
    }


    renderCompanyInformation();

    await loadCompanyJobs();

    initializeCompanyJobForm();

    initializeCompanyEvents();


    console.log(
        "Web3Jobs Company Dashboard READY."
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
