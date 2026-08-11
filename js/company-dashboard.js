/* =========================================================
   Web3Jobs v3
   File: js/company-dashboard.js

   Company Dashboard
   Supabase + Jobs + Applications
   USDT BEP-20 / BNB Smart Chain
   ========================================================= */

"use strict";

(() => {

    /* =========================================================
       CONFIG
       ========================================================= */

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


    /* =========================================================
       STATE
       ========================================================= */

    let sb = null;
    let user = null;
    let profile = null;
    let jobs = [];
    let currentPlan = CONFIG.plans.free;
    let selectedPlan = null;
    let wallet = null;
    let paymentBusy = false;


    /* =========================================================
       HELPERS
       ========================================================= */

    const $ = id =>
        document.getElementById(id);


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


    function notify(message, type = "success") {

        if (typeof window.showAlert === "function") {
            window.showAlert(message, type);
            return;
        }

        alert(message);
    }


    function shortAddress(address) {

        if (!address) return "Not connected";

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


    /* =========================================================
       SUPABASE
       ========================================================= */

    function getSupabase() {

        if (sb) return sb;


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


    /* =========================================================
       AUTH / COMPANY ACCESS
       ========================================================= */

    async function verifyCompanyAccess() {

        if (
            window.Web3JobsAuth &&
            typeof window.Web3JobsAuth
                .protectCompanyDashboard ===
                "function"
        ) {

            const result =
                await window.Web3JobsAuth
                    .protectCompanyDashboard();

            if (!result || result === false) {
                return false;
            }

            user = result.user || null;

            return Boolean(user);
        }


        const client =
            getSupabase();

        const {
            data,
            error
        } =
            await client.auth.getUser();

        if (error) throw error;

        user =
            data?.user || null;

        if (!user) {
            location.replace("login.html");
            return false;
        }

        return true;
    }


    /* =========================================================
       COMPANY PROFILE
       ========================================================= */

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

            return;
        }

        profile =
            data || null;

        renderCompanyProfile();
    }


    function renderCompanyProfile() {

        setText(
            "company-name",
            companyName()
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
    }


    async function saveCompanyProfile(event) {

        event.preventDefault();

        const form =
            event.currentTarget;

        const button =
            form.querySelector(
                "button[type='submit']"
            );


        const value = selector => {

            const el =
                form.querySelector(selector);

            return String(
                el?.value || ""
            ).trim();
        };


        const record = {
            user_id: user.id,

            company_name:
                value(
                    "[name='company_name'],#company-name-input"
                ),

            website:
                value(
                    "[name='website'],#company-website"
                ),

            location:
                value(
                    "[name='location'],#company-location"
                ),

            linkedin:
                value(
                    "[name='linkedin'],#company-linkedin"
                ),

            description:
                value(
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
                            onConflict:
                                "user_id"
                        }
                    )
                    .select()
                    .maybeSingle();


            if (error) throw error;


            profile =
                data || record;

            renderCompanyProfile();

            notify(
                "Company profile saved successfully.",
                "success"
            );

        } catch (error) {

            console.error(error);

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


    /* =========================================================
       JOBS
       ========================================================= */

    function monthlyJobs() {

        const now =
            new Date();

        return jobs.filter(job => {

            const date =
                new Date(job.created_at);

            return (
                date.getUTCFullYear() ===
                    now.getUTCFullYear() &&
                date.getUTCMonth() ===
                    now.getUTCMonth()
            );

        }).length;
    }


    async function loadJobs() {

        const {
            data,
            error
        } =
            await getSupabase()
                .from("jobs")
                .select("*")
                .eq("user_id", user.id)
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

            renderJobs();

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
                            data-delete-job="${escapeHtml(
                                job.id
                            )}"
                        >
                            Delete
                        </button>

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
                    .eq("id", id)
                    .eq("user_id", user.id);


            if (error) throw error;


            notify(
                "Job deleted successfully.",
                "success"
            );

            await loadJobs();

        } catch (error) {

            console.error(error);

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


            if (error) throw error;


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


            await loadJobs();

        } catch (error) {

            console.error(error);

            notify(
                error.message ||
                "Unable to publish job.",
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


    /* =========================================================
       SUBSCRIPTION
       ========================================================= */

    async function loadSubscription() {

        try {

            const {
                data,
                error
            } =
                await getSupabase()
                    .from("subscriptions")
                    .select("*")
                    .eq(
                        "user_id",
                        user.id
                    )
                    .eq(
                        "status",
                        "active"
                    )
                    .order(
                        "expires_at",
                        {
                            ascending: false
                        }
                    )
                    .limit(1)
                    .maybeSingle();


            if (
                error ||
                !data
            ) {

                currentPlan =
                    CONFIG.plans.free;

                renderSubscription();

                return;
            }


            if (
                data.expires_at &&
                new Date(
                    data.expires_at
                ) <= new Date()
            ) {

                currentPlan =
                    CONFIG.plans.free;

            } else {

                currentPlan =
                    getPlan(
                        data.plan_code
                    );
            }


            renderSubscription();

        } catch (error) {

            console.warn(
                "Subscription:",
                error
            );

            currentPlan =
                CONFIG.plans.free;

            renderSubscription();
        }
    }


    function renderSubscription() {

        const count =
            monthlyJobs();

        const limit =
            currentPlan.limit;


        setText(
            "subscription-plan",
            currentPlan.name
        );


        setText(
            "current-plan-name",
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
                ? `${count} jobs this month`
                : `${count} / ${limit} jobs this month`
        );


        setText(
            "published-jobs-count",
            jobs.length
        );
    }


    function openPlans() {

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
                >
                    ×
                </button>

                <span class="subscription-modal-badge">
                    Web3Jobs Plans
                </span>

                <h2>
                    Choose your plan
                </h2>

                <div class="subscription-plan-list">

                    ${Object.values(
                        CONFIG.plans
                    ).map(plan => `

                        <button
                            type="button"
                            class="subscription-plan-choice ${
                                plan.code ===
                                currentPlan.code
                                    ? "current"
                                    : ""
                            }"
                            data-plan="${plan.code}"
                        >

                            <span>
                                <strong>
                                    ${escapeHtml(
                                        plan.name
                                    )}
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

                    `).join("")}

                </div>
            </div>
        `;


        document.body.appendChild(modal);


        requestAnimationFrame(() => {
            modal.classList.add("visible");
        });


        modal
            .querySelector(
                "#close-plan-modal"
            )
            ?.addEventListener(
                "click",
                () => modal.remove()
            );


        modal
            .querySelector(
                ".subscription-modal-backdrop"
            )
            ?.addEventListener(
                "click",
                () => modal.remove()
            );


        modal
            .querySelectorAll(
                "[data-plan]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const plan =
                            getPlan(
                                button.dataset.plan
                            );

                        modal.remove();

                        if (
                            plan.price === 0
                        ) {

                            currentPlan =
                                CONFIG.plans.free;

                            renderSubscription();

                            notify(
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


    /* =========================================================
       WALLET
       ========================================================= */

    async function connectWallet() {

        if (!window.ethereum) {

            throw new Error(
                "No Web3 wallet detected. Please install MetaMask."
            );
        }


        const accounts =
            await window.ethereum.request({
                method:
                    "eth_requestAccounts"
            });


        if (!accounts?.length) {

            throw new Error(
                "No wallet account found."
            );
        }


        wallet =
            accounts[0];


        await switchToBSC();


        setText(
            "connect-wallet-button",
            `Connected ${shortAddress(wallet)}`
        );


        updatePaymentButtons();


        return wallet;
    }


    async function switchToBSC() {

        try {

            await window.ethereum.request({
                method:
                    "wallet_switchEthereumChain",

                params: [
                    {
                        chainId:
                            CONFIG.bscChainId
                    }
                ]
            });

        } catch (error) {

            if (
                error.code === 4902
            ) {

                throw new Error(
                    "BNB Smart Chain is not available in your wallet."
                );
            }

            throw error;
        }
    }


    /* =========================================================
       PAYMENT MODAL
       ========================================================= */

    function openPaymentModal(plan) {

        selectedPlan =
            plan;


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
                >
                    ×
                </button>

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
                    Pay $${plan.price} USDT
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
            .querySelector(
                ".payment-backdrop"
            )
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

                        updatePaymentButtons();

                    } catch (error) {

                        setPaymentStatus(
                            error.message
                        );

                        notify(
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

        if (modal) {
            modal.remove();
        }

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


    /* =========================================================
       USDT PAYMENT
       ========================================================= */

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


        if (
            !CONFIG.paymentWallet
        ) {

            notify(
                "Payment wallet is not configured.",
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


            if (
                typeof ethers ===
                "undefined"
            ) {

                throw new Error(
                    "Ethers.js is not loaded on this page."
                );
            }


            const provider =
                new ethers.BrowserProvider(
                    window.ethereum
                );


            const network =
                await provider.getNetwork();


            if (
                String(
                    network.chainId
                ) !== "56"
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
                    String(
                        selectedPlan.price
                    ),
                    CONFIG.usdtDecimals
                );


            setPaymentStatus(
                "Checking USDT balance..."
            );


            const balance =
                await token.balanceOf(
                    wallet
                );


            if (
                balance < amount
            ) {

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
                "Transaction submitted. Waiting for confirmation..."
            );


            await tx.wait();


            setPaymentStatus(
                "Payment confirmed. Activating subscription..."
            );


            await activateSubscription(
                selectedPlan,
                tx.hash
            );


            currentPlan =
                selectedPlan;


            renderSubscription();


            notify(
                `${selectedPlan.name} subscription activated successfully.`,
                "success"
            );


            closePaymentModal();

        } catch (error) {

            console.error(
                "USDT payment:",
                error
            );


            setPaymentStatus(
                error.message ||
                "Payment failed."
            );


            notify(
                error.message ||
                "Payment failed.",
                "error"
            );

        } finally {

            paymentBusy = false;

            updatePaymentButtons();
        }
    }


    /* =========================================================
       SAVE SUBSCRIPTION
       ========================================================= */

    async function activateSubscription(
        plan,
        txHash
    ) {

        const client =
            getSupabase();


        const started =
            new Date();


        const expires =
            new Date(
                started
            );


        expires.setDate(
            expires.getDate() +
            plan.days
        );


        const payment = {

            user_id:
                user.id,

            payment_provider:
                "bnb_chain",

            payment_method:
                "usdt_bep20",

            payment_type:
                "subscription",

            amount:
                plan.price,

            currency:
                "USDT",

            status:
                "confirmed",

            provider_payment_id:
                txHash,

            transaction_hash:
                txHash,

            blockchain_network:
                "BSC",

            plan_code:
                plan.code,

            plan_name:
                plan.name,

            wallet_address:
                wallet
        };


        const paymentResult =
            await client
                .from("payments")
                .insert(payment);


        if (
            paymentResult.error
        ) {

            console.warn(
                "Payment record warning:",
                paymentResult.error.message
            );
        }


        const subscription = {

            user_id:
                user.id,

            plan_code:
                plan.code,

            plan_name:
                plan.name,

            status:
                "active",

            started_at:
                started.toISOString(),

            expires_at:
                expires.toISOString(),

            transaction_hash:
                txHash
        };


        const result =
            await client
                .from("subscriptions")
                .upsert(
                    subscription,
                    {
                        onConflict:
                            "user_id"
                    }
                );


        if (
            result.error
        ) {

            throw new Error(
                "Payment confirmed, but the subscription could not be saved: " +
                result.error.message
            );
        }
    }


    /* =========================================================
       APPLICATIONS
       ========================================================= */

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
                jobs.map(
                    job => job.id
                );


            const {
                data,
                error
            } =
                await getSupabase()
                    .from("applications")
                    .select("*")
                    .in(
                        "job_id",
                        ids
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


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
                applications.map(app => {

                    const job =
                        jobs.find(
                            j =>
                                String(j.id) ===
                                String(app.job_id)
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
                                    app.user_id ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    app.status ||
                                    "pending"
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    app.created_at
                                )}
                            </td>

                        </tr>
                    `;

                }).join("");


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


    /* =========================================================
       LOGOUT
       ========================================================= */

    async function logout() {

        try {

            if (
                window.Web3JobsAuth &&
                typeof window.Web3JobsAuth.logout ===
                    "function"
            ) {

                await window.Web3JobsAuth.logout();

                return;
            }


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


    /* =========================================================
       EVENTS
       ========================================================= */

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
                    event => {

                        event.preventDefault();

                        openPlans();
                    }
                );

            });


        const companyInput =
            $("job-company");

        if (companyInput) {

            companyInput.value =
                companyName();
        }


        if (
            window.ethereum
        ) {

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


    /* =========================================================
       STYLES
       ========================================================= */

    function injectStyles() {

        if (
            $("web3jobs-dashboard-style")
        ) {
            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "web3jobs-dashboard-style";


        style.textContent = `

            .subscription-plan-modal,
            .web3jobs-payment-modal {
                position:fixed;
                inset:0;
                z-index:99999;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:20px;
                background:rgba(0,0,0,.78);
                backdrop-filter:blur(8px);
                opacity:0;
                transition:opacity .2s ease;
            }

            .subscription-plan-modal.visible,
            .web3jobs-payment-modal.visible {
                opacity:1;
            }

            .subscription-modal-card,
            .payment-card {
                position:relative;
                width:min(440px,100%);
                max-height:90vh;
                overflow:auto;
                padding:26px;
                border-radius:22px;
                border:1px solid rgba(90,180,230,.22);
                background:
                    linear-gradient(
                        145deg,
                        #0c1d31,
                        #07111e
                    );
                box-shadow:
                    0 30px 90px rgba(0,0,0,.55);
            }

            .subscription-modal-close,
            .payment-close {
                position:absolute;
                top:12px;
                right:12px;
                width:36px;
                height:36px;
                border:0;
                border-radius:10px;
                background:rgba(255,255,255,.06);
                color:#fff;
                font-size:22px;
                cursor:pointer;
            }

            .subscription-modal-badge,
            .payment-badge {
                display:inline-block;
                padding:5px 9px;
                border-radius:99px;
                color:#80e3ff;
                background:rgba(50,200,255,.08);
                font-size:10px;
                font-weight:700;
            }

            .subscription-modal-card h2,
            .payment-card h2 {
                color:#fff;
                margin:12px 0 18px;
            }

            .subscription-plan-list {
                display:grid;
                gap:10px;
            }

            .subscription-plan-choice {
                display:flex;
                justify-content:space-between;
                align-items:center;
                width:100%;
                padding:15px;
                border:1px solid rgba(255,255,255,.08);
                border-radius:14px;
                background:#0b1b2d;
                color:#fff;
                text-align:left;
                cursor:pointer;
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
                display:block;
            }

            .subscription-plan-choice small {
                margin-top:5px;
                color:#76dcff;
            }

            .subscription-plan-choice em {
                color:#8194a9;
                font-size:11px;
                font-style:normal;
            }

            .payment-price {
                color:#76dcff;
                font-size:22px;
                font-weight:800;
            }

            .payment-network {
                color:#8194a9;
                font-size:12px;
            }

            .payment-wallet {
                margin:18px 0;
                padding:13px;
                border-radius:13px;
                background:rgba(255,255,255,.035);
                color:#dce9f7;
                font-size:12px;
                word-break:break-all;
            }

            .payment-wallet small {
                display:block;
                margin-bottom:5px;
                color:#7f91a7;
            }

            .payment-status {
                margin-bottom:14px;
                padding:12px;
                border-radius:12px;
                background:rgba(75,208,255,.06);
                color:#9cdff2;
                font-size:12px;
            }

            .payment-button {
                width:100%;
                min-height:48px;
                margin-top:9px;
                border:1px solid rgba(75,208,255,.35);
                border-radius:12px;
                background:#10374f;
                color:#fff;
                font-weight:700;
                cursor:pointer;
            }

            .payment-button.secondary {
                background:rgba(255,255,255,.04);
                border-color:
                    rgba(255,255,255,.09);
            }

            .payment-button:disabled {
                opacity:.5;
                cursor:not-allowed;
            }

            @media(max-width:600px) {

                .subscription-modal-card,
                .payment-card {
                    padding:22px 18px;
                }

                .subscription-plan-choice {
                    align-items:flex-start;
                    gap:10px;
                }
            }
        `;


        document.head.appendChild(
            style
        );
    }


    /* =========================================================
       INIT
       ========================================================= */

    async function init() {

        try {

            injectStyles();


            const access =
                await verifyCompanyAccess();


            if (!access) {
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


            console.log(
                "Web3Jobs Company Dashboard ready.",
                {
                    user:
                        user?.email,
                    plan:
                        currentPlan.name
                }
            );


        } catch (error) {

            console.error(
                "Company Dashboard:",
                error
            );


            notify(
                error.message ||
                "Unable to load company dashboard.",
                "error"
            );
        }
    }


    /* =========================================================
       START
       ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once:true
            }
        );

    } else {

        init();
    }

})();
