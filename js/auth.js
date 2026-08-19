/* =========================================================
   Web3Jobs v3 - Unified Authentication
   - Email/password auth
   - Supabase Sign in with Web3 (EIP-4361)
   - Ethereum + Solana wallet support
   - Wallet account provisioning in profiles
   - No client-controlled admin authorization
   ========================================================= */
"use strict";

(function () {
    function getClient() {
        const client = window.Web3JobsSupabase?.getClient?.() || window.supabaseClient;
        if (client && client.auth) return client;
        console.error("Web3Jobs Auth: Supabase client unavailable.");
        return null;
    }

    async function getCurrentSession() {
        const client = getClient();
        if (!client) return null;
        try {
            const { data, error } = await client.auth.getSession();
            if (error) throw error;
            return data?.session || null;
        } catch (error) {
            console.error("Web3Jobs getSession:", error);
            return null;
        }
    }

    async function getCurrentUser() {
        const session = await getCurrentSession();
        return session?.user || null;
    }

    function normalizeAccountType(value) {
        const type = String(value || "").trim().toLowerCase();
        if (["admin", "administrator", "superadmin", "super_admin"].includes(type)) return "admin";
        if (["company", "business", "employer", "organization", "company_account", "company-account"].includes(type)) return "company";
        if (["individual", "person", "user", "candidate", "freelancer", "individual_account", "individual-account"].includes(type)) return "individual";
        return null;
    }

    /* Never use user-editable metadata as the authoritative role source. */
    async function getAccountType(userId = null) {
        const client = getClient();
        const user = await getCurrentUser();
        const id = userId || user?.id;
        if (!client || !id) return null;

        try {
            const { data, error } = await client
                .from("profiles")
                .select("account_type,role")
                .eq("id", id)
                .maybeSingle();

            if (!error && data) {
                if (normalizeAccountType(data.role) === "admin") return "admin";
                return normalizeAccountType(data.account_type) || normalizeAccountType(data.role) || "individual";
            }
        } catch (error) {
            console.warn("Web3Jobs profile role lookup:", error);
        }

        /* Admin is verified by the database function, never by metadata/localStorage. */
        try {
            const { data, error } = await client.rpc("is_admin");
            if (!error && data === true) return "admin";
        } catch (error) {
            console.warn("Web3Jobs admin check:", error);
        }

        return "individual";
    }

    function isEmailConfirmed(user) {
        return Boolean(user?.email_confirmed_at || user?.confirmed_at);
    }

    function getBaseUrl() {
        const path = window.location.pathname;
        const index = path.lastIndexOf("/");
        return window.location.origin + (index >= 0 ? path.substring(0, index + 1) : "/");
    }

    function getLoginUrl() { return getBaseUrl() + "login.html"; }

    function getDashboardUrl(accountType) {
        const type = normalizeAccountType(accountType);
        if (type === "admin") return getBaseUrl() + "admin-dashboard.html";
        if (type === "company") return getBaseUrl() + "company-dashboard.html";
        return getBaseUrl() + "dashboard.html";
    }

    function showAuthMessage(arabic, english, type = "info") {
        const element = document.getElementById("auth-message") || document.getElementById("register-message");
        if (!element) return console.log(arabic, english);
        element.innerHTML = "";
        const box = document.createElement("div");
        box.className = "auth-message-box auth-message-" + type;
        const ar = document.createElement("div");
        ar.textContent = arabic;
        const en = document.createElement("div");
        en.textContent = english;
        box.append(ar, en);
        element.appendChild(box);
        element.style.display = "block";
    }

    function showAuthError(error) {
        const raw = String(error?.message || error?.error_description || error || "Authentication failed.");
        const text = raw.toLowerCase();
        if (text.includes("invalid login credentials")) return showAuthMessage("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "Invalid email or password.", "error");
        if (text.includes("email not confirmed")) return showAuthMessage("البريد الإلكتروني غير مؤكد.", "Email address is not confirmed.", "error");
        if (text.includes("failed to fetch") || text.includes("network") || text.includes("fetch")) return showAuthMessage("تعذر الاتصال بخادم Supabase.", "Could not connect to Supabase.", "error");
        if (text.includes("too many") || text.includes("rate limit")) return showAuthMessage("تم تجاوز عدد المحاولات. حاول لاحقًا.", "Too many attempts. Please try again later.", "error");
        if (text.includes("web3") || text.includes("wallet") || text.includes("provider") || text.includes("disabled")) return showAuthMessage("تسجيل الدخول بالمحفظة غير مفعّل أو غير مدعوم حاليًا في Supabase.", "Web3 wallet authentication is not enabled or supported by the current Supabase Auth configuration.", "error");
        showAuthMessage("حدث خطأ: " + raw, "Authentication error: " + raw, "error");
    }

    async function loginUser(email, password) {
        const client = getClient();
        if (!client) return { success: false };
        email = String(email || "").trim().toLowerCase();
        password = String(password || "");
        if (!email || !password) {
            showAuthMessage("يرجى إدخال البريد الإلكتروني وكلمة المرور.", "Please enter your email and password.", "error");
            return { success: false };
        }
        try {
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) { showAuthError(error); return { success: false, error }; }
            const user = data?.user;
            const session = data?.session;
            if (!user || !session) return { success: false };
            const accountType = await getAccountType(user.id);
            try {
                localStorage.setItem("web3jobs_account_type", accountType);
                localStorage.setItem("web3jobs_user_id", user.id);
            } catch (_) {}
            return { success: true, user, session, accountType, dashboardUrl: getDashboardUrl(accountType) };
        } catch (error) {
            showAuthError(error);
            return { success: false, error };
        }
    }

    async function ensureWalletProfile(user, accountType) {
        const client = getClient();
        if (!client || !user?.id) return false;

        const { data: existing, error: readError } = await client
            .from("profiles")
            .select("id,account_type,role,full_name,email")
            .eq("id", user.id)
            .maybeSingle();

        if (readError) {
            console.error("Web3Jobs wallet profile lookup:", readError);
            return false;
        }

        if (existing) return true;

        const identity = user.identities?.find(i => i.provider === "ethereum" || i.provider === "solana");
        const walletAddress = identity?.identity_data?.address || identity?.identity_data?.sub || "";
        const safeType = accountType === "company" ? "company" : "individual";
        const { error } = await client.from("profiles").insert({
            id: user.id,
            email: user.email || null,
            full_name: walletAddress ? `Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Web3 Wallet User",
            account_type: safeType,
            role: safeType
        });

        if (error) {
            console.error("Web3Jobs wallet profile creation:", error);
            showAuthMessage("تم تسجيل المحفظة لكن تعذر إنشاء ملف الحساب. تحقق من صلاحيات profiles.", "Wallet authentication succeeded, but the profile could not be created.", "error");
            return false;
        }
        return true;
    }

    async function signInWithWallet(accountType = "individual") {
        const client = getClient();
        if (!client) {
            showAuthMessage("تعذر الاتصال بـ Supabase.", "Supabase connection is unavailable.", "error");
            return { success: false };
        }

        if (!client.auth || typeof client.auth.signInWithWeb3 !== "function") {
            showAuthMessage("إصدار مكتبة Supabase في الصفحة لا يدعم Web3. سيتم تحديثه عند نشر الإصلاح.", "The loaded Supabase client does not expose signInWithWeb3.", "error");
            return { success: false };
        }

        accountType = accountType === "company" ? "company" : "individual";

        try {
            let chain = null;
            if (window.ethereum) chain = "ethereum";
            else if (window.solana || window.phantom?.solana) chain = "solana";

            if (!chain) {
                showAuthMessage("لم يتم العثور على محفظة Web3. ثبّت MetaMask أو محفظة Ethereum/Solana ثم أعد المحاولة.", "No Web3 wallet was detected. Install MetaMask or a compatible Ethereum/Solana wallet and try again.", "error");
                return { success: false };
            }

            const wallet = chain === "solana" ? (window.phantom?.solana || window.solana) : undefined;
            const result = await client.auth.signInWithWeb3({
                chain,
                statement: "I accept the Web3Jobs Terms of Service.",
                ...(wallet ? { wallet } : {})
            });

            if (result.error) {
                showAuthError(result.error);
                return { success: false, error: result.error };
            }

            const user = result.data?.user;
            const session = result.data?.session;
            if (!user || !session) {
                showAuthMessage("تم توقيع الرسالة ولكن لم يتم إنشاء جلسة.", "The wallet signature was accepted but no session was created.", "error");
                return { success: false };
            }

            const profileReady = await ensureWalletProfile(user, accountType);
            if (!profileReady) return { success: false };

            const realAccountType = await getAccountType(user.id);
            try {
                localStorage.setItem("web3jobs_account_type", realAccountType || accountType);
                localStorage.setItem("web3jobs_user_id", user.id);
            } catch (_) {}

            const dashboardUrl = getDashboardUrl(realAccountType || accountType);
            window.location.replace(dashboardUrl);
            return { success: true, user, session, accountType: realAccountType || accountType, dashboardUrl };
        } catch (error) {
            console.error("Web3Jobs Web3 authentication:", error);
            showAuthError(error);
            return { success: false, error };
        }
    }

    async function protectDashboard(requiredAccountType = null) {
        const session = await getCurrentSession();
        if (!session?.user) {
            window.location.replace(getLoginUrl());
            return false;
        }
        const accountType = await getAccountType(session.user.id);
        if (requiredAccountType) {
            const required = normalizeAccountType(requiredAccountType);
            if (required && accountType !== required) {
                window.location.replace(getDashboardUrl(accountType));
                return false;
            }
        }
        try {
            localStorage.setItem("web3jobs_account_type", accountType);
            localStorage.setItem("web3jobs_user_id", session.user.id);
        } catch (_) {}
        return { authenticated: true, emailConfirmed: isEmailConfirmed(session.user), user: session.user, accountType };
    }

    async function logoutUser() {
        const client = getClient();
        try { if (client) await client.auth.signOut(); } catch (error) { console.error(error); }
        try { localStorage.removeItem("web3jobs_account_type"); localStorage.removeItem("web3jobs_user_id"); } catch (_) {}
        window.location.replace(getLoginUrl());
    }

    async function resetPassword(email) {
        const client = getClient();
        if (!client) return false;
        try {
            const { error } = await client.auth.resetPasswordForEmail(String(email || "").trim().toLowerCase(), { redirectTo: getLoginUrl() });
            if (error) { showAuthError(error); return false; }
            showAuthMessage("تم إرسال رابط إعادة تعيين كلمة المرور.", "Password reset link has been sent.", "success");
            return true;
        } catch (error) { showAuthError(error); return false; }
    }

    async function resendConfirmationEmail(email) {
        const client = getClient();
        if (!client) return false;
        try {
            const { error } = await client.auth.resend({ type: "signup", email: String(email || "").trim().toLowerCase(), options: { emailRedirectTo: getLoginUrl() } });
            if (error) { showAuthError(error); return false; }
            showAuthMessage("تم إرسال رسالة تأكيد جديدة.", "A new confirmation email has been sent.", "success");
            return true;
        } catch (error) { showAuthError(error); return false; }
    }

    function initializeWalletButtons() {
        const buttons = [
            ...document.querySelectorAll("#wallet-register-button"),
            ...document.querySelectorAll(".wallet-button")
        ];
        const unique = [...new Set(buttons)];
        unique.forEach(button => {
            if (button.dataset.web3jobsWalletBound === "1") return;
            button.dataset.web3jobsWalletBound = "1";
            button.addEventListener("click", async event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                const selected = document.querySelector('input[name="account-type"]:checked')?.value || "individual";
                button.disabled = true;
                const original = button.textContent;
                button.textContent = "جاري الاتصال بالمحفظة...";
                try { await signInWithWallet(selected); }
                finally { button.disabled = false; button.textContent = original; }
            }, true);
        });
    }

    function initializeAuth() {
        if (!getClient()) return;
        initializeWalletButtons();
        console.log("Web3Jobs Auth System loaded.");
    }

    window.Web3JobsAuth = {
        getClient, getCurrentUser, getCurrentSession, getAccountType,
        login: loginUser, loginUser, logout: logoutUser, logoutUser,
        resetPassword, resendConfirmation: resendConfirmationEmail,
        signInWithWallet, protectDashboard,
        protectAdminDashboard: () => protectDashboard("admin"),
        protectCompanyDashboard: () => protectDashboard("company"),
        protectIndividualDashboard: () => protectDashboard("individual"),
        getDashboardUrl, getLoginUrl, isEmailConfirmed,
        normalizeAccountType, showMessage: showAuthMessage, showError: showAuthError
    };

    window.getCurrentUser = getCurrentUser;
    window.getCurrentSession = getCurrentSession;
    window.getAccountType = getAccountType;
    window.protectDashboard = protectDashboard;
    window.protectAdminDashboard = () => protectDashboard("admin");
    window.protectCompanyDashboard = () => protectDashboard("company");
    window.protectIndividualDashboard = () => protectDashboard("individual");

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeAuth, { once: true });
    else initializeAuth();
})();
