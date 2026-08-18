"use strict";

/* Web3Jobs - Company Profile Editor */
(function () {
    let client = null;
    let currentUser = null;
    let currentCompany = null;

    function getClient() {
        if (client) return client;
        if (window.Web3JobsSupabase && typeof window.Web3JobsSupabase.getClient === "function") {
            client = window.Web3JobsSupabase.getClient();
            return client;
        }
        if (window.__web3jobsSupabase && typeof window.__web3jobsSupabase.from === "function") {
            client = window.__web3jobsSupabase;
            return client;
        }
        if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
            client = window.supabaseClient;
            return client;
        }
        return null;
    }

    function message(text, type = "info") {
        const box = document.getElementById("message");
        if (!box) return;
        box.textContent = text;
        box.className = "message " + type;
    }

    function validUrl(value) {
        if (!value) return true;
        try {
            const url = new URL(value);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
            return false;
        }
    }

    function initial(name) {
        const value = String(name || "").trim();
        return value ? value.charAt(0).toUpperCase() : "C";
    }

    function updateLogo(url, name) {
        const preview = document.getElementById("logo-preview");
        if (!preview) return;
        preview.innerHTML = "";
        if (url) {
            const img = document.createElement("img");
            img.src = url;
            img.alt = "Company logo";
            img.onerror = function () { preview.textContent = initial(name); };
            preview.appendChild(img);
            return;
        }
        preview.textContent = initial(name);
    }

    function setValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value || "";
    }

    async function getUser() {
        const sb = getClient();
        if (!sb || !sb.auth) throw new Error("Supabase connection is not initialized.");
        const { data, error } = await sb.auth.getUser();
        if (error) throw error;
        if (!data?.user) {
            window.location.href = "login.html";
            return null;
        }
        currentUser = data.user;
        return currentUser;
    }

    async function loadCompany() {
        const sb = getClient();
        if (!sb || !currentUser) throw new Error("Supabase connection is not initialized.");
        const { data, error } = await sb
            .from("company_profiles")
            .select("id,user_id,company_name,website,logo_url,description,industry,location,wallet_address,created_at,updated_at")
            .eq("user_id", currentUser.id)
            .maybeSingle();
        if (error) throw error;
        currentCompany = data || null;
        setValue("company-name", currentCompany?.company_name || currentUser.user_metadata?.company_name || currentUser.user_metadata?.name || "");
        setValue("industry", currentCompany?.industry);
        setValue("location", currentCompany?.location);
        setValue("website", currentCompany?.website);
        setValue("logo-url", currentCompany?.logo_url);
        setValue("description", currentCompany?.description);
        setValue("wallet-address", currentCompany?.wallet_address);
        updateLogo(currentCompany?.logo_url, currentCompany?.company_name);
    }

    async function syncDashboardProfile(sb, companyName) {
        const { error } = await sb
            .from("profiles")
            .update({
                full_name: companyName,
                updated_at: new Date().toISOString()
            })
            .eq("id", currentUser.id);
        if (error) throw error;
    }

    async function saveCompany(event) {
        event.preventDefault();
        const sb = getClient();
        if (!sb || !currentUser) {
            message("You are not logged in.", "error");
            return;
        }

        const companyName = document.getElementById("company-name")?.value.trim() || "";
        const industry = document.getElementById("industry")?.value.trim() || "";
        const location = document.getElementById("location")?.value.trim() || "";
        const website = document.getElementById("website")?.value.trim() || "";
        const logoUrl = document.getElementById("logo-url")?.value.trim() || "";
        const description = document.getElementById("description")?.value.trim() || "";

        if (!companyName) {
            message("Company name is required.", "error");
            return;
        }
        if (!validUrl(website)) {
            message("Please enter a valid website URL.", "error");
            return;
        }
        if (!validUrl(logoUrl)) {
            message("Please enter a valid logo URL.", "error");
            return;
        }

        const button = document.getElementById("save-button");
        if (button) {
            button.disabled = true;
            button.textContent = "Saving...";
        }
        message("Saving company profile...", "info");

        const payload = {
            user_id: currentUser.id,
            company_name: companyName,
            website: website || null,
            logo_url: logoUrl || null,
            description: description || null,
            industry: industry || null,
            location: location || null,
            wallet_address: currentCompany?.wallet_address || null,
            updated_at: new Date().toISOString()
        };

        try {
            let result;
            if (currentCompany?.id) {
                result = await sb
                    .from("company_profiles")
                    .update(payload)
                    .eq("id", currentCompany.id)
                    .eq("user_id", currentUser.id)
                    .select("*")
                    .maybeSingle();
            } else {
                result = await sb
                    .from("company_profiles")
                    .insert(payload)
                    .select("*")
                    .single();
            }
            if (result.error) throw result.error;

            currentCompany = result.data;

            /* Keep the existing profiles-based company dashboard name synchronized. */
            await syncDashboardProfile(sb, companyName);

            updateLogo(logoUrl, companyName);

            try {
                await sb.auth.updateUser({
                    data: {
                        company_name: companyName,
                        name: companyName
                    }
                });
            } catch (metadataError) {
                console.warn("Auth metadata update warning:", metadataError);
            }

            message("Company profile saved successfully.", "success");
        } catch (error) {
            console.error("Company profile save error:", error);
            message("Unable to save company profile: " + (error?.message || "Unknown error"), "error");
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Save Company Profile";
            }
        }
    }

    function init() {
        const form = document.getElementById("company-profile-form");
        const loading = document.getElementById("loading");
        const back = document.getElementById("back-button");
        const logo = document.getElementById("logo-url");
        const name = document.getElementById("company-name");

        if (form) form.addEventListener("submit", saveCompany);
        if (back) back.addEventListener("click", () => { window.location.href = "company-dashboard.html"; });
        if (logo) logo.addEventListener("input", () => updateLogo(logo.value.trim(), name?.value));
        if (name) name.addEventListener("input", () => updateLogo(logo?.value.trim(), name.value));

        (async function () {
            try {
                await getUser();
                await loadCompany();
                if (loading) loading.style.display = "none";
                if (form) form.style.display = "block";
            } catch (error) {
                console.error("Company profile initialization error:", error);
                if (loading) loading.style.display = "none";
                message(error?.message || "Unable to load company profile.", "error");
            }
        })();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();