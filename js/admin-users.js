"use strict";

(() => {

    let client = null;
    let currentUser = null;
    let allUsers = [];

    const $ = id => document.getElementById(id);


    function getSupabase() {

        if (client) {
            return client;
        }

        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient === "function"
        ) {
            client = window.Web3JobsSupabase.getClient();
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
            client = window.supabase.createClient(
                window.SUPABASE_URL,
                window.SUPABASE_ANON_KEY
            );

            return client;
        }

        throw new Error(
            "Supabase client is not initialized."
        );
    }


    function showError(message) {

        const element = $("error");

        if (!element) {
            return;
        }

        element.textContent = message;
        element.style.display = "block";
    }


    function hideError() {

        const element = $("error");

        if (element) {
            element.style.display = "none";
        }
    }


    function hideLoading() {

        const loading = $("admin-loading");
        const content = $("content");

        if (loading) {
            loading.style.display = "none";
        }

        if (content) {
            content.style.display = "block";
        }
    }


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


    function getRole(user) {

        const role =
            String(user.role || "")
                .trim()
                .toLowerCase();

        if (role === "admin") {
            return "admin";
        }

        if (role === "company") {
            return "company";
        }

        if (role === "individual") {
            return "individual";
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


    async function verifyAdmin() {

        const supabase = getSupabase();

        const {
            data,
            error
        } = await supabase.auth.getUser();

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
        } = await supabase
            .from("profiles")
            .select("id,email,role")
            .eq("id", currentUser.id)
            .maybeSingle();


        if (profileError) {
            throw profileError;
        }


        if (
            !profile ||
            String(profile.role || "")
                .toLowerCase() !== "admin"
        ) {

            showError(
                "Access denied. Administrator privileges are required."
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


    async function loadUsers() {

        hideError();

        const supabase =
            getSupabase();


        const {
            data,
            error
        } = await supabase
            .from("profiles")
            .select("*")
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


    async function addCompanyInformation() {

        if (!allUsers.length) {
            return;
        }


        try {

            const {
                data,
                error
            } = await getSupabase()
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


            data.forEach(company => {

                if (company.user_id) {

                    companyMap.set(
                        company.user_id,
                        company
                    );

                }

            });


            allUsers =
                allUsers.map(user => {

                    const company =
                        companyMap.get(
                            user.id
                        );


                    if (company) {

                        return {
                            ...user,
                            role: "company",
                            company_name:
                                company.company_name ||
                                ""
                        };

                    }

                    return user;

                });


        } catch (error) {

            console.warn(
                "Company detection:",
                error
            );
        }
    }


    function updateStatistics() {

        const total =
            allUsers.length;


        let companies = 0;
        let individuals = 0;


        allUsers.forEach(user => {

            const role =
                getRole(user);


            if (role === "company") {
                companies++;
            }

            if (role === "individual") {
                individuals++;
            }

        });


        if ($("total-users")) {

            $("total-users")
                .textContent =
                total.toLocaleString();

        }


        if ($("individual-users")) {

            $("individual-users")
                .textContent =
                individuals.toLocaleString();

        }


        if ($("company-users")) {

            $("company-users")
                .textContent =
                companies.toLocaleString();

        }
    }


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
            users.map(user => {

                const role =
                    getRole(user);


                const email =
                    user.email ||
                    "—";


                const name =
                    user.name ||
                    user.full_name ||
                    user.company_name ||
                    "—";


                const created =
                    user.created_at ||
                    user.createdAt ||
                    null;


                const id =
                    user.id ||
                    "—";


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
                            ${escapeHtml(
                                formatDate(created)
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                id.slice(0, 8)
                            )}
                        </td>

                    </tr>
                `;

            }).join("");


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
                    allUsers.filter(user => {

                        const email =
                            String(
                                user.email || ""
                            )
                            .toLowerCase();


                        const name =
                            String(
                                user.name ||
                                user.full_name ||
                                user.company_name ||
                                ""
                            )
                            .toLowerCase();


                        const role =
                            getRole(user);


                        return (
                            email.includes(query) ||
                            name.includes(query) ||
                            role.includes(query)
                        );

                    });


                renderUsers(
                    filtered
                );

            }
        );
    }


    function setupNavigation() {

        $("back-dashboard")
            ?.addEventListener(
                "click",
                () => {

                    location.href =
                        "admin-dashboard.html";

                }
            );


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

                    }


                    location.replace(
                        "login.html"
                    );

                }
            );
    }


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
                "Admin users:",
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
