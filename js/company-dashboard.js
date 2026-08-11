/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js
   Company Dashboard
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const COMPANY_DASHBOARD_CONFIG = {
    jobsTable: "jobs",
    plansTable: "plans",
    paymentsTable: "payments",

    /* If your subscriptions table exists, this is used. */
    subscriptionsTable: "subscriptions",

    /*
     * Replace this with your real platform receiving address.
     * Do NOT use a private key here.
     */
    paymentWallet:
        window.WEB3JOBS_PAYMENT_WALLET ||
        "",

    blockchainNetwork: "BNB Chain",

    bscChainId: "0x38",

    bscChainName: "BNB Smart Chain",

    bscRpcUrl:
        "https://bsc-dataseed.binance.org/",

    bscExplorer:
        "https://bscscan.com/tx/",

    defaultCurrency: "USD",

    defaultDurationDays: 30
};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

const CompanyDashboard = {

    user: null,

    profile: null,

    jobs: [],

    plans: [],

    subscription: null,

    payments: [],

    loading: false,

    initialized: false,

    supabase: null

};


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getSupabaseClient() {

    /*
     * Supports the common setups already used in Web3Jobs.
     */

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {
        return window.supabaseClient;
    }

    if (
        window.supabase &&
        typeof window.supabase.from === "function"
    ) {
        return window.supabase;
    }

    /*
     * Some supabase.js files expose the client using
     * a different variable.
     */

    if (
        window._supabase &&
        typeof window._supabase.from === "function"
    ) {
        return window._supabase;
    }

    return null;
}


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}


function $all(selector) {
    return Array.from(
        document.querySelectorAll(selector)
    );
}


function getElement(id) {
    return document.getElementById(id);
}


/* =========================================================
   SAFE TEXT
   ========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
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
   NOTIFICATIONS
   ========================================================= */

function showMessage(
    message,
    type = "info"
) {

    let box =
        getElement("dashboard-message");

    if (!box) {

        box =
            document.createElement("div");

        box.id =
            "dashboard-message";

        box.style.position =
            "fixed";

        box.style.top =
            "85px";

        box.style.right =
            "20px";

        box.style.zIndex =
            "999999";

        box.style.maxWidth =
            "380px";

        box.style.padding =
            "14px 17px";

        box.style.borderRadius =
            "12px";

        box.style.fontSize =
            "13px";

        box.style.fontWeight =
            "700";

        box.style.boxShadow =
            "0 15px 40px rgba(0,0,0,.35)";

        document.body.appendChild(box);
    }

    const colors = {

        success: {
            background:
                "rgba(34,197,94,.12)",
            border:
                "rgba(34,197,94,.35)",
            color:
                "#86efac"
        },

        error: {
            background:
                "rgba(248,113,113,.12)",
            border:
                "rgba(248,113,113,.35)",
            color:
                "#fecaca"
        },

        warning: {
            background:
                "rgba(251,191,36,.12)",
            border:
                "rgba(251,191,36,.35)",
            color:
                "#fde68a"
        },

        info: {
            background:
                "rgba(96,165,250,.12)",
            border:
                "rgba(96,165,250,.35)",
            color:
                "#bfdbfe"
        }
    };

    const style =
        colors[type] ||
        colors.info;

    box.style.background =
        style.background;

    box.style.border =
        `1px solid ${style.border}`;

    box.style.color =
        style.color;

    box.textContent =
        message;

    box.style.display =
        "block";

    clearTimeout(
        box._timeout
    );

    box._timeout =
        setTimeout(() => {

            box.style.display =
                "none";

        }, 5000);
}


/* =========================================================
   LOADING
   ========================================================= */

function setLoading(visible) {

    const spinner =
        getElement("loading-spinner");

    if (!spinner) {
        return;
    }

    spinner.style.display =
        visible ? "flex" : "none";
}


/* =========================================================
   SHOW DASHBOARD
   ========================================================= */

function showDashboard() {

    const content =
        getElement("dashboard-content");

    if (content) {
        content.style.display =
            "block";
    }

    setLoading(false);
}


/* =========================================================
   HIDE DASHBOARD
   ========================================================= */

function hideDashboard() {

    const content =
        getElement("dashboard-content");

    if (content) {
        content.style.display =
            "none";
    }
}


/* =========================================================
   REDIRECT
   ========================================================= */

function redirectToLogin() {

    window.location.href =
        "login.html";
}


function redirectToHome() {

    window.location.href =
        "index.html";
}


/* =========================================================
   CURRENT USER
   ========================================================= */

async function getCurrentUser() {

    if (!CompanyDashboard.supabase) {
        throw new Error(
            "Supabase client is not initialized."
        );
    }

    const {
        data,
        error
    } =
        await CompanyDashboard
            .supabase
            .auth
            .getUser();

    if (error) {
        throw error;
    }

    return data?.user || null;
}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadCompanyProfile() {

    if (!CompanyDashboard.user) {
        return null;
    }

    const userId =
        CompanyDashboard.user.id;

    /*
     * First try company_profiles.
     */

    try {

        const {
            data,
            error
        } =
            await CompanyDashboard
                .supabase
                .from("company_profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

        if (!error && data) {

            CompanyDashboard.profile =
                data;

            return data;
        }

    } catch (error) {

        console.warn(
            "company_profiles lookup failed:",
            error
        );
    }


    /*
     * Some versions of Web3Jobs may use user_id.
     */

    try {

        const {
            data,
            error
        } =
            await CompanyDashboard
                .supabase
                .from("company_profiles")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle();

        if (!error && data) {

            CompanyDashboard.profile =
                data;

            return data;
        }

    } catch (error) {

        console.warn(
            "company_profiles user_id lookup failed:",
            error
        );
    }


    /*
     * Fallback to profiles.
     */

    try {

        const {
            data,
            error
        } =
            await CompanyDashboard
                .supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

        if (!error && data) {

            CompanyDashboard.profile =
                data;

            return data;
        }

    } catch (error) {

        console.warn(
            "profiles lookup failed:",
            error
        );
    }


    CompanyDashboard.profile = {
        id: userId,
        email:
            CompanyDashboard.user.email || ""
    };

    return CompanyDashboard.profile;
}


/* =========================================================
   ACCOUNT ROLE CHECK
   ========================================================= */

async function verifyCompanyAccount() {

    const profile =
        CompanyDashboard.profile;

    const metadata =
        CompanyDashboard.user?.user_metadata ||
        {};

    const role =
        String(
            profile?.role ||
            profile?.account_type ||
            profile?.user_type ||
            metadata?.role ||
            metadata?.account_type ||
            ""
        )
        .toLowerCase()
        .trim();

    /*
     * If explicitly individual, reject.
     */

    if (
        role === "individual" ||
        role === "jobseeker" ||
        role === "candidate"
    ) {

        showMessage(
            "This dashboard is available for company accounts only.",
            "error"
        );

        setTimeout(
            redirectToHome,
            1500
        );

        return false;
    }

    return true;
}


/* =========================================================
   WELCOME DATA
   ========================================================= */

function renderCompanyInformation() {

    const profile =
        CompanyDashboard.profile || {};

    const user =
        CompanyDashboard.user || {};

    const companyName =
        profile.company_name ||
        profile.name ||
        profile.company ||
        user.user_metadata?.company_name ||
        user.user_metadata?.name ||
        "Company";

    const email =
        profile.email ||
        user.email ||
        "";


    const companyNameElements = [

        getElement("company-name"),

        getElement("companyName"),

        getElement("dashboard-company-name"),

        getElement("welcome-company-name")

    ];

    companyNameElements
        .filter(Boolean)
        .forEach(element => {

            element.textContent =
                companyName;
        });


    const emailElements = [

        getElement("company-email"),

        getElement("companyEmail"),

        getElement("dashboard-company-email")

    ];

    emailElements
        .filter(Boolean)
        .forEach(element => {

            element.textContent =
                email;
        });


    const titleElements = [

        getElement("company-title"),

        getElement("brand-company-name")

    ];

    titleElements
        .filter(Boolean)
        .forEach(element => {

            element.textContent =
                companyName;
        });
}


/* =========================================================
   LOAD JOBS
   ========================================================= */

async function loadCompanyJobs() {

    if (!CompanyDashboard.user) {
        return [];
    }

    const userId =
        CompanyDashboard.user.id;

    const {
        data,
        error
    } =
        await CompanyDashboard
            .supabase
            .from(
                COMPANY_DASHBOARD_CONFIG.jobsTable
            )
            .select("*")
            .eq(
                "user_id",
                userId
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

        /*
         * Do not crash the whole dashboard.
         */

        CompanyDashboard.jobs = [];

        renderJobs([]);

        return [];
    }

    CompanyDashboard.jobs =
        data || [];

    renderJobs(
        CompanyDashboard.jobs
    );

    return CompanyDashboard.jobs;
}


/* =========================================================
   RENDER JOBS
   ========================================================= */

function renderJobs(jobs) {

    const containers = [

        getElement("company-jobs-list"),

        getElement("jobs-list"),

        getElement("my-jobs"),

        getElement("jobs-container")

    ].filter(Boolean);


    if (!containers.length) {
        return;
    }


    if (!jobs.length) {

        const emptyHtml = `
            <div class="empty-jobs">
                <div style="font-size:32px;margin-bottom:10px;">💼</div>
                <h3>No jobs published yet</h3>
                <p style="color:#9db0c8;margin-top:6px;">
                    Publish your first Web3 job to start receiving applications.
                </p>
            </div>
        `;

        containers.forEach(
            container => {

                container.innerHTML =
                    emptyHtml;

            }
        );

        return;
    }


    const html =
        jobs
            .map(job => {

                const title =
                    escapeHtml(
                        job.title ||
                        "Untitled Job"
                    );

                const company =
                    escapeHtml(
                        job.company ||
                        "Company"
                    );

                const location =
                    escapeHtml(
                        job.location ||
                        "Remote"
                    );

                const type =
                    escapeHtml(
                        job.type ||
                        "Full-time"
                    );

                const status =
                    String(
                        job.status ||
                        "active"
                    ).toLowerCase();

                const created =
                    formatDate(
                        job.created_at
                    );

                const jobId =
                    escapeHtml(
                        job.id
                    );


                return `
                    <article
                        class="company-job-card"
                        data-job-id="${jobId}"
                        style="
                            padding:18px;
                            margin-bottom:12px;
                            border:1px solid #1d3553;
                            border-radius:14px;
                            background:#09182a;
                        "
                    >

                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                gap:15px;
                                align-items:flex-start;
                            "
                        >

                            <div>

                                <h3
                                    style="
                                        font-size:17px;
                                        margin-bottom:6px;
                                    "
                                >
                                    ${title}
                                </h3>

                                <div
                                    style="
                                        color:#9db0c8;
                                        font-size:12px;
                                    "
                                >
                                    ${company}
                                    ·
                                    ${location}
                                    ·
                                    ${type}
                                </div>

                            </div>

                            <span
                                style="
                                    display:inline-flex;
                                    padding:5px 9px;
                                    border-radius:20px;
                                    font-size:10px;
                                    font-weight:700;
                                    background:${
                                        status === "active"
                                            ? "rgba(110,231,183,.1)"
                                            : "rgba(248,113,113,.1)"
                                    };
                                    color:${
                                        status === "active"
                                            ? "#6ee7b7"
                                            : "#f87171"
                                    };
                                "
                            >
                                ${escapeHtml(status)}
                            </span>

                        </div>


                        <div
                            style="
                                margin-top:15px;
                                color:#71869f;
                                font-size:11px;
                            "
                        >
                            Published:
                            ${created}
                        </div>


                        <div
                            style="
                                display:flex;
                                gap:8px;
                                flex-wrap:wrap;
                                margin-top:15px;
                            "
                        >

                            <button
                                type="button"
                                class="header-button"
                                onclick="viewJob('${jobId}')"
                            >
                                View
                            </button>

                            <button
                                type="button"
                                class="header-button"
                                onclick="editJob('${jobId}')"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="header-button logout-button"
                                onclick="deleteJob('${jobId}')"
                            >
                                Delete
                            </button>

                        </div>

                    </article>
                `;
            })
            .join("");


    containers.forEach(
        container => {

            container.innerHTML =
                html;

        }
    );
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
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
   STATS
   ========================================================= */

async function loadCompanyStats() {

    const jobs =
        CompanyDashboard.jobs || [];


    let applicationsCount = 0;


    /*
     * Count applications through jobs.
     */

    for (const job of jobs) {

        if (!job.id) {
            continue;
        }

        try {

            const {
                count,
                error
            } =
                await CompanyDashboard
                    .supabase
                    .from("applications")
                    .select(
                        "*",
                        {
                            count: "exact",
                            head: true
                        }
                    )
                    .eq(
                        "job_id",
                        job.id
                    );

            if (!error && count) {

                applicationsCount +=
                    Number(count);
            }

        } catch (error) {

            console.warn(
                "Application count failed:",
                error
            );
        }
    }


    const published =
        jobs.length;

    const active =
        jobs.filter(
            job =>
                String(
                    job.status ||
                    "active"
                ).toLowerCase() ===
                "active"
        ).length;


    setStatValue(
        [
            "published-jobs",
            "publishedJobs",
            "total-jobs",
            "jobs-count"
        ],
        published
    );


    setStatValue(
        [
            "total-applications",
            "totalApplications",
            "applications-count"
        ],
        applicationsCount
    );


    setStatValue(
        [
            "active-jobs",
            "activeJobs",
            "active-count"
        ],
        active
    );
}


function setStatValue(
    ids,
    value
) {

    ids.forEach(id => {

        const element =
            getElement(id);

        if (element) {

            element.textContent =
                String(value);
        }

    });
}


/* =========================================================
   LOAD PLANS
   ========================================================= */

async function loadPlans() {

    try {

        const {
            data,
            error
        } =
            await CompanyDashboard
                .supabase
                .from(
                    COMPANY_DASHBOARD_CONFIG.plansTable
                )
                .select("*")
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "price",
                    {
                        ascending: true
                    }
                );

        if (error) {

            console.warn(
                "Plans loading error:",
                error
            );

            CompanyDashboard.plans =
                [];

            return [];
        }

        CompanyDashboard.plans =
            data || [];

        renderPlans(
            CompanyDashboard.plans
        );

        return CompanyDashboard.plans;

    } catch (error) {

        console.error(
            error
        );

        return [];
    }
}


/* =========================================================
   RENDER PLANS
   ========================================================= */

function renderPlans(plans) {

    const containers = [

        getElement("plans-container"),

        getElement("subscription-plans"),

        getElement("plans-list")

    ].filter(Boolean);


    if (!containers.length) {
        return;
    }


    if (!plans.length) {

        containers.forEach(
            container => {

                container.innerHTML = `
                    <div
                        style="
                            color:#9db0c8;
                            padding:15px;
                        "
                    >
                        No active plans available.
                    </div>
                `;

            }
        );

        return;
    }


    const html =
        plans
            .map(plan => {

                const id =
                    escapeHtml(
                        plan.id
                    );

                const name =
                    escapeHtml(
                        plan.plan_name ||
                        plan.name ||
                        plan.plan_code ||
                        "Plan"
                    );

                const description =
                    escapeHtml(
                        plan.description ||
                        ""
                    );

                const price =
                    Number(
                        plan.price || 0
                    );

                const currency =
                    escapeHtml(
                        plan.currency ||
                        "USD"
                    );

                const days =
                    Number(
                        plan.duration_days ||
                        COMPANY_DASHBOARD_CONFIG.defaultDurationDays
                    );


                return `
                    <div
                        class="subscription-plan-card"
                        data-plan-id="${id}"
                        style="
                            padding:20px;
                            border:1px solid #294563;
                            border-radius:14px;
                            background:#09182a;
                        "
                    >

                        <h3>
                            ${name}
                        </h3>

                        <p
                            style="
                                color:#9db0c8;
                                font-size:12px;
                                margin:7px 0 15px;
                            "
                        >
                            ${description}
                        </p>

                        <div
                            style="
                                font-size:25px;
                                font-weight:900;
                            "
                        >
                            ${price}
                            <small
                                style="
                                    font-size:11px;
                                    color:#9db0c8;
                                "
                            >
                                ${currency}
                            </small>
                        </div>

                        <div
                            style="
                                color:#9db0c8;
                                font-size:11px;
                                margin:7px 0 15px;
                            "
                        >
                            ${days} days
                        </div>

                        <button
                            type="button"
                            class="header-button"
                            onclick="selectPlan('${id}')"
                        >
                            Choose Plan
                        </button>

                    </div>
                `;
            })
            .join("");


    containers.forEach(
        container => {

            container.innerHTML =
                html;

        }
    );
}


/* =========================================================
   LOAD SUBSCRIPTION
   ========================================================= */

async function loadSubscription() {

    if (!CompanyDashboard.user) {
        return null;
    }

    const userId =
        CompanyDashboard.user.id;


    try {

        const {
            data,
            error
        } =
            await CompanyDashboard
                .supabase
                .from(
                    COMPANY_DASHBOARD_CONFIG.subscriptionsTable
                )
                .select("*")
                .eq(
                    "user_id",
                    userId
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .limit(1)
                .maybeSingle();


        if (
            !error &&
            data
        ) {

            CompanyDashboard.subscription =
                data;

            renderSubscription(
                data
            );

            return data;
        }

    } catch (error) {

        console.warn(
            "Subscription lookup failed:",
            error
        );
    }


    CompanyDashboard.subscription =
        null;

    renderSubscription(
        null
    );

    return null;
}


/* =========================================================
   SUBSCRIPTION STATUS
   ========================================================= */

function getSubscriptionStatus(
    subscription
) {

    if (!subscription) {
        return "inactive";
    }

    const status =
        String(
            subscription.status ||
            ""
        ).toLowerCase();


    if (
        status === "active" ||
        status === "confirmed"
    ) {

        const endDate =
            subscription.end_date ||
            subscription.expires_at ||
            subscription.expiry_date;

        if (endDate) {

            const timestamp =
                new Date(
                    endDate
                ).getTime();

            if (
                !Number.isNaN(timestamp) &&
                timestamp < Date.now()
            ) {
                return "expired";
            }
        }

        return "active";
    }


    if (
        status === "pending"
    ) {
        return "pending";
    }


    if (
        status === "expired"
    ) {
        return "expired";
    }


    return status ||
        "inactive";
}


/* =========================================================
   ACTIVE SUBSCRIPTION
   ========================================================= */

function hasActiveSubscription() {

    return (
        getSubscriptionStatus(
            CompanyDashboard.subscription
        ) === "active"
    );
}


/* =========================================================
   RENDER SUBSCRIPTION
   ========================================================= */

function renderSubscription(
    subscription
) {

    const status =
        getSubscriptionStatus(
            subscription
        );


    const statusElements = [

        getElement("subscription-status"),

        getElement("plan-status"),

        getElement("subscriptionState")

    ].filter(Boolean);


    statusElements.forEach(
        element => {

            element.textContent =
                status
                    .charAt(0)
                    .toUpperCase() +
                status.slice(1);

        }
    );


    const planName =
        subscription?.plan_name ||
        subscription?.plan_code ||
        subscription?.plan ||
        "No active plan";


    const planElements = [

        getElement("current-plan"),

        getElement("plan-name"),

        getElement("subscription-plan")

    ].filter(Boolean);


    planElements.forEach(
        element => {

            element.textContent =
                planName;

        }
    );


    const endDate =
        subscription?.end_date ||
        subscription?.expires_at ||
        subscription?.expiry_date;


    const dateElements = [

        getElement("subscription-end"),

        getElement("subscription-expiry"),

        getElement("expiry-date")

    ].filter(Boolean);


    dateElements.forEach(
        element => {

            element.textContent =
                endDate
                    ? formatDate(endDate)
                    : "—";

        }
    );


    /*
     * Disable paid publish buttons if there is no active plan.
     */

    const publishButtons =
        $all(
            '[data-requires-subscription="true"]'
        );


    publishButtons.forEach(
        button => {

            button.disabled =
                !hasActiveSubscription();

        }
    );
}


/* =========================================================
   JOB FORM
   ========================================================= */

function getJobForm() {

    return (
        getElement("job-form") ||
        getElement("publish-job-form") ||
        $("form[data-job-form]")
    );
}


/* =========================================================
   READ FORM VALUE
   ========================================================= */

function getFormValue(
    form,
    names
) {

    for (
        const name of names
    ) {

        const field =
            form.elements[name] ||
            form.querySelector(
                `[name="${name}"]`
            ) ||
            getElement(name);

        if (
            field &&
            typeof field.value !== "undefined"
        ) {
            return field.value.trim();
        }
    }

    return "";
}


/* =========================================================
   PUBLISH JOB
   ========================================================= */

async function addJob(
    event
) {

    if (event) {
        event.preventDefault();
    }


    if (!CompanyDashboard.user) {

        showMessage(
            "Please log in first.",
            "error"
        );

        return;
    }


    /*
     * Paid posting protection.
     */

    if (
        !hasActiveSubscription()
    ) {

        showMessage(
            "An active company subscription is required before publishing jobs.",
            "warning"
        );

        scrollToSubscription();

        return;
    }


    const form =
        event?.target ||
        getJobForm();


    if (!form) {

        showMessage(
            "Job form was not found.",
            "error"
        );

        return;
    }


    const title =
        getFormValue(
            form,
            [
                "title",
                "job_title"
            ]
        );


    const company =
        getFormValue(
            form,
            [
                "company",
                "company_name"
            ]
        ) ||
        CompanyDashboard.profile?.company_name ||
        CompanyDashboard.profile?.name ||
        "Company";


    const location =
        getFormValue(
            form,
            [
                "location"
            ]
        );


    const type =
        getFormValue(
            form,
            [
                "type",
                "job_type"
            ]
        );


    const description =
        getFormValue(
            form,
            [
                "description",
                "job_description"
            ]
        );


    const applyLink =
        getFormValue(
            form,
            [
                "apply_link",
                "apply_url",
                "application_url",
                "url"
            ]
        );


    if (!title) {

        showMessage(
            "Job title is required.",
            "error"
        );

        return;
    }


    if (!description) {

        showMessage(
            "Job description is required.",
            "error"
        );

        return;
    }


    if (!location) {

        showMessage(
            "Location is required.",
            "error"
        );

        return;
    }


    const payload = {

        user_id:
            CompanyDashboard.user.id,

        title,

        company,

        location,

        type:
            type ||
            "Full-time",

        description,

        apply_link:
            applyLink || null,

        status:
            "active"

    };


    setFormSubmitting(
        form,
        true
    );


    try {

        const {
            data,
            error
        } =
            await CompanyDashboard
                .supabase
                .from(
                    COMPANY_DASHBOARD_CONFIG.jobsTable
                )
                .insert(
                    payload
                )
                .select()
                .single();


        if (error) {

            console.error(
                "Publish job error:",
                error
            );

            /*
             * If the current jobs table does not have
             * status/apply_link columns, retry with
             * the basic schema used by earlier Web3Jobs.
             */

            if (
                error.message &&
                (
                    error.message.includes(
                        "status"
                    ) ||
                    error.message.includes(
                        "apply_link"
                    )
                )
            ) {

                const fallbackPayload = {

                    user_id:
                        CompanyDashboard.user.id,

                    title,

                    company,

                    location,

                    type:
                        type ||
                        "Full-time",

                    description

                };


                const retry =
                    await CompanyDashboard
                        .supabase
                        .from(
                            COMPANY_DASHBOARD_CONFIG.jobsTable
                        )
                        .insert(
                            fallbackPayload
                        )
                        .select()
                        .single();


                if (retry.error) {
                    throw retry.error;
                }

            } else {

                throw error;
            }
        }


        showMessage(
            "Job published successfully.",
            "success"
        );


        form.reset();


        await loadCompanyJobs();

        await loadCompanyStats();

    } catch (error) {

        console.error(
            error
        );

        showMessage(
            error.message ||
            "Unable to publish the job.",
            "error"
        );

    } finally {

        setFormSubmitting(
            form,
            false
        );
    }
}


/* =========================================================
   FORM SUBMIT STATE
   ========================================================= */

function setFormSubmitting(
    form,
    submitting
) {

    if (!form) {
        return;
    }

    const buttons =
        form.querySelectorAll(
            'button[type="submit"], input[type="submit"]'
        );


    buttons.forEach(button => {

        if (!button.dataset.originalText) {

            button.dataset.originalText =
                button.textContent;

        }


        button.disabled =
            submitting;


        if (
            submitting &&
            button.tagName === "BUTTON"
        ) {

            button.textContent =
                "Publishing...";

        } else if (
            !submitting &&
            button.tagName === "BUTTON"
        ) {

            button.textContent =
                button.dataset.originalText;

        }

    });
}


/* =========================================================
   EDIT JOB
   ========================================================= */

async function editJob(
    jobId
) {

    const job =
        CompanyDashboard.jobs.find(
            item =>
                String(item.id) ===
                String(jobId)
        );


    if (!job) {

        showMessage(
            "Job not found.",
            "error"
        );

        return;
    }


    const title =
        window.prompt(
            "Job title:",
            job.title || ""
        );


    if (
        title === null
    ) {
        return;
    }


    const location =
        window.prompt(
            "Location:",
            job.location || ""
        );


    if (
        location === null
    ) {
        return;
    }


    const description =
        window.prompt(
            "Job description:",
            job.description || ""
        );


    if (
        description === null
    ) {
        return;
    }


    try {

        const {
            error
        } =
            await CompanyDashboard
                .supabase
                .from(
                    COMPANY_DASHBOARD_CONFIG.jobsTable
                )
                .update({

                    title:
                        title.trim(),

                    location:
                        location.trim(),

                    description:
                        description.trim(),

                    updated_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    jobId
                )
                .eq(
                    "user_id",
                    CompanyDashboard.user.id
                );


        if (error) {
            throw error;
        }


        showMessage(
            "Job updated successfully.",
            "success"
        );


        await loadCompanyJobs();

    } catch (error) {

        console.error(
            error
        );

        showMessage(
            error.message ||
            "Unable to update the job.",
            "error"
        );
    }
}


/* =========================================================
   DELETE JOB
   ========================================================= */

async function deleteJob(
    jobId
) {

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
            await CompanyDashboard
                .supabase
                .from(
                    COMPANY_DASHBOARD_CONFIG.jobsTable
                )
                .delete()
                .eq(
                    "id",
                    jobId
                )
                .eq(
                    "user_id",
                    CompanyDashboard.user.id
                );


        if (error) {
            throw error;
        }


        showMessage(
            "Job deleted successfully.",
            "success"
        );


        await loadCompanyJobs();

        await loadCompanyStats();

    } catch (error) {

        console.error(
            error
        );

        showMessage(
            error.message ||
            "Unable to delete the job.",
            "error"
        );
    }
}


/* =========================================================
   VIEW JOB
   ========================================================= */

function viewJob(
    jobId
) {

    const job =
        CompanyDashboard.jobs.find(
            item =>
                String(item.id) ===
                String(jobId)
        );


    if (!job) {
        return;
    }


    /*
     * Use a standard job details page if it exists.
     */

    const url =
        `job-details.html?id=${encodeURIComponent(jobId)}`;


    window.location.href =
        url;
}


/* =========================================================
   SELECT PLAN
   ========================================================= */

function selectPlan(
    planId
) {

    const plan =
        CompanyDashboard.plans.find(
            item =>
                String(item.id) ===
                String(planId)
        );


    if (!plan) {

        showMessage(
            "Plan not found.",
            "error"
        );

        return;
    }


    /*
     * Store the selected plan temporarily.
     */

    sessionStorage.setItem(
        "web3jobs_selected_plan",
        JSON.stringify(plan)
    );


    /*
     * If a dedicated payment page exists,
     * use it.
     */

    if (
        window.location.pathname.includes(
            "company-dashboard"
        )
    ) {

        const paymentPage =
            "subscription.html";

        window.location.href =
            `${paymentPage}?plan=${encodeURIComponent(plan.id)}`;

        return;
    }


    showMessage(
        `Selected plan: ${
            plan.plan_name ||
            plan.plan_code ||
            "Plan"
        }`,
        "success"
    );
}


/* =========================================================
   SCROLL TO SUBSCRIPTION
   ========================================================= */

function scrollToSubscription() {

    const section =
        getElement(
            "subscription-section"
        ) ||
        $(".subscription-section");


    if (section) {

        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


/* =========================================================
   WALLET CONNECTION
   ========================================================= */

async function connectWallet() {

    if (
        typeof window.ethereum ===
        "undefined"
    ) {

        showMessage(
            "No Web3 wallet was detected. Install MetaMask or use a compatible wallet.",
            "error"
        );

        return null;
    }


    if (
        typeof ethers ===
        "undefined"
    ) {

        showMessage(
            "Ethers library is not loaded.",
            "error"
        );

        return null;
    }


    try {

        const provider =
            new ethers.BrowserProvider(
                window.ethereum
            );


        await provider.send(
            "eth_requestAccounts",
            []
        );


        const network =
            await provider.getNetwork();


        if (
            network.chainId !==
            56n
        ) {

            try {

                await window.ethereum.request({

                    method:
                        "wallet_switchEthereumChain",

                    params: [
                        {
                            chainId:
                                COMPANY_DASHBOARD_CONFIG
                                    .bscChainId
                        }
                    ]

                });

            } catch (switchError) {

                /*
                 * BSC was not added to the wallet.
                 */

                if (
                    switchError.code ===
                    4902
                ) {

                    await window.ethereum.request({

                        method:
                            "wallet_addEthereumChain",

                        params: [

                            {
                                chainId:
                                    COMPANY_DASHBOARD_CONFIG
                                        .bscChainId,

                                chainName:
                                    COMPANY_DASHBOARD_CONFIG
                                        .bscChainName,

                                nativeCurrency: {

                                    name:
                                        "BNB",

                                    symbol:
                                        "BNB",

                                    decimals:
                                        18
                                },

                                rpcUrls: [

                                    COMPANY_DASHBOARD_CONFIG
                                        .bscRpcUrl

                                ],

                                blockExplorerUrls: [

                                    "https://bscscan.com"

                                ]
                            }

                        ]
                    });

                } else {

                    throw switchError;
                }
            }
        }


        const signer =
            await provider.getSigner();


        const address =
            await signer.getAddress();


        renderWalletAddress(
            address
        );


        showMessage(
            "BNB Chain wallet connected.",
            "success"
        );


        return {

            provider,

            signer,

            address

        };

    } catch (error) {

        console.error(
            "Wallet connection error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to connect wallet.",
            "error"
        );

        return null;
    }
}


/* =========================================================
   WALLET ADDRESS UI
   ========================================================= */

function renderWalletAddress(
    address
) {

    const elements = [

        getElement("wallet-address"),

        getElement("walletAddress"),

        getElement("connected-wallet")

    ].filter(Boolean);


    const shortAddress =
        address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : "Not connected";


    elements.forEach(
        element => {

            element.textContent =
                shortAddress;

            if (address) {

                element.title =
                    address;
            }

        }
    );
}


/* =========================================================
   PREPARE BNB PAYMENT
   ========================================================= */

async function payWithBNB(
    planId
) {

    const plan =
        CompanyDashboard.plans.find(
            item =>
                String(item.id) ===
                String(planId)
        );


    if (!plan) {

        showMessage(
            "Plan not found.",
            "error"
        );

        return null;
    }


    if (
        !COMPANY_DASHBOARD_CONFIG.paymentWallet
    ) {

        showMessage(
            "The platform payment wallet has not been configured yet.",
            "error"
        );

        return null;
    }


    const wallet =
        await connectWallet();


    if (!wallet) {
        return null;
    }


    try {

        const usdPrice =
            Number(
                plan.price || 0
            );


        if (
            !Number.isFinite(
                usdPrice
            ) ||
            usdPrice <= 0
        ) {

            throw new Error(
                "Invalid plan price."
            );
        }


        /*
         * IMPORTANT:
         *
         * USD -> BNB conversion must be calculated
         * using a trusted server/oracle in production.
         *
         * This client-side function intentionally does not
         * invent an exchange rate.
         */

        const bnbAmountInput =
            window.prompt(
                `Enter the exact BNB amount required for the ${plan.plan_name || plan.plan_code} plan.`
            );


        if (
            bnbAmountInput === null
        ) {
            return null;
        }


        const bnbAmount =
            bnbAmountInput.trim();


        if (
            !bnbAmount ||
            !Number.isFinite(
                Number(bnbAmount)
            ) ||
            Number(bnbAmount) <= 0
        ) {

            throw new Error(
                "Invalid BNB amount."
            );
        }


        const value =
            ethers.parseEther(
                bnbAmount
            );


        showMessage(
            "Waiting for wallet confirmation...",
            "info"
        );


        const transaction =
            await wallet.signer.sendTransaction({

                to:
                    COMPANY_DASHBOARD_CONFIG
                        .paymentWallet,

                value

            });


        /*
         * Save payment as pending.
         *
         * The backend/server should later verify the
         * transaction on BNB Chain before activating
         * the subscription.
         */

        const paymentPayload = {

            user_id:
                CompanyDashboard.user.id,

            payment_provider:
                "BNB Chain",

            payment_method:
                "BNB",

            payment_type:
                "subscription",

            amount:
                Number(bnbAmount),

            currency:
                "BNB",

            status:
                "pending",

            provider_payment_id:
                null,

            transaction_hash:
                transaction.hash,

            blockchain_network:
                "BNB Chain"

        };


        const {
            data,
            error
        } =
            await CompanyDashboard
                .supabase
                .from(
                    COMPANY_DASHBOARD_CONFIG
                        .paymentsTable
                )
                .insert(
                    paymentPayload
                )
                .select()
                .single();


        if (error) {

            console.error(
                "Payment record error:",
                error
            );

            showMessage(
                "The blockchain transaction was sent, but the payment record could not be saved. Keep your transaction hash.",
                "warning"
            );

            return {

                transactionHash:
                    transaction.hash,

                payment:
                    null

            };
        }


        showMessage(
            "Payment submitted. Waiting for blockchain confirmation.",
            "success"
        );


        return {

            transactionHash:
                transaction.hash,

            payment:
                data
        };

    } catch (error) {

        console.error(
            "BNB payment error:",
            error
        );

        showMessage(
            error.message ||
            "BNB payment failed.",
            "error"
        );

        return null;
    }
}


/* =========================================================
   TRANSACTION LINK
   ========================================================= */

function getTransactionUrl(
    hash
) {

    if (!hash) {
        return "#";
    }

    return (
        COMPANY_DASHBOARD_CONFIG
            .bscExplorer +
        encodeURIComponent(hash)
    );
}


/* =========================================================
   COPY WALLET
   ========================================================= */

async function copyWalletAddress(
    address
) {

    if (!address) {
        return;
    }

    try {

        await navigator.clipboard.writeText(
            address
        );

        showMessage(
            "Wallet address copied.",
            "success"
        );

    } catch (error) {

        showMessage(
            "Unable to copy wallet address.",
            "error"
        );
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutCompany() {

    try {

        if (
            CompanyDashboard.supabase
        ) {

            const {
                error
            } =
                await CompanyDashboard
                    .supabase
                    .auth
                    .signOut();

            if (error) {
                throw error;
            }
        }


        sessionStorage.removeItem(
            "web3jobs_selected_plan"
        );


        window.location.href =
            "login.html";

    } catch (error) {

        console.error(
            error
        );

        showMessage(
            error.message ||
            "Unable to log out.",
            "error"
        );
    }
}


/* =========================================================
   EVENT BINDING
   ========================================================= */

function bindEvents() {

    /*
     * Job form.
     */

    const jobForm =
        getJobForm();

    if (jobForm) {

        jobForm.addEventListener(
            "submit",
            addJob
        );
    }


    /*
     * Logout buttons.
     */

    const logoutButtons =
        $all(
            "#logout-button, .logout-button[data-action='logout'], [data-action='logout']"
        );


    logoutButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    logoutCompany();

                }
            );

        }
    );


    /*
     * Connect wallet buttons.
     */

    const walletButtons =
        $all(
            "#connect-wallet, #connectWallet, [data-action='connect-wallet']"
        );


    walletButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    connectWallet();

                }
            );
        }
    );


    /*
     * Explicit BNB payment buttons.
     */

    const paymentButtons =
        $all(
            "[data-pay-bnb]"
        );


    paymentButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();

                    const planId =
                        button.dataset.payBnb;

                    await payWithBNB(
                        planId
                    );

                }
            );
        }
    );


    /*
     * Wallet changes.
     */

    if (
        window.ethereum &&
        typeof window.ethereum.on ===
        "function"
    ) {

        window.ethereum.on(
            "accountsChanged",
            accounts => {

                if (
                    accounts &&
                    accounts.length
                ) {

                    renderWalletAddress(
                        accounts[0]
                    );

                } else {

                    renderWalletAddress(
                        ""
                    );
                }
            }
        );


        window.ethereum.on(
            "chainChanged",
            () => {

                /*
                 * Reload to ensure all provider state
                 * is synchronized.
                 */

                window.location.reload();

            }
        );
    }
}


/* =========================================================
   INIT
   ========================================================= */

async function initCompanyDashboard() {

    if (
        CompanyDashboard.initialized
    ) {
        return;
    }


    CompanyDashboard.initialized =
        true;

    CompanyDashboard.loading =
        true;


    setLoading(true);


    try {

        CompanyDashboard.supabase =
            getSupabaseClient();


        if (
            !CompanyDashboard.supabase
        ) {

            throw new Error(
                "Supabase connection is not initialized. Check js/supabase.js."
            );
        }


        CompanyDashboard.user =
            await getCurrentUser();


        if (
            !CompanyDashboard.user
        ) {

            redirectToLogin();

            return;
        }


        await loadCompanyProfile();


        const validCompany =
            await verifyCompanyAccount();


        if (!validCompany) {
            return;
        }


        renderCompanyInformation();


        /*
         * Load dashboard data.
         */

        await Promise.allSettled([

            loadCompanyJobs(),

            loadPlans(),

            loadSubscription()

        ]);


        await loadCompanyStats();


        bindEvents();


        showDashboard();


    } catch (error) {

        console.error(
            "Company Dashboard initialization error:",
            error
        );


        hideDashboard();

        setLoading(false);


        showMessage(
            error.message ||
            "Unable to load the company dashboard.",
            "error"
        );


        /*
         * Give the user a chance to see the message.
         */

        setTimeout(
            () => {

                if (
                    !CompanyDashboard.user
                ) {

                    redirectToLogin();
                }

            },
            2000
        );

    } finally {

        CompanyDashboard.loading =
            false;
    }
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.CompanyDashboard =
    CompanyDashboard;

window.initCompanyDashboard =
    initCompanyDashboard;

window.addJob =
    addJob;

window.editJob =
    editJob;

window.deleteJob =
    deleteJob;

window.viewJob =
    viewJob;

window.selectPlan =
    selectPlan;

window.connectWallet =
    connectWallet;

window.payWithBNB =
    payWithBNB;

window.logoutCompany =
    logoutCompany;

window.copyWalletAddress =
    copyWalletAddress;

window.hasActiveSubscription =
    hasActiveSubscription;


/* =========================================================
   AUTO START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initCompanyDashboard
    );

} else {

    initCompanyDashboard();
        }
