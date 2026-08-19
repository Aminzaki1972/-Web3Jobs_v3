"use strict";

/* =========================================================
   Web3Jobs v3
   File: js/profile.js
   Individual Profile
   Profile photo + private CV upload
   ========================================================= */

let currentUser = null;
let currentProfile = null;

const AVATAR_BUCKET = "profile-avatars";
const CV_BUCKET = "candidate-cvs";
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_CV_SIZE = 10 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_CV_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

function getProfileClient() {
    if (window.Web3JobsSupabase && typeof window.Web3JobsSupabase.getClient === "function") {
        return window.Web3JobsSupabase.getClient();
    }
    if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
        return window.supabaseClient;
    }
    console.error("Web3Jobs Profile: Supabase client not available.");
    return null;
}

function showMessage(message, type) {
    const box = document.getElementById("profile-message");
    if (!box) return;
    box.textContent = message;
    box.className = "profile-message " + (type || "info");
}

function setStatus(id, message) {
    const element = document.getElementById(id);
    if (element) element.textContent = message || "";
}

async function getCurrentProfileUser() {
    const client = getProfileClient();
    if (!client) throw new Error("Supabase client is not available.");

    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    if (!data || !data.user) throw new Error("No authenticated user found.");
    return data.user;
}

async function loadUserProfile() {
    const client = getProfileClient();
    if (!client) throw new Error("Supabase client is not available.");
    if (!currentUser || !currentUser.id) throw new Error("User ID is missing.");

    const { data, error } = await client
        .from("profiles")
        .select("id,email,full_name,account_type,avatar_url,cv_url,bio,location,website,created_at,updated_at,role")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Profile record was not found.");

    currentProfile = data;
    return data;
}

function displayProfile(profile) {
    const user = currentUser;

    const fullName = document.getElementById("full-name");
    const email = document.getElementById("email");
    const location = document.getElementById("location");
    const website = document.getElementById("website");
    const bio = document.getElementById("bio");
    const accountType = document.getElementById("account-type");

    if (fullName) fullName.value = profile.full_name || user?.user_metadata?.full_name || "";
    if (email) email.value = user?.email || profile.email || "";
    if (location) location.value = profile.location || "";
    if (website) website.value = profile.website || "";
    if (bio) bio.value = profile.bio || "";
    if (accountType) accountType.value = profile.account_type || "individual";

    updateAvatar(profile.avatar_url, profile.full_name);
    updateCvDisplay(profile.cv_url);
}

function updateAvatar(url, name) {
    const preview = document.getElementById("avatar-preview");
    if (!preview) return;

    preview.innerHTML = "";

    if (url && String(url).trim()) {
        const img = document.createElement("img");
        img.src = String(url).trim();
        img.alt = "Profile image";
        img.loading = "lazy";
        img.onerror = function () {
            preview.textContent = getInitial(name);
        };
        preview.appendChild(img);
        return;
    }

    preview.textContent = getInitial(name);
}

function getInitial(name) {
    const value = String(name || "").trim();
    return value ? value.charAt(0).toUpperCase() : "?";
}

function getExtension(fileName) {
    const name = String(fileName || "");
    const dot = name.lastIndexOf(".");
    return dot > -1 ? name.slice(dot + 1).toLowerCase() : "";
}

function sanitizeExtension(extension, fallback) {
    return /^[a-z0-9]+$/.test(extension) ? extension : fallback;
}

function validateAvatar(file) {
    if (!file) throw new Error("Please select a profile photo.");
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
        throw new Error("Profile photo must be JPG, PNG, WEBP or GIF.");
    }
    if (file.size > MAX_AVATAR_SIZE) {
        throw new Error("Profile photo must be 2 MB or smaller.");
    }
}

function validateCv(file) {
    if (!file) throw new Error("Please select a CV file.");
    if (!ALLOWED_CV_TYPES.includes(file.type)) {
        const ext = getExtension(file.name);
        if (!["pdf", "doc", "docx"].includes(ext)) {
            throw new Error("CV must be PDF, DOC or DOCX.");
        }
    }
    if (file.size > MAX_CV_SIZE) {
        throw new Error("CV must be 10 MB or smaller.");
    }
}

async function uploadAvatar(file) {
    const client = getProfileClient();
    validateAvatar(file);

    const extension = sanitizeExtension(getExtension(file.name), "jpg");
    const path = currentUser.id + "/avatar." + extension;

    setStatus("avatar-status", "Uploading photo...");

    const { error } = await client.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: true
        });

    if (error) throw error;

    const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    if (!data || !data.publicUrl) throw new Error("Unable to create the profile photo URL.");

    const oldAvatar = currentProfile?.avatar_url || null;
    const newUrl = data.publicUrl;

    const { error: updateError } = await client
        .from("profiles")
        .update({ avatar_url: newUrl, updated_at: new Date().toISOString() })
        .eq("id", currentUser.id);

    if (updateError) throw updateError;

    currentProfile = { ...(currentProfile || {}), avatar_url: newUrl };
    updateAvatar(newUrl, currentProfile.full_name || document.getElementById("full-name")?.value || "");
    setStatus("avatar-status", "Profile photo uploaded successfully.");

    /* Remove an old Storage URL only when it belongs to our avatar bucket. */
    if (oldAvatar && oldAvatar.includes("/storage/v1/object/public/" + AVATAR_BUCKET + "/")) {
        const marker = "/storage/v1/object/public/" + AVATAR_BUCKET + "/";
        const oldPath = decodeURIComponent(oldAvatar.split(marker)[1] || "");
        if (oldPath && oldPath !== path) {
            await client.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(() => {});
        }
    }
}

async function createCvLink(path) {
    if (!path) return null;
    const client = getProfileClient();
    const { data, error } = await client.storage
        .from(CV_BUCKET)
        .createSignedUrl(path, 3600);
    if (error) throw error;
    return data?.signedUrl || null;
}

async function updateCvDisplay(path) {
    const nameElement = document.getElementById("cv-name");
    const link = document.getElementById("cv-link");

    if (!nameElement || !link) return;

    if (!path) {
        nameElement.textContent = "No CV uploaded yet.";
        link.style.display = "none";
        link.removeAttribute("href");
        return;
    }

    const fileName = String(path).split("/").pop() || "CV";
    nameElement.textContent = fileName;
    link.style.display = "inline-block";
    link.textContent = "View / Download CV";
    link.href = "#";

    try {
        const signedUrl = await createCvLink(path);
        if (signedUrl) {
            link.href = signedUrl;
        } else {
            link.style.display = "none";
        }
    } catch (error) {
        console.warn("Unable to create CV link:", error);
        link.style.display = "none";
    }
}

async function uploadCv(file) {
    const client = getProfileClient();
    validateCv(file);

    const extension = sanitizeExtension(getExtension(file.name), "pdf");
    const path = currentUser.id + "/cv." + extension;
    const oldPath = currentProfile?.cv_url || null;

    setStatus("cv-status", "Uploading CV...");

    const { error } = await client.storage
        .from(CV_BUCKET)
        .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type || "application/octet-stream",
            upsert: true
        });

    if (error) throw error;

    const { error: updateError } = await client
        .from("profiles")
        .update({ cv_url: path, updated_at: new Date().toISOString() })
        .eq("id", currentUser.id);

    if (updateError) throw updateError;

    currentProfile = { ...(currentProfile || {}), cv_url: path };
    await updateCvDisplay(path);
    setStatus("cv-status", "CV uploaded successfully.");

    if (oldPath && oldPath !== path) {
        await client.storage.from(CV_BUCKET).remove([oldPath]).catch(() => {});
    }
}

async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        await uploadAvatar(file);
        showMessage("Profile photo saved successfully.", "success");
    } catch (error) {
        console.error("Avatar upload error:", error);
        setStatus("avatar-status", "");
        showMessage(error.message || "Unable to upload the profile photo.", "error");
    } finally {
        event.target.value = "";
    }
}

async function handleCvChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        await uploadCv(file);
        showMessage("CV uploaded successfully.", "success");
    } catch (error) {
        console.error("CV upload error:", error);
        setStatus("cv-status", "");
        showMessage(error.message || "Unable to upload the CV.", "error");
    } finally {
        event.target.value = "";
    }
}

async function handleProfileSave(event) {
    event.preventDefault();

    const client = getProfileClient();
    if (!client) {
        showMessage("Supabase connection is unavailable.", "error");
        return;
    }
    if (!currentUser) {
        showMessage("You are not logged in.", "error");
        return;
    }

    const fullName = document.getElementById("full-name")?.value.trim() || "";
    const location = document.getElementById("location")?.value.trim() || "";
    const website = document.getElementById("website")?.value.trim() || "";
    const bio = document.getElementById("bio")?.value.trim() || "";

    if (website && !isValidUrl(website)) {
        showMessage("Please enter a valid website URL.", "error");
        return;
    }

    const button = document.getElementById("save-button");
    if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
    }

    showMessage("Saving your profile...", "info");

    try {
        const { data, error } = await client
            .from("profiles")
            .update({
                full_name: fullName || null,
                bio: bio || null,
                location: location || null,
                website: website || null,
                updated_at: new Date().toISOString()
            })
            .eq("id", currentUser.id)
            .select("id,email,full_name,account_type,avatar_url,cv_url,bio,location,website,created_at,updated_at,role")
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Profile was not saved.");

        currentProfile = data;

        try {
            await client.auth.updateUser({ data: { full_name: fullName } });
        } catch (metadataError) {
            console.warn("Auth metadata update warning:", metadataError);
        }

        updateAvatar(data.avatar_url, fullName);
        await updateCvDisplay(data.cv_url);
        showMessage("Profile saved successfully.", "success");
    } catch (error) {
        console.error("Profile save error:", error);
        showMessage("Unable to save profile: " + (error.message || "Unknown error"), "error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Save Profile";
        }
    }
}

function isValidUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
        return false;
    }
}

function backToDashboard() {
    window.location.href = "dashboard.html";
}

async function initializeProfile() {
    try {
        currentUser = await getCurrentProfileUser();
        const profile = await loadUserProfile();
        displayProfile(profile);

        const loading = document.getElementById("profile-loading");
        const form = document.getElementById("profile-form");
        if (loading) loading.style.display = "none";
        if (form) form.style.display = "block";
    } catch (error) {
        console.error("Web3Jobs Profile initialization failed:", error);
        showMessage(error.message || "Unable to load your profile.", "error");
        const loading = document.getElementById("profile-loading");
        if (loading) loading.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("profile-form");
    if (form) form.addEventListener("submit", handleProfileSave);

    const back = document.getElementById("back-button");
    if (back) back.addEventListener("click", backToDashboard);

    const avatarFile = document.getElementById("avatar-file");
    if (avatarFile) avatarFile.addEventListener("change", handleAvatarChange);

    const cvFile = document.getElementById("cv-file");
    if (cvFile) cvFile.addEventListener("change", handleCvChange);

    initializeProfile();
});
