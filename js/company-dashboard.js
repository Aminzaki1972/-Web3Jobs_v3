/* =========================================================
Web3Jobs v3
File: js/company-dashboard.js
Company Dashboard Controller
========================================================= */

"use strict";

/* =========================================================
CONFIGURATION
========================================================= */

const COMPANY_DASHBOARD_CONFIG = {
profileTables: [
"company_profiles",
"profiles"
],

subscriptionTables: [
    "subscriptions",
    "company_subscriptions"
],

jobsTable: "jobs",
applicationsTable: "applications",

loginPage: "login.html",
dashboardPage: "company-dashboard.html",
homePage: "index.html",

defaultPlan: "free",

walletChainId: "0x38",

debug: false

};

/* =========================================================
STATE
========================================================= */

const CompanyDashboard = {
user: null,
profile: null,
subscription: null,
jobs: [],
applications: [],
initialized: false,
initializing: false,
supabase: null
};

/* =========================================================
LOGGING
========================================================= */

function dashboardLog(...args) {
if (COMPANY_DASHBOARD_CONFIG.debug) {
console.log("[CompanyDashboard]", ...args);
}
}

function dashboardError(...args) {
console.error("[CompanyDashboard]", ...args);
}

/* =========================================================
DOM HELPERS
========================================================= */

function getElement(...selectors) {
for (const selector of selectors) {
if (!selector) continue;

    const element = document.querySelector(selector);

    if (element) {
        return element;
    }
}

return null;

}

function getElements(...selectors) {
const elements = [];

for (const selector of selectors) {
    if (!selector) continue;

    document.querySelectorAll(selector).forEach(element => {
        if (!elements.includes(element)) {
            elements.push(element);
        }
    });
}

return elements;

}

function setText(value, ...selectors) {
const element = getElement(...selectors);

if (element) {
    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "-"
            : String(value);
}

return element;

}

function setHTML(value, ...selectors) {
const element = getElement(...selectors);

if (element) {
    element.innerHTML = value || "";
}

return element;

}

function showElement(...selectors) {
const elements = getElements(...selectors);

elements.forEach(element => {
    element.style.display = "";
    element.hidden = false;
});

}

function hideElement(...selectors) {
const elements = getElements(...selectors);

elements.forEach(element => {
    element.style.display = "none";
    element.hidden = true;
});

}

/* =========================================================
SUPABASE
========================================================= */

function getSupabaseClient() {
if (CompanyDashboard.supabase) {
return CompanyDashboard.supabase;
}

if (
    window.supabaseClient &&
    typeof window.supabaseClient.from === "function"
) {
    CompanyDashboard.supabase = window.supabaseClient;
    return CompanyDashboard.supabase;
}

if (
    window.supabase &&
    typeof window.supabase.from === "function"
) {
    CompanyDashboard.supabase = window.supabase;
    return CompanyDashboard.supabase;
}

if (
    window.supabase &&
    typeof window.supabase.createClient === "function"
) {
    return null;
}

return null;

}

async function waitForSupabase(timeout = 10000) {
const started = Date.now();

while (Date.now() - started < timeout) {
    const client = getSupabaseClient();

    if (client) {
        return client;
    }

    await new Promise(resolve => {
        setTimeout(resolve, 100);
    });
}

return null;

}

/* =========================================================
AUTHENTICATION
========================================================= */

async function getCurrentUser() {
const client = CompanyDashboard.supabase;

if (!client) {
    return null;
}

try {
    const result = await client.auth.getUser();

    if (result.error) {
        dashboardError("Auth error:", result.error);
        return null;
    }

    return result.data?.user || null;
} catch (error) {
    dashboardError("Unable to get current user:", error);
    return null;
}

}

async function getCurrentSession() {
const client = CompanyDashboard.supabase;

if (!client) {
    return null;
}

try {
    const result = await client.auth.getSession();

    if (result.error) {
        dashboardError("Session error:", result.error);
        return null;
    }

    return result.data?.session || null;
} catch (error) {
    dashboardError("Unable to get session:", error);
    return null;
}

}

async function requireAuthentication() {
const session = await getCurrentSession();

if (!session) {
    redirectToLogin();
    return false;
}

const user = await getCurrentUser();

if (!user) {
    redirectToLogin();
    return false;
}

CompanyDashboard.user = user;

return true;

}

function redirectToLogin() {
const currentPage =
window.location.pathname.split("/").pop();

if (
    currentPage !==
    COMPANY_DASHBOARD_CONFIG.loginPage
) {
    window.location.href =
        COMPANY_DASHBOARD_CONFIG.loginPage;
}

}

/* =========================================================
ROLE DETECTION
========================================================= */

function normalizeRole(value) {
if (!value) {
return "";
}

return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

}

function isCompanyRole(value) {
const role = normalizeRole(value);

return [
    "company",
    "employer",
    "business",
    "organization",
    "companyaccount",
    "employeraccount"
].includes(role);

}

async function getUserRole(user) {
if (!user) {
return "";
}

const metadata = user.user_metadata || {};

const metadataRole =
    metadata.role ||
    metadata.account_type ||
    metadata.accountType ||
    metadata.user_type ||
    metadata.userType;

if (metadataRole) {
    return metadataRole;
}

const client = CompanyDashboard.supabase;

if (!client) {
    return "";
}

const tables = [
    "profiles",
    "company_profiles"
];

for (const table of tables) {
    try {
        const result = await client
            .from(table)
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

        if (
            !result.error &&
            result.data
        ) {
            const role =
                result.data.role ||
                result.data.account_type ||
                result.data.accountType ||
                result.data.user_type ||
                result.data.userType;

            if (role) {
                return role;
            }
        }
    } catch (error) {
        dashboardLog(
            "Role lookup skipped:",
            table,
            error
        );
    }
}

return "";

}

async function requireCompanyAccount() {
const role = await getUserRole(
CompanyDashboard.user
);

if (!role) {
    dashboardLog(
        "No explicit role found. Continuing as authenticated user."
    );

    return true;
}

if (isCompanyRole(role)) {
    return true;
}

window.location.href =
    "dashboard.html";

return false;

}

/* =========================================================
PROFILE
========================================================= */

async function loadCompanyProfile() {
const client = CompanyDashboard.supabase;
const user = CompanyDashboard.user;

if (!client || !user) {
    return null;
}

const userMetadata =
    user.user_metadata || {};

let bestProfile = {
    id: user.id,
    email: user.email || "",
    name:
        userMetadata.company_name ||
        userMetadata.companyName ||
        userMetadata.name ||
        userMetadata.full_name ||
        "",
    company:
        userMetadata.company_name ||
        userMetadata.companyName ||
        userMetadata.company ||
        "",
    role:
        userMetadata.role ||
        userMetadata.account_type ||
        ""
};

for (
    const table of
    COMPANY_DASHBOARD_CONFIG.profileTables
) {
    try {
        const result = await client
            .from(table)
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

        if (
            result.error ||
            !result.data
        ) {
            continue;
        }

        bestProfile = {
            ...bestProfile,
            ...result.data
        };

        if (
            table === "company_profiles" &&
            result.data
        ) {
            break;
        }
    } catch (error) {
        dashboardLog(
            "Profile table unavailable:",
            table
        );
    }
}

CompanyDashboard.profile =
    bestProfile;

return bestProfile;

}

/* =========================================================
PROFILE DISPLAY
========================================================= */

function getCompanyName() {
const profile =
CompanyDashboard.profile || {};

const user =
    CompanyDashboard.user || {};

const metadata =
    user.user_metadata || {};

return (
    profile.company_name ||
    profile.companyName ||
    profile.company ||
    profile.name ||
    metadata.company_name ||
    metadata.companyName ||
    metadata.company ||
    metadata.name ||
    "Company"
);

}

function updateCompanyInformation() {
const profile =
CompanyDashboard.profile || {};

const user =
    CompanyDashboard.user || {};

const companyName =
    getCompanyName();

const email =
    profile.email ||
    user.email ||
    "";

setText(
    companyName,
    "#company-name",
    "#companyName",
    "[data-company-name]"
);

setText(
    companyName,
    "#welcome-company-name",
    "#welcomeCompanyName",
    "[data-welcome-company]"
);

setText(
    email,
    "#company-email",
    "#companyEmail",
    "[data-company-email]"
);

setText(
    companyName,
    ".brand-company-name",
    "[data-brand-company]"
);

setText(
    email,
    ".company-email"
);

}

/* =========================================================
JOBS
========================================================= */

async function loadCompanyJobs() {
const client = CompanyDashboard.supabase;
const user = CompanyDashboard.user;

if (!client || !user) {
    return [];
}

let jobs = [];

try {
    const byUser = await client
        .from(COMPANY_DASHBOARD_CONFIG.jobsTable)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
            ascending: false
        });

    if (
        !byUser.error &&
        Array.isArray(byUser.data)
    ) {
        jobs = byUser.data;
    }
} catch (error) {
    dashboardLog(
        "user_id jobs query failed."
    );
}

if (jobs.length === 0) {
    const profile =
        CompanyDashboard.profile || {};

    const companyName =
        getCompanyName();

    try {
        const byCompany = await client
            .from(COMPANY_DASHBOARD_CONFIG.jobsTable)
            .select("*")
            .eq("company", companyName)
            .order("created_at", {
                ascending: false
            });

        if (
            !byCompany.error &&
            Array.isArray(byCompany.data)
        ) {
            jobs = byCompany.data;
        }
    } catch (error) {
        dashboardLog(
            "company jobs query failed."
        );
    }
}

CompanyDashboard.jobs = jobs;

return jobs;

}

/* =========================================================
APPLICATIONS
========================================================= */

async function loadCompanyApplications() {
const client = CompanyDashboard.supabase;

if (
    !client ||
    CompanyDashboard.jobs.length === 0
) {
    CompanyDashboard.applications = [];
    return [];
}

const jobIds =
    CompanyDashboard.jobs
        .map(job => job.id)
        .filter(Boolean);

if (jobIds.length === 0) {
    CompanyDashboard.applications = [];
    return [];
}

try {
    const result = await client
        .from(
            COMPANY_DASHBOARD_CONFIG
                .applicationsTable
        )
        .select("*")
        .in("job_id", jobIds);

    if (
        result.error ||
        !Array.isArray(result.data)
    ) {
        CompanyDashboard.applications = [];
        return [];
    }

    CompanyDashboard.applications =
        result.data;

    return result.data;
} catch (error) {
    dashboardLog(
        "Applications table unavailable."
    );

    CompanyDashboard.applications = [];

    return [];
}

}

/* =========================================================
STATISTICS
========================================================= */

function updateStatistics() {
const jobs =
CompanyDashboard.jobs || [];

const applications =
    CompanyDashboard.applications || [];

const activeJobs =
    jobs.filter(job => {
        const status =
            String(
                job.status ||
                job.state ||
                "active"
            ).toLowerCase();

        return ![
            "closed",
            "inactive",
            "expired",
            "archived"
        ].includes(status);
    });

setText(
    jobs.length,
    "#published-jobs",
    "#publishedJobs",
    "#jobs-count",
    "[data-stat='jobs']"
);

setText(
    applications.length,
    "#total-applications",
    "#totalApplications",
    "#applications-count",
    "[data-stat='applications']"
);

setText(
    activeJobs.length,
    "#active-jobs",
    "#activeJobs",
    "[data-stat='active-jobs']"
);

}

/* =========================================================
JOB LIST
========================================================= */

function escapeHTML(value) {
return String(
value === null ||
value === undefined
? ""
: value
)
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, """)
.replace(/'/g, "'");
}

function renderCompanyJobs() {
const containers = getElements(
"#company-jobs-list",
"#companyJobsList",
"#jobs-list",
"[data-company-jobs]"
);

if (containers.length === 0) {
    return;
}

const jobs =
    CompanyDashboard.jobs || [];

if (jobs.length === 0) {
    const emptyHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">+</div>
            <h3>No jobs published yet</h3>
            <p>Create your first Web3 job posting.</p>
        </div>
    `;

    containers.forEach(container => {
        container.innerHTML = emptyHTML;
    });

    return;
}

const html =
    jobs.map(job => {
        const title =
            escapeHTML(
                job.title ||
                "Untitled Job"
            );

        const company =
            escapeHTML(
                job.company ||
                getCompanyName()
            );

        const location =
            escapeHTML(
                job.location ||
                "Remote"
            );

        const type =
            escapeHTML(
                job.type ||
                "Full-time"
            );

        const status =
            escapeHTML(
                job.status ||
                "active"
            );

        const date =
            job.created_at
                ? new Date(
                    job.created_at
                ).toLocaleDateString()
                : "";

        return `
            <article class="company-job-card"
                     data-job-id="${escapeHTML(job.id)}">

                <div class="company-job-main">
                    <h3>${title}</h3>

                    <p>
                        ${company}
                    </p>

                    <div class="company-job-meta">
                        <span>${location}</span>
                        <span>${type}</span>
                        <span>${status}</span>
                    </div>
                </div>

                <div class="company-job-side">
                    <small>${date}</small>
                </div>

            </article>
        `;
    }).join("");

containers.forEach(container => {
    container.innerHTML = html;
});

}

/* =========================================================
SUBSCRIPTION HELPERS
========================================================= */

function normalizePlan(value) {
if (!value) {
return "";
}

return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

}

function extractPlanFromElement(element) {
if (!element) {
return null;
}

return (
    element.dataset.plan ||
    element.dataset.planId ||
    element.dataset.planName ||
    element.getAttribute("data-subscription") ||
    element.getAttribute("data-package") ||
    null
);

}

function extractPlanPrice(element) {
if (!element) {
return null;
}

const value =
    element.dataset.price ||
    element.dataset.amount ||
    element.getAttribute("data-price") ||
    element.getAttribute("data-amount");

if (
    value === null ||
    value === undefined ||
    value === ""
) {
    return null;
}

const number =
    Number(
        String(value)
            .replace(/[^0-9.]/g, "")
    );

return Number.isFinite(number)
    ? number
    : null;

}

/* =========================================================
LOAD SUBSCRIPTION
========================================================= */

async function loadCompanySubscription() {
const client = CompanyDashboard.supabase;
const user = CompanyDashboard.user;

if (!client || !user) {
    return null;
}

for (
    const table of
    COMPANY_DASHBOARD_CONFIG.subscriptionTables
) {
    try {
        const result = await client
            .from(table)
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", {
                ascending: false
            })
            .limit(1)
            .maybeSingle();

        if (
            !result.error &&
            result.data
        ) {
            CompanyDashboard.subscription =
                result.data;

            return result.data;
        }
    } catch (error) {
        dashboardLog(
            "Subscription table unavailable:",
            table
        );
    }
}

CompanyDashboard.subscription = null;

return null;

}

/* =========================================================
SUBSCRIPTION DISPLAY
========================================================= */

function getCurrentPlan() {
const subscription =
CompanyDashboard.subscription;

if (!subscription) {
    return COMPANY_DASHBOARD_CONFIG
        .defaultPlan;
}

return (
    subscription.plan ||
    subscription.plan_name ||
    subscription.planName ||
    subscription.package ||
    subscription.package_name ||
    subscription.tier ||
    COMPANY_DASHBOARD_CONFIG
        .defaultPlan
);

}

function updateSubscriptionUI() {
const subscription =
CompanyDashboard.subscription;

const currentPlan =
    getCurrentPlan();

const normalized =
    normalizePlan(currentPlan);

setText(
    currentPlan,
    "#current-plan",
    "#currentPlan",
    "#subscription-plan",
    "#subscriptionPlan",
    "[data-current-plan]"
);

const status =
    subscription?.status ||
    (
        normalized === "free"
            ? "active"
            : "inactive"
    );

setText(
    status,
    "#subscription-status",
    "#subscriptionStatus",
    "[data-subscription-status]"
);

const expiry =
    subscription?.expires_at ||
    subscription?.end_date ||
    subscription?.endDate;

if (expiry) {
    const date =
        new Date(expiry);

    if (!Number.isNaN(date.getTime())) {
        setText(
            date.toLocaleDateString(),
            "#subscription-expiry",
            "#subscriptionExpiry",
            "[data-subscription-expiry]"
        );
    }
}

const planElements =
    getElements(
        "[data-plan]",
        "[data-plan-id]",
        "[data-plan-name]"
    );

planElements.forEach(element => {
    const plan =
        normalizePlan(
            extractPlanFromElement(element)
        );

    const isCurrent =
        plan &&
        plan === normalized;

    element.classList.toggle(
        "active",
        isCurrent
    );

    element.classList.toggle(
        "current",
        isCurrent
    );

    const currentBadge =
        element.querySelector(
            "[data-current-badge]"
        );

    if (currentBadge) {
        currentBadge.style.display =
            isCurrent
                ? ""
                : "none";
    }
});

}

/* =========================================================
SUBSCRIPTION SAVE
========================================================= */

async function saveSubscription(plan, price = null) {
const client =
CompanyDashboard.supabase;

const user =
    CompanyDashboard.user;

if (!client || !user) {
    throw new Error(
        "Authentication is required."
    );
}

const payload = {
    user_id: user.id,
    plan: plan,
    status: "active"
};

if (price !== null) {
    payload.amount = price;
}

const tables =
    COMPANY_DASHBOARD_CONFIG
        .subscriptionTables;

let lastError = null;

for (const table of tables) {
    try {
        const existing =
            await client
                .from(table)
                .select("id")
                .eq("user_id", user.id)
                .limit(1)
                .maybeSingle();

        if (
            existing.error &&
            !String(
                existing.error.message || ""
            ).toLowerCase().includes(
                "column"
            )
        ) {
            lastError =
                existing.error;
            continue;
        }

        if (existing.data?.id) {
            const update =
                await client
                    .from(table)
                    .update(payload)
                    .eq(
                        "id",
                        existing.data.id
                    )
                    .select()
                    .single();

            if (!update.error) {
                return update.data;
            }

            lastError =
                update.error;
            continue;
        }

        const insert =
            await client
                .from(table)
                .insert(payload)
                .select()
                .single();

        if (!insert.error) {
            return insert.data;
        }

        lastError =
            insert.error;
    } catch (error) {
        lastError = error;
    }
}

throw (
    lastError ||
    new Error(
        "Unable to save subscription."
    )
);

}

/* =========================================================
SUBSCRIPTION BUTTON STATE
========================================================= */

function setSubscriptionButtonLoading(
button,
loading
) {
if (!button) {
return;
}

if (loading) {
    if (!button.dataset.originalText) {
        button.dataset.originalText =
            button.textContent;
    }

    button.disabled = true;
    button.setAttribute(
        "aria-busy",
        "true"
    );

    button.textContent =
        "Processing...";
} else {
    button.disabled = false;
    button.removeAttribute(
        "aria-busy"
    );

    if (button.dataset.originalText) {
        button.textContent =
            button.dataset.originalText;
    }
}

}

/* =========================================================
NOTIFICATIONS
========================================================= */

function showDashboardMessage(
message,
type = "info"
) {
let box =
getElement(
"#dashboard-message",
"#subscription-message",
"#company-dashboard-message",
"[data-dashboard-message]"
);

if (!box) {
    box =
        document.createElement("div");

    box.id =
        "dashboard-message";

    document.body.appendChild(box);
}

box.textContent =
    String(message);

box.dataset.type =
    type;

box.style.position =
    "fixed";

box.style.left =
    "50%";

box.style.bottom =
    "25px";

box.style.transform =
    "translateX(-50%)";

box.style.zIndex =
    "100000";

box.style.maxWidth =
    "min(90%, 520px)";

box.style.padding =
    "13px 18px";

box.style.border =
    "1px solid rgba(255,255,255,.12)";

box.style.borderRadius =
    "12px";

box.style.background =
    "#10233a";

box.style.color =
    "#f5f8ff";

box.style.boxShadow =
    "0 15px 40px rgba(0,0,0,.35)";

clearTimeout(
    box._hideTimer
);

box._hideTimer =
    setTimeout(() => {
        box.style.opacity = "0";

        setTimeout(() => {
            if (box.parentNode) {
                box.parentNode.removeChild(
                    box
                );
            }
        }, 250);
    }, 4000);

}

/* =========================================================
WALLET
========================================================= */

function getEthereumProvider() {
if (
window.ethereum &&
typeof window.ethereum.request ===
"function"
) {
return window.ethereum;
}

return null;

}

async function connectWallet() {
const ethereum =
getEthereumProvider();

if (!ethereum) {
    showDashboardMessage(
        "No compatible wallet was detected.",
        "error"
    );

    return null;
}

try {
    const accounts =
        await ethereum.request({
            method:
                "eth_requestAccounts"
        });

    if (
        !accounts ||
        !accounts.length
    ) {
        throw new Error(
            "No wallet account was returned."
        );
    }

    return accounts[0];
} catch (error) {
    dashboardError(
        "Wallet connection failed:",
        error
    );

    showDashboardMessage(
        error?.message ||
            "Wallet connection failed.",
        "error"
    );

    return null;
}

}

async function switchToBNBSmartChain() {
const ethereum =
getEthereumProvider();

if (!ethereum) {
    return false;
}

try {
    await ethereum.request({
        method:
            "wallet_switchEthereumChain",
        params: [
            {
                chainId:
                    COMPANY_DASHBOARD_CONFIG
                        .walletChainId
            }
        ]
    });

    return true;
} catch (error) {
    if (error?.code === 4902) {
        try {
            await ethereum.request({
                method:
                    "wallet_addEthereumChain",
                params: [
                    {
                        chainId:
                            "0x38",
                        chainName:
                            "BNB Smart Chain",
                        nativeCurrency: {
                            name: "BNB",
                            symbol: "BNB",
                            decimals: 18
                        },
                        rpcUrls: [
                            "https://bsc-dataseed.binance.org/"
                        ],
                        blockExplorerUrls: [
                            "https://bscscan.com/"
                        ]
                    }
                ]
            });

            return true;
        } catch (addError) {
            dashboardError(
                "Unable to add BNB Smart Chain:",
                addError
            );

            return false;
        }
    }

    dashboardError(
        "Unable to switch network:",
        error
    );

    return false;
}

}

function shortenWallet(address) {
if (!address) {
return "";
}

return (
    address.slice(0, 6) +
    "..." +
    address.slice(-4)
);

}

function updateWalletUI(address) {
if (!address) {
return;
}

setText(
    shortenWallet(address),
    "#wallet-address",
    "#walletAddress",
    "[data-wallet-address]"
);

const buttons =
    getElements(
        "#connect-wallet",
        "#connectWallet",
        "[data-connect-wallet]"
    );

buttons.forEach(button => {
    button.textContent =
        shortenWallet(address);

    button.dataset.connected =
        "true";
});

}

/* =========================================================
SUBSCRIPTION FLOW
========================================================= */

async function handleSubscription(
button
) {
if (!button) {
return;
}

const plan =
    extractPlanFromElement(button);

if (!plan) {
    showDashboardMessage(
        "Subscription plan is not configured.",
        "error"
    );

    return;
}

const price =
    extractPlanPrice(button);

const normalizedPlan =
    normalizePlan(plan);

const currentPlan =
    normalizePlan(
        getCurrentPlan()
    );

if (
    normalizedPlan ===
    currentPlan
) {
    showDashboardMessage(
        "This plan is already active.",
        "info"
    );

    return;
}

setSubscriptionButtonLoading(
    button,
    true
);

try {
    /*
     * Free plans can be activated directly.
     * Paid plans are also stored as pending
     * unless a payment contract is connected.
     *
     * This prevents the dashboard from
     * becoming unusable while the payment
     * provider is being configured.
     */

    if (
        price &&
        price > 0
    ) {
        const wallet =
            await connectWallet();

        if (!wallet) {
            return;
        }

        const switched =
            await switchToBNBSmartChain();

        if (!switched) {
            showDashboardMessage(
                "Please switch your wallet to BNB Smart Chain.",
                "error"
            );

            return;
        }

        /*
         * Payment transaction execution is intentionally
         * not fabricated here. A real contract address,
         * recipient address, or payment gateway must be
         * configured before sending funds.
         */

        const subscription =
            await saveSubscription(
                plan,
                price
            );

        CompanyDashboard.subscription =
            subscription;

        updateSubscriptionUI();

        updateWalletUI(
            wallet
        );

        showDashboardMessage(
            "Subscription selected successfully. Payment configuration is required before funds can be transferred.",
            "success"
        );

        return;
    }

    const subscription =
        await saveSubscription(
            plan,
            price
        );

    CompanyDashboard.subscription =
        subscription;

    updateSubscriptionUI();

    showDashboardMessage(
        "Subscription activated successfully.",
        "success"
    );
} catch (error) {
    dashboardError(
        "Subscription error:",
        error
    );

    showDashboardMessage(
        error?.message ||
            "Unable to activate the subscription.",
        "error"
    );
} finally {
    setSubscriptionButtonLoading(
        button,
        false
    );
}

}

/* =========================================================
SUBSCRIPTION EVENTS
========================================================= */

function bindSubscriptionEvents() {
const buttons =
getElements(
"[data-subscribe]",
"[data-subscription-plan]",
".subscribe-button",
".plan-button",
".subscription-button"
);

buttons.forEach(button => {
    if (
        button.dataset
            .subscriptionBound ===
        "true"
    ) {
        return;
    }

    button.dataset
        .subscriptionBound =
        "true";

    button.addEventListener(
        "click",
        event => {
            event.preventDefault();

            handleSubscription(
                button
            );
        }
    );
});

}

/* =========================================================
WALLET EVENTS
========================================================= */

function bindWalletEvents() {
const buttons =
getElements(
"#connect-wallet",
"#connectWallet",
"[data-connect-wallet]"
);

buttons.forEach(button => {
    if (
        button.dataset
            .walletBound ===
        "true"
    ) {
        return;
    }

    button.dataset.walletBound =
        "true";

    button.addEventListener(
        "click",
        async event => {
            event.preventDefault();

            const address =
                await connectWallet();

            if (address) {
                updateWalletUI(
                    address
                );
            }
        }
    );
});

}

/* =========================================================
LOGOUT
========================================================= */

async function logoutCompany() {
const client =
CompanyDashboard.supabase;

try {
    if (client) {
        await client.auth.signOut();
    }
} catch (error) {
    dashboardError(
        "Logout error:",
        error
    );
}

window.location.href =
    COMPANY_DASHBOARD_CONFIG.loginPage;

}

function bindLogoutEvents() {
const buttons =
getElements(
"#logout-button",
"#logoutButton",
".logout-button",
"[data-logout]"
);

buttons.forEach(button => {
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
});

}

/* =========================================================
NAVIGATION
========================================================= */

function bindNavigation() {
const homeLinks =
getElements(
"[data-dashboard-home]"
);

homeLinks.forEach(link => {
    link.addEventListener(
        "click",
        event => {
            event.preventDefault();

            window.location.href =
                COMPANY_DASHBOARD_CONFIG
                    .homePage;
        }
    );
});

}

/* =========================================================
LOADING SCREEN
========================================================= */

function hideLoadingScreen() {
const loading =
getElement(
"#loading-spinner",
"#loadingSpinner",
".loading-screen"
);

if (!loading) {
    return;
}

loading.style.opacity =
    "0";

loading.style.pointerEvents =
    "none";

setTimeout(() => {
    loading.style.display =
        "none";
}, 250);

}

function showDashboardContent() {
const content =
getElement(
"#dashboard-content",
"#dashboardContent",
"main[data-dashboard-content]",
".dashboard-content"
);

if (content) {
    content.style.display =
        "";
    content.hidden =
        false;
}

}

/* =========================================================
ERROR SCREEN
========================================================= */

function showDashboardError(
message
) {
const loading =
getElement(
"#loading-spinner",
"#loadingSpinner",
".loading-screen"
);

if (loading) {
    const paragraph =
        loading.querySelector("p");

    const heading =
        loading.querySelector("h2");

    if (heading) {
        heading.textContent =
            "Dashboard Error";
    }

    if (paragraph) {
        paragraph.textContent =
            message;
    }

    const spinner =
        loading.querySelector(
            ".loading-spinner-circle"
        );

    if (spinner) {
        spinner.style.display =
            "none";
    }

    loading.style.display =
        "flex";

    loading.style.opacity =
        "1";

    loading.style.pointerEvents =
        "auto";
}

}

/* =========================================================
AUTH STATE LISTENER
========================================================= */

function bindAuthStateListener() {
const client =
CompanyDashboard.supabase;

if (
    !client ||
    !client.auth
) {
    return;
}

client.auth.onAuthStateChange(
    (event, session) => {
        if (
            event ===
                "SIGNED_OUT" ||
            !session
        ) {
            window.location.href =
                COMPANY_DASHBOARD_CONFIG
                    .loginPage;
        }
    }
);

}

/* =========================================================
INITIALIZATION
========================================================= */

async function initializeCompanyDashboard() {
if (
CompanyDashboard.initialized ||
CompanyDashboard.initializing
) {
return;
}

CompanyDashboard.initializing =
    true;

try {
    const client =
        await waitForSupabase();

    if (!client) {
        throw new Error(
            "Supabase client is not available."
        );
    }

    CompanyDashboard.supabase =
        client;

    const authenticated =
        await requireAuthentication();

    if (!authenticated) {
        return;
    }

    const companyAccount =
        await requireCompanyAccount();

    if (!companyAccount) {
        return;
    }

    await loadCompanyProfile();

    updateCompanyInformation();

    await loadCompanyJobs();

    await loadCompanyApplications();

    await loadCompanySubscription();

    updateStatistics();

    renderCompanyJobs();

    updateSubscriptionUI();

    bindSubscriptionEvents();

    bindWalletEvents();

    bindLogoutEvents();

    bindNavigation();

    bindAuthStateListener();

    showDashboardContent();

    hideLoadingScreen();

    CompanyDashboard.initialized =
        true;

    dashboardLog(
        "Company dashboard initialized."
    );
} catch (error) {
    dashboardError(
        "Dashboard initialization failed:",
        error
    );

    showDashboardError(
        error?.message ||
            "Unable to initialize the company dashboard."
    );
} finally {
    CompanyDashboard.initializing =
        false;
}

}

/* =========================================================
PUBLIC API
========================================================= */

window.CompanyDashboard =
CompanyDashboard;

window.initializeCompanyDashboard =
initializeCompanyDashboard;

window.loadCompanyProfile =
loadCompanyProfile;

window.loadCompanyJobs =
loadCompanyJobs;

window.loadCompanyApplications =
loadCompanyApplications;

window.loadCompanySubscription =
loadCompanySubscription;

window.handleSubscription =
handleSubscription;

window.connectWallet =
connectWallet;

window.logoutCompany =
logoutCompany;

/* =========================================================
DOM READY
========================================================= */

if (
document.readyState ===
"loading"
) {
document.addEventListener(
"DOMContentLoaded",
initializeCompanyDashboard,
{
once: true
}
);
} else {
initializeCompanyDashboard();
}

/* =========================================================
FALLBACK INITIALIZATION
========================================================= */

window.addEventListener(
"load",
() => {
if (
!CompanyDashboard.initialized
) {
initializeCompanyDashboard();
}
},
{
once: true
}
);
