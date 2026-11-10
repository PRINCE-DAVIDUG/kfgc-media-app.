// ==========================================
// KFGC MEDIA APP — PROFILE CONTROLLER
// ==========================================

import { auth } from "./firebase.js";

import {
  onAuthStateChanged,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// ==========================================
// CONFIGURATION
// ==========================================

const CLOUDINARY_CLOUD_NAME = "dvnyyq3ru";
const CLOUDINARY_UPLOAD_PRESET = "kfgc_profiles";

const SHEET_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbycn8JwMsEnEwfme8RVZ9E1iGQMrSou4XnpJRoTbrBzoUD-XNfOc7oZ2Mh1J8QiOxrD_g/exec";


// ==========================================
// HTML ELEMENTS
// ==========================================

const profileForm = document.getElementById("profileForm");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("profileEmail");

const photoInput = document.getElementById("dp");
const photoPreview = document.getElementById("dpPreview");
const selectedFileName = document.getElementById("selectedFileName");

const saveButton = document.getElementById("saveProfileBtn");
const resetButton = document.getElementById("resetProfileBtn");

const message = document.getElementById("msg");
const progress = document.getElementById("uploadProgress");

const headerName = document.getElementById("headerName");
const headerDp = document.getElementById("headerDp");

const displayName = document.getElementById("profileDisplayName");
const heroDp = document.getElementById("heroDp");

const logoutButton = document.getElementById("logoutBtn");


// ==========================================
// CURRENT USER
// ==========================================

let currentUser = null;
let currentPhotoURL = "";


// ==========================================
// MESSAGE HANDLER
// ==========================================

function showMessage(text, type = "info") {
  if (!message) return;

  message.textContent = text;
  message.className = "profile-message " + type;
}


// ==========================================
// PHOTO DISPLAY
// ==========================================

function displayPhoto(url) {
  if (!url) return;

  if (photoPreview) photoPreview.src = url;
  if (headerDp) headerDp.src = url;
  if (heroDp) heroDp.src = url;
}


// ==========================================
// RENDER USER INFORMATION
// ==========================================

// ==========================================
// PROFILE COMPLETION STATUS
// ==========================================

function updateCompletion() {

  const percentElement =
    document.getElementById("completionPercent");

  const fillElement =
    document.getElementById("completionFill");

  const barElement =
    document.getElementById("completionBar");

  const messageElement =
    document.getElementById("completionMessage");

  const name = fullNameInput?.value.trim();
  const email = emailInput?.value.trim();
  const photo = currentPhotoURL;

  let completed = 0;

  if (name) completed++;
  if (email) completed++;
  if (photo) completed++;

  const percentage = Math.round((completed / 3) * 100);

  if (percentElement) {
    percentElement.textContent = percentage + "%";
  }

  if (fillElement) {
    fillElement.style.width = percentage + "%";
  }

  if (barElement) {
    barElement.setAttribute("aria-valuenow", percentage);
  }

  if (messageElement) {
    if (percentage === 100) {
      messageElement.textContent =
        "Your profile is complete. Great job!";
    } else {
      messageElement.textContent =
        "Complete your profile to reach 100%.";
    }
  }
        }

function renderUser(user) {
  currentUser = user;
  currentPhotoURL = user.photoURL || "";

  const name = user.displayName || "KFGC Member";

  if (fullNameInput) {
    fullNameInput.value = user.displayName || "";
  }

  if (emailInput) {
    emailInput.value = user.email || "";
  }

  if (headerName) {
    headerName.textContent = name;
  }

  if (displayName) {
    displayName.textContent = name;
  }

  if (currentPhotoURL) {
    displayPhoto(currentPhotoURL);
  }

  if (selectedFileName) {
    selectedFileName.textContent = "No new photo selected";
  }
  updateCompletion();
}


// ==========================================
// PHOTO PREVIEW
// ==========================================

if (photoInput) {
  photoInput.addEventListener("change", () => {

    const file = photoInput.files[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      showMessage("Please select a JPG, PNG or WEBP image.", "error");
      photoInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("Your image must not exceed 5MB.", "error");
      photoInput.value = "";
      return;
    }

    const previewURL = URL.createObjectURL(file);

    if (photoPreview) {
      photoPreview.src = previewURL;
    }

    if (selectedFileName) {
      selectedFileName.textContent = file.name;
    }

    showMessage("Photo selected successfully.", "success");
  });
}


// ==========================================
// UPLOAD PHOTO TO CLOUDINARY
// ==========================================

async function uploadPhoto(file) {

  const uploadURL =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "kfgc_profiles");

  if (progress) {
    progress.style.display = "block";
    if ("value" in progress) progress.value = 20;
  }

  const response = await fetch(uploadURL, {
    method: "POST",
    body: formData
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error?.message || "Cloudinary photo upload failed."
    );
  }

  if (!result.secure_url) {
    throw new Error("Cloudinary did not return a photo URL.");
  }

  if (progress && "value" in progress) {
    progress.value = 100;
  }

  return result.secure_url;
}


// ==========================================
// SAVE PROFILE TO GOOGLE SHEETS
// ==========================================

async function saveToSheet(user, name, photoURL) {

  const response = await fetch(SHEET_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      action: "saveProfile",
      uid: user.uid,
      email: user.email,
      fullName: name,
      photoURL: photoURL
    })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Spreadsheet update failed.");
  }

  return result;
}


// ==========================================
// SAVE PROFILE FORM
// ==========================================

if (profileForm) {

  profileForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!currentUser) {
      showMessage("Please sign in again.", "error");
      return;
    }

    const name = fullNameInput.value.trim();
    const file = photoInput?.files[0];

    if (!name) {
      showMessage("Please enter your full name.", "error");
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {

      showMessage("Updating your profile...", "info");

      let photoURL = currentPhotoURL;

      // Upload a new photo if selected
      if (file) {
        showMessage("Uploading your photo...", "info");

        photoURL = await uploadPhoto(file);
      }

      // Update Firebase Authentication
      await updateProfile(currentUser, {
        displayName: name,
        photoURL: photoURL || null
      });

      // Save member details to Google Sheets
      showMessage("Saving member information...", "info");

      await saveToSheet(currentUser, name, photoURL);

      currentPhotoURL = photoURL;

      renderUser(currentUser);
      updateCompletion();

      if (photoInput) photoInput.value = "";

      showMessage("Your profile was saved successfully!", "success");

    } catch (error) {

      console.error("PROFILE SAVE ERROR:", error);

      showMessage(error.message || "Unable to save your profile.", "error");

    } finally {

      saveButton.disabled = false;
      saveButton.textContent = "Save Profile";

      if (progress) {
        if ("value" in progress) progress.value = 0;
        progress.style.display = "none";
      }
    }
  });
}


// ==========================================
// RESET PROFILE FORM
// ==========================================

if (resetButton) {

  resetButton.addEventListener("click", () => {

    if (!currentUser) return;

    renderUser(currentUser);

    if (photoInput) photoInput.value = "";

    showMessage("Changes have been reset.", "info");
  });
}


// ==========================================
// AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, (user) => {

  if (!user) {
    currentUser = null;

    window.location.href = "auth.html";
    return;
  }

  renderUser(user);
});


// ==========================================
// LOGOUT
// ==========================================

if (logoutButton) {

  logoutButton.addEventListener("click", async () => {

    try {

      await signOut(auth);

      window.location.href = "auth.html";

    } catch (error) {

      console.error("LOGOUT ERROR:", error);

      showMessage("Unable to log out. Please try again.", "error");
    }
  });
  }
