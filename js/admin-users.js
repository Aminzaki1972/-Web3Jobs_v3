"use strict";

(() => {

    let client = null;
    let allUsers = [];

    const $ = id =>
        document.getElementById(id);


    /* =====================================================
       SUPABASE
       ===================================================== */

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
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.auth === "object"
        ) {
            client =
                window.Web3JobsSupabase;

            return client;
        }

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            client =
                window.supabaseClient;

            return client;
        }

        throw new Error(
            "Supabase client is not initialized."
        );
    }


    /* =====================================================
       ERROR
       ===================================================== */

    function showError(message) {

        const element =
            $("error");

        if (!element) {
            return;
        }

        element.textContent =
            message;

        element.style.display =
            "block";
    }


    function hideError() {

        const element =
            $("error");

        if (element) {
            element.style.display =
                "none";
        }
    }


    /* =====================================================
       LOADING
       ===================================================== */

    function hideLoading() {

        const loading =
            $("admin-loading");

        const content =
            $("content");

        if (loading) {
            loading.style.display =
                "none";
        }

        if (content) {
            content.style.display =
                "block";
        }
    }


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       DATE
       ===================================================== */

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


    /* =====================================================
       ROLE
       ===================================================== */

    function getRole(user) {

        const accountType =
            String(
                user.account_type || ""
            )
            .trim()
            .toLowerCase();


        const role =
            String(
                user.role || ""
            )
            .trim()
            .toLowerCase();


        if (role === "admin") {
            return "admin";
        }


        if (
            accountType === "company" ||
            role === "company"
        ) {
            return "company";
        }


        return "individual";
    }


    function roleBadge(role) {

        const safeRole =
            getRole({
                role
            });


        const label =
            safeRole === "admin"
                ? "ADMIN"
                : safeRole === "company"
                    ? "COMPANY"
                    : "INDIVIDUAL";


        return `
            <span class="badge ${safeRole}">
                ${label}
            </span>
        `;
    }


    /* =====================================================
       VERIFY ADMIN
       ===================================================== */

    async function verifyAdmin() {

        const supabase =
            getSupabase();


        const {
            data,
            error
        } =
            await supabase.auth.getSession();


        if (error) {
            throw error;
        }


        const session =
            data?.session;


        if (!session) {

            location.replace(
                "admin-login.html"
            );

            return false;
        }


        /*
         * IMPORTANT:
         *
         * Admin access is checked through
         * public.is_admin().
         *
         * We do NOT depend on profiles.role.
         */

        const {
            data: isAdmin,
            error: adminError
        } =
            await supabase.rpc(
                "is_admin"
            );


        if (adminError) {

            console.error(
                "Admin check:",
                adminError
            );

            throw new Error(
                "Unable to verify administrator access."
            );
        }


        if (isAdmin !== true) {

            await supabase.auth.signOut();


            location.replace(
                "admin-login.html"
            );

            return false;
        }


        return true;
    }


    /* =====================================================
       LOAD USERS
       ===================================================== */

    async function loadUsers() {

        hideError();


        const supabase =
            getSupabase();


        const {
            data,
            error
        } =
            await supabase
                .from("profiles")
                .select(
                    "id,email,full_name,account_type,avatar_url,bio,location,website,created_at,updated_at,role"
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


        allUsers =
            Array.isArray(data)
                ? data
                : [];


        await addCompanyInformation();


        updateStatistics();


        renderUsers(
            allUsers
        );
    }


    /* =====================================================
       COMPANY INFORMATION
       ===================================================== */

    async function addCompanyInformation() {

        if (!allUsers.length) {
            return;
        }


        try {

            const {
                data,
                error
            } =
                await getSupabase()
                    .from("company_profiles")
                    .select(
                        "user_id,id,company_name"
                    );


            if (error) {

                console.warn(
                    "Company profiles:",
                    error.message
                );

                return;
            }


            if (!Array.isArray(data)) {
                return;
            }


            const companyMap =
                new Map();


            data.forEach(
                company => {

                    if (
                        company.user_id
                    ) {

                        companyMap.set(
                            company.user_id,
                            company
                        );

                    }

                }
            );


            allUsers =
                allUsers.map(
                    user => {

                        const company =
                            companyMap.get(
                                user.id
                            );


                        if (
                            company &&
                            !String(
                                user.account_type ||
                                ""
                            )
                            .toLowerCase()
                        ) {

                            return {
                                ...user,

                                account_type:
                                    "company",

                                company_name:
                                    company.company_name ||
                                    ""
                            };
                        }


                        if (company) {

                            return {
                                ...user,

                                company_name:
                                    company.company_name ||
                                    ""
                            };
                        }


                        return user;
                    }
                );


        } catch (error) {

            console.warn(
                "Company detection:",
                error
            );
        }
    }


    /* =====================================================
       STATISTICS
       ===================================================== */

    function updateStatistics() {

        let companies = 0;
        let individuals = 0;


        allUsers.forEach(
            user => {

                const role =
                    getRole(user);


                if (
                    role === "company"
                ) {
                    companies++;
                }


                if (
                    role === "individual"
                ) {
                    individuals++;
                }

            }
        );


        if ($("total-users")) {

            $("total-users")
                .textContent =
                allUsers.length
                    .toLocaleString();
        }


        if ($("individual-users")) {

            $("individual-users")
                .textContent =
                individuals
                    .toLocaleString();
        }


        if ($("company-users")) {

            $("company-users")
                .textContent =
                companies
                    .toLocaleString();
        }
    }


    /* =====================================================
       RENDER USERS
       ===================================================== */

    function renderUsers(users) {

        const container =
            $("table-container");


        if (!container) {
            return;
        }


        if (!users.length) {

            container.innerHTML = `
                <div class="empty">
                    No users found.
                </div>
            `;

            return;
        }


        const rows =
            users
                .map(user => {

                    const role =
                        getRole(user);


                    const name =
                        user.full_name ||
                        user.company_name ||
                        "—";


                    const email =
                        user.email ||
                        "—";


                    const created =
                        formatDate(
                            user.created_at
                        );


                    const id =
                        user.id ||
                        "";


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(name)}
                            </td>

                            <td>
                                ${escapeHtml(email)}
                            </td>

                            <td>
                                ${roleBadge(role)}
                            </td>

                            <td>
                                ${escapeHtml(created)}
                            </td>

                            <td>
                                ${escapeHtml(
                                    id
                                        ? id.substring(0, 8) + "..."
                                        : "—"
                                )}
                            </td>

                        </tr>
                    `;

                })
                .join("");


        container.innerHTML = `

            <table>

                <thead>

                    <tr>

                        <th>
                            Name
                        </th>

                        <th>
                            Email
                        </th>

                        <th>
                            Account Type
                        </th>

                        <th>
                            Created
                        </th>

                        <th>
                            User ID
                        </th>

                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>

        `;
    }


    /* =====================================================
       SEARCH
       ===================================================== */

    function setupSearch() {

        const input =
            $("search");


        if (!input) {
            return;
        }


        input.addEventListener(
            "input",
            () => {

                const query =
                    input.value
                        .trim()
                        .toLowerCase();


                if (!query) {

                    renderUsers(
                        allUsers
                    );

                    return;
                }


                const filtered =
                    allUsers.filter(
                        user => {

                            const email =
                                String(
                                    user.email ||
                                    ""
                                )
                                .toLowerCase();


                            const name =
                                String(
                                    user.full_name ||
                                    user.company_name ||
                                    ""
                                )
                                .toLowerCase();


                            const role =
                                getRole(user);


                            return (
                                email.includes(
                                    query
                                ) ||
                                name.includes(
                                    query
                                ) ||
                                role.includes(
                                    query
                                )
                            );
                        }
                    );


                renderUsers(
                    filtered
                );
            }
        );
    }


    /* =====================================================
       NAVIGATION
       ===================================================== */

    function setupNavigation() {

        const back =
            $("back-dashboard");


        if (back) {

            back.addEventListener(
                "click",
                () => {

                    location.href =
                        "admin-dashboard.html";
                }
            );
        }


        const logout =
            $("logout");


        if (logout) {

            logout.addEventListener(
                "click",
                async () => {

                    logout.disabled =
                        true;


                    logout.textContent =
                        "Logging out...";


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


                    location.replace(
                        "admin-login.html"
                    );
                }
            );
        }
    }


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        try {

            const allowed =
                await verifyAdmin();


            if (!allowed) {
                return;
            }


            await loadUsers();


            setupSearch();


            setupNavigation();


            hideLoading();


        } catch (error) {

            console.error(
                "Admin users error:",
                error
            );


            showError(
                error?.message ||
                "Unable to load users."
            );


            hideLoading();
        }
    }


    window.Web3JobsAdminUsers = {

        refresh:
            loadUsers,

        getUsers:
            () => allUsers

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
