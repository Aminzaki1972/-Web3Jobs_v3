/* =========================================================
   Web3Jobs - Company Dashboard
   Supabase + Jobs + Applications + USDT BEP-20
   Clean / Compact Version
   ========================================================= */

(() => {
    "use strict";

    /* =========================
       CONFIG
       ========================= */

    const CONFIG = window.COMPANY_DASHBOARD_CONFIG || {
        bscChainId: "0x38",
        bscChainName: "BNB Smart Chain",
        bscExplorer: "https://bscscan.com/tx/",
        paymentWallet: "0x17dDE403631e0fbe7cf9194d25f5ee212Ca71B36",
        usdtContract: "0x55d398326f99059fF775485246999027B3197955",
        usdtDecimals: 18,

        plans: {
            free: {
                code: "free",
                name: "Free",
                price: 0,
                limit: 2,
                durationDays: 30
            },
            starter: {
                code: "starter",
                name: "Starter",
                price: 19,
                limit: 5,
                durationDays: 30
            },
            professional: {
                code: "professional",
                name: "Professional",
                price: 49,
                limit: 20,
                durationDays: 30
            },
            enterprise: {
                code: "enterprise",
                name: "Enterprise",
                price: 99,
                limit: null,
                durationDays: 30
            }
        }
    };

    const $ = id => document.getElementById(id);

    let client = null;
    let user = null;
    let companyProfile = null;
    let currentPlan = CONFIG.plans.free;
    let selectedPlan = null;
    let wallet = null;
    let paymentBusy = false;
    let jobs = [];

    /* =========================
       HELPERS
       ========================= */

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

    function alertUser(message, type = "success") {
        if (typeof window.showAlert === "function") {
            window.showAlert(message, type);
        } else {
            alert(message);
        }
    }

    function shortAddress(address) {
        if (!address) return "—";
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function companyName() {
        return (
            companyProfile?.company_name ||
            user?.user_metadata?.company_name ||
            user?.user_metadata?.name ||
            "Company"
        );
    }

    function normalizePlan(code) {
        return String(code || "free").toLowerCase();
    }

    function getPlan(code) {
        return (
            Object.values(CONFIG.plans).find(
                plan => plan.code === normalizePlan(code)
            ) || CONFIG.plans.free
        );
    }

    function monthlyJobs() {
        const now = new Date();

        return jobs.filter(job => {
            if (!job.created_at) return false;

            const date = new Date(job.created_at);

            return (
                date.getFullYear() === now.getFullYear() &&
                date.getMonth() === now.getMonth()
            );
        }).length;
    }

    /* =========================
       SUPABASE
       ========================= */

    function supabase() {
        if (client) return client;

        if (window.supabaseClient) {
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

        throw new Error("Supabase is not initialized.");
    }

    /* =========================
       AUTH
       ========================= */

    async function loadUser() {
        const sb = supabase();

        const { data, error } =
            await sb.auth.getUser();

        if (error) throw error;

        user = data?.user || null;

        if (!user) {
            location.href = "login.html";
            return false;
        }

        return true;
    }

    /* =========================
       COMPANY PROFILE
       ========================= */

    async function loadCompanyProfile() {
        const sb = supabase();

        const { data, error } =
            await sb
                .from("company_profiles")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();

        if (error) {
            console.warn(
                "Company profile:",
                error.message
            );
            return;
        }

        companyProfile = data || null;

        renderCompanyProfile();
    }

    function renderCompanyProfile() {
        setText(
            "company-name",
            companyName()
        );

        const fields = {
            "company-name-input":
                companyProfile?.company_name || "",
            "company-website":
                companyProfile?.website || "",
            "company-location":
                companyProfile?.location || "",
            "company-linkedin":
                companyProfile?.linkedin || "",
            "company-description":
                companyProfile?.description || ""
        };

        Object.entries(fields).forEach(
            ([id, value]) => {
                const el = $(id);
                if (el) el.value = value;
            }
        );
    }

    async function saveCompanyProfile(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const button =
            form.querySelector(
                "button[type='submit']"
            );

        if (button) {
            button.disabled = true;
            button.textContent = "Saving...";
        }

        try {
            const value = name =>
                String(
                    form.querySelector(
                        `[name="${name}"]`
                    )?.value || ""
                ).trim();

            const record = {
                user_id: user.id,
                company_name:
                    value("company_name") ||
                    $("company-name-input")?.value.trim() ||
                    "",
                website:
                    value("website") ||
                    $("company-website")?.value.trim() ||
                    "",
                location:
                    value("location") ||
                    $("company-location")?.value.trim() ||
                    "",
                linkedin:
                    value("linkedin") ||
                    $("company-linkedin")?.value.trim() ||
                    "",
                description:
                    value("description") ||
                    $("company-description")?.value.trim() ||
                    ""
            };

            const { data, error } =
                await supabase()
                    .from("company_profiles")
                    .upsert(record, {
                        onConflict: "user_id"
                    })
                    .select()
                    .maybeSingle();

            if (error) throw error;

            companyProfile = data || record;

            renderCompanyProfile();

            alertUser(
                "Company profile saved successfully.",
                "success"
            );

        } catch (error) {
            console.error(error);

            alertUser(
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

    /* =========================
       SUBSCRIPTION
       ========================= */

    async function loadSubscription() {
        try {
            const { data, error } =
                await supabase()
                    .from("subscriptions")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("status", "active")
                    .order("expires_at", {
                        ascending: false
                    })
                    .limit(1)
                    .maybeSingle();

            if (error) {
                console.warn(
                    "Subscription:",
                    error.message
                );

                currentPlan =
                    CONFIG.plans.free;

                renderSubscription();
                return;
            }

            if (
                data &&
                data.plan_code &&
                (
                    !data.expires_at ||
                    new Date(data.expires_at) > new Date()
                )
            ) {
                currentPlan =
                    getPlan(data.plan_code);
            } else {
                currentPlan =
                    CONFIG.plans.free;
            }

        } catch (error) {
            console.warn(error);
            currentPlan =
                CONFIG.plans.free;
        }

        renderSubscription();
    }

    function renderSubscription() {
        const used = monthlyJobs();
        const limit = currentPlan.limit;

        setText(
            "subscription-plan",
            currentPlan.name
        );

        setText(
            "subscription-price",
            currentPlan.price
                ? `$${currentPlan.price} USDT / month`
                : "Free"
        );

        setText(
            "subscription-jobs-used",
            limit === null
                ? `${used} jobs this month`
                : `${used} / ${limit} jobs this month`
        );

        setText(
            "current-plan-name",
            currentPlan.name
        );

        setText(
            "published-jobs-count",
            jobs.length
        );
    }

    function openPlanModal() {
        const old =
            $("subscription-plan-modal");

        if (old) old.remove();

        const modal =
            document.createElement("div");

        modal.id =
            "subscription-plan-modal";

        modal.className =
            "subscription-plan-modal";

        modal.innerHTML = `
            <div class="subscription-modal-backdrop"></div>

            <div class="subscription-modal-card">

                <button
                    type="button"
                    class="subscription-modal-close"
                    id="close-plan-modal"
                >×</button>

                <span class="subscription-modal-badge">
                    Web3Jobs Plans
                </span>

                <h2>Choose your plan</h2>

                <div class="subscription-plan-list">

                    ${Object.values(CONFIG.plans)
                        .map(plan => `
                            <button
                                type="button"
                                class="subscription-plan-choice ${
                                    plan.code === currentPlan.code
                                        ? "current"
                                        : ""
                                }"
                                data-plan="${escapeHtml(plan.code)}"
                            >

                                <span>
                                    <strong>
                                        ${escapeHtml(plan.name)}
                                    </strong>

                                    <small>
                                        ${
                                            plan.price
                                                ? `$${plan.price} USDT / month`
                                                : "Free"
                                        }
                                    </small>
                                </span>

                                <em>
                                    ${
                                        plan.limit === null
                                            ? "Unlimited jobs"
                                            : `${plan.limit} jobs / month`
                                    }
                                </em>

                            </button>
                        `)
                        .join("")}

                </div>
            </div>
        `;

        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            modal.classList.add("visible");
        });

        $("close-plan-modal")
            ?.addEventListener(
                "click",
                closePlanModal
            );

        modal
            .querySelector(
                ".subscription-modal-backdrop"
            )
            ?.addEventListener(
                "click",
                closePlanModal
            );

        modal
            .querySelectorAll("[data-plan]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const plan =
                            getPlan(
                                button.dataset.plan
                            );

                        closePlanModal();

                        if (plan.price === 0) {
                            currentPlan = plan;

                            renderSubscription();

                            alertUser(
                                "Free plan selected.",
                                "success"
                            );

                            return;
                        }

                        openPaymentModal(plan);
                    }
                );
            });
    }

    function closePlanModal() {
        const modal =
            $("subscription-plan-modal");

        if (!modal) return;

        modal.classList.remove("visible");

        setTimeout(
            () => modal.remove(),
            200
        );
    }

    /* =========================
       WALLET
       ========================= */

    async function connectWallet() {
        if (!window.ethereum) {
            throw new Error(
                "No Web3 wallet detected. Please install MetaMask."
            );
        }

        const accounts =
            await window.ethereum.request({
                method: "eth_requestAccounts"
            });

        if (!accounts?.length) {
            throw new Error(
                "No wallet account found."
            );
        }

        wallet = accounts[0];

        await switchToBSC();

        return wallet;
    }

    async function switchToBSC() {
        if (!window.ethereum) {
            throw new Error(
                "Web3 wallet not detected."
            );
        }

        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [
                    {
                        chainId:
                            CONFIG.bscChainId
                    }
                ]
            });
        } catch (error) {

            if (error.code !== 4902) {
                throw error;
            }

            await window.ethereum.request({
                method: "wallet_addEthereumChain",
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
                            "https://bsc-dataseed.binance.org/"
                        ],
                        blockExplorerUrls: [
                            "https://bscscan.com"
                        ]
                    }
                ]
            );
        }
    }

    /* =========================
       PAYMENT MODAL
       ========================= */

    function openPaymentModal(plan) {
        selectedPlan = plan;

        const old =
            $("web3jobs-payment-modal");

        if (old) old.remove();

        const modal =
            document.createElement("div");

        modal.id =
            "web3jobs-payment-modal";

        modal.className =
            "web3jobs-payment-modal";

        modal.innerHTML = `
            <div class="payment-backdrop"></div>

            <div class="payment-card">

                <button
                    type="button"
                    class="payment-close"
                    id="payment-close"
                >×</button>

                <span class="payment-badge">
                    Secure Web3 Payment
                </span>

                <h2>
                    ${escapeHtml(plan.name)}
                </h2>

                <div class="payment-price">
                    $${plan.price} USDT / month
                </div>

                <p class="payment-network">
                    USDT BEP-20 on BNB Smart Chain
                </p>

                <div class="payment-wallet">
                    <small>
                        Payment recipient
                    </small>

                    <div>
                        ${escapeHtml(
                            CONFIG.paymentWallet
                        )}
                    </div>
                </div>

                <div
                    class="payment-status"
                    id="payment-status"
                >
                    Connect your wallet to continue.
                </div>

                <button
                    type="button"
                    class="payment-button"
                    id="payment-connect"
                >
                    Connect Wallet
                </button>

                <button
                    type="button"
                    class="payment-button"
                    id="payment-pay"
                    disabled
                >
                    Pay ${plan.price} USDT
                </button>

                <button
                    type="button"
                    class="payment-button secondary"
                    id="payment-cancel"
                >
                    Cancel
                </button>

            </div>
        `;

        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            modal.classList.add("visible");
        });

        $("payment-close")
            ?.addEventListener(
                "click",
                closePaymentModal
            );

        $("payment-cancel")
            ?.addEventListener(
                "click",
                closePaymentModal
            );

        modal
            .querySelector(".payment-backdrop")
            ?.addEventListener(
                "click",
                closePaymentModal
            );

        $("payment-connect")
            ?.addEventListener(
                "click",
                async () => {
                    try {
                        await connectWallet();

                        setPaymentStatus(
                            `Wallet connected: ${shortAddress(wallet)}`
                        );

                        updatePaymentButtons();

                    } catch (error) {
                        console.error(error);

                        setPaymentStatus(
                            error.message
                        );

                        alertUser(
                            error.message,
                            "error"
                        );
                    }
                }
            );

        $("payment-pay")
            ?.addEventListener(
                "click",
                payUSDT
            );

        updatePaymentButtons();
    }

    function closePaymentModal() {
        const modal =
            $("web3jobs-payment-modal");

        if (modal) modal.remove();

        selectedPlan = null;
        paymentBusy = false;
    }

    function setPaymentStatus(message) {
        setText(
            "payment-status",
            message
        );
    }

    function updatePaymentButtons() {
        const connect =
            $("payment-connect");

        const pay =
            $("payment-pay");

        if (connect) {
            connect.textContent =
                wallet
                    ? `Connected ${shortAddress(wallet)}`
                    : "Connect Wallet";
        }

        if (pay) {
            pay.disabled =
                !wallet ||
                !selectedPlan ||
                paymentBusy;
        }
    }

    /* =========================
       USDT PAYMENT
       ========================= */

    const USDT_ABI = [
        "function transfer(address to,uint256 amount) returns (bool)",
        "function balanceOf(address account) view returns (uint256)"
    ];

    async function payUSDT() {
        if (
            paymentBusy ||
            !selectedPlan
        ) {
            return;
        }

        if (!CONFIG.paymentWallet) {
            alertUser(
                "Payment wallet is not configured.",
                "error"
            );
            return;
        }

        if (
            typeof ethers === "undefined"
        ) {
            alertUser(
                "Ethers.js is not loaded.",
                "error"
            );
            return;
        }

        paymentBusy = true;
        updatePaymentButtons();

        try {
            if (!wallet) {
                await connectWallet();
            }

            await switchToBSC();

            const provider =
                new ethers.BrowserProvider(
                    window.ethereum
                );

            const network =
                await provider.getNetwork();

            if (
                String(network.chainId) !== "56"
            ) {
                throw new Error(
                    "Please switch to BNB Smart Chain."
                );
            }

            const signer =
                await provider.getSigner();

            wallet =
                await signer.getAddress();

            const token =
                new ethers.Contract(
                    CONFIG.usdtContract,
                    USDT_ABI,
                    signer
                );

            const amount =
                ethers.parseUnits(
                    String(selectedPlan.price),
                    CONFIG.usdtDecimals
                );

            setPaymentStatus(
                "Checking USDT balance..."
            );

            const balance =
                await token.balanceOf(wallet);

            if (balance < amount) {
                throw new Error(
                    `Insufficient USDT balance. You need ${selectedPlan.price} USDT.`
                );
            }

            setPaymentStatus(
                "Confirm the transaction in your wallet..."
            );

            const tx =
                await token.transfer(
                    CONFIG.paymentWallet,
                    amount
                );

            setPaymentStatus(
                `Transaction submitted: ${tx.hash.slice(0, 10)}...`
            );

            await tx.wait();

            setPaymentStatus(
                "Transaction confirmed. Activating subscription..."
            );

            await activateSubscription(
                selectedPlan,
                tx.hash
            );

            currentPlan =
                selectedPlan;

            renderSubscription();

            alertUser(
                `${selectedPlan.name} subscription activated successfully.`,
                "success"
            );

            closePaymentModal();

        } catch (error) {
            console.error(
                "Payment error:",
                error
            );

            setPaymentStatus(
                error?.message ||
                "Payment failed."
            );

            alertUser(
                error?.message ||
                "Payment failed.",
                "error"
            );

        } finally {
            paymentBusy = false;
            updatePaymentButtons();
        }
    }

    /* =========================
       SAVE PAYMENT
       ========================= */

    async function activateSubscription(
        plan,
        txHash
    ) {
        const sb = supabase();

        const start =
            new Date();

        const expires =
            new Date(start);

        expires.setDate(
            expires.getDate() +
            plan.durationDays
        );

        const payment = {
            user_id: user.id,
            payment_provider: "bnb_chain",
            payment_method: "usdt_bep20",
            payment_type: "subscription",
            amount: plan.price,
            currency: "USDT",
            status: "confirmed",
            provider_payment_id: txHash,
            transaction_hash: txHash,
            blockchain_network: "BSC",
            plan_code: plan.code,
            plan_name: plan.name,
            wallet_address: wallet
        };

        const paymentResult =
            await sb
                .from("payments")
                .insert(payment);

        if (paymentResult.error) {
            console.warn(
                "Payment record:",
                paymentResult.error.message
            );
        }

        const subscription = {
            user_id: user.id,
            plan_code: plan.code,
            plan_name: plan.name,
            status: "active",
            started_at:
                start.toISOString(),
            expires_at:
                expires.toISOString(),
            transaction_hash: txHash
        };

        const result =
            await sb
                .from("subscriptions")
                .upsert(
                    subscription,
                    {
                        onConflict:
                            "user_id"
                    }
                );

        if (result.error) {
            throw new Error(
                "Payment succeeded but subscription could not be saved: " +
                result.error.message
            );
        }
    }

    /* =========================
       JOBS
       ========================= */

    async function loadJobs() {
        const { data, error } =
            await supabase()
                .from("jobs")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", {
                    ascending: false
                });

        if (error) {
            console.error(
                "Jobs:",
                error.message
            );

            jobs = [];

            renderJobs();
            renderSubscription();

            return;
        }

        jobs = data || [];

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
            jobs.map(job => `
                <div class="job-card">

                    <div class="job-title">
                        ${escapeHtml(
                            job.title ||
                            "Untitled Job"
                        )}
                    </div>

                    <div class="job-meta">
                        ${escapeHtml(
                            job.company ||
                            companyName()
                        )}
                        •
                        ${escapeHtml(
                            job.location ||
                            "Remote"
                        )}
                        •
                        ${escapeHtml(
                            job.type ||
                            "Full-time"
                        )}
                        •
                        ${formatDate(
                            job.created_at
                        )}
                    </div>

                    <button
                        type="button"
                        class="small-button delete"
                        data-delete-job="${escapeHtml(job.id)}"
                    >
                        Delete
                    </button>

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
                            button.dataset
                                .deleteJob
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
            const { error } =
                await supabase()
                    .from("jobs")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", user.id);

            if (error) throw error;

            alertUser(
                "Job deleted successfully.",
                "success"
            );

            await loadJobs();

        } catch (error) {
            console.error(error);

            alertUser(
                error.message ||
                "Unable to delete the job.",
                "error"
            );
        }
    }

    async function publishJob(event) {
        event.preventDefault();

        const plan =
            currentPlan ||
            CONFIG.plans.free;

        if (
            plan.limit !== null &&
            monthlyJobs() >= plan.limit
        ) {
            alertUser(
                `You have reached your ${plan.name} plan limit of ${plan.limit} jobs this month. Please upgrade your plan.`,
                "error"
            );

            $("subscription-promotion")
                ?.scrollIntoView({
                    behavior: "smooth"
                });

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
            alertUser(
                "Please complete all required job fields.",
                "error"
            );
            return;
        }

        const button =
            $("publish-job-button");

        if (button) {
            button.disabled = true;
            button.textContent =
                "Publishing...";
        }

        try {
            const { error } =
                await supabase()
                    .from("jobs")
                    .insert({
                        user_id: user.id,
                        title,
                        company,
                        location,
                        type,
                        description,
                        apply_link:
                            applyLink
                    });

            if (error) throw error;

            form.reset();

            const companyInput =
                $("job-company");

            if (companyInput) {
                companyInput.value =
                    companyName();
            }

            alertUser(
                "Job published successfully.",
                "success"
            );

            await loadJobs();

        } catch (error) {
            console.error(error);

            alertUser(
                error.message ||
                "Unable to publish the job.",
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

    /* =========================
       APPLICATIONS
       ========================= */

    async function loadApplications() {
        const tbody =
            $("applications-table-body");

        if (!tbody) return;

        if (!jobs.length) {
            setText(
                "applications-count",
                "0"
            );

            tbody.innerHTML = `
                <tr>
                    <td colspan="4">
                        No applications yet.
                    </td>
                </tr>
            `;

            return;
        }

        try {
            const ids =
                jobs.map(job => job.id);

            const { data, error } =
                await supabase()
                    .from("applications")
                    .select("*")
                    .in("job_id", ids)
                    .order("created_at", {
                        ascending: false
                    });

            if (error) throw error;

            const applications =
                data || [];

            setText(
                "applications-count",
                applications.length
            );

            if (!applications.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4">
                            No applications yet.
                        </td>
                    </tr>
                `;

                return;
            }

            tbody.innerHTML =
                applications
                    .map(application => {

                        const job =
                            jobs.find(
                                item =>
                                    String(
                                        item.id
                                    ) ===
                                    String(
                                        application.job_id
                                    )
                            );

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        job?.title ||
                                        "Job"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        application.user_id ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        application.status ||
                                        "pending"
                                    )}
                                </td>

                                <td>
                                    ${formatDate(
                                        application.created_at
                                    )}
                                </td>

                            </tr>
                        `;
                    })
                    .join("");

        } catch (error) {
            console.error(
                "Applications:",
                error
            );

            tbody.innerHTML = `
                <tr>
                    <td colspan="4">
                        Applications could not be loaded.
                    </td>
                </tr>
            `;
        }
    }

    /* =========================
       LOGOUT
       ========================= */

    async function logout() {
        try {
            await supabase()
                .auth
                .signOut();
        } catch (error) {
            console.error(error);
        }

        location.href =
            "login.html";
    }

    /* =========================
       EVENTS
       ========================= */

    function setupEvents() {

        $("post-job-form")
            ?.addEventListener(
                "submit",
                publishJob
            );

        $("company-profile-form")
            ?.addEventListener(
                "submit",
                saveCompanyProfile
            );

        $("logout-button")
            ?.addEventListener(
                "click",
                logout
            );

        document
            .querySelectorAll(
                "[data-open-plans]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    openPlanModal
                );
            });

        if (window.ethereum) {

            window.ethereum.on(
                "accountsChanged",
                accounts => {
                    wallet =
                        accounts?.[0] ||
                        null;

                    updatePaymentButtons();
                }
            );

            window.ethereum.on(
                "chainChanged",
                () => {
                    wallet = null;
                    updatePaymentButtons();
                }
            );
        }
    }

    /* =========================
       STYLES
       ========================= */

    function injectStyles() {
        if (
            $("web3jobs-clean-dashboard-style")
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "web3jobs-clean-dashboard-style";

        style.textContent = `

            .subscription-plan-modal,
            .web3jobs-payment-modal {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(0,0,0,.78);
                backdrop-filter: blur(8px);
                opacity: 0;
                transition: opacity .2s ease;
            }

            .subscription-plan-modal.visible,
            .web3jobs-payment-modal.visible {
                opacity: 1;
            }

            .subscription-modal-card,
            .payment-card {
                position: relative;
                width: min(440px,100%);
                max-height: 90vh;
                overflow: auto;
                padding: 26px;
                border-radius: 22px;
                border: 1px solid rgba(90,180,230,.22);
                background: linear-gradient(
                    145deg,
                    #0c1d31,
                    #07111e
                );
                box-shadow:
                    0 30px 90px
                    rgba(0,0,0,.55);
            }

            .subscription-modal-close,
            .payment-close {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 36px;
                height: 36px;
                border: 0;
                border-radius: 10px;
                background: rgba(255,255,255,.06);
                color: #fff;
                font-size: 22px;
                cursor: pointer;
            }

            .subscription-modal-badge,
            .payment-badge {
                display: inline-block;
                padding: 5px 9px;
                border-radius: 99px;
                color: #80e3ff;
                background: rgba(50,200,255,.08);
                font-size: 10px;
                font-weight: 700;
            }

            .subscription-modal-card h2,
            .payment-card h2 {
                color: #fff;
                margin: 12px 0 18px;
            }

            .subscription-plan-list {
                display: grid;
                gap: 10px;
            }

            .subscription-plan-choice {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                padding: 15px;
                border: 1px solid
                    rgba(255,255,255,.08);
                border-radius: 14px;
                background: #0b1b2d;
                color: #fff;
                text-align: left;
                cursor: pointer;
            }

            .subscription-plan-choice:hover {
                border-color:
                    rgba(70,210,255,.45);
            }

            .subscription-plan-choice.current {
                border-color:
                    rgba(80,220,170,.45);
            }

            .subscription-plan-choice strong,
            .subscription-plan-choice small {
                display: block;
            }

            .subscription-plan-choice small {
                margin-top: 5px;
                color: #76dcff;
            }

            .subscription-plan-choice em {
                color: #8194a9;
                font-size: 11px;
                font-style: normal;
            }

            .payment-price {
                color: #76dcff;
                font-size: 22px;
                font-weight: 800;
            }

            .payment-network {
                color: #8194a9;
                font-size: 12px;
            }

            .payment-wallet {
                margin: 18px 0;
                padding: 13px;
                border-radius: 13px;
                background:
                    rgba(255,255,255,.035);
                color: #dce9f7;
                font-size: 12px;
                word-break: break-all;
            }

            .payment-wallet small {
                display: block;
                margin-bottom: 5px;
                color: #7f91a7;
            }

            .payment-status {
                margin-bottom: 14px;
                padding: 12px;
                border-radius: 12px;
                background:
                    rgba(75,208,255,.06);
                color: #9cdff2;
                font-size: 12px;
            }

            .payment-button {
                width: 100%;
                min-height: 48px;
                margin-top: 9px;
                border: 1px solid
                    rgba(75,208,255,.35);
                border-radius: 12px;
                background: #10374f;
                color: #fff;
                font-weight: 700;
                cursor: pointer;
            }

            .payment-button.secondary {
                background:
                    rgba(255,255,255,.04);
                border-color:
                    rgba(255,255,255,.09);
            }

            .payment-button:disabled {
                opacity: .5;
                cursor: not-allowed;
            }

            @media(max-width:600px) {

                .subscription-modal-card,
                .payment-card {
                    padding: 22px 18px;
                }

                .subscription-plan-choice {
                    align-items: flex-start;
                    gap: 10px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =========================
       INIT
       ========================= */

    async function init() {
        try {
            injectStyles();

            const authenticated =
                await loadUser();

            if (!authenticated) {
                return;
            }

            await loadCompanyProfile();
            await loadSubscription();
            await loadJobs();

            setupEvents();

            const companyInput =
                $("job-company");

            if (companyInput) {
                companyInput.value =
                    companyName();
            }

        } catch (error) {

            console.error(
                "Company Dashboard initialization:",
                error
            );

            alertUser(
                error.message ||
                "Unable to initialize company dashboard.",
                "error"
            );
        }
    }

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
