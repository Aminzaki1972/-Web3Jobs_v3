/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js

   Company Dashboard
   Supabase + Jobs + Applications
   USDT BEP-20 / BNB Smart Chain
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

    let currentPlan = CONFIG.plans.free;
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
            el.textContent = value ?? "";
        }
    }


    function notify(message, type = "success") {

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

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
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
            String(code || "free").toLowerCase();

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

        const now = new Date();

        return jobs.filter(job => {

            const date =
                new Date(job.created_at);

            if (Number.isNaN(date.getTime())) {
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
            loading.style.display = "flex";
        }

        if (dashboard) {
            dashboard.style.display = "none";
        }
    }


    function showDashboard() {

        const loading =
            $("loading-spinner");

        const dashboard =
            $("dashboard-content");

        if (loading) {
            loading.style.display = "none";
        }

        if (dashboard) {
            dashboard.style.display = "block";
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
                window.Web3JobsSupabase.getClient();

            return sb;
        }


        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from ===
                "function"
        ) {

            sb = window.supabaseClient;

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

        const client = getSupabase();

        const {
            data,
            error
        } =
            await client.auth.getUser();

        if (error) {
            throw error;
        }

        user = data?.user || null;


        if (!user) {

            location.replace("login.html");

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

                profile = data || null;
            }

        } catch (error) {

            console.warn(
                "Company profile load:",
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
                "#company-governorate, [name='governorate']"
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
            document.createElement("div");

        wrapper.className = "form-group";


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

                <option value="Cairo">Cairo</option>
                <option value="Giza">Giza</option>
                <option value="Alexandria">Alexandria</option>
                <option value="Dakahlia">Dakahlia</option>
                <option value="Red Sea">Red Sea</option>
                <option value="Beheira">Beheira</option>
                <option value="Fayoum">Fayoum</option>
                <option value="Gharbia">Gharbia</option>
                <option value="Ismailia">Ismailia</option>
                <option value="Menofia">Menofia</option>
                <option value="Minya">Minya</option>
                <option value="Qalyubia">Qalyubia</option>
                <option value="New Valley">New Valley</option>
                <option value="Suez">Suez</option>
                <option value="Aswan">Aswan</option>
                <option value="Assiut">Assiut</option>
                <option value="Beni Suef">Beni Suef</option>
                <option value="Port Said">Port Said</option>
                <option value="Damietta">Damietta</option>
                <option value="Sharkia">Sharkia</option>
                <option value="South Sinai">South Sinai</option>
                <option value="Kafr El Sheikh">
                    Kafr El Sheikh
                </option>
                <option value="Matrouh">Matrouh</option>
                <option value="Luxor">Luxor</option>
                <option value="Qena">Qena</option>
            </select>
        `;


        const groups =
            form.querySelectorAll(".form-group");


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

        const name = companyName();

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


        Object.entries(fields).forEach(
            ([id, value]) => {

                const element = $(id);

                if (element) {
                    element.value = value;
                }
            }
        );


        const companyInput =
            $("job-company");

        if (companyInput) {
            companyInput.value = name;
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
                form.querySelector(selector)
                    ?.value || ""
            ).trim();


        const record = {

            user_id: user.id,

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

                button.disabled = true;
                button.textContent = "Saving...";
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


            profile = data || record;

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

                button.disabled = false;
                button.textContent = "Save Profile";
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


            jobs = data || [];

            renderJobs();
            renderSubscription();

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
                            button.dataset.deleteJob
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
                    .eq("id", id)
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

                button.disabled = true;
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

                button.disabled = false;
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
                <td
                    colspan="4"
                    class="empty-state"
                >
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

                console.warn(
                    "company_id query failed:",
                    result.error.message
                );


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
                "Applications loading:",
                error.message
            );


            applications = [];


            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="empty-state"
                    >
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
                            ${escapeHtml(candidate)}
                        </td>

                        <td>
                            ${escapeHtml(
                                findJobTitle(
                                    application
                                )
                            )}
                        </td>

                        <td>
                            <span
                                class="status ${safeStatus}"
                            >
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

    function renderSubscription() {

        const used =
            monthlyJobs();


        document
            .querySelectorAll(".plan-button")
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
                currentPlan.limit === null
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
            .querySelectorAll("[data-pay-plan]")
            .forEach(button => {

                const plan =
                    getPlan(
                        button.dataset.payPlan
                    );


                button.textContent =
                    currentPlan.code ===
                        plan.code
                        ? "Current Plan"
                        : "Choose Plan & Pay";
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
       PAYMENT MODAL
       ===================================================== */

    function createPaymentModal() {

        if (
            $("web3jobs-payment-modal")
        ) {
            return;
        }


        const style =
            document.createElement("style");


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
                background: rgba(0,0,0,.72);
                backdrop-filter: blur(8px);
            }

            #web3jobs-payment-modal.active {
                display: flex;
            }

            .payment-modal-card {
                width: min(100%, 500px);
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
                justify-content: space-between;
                gap: 15px;
                margin-bottom: 20px;
            }

            .payment-modal-title {
                font-size: 19px;
                font-weight: 900;
            }

            .payment-close {
                width: 34px;
                height: 34px;
                border: 1px solid #294663;
                border-radius: 8px;
                background: #0a1829;
                color: #fff;
                cursor: pointer;
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
                font-weight: 850;
            }

            .payment-plan-price {
                margin-top: 4px;
                color: #6ee7b7;
                font-size: 12px;
                font-weight: 800;
            }

            .payment-network {
                margin-top: 5px;
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
                font-weight: 700;
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
                padding: 10px;
                margin-bottom: 12px;
                border: 1px solid #182d47;
                border-radius: 9px;
                background: #071321;
                color: #8ea3bc;
                font-size: 9px;
            }

            .payment-main-button {
                width: 100%;
                min-height: 44px;
                border: 0;
                border-radius: 9px;
                background:
                    linear-gradient(
                        135deg,
                        #1c765a,
                        #175a47
                    );
                color: #fff;
                font-size: 10px;
                font-weight: 850;
                cursor: pointer;
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
                font-weight: 750;
                cursor: pointer;
            }

            .payment-tx {
                margin-top: 15px;
                padding: 12px;
                border-radius: 9px;
                background: #071321;
                color: #8ea3bc;
                font-size: 9px;
                line-height: 1.6;
                word-break: break-word;
            }

            .payment-tx a {
                color: #60a5fa;
            }

        `;


        document.head.appendChild(style);


        const modal =
            document.createElement("div");


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


        document.body.appendChild(modal);


        $("payment-close-button")
            ?.addEventListener(
                "click",
                closePaymentModal
            );


        modal.addEventListener(
            "click",
            event => {

                if (event.target === modal) {
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


    function openPaymentModal(planCode) {

        const plan =
            getPlan(planCode);


        if (plan.code === "free") {

            currentPlan =
                CONFIG.plans.free;

            renderSubscription();

            notify(
                "You are already using the Free plan.",
                "success"
            );

            return;
        }


        selectedPlan = plan;

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

            tx.style.display = "none";
            tx.innerHTML = "";
        }


        updatePaymentModalState();


        const modal =
            $("web3jobs-payment-modal");


        if (modal) {
            modal.classList.add("active");
        }
    }


    function closePaymentModal() {

        const modal =
            $("web3jobs-payment-modal");

        if (modal) {
            modal.classList.remove("active");
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

            wallet = null;

            status.textContent =
                "No Web3 wallet detected. Please install MetaMask or another compatible wallet.";

            button.textContent =
                "Wallet Not Available";

            button.disabled = true;

            return;
        }


        if (!wallet) {

            status.textContent =
                "Wallet not connected. Click below to connect.";

            button.textContent =
                "Connect Wallet";

            button.disabled = false;

            return;
        }


        status.innerHTML =
            `Connected wallet: <strong>${escapeHtml(
                shortAddress(wallet)
            )}</strong>`;


        button.textContent =
            `Pay $${selectedPlan?.price || 0} USDT`;

        button.disabled = false;
    }


    /* =====================================================
       WALLET
       ===================================================== */

    async function connectWallet() {

        if (!window.ethereum) {

            notify(
                "Please install MetaMask or a compatible Web3 wallet.",
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

            updatePaymentModalState();

            return wallet;

        } catch (error) {

            console.error(
                "Wallet connection:",
                error
            );


            if (error?.code === 4001) {

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

            if (error?.code === 4902) {

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
                                name: "BNB",
                                symbol: "BNB",
                                decimals: 18
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
       USDT PAYMENT
       ===================================================== */

    function encodeUsdtTransfer(
        recipient,
        amount
    ) {

        const methodId = "a9059cbb";


        const cleanAddress =
            recipient
                .toLowerCase()
                .replace("0x", "");


        if (
            !/^[0-9a-f]{40}$/i.test(
                cleanAddress
            )
        ) {

            throw new Error(
                "Invalid receiving wallet address."
            );
        }


        const paddedAddress =
            cleanAddress.padStart(
                64,
                "0"
            );


        const amountHex =
            BigInt(amount)
                .toString(16)
                .padStart(
                    64,
                    "0"
                );


        return (
            "0x" +
            methodId +
            paddedAddress +
            amountHex
        );
    }


    function amountToTokenUnits(amount) {

        const value =
            Number(amount);


        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            throw new Error(
                "Invalid payment amount."
            );
        }


        const fixed =
            value.toFixed(
                CONFIG.usdtDecimals
            );


        const parts =
            fixed.split(".");


        const whole =
            parts[0] || "0";


        const decimal =
            (
                parts[1] || ""
            ).padEnd(
                CONFIG.usdtDecimals,
                "0"
            );


        return BigInt(
            whole + decimal
        ).toString();
    }


    async function sendUsdtPayment(plan) {

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
            accounts?.[0] || wallet;


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


        return await window.ethereum.request({

            method:
                "eth_sendTransaction",

            params: [
                {
                    from: wallet,

                    to: CONFIG.usdtContract,

                    data
                }
            ]

        });
    }


    /* =====================================================
       PAYMENT RECORD
       ===================================================== */

    async function savePaymentRecord(
        plan,
        txHash
    ) {

        try {

            const result =
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


            if (result.error) {

                console.warn(
                    "Payment record:",
                    result.error.message
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

            const result =
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


            if (result.error) {

                console.warn(
                    "Subscription:",
                    result.error.message
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


        if (selectedPlan.price <= 0) {

            currentPlan =
                CONFIG.plans.free;

            renderSubscription();

            closePaymentModal();

            return;
        }


        paymentBusy = true;


        const button =
            $("payment-main-button");


        try {

            if (!wallet) {

                const connected =
                    await connectWallet();

                if (!connected) {
                    return;
                }
            }


            if (button) {

                button.disabled = true;
                button.textContent =
                    "Confirm Payment...";
            }


            const txHash =
                await sendUsdtPayment(
                    selectedPlan
                );


            if (!txHash) {

                throw new Error(
                    "No transaction hash was returned."
                );
            }


            if (button) {
                button.textContent =
                    "Payment Sent";
            }


            await savePaymentRecord(
                selectedPlan,
                txHash
            );


            await saveSubscription(
                selectedPlan,
                txHash
            );


            currentPlan =
                selectedPlan;


            renderSubscription();


            const txBox =
                $("payment-tx");


            if (txBox) {

                txBox.style.display = "block";


                txBox.innerHTML = `
                    Payment transaction submitted successfully.<br>
                    Transaction:
                    <a
                        href="${CONFIG.bscExplorer}${encodeURIComponent(
                            txHash
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ${escapeHtml(
                            shortAddress(txHash)
                        )}
                    </a>
                `;
            }


            notify(
                `Payment submitted successfully. Your ${selectedPlan.name} plan is now selected.`,
                "success"
            );

        } catch (error) {

            console.error(
                "Payment error:",
                error
            );


            if (error?.code === 4001) {

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

            paymentBusy = false;


            if (button) {

                button.disabled = false;

                updatePaymentModalState();
            }
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

    function handlePlanSelection(planCode) {

        const plan =
            getPlan(planCode);


        if (plan.code === "free") {

            currentPlan =
                CONFIG.plans.free;

            renderSubscription();

            return;
        }


        openPaymentModal(plan.code);
    }


    function selectPlan(planCode) {

        handlePlanSelection(planCode);
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
                    accounts?.[0] || null;


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

                updatePaymentModalState();
            }
        );
    }


    /* =====================================================
       PLAN BUTTONS
       ===================================================== */

    function setupPlanButtons() {

        document
            .querySelectorAll(".plan-button")
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
                            .forEach(item =>
                                item.classList.remove(
                                    "active"
                                )
                            );


                        document
                            .querySelectorAll(
                                ".plan-details"
                            )
                            .forEach(item =>
                                item.classList.remove(
                                    "active"
                                )
                            );


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

                button.addEventListener(
                    "click",
                    () => {

                        handlePlanSelection(
                            button.dataset
                                .payPlan
                        );
                    }
                );
            });
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

            sidebar?.classList.add("open");

            overlay?.classList.add("active");
        }


        function closeSidebar() {

            sidebar?.classList.remove("open");

            overlay?.classList.remove("active");
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


            createPaymentModal();

            setupPlanButtons();

            setupPaymentButtons();

            setupForms();

            setupSidebar();

            setupWalletListeners();


            await loadJobs();


            renderSubscription();


            showDashboard();

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
                            ${escapeHtml(message)}
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

                loading.style.display = "flex";
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
