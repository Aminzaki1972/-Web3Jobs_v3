"use strict";

(() => {

    let supabaseClient = null;
    let currentUser = null;

    const $ = id => document.getElementById(id);


    /* =========================================================
       SUPABASE
       ========================================================= */

    function getSupabase() {

        if (supabaseClient) {
            return supabaseClient;
        }

        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient === "function"
        ) {
            supabaseClient =
                window.Web3JobsSupabase.getClient();

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
            typeof window.supabase.createClient === "function" &&
            window.SUPABASE_URL &&
            window.SUPABASE_ANON_KEY
        ) {
            supabaseClient =
                window.supabase.createClient(
                    window.SUPABASE_URL,
                    window.SUPABASE_ANON_KEY
                );

            return supabaseClient;
        }

        throw new Error(
            "Supabase client is not initialized."
        );
    }


    /* =========================================================
       HELPERS
       ========================================================= */

    function showError(message) {

        const notice =
            $("admin-notice");

        if (!notice) {
            return;
        }

        notice.textContent =
            message;

        notice.className =
            "notice error";
    }


    function hideLoading() {

        const loading =
            $("admin-loading");

        const content =
            $("admin-content");

        if (loading) {
            loading.style.display =
                "none";
        }

        if (content) {
            content.style.display =
                "block";
        }
    }


    function formatNumber(value) {

        return Number(
            value || 0
        ).toLocaleString();
    }


    function shortId(value) {

        if (!value) {
            return "—";
        }

        const text =
            String(value);

        if (text.length <= 16) {
            return text;
        }

        return (
            text.slice(0, 8) +
            "..." +
            text.slice(-6)
        );
    }


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =========================================================
       VERIFY ADMIN
       ========================================================= */

    async function verifyAdmin() {

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


        currentUser =
            data?.user || null;


        if (!currentUser) {

            window.location.replace(
                "login.html"
            );

            return false;
        }


        const {
            data: profile,
            error: profileError
        } =
            await client
                .from("profiles")
                .select("id,email,role")
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();


        if (profileError) {
            throw profileError;
        }


        const role =
            String(
                profile?.role || ""
            )
            .trim()
            .toLowerCase();


        if (
            !profile ||
            role !== "admin"
        ) {

            showError(
                "Access denied. Administrator privileges are required."
            );


            setTimeout(() => {

                window.location.replace(
                    "dashboard.html"
                );

            }, 1800);


            return false;
        }


        return true;
    }


    /* =========================================================
       ADMIN INFORMATION
       ========================================================= */

    function renderAdminInfo() {

        if (!currentUser) {
            return;
        }


        const email =
            currentUser.email ||
            "—";


        const id =
            currentUser.id ||
            "—";


        if ($("admin-email")) {

            $("admin-email")
                .textContent =
                email;
        }


        if ($("admin-id")) {

            $("admin-id")
                .textContent =
                shortId(id);

            $("admin-id").title =
                id;
        }
    }


    /* =========================================================
       COUNT TABLE ROWS
       ========================================================= */

    async function countRows(table) {

        try {

            const {
                count,
                error
            } =
                await getSupabase()
                    .from(table)
                    .select(
                        "*",
                        {
                            count: "exact",
                            head: true
                        }
                    );


            if (error) {

                console.warn(
                    `${table} count:`,
                    error.message
                );

                return 0;
            }


            return count || 0;

        } catch (error) {

            console.warn(
                `${table} count:`,
                error
            );

            return 0;
        }
    }


    /* =========================================================
       STATISTICS
       ========================================================= */

    async function loadStatistics() {

        const [
            users,
            companies,
            jobs,
            applications
        ] =
            await Promise.all([

                countRows(
                    "profiles"
                ),

                countRows(
                    "company_profiles"
                ),

                countRows(
                    "jobs"
                ),

                countRows(
                    "applications"
                )

            ]);


        if ($("total-users")) {

            $("total-users")
                .textContent =
                formatNumber(users);
        }


        if ($("total-companies")) {

            $("total-companies")
                .textContent =
                formatNumber(companies);
        }


        if ($("total-jobs")) {

            $("total-jobs")
                .textContent =
                formatNumber(jobs);
        }


        if ($("total-applications")) {

            $("total-applications")
                .textContent =
                formatNumber(applications);
        }
    }


    /* =========================================================
       DATE
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


        return date.toLocaleString();
    }


    /* =========================================================
       ADMIN ACTIVITY
       ========================================================= */

    async function loadAdminActivity() {

        const container =
            $("admin-activity");


        if (!container) {
            return;
        }


        try {

            const {
                data,
                error
            } =
                await getSupabase()
                    .from("admin_actions")
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    )
                    .limit(10);


            if (error) {

                console.warn(
                    "Admin activity:",
                    error.message
                );


                container.innerHTML = `
                    <div class="empty">
                        No admin activity available.
                    </div>
                `;

                return;
            }


            if (
                !data ||
                !data.length
            ) {

                container.innerHTML = `
                    <div class="empty">
                        No admin actions recorded yet.
                    </div>
                `;

                return;
            }


            container.innerHTML =
                data
                    .map(item => {

                        const action =
                            String(
                                item.action ||
                                "Admin action"
                            );


                        return `
                            <div class="info-row">

                                <span class="info-label">
                                    ${escapeHtml(action)}
                                </span>

                                <span class="info-value">
                                    ${escapeHtml(
                                        formatDate(
                                            item.created_at
                                        )
                                    )}
                                </span>

                            </div>
                        `;

                    })
                    .join("");


        } catch (error) {

            console.warn(
                "Admin activity:",
                error
            );


            container.innerHTML = `
                <div class="empty">
                    No admin activity available.
                </div>
            `;
        }
    }


    /* =========================================================
       LOG ADMIN ACTION
       ========================================================= */

    async function logAdminAction(
        action,
        targetId = null,
        details = null
    ) {

        if (!currentUser) {
            return;
        }


        try {

            const {
                error
            } =
                await getSupabase()
                    .from("admin_actions")
                    .insert({

                        admin_id:
                            currentUser.id,

                        action:
                            action,

                        target_id:
                            targetId,

                        details:
                            details

                    });


            if (error) {

                console.warn(
                    "Admin action log:",
                    error.message
                );
            }

        } catch (error) {

            console.warn(
                "Admin action log:",
                error
            );
        }
    }


    /* =========================================================
       NAVIGATION
       ========================================================= */

    function setupNavigation() {


        /* -----------------------------------------------------
           USERS
           ----------------------------------------------------- */

        $("manage-users")
            ?.addEventListener(
                "click",
                async () => {

                    await logAdminAction(
                        "Opened user management"
                    );


                    window.location.href =
                        "admin-users.html";
                }
            );


        /* -----------------------------------------------------
           COMPANIES
           ----------------------------------------------------- */

        $("manage-companies")
            ?.addEventListener(
                "click",
                async () => {

                    await logAdminAction(
                        "Opened company management"
                    );


                    window.location.href =
                        "admin-companies.html";
                }
            );


        /* -----------------------------------------------------
           JOBS
           ----------------------------------------------------- */

        $("manage-jobs")
            ?.addEventListener(
                "click",
                async () => {

                    await logAdminAction(
                        "Opened job management"
                    );


                    window.location.href =
                        "admin-jobs.html";
                }
            );


        /* -----------------------------------------------------
           PAYMENTS
           ----------------------------------------------------- */

        $("manage-payments")
            ?.addEventListener(
                "click",
                async () => {

                    await logAdminAction(
                        "Opened payment management"
                    );


                    window.location.href =
                        "admin-payments.html";
                }
            );
    }


    /* =========================================================
       LOGOUT
       ========================================================= */

    function setupLogout() {

        $("admin-logout")
            ?.addEventListener(
                "click",
                async () => {

                    const button =
                        $("admin-logout");


                    if (button) {

                        button.disabled =
                            true;

                        button.textContent =
                            "Logging out...";
                    }


                    try {

                        await getSupabase()
                            .auth
                            .signOut();

                    } catch (error) {

                        console.error(
                            "Logout:",
                            error
                        );
                    }


                    window.location.replace(
                        "login.html"
                    );
                }
            );
    }


    /* =========================================================
       REFRESH
       ========================================================= */

    async function refreshDashboard() {

        await loadStatistics();

        await loadAdminActivity();
    }


    /* =========================================================
       INITIALIZE
       ========================================================= */

    async function init() {

        try {

            const allowed =
                await verifyAdmin();


            if (!allowed) {
                return;
            }


            renderAdminInfo();


            await loadStatistics();


            await loadAdminActivity();


            setupNavigation();


            setupLogout();


            hideLoading();


            console.log(
                "Web3Jobs Admin Dashboard loaded successfully."
            );


        } catch (error) {

            console.error(
                "Admin dashboard:",
                error
            );


            showError(
                error?.message ||
                "Unable to load admin dashboard."
            );


            hideLoading();
        }
    }


    /* =========================================================
       GLOBAL API
       ========================================================= */

    window.Web3JobsAdmin = {

        getUser:
            () => currentUser,

        refresh:
            refreshDashboard,

        logAction:
            logAdminAction,

        verify:
            verifyAdmin

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
            init
        );

    } else {

        init();
    }

})();
