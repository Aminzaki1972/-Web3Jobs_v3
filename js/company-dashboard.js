/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js

   Company Dashboard
   Supabase + Jobs + Applications
   USDT BEP-20 / BNB Smart Chain

   Payment wallet:
   0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36

   BSC USDT:
   0x55d398326f99059fF775485246999027B3197955

   Plans:
   Free         = 2 jobs / month
   Starter      = $19 / month = 5 jobs
   Professional = $49 / month = 20 jobs
   Enterprise   = $99 / month = Unlimited
   ========================================================= */

"use strict";

(() => {

    /* =====================================================
       CONFIG
       ===================================================== */

    const CONFIG = {

        bscChainId: "0x38",

        bscChainName: "BNB Smart Chain",

        paymentWallet:
            "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",

        usdtContract:
            "0x55d398326f99059fF775485246999027B3197955",

        usdtDecimals: 18,

        bscRpc:
            "https://bsc-dataseed.binance.org/",

        bscExplorer:
            "https://bscscan.com/tx/",

        plans: {

            free: {
                code: "free",
                name: "Free",
                price: 0,
                limit: 2,
                days: 30
            },

            starter: {
                code: "starter",
                name: "Starter",
                price: 19,
                limit: 5,
                days: 30
            },

            professional: {
                code: "professional",
                name: "Professional",
                price: 49,
                limit: 20,
                days: 30
            },

            enterprise: {
                code: "enterprise",
                name: "Enterprise",
                price: 99,
                limit: null,
                days: 30
            }

        }

    };


    /* =====================================================
       STATE
       ===================================================== */

    let sb = null;

    let user = null;

    let profile = null;

    let jobs = [];

    let applications = [];

    let currentPlan =
        CONFIG.plans.free;

    let selectedPlan = null;

    let wallet = null;

    let paymentBusy = false;


    /* =====================================================
       HELPERS
       ===================================================== */

    const $ = id =>
        document.getElementById(id);


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function setText(id, value) {

        const el = $(id);

        if (el) {
            el.textContent =
                value ?? "";
        }
    }


    function notify(
        message,
        type = "success"
    ) {

        if (
            typeof window.showDashboardAlert ===
            "function"
        ) {

            window.showDashboardAlert(
                message,
                type
            );

            return;
        }


        if (
            typeof window.showAlert ===
            "function"
        ) {

            window.showAlert(
                message,
                type
            );

            return;
        }


        alert(message);
    }


    function shortAddress(address) {

        if (!address) {
            return "Not connected";
        }

        return (
            address.slice(0, 6) +
            "..." +
            address.slice(-4)
        );
    }


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


    function getPlan(code) {

        const key =
            String(
                code || "free"
            ).toLowerCase();

        return (
            CONFIG.plans[key] ||
            CONFIG.plans.free
        );
    }


    function companyName() {

        return (
            profile?.company_name ||
            user?.user_metadata?.company_name ||
            user?.user_metadata?.name ||
            "Company"
        );
    }


    function monthlyJobs() {

        const now =
            new Date();

        return jobs.filter(job => {

            const date =
                new Date(
                    job.created_at
                );

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return false;
            }

            return (
                date.getUTCFullYear() ===
                    now.getUTCFullYear() &&
                date.getUTCMonth() ===
                    now.getUTCMonth()
            );

        }).length;
    }


    /* =====================================================
       LOADING
       ===================================================== */

    function showLoading() {

        const loading =
            $("loading-spinner");

        const dashboard =
            $("dashboard-content");

        if (loading) {
            loading.style.display =
                "flex";
        }

        if (dashboard) {
            dashboard.style.display =
                "none";
        }
    }


    function showDashboard() {

        const loading =
            $("loading-spinner");

        const dashboard =
            $("dashboard-content");

        if (loading) {
            loading.style.display =
                "none";
        }

        if (dashboard) {
            dashboard.style.display =
                "block";
        }
    }


    /* =====================================================
       SUPABASE
       ===================================================== */

    function getSupabase() {

        if (sb) {
            return sb;
        }


        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient ===
                "function"
        ) {

            sb =
                window.Web3JobsSupabase
                    .getClient();

            return sb;
        }


        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from ===
                "function"
        ) {

            sb =
                window.supabaseClient;

            return sb;
        }


        if (
            window.supabase &&
            typeof window.supabase.createClient ===
                "function" &&
            window.SUPABASE_URL &&
            window.SUPABASE_ANON_KEY
        ) {

            sb =
                window.supabase.createClient(
                    window.SUPABASE_URL,
                    window.SUPABASE_ANON_KEY
                );

            return sb;
        }


        throw new Error(
            "Supabase client is not initialized."
        );
    }


    /* =====================================================
       AUTH
       ===================================================== */

    async function verifyCompanyAccess() {

        const client =
            getSupabase();

        const {
            data,
            error
        } =
            await client.auth.getUser();

        if (error) {
            throw error;
        }

        user =
            data?.user || null;

        if (!user) {

            location.replace(
                "login.html"
            );

            return false;
        }


        if (
            window.Web3JobsAuth &&
            typeof window.Web3JobsAuth.getAccountRole ===
                "function"
        ) {

            try {

                const role =
                    await window.Web3JobsAuth
                        .getAccountRole();

                if (
                    role &&
                    String(role).toLowerCase() !==
                        "company"
                ) {

                    location.replace(
                        "dashboard.html"
                    );

                    return false;
                }

            } catch (error) {

                console.warn(
                    "Role check skipped:",
                    error.message
                );
            }
        }


        return true;
    }


    /* =====================================================
       COMPANY PROFILE
       ===================================================== */

    async function loadCompanyProfile() {

        try {

            const {
                data,
                error
            } =
                await getSupabase()
                    .from("company_profiles")
                    .select("*")
                    .eq(
                        "user_id",
                        user.id
                    )
                    .maybeSingle();

            if (error) {

                console.warn(
                    "Company profile:",
                    error.message
                );

                profile = null;

            } else {

                profile =
                    data || null;
            }

        } catch (error) {

            console.warn(
                "Company profile:",
                error
            );

            profile = null;
        }


        ensureGovernorateField();

        renderCompanyProfile();
    }


    function ensureGovernorateField() {

        const existing =
            document.querySelector(
                "#company-governorate,[name='governorate']"
            );

        if (existing) {
            return;
        }


        const form =
            document.querySelector(
                "#company-profile-form"
            );

        if (!form) {
            return;
        }


        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "form-group";

        wrapper.innerHTML = `
            <label for="company-governorate">
                Governorate
            </label>

            <select
                id="company-governorate"
                name="governorate"
            >
                <option value="">
                    Select Governorate
                </option>
                <option>Cairo</option>
                <option>Giza</option>
                <option>Alexandria</option>
                <option>Dakahlia</option>
                <option>Red Sea</option>
                <option>Beheira</option>
                <option>Fayoum</option>
                <option>Gharbia</option>
                <option>Ismailia</option>
                <option>Menofia</option>
                <option>Minya</option>
                <option>Qalyubia</option>
                <option>New Valley</option>
                <option>Suez</option>
                <option>Aswan</option>
                <option>Assiut</option>
                <option>Beni Suef</option>
                <option>Port Said</option>
                <option>Damietta</option>
                <option>Sharkia</option>
                <option>South Sinai</option>
                <option>Kafr El Sheikh</option>
                <option>Matrouh</option>
                <option>Luxor</option>
                <option>Qena</option>
            </select>
        `;


        const groups =
            form.querySelectorAll(
                ".form-group"
            );

        if (groups.length) {

            groups[
                Math.min(
                    2,
                    groups.length - 1
                )
            ].after(wrapper);

        } else {

            form.prepend(wrapper);
        }
    }


    function renderCompanyProfile() {

        const name =
            companyName();

        setText(
            "company-name",
            name
        );

        setText(
            "sidebar-company-name",
            name
        );


        const fields = {

            "company-name-input":
                profile?.company_name || "",

            "company-website":
                profile?.website || "",

            "company-location":
                profile?.location || "",

            "company-linkedin":
                profile?.linkedin || "",

            "company-description":
                profile?.description || "",

            "company-governorate":
                profile?.governorate || ""

        };


        Object.keys(fields)
            .forEach(id => {

                const element =
                    $(id);

                if (element) {

                    element.value =
                        fields[id];
                }

            });


        const companyInput =
            $("job-company");

        if (companyInput) {

            companyInput.value =
                name;
        }
    }


    async function saveCompanyProfile(event) {

        event.preventDefault();

        if (!user) {
            return;
        }


        const form =
            event.currentTarget;

        const button =
            form.querySelector(
                "button[type='submit']"
            );


        const get = selector =>
            String(
                form.querySelector(
                    selector
                )?.value || ""
            ).trim();


        const record = {

            user_id:
                user.id,

            company_name:
                get(
                    "[name='company_name'],#company-name-input"
                ),

            website:
                get(
                    "[name='website'],#company-website"
                ),

            location:
                get(
                    "[name='location'],#company-location"
                ),

            governorate:
                get(
                    "[name='governorate'],#company-governorate"
                ),

            linkedin:
                get(
                    "[name='linkedin'],#company-linkedin"
                ),

            description:
                get(
                    "[name='description'],#company-description"
                )
        };


        try {

            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "Saving...";
            }


            const {
                data,
                error
            } =
                await getSupabase()
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


            if (error) {
                throw error;
            }


            profile =
                data || record;

            renderCompanyProfile();


            notify(
                "Company profile saved successfully.",
                "success"
            );

        } catch (error) {

            console.error(
                "Save company profile:",
                error
            );

            notify(
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


    /* =====================================================
       JOBS
       ===================================================== */

    async function loadJobs() {

        const container =
            $("company-jobs-list");


        if (container) {

            container.innerHTML = `
                <div class="empty-state">
                    Loading your jobs...
                </div>
            `;
        }


        try {

            const {
                data,
                error
            } =
                await getSupabase()
                    .from("jobs")
                    .select("*")
                    .eq(
                        "user_id",
                        user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (error) {
                throw error;
            }


            jobs =
                data || [];

            renderJobs();

            await loadSubscription();

            await loadApplications();

        } catch (error) {

            console.error(
                "Jobs loading:",
                error
            );

            jobs = [];


            if (container) {

                container.innerHTML = `
                    <div class="empty-state">
                        Unable to load your jobs.
                    </div>
                `;
            }


            renderSubscription();
        }
    }


    function renderJobs() {

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
            jobs.map(job => `

                <div class="job-card">

                    <div class="job-card-header">

                        <div>

                            <div class="job-title">
                                ${escapeHtml(
                                    job.title ||
                                    "Untitled Job"
                                )}
                            </div>

                            <div class="job-meta">

                                <span>
                                    ${escapeHtml(
                                        job.company ||
                                        companyName()
                                    )}
                                </span>

                                <span>
                                    ${escapeHtml(
                                        job.location ||
                                        "Remote"
                                    )}
                                </span>

                                <span>
                                    ${escapeHtml(
                                        job.type ||
                                        "Full-time"
                                    )}
                                </span>

                                <span>
                                    ${formatDate(
                                        job.created_at
                                    )}
                                </span>

                            </div>

                        </div>

                        <div class="job-actions">

                            <button
                                type="button"
                                class="small-button delete"
                                data-delete-job="${escapeHtml(
                                    job.id
                                )}"
                            >
                                Delete
                            </button>

                        </div>

                    </div>

                    <div class="job-description">
                        ${escapeHtml(
                            job.description || ""
                        )}
                    </div>

                </div>

            `).join("");


        container
            .querySelectorAll(
                "[data-delete-job]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () =>
                        deleteJob(
                            button.dataset
                                .deleteJob
                        )
                );

            });
    }


    async function deleteJob(id) {

        if (
            !confirm(
                "Are you sure you want to delete this job?"
            )
        ) {
            return;
        }


        try {

            const {
                error
            } =
                await getSupabase()
                    .from("jobs")
                    .delete()
                    .eq(
                        "id",
                        id
                    )
                    .eq(
                        "user_id",
                        user.id
                    );


            if (error) {
                throw error;
            }


            notify(
                "Job deleted successfully.",
                "success"
            );


            await loadJobs();

        } catch (error) {

            console.error(
                "Delete job:",
                error
            );


            notify(
                error.message ||
                "Unable to delete job.",
                "error"
            );
        }
    }


    async function publishJob(event) {

        event.preventDefault();


        if (!user) {

            notify(
                "Please log in again.",
                "error"
            );

            return;
        }


        const form =
            event.currentTarget;


        const get = name =>
            String(
                form.querySelector(
                    `[name="${name}"]`
                )?.value || ""
            ).trim();


        const title =
            get("title");

        const company =
            get("company") ||
            companyName();

        const location =
            get("location");

        const type =
            get("type");

        const description =
            get("description");

        const applyLink =
            get("apply_link");


        if (
            !title ||
            !description ||
            !applyLink
        ) {

            notify(
                "Please complete all required job fields.",
                "error"
            );

            return;
        }


        if (
            currentPlan.limit !== null &&
            monthlyJobs() >=
                currentPlan.limit
        ) {

            notify(
                `You reached the ${currentPlan.name} plan limit of ${currentPlan.limit} jobs this month.`,
                "error"
            );

            openPlans();

            return;
        }


        const button =
            form.querySelector(
                "button[type='submit']"
            );


        try {

            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "Publishing...";
            }


            const {
                error
            } =
                await getSupabase()
                    .from("jobs")
                    .insert({

                        user_id:
                            user.id,

                        title,

                        company,

                        location,

                        type,

                        description,

                        apply_link:
                            applyLink

                    });


            if (error) {
                throw error;
            }


            form.reset();


            const companyInput =
                $("job-company");

            if (companyInput) {

                companyInput.value =
                    companyName();
            }


            notify(
                "Job published successfully.",
                "success"
            );


            await loadJobs();

        } catch (error) {

            console.error(
                "Publish job:",
                error
            );


            notify(
                error.message ||
                "Unable to publish job.",
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


    /* =====================================================
       APPLICATIONS
       ===================================================== */

    async function loadApplications() {

        const tbody =
            $("applications-table-body");

        if (!tbody) {
            return;
        }


        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    Loading applications...
                </td>
            </tr>
        `;


        try {

            let result =
                await getSupabase()
                    .from("applications")
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


            if (result.error) {

                result =
                    await getSupabase()
                        .from("applications")
                        .select("*")
                        .eq(
                            "user_id",
                            user.id
                        )
                        .order(
                            "created_at",
                            {
                                ascending: false
                            }
                        );
            }


            if (result.error) {
                throw result.error;
            }


            applications =
                result.data || [];


            renderApplications();

        } catch (error) {

            console.warn(
                "Applications:",
                error.message
            );


            applications = [];


            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        No applications available.
                    </td>
                </tr>
            `;
        }
    }


    function findJobTitle(application) {

        if (application.job_title) {
            return application.job_title;
        }


        if (application.job?.title) {
            return application.job.title;
        }


        const job =
            jobs.find(
                item =>
                    String(item.id) ===
                    String(
                        application.job_id
                    )
            );


        return job?.title || "Job";
    }


    function renderApplications() {

        const tbody =
            $("applications-table-body");

        if (!tbody) {
            return;
        }


        if (!applications.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        No applications yet.
                    </td>
                </tr>
            `;

            return;
        }


        tbody.innerHTML =
            applications.map(application => {

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


                const candidate =
                    application.candidate_name ||
                    application.name ||
                    application.email ||
                    application.user_email ||
                    "Candidate";


                return `

                    <tr>

                        <td>
                            ${escapeHtml(
                                candidate
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                findJobTitle(
                                    application
                                )
                            )}
                        </td>

                        <td>
                            <span class="status ${safeStatus}">
                                ${escapeHtml(
                                    safeStatus
                                )}
                            </span>
                        </td>

                        <td>
                            ${formatDate(
                                application.created_at
                            )}
                        </td>

                    </tr>

                `;

            }).join("");
    }


    /* =====================================================
       SUBSCRIPTION
       ===================================================== */

    async function loadSubscription() {

        try {

            const {
                data,
                error
            } =
                await getSupabase()
                    .from("subscriptions")
                    .select("*")
                    .eq(
                        "user_id",
                        user.id
                    )
                    .maybeSingle();


            if (error) {
                throw error;
            }


            if (
                data &&
                data.status === "active" &&
                data.expires_at
            ) {

                const expiry =
                    new Date(
                        data.expires_at
                    );


                if (
                    expiry > new Date()
                ) {

                    currentPlan =
                        getPlan(
                            data.plan
                        );

                } else {

                    currentPlan =
                        CONFIG.plans.free;
                }

            } else {

                currentPlan =
                    CONFIG.plans.free;
            }

        } catch (error) {

            console.warn(
                "Subscription loading:",
                error.message
            );

            currentPlan =
                CONFIG.plans.free;
        }


        renderSubscription();
    }


    function renderSubscription() {

        const used =
            monthlyJobs();


        document
            .querySelectorAll(
                ".plan-button"
            )
            .forEach(button => {

                const plan =
                    getPlan(
                        button.dataset.plan
                    );


                button.classList.toggle(
                    "active",
                    currentPlan.code ===
                        plan.code
                );

            });


        const note =
            $("publish-note");


        if (note) {

            if (
                currentPlan.limit ===
                null
            ) {

                note.textContent =
                    `Current plan: ${currentPlan.name}. Unlimited job postings.`;

            } else {

                note.textContent =
                    `Current plan: ${currentPlan.name}. ${used} / ${currentPlan.limit} jobs used this month.`;
            }
        }


        updatePlanButtons();
    }


    function updatePlanButtons() {

        document
            .querySelectorAll(
                "[data-pay-plan]"
            )
            .forEach(button => {

                /*
                 * Important:
                 * Always enable paid plan buttons.
                 * The previous version could inherit
                 * disabled="disabled" from the HTML.
                 */

                button.disabled =
                    false;

                button.removeAttribute(
                    "disabled"
                );

                button.style.pointerEvents =
                    "auto";

                button.style.cursor =
                    "pointer";


                const plan =
                    getPlan(
                        button.dataset.payPlan
                    );


                if (
                    currentPlan.code ===
                    plan.code
                ) {

                    button.textContent =
                        "Current Plan";

                } else {

                    button.textContent =
                        `Choose ${plan.name} & Pay`;
                }

            });
    }


    function openPlans() {

        const section =
            $("subscription-section");

        if (!section) {
            return;
        }


        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    /* =====================================================
       WEB3 WALLET PANEL
       ===================================================== */

    function createWalletPanel() {

        if (
            $("web3jobs-wallet-panel")
        ) {
            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "web3jobs-wallet-style";


        style.textContent = `

            #web3jobs-wallet-panel {

                margin: 0 0 22px;

                padding: 18px;

                border: 1px solid
                    rgba(96,165,250,.25);

                border-radius: 16px;

                background:
                    linear-gradient(
                        135deg,
                        rgba(15,35,57,.98),
                        rgba(7,19,33,.98)
                    );

                box-shadow:
                    0 15px 45px
                    rgba(0,0,0,.18);
            }

            .web3-wallet-title {

                font-size: 15px;

                font-weight: 900;

                color: #fff;

                margin-bottom: 5px;
            }

            .web3-wallet-subtitle {

                color: #8ea3bc;

                font-size: 10px;

                margin-bottom: 14px;
            }

            .web3-wallet-row {

                display: flex;

                align-items: center;

                gap: 10px;

                flex-wrap: wrap;
            }

            .web3-wallet-status {

                flex: 1;

                min-width: 180px;

                padding: 10px 12px;

                border-radius: 9px;

                background: #071321;

                border: 1px solid #1d3652;

                color: #8ea3bc;

                font-size: 10px;
            }

            .web3-wallet-button {

                min-height: 40px;

                padding: 0 17px;

                border: 0;

                border-radius: 9px;

                background:
                    linear-gradient(
                        135deg,
                        #2563eb,
                        #1d4ed8
                    );

                color: #fff;

                font-size: 10px;

                font-weight: 900;

                cursor: pointer;
            }

            .web3-wallet-button:hover {

                filter:
                    brightness(1.12);
            }

            .web3-wallet-button:disabled {

                opacity: .55;

                cursor: not-allowed;
            }

            .web3-wallet-address {

                color: #6ee7b7;

                font-family: monospace;

                word-break: break-all;
            }

            .web3-wallet-network {

                margin-top: 8px;

                color: #6ee7b7;

                font-size: 9px;
            }

        `;


        document.head.appendChild(
            style
        );


        const panel =
            document.createElement(
                "div"
            );


        panel.id =
            "web3jobs-wallet-panel";


        panel.innerHTML = `

            <div class="web3-wallet-title">
                Web3 Wallet
            </div>

            <div class="web3-wallet-subtitle">
                Connect your wallet to pay for company subscriptions using USDT on BNB Smart Chain.
            </div>

            <div class="web3-wallet-row">

                <div
                    class="web3-wallet-status"
                    id="dashboard-wallet-status"
                >
                    Wallet not connected.
                </div>

                <button
                    type="button"
                    class="web3-wallet-button"
                    id="dashboard-connect-wallet"
                >
                    Connect Wallet
                </button>

            </div>

            <div
                class="web3-wallet-network"
                id="dashboard-wallet-network"
            ></div>

        `;


        const dashboard =
            $("dashboard-content");


        const target =
            dashboard ||
            document.querySelector(
                "main"
            ) ||
            document.body;


        target.prepend(panel);


        $("dashboard-connect-wallet")
            ?.addEventListener(
                "click",
                async () => {

                    await connectWallet();

                }
            );


        updateDashboardWalletUI();
    }


    function updateDashboardWalletUI() {

        const status =
            $("dashboard-wallet-status");

        const button =
            $("dashboard-connect-wallet");

        const network =
            $("dashboard-wallet-network");


        if (!status || !button) {
            return;
        }


        if (!window.ethereum) {

            status.textContent =
                "No Web3 wallet detected.";

            button.textContent =
                "Install / Open Wallet";

            button.disabled =
                false;

            if (network) {

                network.textContent =
                    "MetaMask or another compatible Web3 wallet is required.";
            }

            return;
        }


        if (!wallet) {

            status.textContent =
                "Wallet not connected.";

            button.textContent =
                "Connect Wallet";

            button.disabled =
                false;

            if (network) {
                network.textContent =
                    "";
            }

            return;
        }


        status.innerHTML =
            `
                Connected:
                <span class="web3-wallet-address">
                    ${escapeHtml(
                        shortAddress(wallet)
                    )}
                </span>
            `;


        button.textContent =
            "Wallet Connected";


        button.disabled =
            false;


        if (network) {

            network.textContent =
                "Network: BNB Smart Chain";
        }
    }


    /* =====================================================
       PAYMENT MODAL
       ===================================================== */

    function createPaymentModal() {

        if (
            $("web3jobs-payment-modal")
        ) {
            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "web3jobs-payment-style";


        style.textContent = `

            #web3jobs-payment-modal {

                position: fixed;

                inset: 0;

                z-index: 100000;

                display: none;

                align-items: center;

                justify-content: center;

                padding: 20px;

                background:
                    rgba(0,0,0,.76);

                backdrop-filter:
                    blur(8px);
            }

            #web3jobs-payment-modal.active {

                display: flex;
            }

            .payment-modal-card {

                width: min(
                    100%,
                    510px
                );

                max-height: 90vh;

                overflow-y: auto;

                padding: 24px;

                border: 1px solid #203b59;

                border-radius: 18px;

                background:
                    linear-gradient(
                        145deg,
                        #0d1d31,
                        #071321
                    );

                box-shadow:
                    0 30px 100px
                    rgba(0,0,0,.55);
            }

            .payment-modal-header {

                display: flex;

                align-items: center;

                justify-content:
                    space-between;

                gap: 15px;

                margin-bottom: 20px;
            }

            .payment-modal-title {

                font-size: 19px;

                font-weight: 900;

                color: #fff;
            }

            .payment-close {

                width: 34px;

                height: 34px;

                border: 1px solid #294663;

                border-radius: 8px;

                background: #0a1829;

                color: #fff;

                cursor: pointer;

                font-size: 20px;
            }

            .payment-plan-box {

                padding: 16px;

                margin-bottom: 15px;

                border: 1px solid #203b59;

                border-radius: 12px;

                background: #091827;
            }

            .payment-plan-name {

                font-size: 15px;

                font-weight: 900;

                color: #fff;
            }

            .payment-plan-price {

                margin-top: 4px;

                color: #6ee7b7;

                font-size: 13px;

                font-weight: 800;
            }

            .payment-network {

                margin-top: 6px;

                color: #8ea3bc;

                font-size: 9px;
            }

            .payment-wallet-box {

                padding: 14px;

                margin-bottom: 15px;

                border:
                    1px solid
                    rgba(110,231,183,.25);

                border-radius: 11px;

                background:
                    rgba(110,231,183,.045);
            }

            .payment-wallet-label {

                margin-bottom: 7px;

                color: #8ea3bc;

                font-size: 9px;

                font-weight: 800;

                text-transform: uppercase;

                letter-spacing: .5px;
            }

            .payment-wallet-address {

                overflow-wrap: anywhere;

                color: #6ee7b7;

                font-family: monospace;

                font-size: 10px;

                line-height: 1.6;
            }

            .payment-warning {

                padding: 11px;

                margin-bottom: 15px;

                border:
                    1px solid
                    rgba(251,191,36,.2);

                border-radius: 9px;

                background:
                    rgba(251,191,36,.05);

                color: #fcd34d;

                font-size: 9px;

                line-height: 1.6;
            }

            .payment-wallet-status {

                padding: 11px;

                margin-bottom: 12px;

                border: 1px solid #182d47;

                border-radius: 9px;

                background: #071321;

                color: #8ea3bc;

                font-size: 9px;

                line-height: 1.6;
            }

            .payment-main-button {

                width: 100%;

                min-height: 46px;

                border: 0;

                border-radius: 9px;

                background:
                    linear-gradient(
                        135deg,
                        #1c765a,
                        #175a47
                    );

                color: #fff;

                font-size: 11px;

                font-weight: 900;

                cursor: pointer;
            }

            .payment-main-button:hover {

                filter:
                    brightness(1.1);
            }

            .payment-main-button:disabled {

                opacity: .55;

                cursor: not-allowed;
            }

            .payment-copy {

                width: 100%;

                min-height: 38px;

                margin-top: 8px;

                border: 1px solid #294663;

                border-radius: 9px;

                background: #0d1d31;

                color: #fff;

                font-size: 9px;

                font-weight: 800;

                cursor: pointer;
            }

            .payment-tx {

                margin-top: 15px;

                padding: 12px;

                border-radius: 9px;

                background: #071321;

                color: #8ea3bc;

                font-size: 9px;

                line-height: 1.7;

                word-break: break-word;
            }

            .payment-tx a {

                color: #60a5fa;

            }

        `;


        document.head.appendChild(
            style
        );


        const modal =
            document.createElement(
                "div"
            );


        modal.id =
            "web3jobs-payment-modal";


        modal.innerHTML = `

            <div
                class="payment-modal-card"
                role="dialog"
                aria-modal="true"
            >

                <div class="payment-modal-header">

                    <div class="payment-modal-title">
                        Complete Subscription
                    </div>

                    <button
                        type="button"
                        class="payment-close"
                        id="payment-close-button"
                    >
                        ×
                    </button>

                </div>


                <div class="payment-plan-box">

                    <div
                        class="payment-plan-name"
                        id="payment-plan-name"
                    >
                        Plan
                    </div>

                    <div
                        class="payment-plan-price"
                        id="payment-plan-price"
                    >
                        $0 USDT
                    </div>

                    <div class="payment-network">
                        USDT BEP-20 on BNB Smart Chain
                    </div>

                </div>


                <div class="payment-wallet-box">

                    <div class="payment-wallet-label">
                        Receiving Wallet
                    </div>

                    <div
                        class="payment-wallet-address"
                        id="payment-receiving-wallet"
                    >
                        ${escapeHtml(
                            CONFIG.paymentWallet
                        )}
                    </div>

                    <button
                        type="button"
                        class="payment-copy"
                        id="payment-copy-wallet"
                    >
                        Copy Receiving Address
                    </button>

                </div>


                <div class="payment-warning">

                    Send only USDT BEP-20 on BNB Smart Chain
                    to the receiving address above.

                    Sending another token or using another
                    network may permanently lose your funds.

                </div>


                <div
                    class="payment-wallet-status"
                    id="payment-wallet-status"
                >
                    Wallet not connected.
                </div>


                <button
                    type="button"
                    class="payment-main-button"
                    id="payment-main-button"
                >
                    Connect Wallet
                </button>


                <div
                    class="payment-tx"
                    id="payment-tx"
                    style="display:none;"
                ></div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        $("payment-close-button")
            ?.addEventListener(
                "click",
                closePaymentModal
            );


        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    closePaymentModal();
                }
            }
        );


        $("payment-copy-wallet")
            ?.addEventListener(
                "click",
                copyReceivingWallet
            );


        $("payment-main-button")
            ?.addEventListener(
                "click",
                handlePaymentButton
            );
    }


    function openPaymentModal(
        planCode
    ) {

        const plan =
            getPlan(planCode);


        if (
            plan.code === "free"
        ) {

            notify(
                "The Free plan does not require payment.",
                "success"
            );

            return;
        }


        selectedPlan =
            plan;


        createPaymentModal();


        setText(
            "payment-plan-name",
            plan.name
        );


        setText(
            "payment-plan-price",
            `$${plan.price} USDT / month`
        );


        setText(
            "payment-receiving-wallet",
            CONFIG.paymentWallet
        );


        const tx =
            $("payment-tx");


        if (tx) {

            tx.style.display =
                "none";

            tx.innerHTML = "";
        }


        updatePaymentModalState();


        const modal =
            $("web3jobs-payment-modal");


        if (modal) {

            modal.classList.add(
                "active"
            );
        }
    }


    function closePaymentModal() {

        const modal =
            $("web3jobs-payment-modal");


        if (modal) {

            modal.classList.remove(
                "active"
            );
        }
    }


    function updatePaymentModalState() {

        const status =
            $("payment-wallet-status");

        const button =
            $("payment-main-button");


        if (!status || !button) {
            return;
        }


        if (!window.ethereum) {

            status.textContent =
                "No Web3 wallet detected.";

            button.textContent =
                "Open / Install Wallet";

            button.disabled =
                false;

            return;
        }


        if (!wallet) {

            status.textContent =
                "Wallet not connected. Click below to connect.";

            button.textContent =
                "Connect Wallet";

            button.disabled =
                false;

            return;
        }


        status.innerHTML =
            `
                Connected wallet:
                <strong>
                    ${escapeHtml(
                        shortAddress(wallet)
                    )}
                </strong>
            `;


        button.textContent =
            `Pay $${selectedPlan?.price || 0} USDT`;


        button.disabled =
            false;
    }


    /* =====================================================
       WALLET
       ===================================================== */

    async function connectWallet() {

        if (!window.ethereum) {

            notify(
                "Please open the website inside MetaMask or another compatible Web3 wallet.",
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


            wallet =
                accounts?.[0] || null;


            if (!wallet) {

                throw new Error(
                    "No wallet account was returned."
                );
            }


            await ensureBscNetwork();


            localStorage.setItem(
                "web3jobs_connected_wallet",
                wallet
            );


            updateDashboardWalletUI();

            updatePaymentModalState();


            notify(
                `Wallet connected: ${shortAddress(wallet)}`,
                "success"
            );


            return wallet;

        } catch (error) {

            console.error(
                "Wallet connection:",
                error
            );


            if (
                error?.code === 4001
            ) {

                notify(
                    "Wallet connection was rejected.",
                    "error"
                );

            } else {

                notify(
                    error.message ||
                    "Unable to connect wallet.",
                    "error"
                );
            }


            return null;
        }
    }


    async function restoreWallet() {

        if (!window.ethereum) {
            return;
        }


        try {

            const accounts =
                await window.ethereum.request({
                    method:
                        "eth_accounts"
                });


            if (
                accounts &&
                accounts.length
            ) {

                wallet =
                    accounts[0];

                updateDashboardWalletUI();
            }

        } catch (error) {

            console.warn(
                "Wallet restore:",
                error.message
            );
        }
    }


    async function ensureBscNetwork() {

        if (!window.ethereum) {

            throw new Error(
                "Web3 wallet is not available."
            );
        }


        const chainId =
            await window.ethereum.request({
                method:
                    "eth_chainId"
            });


        if (
            String(chainId).toLowerCase() ===
            CONFIG.bscChainId
        ) {

            return true;
        }


        try {

            await window.ethereum.request({
                method:
                    "wallet_switchEthereumChain",

                params: [
                    {
                        chainId:
                            CONFIG.bscChainId
                    }
                ]
            });

        } catch (error) {

            if (
                error?.code === 4902
            ) {

                await window.ethereum.request({

                    method:
                        "wallet_addEthereumChain",

                    params: [
                        {
                            chainId:
                                CONFIG.bscChainId,

                            chainName:
                                CONFIG.bscChainName,

                            nativeCurrency: {

                                name:
                                    "BNB",

                                symbol:
                                    "BNB",

                                decimals:
                                    18
                            },

                            rpcUrls: [
                                CONFIG.bscRpc
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


        return true;
    }


    /* =====================================================
       USDT
       ===================================================== */

    function amountToTokenUnits(
        amount
    ) {

        const value =
            String(amount);


        const parts =
            value.split(".");


        const whole =
            parts[0] || "0";


        const decimals =
            (
                parts[1] || ""
            )
                .padEnd(
                    CONFIG.usdtDecimals,
                    "0"
                )
                .slice(
                    0,
                    CONFIG.usdtDecimals
                );


        return BigInt(
            whole + decimals
        ).toString();
    }


    function encodeUsdtTransfer(
        recipient,
        amount
    ) {

        const methodId =
            "a9059cbb";


        const address =
            recipient
                .toLowerCase()
                .replace(
                    "0x",
                    ""
                )
                .padStart(
                    64,
                    "0"
                );


        const value =
            BigInt(amount)
                .toString(16)
                .padStart(
                    64,
                    "0"
                );


        return (
            "0x" +
            methodId +
            address +
            value
        );
    }


    async function sendUsdtPayment(
        plan
    ) {

        if (!window.ethereum) {

            throw new Error(
                "No compatible Web3 wallet was found."
            );
        }


        if (!wallet) {

            const connected =
                await connectWallet();


            if (!connected) {

                throw new Error(
                    "Wallet connection was not completed."
                );
            }
        }


        await ensureBscNetwork();


        const accounts =
            await window.ethereum.request({
                method:
                    "eth_accounts"
            });


        wallet =
            accounts?.[0] ||
            wallet;


        if (!wallet) {

            throw new Error(
                "No connected wallet account was found."
            );
        }


        const amount =
            amountToTokenUnits(
                plan.price
            );


        const data =
            encodeUsdtTransfer(
                CONFIG.paymentWallet,
                amount
            );


        /*
         * This is the actual USDT BEP-20 transfer.
         *
         * From:
         * connected company wallet
         *
         * To:
         * CONFIG.usdtContract
         *
         * Recipient encoded inside data:
         * CONFIG.paymentWallet
         */

        const txHash =
            await window.ethereum.request({

                method:
                    "eth_sendTransaction",

                params: [
                    {

                        from:
                            wallet,

                        to:
                            CONFIG.usdtContract,

                        data

                    }
                ]
            });


        return txHash;
    }


    /* =====================================================
       PAYMENT DATABASE
       ===================================================== */

    async function savePaymentRecord(
        plan,
        txHash
    ) {

        try {

            const {
                error
            } =
                await getSupabase()
                    .from("payments")
                    .insert({

                        user_id:
                            user.id,

                        wallet_address:
                            wallet,

                        plan:
                            plan.code,

                        plan_name:
                            plan.name,

                        amount:
                            plan.price,

                        currency:
                            "USDT",

                        network:
                            "BEP-20",

                        chain:
                            "BNB Smart Chain",

                        tx_hash:
                            txHash,

                        receiving_wallet:
                            CONFIG.paymentWallet,

                        status:
                            "pending"

                    });


            if (error) {

                console.warn(
                    "Payment record:",
                    error.message
                );

                return false;
            }


            return true;

        } catch (error) {

            console.warn(
                "Payment record:",
                error.message
            );

            return false;
        }
    }


    async function saveSubscription(
        plan,
        txHash
    ) {

        const start =
            new Date();


        const expires =
            new Date(
                start.getTime() +
                plan.days *
                24 *
                60 *
                60 *
                1000
            );


        try {

            const {
                error
            } =
                await getSupabase()
                    .from("subscriptions")
                    .upsert(

                        {

                            user_id:
                                user.id,

                            plan:
                                plan.code,

                            plan_name:
                                plan.name,

                            price:
                                plan.price,

                            currency:
                                "USDT",

                            network:
                                "BEP-20",

                            wallet_address:
                                wallet,

                            transaction_hash:
                                txHash,

                            starts_at:
                                start.toISOString(),

                            expires_at:
                                expires.toISOString(),

                            status:
                                "active"

                        },

                        {
                            onConflict:
                                "user_id"
                        }

                    );


            if (error) {

                console.warn(
                    "Subscription:",
                    error.message
                );

                return false;
            }


            return true;

        } catch (error) {

            console.warn(
                "Subscription:",
                error.message
            );

            return false;
        }
    }


    /* =====================================================
       PAYMENT PROCESS
       ===================================================== */

    async function handlePaymentButton() {

        if (paymentBusy) {
            return;
        }


        if (!selectedPlan) {

            notify(
                "Please select a subscription plan.",
                "error"
            );

            return;
        }


        if (
            selectedPlan.price <= 0
        ) {

            notify(
                "The Free plan does not require payment.",
                "success"
            );

            return;
        }


        paymentBusy =
            true;


        const button =
            $("payment-main-button");


        try {

            /*
             * Connect wallet first.
             */

            if (!wallet) {

                if (button) {

                    button.disabled =
                        true;

                    button.textContent =
                        "Connecting Wallet...";
                }


                const connected =
                    await connectWallet();


                if (!connected) {
                    return;
                }
            }


            await ensureBscNetwork();


            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "Confirm Payment...";
            }


            /*
             * Send USDT.
             */

            const txHash =
                await sendUsdtPayment(
                    selectedPlan
                );


            if (!txHash) {

                throw new Error(
                    "No transaction hash was returned."
                );
            }


            /*
             * Save payment as pending.
             */

            await savePaymentRecord(
                selectedPlan,
                txHash
            );


            /*
             * IMPORTANT:
             *
             * This saves the subscription locally
             * after transaction submission.
             *
             * For production, the backend should
             * verify the transaction on BSC before
             * marking it active.
             */

            await saveSubscription(
                selectedPlan,
                txHash
            );


            currentPlan =
                selectedPlan;


            renderSubscription();


            if (button) {

                button.textContent =
                    "Payment Submitted";
            }


            const txBox =
                $("payment-tx");


            if (txBox) {

                txBox.style.display =
                    "block";


                txBox.innerHTML = `

                    <strong>
                        Payment submitted successfully.
                    </strong>

                    <br><br>

                    Transaction:

                    <a
                        href="${CONFIG.bscExplorer}${encodeURIComponent(
                            txHash
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ${escapeHtml(
                            txHash
                        )}
                    </a>

                    <br><br>

                    The transaction is recorded as
                    pending verification.

                `;
            }


            notify(
                `Your ${selectedPlan.name} payment was submitted successfully.`,
                "success"
            );


        } catch (error) {

            console.error(
                "Payment error:",
                error
            );


            if (
                error?.code === 4001
            ) {

                notify(
                    "Transaction was rejected in your wallet.",
                    "error"
                );

            } else {

                notify(
                    error.message ||
                    "Unable to complete the payment.",
                    "error"
                );
            }

        } finally {

            paymentBusy =
                false;


            updatePaymentModalState();
        }
    }


    async function copyReceivingWallet() {

        try {

            await navigator.clipboard.writeText(
                CONFIG.paymentWallet
            );


            notify(
                "Receiving wallet address copied.",
                "success"
            );

        } catch (error) {

            prompt(
                "Copy this receiving wallet address:",
                CONFIG.paymentWallet
            );
        }
    }


    /* =====================================================
       PLAN SELECTION
       ===================================================== */

    function handlePlanSelection(
        planCode
    ) {

        const plan =
            getPlan(planCode);


        if (
            plan.code === "free"
        ) {

            notify(
                "The Free plan does not require payment.",
                "success"
            );

            return;
        }


        openPaymentModal(
            plan.code
        );
    }


    function selectPlan(
        planCode
    ) {

        return handlePlanSelection(
            planCode
        );
    }


    window.handlePlanSelection =
        handlePlanSelection;


    window.selectPlan =
        selectPlan;


    window.connectCompanyWallet =
        connectWallet;


    window.Web3JobsCompanyDashboard = {

        config:
            CONFIG,

        getUser:
            () => user,

        getProfile:
            () => profile,

        getCurrentPlan:
            () => currentPlan,

        connectWallet,

        openPaymentModal,

        handlePlanSelection,

        loadJobs,

        loadApplications,

        publishJob,

        deleteJob

    };


    /* =====================================================
       WALLET EVENTS
       ===================================================== */

    function setupWalletListeners() {

        if (!window.ethereum) {
            return;
        }


        window.ethereum.on(
            "accountsChanged",
            accounts => {

                wallet =
                    accounts?.[0] ||
                    null;


                updateDashboardWalletUI();

                updatePaymentModalState();


                if (!wallet) {

                    notify(
                        "Wallet disconnected.",
                        "error"
                    );
                }

            }
        );


        window.ethereum.on(
            "chainChanged",
            () => {

                updateDashboardWalletUI();

                updatePaymentModalState();

            }
        );
    }


    /* =====================================================
       PLAN BUTTONS
       ===================================================== */

    function setupPlanButtons() {

        document
            .querySelectorAll(
                ".plan-button"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const plan =
                            button.dataset.plan;


                        const details =
                            document.querySelector(
                                `[data-plan-details="${plan}"]`
                            );


                        const alreadyOpen =
                            details?.classList.contains(
                                "active"
                            );


                        document
                            .querySelectorAll(
                                ".plan-button"
                            )
                            .forEach(item => {

                                item.classList.remove(
                                    "active"
                                );

                            });


                        document
                            .querySelectorAll(
                                ".plan-details"
                            )
                            .forEach(item => {

                                item.classList.remove(
                                    "active"
                                );

                            });


                        if (
                            details &&
                            !alreadyOpen
                        ) {

                            button.classList.add(
                                "active"
                            );


                            details.classList.add(
                                "active"
                            );


                            setTimeout(
                                () => {

                                    details.scrollIntoView(
                                        {
                                            behavior:
                                                "smooth",

                                            block:
                                                "nearest"
                                        }
                                    );

                                },
                                50
                            );

                        }

                    }
                );

            });
    }


    /* =====================================================
       PAYMENT BUTTONS
       ===================================================== */

    function setupPaymentButtons() {

        document
            .querySelectorAll(
                "[data-pay-plan]"
            )
            .forEach(button => {

                /*
                 * Force-enable payment buttons.
                 */

                button.disabled =
                    false;

                button.removeAttribute(
                    "disabled"
                );

                button.style.pointerEvents =
                    "auto";


                /*
                 * Avoid duplicate listeners.
                 */

                if (
                    button.dataset.web3Bound ===
                    "true"
                ) {
                    return;
                }


                button.dataset.web3Bound =
                    "true";


                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        const planCode =
                            button.dataset.payPlan;


                        if (!planCode) {

                            notify(
                                "Subscription plan is not configured.",
                                "error"
                            );

                            return;
                        }


                        handlePlanSelection(
                            planCode
                        );

                    }
                );

            });


        updatePlanButtons();
    }


    /* =====================================================
       FORMS
       ===================================================== */

    function setupForms() {

        const postForm =
            $("post-job-form");


        if (postForm) {

            postForm.addEventListener(
                "submit",
                publishJob
            );
        }


        const profileForm =
            $("company-profile-form");


        if (profileForm) {

            profileForm.addEventListener(
                "submit",
                saveCompanyProfile
            );
        }
    }


    /* =====================================================
       SIDEBAR
       ===================================================== */

    function setupSidebar() {

        const sidebar =
            $("dashboard-sidebar");

        const menuButton =
            $("mobile-menu-button");

        const overlay =
            $("sidebar-overlay");

        const logoutButton =
            $("sidebar-logout-button");


        function openSidebar() {

            sidebar?.classList.add(
                "open"
            );

            overlay?.classList.add(
                "active"
            );
        }


        function closeSidebar() {

            sidebar?.classList.remove(
                "open"
            );

            overlay?.classList.remove(
                "active"
            );
        }


        menuButton?.addEventListener(
            "click",
            openSidebar
        );


        overlay?.addEventListener(
            "click",
            closeSidebar
        );


        document
            .querySelectorAll(
                '.sidebar-link[href^="#"]'
            )
            .forEach(link => {

                link.addEventListener(
                    "click",
                    closeSidebar
                );

            });


        logoutButton?.addEventListener(
            "click",
            async () => {

                try {

                    if (
                        typeof window.logout ===
                        "function"
                    ) {

                        await window.logout();

                    } else {

                        await getSupabase()
                            .auth
                            .signOut();
                    }

                } catch (error) {

                    console.error(
                        "Logout:",
                        error
                    );

                } finally {

                    location.replace(
                        "login.html"
                    );
                }

            }
        );
    }


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        showLoading();


        try {

            const allowed =
                await verifyCompanyAccess();


            if (!allowed) {
                return;
            }


            await loadCompanyProfile();


            /*
             * Create Web3 interface directly
             * on the company dashboard.
             */

            createWalletPanel();

            createPaymentModal();


            setupPlanButtons();

            setupPaymentButtons();

            setupForms();

            setupSidebar();

            setupWalletListeners();


            await restoreWallet();


            await loadJobs();


            await loadSubscription();


            renderSubscription();


            showDashboard();


            /*
             * Re-run payment button setup after
             * dashboard is visible in case the HTML
             * was rendered dynamically.
             */

            setupPaymentButtons();


        } catch (error) {

            console.error(
                "Company dashboard initialization:",
                error
            );


            const message =
                error?.message ||
                "Unable to load the company dashboard.";


            const loading =
                $("loading-spinner");


            if (loading) {

                loading.innerHTML = `

                    <div class="loading-card">

                        <div class="loading-logo">
                            W3
                        </div>

                        <h2>
                            Dashboard Error
                        </h2>

                        <p>
                            ${escapeHtml(
                                message
                            )}
                        </p>

                        <button
                            type="button"
                            style="
                                margin-top:20px;
                                min-height:40px;
                                padding:10px 18px;
                                border:0;
                                border-radius:9px;
                                background:#1c765a;
                                color:#fff;
                                font-weight:800;
                                cursor:pointer;
                            "
                            onclick="location.reload()"
                        >
                            Reload Dashboard
                        </button>

                    </div>
                `;


                loading.style.display =
                    "flex";
            }
        }
    }


    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }


})();
