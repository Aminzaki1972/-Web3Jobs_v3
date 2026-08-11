<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <meta
        name="description"
        content="Web3Jobs Company Dashboard"
    >

    <title>Company Dashboard | Web3Jobs</title>

    <style>
        :root {
            --bg: #07111f;
            --bg-secondary: #0b1728;
            --card: #101f33;
            --card-hover: #142842;
            --border: #203754;
            --text: #f5f8ff;
            --muted: #91a4bd;
            --primary: #3b82f6;
            --primary-dark: #2563eb;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --shadow: 0 20px 50px rgba(0, 0, 0, .25);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            min-height: 100vh;
            font-family:
                Inter,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;
            background:
                radial-gradient(
                    circle at top right,
                    rgba(37, 99, 235, .12),
                    transparent 35%
                ),
                var(--bg);
            color: var(--text);
        }

        button,
        input,
        textarea,
        select {
            font: inherit;
        }

        button {
            cursor: pointer;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        .app {
            min-height: 100vh;
        }

        /* =========================
           HEADER
           ========================= */

        .dashboard-header {
            position: sticky;
            top: 0;
            z-index: 1000;
            height: 72px;
            border-bottom: 1px solid var(--border);
            background: rgba(7, 17, 31, .92);
            backdrop-filter: blur(18px);
        }

        .header-inner {
            width: min(1400px, calc(100% - 32px));
            height: 100%;
            margin: auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 800;
            font-size: 20px;
        }

        .brand-logo {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: grid;
            place-items: center;
            background:
                linear-gradient(
                    135deg,
                    #2563eb,
                    #7c3aed
                );
            box-shadow:
                0 10px 25px rgba(37, 99, 235, .25);
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header-button {
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 10px 15px;
            background: var(--card);
            color: var(--text);
            transition: .2s ease;
        }

        .header-button:hover {
            background: var(--card-hover);
            border-color: #31547b;
        }

        .header-button.primary {
            background: var(--primary);
            border-color: var(--primary);
        }

        .header-button.primary:hover {
            background: var(--primary-dark);
        }

        .header-button.danger {
            color: #fecaca;
            border-color: rgba(239, 68, 68, .35);
        }

        /* =========================
           LOADING
           ========================= */

        #loading-spinner {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg);
        }

        .loading-card {
            width: min(420px, calc(100% - 32px));
            padding: 35px;
            text-align: center;
            border: 1px solid var(--border);
            border-radius: 20px;
            background: var(--card);
            box-shadow: var(--shadow);
        }

        .loading-logo {
            width: 55px;
            height: 55px;
            margin: 0 auto 20px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            background: var(--primary);
            font-size: 24px;
            font-weight: 800;
        }

        .loading-card h2 {
            margin-bottom: 10px;
        }

        .loading-card p {
            color: var(--muted);
            line-height: 1.6;
        }

        .spinner {
            width: 42px;
            height: 42px;
            margin: 0 auto 20px;
            border: 4px solid #203754;
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin .8s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        /* =========================
           CONTENT
           ========================= */

        #dashboard-content {
            display: none;
        }

        .container {
            width: min(1400px, calc(100% - 32px));
            margin: 0 auto;
        }

        .dashboard-main {
            padding: 35px 0 70px;
        }

        /* =========================
           WELCOME
           ========================= */

        .welcome-card {
            position: relative;
            overflow: hidden;
            padding: 32px;
            border: 1px solid var(--border);
            border-radius: 22px;
            background:
                linear-gradient(
                    135deg,
                    rgba(37, 99, 235, .16),
                    rgba(124, 58, 237, .08)
                ),
                var(--card);
            box-shadow: var(--shadow);
        }

        .welcome-card::after {
            content: "";
            position: absolute;
            width: 260px;
            height: 260px;
            right: -100px;
            top: -120px;
            border-radius: 50%;
            background: rgba(59, 130, 246, .12);
            filter: blur(5px);
        }

        .welcome-content {
            position: relative;
            z-index: 1;
        }

        .eyebrow {
            margin-bottom: 10px;
            color: #60a5fa;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .08em;
        }

        .welcome-card h1 {
            font-size: clamp(28px, 5vw, 42px);
            line-height: 1.15;
            margin-bottom: 10px;
        }

        .welcome-card p {
            color: var(--muted);
            line-height: 1.7;
        }

        .company-email {
            margin-top: 12px;
            color: #c7d5e8;
            font-size: 14px;
        }

        /* =========================
           STATS
           ========================= */

        .stats-grid {
            display: grid;
            grid-template-columns:
                repeat(3, minmax(0, 1fr));
            gap: 18px;
            margin-top: 22px;
        }

        .stat-card {
            padding: 24px;
            border: 1px solid var(--border);
            border-radius: 18px;
            background: var(--card);
            box-shadow: var(--shadow);
        }

        .stat-label {
            color: var(--muted);
            font-size: 14px;
            margin-bottom: 10px;
        }

        .stat-value {
            font-size: 34px;
            font-weight: 800;
        }

        /* =========================
           SECTION
           ========================= */

        .section {
            margin-top: 30px;
        }

        .section-header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 16px;
        }

        .section-header h2 {
            font-size: 25px;
        }

        .section-header p {
            margin-top: 5px;
            color: var(--muted);
            line-height: 1.5;
        }

        /* =========================
           PLANS
           ========================= */

        #subscriptions {
            display: grid;
            grid-template-columns:
                repeat(3, minmax(0, 1fr));
            gap: 18px;
        }

        .subscription-plan-card {
            position: relative;
            border: 1px solid var(--border);
            border-radius: 20px;
            background: var(--card);
            transition:
                transform .2s ease,
                border-color .2s ease,
                box-shadow .2s ease;
            overflow: hidden;
        }

        .subscription-plan-card:hover {
            transform: translateY(-4px);
            border-color: #31547b;
        }

        .subscription-plan-card.selected,
        .subscription-plan-card.active,
        .subscription-plan-card.is-selected {
            border-color: var(--primary);
            box-shadow:
                0 0 0 1px var(--primary),
                0 20px 50px rgba(37, 99, 235, .15);
        }

        .plan-card-content {
            padding: 25px;
        }

        .plan-card-content h3 {
            font-size: 22px;
            margin-bottom: 15px;
        }

        .plan-price {
            display: flex;
            align-items: baseline;
            gap: 7px;
            margin-bottom: 15px;
        }

        .plan-price strong {
            font-size: 34px;
        }

        .plan-price span {
            color: var(--muted);
            font-size: 13px;
        }

        .plan-card-content p {
            min-height: 55px;
            margin-bottom: 22px;
            color: var(--muted);
            line-height: 1.6;
        }

        .plan-button {
            width: 100%;
            border: 1px solid var(--border);
            border-radius: 11px;
            padding: 12px 16px;
            background: #13253d;
            color: var(--text);
            font-weight: 700;
            transition: .2s ease;
        }

        .plan-button:hover,
        .plan-button.selected,
        .plan-button.active {
            background: var(--primary);
            border-color: var(--primary);
        }

        /* =========================
           PAYMENT
           ========================= */

        #payment-panel {
            display: none;
            margin-top: 30px;
        }

        .payment-card {
            padding: 28px;
            border: 1px solid var(--border);
            border-radius: 22px;
            background:
                linear-gradient(
                    145deg,
                    rgba(16, 185, 129, .08),
                    rgba(37, 99, 235, .08)
                ),
                var(--card);
            box-shadow: var(--shadow);
        }

        .payment-grid {
            display: grid;
            grid-template-columns:
                1fr 1fr;
            gap: 25px;
        }

        .payment-info {
            padding: 20px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: rgba(0, 0, 0, .12);
        }

        .payment-info h3 {
            margin-bottom: 18px;
        }

        .payment-row {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            padding: 12px 0;
            border-bottom: 1px solid rgba(32, 55, 84, .7);
        }

        .payment-row:last-child {
            border-bottom: 0;
        }

        .payment-row span:first-child {
            color: var(--muted);
        }

        .payment-row strong {
            text-align: right;
            word-break: break-word;
        }

        .wallet-box {
            margin-top: 18px;
            padding: 16px;
            border-radius: 14px;
            background: #081421;
            border: 1px solid var(--border);
        }

        .wallet-box small {
            display: block;
            margin-bottom: 8px;
            color: var(--muted);
        }

        #payment-status {
            margin-top: 18px;
            min-height: 24px;
            color: #93c5fd;
            line-height: 1.6;
        }

        .payment-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 22px;
        }

        .payment-actions button {
            flex: 1;
            min-width: 180px;
        }

        .payment-button {
            border: 0;
            border-radius: 12px;
            padding: 14px 18px;
            background: var(--success);
            color: #fff;
            font-weight: 800;
            transition: .2s ease;
        }

        .payment-button:hover:not(:disabled) {
            filter: brightness(1.08);
        }

        .payment-button:disabled {
            opacity: .45;
            cursor: not-allowed;
        }

        /* =========================
           QUICK ACTIONS
           ========================= */

        .actions-grid {
            display: grid;
            grid-template-columns:
                repeat(3, minmax(0, 1fr));
            gap: 18px;
        }

        .action-card {
            padding: 23px;
            border: 1px solid var(--border);
            border-radius: 18px;
            background: var(--card);
        }

        .action-card h3 {
            margin-bottom: 8px;
        }

        .action-card p {
            margin-bottom: 18px;
            color: var(--muted);
            line-height: 1.6;
        }

        /* =========================
           FOOTER
           ========================= */

        .dashboard-footer {
            padding: 25px 0;
            border-top: 1px solid var(--border);
            color: var(--muted);
            text-align: center;
            font-size: 13px;
        }

        /* =========================
           RESPONSIVE
           ========================= */

        @media (max-width: 900px) {

            .stats-grid,
            #subscriptions,
            .actions-grid {
                grid-template-columns: 1fr;
            }

            .payment-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 650px) {

            .dashboard-header {
                height: auto;
                min-height: 70px;
            }

            .header-inner {
                padding: 12px 0;
                flex-wrap: wrap;
            }

            .header-actions {
                width: 100%;
                justify-content: flex-end;
            }

            .welcome-card {
                padding: 24px;
            }

            .dashboard-main {
                padding-top: 22px;
            }

            .payment-card {
                padding: 20px;
            }

            .section-header {
                align-items: flex-start;
                flex-direction: column;
            }

            .header-button {
                padding: 9px 12px;
                font-size: 13px;
            }
        }
    </style>
</head>

<body>

<div class="app">

    <!-- =========================================
         HEADER
         ========================================= -->

    <header class="dashboard-header">

        <div class="header-inner">

            <a
                href="index.html"
                class="brand"
                aria-label="Web3Jobs Home"
            >
                <span class="brand-logo">W3</span>

                <span>Web3Jobs</span>
            </a>

            <div class="header-actions">

                <button
                    type="button"
                    id="connect-wallet"
                    class="header-button primary"
                >
                    Connect Wallet
                </button>

                <button
                    type="button"
                    id="logout-button"
                    class="header-button danger"
                >
                    Logout
                </button>

            </div>

        </div>

    </header>


    <!-- =========================================
         LOADING
         ========================================= -->

    <div id="loading-spinner">

        <div class="loading-card">

            <div class="spinner"></div>

            <h2>Loading Dashboard</h2>

            <p>
                Please wait while your company dashboard is loading.
            </p>

        </div>

    </div>


    <!-- =========================================
         DASHBOARD
         ========================================= -->

    <main id="dashboard-content">

        <div class="container dashboard-main">


            <!-- =====================================
                 WELCOME
                 ===================================== -->

            <section class="welcome-card">

                <div class="welcome-content">

                    <div class="eyebrow">
                        Company Dashboard
                    </div>

                    <h1>
                        Welcome,
                        <span id="company-name">
                            Company
                        </span>
                    </h1>

                    <p>
                        Manage your Web3 hiring activity,
                        subscriptions and company account
                        from one place.
                    </p>

                    <div class="company-email">
                        <span id="company-email"></span>
                    </div>

                </div>

            </section>


            <!-- =====================================
                 STATISTICS
                 ===================================== -->

            <section class="section">

                <div class="section-header">

                    <div>
                        <h2>Hiring Overview</h2>

                        <p>
                            Track your published jobs and applications.
                        </p>
                    </div>

                </div>


                <div class="stats-grid">

                    <div class="stat-card">

                        <div class="stat-label">
                            Published Jobs
                        </div>

                        <div
                            class="stat-value"
                            id="published-jobs"
                        >
                            0
                        </div>

                    </div>


                    <div class="stat-card">

                        <div class="stat-label">
                            Active Jobs
                        </div>

                        <div
                            class="stat-value"
                            id="active-jobs"
                        >
                            0
                        </div>

                    </div>


                    <div class="stat-card">

                        <div class="stat-label">
                            Total Applications
                        </div>

                        <div
                            class="stat-value"
                            id="total-applications"
                        >
                            0
                        </div>

                    </div>

                </div>

            </section>


            <!-- =====================================
                 QUICK ACTIONS
                 ===================================== -->

            <section class="section">

                <div class="section-header">

                    <div>
                        <h2>Quick Actions</h2>

                        <p>
                            Access the most important company tools.
                        </p>
                    </div>

                </div>


                <div class="actions-grid">

                    <a
                        href="post-job.html"
                        class="action-card"
                    >

                        <h3>
                            Publish a Job
                        </h3>

                        <p>
                            Create and publish a new Web3 job opportunity.
                        </p>

                        <span class="header-button primary">
                            Post Job
                        </span>

                    </a>


                    <a
                        href="applications.html"
                        class="action-card"
                    >

                        <h3>
                            Applications
                        </h3>

                        <p>
                            Review applications submitted to your jobs.
                        </p>

                        <span class="header-button">
                            View Applications
                        </span>

                    </a>


                    <a
                        href="company-profile.html"
                        class="action-card"
                    >

                        <h3>
                            Company Profile
                        </h3>

                        <p>
                            Manage your company information and profile.
                        </p>

                        <span class="header-button">
                            Manage Profile
                        </span>

                    </a>

                </div>

            </section>


            <!-- =====================================
                 SUBSCRIPTIONS
                 ===================================== -->

            <section
                class="section"
                id="subscription-section"
            >

                <div class="section-header">

                    <div>

                        <h2>
                            Company Plans
                        </h2>

                        <p>
                            Choose the plan that fits your hiring needs.
                        </p>

                    </div>

                </div>


                <div id="subscriptions">

                    <!-- Plans are loaded by company-dashboard.js -->

                </div>

            </section>


            <!-- =====================================
                 PAYMENT
                 ===================================== -->

            <section
                class="section"
                id="payment-panel"
            >

                <div class="payment-card">

                    <div class="section-header">

                        <div>

                            <h2>
                                Complete Subscription
                            </h2>

                            <p>
                                Pay securely using BNB on BNB Smart Chain.
                            </p>

                        </div>

                    </div>


                    <div class="payment-grid">


                        <!-- PLAN INFORMATION -->

                        <div class="payment-info">

                            <h3>
                                Selected Plan
                            </h3>


                            <div class="payment-row">

                                <span>
                                    Plan
                                </span>

                                <strong
                                    id="selected-plan-name"
                                >
                                    -
                                </strong>

                            </div>


                            <div class="payment-row">

                                <span>
                                    Price
                                </span>

                                <strong
                                    id="selected-plan-price"
                                >
                                    -
                                </strong>

                            </div>


                            <div class="payment-row">

                                <span>
                                    Payment Network
                                </span>

                                <strong>
                                    BNB Smart Chain
                                </strong>

                            </div>


                            <div class="payment-row">

                                <span>
                                    Payment Currency
                                </span>

                                <strong>
                                    BNB
                                </strong>

                            </div>

                        </div>


                        <!-- WALLET -->

                        <div class="payment-info">

                            <h3>
                                Wallet
                            </h3>


                            <div class="wallet-box">

                                <small>
                                    Connected Wallet
                                </small>

                                <strong
                                    id="payment-wallet"
                                >
                                    Connect Wallet
                                </strong>

                            </div>


                            <div
                                id="payment-status"
                            >
                                Select a plan and connect your wallet to continue.
                            </div>


                            <div class="payment-actions">

                                <button
                                    type="button"
                                    id="pay-button"
                                    class="payment-button"
                                    disabled
                                >
                                    Pay with BNB
                                </button>

                                <button
                                    type="button"
                                    id="subscribe-button"
                                    class="header-button"
                                    disabled
                                >
                                    Confirm Subscription
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            </section>


        </div>


        <!-- =========================================
             FOOTER
             ========================================= -->

        <footer class="dashboard-footer">

            <div class="container">

                Web3Jobs Company Dashboard

            </div>

        </footer>

    </main>

</div>


<!-- =============================================
     SUPABASE
     ============================================= -->

<script
    src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
></script>


<!-- =============================================
     ETHERS
     ============================================= -->

<script
    src="https://cdn.jsdelivr.net/npm/ethers@6.13.5/dist/ethers.umd.min.js"
></script>


<!-- =============================================
     SUPABASE PROJECT CONFIG
     =============================================

     Keep your existing js/supabase.js if your
     project already initializes window.supabaseClient.

     If your supabase.js is already loaded globally,
     do not create another Supabase client here.
     ============================================= -->

<script src="js/supabase.js"></script>


<!-- =============================================
     COMPANY DASHBOARD
     ============================================= -->

<script src="js/company-dashboard.js"></script>

</body>
</html>
