/* =========================================================
   Web3Jobs
   File: js/company-dashboard.js
   Company Dashboard
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const COMPANY_DASHBOARD_CONFIG = {
    receiverAddress:
        "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",

    chainId: 56,

    chainName:
        "BNB Smart Chain",

    nativeSymbol:
        "BNB",

    explorer:
        "https://bscscan.com",

    plans: {
        monthly: {
            id: "monthly",
            name: "Monthly",
            price: 10,
            currency: "USDT",
            durationDays: 30
        },

        quarterly: {
            id: "quarterly",
            name: "Quarterly",
            price: 25,
            currency: "USDT",
            durationDays: 90
        },

        yearly: {
            id: "yearly",
            name: "Yearly",
            price: 80,
            currency: "USDT",
            durationDays: 365
        }
    }
};


/* =========================================================
   BSC TOKEN CONFIGURATION
   ========================================================= */

const BSC_TOKENS = {
    USDT: {
        symbol: "USDT",

        decimals: 18,

        address:
            "0x55d398326f99059fF775485246999027B3197955"
    }
};


/* =========================================================
   STATE
   ========================================================= */

const dashboardState = {
    user: null,

    profile: null,

    jobs: [],

    applications: [],

    walletAddress: null,

    selectedPlan: null,

    paymentPending: false,

    initialized: false
};


/* =========================================================
   DOM HELPERS
   ========================================================= */

function byId(id) {
    return document.getElementById(id);
}


function qs(selector) {
    return document.querySelector(selector);
}


function qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
}


/* =========================================================
   SAFE TEXT
   ========================================================= */

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function showMessage(message, type = "info") {
    let box = byId("dashboard-message");

    if (!box) {
        box = document.createElement("div");

        box.id = "dashboard-message";

        box.style.position = "fixed";
        box.style.left = "50%";
        box.style.bottom = "24px";
        box.style.transform = "translateX(-50%)";
        box.style.zIndex = "999999";
        box.style.width = "min(92%, 520px)";
        box.style.padding = "14px 18px";
        box.style.borderRadius = "12px";
        box.style.border = "1px solid #294563";
        box.style.background = "#0d1b2e";
        box.style.color = "#f5f8ff";
        box.style.fontSize = "13px";
        box.style.fontWeight = "700";
        box.style.boxShadow = "0 20px 50px rgba(0,0,0,.35)";
        box.style.textAlign = "center";

        document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "success") {
        box.style.borderColor = "#6ee7b7";
    } else if (type === "error") {
        box.style.borderColor = "#f87171";
    } else if (type === "warning") {
        box.style.borderColor = "#fbbf24";
    } else {
        box.style.borderColor = "#60a5fa";
    }

    clearTimeout(showMessage.timer);

    showMessage.timer = setTimeout(() => {
        box.remove();
    }, 6000);
}


/* =========================================================
   LOADING
   ========================================================= */

function showLoading(message = "Loading dashboard...") {
    const spinner = byId("loading-spinner");

    if (!spinner) {
        return;
    }

    spinner.style.display = "flex";

    const text =
        spinner.querySelector(".loading-card p");

    if (text) {
        text.textContent = message;
    }
}


function hideLoading() {
    const spinner = byId("loading-spinner");

    if (spinner) {
        spinner.style.display = "none";
    }
}


/* =========================================================
   SUPABASE
   ========================================================= */

function getSupabaseClient() {
    if (
        typeof window !== "undefined" &&
        window.supabaseClient
    ) {
        return window.supabaseClient;
    }

    if (
        typeof window !== "undefined" &&
        window.supabase
    ) {
        if (
            typeof window.supabase.from === "function"
        ) {
            return window.supabase;
        }
    }

    return null;
}


/* =========================================================
   AUTH SESSION
   ========================================================= */

async function getCurrentUser() {
    const client = getSupabaseClient();

    if (!client) {
        throw new Error(
            "Supabase client is not initialized."
        );
    }

    const result =
        await client.auth.getSession();

    if (result.error) {
        throw result.error;
    }

    const session = result.data?.session;

    if (!session?.user) {
        return null;
    }

    return session.user;
}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadCompanyProfile() {
    const client = getSupabaseClient();

    if (!client || !dashboardState.user) {
        return null;
    }

    const userId =
        dashboardState.user.id;

    let profile = null;

    try {
        const result =
            await client
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

        if (!result.error && result.data) {
            profile = result.data;
        }
    } catch (error) {
        console.warn(
            "Profile lookup failed:",
            error
        );
    }

    if (!profile) {
        try {
            const result =
                await client
                    .from("company_profiles")
                    .select("*")
                    .eq("id", userId)
                    .maybeSingle();

            if (!result.error && result.data) {
                profile = result.data;
            }
        } catch (error) {
            console.warn(
                "Company profile lookup failed:",
                error
            );
        }
    }

    dashboardState.profile =
        profile || {};

    updateCompanyIdentity();

    return dashboardState.profile;
}


/* =========================================================
   COMPANY IDENTITY
   ========================================================= */

function updateCompanyIdentity() {
    const profile =
        dashboardState.profile || {};

    const user =
        dashboardState.user || {};

    const metadata =
        user.user_metadata || {};

    const companyName =
        profile.company_name ||
        profile.name ||
        profile.full_name ||
        metadata.company_name ||
        metadata.name ||
        "Company";

    const email =
        profile.email ||
        user.email ||
        "";

    const companyNameElements = [
        byId("company-name"),
        byId("company-name-header"),
        byId("company-title")
    ];

    companyNameElements.forEach(element => {
        if (element) {
            element.textContent = companyName;
        }
    });

    const emailElement =
        byId("company-email");

    if (emailElement) {
        emailElement.textContent = email;
    }

    const welcomeTitle =
        byId("welcome-company-name");

    if (welcomeTitle) {
        welcomeTitle.textContent =
            companyName;
    }
}


/* =========================================================
   LOAD JOBS
   ========================================================= */

async function loadCompanyJobs() {
    const client = getSupabaseClient();

    if (!client || !dashboardState.user) {
        return [];
    }

    const userId =
        dashboardState.user.id;

    try {
        let result =
            await client
                .from("jobs")
                .select("*")
                .eq("company_id", userId)
                .order("created_at", {
                    ascending: false
                });

        if (!result.error) {
            dashboardState.jobs =
                result.data || [];

            return dashboardState.jobs;
        }
    } catch (error) {
        console.warn(
            "Company job query failed:",
            error
        );
    }

    try {
        let result =
            await client
                .from("jobs")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", {
                    ascending: false
                });

        if (!result.error) {
            dashboardState.jobs =
                result.data || [];

            return dashboardState.jobs;
        }
    } catch (error) {
        console.warn(
            "Alternative job query failed:",
            error
        );
    }

    dashboardState.jobs = [];

    return [];
}


/* =========================================================
   LOAD APPLICATIONS
   ========================================================= */

async function loadCompanyApplications() {
    const client = getSupabaseClient();

    if (!client || !dashboardState.jobs.length) {
        dashboardState.applications = [];
        return [];
    }

    const jobIds =
        dashboardState.jobs
            .map(job => job.id)
            .filter(Boolean);

    if (!jobIds.length) {
        dashboardState.applications = [];
        return [];
    }

    try {
        const result =
            await client
                .from("applications")
                .select("*")
                .in("job_id", jobIds);

        if (result.error) {
            console.warn(
                "Applications query failed:",
                result.error
            );

            dashboardState.applications = [];

            return [];
        }

        dashboardState.applications =
            result.data || [];

        return dashboardState.applications;
    } catch (error) {
        console.warn(
            "Applications loading failed:",
            error
        );

        dashboardState.applications = [];

        return [];
    }
}


/* =========================================================
   STATS
   ========================================================= */

function updateStats() {
    const jobs =
        dashboardState.jobs || [];

    const applications =
        dashboardState.applications || [];

    const publishedJobs =
        jobs.length;

    const activeJobs =
        jobs.filter(job => {
            const status =
                String(job.status || "active")
                    .toLowerCase();

            return (
                status !== "closed" &&
                status !== "inactive" &&
                status !== "expired"
            );
        }).length;

    const totalApplications =
        applications.length;

    const mappings = [
        {
            ids: [
                "published-jobs",
                "publishedJobs",
                "jobs-count"
            ],
            value: publishedJobs
        },
        {
            ids: [
                "active-jobs",
                "activeJobs"
            ],
            value: activeJobs
        },
        {
            ids: [
                "total-applications",
                "totalApplications",
                "applications-count"
            ],
            value: totalApplications
        }
    ];

    mappings.forEach(item => {
        item.ids.forEach(id => {
            const element = byId(id);

            if (element) {
                element.textContent =
                    String(item.value);
            }
        });
    });
}


/* =========================================================
   JOB RENDERING
   ========================================================= */

function renderJobs() {
    const container =
        byId("company-jobs-list") ||
        byId("jobs-list") ||
        byId("published-jobs-list");

    if (!container) {
        return;
    }

    const jobs =
        dashboardState.jobs || [];

    if (!jobs.length) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>No jobs published yet.</strong>
                <p>Create your first Web3 job opportunity.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        jobs.map(job => {
            const title =
                escapeHtml(
                    job.title || "Untitled Job"
                );

            const company =
                escapeHtml(
                    job.company || ""
                );

            const location =
                escapeHtml(
                    job.location || "Remote"
                );

            const type =
                escapeHtml(
                    job.type || "Full-time"
                );

            const status =
                escapeHtml(
                    job.status || "active"
                );

            return `
                <article class="job-card"
                    data-job-id="${escapeHtml(job.id)}">

                    <div class="job-card-content">

                        <h3>${title}</h3>

                        <p>
                            ${company}
                        </p>

                        <div class="job-meta">
                            <span>${location}</span>
                            <span>${type}</span>
                            <span>${status}</span>
                        </div>

                    </div>

                    <div class="job-actions">

                        <button
                            type="button"
                            class="header-button"
                            data-action="edit-job"
                            data-job-id="${escapeHtml(job.id)}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="header-button logout-button"
                            data-action="delete-job"
                            data-job-id="${escapeHtml(job.id)}"
                        >
                            Delete
                        </button>

                    </div>

                </article>
            `;
        })
        .join("");

    container
        .querySelectorAll("[data-action='delete-job']")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    deleteJob(
                        button.dataset.jobId
                    );
                }
            );
        });

    container
        .querySelectorAll("[data-action='edit-job']")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    editJob(
                        button.dataset.jobId
                    );
                }
            );
        });
}


/* =========================================================
   CREATE JOB
   ========================================================= */

async function addJob(event) {
    if (event) {
        event.preventDefault();
    }

    const client = getSupabaseClient();

    if (!client || !dashboardState.user) {
        showMessage(
            "Authentication is required.",
            "error"
        );

        return;
    }

    const form =
        event?.currentTarget ||
        byId("post-job-form") ||
        byId("job-form");

    if (!form) {
        showMessage(
            "Job form was not found.",
            "error"
        );

        return;
    }

    const formData =
        new FormData(form);

    const title =
        String(
            formData.get("title") ||
            byId("job-title")?.value ||
            ""
        ).trim();

    const company =
        String(
            formData.get("company") ||
            byId("job-company")?.value ||
            dashboardState.profile?.company_name ||
            ""
        ).trim();

    const location =
        String(
            formData.get("location") ||
            byId("job-location")?.value ||
            "Remote"
        ).trim();

    const type =
        String(
            formData.get("type") ||
            byId("job-type")?.value ||
            "Full-time"
        ).trim();

    const description =
        String(
            formData.get("description") ||
            byId("job-description")?.value ||
            ""
        ).trim();

    const skills =
        String(
            formData.get("skills") ||
            byId("job-skills")?.value ||
            ""
        ).trim();

    const salary =
        String(
            formData.get("salary") ||
            byId("job-salary")?.value ||
            ""
        ).trim();

    const applicationUrl =
        String(
            formData.get("application_url") ||
            formData.get("apply_link") ||
            byId("application-url")?.value ||
            byId("apply-link")?.value ||
            ""
        ).trim();

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

    const payload = {
        title,
        company,
        location,
        type,
        description,
        skills,
        salary,
        application_url:
            applicationUrl || null
    };

    const companyId =
        dashboardState.user.id;

    try {
        let result =
            await client
                .from("jobs")
                .insert({
                    ...payload,
                    company_id: companyId
                })
                .select()
                .single();

        if (result.error) {
            result =
                await client
                    .from("jobs")
                    .insert({
                        ...payload,
                        user_id: companyId
                    })
                    .select()
                    .single();
        }

        if (result.error) {
            throw result.error;
        }

        showMessage(
            "Job published successfully.",
            "success"
        );

        form.reset();

        await refreshDashboard();

    } catch (error) {
        console.error(
            "Job creation error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to publish job.",
            "error"
        );
    }
}


/* =========================================================
   EDIT JOB
   ========================================================= */

async function editJob(jobId) {
    const job =
        dashboardState.jobs.find(
            item =>
                String(item.id) ===
                String(jobId)
        );

    if (!job) {
        return;
    }

    const title =
        window.prompt(
            "Job title:",
            job.title || ""
        );

    if (title === null) {
        return;
    }

    const description =
        window.prompt(
            "Job description:",
            job.description || ""
        );

    if (description === null) {
        return;
    }

    const client = getSupabaseClient();

    if (!client) {
        showMessage(
            "Supabase is not available.",
            "error"
        );

        return;
    }

    try {
        const result =
            await client
                .from("jobs")
                .update({
                    title:
                        title.trim(),
                    description:
                        description.trim()
                })
                .eq("id", job.id);

        if (result.error) {
            throw result.error;
        }

        showMessage(
            "Job updated successfully.",
            "success"
        );

        await refreshDashboard();

    } catch (error) {
        console.error(
            "Job update error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to update job.",
            "error"
        );
    }
}


/* =========================================================
   DELETE JOB
   ========================================================= */

async function deleteJob(jobId) {
    const confirmed =
        window.confirm(
            "Delete this job?"
        );

    if (!confirmed) {
        return;
    }

    const client =
        getSupabaseClient();

    if (!client) {
        showMessage(
            "Supabase is not available.",
            "error"
        );

        return;
    }

    try {
        const result =
            await client
                .from("jobs")
                .delete()
                .eq("id", jobId);

        if (result.error) {
            throw result.error;
        }

        showMessage(
            "Job deleted successfully.",
            "success"
        );

        await refreshDashboard();

    } catch (error) {
        console.error(
            "Job deletion error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to delete job.",
            "error"
        );
    }
}


/* =========================================================
   PLAN SELECTION
   ========================================================= */

function selectPlan(planId) {
    const plan =
        COMPANY_DASHBOARD_CONFIG.plans[
            planId
        ];

    if (!plan) {
        showMessage(
            "Invalid subscription plan.",
            "error"
        );

        return;
    }

    dashboardState.selectedPlan =
        plan;

    qsa(
        "[data-plan]"
    ).forEach(card => {
        card.classList.toggle(
            "selected",
            card.dataset.plan ===
                planId
        );
    });

    qsa(
        ".plan-button"
    ).forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.plan ===
                planId
        );
    });

    showMessage(
        `${plan.name} plan selected.`,
        "success"
    );
}


/* =========================================================
   WALLET
   ========================================================= */

function hasEthereumProvider() {
    return (
        typeof window !== "undefined" &&
        typeof window.ethereum !== "undefined"
    );
}


async function connectWallet() {
    if (!hasEthereumProvider()) {
        showMessage(
            "A Web3 wallet is required.",
            "error"
        );

        return null;
    }

    try {
        const accounts =
            await window.ethereum.request({
                method:
                    "eth_requestAccounts"
            });

        const address =
            accounts?.[0];

        if (!address) {
            throw new Error(
                "No wallet account was returned."
            );
        }

        dashboardState.walletAddress =
            address;

        await switchToBsc();

        updateWalletUI();

        showMessage(
            "Wallet connected successfully.",
            "success"
        );

        return address;

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
   SWITCH NETWORK
   ========================================================= */

async function switchToBsc() {
    if (!hasEthereumProvider()) {
        return false;
    }

    const chainId =
        "0x" +
        COMPANY_DASHBOARD_CONFIG.chainId
            .toString(16);

    try {
        await window.ethereum.request({
            method:
                "wallet_switchEthereumChain",
            params: [
                {
                    chainId
                }
            ]
        });

        return true;

    } catch (error) {

        if (error.code === 4902) {

            await window.ethereum.request({
                method:
                    "wallet_addEthereumChain",

                params: [
                    {
                        chainId,

                        chainName:
                            COMPANY_DASHBOARD_CONFIG.chainName,

                        nativeCurrency: {
                            name: "BNB",
                            symbol: "BNB",
                            decimals: 18
                        },

                        rpcUrls: [
                            "https://bsc-dataseed.binance.org"
                        ],

                        blockExplorerUrls: [
                            COMPANY_DASHBOARD_CONFIG.explorer
                        ]
                    }
                ]
            });

            return true;
        }

        throw error;
    }
}


/* =========================================================
   WALLET UI
   ========================================================= */

function updateWalletUI() {
    const address =
        dashboardState.walletAddress;

    const elements = [
        byId("wallet-address"),
        byId("connected-wallet"),
        byId("company-wallet")
    ];

    elements.forEach(element => {
        if (!element) {
            return;
        }

        if (!address) {
            element.textContent =
                "Not connected";

            return;
        }

        element.textContent =
            `${address.slice(0, 6)}...${address.slice(-4)}`;
    });
}


/* =========================================================
   USDT PAYMENT
   ========================================================= */

async function payWithUSDT(planId = null) {
    if (
        planId &&
        COMPANY_DASHBOARD_CONFIG.plans[planId]
    ) {
        selectPlan(planId);
    }

    const plan =
        dashboardState.selectedPlan;

    if (!plan) {
        showMessage(
            "Please select a subscription plan first.",
            "warning"
        );

        return;
    }

    if (!hasEthereumProvider()) {
        showMessage(
            "Please install or open a Web3 wallet.",
            "error"
        );

        return;
    }

    if (
        typeof window.ethers ===
        "undefined"
    ) {
        showMessage(
            "Blockchain library is not available.",
            "error"
        );

        return;
    }

    if (dashboardState.paymentPending) {
        return;
    }

    dashboardState.paymentPending =
        true;

    try {
        const wallet =
            await connectWallet();

        if (!wallet) {
            return;
        }

        await switchToBsc();

        const provider =
            new ethers.BrowserProvider(
                window.ethereum
            );

        const signer =
            await provider.getSigner();

        const network =
            await provider.getNetwork();

        if (
            Number(network.chainId) !==
            COMPANY_DASHBOARD_CONFIG.chainId
        ) {
            throw new Error(
                "Please switch your wallet to BNB Smart Chain."
            );
        }

        const token =
            BSC_TOKENS[plan.currency];

        if (!token) {
            throw new Error(
                "Unsupported payment token."
            );
        }

        const tokenContract =
            new ethers.Contract(
                token.address,

                [
                    "function decimals() view returns (uint8)",
                    "function transfer(address to,uint256 amount) returns (bool)"
                ],

                signer
            );

        let decimals =
            token.decimals;

        try {
            decimals =
                Number(
                    await tokenContract.decimals()
                );
        } catch (error) {
            console.warn(
                "Unable to read token decimals:",
                error
            );
        }

        const amount =
            ethers.parseUnits(
                String(plan.price),
                decimals
            );

        const receiver =
            COMPANY_DASHBOARD_CONFIG
                .receiverAddress;

        if (
            !ethers.isAddress(receiver)
        ) {
            throw new Error(
                "Invalid receiver address."
            );
        }

        const balance =
            await tokenContract.balanceOf
                ? await tokenContract.balanceOf(
                    wallet
                )
                : null;

        if (
            balance !== null &&
            balance < amount
        ) {
            throw new Error(
                "Insufficient USDT balance."
            );
        }

        showMessage(
            "Confirm the payment in your wallet.",
            "warning"
        );

        const transaction =
            await tokenContract.transfer(
                receiver,
                amount
            );

        showMessage(
            "Transaction submitted. Waiting for confirmation...",
            "info"
        );

        const receipt =
            await transaction.wait();

        if (!receipt) {
            throw new Error(
                "Transaction confirmation failed."
            );
        }

        const transactionHash =
            receipt.hash ||
            transaction.hash;

        await recordPayment({
            userId:
                dashboardState.user.id,

            walletAddress:
                wallet,

            planId:
                plan.id,

            amount:
                String(plan.price),

            currency:
                plan.currency,

            transactionHash,

            chainId:
                COMPANY_DASHBOARD_CONFIG.chainId,

            status:
                "pending"
        });

        showMessage(
            "Payment submitted successfully. Subscription verification is pending.",
            "success"
        );

        updatePaymentStatusUI(
            "pending",
            transactionHash
        );

    } catch (error) {
        console.error(
            "USDT payment error:",
            error
        );

        if (
            error?.code ===
            "ACTION_REJECTED"
        ) {
            showMessage(
                "Transaction was rejected.",
                "warning"
            );
        } else {
            showMessage(
                error.message ||
                "Payment failed.",
                "error"
            );
        }

    } finally {
        dashboardState.paymentPending =
            false;
    }
}


/* =========================================================
   RECORD PAYMENT
   ========================================================= */

async function recordPayment(payment) {
    const client =
        getSupabaseClient();

    if (!client) {
        throw new Error(
            "Supabase client is not initialized."
        );
    }

    const possibleTables = [
        "subscription_payments",
        "payments"
    ];

    let lastError = null;

    for (
        const table of possibleTables
    ) {
        try {
            const result =
                await client
                    .from(table)
                    .insert({
                        user_id:
                            payment.userId,

                        wallet_address:
                            payment.walletAddress,

                        plan_id:
                            payment.planId,

                        amount:
                            payment.amount,

                        currency:
                            payment.currency,

                        transaction_hash:
                            payment.transactionHash,

                        chain_id:
                            payment.chainId,

                        status:
                            payment.status
                    });

            if (!result.error) {
                return result.data;
            }

            lastError =
                result.error;

        } catch (error) {
            lastError =
                error;
        }
    }

    if (lastError) {
        throw lastError;
    }

    return null;
}


/* =========================================================
   PAYMENT UI
   ========================================================= */

function updatePaymentStatusUI(
    status,
    transactionHash = ""
) {
    const statusElements =
        [
            byId("payment-status"),
            byId("subscription-status")
        ];

    statusElements.forEach(element => {
        if (!element) {
            return;
        }

        element.textContent =
            status === "active"
                ? "Active"
                : status === "pending"
                    ? "Pending verification"
                    : "Not active";
    });

    const transactionElement =
        byId("transaction-hash");

    if (
        transactionElement &&
        transactionHash
    ) {
        transactionElement.textContent =
            transactionHash;

        transactionElement.href =
            `${COMPANY_DASHBOARD_CONFIG.explorer}/tx/${transactionHash}`;

        transactionElement.target =
            "_blank";

        transactionElement.rel =
            "noopener noreferrer";
    }
}


/* =========================================================
   SUBSCRIPTION BUTTONS
   ========================================================= */

function initializeSubscriptionUI() {
    qsa("[data-plan]").forEach(element => {
        element.addEventListener(
            "click",
            () => {
                selectPlan(
                    element.dataset.plan
                );
            }
        );
    });

    qsa(".plan-button").forEach(button => {
        button.addEventListener(
            "click",
            event => {
                event.preventDefault();

                const planId =
                    button.dataset.plan;

                payWithUSDT(planId);
            }
        );
    });

    qsa(
        "[data-action='connect-wallet']"
    ).forEach(button => {
        button.addEventListener(
            "click",
            connectWallet
        );
    });

    qsa(
        "[data-action='pay-usdt']"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                payWithUSDT(
                    button.dataset.plan ||
                    null
                );
            }
        );
    });
}


/* =========================================================
   FORM INITIALIZATION
   ========================================================= */

function initializeJobForm() {
    const form =
        byId("post-job-form") ||
        byId("job-form");

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
        addJob
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
    }

    window.location.href =
        "login.html";
}


/* =========================================================
   LOGOUT BUTTONS
   ========================================================= */

function initializeLogout() {
    qsa(
        "#logout-button, " +
        ".logout-button[data-action='logout'], " +
        "[data-action='logout']"
    ).forEach(button => {
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
   HEADER LINKS
   ========================================================= */

function initializeNavigation() {
    qsa(
        "[data-dashboard-link]"
    ).forEach(link => {
        link.addEventListener(
            "click",
            event => {
                const target =
                    link.dataset.dashboardLink;

                if (!target) {
                    return;
                }

                event.preventDefault();

                window.location.href =
                    target;
            }
        );
    });
}


/* =========================================================
   REFRESH DASHBOARD
   ========================================================= */

async function refreshDashboard() {
    await loadCompanyJobs();

    await loadCompanyApplications();

    updateStats();

    renderJobs();
}


/* =========================================================
   AUTHORIZATION
   ========================================================= */

async function verifyCompanyAccount() {
    const user =
        dashboardState.user;

    if (!user) {
        return false;
    }

    const profile =
        dashboardState.profile || {};

    const metadata =
        user.user_metadata || {};

    const role =
        String(
            profile.role ||
            metadata.role ||
            metadata.account_type ||
            metadata.accountType ||
            ""
        ).toLowerCase();

    if (
        role &&
        (
            role === "individual" ||
            role === "user" ||
            role === "jobseeker"
        )
    ) {
        return false;
    }

    return true;
}


/* =========================================================
   SHOW DASHBOARD
   ========================================================= */

function showDashboard() {
    const content =
        byId("dashboard-content");

    if (content) {
        content.style.display =
            "block";
    }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeCompanyDashboard() {
    if (
        dashboardState.initialized
    ) {
        return;
    }

    dashboardState.initialized =
        true;

    showLoading(
        "Loading your company workspace..."
    );

    try {
        const client =
            getSupabaseClient();

        if (!client) {
            throw new Error(
                "Supabase client is not initialized."
            );
        }

        const user =
            await getCurrentUser();

        if (!user) {
            window.location.href =
                "login.html";

            return;
        }

        dashboardState.user =
            user;

        await loadCompanyProfile();

        const isCompany =
            await verifyCompanyAccount();

        if (!isCompany) {
            window.location.href =
                "dashboard.html";

            return;
        }

        await refreshDashboard();

        initializeJobForm();

        initializeSubscriptionUI();

        initializeLogout();

        initializeNavigation();

        updateWalletUI();

        showDashboard();

        hideLoading();

    } catch (error) {
        console.error(
            "Company dashboard initialization error:",
            error
        );

        hideLoading();

        showMessage(
            error.message ||
            "Unable to load company dashboard.",
            "error"
        );

        const content =
            byId("dashboard-content");

        if (content) {
            content.style.display =
                "block";
        }
    }
}


/* =========================================================
   WALLET EVENTS
   ========================================================= */

function initializeWalletEvents() {
    if (!hasEthereumProvider()) {
        return;
    }

    window.ethereum.on(
        "accountsChanged",
        accounts => {
            dashboardState.walletAddress =
                accounts?.[0] || null;

            updateWalletUI();
        }
    );

    window.ethereum.on(
        "chainChanged",
        () => {
            updateWalletUI();
        }
    );
}


/* =========================================================
   GLOBAL API
   ========================================================= */

window.companyDashboard = {
    state:
        dashboardState,

    config:
        COMPANY_DASHBOARD_CONFIG,

    loadCompanyProfile,

    loadCompanyJobs,

    loadCompanyApplications,

    refreshDashboard,

    addJob,

    editJob,

    deleteJob,

    selectPlan,

    connectWallet,

    payWithUSDT,

    logoutCompany
};


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initializeWalletEvents();

        initializeCompanyDashboard();
    }
);
