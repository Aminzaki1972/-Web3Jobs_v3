"use strict";

(() => {

    let client = null;
    let currentUser = null;
    let allJobs = [];

    const $ = id => document.getElementById(id);


    /* =========================================================
       SUPABASE
       ========================================================= */

    function getSupabase() {

        if (client) {
            return client;
        }

        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient === "function"
        ) {
            client =
                window.Web3JobsSupabase.getClient();

            return client;
        }

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            client = window.supabaseClient;
            return client;
        }

        if (
            window.supabase &&
            typeof window.supabase.createClient === "function" &&
            window.SUPABASE_URL &&
            window.SUPABASE_ANON_KEY
        ) {
            client =
                window.supabase.createClient(
                    window.SUPABASE_URL,
                    window.SUPABASE_ANON_KEY
                );

            return client;
        }

        throw new Error(
            "Supabase client is not initialized."
        );
    }


    /* =========================================================
       HELPERS
       ========================================================= */

    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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


    function showNotice(message, type = "error") {

        const notice = $("notice");

        if (!notice) {
            return;
        }

        notice.textContent = message;

        notice.className =
            "notice " + type;

        notice.style.display = "block";

        clearTimeout(
            showNotice.timer
        );

        showNotice.timer =
            setTimeout(() => {

                notice.style.display =
                    "none";

            }, 4000);
    }


    function hideLoading() {

        const loading = $("loading");
        const content = $("content");

        if (loading) {
            loading.style.display = "none";
        }

        if (content) {
            content.style.display = "block";
        }
    }


    /* =========================================================
       ADMIN VERIFICATION
       ========================================================= */

    async function verifyAdmin() {

        const supabase =
            getSupabase();

        const {
            data,
            error
        } =
            await supabase.auth.getUser();

        if (error) {
            throw error;
        }

        currentUser =
            data?.user || null;


        if (!currentUser) {

            location.replace(
                "login.html"
            );

            return false;
        }


        const {
            data: profile,
            error: profileError
        } =
            await supabase
                .from("profiles")
                .select("id,email,role")
                .eq("id", currentUser.id)
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


        if (role !== "admin") {

            showNotice(
                "Access denied. Administrator privileges are required.",
                "error"
            );

            setTimeout(() => {

                location.replace(
                    "dashboard.html"
                );

            }, 1500);

            return false;
        }


        return true;
    }


    /* =========================================================
       LOAD JOBS
       ========================================================= */

    async function loadJobs() {

        const supabase =
            getSupabase();

        const tbody =
            $("jobs-table");


        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty">
                            Loading jobs...
                        </div>
                    </td>
                </tr>
            `;
        }


        const {
            data,
            error
        } =
            await supabase
                .from("jobs")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Load jobs:",
                error
            );

            if (tbody) {

                tbody.innerHTML = `
                    <tr>
                        <td colspan="7">
                            <div class="empty">
                                Unable to load jobs.
                            </div>
                        </td>
                    </tr>
                `;
            }

            showNotice(
                error.message ||
                "Unable to load jobs.",
                "error"
            );

            return;
        }


        allJobs =
            Array.isArray(data)
                ? data
                : [];


        renderJobs(
            allJobs
        );
    }


    /* =========================================================
       RENDER JOBS
       ========================================================= */

    function renderJobs(jobs) {

        const tbody =
            $("jobs-table");

        const count =
            $("job-count");


        if (count) {

            count.textContent =
                `${jobs.length} job${jobs.length === 1 ? "" : "s"}`;
        }


        if (!tbody) {
            return;
        }


        if (!jobs.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty">
                            No jobs found.
                        </div>
                    </td>
                </tr>
            `;

            return;
        }


        tbody.innerHTML =
            jobs.map(job => {

                const title =
                    job.title ||
                    "Untitled Job";


                const company =
                    job.company ||
                    job.company_name ||
                    "—";


                const location =
                    job.location ||
                    "—";


                const type =
                    job.type ||
                    job.job_type ||
                    "—";


                const created =
                    job.created_at ||
                    job.createdAt ||
                    null;


                const active =
                    getJobStatus(job);


                const statusClass =
                    active
                        ? "active"
                        : "inactive";


                const statusText =
                    active
                        ? "Active"
                        : "Inactive";


                const id =
                    job.id;


                return `
                    <tr>

                        <td>
                            <div class="job-title">
                                ${escapeHtml(title)}
                            </div>
                        </td>

                        <td>
                            <span class="company">
                                ${escapeHtml(company)}
                            </span>
                        </td>

                        <td>
                            ${escapeHtml(location)}
                        </td>

                        <td>
                            ${escapeHtml(type)}
                        </td>

                        <td>
                            <span class="status ${statusClass}">
                                ${statusText}
                            </span>
                        </td>

                        <td>
                            ${escapeHtml(
                                formatDate(created)
                            )}
                        </td>

                        <td>

                            <div class="row-actions">

                                <button
                                    type="button"
                                    class="small-button"
                                    data-action="view"
                                    data-id="${escapeHtml(id)}"
                                >
                                    View
                                </button>

                                <button
                                    type="button"
                                    class="small-button"
                                    data-action="toggle"
                                    data-id="${escapeHtml(id)}"
                                >
                                    ${active ? "Disable" : "Activate"}
                                </button>

                                <button
                                    type="button"
                                    class="small-button delete"
                                    data-action="delete"
                                    data-id="${escapeHtml(id)}"
                                >
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>
                `;

            }).join("");
    }


    /* =========================================================
       JOB STATUS
       ========================================================= */

    function getJobStatus(job) {

        if (
            typeof job.is_active === "boolean"
        ) {
            return job.is_active;
        }


        if (
            typeof job.active === "boolean"
        ) {
            return job.active;
        }


        if (
            typeof job.status === "string"
        ) {

            const status =
                job.status
                    .trim()
                    .toLowerCase();


            if (
                [
                    "inactive",
                    "disabled",
                    "closed",
                    "draft",
                    "hidden"
                ].includes(status)
            ) {
                return false;
            }


            if (
                [
                    "active",
                    "published",
                    "open"
                ].includes(status)
            ) {
                return true;
            }
        }


        return true;
    }


    /* =========================================================
       SEARCH
       ========================================================= */

    function searchJobs() {

        const input =
            $("job-search");

        if (!input) {
            return;
        }


        const query =
            input.value
                .trim()
                .toLowerCase();


        if (!query) {

            renderJobs(
                allJobs
            );

            return;
        }


        const filtered =
            allJobs.filter(job => {

                const values = [

                    job.title,

                    job.company,

                    job.company_name,

                    job.location,

                    job.type,

                    job.job_type,

                    job.description

                ];


                return values.some(value =>
                    String(value || "")
                        .toLowerCase()
                        .includes(query)
                );
            });


        renderJobs(
            filtered
        );
    }


    /* =========================================================
       VIEW JOB
       ========================================================= */

    function viewJob(id) {

        const job =
            allJobs.find(
                item =>
                    String(item.id) ===
                    String(id)
            );


        if (!job) {
            return;
        }


        const title =
            job.title ||
            "Untitled Job";


        const company =
            job.company ||
            job.company_name ||
            "—";


        const location =
            job.location ||
            "—";


        const type =
            job.type ||
            job.job_type ||
            "—";


        const description =
            job.description ||
            "No description available.";


        alert(
            "Job: " +
            title +
            "\n\n" +
            "Company: " +
            company +
            "\n" +
            "Location: " +
            location +
            "\n" +
            "Type: " +
            type +
            "\n\n" +
            description
        );
    }


    /* =========================================================
       TOGGLE JOB
       ========================================================= */

    async function toggleJob(id) {

        const job =
            allJobs.find(
                item =>
                    String(item.id) ===
                    String(id)
            );


        if (!job) {
            return;
        }


        const currentStatus =
            getJobStatus(job);


        const newStatus =
            !currentStatus;


        const supabase =
            getSupabase();


        /*
         * Prefer is_active when the column exists.
         */

        const {
            error
        } =
            await supabase
                .from("jobs")
                .update({
                    is_active:
                        newStatus
                })
                .eq(
                    "id",
                    id
                );


        if (error) {

            console.error(
                "Toggle job:",
                error
            );


            showNotice(
                "Could not change job status. Make sure the jobs table contains an is_active column.",
                "error"
            );

            return;
        }


        showNotice(
            newStatus
                ? "Job activated successfully."
                : "Job disabled successfully.",
            "success"
        );


        await loadJobs();
    }


    /* =========================================================
       DELETE JOB
       ========================================================= */

    async function deleteJob(id) {

        const job =
            allJobs.find(
                item =>
                    String(item.id) ===
                    String(id)
            );


        if (!job) {
            return;
        }


        const title =
            job.title ||
            "this job";


        const confirmed =
            window.confirm(
                `Are you sure you want to delete "${title}"?`
            );


        if (!confirmed) {
            return;
        }


        const supabase =
            getSupabase();


        const {
            error
        } =
            await supabase
                .from("jobs")
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {

            console.error(
                "Delete job:",
                error
            );


            showNotice(
                error.message ||
                "Could not delete the job.",
                "error"
            );

            return;
        }


        showNotice(
            "Job deleted successfully.",
            "success"
        );


        await loadJobs();
    }


    /* =========================================================
       TABLE ACTIONS
       ========================================================= */

    function setupTableActions() {

        const tbody =
            $("jobs-table");


        if (!tbody) {
            return;
        }


        tbody.addEventListener(
            "click",
            async event => {

                const button =
                    event.target.closest(
                        "button[data-action]"
                    );


                if (!button) {
                    return;
                }


                const action =
                    button.dataset.action;


                const id =
                    button.dataset.id;


                if (!id) {
                    return;
                }


                button.disabled =
                    true;


                try {

                    if (
                        action === "view"
                    ) {

                        viewJob(id);

                    }


                    if (
                        action === "toggle"
                    ) {

                        await toggleJob(id);

                    }


                    if (
                        action === "delete"
                    ) {

                        await deleteJob(id);

                    }

                } finally {

                    button.disabled =
                        false;
                }

            }
        );
    }


    /* =========================================================
       NAVIGATION
       ========================================================= */

    function setupNavigation() {

        $("back-dashboard")
            ?.addEventListener(
                "click",
                () => {

                    location.href =
                        "admin-dashboard.html";

                }
            );


        $("refresh")
            ?.addEventListener(
                "click",
                async () => {

                    await loadJobs();

                }
            );


        $("job-search")
            ?.addEventListener(
                "input",
                searchJobs
            );
    }


    /* =========================================================
       LOGOUT
       ========================================================= */

    function setupLogout() {

        $("logout")
            ?.addEventListener(
                "click",
                async () => {

                    const button =
                        $("logout");


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

                    } finally {

                        location.replace(
                            "login.html"
                        );
                    }
                }
            );
    }


    /* =========================================================
       INIT
       ========================================================= */

    async function init() {

        try {

            const allowed =
                await verifyAdmin();


            if (!allowed) {
                return;
            }


            setupNavigation();

            setupLogout();

            setupTableActions();

            await loadJobs();

            hideLoading();


        } catch (error) {

            console.error(
                "Admin Jobs:",
                error
            );


            const loading =
                $("loading");


            if (loading) {

                loading.innerHTML = `
                    <div class="loading-box">

                        <strong>
                            Admin Access Error
                        </strong>

                        <span>
                            ${escapeHtml(
                                error?.message ||
                                "Unable to load job management."
                            )}
                        </span>

                    </div>
                `;
            }
        }
    }


    /* =========================================================
       GLOBAL API
       ========================================================= */

    window.Web3JobsAdminJobs = {

        refresh:
            loadJobs,

        search:
            searchJobs,

        getJobs:
            () => allJobs,

        getCurrentUser:
            () => currentUser
    };


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
