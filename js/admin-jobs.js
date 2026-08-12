"use strict";

(() => {

    let client = null;
    let currentUser = null;
    let allJobs = [];
    let filteredJobs = [];

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

        const notice =
            $("admin-notice");

        if (!notice) {
            return;
        }

        notice.textContent =
            message;

        notice.className =
            "notice " + type;

        notice.style.display =
            "block";

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
                .select(
                    "id,email,role"
                )
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
       ADMIN ACTION LOG
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

                        action,

                        target_id:
                            targetId,

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
       JOB STATUS
       ========================================================= */

    function getJobStatus(job) {

        if (
            typeof job.is_active ===
            "boolean"
        ) {
            return job.is_active;
        }


        if (
            typeof job.active ===
            "boolean"
        ) {
            return job.active;
        }


        if (
            typeof job.status ===
            "string"
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
       LOAD JOBS
       ========================================================= */

    async function loadJobs() {

        const tbody =
            $("jobs-table-body");


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
            await getSupabase()
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


        updateStatistics();


        applyFilters();
    }


    /* =========================================================
       STATISTICS
       ========================================================= */

    function updateStatistics() {

        const total =
            allJobs.length;


        const active =
            allJobs.filter(
                job =>
                    getJobStatus(job)
            ).length;


        const hidden =
            total - active;


        const totalElement =
            $("total-jobs");

        const activeElement =
            $("active-jobs");

        const hiddenElement =
            $("hidden-jobs");


        if (totalElement) {
            totalElement.textContent =
                formatNumber(total);
        }


        if (activeElement) {
            activeElement.textContent =
                formatNumber(active);
        }


        if (hiddenElement) {
            hiddenElement.textContent =
                formatNumber(hidden);
        }
    }


    /* =========================================================
       FILTER + SEARCH
       ========================================================= */

    function applyFilters() {

        const searchInput =
            $("job-search");

        const statusFilter =
            $("job-status-filter");


        const query =
            String(
                searchInput?.value || ""
            )
                .trim()
                .toLowerCase();


        const status =
            statusFilter?.value ||
            "all";


        filteredJobs =
            allJobs.filter(job => {

                const searchableText =
                    [
                        job.title,
                        job.company,
                        job.company_name,
                        job.location,
                        job.type,
                        job.job_type,
                        job.description
                    ]
                        .map(value =>
                            String(
                                value || ""
                            ).toLowerCase()
                        )
                        .join(" ");


                if (
                    query &&
                    !searchableText.includes(
                        query
                    )
                ) {
                    return false;
                }


                const active =
                    getJobStatus(job);


                if (
                    status === "active" &&
                    !active
                ) {
                    return false;
                }


                if (
                    status === "hidden" &&
                    active
                ) {
                    return false;
                }


                return true;
            });


        const results =
            $("search-results");


        if (results) {
            results.textContent =
                formatNumber(
                    filteredJobs.length
                );
        }


        renderJobs(
            filteredJobs
        );
    }


    /* =========================================================
       RENDER JOBS
       ========================================================= */

    function renderJobs(jobs) {

        const tbody =
            $("jobs-table-body");


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
                    null;


                const active =
                    getJobStatus(job);


                const statusClass =
                    active
                        ? "active"
                        : "hidden";


                const statusText =
                    active
                        ? "Active"
                        : "Hidden";


                const id =
                    String(
                        job.id
                    );


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
                            <span class="muted">
                                ${escapeHtml(location)}
                            </span>
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
                            <span class="muted">
                                ${escapeHtml(
                                    formatDate(
                                        created
                                    )
                                )}
                            </span>
                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    type="button"
                                    class="small-btn"
                                    data-action="view"
                                    data-id="${escapeHtml(id)}"
                                >
                                    View
                                </button>

                                <button
                                    type="button"
                                    class="small-btn edit"
                                    data-action="edit"
                                    data-id="${escapeHtml(id)}"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="small-btn toggle"
                                    data-action="toggle"
                                    data-id="${escapeHtml(id)}"
                                >
                                    ${active ? "Hide" : "Activate"}
                                </button>

                                <button
                                    type="button"
                                    class="small-btn delete"
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
       FIND JOB
       ========================================================= */

    function findJob(id) {

        return allJobs.find(
            job =>
                String(job.id) ===
                String(id)
        );
    }


    /* =========================================================
       VIEW JOB
       ========================================================= */

    function viewJob(id) {

        const job =
            findJob(id);


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


        const applyLink =
            job.apply_link ||
            job.apply_url ||
            job.application_url ||
            "";


        let message =
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
            description;


        if (applyLink) {

            message +=
                "\n\nApplication Link:\n" +
                applyLink;
        }


        alert(message);


        logAdminAction(
            "Viewed job",
            id
        );
    }


    /* =========================================================
       OPEN EDIT MODAL
       ========================================================= */

    function openEditModal(id) {

        const job =
            findJob(id);


        if (!job) {
            return;
        }


        if ($("edit-job-id")) {
            $("edit-job-id").value =
                job.id || "";
        }


        if ($("edit-title")) {
            $("edit-title").value =
                job.title || "";
        }


        if ($("edit-company")) {
            $("edit-company").value =
                job.company ||
                job.company_name ||
                "";
        }


        if ($("edit-location")) {
            $("edit-location").value =
                job.location || "";
        }


        if ($("edit-type")) {
            $("edit-type").value =
                job.type ||
                job.job_type ||
                "";
        }


        if ($("edit-description")) {
            $("edit-description").value =
                job.description || "";
        }


        if ($("edit-apply-link")) {
            $("edit-apply-link").value =
                job.apply_link ||
                job.apply_url ||
                job.application_url ||
                "";
        }


        if ($("edit-status")) {
            $("edit-status").value =
                getJobStatus(job)
                    ? "active"
                    : "hidden";
        }


        const modal =
            $("edit-job-modal");


        if (modal) {
            modal.classList.add(
                "show"
            );
        }
    }


    /* =========================================================
       CLOSE EDIT MODAL
       ========================================================= */

    function closeEditModal() {

        const modal =
            $("edit-job-modal");


        if (modal) {
            modal.classList.remove(
                "show"
            );
        }
    }


    /* =========================================================
       SAVE JOB
       ========================================================= */

    async function saveJob(event) {

        event.preventDefault();


        const id =
            $("edit-job-id")?.value;


        if (!id) {

            showNotice(
                "Job ID is missing.",
                "error"
            );

            return;
        }


        const title =
            $("edit-title")?.value
                .trim() || "";


        const company =
            $("edit-company")?.value
                .trim() || "";


        const location =
            $("edit-location")?.value
                .trim() || "";


        const type =
            $("edit-type")?.value
                .trim() || "";


        const description =
            $("edit-description")?.value
                .trim() || "";


        const applyLink =
            $("edit-apply-link")?.value
                .trim() || "";


        const status =
            $("edit-status")?.value ||
            "active";


        if (!title) {

            showNotice(
                "Job title is required.",
                "error"
            );

            return;
        }


        const updateData = {
            title,
            company,
            location,
            type,
            description
        };


        /*
         * Only update apply_link if the
         * column is likely part of the table.
         */

        if (
            Object.prototype.hasOwnProperty.call(
                findJob(id) || {},
                "apply_link"
            )
        ) {
            updateData.apply_link =
                applyLink;
        }


        /*
         * Only update is_active when
         * the existing row contains it.
         */

        const existingJob =
            findJob(id);


        if (
            existingJob &&
            Object.prototype.hasOwnProperty.call(
                existingJob,
                "is_active"
            )
        ) {

            updateData.is_active =
                status === "active";
        }


        const saveButton =
            $("save-job");


        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                "Saving...";
        }


        try {

            const {
                error
            } =
                await getSupabase()
                    .from("jobs")
                    .update(updateData)
                    .eq(
                        "id",
                        id
                    );


            if (error) {
                throw error;
            }


            await logAdminAction(
                "Edited job",
                id,
                {
                    title,
                    company
                }
            );


            closeEditModal();


            showNotice(
                "Job updated successfully.",
                "success"
            );


            await loadJobs();


        } catch (error) {

            console.error(
                "Save job:",
                error
            );


            showNotice(
                error.message ||
                "Could not update the job.",
                "error"
            );

        } finally {

            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    "Save Changes";
            }
        }
    }


    /* =========================================================
       TOGGLE JOB
       ========================================================= */

    async function toggleJob(id) {

        const job =
            findJob(id);


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
         * First try is_active.
         */

        let {
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


        /*
         * If is_active does not exist,
         * try status.
         */

        if (error) {

            const result =
                await supabase
                    .from("jobs")
                    .update({
                        status:
                            newStatus
                                ? "active"
                                : "hidden"
                    })
                    .eq(
                        "id",
                        id
                    );


            error =
                result.error;
        }


        if (error) {

            console.error(
                "Toggle job:",
                error
            );


            showNotice(
                error.message ||
                "Could not change job status.",
                "error"
            );

            return;
        }


        await logAdminAction(
            newStatus
                ? "Activated job"
                : "Hidden job",
            id
        );


        showNotice(
            newStatus
                ? "Job activated successfully."
                : "Job hidden successfully.",
            "success"
        );


        await loadJobs();
    }


    /* =========================================================
       DELETE JOB
       ========================================================= */

    async function deleteJob(id) {

        const job =
            findJob(id);


        if (!job) {
            return;
        }


        const title =
            job.title ||
            "this job";


        const confirmed =
            window.confirm(
                `Are you sure you want to permanently delete "${title}"?`
            );


        if (!confirmed) {
            return;
        }


        const {
            error
        } =
            await getSupabase()
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


        await logAdminAction(
            "Deleted job",
            id,
            {
                title
            }
        );


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
            $("jobs-table-body");


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
                        action ===
                        "view"
                    ) {

                        viewJob(id);

                    } else if (
                        action ===
                        "edit"
                    ) {

                        openEditModal(id);

                    } else if (
                        action ===
                        "toggle"
                    ) {

                        await toggleJob(id);

                    } else if (
                        action ===
                        "delete"
                    ) {

                        await deleteJob(id);
                    }

                } catch (error) {

                    console.error(
                        "Job action:",
                        error
                    );


                    showNotice(
                        error.message ||
                        "Action failed.",
                        "error"
                    );

                } finally {

                    button.disabled =
                        false;
                }
            }
        );
    }


    /* =========================================================
       SEARCH EVENTS
       ========================================================= */

    function setupSearch() {

        const input =
            $("job-search");


        if (input) {

            input.addEventListener(
                "input",
                applyFilters
            );
        }


        const filter =
            $("job-status-filter");


        if (filter) {

            filter.addEventListener(
                "change",
                applyFilters
            );
        }
    }


    /* =========================================================
       MODAL EVENTS
       ========================================================= */

    function setupModal() {

        $("edit-job-form")
            ?.addEventListener(
                "submit",
                saveJob
            );


        $("close-edit-modal")
            ?.addEventListener(
                "click",
                closeEditModal
            );


        $("cancel-edit")
            ?.addEventListener(
                "click",
                closeEditModal
            );


        $("edit-job-modal")
            ?.addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "edit-job-modal"
                    ) {

                        closeEditModal();
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
                async () => {

                    await logAdminAction(
                        "Returned to admin dashboard"
                    );

                    location.href =
                        "admin-dashboard.html";
                }
            );


        $("refresh-jobs")
            ?.addEventListener(
                "click",
                async () => {

                    await loadJobs();
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


            setupTableActions();

            setupSearch();

            setupModal();

            setupNavigation();

            setupLogout();


            await loadJobs();


            hideLoading();


        } catch (error) {

            console.error(
                "Admin jobs dashboard:",
                error
            );


            showNotice(
                error?.message ||
                "Unable to load job management.",
                "error"
            );


            const loading =
                $("admin-loading");


            if (loading) {
                loading.style.display =
                    "none";
            }
        }
    }


    /* =========================================================
       GLOBAL API
       ========================================================= */

    window.Web3JobsAdminJobs = {

        getJobs:
            () => allJobs,

        refresh:
            loadJobs,

        search:
            applyFilters,

        view:
            viewJob,

        edit:
            openEditModal,

        toggle:
            toggleJob,

        delete:
            deleteJob,

        getCurrentUser:
            () => currentUser

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
