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

        paymentWallet:
            "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",

        usdtContract:
            "0x55d398326f99059fF775485246999027B3197955",

        usdtDecimals: 18,

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
    let currentPlan = CONFIG.plans.free;
    let selectedPlan = null;
    let wallet = null;
    let paymentBusy = false;


    /* =====================================================
       HELPERS
       ===================================================== */

    const $ = id => document.getElementById(id);


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
        if (el) el.textContent = value ?? "";
    }


    function showDashboard() {

        const loading = $("loading-spinner");
        const dashboard = $("dashboard-content");

        if (loading) {
            loading.style.display = "none";
        }

        if (dashboard) {
            dashboard.style.display = "block";
        }
    }


    function showLoading() {

        const loading = $("loading-spinner");
        const dashboard = $("dashboard-content");

        if (loading) {
            loading.style.display = "flex";
        }

        if (dashboard) {
            dashboard.style.display = "none";
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

        if (!value) return "—";

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

        const client =
            getSupabase();

        const {
            data,
            error
        } =
            await client
                .from("company_profiles")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();

        if (error) {

            console.warn(
                "Company profile:",
                error.message
            );

            profile = null;

            renderCompanyProfile();

            return;
        }

        profile =
            data || null;

        renderCompanyProfile();
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
                profile?.description || ""
        };


        Object.keys(fields).forEach(id => {

            const el = $(id);

            if (el) {
                el.value = fields[id];
            }
        });


        const companyInput =
            $("job-company");

        if (companyInput) {
            companyInput.value = name;
        }
    }


    async function saveCompanyProfile(event) {

        event.preventDefault();

        const form =
            event.currentTarget;

        const button =
            form.querySelector(
                "button[type='submit']"
            );


        const get = selector =>
            String(
                form.querySelector(selector)?.value ||
                ""
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
                            onConflict: "user_id"
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
                button.disabled = false;
                button.textContent =
                    "Save Profile";
            }
        }
    }


    /* =====================================================
       JOBS
       ===================================================== */

    function monthlyJobs() {

        const now =
            new Date();

        return jobs.filter(job => {

            const date =
                new Date(
                    job.created_at
                );

            return (
                date.getUTCFullYear() ===
                    now.getUTCFullYear() &&
                date.getUTCMonth() ===
                    now.getUTCMonth()
            );

        }).length;
    }


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

            return;
        }


        jobs =
            data || [];

        renderJobs();
        renderSubscription();

        await loadApplications();
    }


    function renderJobs() {

        const container =
            $("company-jobs-list");

        if (!container) return;


        if (!jobs.length) {

            container.innerHTML = `
                <div class="empty-state">
                    You have not published any jobs yet.
                </div>
            `;

            return;
        }


        container.innerHTML =
            jobs.map(job => {

                return `
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
                                job.description ||
                                ""
                            )}
                        </div>

                    </div>
                `;

            }).join("");


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
                        user_id: user.id,
                        title,
                        company,
                        location,
                        type,
                        description,
                        apply_link: applyLink
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


            await load
