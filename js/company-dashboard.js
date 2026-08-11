"use strict";

/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js
   Company Dashboard
   ========================================================= */

/*
    This file expects:

    - js/supabase.js
    - js/auth.js
    - Supabase JS v2

    Main account source:
    public.profiles.account_type

    Company account:
    account_type = "company"
*/


/* =========================================================
   GLOBAL STATE
   ========================================================= */

const CompanyDashboard = {

    user: null,
    profile: null,
    companyProfile: null,
    jobs: [],
    applications: [],
    initialized: false

};


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


/* =========================================================
   SAFE TEXT
   ========================================================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {
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
   SUPABASE CLIENT
   ========================================================= */

function getSupabaseClient() {

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

    console.error(
        "Supabase client is not available."
    );

    return null;

}


/* =========================================================
   LOADING
   ========================================================= */

function showLoading(message) {

    const spinner =
        $("#loading-spinner");

    if (!spinner) {
        return;
    }

    spinner.style.display = "flex";

    const paragraph =
        spinner.querySelector("p");

    if (paragraph && message) {
        paragraph.textContent = message;
    }

}


function hideLoading() {

    const spinner =
        $("#loading-spinner");

    if (!spinner) {
        return;
    }

    spinner.style.display = "none";

}


function showDashboard() {

    const content =
        $("#dashboard-content");

    if (!content) {
        return;
    }

    content.style.display = "block";

}


/* =========================================================
   ERROR SCREEN
   ========================================================= */

function showDashboardError(message) {

    hideLoading();

    const content =
        $("#dashboard-content");

    if (!content) {
        return;
    }

    content.style.display = "block";

    let errorBox =
        $("#dashboard-error");

    if (!errorBox) {

        errorBox =
            document.createElement("div");

        errorBox.id =
            "dashboard-error";

        errorBox.style.cssText = `
            max-width: 720px;
            margin: 60px auto;
            padding: 28px;
            border: 1px solid rgba(248,113,113,.35);
            border-radius: 16px;
            background: rgba(248,113,113,.06);
            color: #f5f8ff;
            text-align: center;
            font-family: Inter, system-ui, sans-serif;
        `;

        content.prepend(errorBox);

    }

    errorBox.innerHTML = `
        <div style="
            font-size:36px;
            margin-bottom:14px;
        ">!</div>

        <h2 style="
            margin-bottom:10px;
            font-size:22px;
        ">
            Unable to load company dashboard
        </h2>

        <p style="
            color:#9db0c8;
            margin-bottom:20px;
            line-height:1.7;
        ">
            ${escapeHtml(message)}
        </p>

        <button
            type="button"
            id="dashboard-retry-button"
            style="
                border:1px solid #294563;
                border-radius:10px;
                padding:11px 18px;
                background:#10233a;
                color:#f5f8ff;
                cursor:pointer;
                font-weight:700;
            "
        >
            Try Again
        </button>
    `;

    const retry =
        $("#dashboard-retry-button");

    if (retry) {

        retry.addEventListener(
            "click",
            () => {
                initializeCompanyDashboard();
            }
        );

    }

}


/* =========================================================
   AUTH SESSION
   ========================================================= */

async function getCurrentUser() {

    const client =
        getSupabaseClient();

    if (!client) {
        throw new Error(
            "Supabase connection is not initialized."
        );
    }

    const {
        data,
        error
    } = await client.auth.getSession();

    if (error) {
        throw error;
    }

    if (
        !data ||
        !data.session ||
        !data.session.user
    ) {
        return null;
    }

    return data.session.user;

}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile(userId) {

    const client =
        getSupabaseClient();

    if (!client) {
        throw new Error(
            "Supabase connection is not initialized."
        );
    }

    const result =
        await client
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

    if (result.error) {
        throw result.error;
    }

    return result.data || null;

}


/* =========================================================
   PROFILE BY EMAIL FALLBACK
   ========================================================= */

async function loadProfileByEmail(email) {

    const client =
        getSupabaseClient();

    if (!client || !email) {
        return null;
    }

    const result =
        await client
            .from("profiles")
            .select("*")
            .eq("email", email)
            .maybeSingle();

    if (result.error) {

        console.warn(
            "Profile email lookup failed:",
            result.error
        );

        return null;

    }

    return result.data || null;

}


/* =========================================================
   COMPANY PROFILE
   ========================================================= */

async function loadCompanyProfile(userId) {

    const client =
        getSupabaseClient();

    if (!client) {
        return null;
    }

    /*
        company_profiles may not exist in every database
        version, so failure here must not block dashboard.
    */

    try {

        const result =
            await client
                .from("company_profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

        if (result.error) {

            console.warn(
                "company_profiles lookup:",
                result.error
            );

            return null;

        }

        return result.data || null;

    } catch (error) {

        console.warn(
            "Company profile lookup failed:",
            error
        );

        return null;

    }

}


/* =========================================================
   ACCOUNT TYPE
   ========================================================= */

function normalizeAccountType(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase();

}


async function getCompanyAccount(user) {

    if (!user) {
        return null;
    }

    let profile =
        await loadProfile(user.id);

    /*
        Fallback to email when the profile ID does not
        match the Auth user ID.
    */

    if (!profile && user.email) {

        profile =
            await loadProfileByEmail(
                user.email
            );

    }

    /*
        Metadata fallback.
    */

    const metadata =
        user.user_metadata || {};

    const accountType =
        normalizeAccountType(
            profile?.account_type ||
            profile?.role ||
            metadata.account_type ||
            metadata.accountType ||
            metadata.role
        );

    if (accountType !== "company") {

        return {
            isCompany: false,
            profile: profile,
            accountType: accountType
        };

    }

    return {

        isCompany: true,

        profile: profile,

        accountType: "company"

    };

}


/* =========================================================
   COMPANY NAME
   ========================================================= */

function getCompanyName() {

    const profile =
        CompanyDashboard.profile || {};

    const companyProfile =
        CompanyDashboard.companyProfile || {};

    const user =
        CompanyDashboard.user || {};

    return (
        companyProfile.company_name ||
        companyProfile.name ||
        companyProfile.companyName ||
        profile.company_name ||
        profile.company ||
        profile.name ||
        user.user_metadata?.company_name ||
        user.user_metadata?.companyName ||
        user.user_metadata?.name ||
        "Company"
    );

}


/* =========================================================
   UPDATE HEADER / WELCOME
   ========================================================= */

function updateCompanyIdentity() {

    const user =
        CompanyDashboard.user || {};

    const profile =
        CompanyDashboard.profile || {};

    const companyName =
        getCompanyName();

    const email =
        user.email ||
        profile.email ||
        "";

    const companyNameElements = [
        "#company-name",
        "#company-title",
        "[data-company-name]"
    ];

    companyNameElements.forEach(
        selector => {

            $all(selector).forEach(
                element => {

                    element.textContent =
                        companyName;

                }
            );

        }
    );


    const emailElement =
        $("#company-email");

    if (emailElement) {
        emailElement.textContent =
            email;
    }


    const welcomeTitle =
        $("#welcome-title");

    if (welcomeTitle) {

        welcomeTitle.textContent =
            `Welcome, ${companyName}`;

    }


    const profileName =
        $("#profile-company-name");

    if (profileName) {
        profileName.textContent =
            companyName;
    }

}


/* =========================================================
   JOBS
   ========================================================= */

async function loadCompanyJobs() {

    const client =
        getSupabaseClient();

    if (!client) {
        return [];
    }

    /*
        The current jobs table used by the project has
        columns such as:

        id
        title
        company
        location
        type
        description
        skills
        salary
        application_url
        company_name
        created_at

        Older versions may not contain user_id/company_id.
        Therefore we first load the jobs table and then
        filter safely when ownership information exists.
    */

    const result =
        await client
            .from("jobs")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

    if (result.error) {

        console.error(
            "Jobs loading error:",
            result.error
        );

        return [];

    }

    const jobs =
        Array.isArray(result.data)
            ? result.data
            : [];

    const user =
        CompanyDashboard.user || {};

    const profile =
        CompanyDashboard.profile || {};

    const companyName =
        getCompanyName();


    /*
        If the table contains a direct owner column,
        use it.
    */

    const ownerColumns = [
        "user_id",
        "company_id",
        "created_by",
        "owner_id"
    ];

    const hasOwnerColumn =
        jobs.some(job =>
            ownerColumns.some(
                column =>
                    Object.prototype.hasOwnProperty.call(
                        job,
                        column
                    )
            )
        );


    if (hasOwnerColumn) {

        const ownedJobs =
            jobs.filter(job => {

                return ownerColumns.some(
                    column => {

                        const value =
                            job[column];

                        if (!value) {
                            return false;
                        }

                        return (
                            String(value) ===
                            String(user.id)
                        );

                    }
                );

            });

        return ownedJobs;

    }


    /*
        Compatibility with the existing jobs schema:
        use company name when there is no owner column.
    */

    const companyFields = [
        "company",
        "company_name",
        "companyName"
    ];

    const matchingJobs =
        jobs.filter(job => {

            return companyFields.some(
                field => {

                    const value =
                        job[field];

                    if (!value) {
                        return false;
                    }

                    return (
                        String(value)
                            .trim()
                            .toLowerCase() ===
                        String(companyName)
                            .trim()
                            .toLowerCase()
                    );

                }
            );

        });


    /*
        If no company-name match exists, do not display
        another company's jobs.
    */

    return matchingJobs;

}


/* =========================================================
   APPLICATIONS
   ========================================================= */

async function loadCompanyApplications() {

    const client =
        getSupabaseClient();

    if (!client) {
        return [];
    }

    const jobs =
        CompanyDashboard.jobs || [];

    if (!jobs.length) {
        return [];
    }

    const jobIds =
        jobs
            .map(job => job.id)
            .filter(Boolean);

    if (!jobIds.length) {
        return [];
    }

    try {

        const result =
            await client
                .from("applications")
                .select("*")
                .in(
                    "job_id",
                    jobIds
                );

        if (result.error) {

            console.warn(
                "Applications loading error:",
                result.error
            );

            return [];

        }

        return Array.isArray(result.data)
            ? result.data
            : [];

    } catch (error) {

        console.warn(
            "Applications request failed:",
            error
        );

        return [];

    }

}


/* =========================================================
   UPDATE STATS
   ========================================================= */

function updateStats() {

    const jobs =
        CompanyDashboard.jobs || [];

    const applications =
        CompanyDashboard.applications || [];

    const activeJobs =
        jobs.filter(job => {

            const status =
                String(
                    job.status || "active"
                )
                    .trim()
                    .toLowerCase();

            return (
                status !== "closed" &&
                status !== "inactive" &&
                status !== "expired"
            );

        });


    const values = {

        jobs: jobs.length,

        applications:
            applications.length,

        active:
            activeJobs.length

    };


    const selectors = {

        jobs: [
            "#published-jobs",
            "#jobs-count",
            "#total-jobs",
            "[data-stat='jobs']"
        ],

        applications: [
            "#total-applications",
            "#applications-count",
            "[data-stat='applications']"
        ],

        active: [
            "#active-jobs",
            "#active-jobs-count",
            "[data-stat='active-jobs']"
        ]

    };


    Object.keys(values).forEach(
        key => {

            selectors[key].forEach(
                selector => {

                    $all(selector).forEach(
                        element => {

                            element.textContent =
                                values[key];

                        }
                    );

                }
            );

        }
    );

}


/* =========================================================
   RENDER JOBS
   ========================================================= */

function renderJobs() {

    const jobs =
        CompanyDashboard.jobs || [];


    const containers = [
        "#company-jobs-list",
        "#jobs-list",
        "#my-jobs",
        "[data-company-jobs]"
    ];


    let container = null;

    for (
        const selector of containers
    ) {

        container =
            $(selector);

        if (container) {
            break;
        }

    }


    if (!container) {
        return;
    }


    if (!jobs.length) {

        container.innerHTML = `
            <div style="
                padding:30px;
                text-align:center;
                border:1px dashed #294563;
                border-radius:12px;
                color:#9db0c8;
            ">
                <div style="
                    font-size:30px;
                    margin-bottom:10px;
                ">
                    💼
                </div>

                <strong style="
                    display:block;
                    color:#f5f8ff;
                    margin-bottom:6px;
                ">
                    No jobs published yet
                </strong>

                <span>
                    Publish your first Web3 job to start receiving applications.
                </span>
            </div>
        `;

        return;

    }


    container.innerHTML =
        jobs.map(job => {

            const title =
                escapeHtml(
                    job.title ||
                    "Untitled Job"
                );

            const company =
                escapeHtml(
                    job.company ||
                    job.company_name ||
                    getCompanyName()
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

            const created =
                job.created_at
                    ? new Date(
                        job.created_at
                    ).toLocaleDateString(
                        "en-US",
                        {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        }
                    )
                    : "";


            return `
                <article
                    class="company-job-card"
                    data-job-id="${escapeHtml(job.id)}"
                    style="
                        padding:18px;
                        margin-bottom:12px;
                        border:1px solid #1d3553;
                        border-radius:14px;
                        background:#0b192b;
                    "
                >

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        gap:15px;
                        align-items:flex-start;
                    ">

                        <div style="
                            min-width:0;
                        ">

                            <h3 style="
                                margin-bottom:5px;
                                font-size:17px;
                            ">
                                ${title}
                            </h3>

                            <div style="
                                color:#9db0c8;
                                font-size:12px;
                            ">
                                ${company}
                                ·
                                ${location}
                                ·
                                ${type}
                            </div>

                        </div>

                        <span style="
                            padding:5px 9px;
                            border:1px solid rgba(110,231,183,.25);
                            border-radius:20px;
                            color:#6ee7b7;
                            background:rgba(110,231,183,.06);
                            font-size:10px;
                            white-space:nowrap;
                        ">
                            Active
                        </span>

                    </div>

                    ${
                        created
                            ? `
                                <div style="
                                    margin-top:12px;
                                    color:#71859d;
                                    font-size:10px;
                                ">
                                    Published ${created}
                                </div>
                            `
                            : ""
                    }

                </article>
            `;

        }).join("");

}


/* =========================================================
   PUBLISH JOB
   ========================================================= */

async function publishJob(form) {

    const client =
        getSupabaseClient();

    if (!client) {

        alert(
            "Supabase connection is not initialized."
        );

        return;

    }


    const user =
        CompanyDashboard.user;

    if (!user) {

        alert(
            "Your session has expired. Please log in again."
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
            getCompanyName() ||
            ""
        ).trim();

    const location =
        String(
            formData.get("location") ||
            ""
        ).trim();

    const type =
        String(
            formData.get("type") ||
            ""
        ).trim();

    const description =
        String(
            formData.get("description") ||
            ""
        ).trim();

    const skills =
        String(
            formData.get("skills") ||
            ""
        ).trim();

    const salary =
        String(
            formData.get("salary") ||
            ""
        ).trim();

    const applicationUrl =
        String(
            formData.get("application_url") ||
            formData.get("apply_link") ||
            ""
        ).trim();


    if (!title) {

        alert(
            "Please enter a job title."
        );

        return;

    }


    if (!description) {

        alert(
            "Please enter a job description."
        );

        return;

    }


    const jobData = {

        title: title,

        company:
            company || getCompanyName(),

        location:
            location || "Remote",

        type:
            type || "Full-time",

        description:
            description,

        skills:
            skills,

        salary:
            salary,

        application_url:
            applicationUrl

    };


    /*
        Add created_by only when possible.
        PostgreSQL will reject unknown columns, so we
        first try the normal schema.
    */

    let result =
        await client
            .from("jobs")
            .insert(jobData)
            .select()
            .single();


    /*
        If application_url is not available in an older
        schema, retry without optional fields.
    */

    if (
        result.error &&
        /application_url|skills|salary/i.test(
            result.error.message || ""
        )
    ) {

        const fallbackData = {

            title: title,

            company:
                company || getCompanyName(),

            location:
                location || "Remote",

            type:
                type || "Full-time",

            description:
                description

        };


        result =
            await client
                .from("jobs")
                .insert(fallbackData)
                .select()
                .single();

    }


    if (result.error) {

        console.error(
            "Publish job error:",
            result.error
        );

        alert(
            result.error.message ||
            "Unable to publish job."
        );

        return;

    }


    alert(
        "Job published successfully."
    );


    form.reset();


    await refreshDashboard();

}


/* =========================================================
   FORM HANDLING
   ========================================================= */

function setupJobForm() {

    const selectors = [
        "#post-job-form",
        "#job-form",
        "form[data-job-form]"
    ];


    let form = null;


    for (
        const selector of selectors
    ) {

        form =
            $(selector);

        if (form) {
            break;
        }

    }


    if (!form) {
        return;
    }


    if (
        form.dataset.dashboardBound === "true"
    ) {
        return;
    }


    form.dataset.dashboardBound =
        "true";


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const submitButton =
                form.querySelector(
                    'button[type="submit"]'
                );


            const originalText =
                submitButton
                    ? submitButton.textContent
                    : "";


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Publishing...";

            }


            try {

                await publishJob(form);

            } catch (error) {

                console.error(
                    "Job form error:",
                    error
                );

                alert(
                    error.message ||
                    "Unable to publish job."
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        originalText ||
                        "Publish Job";

                }

            }

        }
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutCompany() {

    const client =
        getSupabaseClient();

    try {

        if (client) {

            await client.auth.signOut();

        }

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    } finally {

        window.location.href =
            "login.html";

    }

}


/* =========================================================
   LOGOUT BUTTON
   ========================================================= */

function setupLogout() {

    const buttons = [
        "#logout-button",
        "#company-logout",
        "[data-action='logout']"
    ];


    buttons.forEach(
        selector => {

            $all(selector).forEach(
                button => {

                    if (
                        button.dataset.logoutBound ===
                        "true"
                    ) {
                        return;
                    }

                    button.dataset.logoutBound =
                        "true";

                    button.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();

                            logoutCompany();

                        }
                    );

                }
            );

        }
    );

}


/* =========================================================
   WALLET
   ========================================================= */

async function connectCompanyWallet() {

    if (
        typeof window.ethereum ===
        "undefined"
    ) {

        alert(
            "No Web3 wallet was detected. Please open the dashboard in a wallet-enabled browser."
        );

        return null;

    }


    if (
        typeof window.ethers ===
        "undefined"
    ) {

        alert(
            "Wallet library is not available."
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


        const signer =
            await provider.getSigner();


        const address =
            await signer.getAddress();


        const network =
            await provider.getNetwork();


        /*
            BNB Smart Chain Mainnet:
            56
        */

        if (
            network.chainId !== 56n
        ) {

            alert(
                "Please switch your wallet to BNB Smart Chain Mainnet."
            );

            try {

                await window.ethereum.request({
                    method:
                        "wallet_switchEthereumChain",
                    params: [
                        {
                            chainId: "0x38"
                        }
                    ]
                });

            } catch (switchError) {

                console.warn(
                    "Network switch failed:",
                    switchError
                );

            }

        }


        updateWalletDisplay(
            address
        );


        return address;

    } catch (error) {

        console.error(
            "Wallet connection error:",
            error
        );

        alert(
            error.message ||
            "Unable to connect wallet."
        );

        return null;

    }

}


/* =========================================================
   WALLET DISPLAY
   ========================================================= */

function shortenAddress(address) {

    if (!address) {
        return "";
    }

    if (address.length < 12) {
        return address;
    }

    return (
        address.slice(0, 6) +
        "..." +
        address.slice(-4)
    );

}


function updateWalletDisplay(address) {

    const elements = [
        "#wallet-address",
        "#connected-wallet",
        "[data-wallet-address]"
    ];


    elements.forEach(
        selector => {

            $all(selector).forEach(
                element => {

                    element.textContent =
                        shortenAddress(
                            address
                        );

                }
            );

        }
    );

}


function setupWalletButtons() {

    const selectors = [
        "#connect-wallet",
        "#connect-company-wallet",
        "[data-action='connect-wallet']"
    ];


    selectors.forEach(
        selector => {

            $all(selector).forEach(
                button => {

                    if (
                        button.dataset.walletBound ===
                        "true"
                    ) {
                        return;
                    }


                    button.dataset.walletBound =
                        "true";


                    button.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();

                            connectCompanyWallet();

                        }
                    );

                }
            );

        }
    );

}


/* =========================================================
   REFRESH DASHBOARD
   ========================================================= */

async function refreshDashboard() {

    try {

        CompanyDashboard.jobs =
            await loadCompanyJobs();

        CompanyDashboard.applications =
            await loadCompanyApplications();

        updateStats();

        renderJobs();

    } catch (error) {

        console.error(
            "Dashboard refresh error:",
            error
        );

        /*
            Do not lock the dashboard because statistics
            failed. The main dashboard remains available.
        */

        CompanyDashboard.jobs = [];
        CompanyDashboard.applications = [];

        updateStats();
        renderJobs();

    }

}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

function setupAuthListener() {

    const client =
        getSupabaseClient();

    if (!client) {
        return;
    }


    client.auth.onAuthStateChange(
        (event, session) => {

            if (
                event === "SIGNED_OUT"
            ) {

                window.location.href =
                    "login.html";

                return;

            }


            if (
                event === "SIGNED_IN" ||
                event === "TOKEN_REFRESHED"
            ) {

                if (
                    session &&
                    session.user &&
                    !CompanyDashboard.initialized
                ) {

                    initializeCompanyDashboard();

                }

            }

        }
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


    showLoading(
        "Please wait while we prepare your workspace."
    );


    try {

        const client =
            getSupabaseClient();


        if (!client) {

            throw new Error(
                "Supabase connection is not initialized. Check js/supabase.js."
            );

        }


        const user =
            await getCurrentUser();


        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        CompanyDashboard.user =
            user;


        const account =
            await getCompanyAccount(
                user
            );


        if (!account) {

            throw new Error(
                "Unable to determine your account type."
            );

        }


        if (!account.isCompany) {

            /*
                Prevent individual accounts from opening
                the company dashboard.
            */

            window.location.href =
                "dashboard.html";

            return;

        }


        CompanyDashboard.profile =
            account.profile || {};


        CompanyDashboard.companyProfile =
            await loadCompanyProfile(
                user.id
            );


        updateCompanyIdentity();


        /*
            The dashboard itself should never be blocked
            by jobs/applications queries.
        */

        showDashboard();

        hideLoading();


        await refreshDashboard();


        setupJobForm();

        setupLogout();

        setupWalletButtons();

        setupAuthListener();


        CompanyDashboard.initialized =
            true;


    } catch (error) {

        console.error(
            "Company dashboard initialization error:",
            error
        );


        showDashboardError(
            error.message ||
            "An unexpected error occurred while loading the dashboard."
        );

    }

}


/* =========================================================
   PUBLIC FUNCTIONS
   ========================================================= */

window.CompanyDashboard =
    CompanyDashboard;

window.initializeCompanyDashboard =
    initializeCompanyDashboard;

window.refreshCompanyDashboard =
    refreshDashboard;

window.connectCompanyWallet =
    connectCompanyWallet;

window.logoutCompany =
    logoutCompany;

window.publishCompanyJob =
    publishJob;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeCompanyDashboard();

    }
);


/* =========================================================
   GLOBAL ERROR PROTECTION
   ========================================================= */

window.addEventListener(
    "error",
    event => {

        console.error(
            "Dashboard JavaScript error:",
            event.error || event.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "Dashboard promise error:",
            event.reason
        );

    }
);
