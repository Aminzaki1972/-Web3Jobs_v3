/* =========================================================
   Web3Jobs v3
   File: js/auth.js
   Unified Authentication System
   ========================================================= */

"use strict";

(function () {

    const AUTH = {};

    function getClient() {
        if (
            window.Web3JobsSupabase &&
            typeof window.Web3JobsSupabase.getClient === "function"
        ) {
            return window.Web3JobsSupabase.getClient();
        }

        if (
            window.supabaseClient &&
            window.supabaseClient.auth
        ) {
            return window.supabaseClient;
        }

        console.error(
            "Web3Jobs: Supabase client is unavailable."
        );

        return null;
    }

    function normalizeAccountType(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const type =
            String(value)
                .trim()
                .toLowerCase();

        if (
            [
                "company",
                "companies",
                "business",
                "employer",
                "organization",
                "شركة"
            ].includes(type)
        ) {
            return "company";
        }

        if (
            [
                "individual",
                "person",
                "user",
                "candidate",
                "freelancer",
                "individuals",
                "فرد",
                "فردي",
                "فردى"
            ].includes(type)
        ) {
            return "individual";
        }

        return null;
    }

    async function getCurrentSession() {
        const client = getClient();

        if (!client) {
            return null;
        }

        try {
            const {
                data,
                error
            } = await client.auth.getSession();

            if (error) {
                console.error(
                    "Web3Jobs: session error:",
                    error
                );

                return null;
            }

            return data?.session || null;

        } catch (error) {
            console.error(
                "Web3Jobs: session exception:",
                error
            );

            return null;
        }
    }

    async function getCurrentUser() {
        const client = getClient();

        if (!client) {
            return null;
        }

        try {
            const {
                data,
                error
            } = await client.auth.getUser();

            if (error) {
                console.error(
                    "Web3Jobs: user error:",
                    error
                );

                return null;
            }

            return data?.user || null;

        } catch (error) {
            console.error(
                "Web3Jobs: user exception:",
                error
            );

            return null;
        }
    }

    function isEmailConfirmed(user) {
        if (!user) {
            return false;
        }

        return Boolean(
            user.email_confirmed_at
        );
    }

    async function getAccountType(userId = null) {
        const client = getClient();

        if (!client) {
            return null;
        }

        const user =
            await getCurrentUser();

        const id =
            userId ||
            user?.id;

        if (!id) {
            return null;
        }

        /*
         * 1. profiles.account_type
         */
        try {
            const {
                data,
                error
            } = await client
                .from("profiles")
                .select("id,account_type,role")
                .eq("id", id)
                .maybeSingle();

            if (!error && data) {

                const profileType =
                    normalizeAccountType(
                        data.account_type
                    );

                if (profileType) {
                    return profileType;
                }

                const roleType =
                    normalizeAccountType(
                        data.role
                    );

                if (roleType) {
                    return roleType;
                }
            }

            if (error) {
                console.warn(
                    "Web3Jobs: profiles lookup:",
                    error.message
                );
            }

        } catch (error) {
            console.warn(
                "Web3Jobs: profiles exception:",
                error
            );
        }

        /*
         * 2. Auth metadata
         */
        if (user) {

            const metadata =
                user.user_metadata || {};

            const metadataType =
                normalizeAccountType(
                    metadata.account_type ||
                    metadata.accountType ||
                    metadata.role ||
                    metadata.user_type
                );

            if (metadataType) {
                return metadataType;
            }
        }

        /*
         * 3. Company profile fallback
         */
        try {
            const {
                data,
                error
            } = await client
                .from("company_profiles")
                .select("id")
                .eq("id", id)
                .maybeSingle();

            if (!error && data) {
                return "company";
            }

        } catch (error) {
            console.warn(
                "Web3Jobs: company profile lookup failed:",
                error
            );
        }

        return null;
    }

    function getBaseUrl() {
        const path =
            window.location.pathname;

        const lastSlash =
            path.lastIndexOf("/");

        const directory =
            lastSlash >= 0
                ? path.substring(
                    0,
                    lastSlash + 1
                )
                : "/";

        return (
            window.location.origin +
            directory
        );
    }

    function getLoginUrl() {
        return (
            getBaseUrl() +
            "login.html"
        );
    }

    function getDashboardUrl(accountType) {

        const type =
            normalizeAccountType(
                accountType
            );

        if (type === "company") {
            return (
                getBaseUrl() +
                "company-dashboard.html"
            );
        }

        if (type === "individual") {
            return (
                getBaseUrl() +
                "dashboard.html"
            );
        }

        return (
            getBaseUrl() +
            "index.html"
        );
    }

    function showMessage(message) {
        const elements = [
            document.getElementById("authMessage"),
            document.getElementById("loginMessage"),
            document.getElementById("signupMessage"),
            document.querySelector(".auth-message")
        ];

        const element =
            elements.find(Boolean);

        if (!element) {
            return;
        }

        element.textContent =
            message;

        element.style.display =
            "block";
    }

    function showAuthError(error) {

        const message =
            error?.message ||
            "Authentication failed.";

        showMessage(message);
    }

    async function loginUser(
        email,
        password
    ) {

        const client = getClient();

        if (!client) {
            showMessage(
                "Authentication service is unavailable."
            );

            return {
                success: false
            };
        }

        email =
            String(email || "")
                .trim()
                .toLowerCase();

        password =
            String(password || "");

        if (!email || !password) {
            showMessage(
                "Please enter your email and password."
            );

            return {
                success: false
            };
        }

        try {

            const {
                data,
                error
            } = await client.auth
                .signInWithPassword({
                    email,
                    password
                });

            if (error) {
                showAuthError(error);

                return {
                    success: false,
                    error
                };
            }

            const user =
                data?.user;

            if (!user) {
                showMessage(
                    "User account was not found."
                );

                return {
                    success: false
                };
            }

            if (!isEmailConfirmed(user)) {

                await client.auth.signOut();

                showMessage(
                    "Your email is not confirmed. Please confirm it first."
                );

                return {
                    success: false,
                    emailNotConfirmed: true
                };
            }

            const accountType =
                await getAccountType(
                    user.id
                );

            if (!accountType) {

                showMessage(
                    "Login succeeded, but the account type could not be determined."
                );

                return {
                    success: false,
                    accountTypeMissing: true,
                    user
                };
            }

            const dashboardUrl =
                getDashboardUrl(
                    accountType
                );

            return {
                success: true,
                user,
                accountType,
                dashboardUrl
            };

        } catch (error) {

            console.error(
                "Web3Jobs: login exception:",
                error
            );

            showAuthError(error);

            return {
                success: false,
                error
            };
        }
    }

    async function protectDashboard(
        requiredAccountType = null
    ) {

        const session =
            await getCurrentSession();

        if (!session?.user) {

            window.location.replace(
                getLoginUrl()
            );

            return false;
        }

        const user =
            session.user;

        if (!isEmailConfirmed(user)) {

            const client =
                getClient();

            if (client) {
                await client.auth.signOut();
            }

            window.location.replace(
                getLoginUrl()
            );

            return false;
        }

        const accountType =
            await getAccountType(
                user.id
            );

        if (!accountType) {

            console.error(
                "Web3Jobs: account type could not be determined."
            );

            return false;
        }

        if (requiredAccountType) {

            const required =
                normalizeAccountType(
                    requiredAccountType
                );

            if (
                required &&
                accountType !== required
            ) {

                window.location.replace(
                    getDashboardUrl(
                        accountType
                    )
                );

                return false;
            }
        }

        return {
            authenticated: true,
            emailConfirmed: true,
            user,
            accountType
        };
    }

    async function logout() {

        const client =
            getClient();

        if (client) {
            try {
                await client.auth.signOut();
            } catch (error) {
                console.error(
                    "Web3Jobs: logout error:",
                    error
                );
            }
        }

        window.location.replace(
            getLoginUrl()
        );
    }

    async function redirectAfterLogin() {

        const session =
            await getCurrentSession();

        if (!session?.user) {
            return false;
        }

        const accountType =
            await getAccountType(
                session.user.id
            );

        if (!accountType) {
            return false;
        }

        window.location.replace(
            getDashboardUrl(
                accountType
            )
        );

        return true;
    }

    AUTH.getClient =
        getClient;

    AUTH.getCurrentSession =
        getCurrentSession;

    AUTH.getCurrentUser =
        getCurrentUser;

    AUTH.getAccountType =
        getAccountType;

    AUTH.normalizeAccountType =
        normalizeAccountType;

    AUTH.login =
        loginUser;

    AUTH.loginUser =
        loginUser;

    AUTH.logout =
        logout;

    AUTH.signOut =
        logout;

    AUTH.protectDashboard =
        protectDashboard;

    AUTH.getDashboardUrl =
        getDashboardUrl;

    AUTH.getLoginUrl =
        getLoginUrl;

    AUTH.redirectAfterLogin =
        redirectAfterLogin;

    AUTH.isEmailConfirmed =
        isEmailConfirmed;

    window.Web3JobsAuth =
        AUTH;

    window.getAccountType =
        getAccountType;

    window.getCurrentUser =
        getCurrentUser;

    window.getCurrentSession =
        getCurrentSession;

    window.protectDashboard =
        protectDashboard;

})();
