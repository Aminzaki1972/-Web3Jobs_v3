"use strict";

/* =========================================================
   Web3Jobs v3
   File: js/profile.js
   Individual Profile
   ========================================================= */

let currentUser = null;
let currentProfile = null;


/* =========================================================
   GET SUPABASE CLIENT
   ========================================================= */

function getProfileClient() {

    if (
        window.Web3JobsSupabase &&
        typeof window.Web3JobsSupabase.getClient === "function"
    ) {
        return window.Web3JobsSupabase.getClient();
    }

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {
        return window.supabaseClient;
    }

    console.error(
        "Web3Jobs Profile: Supabase client not available."
    );

    return null;
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(message, type) {

    const box =
        document.getElementById("profile-message");

    if (!box) return;

    box.textContent = message;

    box.className =
        "profile-message " +
        (type || "info");
}


/* =========================================================
   GET CURRENT USER
   ========================================================= */

async function getCurrentProfileUser() {

    const client =
        getProfileClient();

    if (!client) {
        throw new Error(
            "Supabase client is not available."
        );
    }


    const {
        data,
        error
    } = await client.auth.getUser();


    if (error) {

        console.error(
            "Supabase getUser error:",
            error
        );

        throw error;
    }


    if (!data || !data.user) {

        throw new Error(
            "No authenticated user found."
        );
    }


    return data.user;
}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadUserProfile() {

    const client =
        getProfileClient();

    if (!client) {
        throw new Error(
            "Supabase client is not available."
        );
    }


    if (!currentUser || !currentUser.id) {

        throw new Error(
            "User ID is missing."
        );
    }


    console.log(
        "Web3Jobs Profile: loading profile for:",
        currentUser.id
    );


    const {
        data,
        error
    } = await client

        .from("profiles")

        .select(
            "id,email,full_name,account_type,avatar_url,bio,location,website,created_at,updated_at,role"
        )

        .eq(
            "id",
            currentUser.id
        )

        .maybeSingle();


    if (error) {

        console.error(
            "Supabase profile error:",
            error
        );

        throw error;
    }


    if (!data) {

        throw new Error(
            "Profile record was not found."
        );
    }


    currentProfile =
        data;


    return data;
}


/* =========================================================
   DISPLAY PROFILE
   ========================================================= */

function displayProfile(profile) {

    const user =
        currentUser;


    const fullName =
        document.getElementById(
            "full-name"
        );

    const email =
        document.getElementById(
            "email"
        );

    const avatarUrl =
        document.getElementById(
            "avatar-url"
        );

    const location =
        document.getElementById(
            "location"
        );

    const website =
        document.getElementById(
            "website"
        );

    const bio =
        document.getElementById(
            "bio"
        );

    const accountType =
        document.getElementById(
            "account-type"
        );


    if (fullName) {

        fullName.value =
            profile.full_name ||
            user?.user_metadata?.full_name ||
            "";
    }


    if (email) {

        email.value =
            user?.email ||
            profile.email ||
            "";
    }


    if (avatarUrl) {

        avatarUrl.value =
            profile.avatar_url ||
            "";
    }


    if (location) {

        location.value =
            profile.location ||
            "";
    }


    if (website) {

        website.value =
            profile.website ||
            "";
    }


    if (bio) {

        bio.value =
            profile.bio ||
            "";
    }


    if (accountType) {

        accountType.value =
            profile.account_type ||
            "individual";
    }


    updateAvatar(
        profile.avatar_url,
        profile.full_name
    );
}


/* =========================================================
   AVATAR
   ========================================================= */

function updateAvatar(url, name) {

    const preview =
        document.getElementById(
            "avatar-preview"
        );

    if (!preview) return;


    preview.innerHTML = "";


    if (
        url &&
        String(url).trim()
    ) {

        const img =
            document.createElement(
                "img"
            );

        img.src =
            String(url).trim();

        img.alt =
            "Profile image";

        img.onerror =
            function () {

                preview.textContent =
                    getInitial(name);
            };

        preview.appendChild(
            img
        );

        return;
    }


    preview.textContent =
        getInitial(name);
}


function getInitial(name) {

    const value =
        String(name || "").trim();

    if (!value) {
        return "?";
    }

    return value
        .charAt(0)
        .toUpperCase();
}


/* =========================================================
   SAVE PROFILE
   ========================================================= */

async function handleProfileSave(event) {

    event.preventDefault();


    const client =
        getProfileClient();

    if (!client) {

        showMessage(
            "Supabase connection is unavailable.",
            "error"
        );

        return;
    }


    if (!currentUser) {

        showMessage(
            "You are not logged in.",
            "error"
        );

        return;
    }


    const fullName =
        document
            .getElementById("full-name")
            ?.value
            .trim() || "";


    const avatarUrl =
        document
            .getElementById("avatar-url")
            ?.value
            .trim() || "";


    const location =
        document
            .getElementById("location")
            ?.value
            .trim() || "";


    const website =
        document
            .getElementById("website")
            ?.value
            .trim() || "";


    const bio =
        document
            .getElementById("bio")
            ?.value
            .trim() || "";


    if (
        avatarUrl &&
        !isValidUrl(avatarUrl)
    ) {

        showMessage(
            "Please enter a valid image URL.",
            "error"
        );

        return;
    }


    if (
        website &&
        !isValidUrl(website)
    ) {

        showMessage(
            "Please enter a valid website URL.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById(
            "save-button"
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Saving...";
    }


    showMessage(
        "Saving your profile...",
        "info"
    );


    try {

        /*
         * IMPORTANT:
         * We intentionally update ONLY these fields.
         *
         * We do NOT update:
         * id
         * email
         * account_type
         * role
         * created_at
         */

        const {
            data,
            error
        } = await client

            .from("profiles")

            .update({

                full_name:
                    fullName || null,

                avatar_url:
                    avatarUrl || null,

                bio:
                    bio || null,

                location:
                    location || null,

                website:
                    website || null,

                updated_at:
                    new Date()
                        .toISOString()

            })

            .eq(
                "id",
                currentUser.id
            )

            .select(
                "id,email,full_name,account_type,avatar_url,bio,location,website,created_at,updated_at,role"
            )

            .maybeSingle();


        if (error) {

            console.error(
                "Profile update error:",
                error
            );

            showMessage(
                "Unable to save profile: " +
                error.message,
                "error"
            );

            return;
        }


        currentProfile =
            data;


        /*
         * Also update Auth metadata name.
         * This is not required for the database update,
         * but keeps the dashboard name synchronized.
         */

        try {

            await client.auth.updateUser({

                data: {
                    full_name:
                        fullName
                }

            });

        } catch (metadataError) {

            console.warn(
                "Auth metadata update warning:",
                metadataError
            );
        }


        updateAvatar(
            avatarUrl,
            fullName
        );


        showMessage(
            "Profile saved successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Profile save exception:",
            error
        );

        showMessage(
            "An unexpected error occurred.",
            "error"
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Save Profile";
        }
    }
}


/* =========================================================
   URL VALIDATION
   ========================================================= */

function isValidUrl(value) {

    try {

        const url =
            new URL(value);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );

    } catch (error) {

        return false;
    }
}


/* =========================================================
   BACK
   ========================================================= */

function backToDashboard() {

    window.location.href =
        "dashboard.html";
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeProfile() {

    console.log(
        "Web3Jobs Profile: initializing..."
    );


    try {

        /*
         * Step 1
         * Get authenticated user
         */

        currentUser =
            await getCurrentProfileUser();


        console.log(
            "Web3Jobs Profile: user found:",
            currentUser.id
        );


        /*
         * Step 2
         * Load profile
         */

        const profile =
            await loadUserProfile();


        console.log(
            "Web3Jobs Profile: profile loaded:",
            profile
        );


        /*
         * Step 3
         * Fill form
         */

        displayProfile(
            profile
        );


        /*
         * Step 4
         * Show form
         */

        const loading =
            document.getElementById(
                "profile-loading"
            );

        const form =
            document.getElementById(
                "profile-form"
            );


        if (loading) {

            loading.style.display =
                "none";
        }


        if (form) {

            form.style.display =
                "block";
        }


    } catch (error) {

        console.error(
            "Web3Jobs Profile initialization failed:",
            error
        );


        showMessage(
            error.message ||
            "Unable to load your profile.",
            "error"
        );


        const loading =
            document.getElementById(
                "profile-loading"
            );


        if (loading) {

            loading.style.display =
                "none";
        }
    }
}


/* =========================================================
   EVENTS
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const form =
            document.getElementById(
                "profile-form"
            );


        if (form) {

            form.addEventListener(
                "submit",
                handleProfileSave
            );
        }


        const back =
            document.getElementById(
                "back-button"
            );


        if (back) {

            back.addEventListener(
                "click",
                backToDashboard
            );
        }


        const avatar =
            document.getElementById(
                "avatar-url"
            );


        if (avatar) {

            avatar.addEventListener(
                "input",
                function () {

                    const name =
                        document
                            .getElementById(
                                "full-name"
                            )
                            ?.value || "";

                    updateAvatar(
                        avatar.value,
                        name
                    );
                }
            );
        }


        initializeProfile();
    }
);
