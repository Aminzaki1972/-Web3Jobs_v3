/* =========================================================
   Web3Jobs
   File: js/company-dashboard.js

   Company Dashboard
   Supabase + Company Profiles + Jobs + Applications
   USDT BEP-20 Payments on BNB Smart Chain

   Subscription plans:
   Free         = 2 jobs / month
   Starter      = $19 USDT / month = 5 jobs
   Professional = $49 USDT / month = 20 jobs
   Enterprise   = $99 USDT / month = Unlimited jobs

   Payment activation occurs ONLY after:
   1. Wallet confirmation
   2. Blockchain confirmation
   3. Transaction verification
   4. Supabase payment confirmation
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
   ========================================================= */

const COMPANY_DASHBOARD_CONFIG = {

    supabaseUrl:
        "https://uewocyaspztybnvnkbmo.supabase.co",

    paymentWallet:
        "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",

    bscChainId:
        "0x38",

    bscChainName:
        "BNB Smart Chain",

    usdtContract:
        "0x55d398326f99059fF775485246999027B3197955",

    usdtSymbol:
        "USDT",

    usdtDecimals:
        18,

    bscExplorer:
        "https://bscscan.com/tx/",

    rpcUrl:
        "https://bsc-dataseed.binance.org/",

    plans: {

        free: {
            code: "free",
            name: "Free",
            price: 0,
            limit: 2,
            durationDays: 30
        },

        starter: {
            code: "starter",
            name: "Starter",
            price: 19,
            limit: 5,
            durationDays: 30
        },

        professional: {
            code: "professional",
            name: "Professional",
            price: 49,
            limit: 20,
            durationDays: 30
        },

        enterprise: {
            code: "enterprise",
            name: "Enterprise",
            price: 99,
            limit: null,
            durationDays: 30
        }

    }

};


/* =========================================================
   STATE
   ========================================================= */

let supabaseClient = null;

let currentUser = null;

let currentProfile = null;

let currentCompanyProfile = null;

let currentPlan = null;

let currentPayment = null;

let selectedPlan = null;

let connectedWallet = null;

let dashboardInitialized = false;

let paymentInProgress = false;


/* =========================================================
   SUPABASE INITIALIZATION
   ========================================================= */

function getSupabaseClient() {

    if (supabaseClient) {
        return supabaseClient;
    }

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {

        supabaseClient =
            window.supabaseClient;

        return supabaseClient;
    }

    if (
        window.supabase &&
        typeof window.supabase.createClient === "function"
    ) {

        const existingUrl =
            window.SUPABASE_URL ||
            window.supabaseUrl ||
            COMPANY_DASHBOARD_CONFIG.supabaseUrl;

        const existingKey =
            window.SUPABASE_ANON_KEY ||
            window.SUPABASE_KEY ||
            window.supabaseKey ||
            window.SUPABASE_PUBLISHABLE_KEY;

        if (existingKey) {

            supabaseClient =
                window.supabase.createClient(
                    existingUrl,
                    existingKey
                );

            return supabaseClient;
        }
    }

    throw new Error(
        "Supabase client is not available. Check js/supabase.js."
    );
}


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {

    return document.getElementById(id);
}


function setText(id, value) {

    const element =
        $(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : String(value);
}


function showElement(id) {

    const element =
        $(id);

    if (element) {
        element.style.display = "";
    }
}


function hideElement(id) {

    const element =
        $(id);

    if (element) {
        element.style.display = "none";
    }
}


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


function escapeAttribute(value) {

    return escapeHtml(value);
}


/* =========================================================
   ALERT SYSTEM
   ========================================================= */

function showAlert(
    message,
    type = "success"
) {

    const alert =
        $("dashboard-alert");

    if (!alert) {

        console.log(message);

        return;
    }

    alert.textContent =
        message;

    alert.className = "";

    alert.id =
        "dashboard-alert";

    alert.classList.add(type);

    alert.style.display =
        "block";

    window.clearTimeout(
        showAlert._timer
    );

    showAlert._timer =
        window.setTimeout(
            () => {

                alert.style.display =
                    "none";

            },
            5000
        );
}


/* =========================================================
   LOADING
   ========================================================= */

function showDashboardLoading(message) {

    const spinner =
        $("loading-spinner");

    if (!spinner) {
        return;
    }

    spinner.style.display =
        "flex";

    const title =
        spinner.querySelector("h2");

    const paragraph =
        spinner.querySelector("p");

    if (title) {

        title.textContent =
            "Loading Company Dashboard";
    }

    if (
        paragraph &&
        message
    ) {

        paragraph.textContent =
            message;
    }
}


function hideDashboardLoading() {

    const spinner =
        $("loading-spinner");

    const content =
        $("dashboard-content");

    if (spinner) {

        spinner.style.display =
            "none";
    }

    if (content) {

        content.style.display =
            "block";
    }
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function getCurrentUser() {

    const client =
        getSupabaseClient();

    const {
        data,
        error
    } =
        await client.auth.getSession();

    if (error) {
        throw error;
    }

    if (
        data &&
        data.session &&
        data.session.user
    ) {

        return data.session.user;
    }

    const {
        data: userData,
        error: userError
    } =
        await client.auth.getUser();

    if (userError) {

        return null;
    }

    return userData?.user || null;
}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile() {

    const client =
        getSupabaseClient();

    if (!currentUser) {

        throw new Error(
            "No authenticated user."
        );
    }

    const {
        data,
        error
    } =
        await client
            .from("profiles")
            .select("*")
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();

    if (error) {
        throw error;
    }

    currentProfile =
        data || null;

    return currentProfile;
}


function normalizeRole(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}


function isCompanyProfile(profile) {

    if (!profile) {
        return false;
    }

    const role =
        normalizeRole(
            profile.role ||
            profile.account_type ||
            profile.user_type
        );

    return (
        role === "company" ||
        role === "employer" ||
        role === "business"
    );
}


/* =========================================================
   COMPANY PROFILE
   ========================================================= */

async function loadCompanyProfile() {

    const client =
        getSupabaseClient();

    if (!currentUser) {
        return null;
    }

    const {
        data,
        error
    } =
        await client
            .from("company_profiles")
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .maybeSingle();

    if (error) {

        const message =
            String(
                error.message || ""
            ).toLowerCase();

        if (
            message.includes("user_id") ||
            message.includes("column")
        ) {

            const fallback =
                await client
                    .from("company_profiles")
                    .select("*")
                    .eq(
                        "id",
                        currentUser.id
                    )
                    .maybeSingle();

            if (!fallback.error) {

                currentCompanyProfile =
                    fallback.data || null;

                return currentCompanyProfile;
            }
        }

        console.warn(
            "Company profile could not be loaded:",
            error.message
        );

        currentCompanyProfile =
            null;

        return null;
    }

    currentCompanyProfile =
        data || null;

    return currentCompanyProfile;
}


/* =========================================================
   COMPANY NAME
   ========================================================= */

function getCompanyName() {

    return (
        currentCompanyProfile?.company_name ||
        currentCompanyProfile?.name ||
        currentProfile?.company_name ||
        currentProfile?.name ||
        currentUser?.user_metadata?.company_name ||
        currentUser?.user_metadata?.name ||
        currentUser?.email?.split("@")[0] ||
        "Company"
    );
}


/* =========================================================
   COMPANY INFORMATION
   ========================================================= */

function renderCompanyInformation() {

    const companyName =
        getCompanyName();

    setText(
        "company-name",
        companyName
    );

    setText(
        "company-email",
        currentUser?.email || "—"
    );

    const jobCompany =
        $("job-company");

    if (
        jobCompany &&
        !jobCompany.value
    ) {

        jobCompany.value =
            companyName;
    }

    const profileName =
        $("profile-company-name");

    if (
        profileName &&
        currentCompanyProfile
    ) {

        profileName.value =
            currentCompanyProfile.company_name ||
            currentCompanyProfile.name ||
            "";
    }

    const website =
        $("profile-website");

    if (
        website &&
        currentCompanyProfile
    ) {

        website.value =
            currentCompanyProfile.website ||
            "";
    }

    const location =
        $("profile-location");

    if (
        location &&
        currentCompanyProfile
    ) {

        location.value =
            currentCompanyProfile.location ||
            "";
    }

    const linkedin =
        $("profile-linkedin");

    if (
        linkedin &&
        currentCompanyProfile
    ) {

        linkedin.value =
            currentCompanyProfile.linkedin ||
            "";
    }

    const description =
        $("profile-description");

    if (
        description &&
        currentCompanyProfile
    ) {

        description.value =
            currentCompanyProfile.description ||
            "";
    }
}


/* =========================================================
   PLAN HELPERS
   ========================================================= */

function normalizePlanCode(value) {

    if (!value) {
        return "free";
    }

    const normalized =
        String(value)
            .trim()
            .toLowerCase();

    if (
        COMPANY_DASHBOARD_CONFIG.plans[
            normalized
        ]
    ) {

        return normalized;
    }

    return "free";
}


function getPlanDefinition(code) {

    return (
        COMPANY_DASHBOARD_CONFIG.plans[
            normalizePlanCode(code)
        ] ||
        COMPANY_DASHBOARD_CONFIG.plans.free
    );
}


/* =========================================================
   PAYMENT LOADING
   ========================================================= */

async function loadLatestPayment() {

    const client =
        getSupabaseClient();

    if (!currentUser) {
        return null;
    }

    const {
        data,
        error
    } =
        await client
            .from("payments")
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(20);

    if (error) {

        console.warn(
            "Payments could not be loaded:",
            error.message
        );

        return null;
    }

    if (
        !data ||
        !data.length
    ) {

        return null;
    }

    const confirmed =
        data.find(
            payment =>
                String(
                    payment.status || ""
                ).toLowerCase() ===
                "confirmed"
        );

    currentPayment =
        confirmed ||
        data[0] ||
        null;

    return currentPayment;
}


/* =========================================================
   PAYMENT PLAN
   ========================================================= */

function getPaymentPlanCode(payment) {

    if (!payment) {
        return "free";
    }

    return normalizePlanCode(
        payment.plan_code ||
        payment.plan ||
        payment.plan_type
    );
}


function getPaymentExpiration(payment) {

    if (!payment) {
        return null;
    }

    const possibleFields = [
        "expires_at",
        "subscription_expires_at",
        "end_date",
        "valid_until"
    ];

    for (
        const field of possibleFields
    ) {

        if (payment[field]) {

            const date =
                new Date(
                    payment[field]
                );

            if (
                !Number.isNaN(
                    date.getTime()
                )
            ) {

                return date;
            }
        }
    }

    if (payment.created_at) {

        const start =
            new Date(
                payment.created_at
            );

        if (
            !Number.isNaN(
                start.getTime()
            )
        ) {

            const code =
                getPaymentPlanCode(
                    payment
                );

            const plan =
                getPlanDefinition(
                    code
                );

            const expiration =
                new Date(
                    start.getTime()
                );

            expiration.setDate(
                expiration.getDate() +
                plan.durationDays
            );

            return expiration;
        }
    }

    return null;
}


function isPaymentActive(payment) {

    if (!payment) {
        return false;
    }

    const status =
        String(
            payment.status || ""
        ).toLowerCase();

    if (
        status !== "confirmed" &&
        status !== "completed" &&
        status !== "success" &&
        status !== "paid"
    ) {

        return false;
    }

    const expiration =
        getPaymentExpiration(
            payment
        );

    if (!expiration) {
        return true;
    }

    return (
        expiration.getTime() >
        Date.now()
    );
}


/* =========================================================
   SUBSCRIPTION
   ========================================================= */

async function loadSubscription() {

    const payment =
        await loadLatestPayment();

    if (
        payment &&
        isPaymentActive(payment)
    ) {

        const code =
            getPaymentPlanCode(
                payment
            );

        currentPlan =
            getPlanDefinition(
                code
            );

    } else {

        currentPlan =
            COMPANY_DASHBOARD_CONFIG
                .plans
                .free;
    }

    renderSubscription();

    return currentPlan;
}


/* =========================================================
   RENDER SUBSCRIPTION
   ========================================================= */

function renderSubscription() {

    const plan =
        currentPlan ||
        COMPANY_DASHBOARD_CONFIG
            .plans
            .free;

    setText(
        "current-plan-name",
        plan.name
    );

    const limit =
        plan.limit === null
            ? "Unlimited"
            : plan.limit;

    setText(
        "monthly-job-limit",
        limit
    );

    const jobsUsed =
        window.__companyJobsCount || 0;

    setText(
        "monthly-jobs-used",
        jobsUsed
    );

    const jobsRemaining =
        plan.limit === null
            ? "Unlimited"
            : Math.max(
                0,
                plan.limit - jobsUsed
            );

    setText(
        "jobs-remaining-count",
        jobsRemaining
    );

    const progress =
        $("subscription-progress");

    const progressText =
        $("subscription-progress-text");

    if (progress) {

        if (plan.limit === null) {

            progress.style.width =
                "0%";

        } else {

            const percentage =
                plan.limit > 0
                    ? Math.min(
                        100,
                        (
                            jobsUsed /
                            plan.limit
                        ) * 100
                    )
                    : 0;

            progress.style.width =
                percentage + "%";
        }
    }

    if (progressText) {

        progressText.textContent =
            plan.limit === null
                ? `${jobsUsed} / Unlimited`
                : `${jobsUsed} / ${plan.limit}`;
    }

    const publishNote =
        $("publish-note");

    if (publishNote) {

        publishNote.textContent =
            plan.limit === null
                ? "Your current plan allows unlimited job advertisements."
                : `Your current plan allows ${plan.limit} job advertisements per month.`;
    }

    renderSubscriptionPromotion();
}


/* =========================================================
   SUBSCRIPTION PROMOTION
   ========================================================= */

function renderSubscriptionPromotion() {

    const dashboardContent =
        $("dashboard-content");

    if (!dashboardContent) {
        return;
    }

    let banner =
        $("subscription-promotion");

    if (!banner) {

        banner =
            document.createElement(
                "section"
            );

        banner.id =
            "subscription-promotion";

        banner.className =
            "subscription-promotion";

        dashboardContent.prepend(
            banner
        );
    }

    const plans =
        Object.values(
            COMPANY_DASHBOARD_CONFIG.plans
        );

    const activePlan =
        currentPlan ||
        COMPANY_DASHBOARD_CONFIG
            .plans
            .free;

    banner.innerHTML = `

        <div class="subscription-promotion-header">

            <div>

                <span class="subscription-promotion-badge">
                    Web3Jobs Business Plans
                </span>

                <h2>
                    Subscription Plans
                </h2>

                <p>
                    Choose a monthly plan that gives your company
                    more job postings and better hiring capabilities.
                </p>

            </div>

        </div>

        <div class="subscription-plan-buttons">

            ${plans.map(plan => {

                const isCurrent =
                    activePlan.code ===
                    plan.code;

                const price =
                    plan.price === 0
                        ? "Free"
                        : `$${plan.price} USDT`;

                const limit =
                    plan.limit === null
                        ? "Unlimited jobs"
                        : `${plan.limit} jobs / month`;

                return `

                    <button
                        type="button"
                        class="subscription-plan-button
                            ${plan.code === "professional"
                                ? "featured"
                                : ""}
                            ${isCurrent
                                ? "current"
                                : ""}"
                        data-plan="${escapeAttribute(
                            plan.code
                        )}"
                    >

                        <span class="subscription-button-main">

                            <strong>
                                ${escapeHtml(
                                    plan.name
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    price
                                )}
                            </span>

                        </span>

                        <span class="subscription-button-limit">
                            ${escapeHtml(
                                limit
                            )}
                        </span>

                        <span class="subscription-button-arrow">
                            ${isCurrent ? "✓" : "›"}
                        </span>

                    </button>

                `;

            }).join("")}

        </div>

    `;

    injectSubscriptionStyles();

    setupPlanButtons();
}


/* =========================================================
   SUBSCRIPTION MODAL
   ========================================================= */

function openPlanModal(code) {

    const plan =
        getPlanDefinition(code);

    const activePlan =
        currentPlan ||
        COMPANY_DASHBOARD_CONFIG
            .plans
            .free;

    closePlanModal();

    const modal =
        document.createElement("div");

    modal.id =
        "subscription-plan-modal";

    modal.className =
        "subscription-plan-modal";

    const isCurrent =
        activePlan.code ===
        plan.code;

    const price =
        plan.price === 0
            ? "Free"
            : `$${plan.price} USDT / month`;

    const limit =
        plan.limit === null
            ? "Unlimited"
            : `${plan.limit} jobs / month`;

    modal.innerHTML = `

        <div
            class="subscription-modal-backdrop"
            data-close-modal="true"
        ></div>

        <div
            class="subscription-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscription-modal-title"
        >

            <button
                type="button"
                class="subscription-modal-close"
                id="subscription-modal-close"
                aria-label="Close"
            >
                ×
            </button>

            <div class="subscription-modal-badge">
                Web3Jobs
            </div>

            <h2 id="subscription-modal-title">
                ${escapeHtml(
                    plan.name
                )}
            </h2>

            <div class="subscription-modal-price">
                ${escapeHtml(
                    price
                )}
            </div>

            <div class="subscription-modal-limit">
                ${escapeHtml(
                    limit
                )}
            </div>

            <div class="subscription-modal-divider"></div>

            <ul class="subscription-modal-features">

                <li>
                    <span>✓</span>
                    Job publishing
                </li>

                <li>
                    <span>✓</span>
                    Company dashboard
                </li>

                <li>
                    <span>✓</span>
                    Application management
                </li>

                ${
                    plan.code === "professional" ||
                    plan.code === "enterprise"
                        ? `
                            <li>
                                <span>✓</span>
                                Priority hiring visibility
                            </li>
                          `
                        : ""
                }

                ${
                    plan.code === "enterprise"
                        ? `
                            <li>
                                <span>✓</span>
                                Unlimited job postings
                            </li>
                          `
                        : ""
                }

            </ul>

            ${
                isCurrent
                    ? `
                        <button
                            type="button"
                            class="subscription-modal-action current"
                            disabled
                        >
                            ✓ Current Plan
                        </button>
                      `
                    : plan.code === "free"
                        ? `
                            <button
                                type="button"
                                class="subscription-modal-action"
                                id="subscription-free-button"
                            >
                                Use Free Plan
                            </button>
                          `
                        : `
                            <button
                                type="button"
                                class="subscription-modal-action"
                                id="subscription-choose-button"
                            >
                                Choose ${escapeHtml(
                                    plan.name
                                )}
                            </button>
                          `
            }

            <p class="subscription-modal-note">
                ${
                    plan.price > 0
                        ? "Payment is made securely in USDT on BNB Smart Chain."
                        : "No payment is required for this plan."
                }
            </p>

        </div>
    `;

    document.body.appendChild(
        modal
    );

    requestAnimationFrame(
        () => {

            modal.classList.add(
                "visible"
            );
        }
    );

    const closeButton =
        $("subscription-modal-close");

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closePlanModal
        );
    }

    modal
        .querySelector(
            "[data-close-modal]"
        )
        ?.addEventListener(
            "click",
            closePlanModal
        );

    const chooseButton =
        $("subscription-choose-button");

    if (chooseButton) {

        chooseButton.addEventListener(
            "click",
            async () => {

                chooseButton.disabled =
                    true;

                chooseButton.textContent =
                    "Opening Payment...";

                closePlanModal();

                await selectPlan(
                    plan.code
                );
            }
        );
    }

    const freeButton =
        $("subscription-free-button");

    if (freeButton) {

        freeButton.addEventListener(
            "click",
            () => {

                closePlanModal();

                currentPlan =
                    COMPANY_DASHBOARD_CONFIG
                        .plans
                        .free;

                renderSubscription();

                showAlert(
                    "Free plan selected.",
                    "success"
                );
            }
        );
    }

    document.body.classList.add(
        "subscription-modal-open"
    );
}


function closePlanModal() {

    const modal =
        $("subscription-plan-modal");

    if (modal) {

        modal.classList.remove(
            "visible"
        );

        setTimeout(
            () => {

                if (modal.parentNode) {

                    modal.parentNode.removeChild(
                        modal
                    );
                }

            },
            180
        );
    }

    document.body.classList.remove(
        "subscription-modal-open"
    );
}


/* =========================================================
   SUBSCRIPTION STYLES
   ========================================================= */

function injectSubscriptionStyles() {

    if (
        $("web3jobs-subscription-styles")
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "web3jobs-subscription-styles";

    style.textContent = `

        #subscription-promotion {
            margin: 28px 0;
            padding: 24px;
            border: 1px solid rgba(86, 165, 255, .16);
            border-radius: 22px;
            background:
                linear-gradient(
                    145deg,
                    rgba(10, 26, 44, .96),
                    rgba(5, 15, 27, .98)
                );
            box-shadow:
                0 20px 50px rgba(0,0,0,.18);
        }

        .subscription-promotion-header {
            margin-bottom: 20px;
        }

        .subscription-promotion-badge {
            display: inline-block;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .5px;
            text-transform: uppercase;
            color: #8fe9ff;
            background: rgba(53, 202, 255, .08);
            border: 1px solid rgba(53, 202, 255, .18);
        }

        .subscription-promotion h2 {
            margin: 10px 0 7px;
            color: #f4f8ff;
            font-size: 25px;
        }

        .subscription-promotion p {
            margin: 0;
            color: #8294aa;
            font-size: 13px;
            line-height: 1.6;
        }

        .subscription-plan-buttons {
            display: grid;
            grid-template-columns:
                repeat(
                    3,
                    minmax(0, 1fr)
                );
            gap: 12px;
        }

        .subscription-plan-button {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
            min-height: 78px;
            padding: 16px 17px;
            border: 1px solid rgba(87, 147, 196, .18);
            border-radius: 16px;
            background:
                linear-gradient(
                    145deg,
                    #0b1b2d,
                    #091625
                );
            color: #eaf3ff;
            cursor: pointer;
            text-align: left;
            transition:
                transform .2s ease,
                border-color .2s ease,
                box-shadow .2s ease,
                background .2s ease;
        }

        .subscription-plan-button:hover {
            transform: translateY(-2px);
            border-color: rgba(90, 205, 255, .45);
            box-shadow:
                0 12px 30px rgba(0,0,0,.25);
        }

        .subscription-plan-button.featured {
            border-color:
                rgba(71, 211, 255, .42);
        }

        .subscription-plan-button.current {
            border-color:
                rgba(91, 221, 164, .45);
            background:
                linear-gradient(
                    145deg,
                    rgba(25, 69, 67, .8),
                    rgba(8, 29, 32, .95)
                );
        }

        .subscription-button-main {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .subscription-button-main strong {
            font-size: 16px;
            color: #ffffff;
        }

        .subscription-button-main span {
            font-size: 13px;
            color: #7edcff;
        }

        .subscription-button-limit {
            flex: 1;
            font-size: 11px;
            color: #8395aa;
            text-align: right;
        }

        .subscription-button-arrow {
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255,255,255,.06);
            color: #9fe9ff;
            font-size: 18px;
        }

        body.subscription-modal-open {
            overflow: hidden;
        }

        .subscription-plan-modal {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            opacity: 0;
            transition: opacity .18s ease;
        }

        .subscription-plan-modal.visible {
            opacity: 1;
        }

        .subscription-modal-backdrop {
            position: absolute;
            inset: 0;
            background:
                rgba(1, 7, 14, .78);
            backdrop-filter:
                blur(8px);
        }

        .subscription-modal-card {
            position: relative;
            z-index: 2;
            width: min(440px, 100%);
            max-height: 90vh;
            overflow-y: auto;
            padding: 28px;
            border: 1px solid rgba(92, 175, 225, .25);
            border-radius: 24px;
            background:
                linear-gradient(
                    145deg,
                    #0c1d31,
                    #07111e
                );
            box-shadow:
                0 30px 90px rgba(0,0,0,.55);
            transform:
                translateY(12px)
                scale(.98);
            transition:
                transform .18s ease;
        }

        .subscription-plan-modal.visible
        .subscription-modal-card {
            transform:
                translateY(0)
                scale(1);
        }

        .subscription-modal-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 36px;
            height: 36px;
            border: 1px solid rgba(255,255,255,.08);
            border-radius: 10px;
            background: rgba(255,255,255,.04);
            color: #aab8c9;
            font-size: 23px;
            line-height: 1;
            cursor: pointer;
        }

        .subscription-modal-close:hover {
            background:
                rgba(255,255,255,.09);
            color: #fff;
        }

        .subscription-modal-badge {
            display: inline-block;
            margin-bottom: 10px;
            padding: 5px 9px;
            border-radius: 999px;
            background:
                rgba(59, 202, 255, .09);
            border:
                1px solid rgba(59, 202, 255, .18);
            color: #81e1ff;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .5px;
            text-transform: uppercase;
        }

        .subscription-modal-card h2 {
            margin: 0;
            color: #fff;
            font-size: 28px;
        }

        .subscription-modal-price {
            margin-top: 8px;
            color: #76dcff;
            font-size: 22px;
            font-weight: 800;
        }

        .subscription-modal-limit {
            margin-top: 5px;
            color: #8498ae;
            font-size: 13px;
        }

        .subscription-modal-divider {
            height: 1px;
            margin: 22px 0 15px;
            background:
                rgba(255,255,255,.08);
        }

        .subscription-modal-features {
            list-style: none;
            padding: 0;
            margin: 0 0 22px;
        }

        .subscription-modal-features li {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 13px 0;
            color: #d6e1ed;
            font-size: 14px;
        }

        .subscription-modal-features li span {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background:
                rgba(64, 210, 174, .09);
            color: #65e1ba;
            font-size: 12px;
        }

        .subscription-modal-action {
            width: 100%;
            min-height: 48px;
            border:
                1px solid rgba(75, 208, 255, .35);
            border-radius: 13px;
            background:
                linear-gradient(
                    135deg,
                    #123b55,
                    #0b2539
                );
            color: #e9faff;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: .2s ease;
        }

        .subscription-modal-action:hover {
            transform:
                translateY(-1px);
            border-color:
                rgba(75, 208, 255, .65);
        }

        .subscription-modal-action.current {
            background:
                rgba(64, 210, 174, .08);
            border-color:
                rgba(64, 210, 174, .35);
            color: #6de5bc;
            cursor: default;
        }

        .subscription-modal-note {
            margin-top: 14px !important;
            text-align: center;
            font-size: 11px !important;
            color: #718399 !important;
        }

        /* =================================================
           PAYMENT MODAL
           ================================================= */

        body.web3jobs-payment-open {
            overflow: hidden;
        }

        #web3jobs-payment-modal {
            position: fixed;
            inset: 0;
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            opacity: 0;
            pointer-events: none;
            transition: opacity .2s ease;
        }

        #web3jobs-payment-modal.visible {
            opacity: 1;
            pointer-events: auto;
        }

        .web3jobs-payment-backdrop {
            position: absolute;
            inset: 0;
            background:
                rgba(1, 7, 14, .82);
            backdrop-filter:
                blur(9px);
        }

        .web3jobs-payment-card {
            position: relative;
            z-index: 2;
            width: min(440px, 100%);
            max-height: 90vh;
            overflow-y: auto;
            padding: 28px;
            border:
                1px solid rgba(92, 175, 225, .25);
            border-radius: 24px;
            background:
                linear-gradient(
                    145deg,
                    #0c1d31,
                    #07111e
                );
            box-shadow:
                0 30px 90px rgba(0,0,0,.58);
            transform:
                translateY(12px)
                scale(.98);
            transition:
                transform .2s ease;
        }

        #web3jobs-payment-modal.visible
        .web3jobs-payment-card {
            transform:
                translateY(0)
                scale(1);
        }

        .web3jobs-payment-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 36px;
            height: 36px;
            border:
                1px solid rgba(255,255,255,.08);
            border-radius: 10px;
            background:
                rgba(255,255,255,.04);
            color: #aab8c9;
            font-size: 23px;
            cursor: pointer;
        }

        .web3jobs-payment-badge {
            display: inline-block;
            padding: 5px 9px;
            margin-bottom: 10px;
            border-radius: 999px;
            background:
                rgba(59,202,255,.09);
            border:
                1px solid rgba(59,202,255,.18);
            color: #81e1ff;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .5px;
            text-transform: uppercase;
        }

        .web3jobs-payment-card h2 {
            margin: 0;
            color: #fff;
            font-size: 27px;
        }

        .web3jobs-payment-price {
            margin-top: 7px;
            color: #76dcff;
            font-size: 21px;
            font-weight: 800;
        }

        .web3jobs-payment-network {
            margin-top: 5px;
            color: #8396aa;
            font-size: 12px;
        }

        .web3jobs-payment-divider {
            height: 1px;
            margin: 20px 0;
            background:
                rgba(255,255,255,.08);
        }

        .web3jobs-payment-wallet {
            padding: 13px;
            border-radius: 13px;
            border:
                1px solid rgba(255,255,255,.07);
            background:
                rgba(255,255,255,.025);
        }

        .web3jobs-payment-wallet-label {
            color: #7f91a7;
            font-size: 11px;
            margin-bottom: 5px;
        }

        .web3jobs-payment-wallet-address {
            word-break: break-all;
            color: #dce9f7;
            font-size: 12px;
        }

        .web3jobs-payment-status {
            margin-top: 15px;
            padding: 12px;
            border-radius: 12px;
            background:
                rgba(75,208,255,.06);
            border:
                1px solid rgba(75,208,255,.13);
            color: #9cdff2;
            font-size: 12px;
            line-height: 1.5;
        }

        .web3jobs-payment-actions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
            margin-top: 17px;
        }

        .web3jobs-payment-button {
            width: 100%;
            min-height: 49px;
            border-radius: 13px;
            border:
                1px solid rgba(75,208,255,.35);
            background:
                linear-gradient(
                    135deg,
                    #123b55,
                    #0b2539
                );
            color: #e9faff;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
        }

        .web3jobs-payment-button:hover {
            border-color:
                rgba(75,208,255,.65);
        }

        .web3jobs-payment-button.secondary {
            background:
                rgba(255,255,255,.035);
            border-color:
                rgba(255,255,255,.09);
            color: #aebdcd;
        }

        .web3jobs-payment-button:disabled {
            opacity: .55;
            cursor: not-allowed;
            transform: none;
        }

        .web3jobs-payment-security {
            margin-top: 14px;
            text-align: center;
            color: #718399;
            font-size: 10px;
            line-height: 1.5;
        }

        .web3jobs-tx-link {
            display: inline-block;
            margin-top: 8px;
            color: #76dcff;
            text-decoration: none;
        }

        /* =================================================
           LOGOUT
           ================================================= */

        .web3jobs-logout-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            min-height: 40px;
            padding: 0 14px;
            border:
                1px solid rgba(255,255,255,.10);
            border-radius: 11px;
            background:
                rgba(255,255,255,.035);
            color: #c7d4e3;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: .2s ease;
        }

        .web3jobs-logout-button:hover {
            background:
                rgba(255,255,255,.075);
            border-color:
                rgba(255,255,255,.20);
            color: #fff;
        }

        .web3jobs-logout-button:disabled {
            opacity: .6;
            cursor: wait;
        }

        @media (max-width: 760px) {

            #subscription-promotion {
                padding: 18px;
                border-radius: 18px;
            }

            .subscription-plan-buttons {
                grid-template-columns: 1fr;
            }

            .subscription-plan-button {
                min-height: 72px;
            }

            .subscription-modal-card,
            .web3jobs-payment-card {
                padding: 24px 20px;
            }

        }

    `;

    document.head.appendChild(
        style
    );
}


/* =========================================================
   PLAN BUTTONS
   ========================================================= */

function setupPlanButtons() {

    const buttons =
        document.querySelectorAll(
            ".subscription-plan-button[data-plan]"
        );

    buttons.forEach(
        button => {

            if (
                button.dataset.planBound ===
                "true"
            ) {
                return;
            }

            button.dataset.planBound =
                "true";

            button.addEventListener(
                "click",
                () => {

                    const code =
                        normalizePlanCode(
                            button.dataset.plan
                        );

                    openPlanModal(
                        code
                    );

                }
            );

        }
    );
}


/* =========================================================
   PAYMENT UI
   ========================================================= */

function ensurePaymentUI() {

    if (
        $("web3jobs-payment-modal")
    ) {

        return;
    }

    const modal =
        document.createElement("div");

    modal.id =
        "web3jobs-payment-modal";

    modal.innerHTML = `

        <div
            class="web3jobs-payment-backdrop"
            data-close-payment="true"
        ></div>

        <div
            class="web3jobs-payment-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="web3jobs-payment-title"
        >

            <button
                type="button"
                class="web3jobs-payment-close"
                id="web3jobs-payment-close"
                aria-label="Close"
            >
                ×
            </button>

            <div class="web3jobs-payment-badge">
                Secure Web3 Payment
            </div>

            <h2 id="web3jobs-payment-title">
                Payment
            </h2>

            <div
                class="web3jobs-payment-price"
                id="web3jobs-payment-price"
            >
                $0 USDT
            </div>

            <div class="web3jobs-payment-network">
                USDT BEP-20 on BNB Smart Chain
            </div>

            <div class="web3jobs-payment-divider"></div>

            <div class="web3jobs-payment-wallet">

                <div class="web3jobs-payment-wallet-label">
                    Payment recipient
                </div>

                <div
                    class="web3jobs-payment-wallet-address"
                >
                    ${escapeHtml(
                        COMPANY_DASHBOARD_CONFIG
                            .paymentWallet
                    )}
                </div>

            </div>

            <div
                class="web3jobs-payment-status"
                id="web3jobs-payment-status"
            >
                Connect your wallet to continue.
            </div>

            <div class="web3jobs-payment-actions">

                <button
                    type="button"
                    class="web3jobs-payment-button"
                    id="web3jobs-modal-connect"
                >
                    Connect Wallet
                </button>

                <button
                    type="button"
                    class="web3jobs-payment-button"
                    id="web3jobs-modal-pay"
                    disabled
                >
                    Pay USDT
                </button>

                <button
                    type="button"
                    class="web3jobs-payment-button secondary"
                    id="web3jobs-modal-cancel"
                >
                    Cancel
                </button>

            </div>

            <div class="web3jobs-payment-security">
                Your subscription is activated only after the
                blockchain transaction is confirmed and verified.
            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );

    const closeButton =
        $("web3jobs-payment-close");

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closePaymentModal
        );
    }

    const cancelButton =
        $("web3jobs-modal-cancel");

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closePaymentModal
        );
    }

    const backdrop =
        modal.querySelector(
            "[data-close-payment]"
        );

    if (backdrop) {

        backdrop.addEventListener(
            "click",
            closePaymentModal
        );
    }

    const connectButton =
        $("web3jobs-modal-connect");

    if (connectButton) {

        connectButton.addEventListener(
            "click",
            async () => {

                const wallet =
                    await connectWallet();

                updatePaymentModalState(
                    wallet
                );
            }
        );
    }

    const payButton =
        $("web3jobs-modal-pay");

    if (payButton) {

        payButton.addEventListener(
            "click",
            payUSDT
        );
    }
}


function openPaymentModal(plan) {

    ensurePaymentUI();

    selectedPlan =
        plan;

    const modal =
        $("web3jobs-payment-modal");

    const title =
        $("web3jobs-payment-title");

    const price =
        $("web3jobs-payment-price");

    if (title) {

        title.textContent =
            `${plan.name} Subscription`;
    }

    if (price) {

        price.textContent =
            `$${plan.price} USDT / month`;
    }

    setPaymentModalStatus(
        "Connect your wallet to continue."
    );

    updatePaymentModalState(
        connectedWallet
    );

    if (modal) {

        modal.classList.add(
            "visible"
        );
    }

    document.body.classList.add(
        "web3jobs-payment-open"
    );
}


function closePaymentModal() {

    const modal =
        $("web3jobs-payment-modal");

    if (modal) {

        modal.classList.remove(
            "visible"
        );
    }

    document.body.classList.remove(
        "web3jobs-payment-open"
    );
}


function setPaymentModalStatus(
    message
) {

    const status =
        $("web3jobs-payment-status");

    if (status) {

        status.textContent =
            message;
    }

    setPaymentStatus(
        message
    );
}


function updatePaymentModalState(
    wallet
) {

    const connectButton =
        $("web3jobs-modal-connect");

    const payButton =
        $("web3jobs-modal-pay");

    if (connectButton) {

        connectButton.textContent =
            wallet
                ? `Connected ${shortAddress(
                    wallet
                )}`
                : "Connect Wallet";
    }

    if (payButton) {

        payButton.disabled =
            !wallet ||
            !selectedPlan ||
            paymentInProgress;
    }
}


/* =========================================================
   SELECT PLAN
   ========================================================= */

async function selectPlan(code) {

    const plan =
        getPlanDefinition(code);

    selectedPlan =
        plan;

    setText(
        "selected-plan-name",
        plan.name
    );

    setText(
        "selected-plan-price",
        `$${plan.price} USDT`
    );

    if (
        !plan.price ||
        plan.price <= 0
    ) {

        currentPlan =
            plan;

        renderSubscription();

        showAlert(
            "Free plan selected.",
            "success"
        );

        return;
    }

    ensurePaymentUI();

    openPaymentModal(
        plan
    );
}


/* =========================================================
   CANCEL PAYMENT
   ========================================================= */

function cancelPayment() {

    selectedPlan =
        null;

    closePaymentModal();

    const paymentBox =
        $("payment-box");

    if (paymentBox) {

        paymentBox.classList.remove(
            "active"
        );
    }

    setText(
        "selected-plan-name",
        "—"
    );

    setText(
        "selected-plan-price",
        "$0 USDT"
    );

    setPaymentStatus(
        "Select a subscription plan to continue."
    );

    updatePaymentModalState(
        null
    );
}


/* =========================================================
   WALLET CONNECTION
   ========================================================= */

async function connectWallet() {

    if (!window.ethereum) {

        showAlert(
            "No Web3 wallet detected. Please install MetaMask or use a compatible Web3 wallet.",
            "error"
        );

        setPaymentModalStatus(
            "No Web3 wallet detected."
        );

        return null;
    }

    try {

        const accounts =
            await window.ethereum.request({
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

        connectedWallet =
            accounts[0];

        await switchToBSC();

        setPaymentModalStatus(
            `Wallet connected: ${shortAddress(
                connectedWallet
            )}`
        );

        const button =
            $("connect-wallet-button");

        if (button) {

            button.textContent =
                `Connected ${shortAddress(
                    connectedWallet
                )}`;
        }

        updatePaymentModalState(
            connectedWallet
        );

        return connectedWallet;

    } catch (error) {

        console.error(
            "Wallet connection error:",
            error
        );

        showAlert(
            error.message ||
            "Unable to connect wallet.",
            "error"
        );

        setPaymentModalStatus(
            error.message ||
            "Unable to connect wallet."
        );

        return null;
    }
}


/* =========================================================
   BSC NETWORK
   ========================================================= */

async function switchToBSC() {

    if (!window.ethereum) {

        throw new Error(
            "Web3 wallet is not available."
        );
    }

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

    } catch (error) {

        if (
            error &&
            (
                error.code === 4902 ||
                error.code === -32603
            )
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
                            name: "BNB",
                            symbol: "BNB",
                            decimals: 18
                        },

                        rpcUrls: [
                            COMPANY_DASHBOARD_CONFIG
                                .rpcUrl
                        ],

                        blockExplorerUrls: [
                            "https://bscscan.com"
                        ]
                    }
                ]

            });

        } else {

            throw error;
        }
    }
}


/* =========================================================
   ADDRESS HELPERS
   ========================================================= */

function shortAddress(address) {

    if (!address) {
        return "—";
    }

    return (
        address.slice(0, 6) +
        "..." +
        address.slice(-4)
    );
}


function normalizeAddress(address) {

    return String(
        address || ""
    )
        .trim()
        .toLowerCase();
}


/* =========================================================
   USDT CONTRACT
   ========================================================= */

const USDT_ABI = [

    "function transfer(address to,uint256 amount) returns (bool)",

    "function balanceOf(address account) view returns (uint256)",

    "function decimals() view returns (uint8)"

];


/* =========================================================
   PAY USDT
   ========================================================= */

async function payUSDT() {

    if (paymentInProgress) {
        return;
    }

    if (!selectedPlan) {

        showAlert(
            "Please select a subscription plan first.",
            "error"
        );

        return;
    }

    if (
        !selectedPlan.price ||
        selectedPlan.price <= 0
    ) {

        showAlert(
            "This plan does not require payment.",
            "error"
        );

        return;
    }

    if (!window.ethereum) {

        showAlert(
            "Please connect a Web3 wallet first.",
            "error"
        );

        return;
    }

    paymentInProgress =
        true;

    const payButton =
        $("web3jobs-modal-pay");

    const connectButton =
        $("web3jobs-modal-connect");

    if (payButton) {

        payButton.disabled =
            true;

        payButton.textContent =
            "Processing...";
    }

    if (connectButton) {

        connectButton.disabled =
            true;
    }

    try {

        let wallet =
            connectedWallet;

        if (!wallet) {

            wallet =
                await connectWallet();
        }

        if (!wallet) {
            throw new Error(
                "Wallet connection was not completed."
            );
        }

        await switchToBSC();

        if (
            typeof ethers ===
            "undefined"
        ) {

            throw new Error(
                "Ethers.js is not loaded."
            );
        }

        const provider =
            new ethers.BrowserProvider(
                window.ethereum
            );

        const network =
            await provider.getNetwork();

        if (
            String(
                network.chainId
            ) !== "56"
        ) {

            await switchToBSC();

            throw new Error(
                "Please switch your wallet to BNB Smart Chain and try again."
            );
        }

        const signer =
            await provider.getSigner();

        const signerAddress =
            await signer.getAddress();

        connectedWallet =
            signerAddress;

        const token =
            new ethers.Contract(
                COMPANY_DASHBOARD_CONFIG
                    .usdtContract,
                USDT_ABI,
                signer
            );

        const decimals =
            COMPANY_DASHBOARD_CONFIG
                .usdtDecimals;

        const amount =
            ethers.parseUnits(
                String(
                    selectedPlan.price
                ),
                decimals
            );

        setPaymentModalStatus(
            "Checking USDT balance..."
        );

        const balance =
            await token.balanceOf(
                signerAddress
            );

        if (
            balance < amount
        ) {

            throw new Error(
                `Insufficient USDT balance. You need ${selectedPlan.price} USDT.`
            );
        }

        setPaymentModalStatus(
            "Waiting for wallet confirmation..."
        );

        const transaction =
            await token.transfer(
                COMPANY_DASHBOARD_CONFIG
                    .paymentWallet,
                amount
            );

        const txHash =
            transaction.hash;

        setPaymentModalStatus(
            `Transaction submitted: ${shortHash(
                txHash
            )}`
        );

        addTransactionLink(
            txHash
        );

        let paymentRecord =
            null;

        try {

            paymentRecord =
                await createPendingPayment(
                    txHash,
                    selectedPlan,
                    signerAddress
                );

        } catch (databaseError) {

            console.warn(
                "Pending payment record could not be created:",
                databaseError
            );
        }

        setPaymentModalStatus(
            "Transaction submitted. Waiting for BNB Smart Chain confirmation..."
        );

        const receipt =
            await transaction.wait();

        if (
            !receipt ||
            receipt.status !== 1
        ) {

            await markPaymentFailed(
                paymentRecord?.id,
                txHash
            );

            throw new Error(
                "Blockchain transaction failed."
            );
        }

        setPaymentModalStatus(
            "Transaction confirmed. Verifying USDT payment..."
        );

        const verified =
            await verifyUSDTTransaction(
                txHash,
                selectedPlan,
                signerAddress
            );

        if (!verified) {

            await markPaymentFailed(
                paymentRecord?.id,
                txHash
            );

            throw new Error(
                "The transaction could not be verified as the expected USDT payment."
            );
        }

        setPaymentModalStatus(
            "Payment verified. Activating your subscription..."
        );

        await confirmPaymentAndActivateSubscription(
            paymentRecord,
            txHash,
            selectedPlan
        );

        setPaymentModalStatus(
            `Payment confirmed successfully. ${selectedPlan.name} is now active.`
        );

        showAlert(
            `${selectedPlan.name} subscription activated successfully.`,
            "success"
        );

        await loadSubscription();

        await loadCompanyJobs();

        await loadApplications();

        setTimeout(
            () => {

                closePaymentModal();

                selectedPlan =
                    null;

            },
            1200
        );

    } catch (error) {

        console.error(
            "USDT payment error:",
            error
        );

        setPaymentModalStatus(
            error.message ||
            "Payment failed."
        );

        showAlert(
            error.message ||
            "Payment failed.",
            "error"
        );

    } finally {

        paymentInProgress =
            false;

        if (payButton) {

            payButton.disabled =
                !connectedWallet ||
                !selectedPlan;

            payButton.textContent =
                "Pay USDT";
        }

        if (connectButton) {

            connectButton.disabled =
                false;
        }

    }
}


/* =========================================================
   PAYMENT STATUS
   ========================================================= */

function setPaymentStatus(message) {

    const status =
        $("payment-status");

    if (status) {

        status.textContent =
            message;
    }
}


function shortHash(hash) {

    if (!hash) {
        return "—";
    }

    return (
        hash.slice(0, 10) +
        "..." +
        hash.slice(-8)
    );
}


function addTransactionLink(txHash) {

    const status =
        $("web3jobs-payment-status");

    if (!status || !txHash) {
        return;
    }

    const existing =
        status.querySelector(
            ".web3jobs-tx-link"
        );

    if (existing) {
        return;
    }

    const link =
        document.createElement("a");

    link.className =
        "web3jobs-tx-link";

    link.href =
        COMPANY_DASHBOARD_CONFIG
            .bscExplorer +
        encodeURIComponent(
            txHash
        );

    link.target =
        "_blank";

    link.rel =
        "noopener noreferrer";

    link.textContent =
        "View transaction on BscScan";

    status.appendChild(
        document.createElement("br")
    );

    status.appendChild(
        link
    );
}


/* =========================================================
   CREATE PENDING PAYMENT
   ========================================================= */

async function createPendingPayment(
    txHash,
    plan,
    walletAddress
) {

    const client =
        getSupabaseClient();

    const record = {

        user_id:
            currentUser.id,

        payment_provider:
            "bnb_chain",

        payment_method:
            "usdt_bep20",

        payment_type:
            "subscription",

        amount:
            plan.price,

        currency:
            "USDT",

        status:
            "pending",

        provider_payment_id:
            txHash,

        transaction_hash:
            txHash,

        blockchain_network:
            "BSC",

        plan_code:
            plan.code,

        plan_name:
            plan.name,

        wallet_address:
            walletAddress
    };

    let result =
        await client
            .from("payments")
            .insert(record)
            .select()
            .maybeSingle();

    if (
        result.error &&
        (
            String(
                result.error.message
            )
                .toLowerCase()
                .includes("plan_code") ||

            String(
                result.error.message
            )
                .toLowerCase()
                .includes("plan_name") ||

            String(
                result.error.message
            )
                .toLowerCase()
                .includes("wallet_address")
        )
    ) {

        const fallbackRecord = {

            user_id:
                currentUser.id,

            payment_provider:
                "bnb_chain",

            payment_method:
                "usdt_bep20",

            payment_type:
                "subscription",

            amount:
                plan.price,

            currency:
                "USDT",

            status:
                "pending",

            provider_payment_id:
                txHash,

            transaction_hash:
                txHash,

            blockchain_network:
                "BSC"
        };

        result =
            await client
                .from("payments")
                .insert(
                    fallbackRecord
                )
                .select()
                .maybeSingle();
    }

    if (result.error) {

        console.error(
            "Could not create payment:",
            result.error
        );

        return null;
    }

    return result.data || null;
}


/* =========================================================
   VERIFY USDT TRANSACTION
   ========================================================= */

async function verifyUSDTTransaction(
    txHash,
    plan,
    expectedSender
) {

    try {

        if (
            typeof ethers ===
            "undefined"
        ) {

            return false;
        }

        const provider =
            new ethers.JsonRpcProvider(
                COMPANY_DASHBOARD_CONFIG
                    .rpcUrl
            );

        const transaction =
            await provider.getTransaction(
                txHash
            );

        if (!transaction) {
            return false;
        }

        const receipt =
            await provider.getTransactionReceipt(
                txHash
            );

        if (!receipt) {
            return false;
        }

        if (
            receipt.status !== 1
        ) {

            return false;
        }

        if (
            normalizeAddress(
                transaction.to
            ) !==
            normalizeAddress(
                COMPANY_DASHBOARD_CONFIG
                    .usdtContract
            )
        ) {

            return false;
        }

        if (
            expectedSender &&
            normalizeAddress(
                transaction.from
            ) !==
            normalizeAddress(
                expectedSender
            )
        ) {

            return false;
        }

        const transferTopic =
            ethers.id(
                "Transfer(address,address,uint256)"
            );

        const expectedRecipient =
            normalizeAddress(
                COMPANY_DASHBOARD_CONFIG
                    .paymentWallet
            );

        const expectedAmount =
            ethers.parseUnits(
                String(plan.price),
                COMPANY_DASHBOARD_CONFIG
                    .usdtDecimals
            );

        let validTransfer =
            false;

        for (
            const log of receipt.logs
        ) {

            if (
                normalizeAddress(
                    log.address
                ) !==
                normalizeAddress(
                    COMPANY_DASHBOARD_CONFIG
                        .usdtContract
                )
            ) {

                continue;
            }

            if (
                !log.topics ||
                log.topics.length < 3
            ) {

                continue;
            }

            if (
                log.topics[0].toLowerCase() !==
                transferTopic.toLowerCase()
            ) {

                continue;
            }

            const recipient =
                ethers.getAddress(
                    "0x" +
                    log.topics[2].slice(-40)
                );

            const amount =
                BigInt(
                    log.data
                );

            if (
                normalizeAddress(
                    recipient
                ) ===
                expectedRecipient &&
                amount >=
                expectedAmount
            ) {

                validTransfer =
                    true;

                break;
            }
        }

        return validTransfer;

    } catch (error) {

        console.error(
            "Transaction verification error:",
            error
        );

        return false;
    }
}


/* =========================================================
   CONFIRM PAYMENT
   ========================================================= */

async function confirmPaymentAndActivateSubscription(
    paymentRecord,
    txHash,
    plan
) {

    const client =
        getSupabaseClient();

    const now =
        new Date();

    const expires =
        new Date(now);

    expires.setDate(
        expires.getDate() +
        plan.durationDays
    );

    const updateData = {

        status:
            "confirmed",

        transaction_hash:
            txHash,

        provider_payment_id:
            txHash,

        blockchain_network:
            "BSC",

        plan_code:
            plan.code,

        plan_name:
            plan.name,

        subscription_status:
            "active",

        subscription_started_at:
            now.toISOString(),

        subscription_expires_at:
            expires.toISOString()

    };

    let result;

    if (paymentRecord?.id) {

        result =
            await client
                .from("payments")
                .update(updateData)
                .eq(
                    "id",
                    paymentRecord.id
                );

    } else {

        result =
            await client
                .from("payments")
                .update(updateData)
                .eq(
                    "transaction_hash",
                    txHash
                );
    }

    if (
        result.error &&
        (
            String(
                result.error.message
            )
                .toLowerCase()
                .includes("plan_code") ||

            String(
                result.error.message
            )
                .toLowerCase()
                .includes("subscription_")
        )
    ) {

        const fallbackData = {

            status:
                "confirmed",

            transaction_hash:
                txHash,

            provider_payment_id:
                txHash,

            blockchain_network:
                "BSC"
        };

        if (paymentRecord?.id) {

            result =
                await client
                    .from("payments")
                    .update(
                        fallbackData
                    )
                    .eq(
                        "id",
                        paymentRecord.id
                    );

        } else {

            result =
                await client
                    .from("payments")
                    .update(
                        fallbackData
                    )
                    .eq(
                        "transaction_hash",
                        txHash
                    );
        }
    }

    if (result.error) {

        throw new Error(
            "Payment was confirmed on-chain, but Supabase could not update the payment record: " +
            result.error.message
        );
    }

    await upsertSubscriptionSafely(
        plan,
        now,
        expires,
        txHash
    );

    currentPayment = {

        ...(paymentRecord || {}),

        status:
            "confirmed",

        plan_code:
            plan.code,

        plan_name:
            plan.name,

        subscription_status:
            "active",

        subscription_started_at:
            now.toISOString(),

        subscription_expires_at:
            expires.toISOString(),

        transaction_hash:
            txHash

    };

    currentPlan =
        plan;
}


/* =========================================================
   OPTIONAL SUBSCRIPTIONS TABLE
   ========================================================= */

async function upsertSubscriptionSafely(
    plan,
    startDate,
    expirationDate,
    txHash
) {

    const client =
        getSupabaseClient();

    try {

        const subscription = {

            user_id:
                currentUser.id,

            plan_code:
                plan.code,

            plan_name:
                plan.name,

            status:
                "active",

            started_at:
                startDate.toISOString(),

            expires_at:
                expirationDate.toISOString(),

            transaction_hash:
                txHash

        };

        const result =
            await client
                .from("subscriptions")
                .upsert(
                    subscription,
                    {
                        onConflict:
                            "user_id"
                    }
                );

        if (result.error) {

            console.info(
                "Subscriptions table not used:",
                result.error.message
            );
        }

    } catch (error) {

        console.info(
            "Optional subscriptions update skipped:",
            error
        );
    }
}


/* =========================================================
   MARK PAYMENT FAILED
   ========================================================= */

async function markPaymentFailed(
    paymentId,
    txHash
) {

    const client =
        getSupabaseClient();

    try {

        let query =
            client
                .from("payments")
                .update({
                    status:
                        "failed"
                });

        if (paymentId) {

            query =
                query.eq(
                    "id",
                    paymentId
                );

        } else {

            query =
                query.eq(
                    "transaction_hash",
                    txHash
                );
        }

        await query;

    } catch (error) {

        console.warn(
            "Could not mark payment as failed:",
            error
        );
    }
}


/* =========================================================
   JOBS
   ========================================================= */

async function loadCompanyJobs() {

    const client =
        getSupabaseClient();

    if (!currentUser) {
        return [];
    }

    let result =
        await client
            .from("jobs")
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

    if (
        result.error &&
        String(
            result.error.message
        )
            .toLowerCase()
            .includes("user_id")
    ) {

        result =
            await client
                .from("jobs")
                .select("*")
                .eq(
                    "company",
                    getCompanyName()
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );
    }

    if (result.error) {

        console.error(
            "Jobs loading error:",
            result
        );

        window.__companyJobs =
            [];

        window.__companyJobsCount =
            0;

        setText(
            "published-jobs-count",
            "0"
        );

        renderSubscription();

        renderJobs([]);

        return [];
    }

    const jobs =
        result.data || [];

    window.__companyJobs =
        jobs;

    window.__companyJobsCount =
        countMonthlyJobs(
            jobs
        );

    setText(
        "published-jobs-count",
        jobs.length
    );

    renderSubscription();

    renderJobs(
        jobs
    );

    return jobs;
}


/* =========================================================
   MONTHLY JOB COUNT
   ========================================================= */

function countMonthlyJobs(jobs) {

    if (!Array.isArray(jobs)) {
        return 0;
    }

    const now =
        new Date();

    const year =
        now.getUTCFullYear();

    const month =
        now.getUTCMonth();

    return jobs.filter(
        job => {

            const date =
                new Date(
                    job.created_at ||
                    job.createdAt ||
                    0
                );

            return (
                date.getUTCFullYear() ===
                    year &&
                date.getUTCMonth() ===
                    month
            );
        }
    ).length;
}


/* =========================================================
   RENDER JOBS
   ========================================================= */

function renderJobs(jobs) {

    const container =
        $("company-jobs-list");

    if (!container) {
        return;
    }

    if (!jobs.length) {

        container.innerHTML = `
            <div class="empty-state">
                You have not published any jobs yet.
            </div>
        `;

        return;
    }

    container.innerHTML =
        jobs.map(
            job => {

                const title =
                    escapeHtml(
                        job.title ||
                        "Untitled Job"
                    );

                const company =
                    escapeHtml(
                        job.company ||
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
                    formatDate(
                        job.created_at
                    );

                return `
                    <div class="job-card">

                        <div class="job-card-header">

                            <div>

                                <div class="job-title">
                                    ${title}
                                </div>

                                <div class="job-meta">

                                    <span>
                                        ${company}
                                    </span>

                                    <span>•</span>

                                    <span>
                                        ${location}
                                    </span>

                                    <span>•</span>

                                    <span>
                                        ${type}
                                    </span>

                                    <span>•</span>

                                    <span>
                                        ${created}
                                    </span>

                                </div>

                            </div>

                            <div class="job-actions">

                                <button
                                    type="button"
                                    class="small-button delete"
                                    data-delete-job="${escapeAttribute(
                                        job.id
                                    )}"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>

                    </div>
                `;

            }
        ).join("");

    container
        .querySelectorAll(
            "[data-delete-job]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        deleteJob(
                            button.dataset
                                .deleteJob
                        );

                    }
                );

            }
        );
}


/* =========================================================
   DELETE JOB
   ========================================================= */

async function deleteJob(jobId) {

    if (!jobId) {
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

        const client =
            getSupabaseClient();

        let result =
            await client
                .from("jobs")
                .delete()
                .eq(
                    "id",
                    jobId
                )
                .eq(
                    "user_id",
                    currentUser.id
                );

        if (
            result.error &&
            String(
                result.error.message
            )
                .toLowerCase()
                .includes("user_id")
        ) {

            result =
                await client
                    .from("jobs")
                    .delete()
                    .eq(
                        "id",
                        jobId
                    );
        }

        if (result.error) {
            throw result.error;
        }

        showAlert(
            "Job deleted successfully.",
            "success"
        );

        await loadCompanyJobs();

        await loadApplications();

    } catch (error) {

        console.error(
            "Delete job error:",
            error
        );

        showAlert(
            error.message ||
            "Unable to delete the job.",
            "error"
        );
    }
}


/* =========================================================
   POST JOB
   ========================================================= */

async function handlePostJob(event) {

    event.preventDefault();

    if (!currentUser) {

        showAlert(
            "Your session has expired. Please sign in again.",
            "error"
        );

        return;
    }

    const plan =
        currentPlan ||
        COMPANY_DASHBOARD_CONFIG
            .plans
            .free;

    const jobs =
        window.__companyJobs ||
        [];

    const monthlyCount =
        countMonthlyJobs(
            jobs
        );

    if (
        plan.limit !== null &&
        monthlyCount >=
            plan.limit
    ) {

        showAlert(
            `You have reached your ${plan.name} plan limit of ${plan.limit} jobs this month. Please upgrade your plan.`,
            "error"
        );

        const subscription =
            $("subscription-section");

        if (subscription) {

            subscription.scrollIntoView({
                behavior: "smooth"
            });
        }

        const promotion =
            $("subscription-promotion");

        if (promotion) {

            promotion.scrollIntoView({
                behavior: "smooth"
            });
        }

        return;
    }

    const form =
        event.currentTarget;

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
            formData.get("location") ||
            ""
        ).trim();

    const type =
        String(
            formData.get("type") ||
            ""
        ).trim();

    const applyLink =
        String(
            formData.get("apply_link") ||
            ""
        ).trim();

    const description =
        String(
            formData.get("description") ||
            ""
        ).trim();

    if (
        !title ||
        !company ||
        !applyLink ||
        !description
    ) {

        showAlert(
            "Please complete all required job fields.",
            "error"
        );

        return;
    }

    const button =
        $("publish-job-button");

    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Publishing...";
    }

    try {

        const client =
            getSupabaseClient();

        const jobRecord = {

            user_id:
                currentUser.id,

            title:
                title,

            company:
                company,

            location:
                location,

            type:
                type,

            description:
                description,

            apply_link:
                applyLink,

            created_at:
                new Date()
                    .toISOString()

        };

        let result =
            await client
                .from("jobs")
                .insert(
                    jobRecord
                )
                .select()
                .maybeSingle();

        if (
            result.error &&
            String(
                result.error.message
            )
                .toLowerCase()
                .includes("created_at")
        ) {

            delete jobRecord.created_at;

            result =
                await client
                    .from("jobs")
                    .insert(
                        jobRecord
                    )
                    .select()
                    .maybeSingle();
        }

        if (result.error) {
            throw result.error;
        }

        form.reset();

        const jobCompany =
            $("job-company");

        if (jobCompany) {

            jobCompany.value =
                getCompanyName();
        }

        showAlert(
            "Job published successfully.",
            "success"
        );

        await loadCompanyJobs();

        await loadApplications();

    } catch (error) {

        console.error(
            "Publish job error:",
            error
        );

        showAlert(
            error.message ||
            "Unable to publish the job.",
            "error"
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Publish Job";
        }
    }
}


/* =========================================================
   APPLICATIONS
   ========================================================= */

async function loadApplications() {

    const client =
        getSupabaseClient();

    const tbody =
        $("applications-table-body");

    if (
        !tbody ||
        !currentUser
    ) {
        return;
    }

    try {

        const jobs =
            window.__companyJobs ||
            [];

        const jobIds =
            jobs
                .map(
                    job => job.id
                )
                .filter(Boolean);

        if (!jobIds.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="empty-state"
                    >
                        No applications yet.
                    </td>
                </tr>
            `;

            setText(
                "applications-count",
                "0"
            );

            return;
        }

        const result =
            await client
                .from("applications")
                .select("*")
                .in(
                    "job_id",
                    jobIds
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (result.error) {
            throw result.error;
        }

        const applications =
            result.data ||
            [];

        setText(
            "applications-count",
            applications.length
        );

        renderApplications(
            applications,
            jobs
        );

    } catch (error) {

        console.error(
            "Applications loading error:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="empty-state"
                >
                    Applications could not be loaded.
                </td>
            </tr>
        `;
    }
}


/* =========================================================
   RENDER APPLICATIONS
   ========================================================= */

function renderApplications(
    applications,
    jobs
) {

    const tbody =
        $("applications-table-body");

    if (!tbody) {
        return;
    }

    if (!applications.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="empty-state"
                >
                    No applications yet.
                </td>
            </tr>
        `;

        return;
    }

    const jobsMap =
        new Map(
            jobs.map(
                job => [
                    String(job.id),
                    job
                ]
            )
        );

    tbody.innerHTML =
        applications
            .map(
                application => {

                    const job =
                        jobsMap.get(
                            String(
                                application
                                    .job_id
                            )
                        );

                    const candidate =
                        application
                            .candidate_name ||
                        application.name ||
                        application.email ||
                        application.user_id ||
                        "Candidate";

                    const jobTitle =
                        job?.title ||
                        application.job_title ||
                        "Job";

                    const status =
                        String(
                            application.status ||
                            "pending"
                        ).toLowerCase();

                    const safeStatus =
                        [
                            "pending",
                            "approved",
                            "rejected"
                        ].includes(status)
                            ? status
                            : "pending";

                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    candidate
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    jobTitle
                                )}
                            </td>

                            <td>

                                <span
                                    class="status ${safeStatus}"
                                >
                                    ${escapeHtml(
                                        capitalize(
                                            safeStatus
                                        )
                                    )}
                                </span>

                            </td>

                            <td>
                                ${escapeHtml(
                                    formatDate(
                                        application
                                            .created_at
                                    )
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");
}


/* =========================================================
   COMPANY PROFILE SAVE
   ========================================================= */

async function saveCompanyProfile(
    event
) {

    event.preventDefault();

    if (!currentUser) {
        return;
    }

    const button =
        $("save-profile-button");

    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Saving...";
    }

    try {

        const form =
            event.currentTarget;

        const formData =
            new FormData(form);

        const companyName =
            String(
                formData.get(
                    "company_name"
                ) ||
                ""
            ).trim();

        const website =
            String(
                formData.get(
                    "website"
                ) ||
                ""
            ).trim();

        const location =
            String(
                formData.get(
                    "location"
                ) ||
                ""
            ).trim();

        const linkedin =
            String(
                formData.get(
                    "linkedin"
                ) ||
                ""
            ).trim();

        const description =
            String(
                formData.get(
                    "description"
                ) ||
                ""
            ).trim();

        const client =
            getSupabaseClient();

        const record = {

            user_id:
                currentUser.id,

            company_name:
                companyName,

            website:
                website,

            location:
                location,

            linkedin:
                linkedin,

            description:
                description,

            updated_at:
                new Date()
                    .toISOString()

        };

        let result =
            await client
                .from("company_profiles")
                .upsert(
                    record,
                    {
                        onConflict:
                            "user_id"
                    }
                )
                .select()
                .maybeSingle();

        if (
            result.error &&
            String(
                result.error.message
            )
                .toLowerCase()
                .includes("updated_at")
        ) {

            delete record.updated_at;

            result =
                await client
                    .from("company_profiles")
                    .upsert(
                        record,
                        {
                            onConflict:
                                "user_id"
                        }
                    )
                    .select()
                    .maybeSingle();
        }

        if (result.error) {
            throw result.error;
        }

        currentCompanyProfile =
            result.data ||
            record;

        renderCompanyInformation();

        showAlert(
            "Company profile saved successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Company profile error:",
            error
        );

        showAlert(
            error.message ||
            "Unable to save company profile.",
            "error"
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Save Profile";
        }
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

    const button =
        $("logout-button");

    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Signing out...";
    }

    try {

        const client =
            getSupabaseClient();

        await client.auth.signOut();

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
   LOGOUT BUTTON CREATION
   ========================================================= */

function ensureLogoutButton() {

    let button =
        $("logout-button");

    if (button) {

        button.classList.add(
            "web3jobs-logout-button"
        );

        return button;
    }

    injectSubscriptionStyles();

    button =
        document.createElement(
            "button"
        );

    button.id =
        "logout-button";

    button.type =
        "button";

    button.className =
        "web3jobs-logout-button";

    button.innerHTML =
        `
            <span aria-hidden="true">
                ↪
            </span>
            <span>
                Logout
            </span>
        `;

    button.addEventListener(
        "click",
        logout
    );

    const possibleContainers = [
        ".dashboard-header-actions",
        ".header-actions",
        ".topbar-actions",
        ".dashboard-topbar",
        ".topbar",
        "header"
    ];

    let inserted =
        false;

    for (
        const selector of possibleContainers
    ) {

        const container =
            document.querySelector(
                selector
            );

        if (!container) {
            continue;
        }

        container.appendChild(
            button
        );

        inserted =
            true;

        break;
    }

    if (!inserted) {

        button.style.position =
            "fixed";

        button.style.top =
            "18px";

        button.style.right =
            "18px";

        button.style.zIndex =
            "9998";

        document.body.appendChild(
            button
        );
    }

    return button;
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    ensureLogoutButton();

    const logoutButton =
        $("logout-button");

    if (
        logoutButton &&
        logoutButton.dataset.bound !== "true"
    ) {

        logoutButton.dataset.bound =
            "true";

        logoutButton.addEventListener(
            "click",
            logout
        );
    }

    const postJobForm =
        $("post-job-form");

    if (
        postJobForm &&
        postJobForm.dataset.bound !== "true"
    ) {

        postJobForm.dataset.bound =
            "true";

        postJobForm.addEventListener(
            "submit",
            handlePostJob
        );
    }

    const profileForm =
        $("company-profile-form");

    if (
        profileForm &&
        profileForm.dataset.bound !== "true"
    ) {

        profileForm.dataset.bound =
            "true";

        profileForm.addEventListener(
            "submit",
            saveCompanyProfile
        );
    }

    const connectButton =
        $("connect-wallet-button");

    if (
        connectButton &&
        connectButton.dataset.bound !== "true"
    ) {

        connectButton.dataset.bound =
            "true";

        connectButton.addEventListener(
            "click",
            connectWallet
        );
    }

    const payButton =
        $("pay-usdt-button");

    if (
        payButton &&
        payButton.dataset.bound !== "true"
    ) {

        payButton.dataset.bound =
            "true";

        payButton.addEventListener(
            "click",
            payUSDT
        );
    }

    const cancelButton =
        $("cancel-payment-button");

    if (
        cancelButton &&
        cancelButton.dataset.bound !== "true"
    ) {

        cancelButton.dataset.bound =
            "true";

        cancelButton.addEventListener(
            "click",
            cancelPayment
        );
    }

    ensurePaymentUI();

    setupPlanButtons();
}


/* =========================================================
   WALLET LISTENERS
   ========================================================= */

function setupWalletListeners() {

    if (!window.ethereum) {
        return;
    }

    if (
        window.__web3jobsWalletListenersAttached
    ) {

        return;
    }

    window.__web3jobsWalletListenersAttached =
        true;

    window.ethereum.on(
        "accountsChanged",
        accounts => {

            connectedWallet =
                accounts &&
                accounts.length
                    ? accounts[0]
                    : null;

            const button =
                $("connect-wallet-button");

            if (button) {

                button.textContent =
                    connectedWallet
                        ? `Connected ${shortAddress(
                            connectedWallet
                        )}`
                        : "Connect Wallet";
            }

            updatePaymentModalState(
                connectedWallet
            );

            if (connectedWallet) {

                setPaymentModalStatus(
                    `Wallet connected: ${shortAddress(
                        connectedWallet
                    )}`
                );
            }
        }
    );

    window.ethereum.on(
        "chainChanged",
        () => {

            connectedWallet =
                null;

            const button =
                $("connect-wallet-button");

            if (button) {

                button.textContent =
                    "Connect Wallet";
            }

            updatePaymentModalState(
                null
            );

            setPaymentModalStatus(
                "Network changed. Please connect your wallet again."
            );
        }
    );
}


/* =========================================================
   DATE HELPERS
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
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


function capitalize(value) {

    if (!value) {
        return "";
    }

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );
}


/* =========================================================
   AUTH STATE MONITOR
   ========================================================= */

function setupAuthListener() {

    const client =
        getSupabaseClient();

    client.auth.onAuthStateChange(
        async event => {

            if (
                event ===
                "SIGNED_OUT"
            ) {

                window.location.href =
                    "login.html";
            }
        }
    );
}


/* =========================================================
   MAIN INITIALIZATION
   ========================================================= */

async function initializeCompanyDashboard() {

    if (dashboardInitialized) {
        return;
    }

    dashboardInitialized =
        true;

    showDashboardLoading(
        "Please wait while we prepare your workspace."
    );

    try {

        getSupabaseClient();

        currentUser =
            await getCurrentUser();

        if (!currentUser) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        500
                    )
            );

            currentUser =
                await getCurrentUser();
        }

        if (!currentUser) {

            window.location.href =
                "login.html";

            return;
        }

        try {

            await loadProfile();

        } catch (profileError) {

            console.error(
                "Profile loading error:",
                profileError
            );
        }

        if (
            currentProfile &&
            currentProfile.role &&
            !isCompanyProfile(
                currentProfile
            )
        ) {

            console.warn(
                "Current profile role is not company:",
                currentProfile.role
            );
        }

        await loadCompanyProfile();

        renderCompanyInformation();

        await loadSubscription();

        await loadCompanyJobs();

        await loadApplications();

        setupEventListeners();

        setupWalletListeners();

        setupAuthListener();

        renderSubscriptionPromotion();

        hideDashboardLoading();

    } catch (error) {

        console.error(
            "Company dashboard initialization failed:",
            error
        );

        hideDashboardLoading();

        showAlert(
            "Dashboard loaded with limited data. " +
            (
                error.message ||
                ""
            ),
            "error"
        );
    }
}


/* =========================================================
   START
   ========================================================= */

function startCompanyDashboard() {

    initializeCompanyDashboard();
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startCompanyDashboard
    );

} else {

    startCompanyDashboard();
}
