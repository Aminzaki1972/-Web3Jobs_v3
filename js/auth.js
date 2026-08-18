/* =========================================================
   Web3Jobs v3
   File: js/auth.js

   SIMPLE / STABLE AUTHENTICATION
   ---------------------------------------------------------
   - Uses ONLY js/supabase.js
   - NO second Supabase client
   - NO company_profiles
   - Uses profiles.role for account type
   - Login does NOT depend on dashboard queries
   - No automatic redirect during normal login checks
   ========================================================= */

"use strict";

(function () {

    function getClient() {
        if (window.Web3JobsSupabase && typeof window.Web3JobsSupabase.getClient === "function") {
            const client = window.Web3JobsSupabase.getClient();
            if (client && typeof client.from === "function") return client;
        }
        if (window.supabaseClient && typeof window.supabaseClient.from === "function") return window.supabaseClient;
        console.error("Web3Jobs Auth: Supabase client unavailable.");
        return null;
    }

    async function getCurrentSession() {
        const client = getClient();
        if (!client) return null;
        try {
            const { data, error } = await client.auth.getSession();
            if (error) {
                console.error("Web3Jobs getSession:", error);
                return null;
            }
            return data?.session || null;
        } catch (error) {
            console.error("Web3Jobs getSession exception:", error);
            return null;
        }
    }

    async function getCurrentUser() {
        const session = await getCurrentSession();
        return session?.user || null;
    }

    function normalizeAccountType(value) {
        if (value === null || value === undefined) return null;
        const type = String(value).trim().toLowerCase();
        if (["admin","administrator","superadmin","super_admin"].includes(type)) return "admin";
        if (["company","business","employer","organization","company_account","company-account"].includes(type)) return "company";
        if (["individual","person","user","candidate","freelancer","individual_account","individual-account"].includes(type)) return "individual";
        return null;
    }

    async function getAccountType(userId = null) {
        const client = getClient();
        if (!client) return null;
        const user = await getCurrentUser();
        const id = userId || user?.id;
        if (!id) return null;

        const metadata = user?.user_metadata || {};
        const metadataType = normalizeAccountType(
            metadata.role || metadata.account_type || metadata.accountType || metadata.user_type || metadata.userType
        );
        if (metadataType) return metadataType;

        try {
            const result = await client.from("profiles").select("*").eq("id", id).maybeSingle();
            if (!result.error && result.data) {
                const profile = result.data;
                const type = normalizeAccountType(
                    profile.role || profile.account_type || profile.accountType || profile.user_type || profile.userType || profile.type
                );
                if (type) return type;
            }
        } catch (error) {
            console.warn("Web3Jobs profiles ID lookup:", error);
        }

        try {
            const result = await client.from("profiles").select("*").eq("user_id", id).maybeSingle();
            if (!result.error && result.data) {
                const profile = result.data;
                const type = normalizeAccountType(
                    profile.role || profile.account_type || profile.accountType || profile.user_type || profile.userType || profile.type
                );
                if (type) return type;
            }
        } catch (error) {
            console.warn("Web3Jobs profiles user_id lookup skipped:", error);
        }

        return "individual";
    }

    function isEmailConfirmed(user) {
        if (!user) return false;
        return Boolean(user.email_confirmed_at || user.confirmed_at);
    }

    function getBaseUrl() {
        const path = window.location.pathname;
        const index = path.lastIndexOf("/");
        const directory = index >= 0 ? path.substring(0, index + 1) : "/";
        return window.location.origin + directory;
    }

    function getLoginUrl() {
        return getBaseUrl() + "login.html";
    }

    function getDashboardUrl(accountType) {
        const type = normalizeAccountType(accountType);
        if (type === "admin") return getBaseUrl() + "admin-dashboard.html";
        if (type === "company") return getBaseUrl() + "company-dashboard.html";
        return getBaseUrl() + "dashboard.html";
    }

    async function loginUser(email, password) {
        const client = getClient();
        if (!client) {
            showAuthMessage("تعذر الاتصال بـ Supabase.", "Supabase connection is unavailable.", "error");
            return { success: false };
        }

        email = String(email || "").trim().toLowerCase();
        password = String(password || "");

        if (!email || !password) {
            showAuthMessage("يرجى إدخال البريد الإلكتروني وكلمة المرور.", "Please enter your email and password.", "error");
            return { success: false };
        }

        try {
            const result = await client.auth.signInWithPassword({ email, password });
            if (result.error) {
                showAuthError(result.error);
                return { success: false, error: result.error };
            }

            const user = result.data?.user;
            const session = result.data?.session;
            if (!user || !session) {
                showAuthMessage("تم تسجيل الدخول ولكن لم يتم إنشاء جلسة.", "Login succeeded but no session was created.", "error");
                return { success: false };
            }

            const accountType = await getAccountType(user.id);

            try {
                localStorage.setItem("web3jobs_account_type", accountType);
                localStorage.setItem("web3jobs_user_id", user.id);
            } catch (error) {
                console.warn("Web3Jobs localStorage error:", error);
            }

            return {
                success: true,
                user,
                session,
                accountType,
                dashboardUrl: getDashboardUrl(accountType)
            };
        } catch (error) {
            showAuthError(error);
            return { success: false, error };
        }
    }

    async function protectDashboard(requiredAccountType = null) {
        const session = await getCurrentSession();
        if (!session || !session.user) {
            window.location.replace(getLoginUrl());
            return false;
        }

        const user = session.user;
        const accountType = await getAccountType(user.id);
        if (!accountType) {
            showDashboardAccessError();
            return false;
        }

        if (requiredAccountType) {
            const required = normalizeAccountType(requiredAccountType);
            if (required && accountType !== required) {
                window.location.replace(getDashboardUrl(accountType));
                return false;
            }
        }

        try {
            localStorage.setItem("web3jobs_account_type", accountType);
            localStorage.setItem("web3jobs_user_id", user.id);
        } catch (error) {
            console.warn("Web3Jobs dashboard storage:", error);
        }

        return {
            authenticated: true,
            emailConfirmed: isEmailConfirmed(user),
            user,
            accountType
        };
    }

    async function protectAdminDashboard() { return await protectDashboard("admin"); }
    async function protectCompanyDashboard() { return await protectDashboard("company"); }
    async function protectIndividualDashboard() { return await protectDashboard("individual"); }

    async function logoutUser() {
        const client = getClient();
        if (client) {
            try { await client.auth.signOut(); } catch (error) { console.error("Web3Jobs logout:", error); }
        }
        try {
            localStorage.removeItem("web3jobs_account_type");
            localStorage.removeItem("web3jobs_user_id");
        } catch (error) {
            console.warn("Web3Jobs localStorage:", error);
        }
        window.location.replace(getLoginUrl());
        return true;
    }

    async function resetPassword(email) {
        const client = getClient();
        if (!client) return false;
        email = String(email || "").trim().toLowerCase();
        if (!email) {
            showAuthMessage("يرجى إدخال البريد الإلكتروني.", "Please enter your email address.", "error");
            return false;
        }
        try {
            const result = await client.auth.resetPasswordForEmail(email, { redirectTo: getLoginUrl() });
            if (result.error) { showAuthError(result.error); return false; }
            showAuthMessage("تم إرسال رابط إعادة تعيين كلمة المرور.", "Password reset link has been sent.", "success");
            return true;
        } catch (error) {
            showAuthError(error);
            return false;
        }
    }

    async function resendConfirmationEmail(email) {
        const client = getClient();
        if (!client) return false;
        email = String(email || "").trim().toLowerCase();
        if (!email) return false;
        try {
            const result = await client.auth.resend({
                type: "signup",
                email,
                options: { emailRedirectTo: getLoginUrl() }
            });
            if (result.error) { showAuthError(result.error); return false; }
            showAuthMessage("تم إرسال رسالة تأكيد جديدة.", "A new confirmation email has been sent.", "success");
            return true;
        } catch (error) {
            showAuthError(error);
            return false;
        }
    }

    function showAuthError(error) {
        const raw = String(error?.message || error?.error_description || error || "Authentication failed.");
        const text = raw.toLowerCase();

        if (text.includes("invalid login credentials")) {
            showAuthMessage("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "Invalid email or password.", "error");
            return;
        }
        if (text.includes("email not confirmed")) {
            showAuthMessage("البريد الإلكتروني غير مؤكد في Supabase.", "Email address is not confirmed in Supabase.", "error");
            return;
        }
        if (text.includes("failed to fetch") || text.includes("network") || text.includes("fetch")) {
            showAuthMessage("تعذر الاتصال بخادم Supabase.", "Could not connect to Supabase.", "error");
            return;
        }
        if (text.includes("too many") || text.includes("rate limit")) {
            showAuthMessage("تم تجاوز عدد المحاولات. انتظر قليلاً ثم حاول مرة أخرى.", "Too many attempts. Please wait and try again.", "error");
            return;
        }
        showAuthMessage("حدث خطأ: " + raw, "Authentication error: " + raw, "error");
    }

    function showAuthMessage(arabic, english, type = "info") {
        const element = document.getElementById("auth-message");
        if (!element) {
            console.log(arabic, english);
            return;
        }
        element.innerHTML = "";
        const box = document.createElement("div");
        box.className = "auth-message-box auth-message-" + type;
        const ar = document.createElement("div");
        ar.textContent = arabic;
        const en = document.createElement("div");
        en.textContent = english;
        box.appendChild(ar);
        box.appendChild(en);
        element.appendChild(box);
        element.style.display = "block";
    }

    function showDashboardAccessError() {
        const loading = document.getElementById("loading-spinner");
        const dashboard = document.getElementById("dashboard-content");
        if (loading) {
            loading.innerHTML = `
                <div class="loading-card">
                    <h2>Dashboard Access Error</h2>
                    <p>We could not verify your account.</p>
                    <a href="login.html" style="display:inline-block;margin-top:18px;padding:10px 16px;border-radius:9px;text-decoration:none;background:#6ee7b7;color:#06101d;font-weight:800;">Return to Login</a>
                </div>`;
            loading.style.display = "flex";
        }
        if (dashboard) dashboard.style.display = "none";
    }

    /* =====================================================
       COMPANY PROFILE NAVIGATION
       -----------------------------------------------------
       The company dashboard already contains a Company Profile
       menu item. Route that item to the dedicated editor without
       changing the authentication flow or database policies.
       ===================================================== */
    function initializeCompanyProfileNavigation() {
        document.addEventListener("click", function (event) {
            const target = event.target instanceof Element ? event.target.closest("a") : null;
            if (!target) return;

            const href = target.getAttribute("href") || "";
            const isCompanyProfileLink = href === "company-dashboard.html#company-profile";

            if (isCompanyProfileLink) {
                event.preventDefault();
                window.location.href = "company-profile.html";
            }
        }, true);
    }

    window.Web3JobsAuth = {
        getClient,
        getCurrentUser,
        getCurrentSession,
        getAccountType,
        login: loginUser,
        loginUser,
        logout: logoutUser,
        logoutUser,
        resetPassword,
        resendConfirmation: resendConfirmationEmail,
        protectDashboard,
        protectAdminDashboard,
        protectCompanyDashboard,
        protectIndividualDashboard,
        getDashboardUrl,
        getLoginUrl,
        isEmailConfirmed,
        normalizeAccountType,
        showMessage: showAuthMessage,
        showError: showAuthError
    };

    window.getCurrentUser = getCurrentUser;
    window.getCurrentSession = getCurrentSession;
    window.getAccountType = getAccountType;
    window.protectDashboard = protectDashboard;
    window.protectAdminDashboard = protectAdminDashboard;
    window.protectCompanyDashboard = protectCompanyDashboard;
    window.protectIndividualDashboard = protectIndividualDashboard;

    function initializeAuth() {
        const client = getClient();
        if (!client) {
            console.error("Web3Jobs Auth: Supabase unavailable.");
            return;
        }
        initializeCompanyProfileNavigation();
        console.log("Web3Jobs Auth System loaded.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeAuth, { once: true });
    } else {
        initializeAuth();
    }

})();
