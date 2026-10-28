// ======================================================
// KFGC MEDIA APP — PROFILE PAGE
// Firebase Authentication + Cloudinary + Google Sheets
// ======================================================

import { auth } from "./firebase.js";

import {
  onAuthStateChanged,
  updateProfile,
  signOut,
  getIdToken
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ======================================================
// CONFIGURATION
// ======================================================

const CLOUDINARY_CLOUD_NAME = "dvnyyq3ru";
const CLOUDINARY_UPLOAD_PRESET = "kfgc_profiles";

const SHEET_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx__CHeBV6cEkMycG85Nn-ThWkW0SJIHTRhwXNnyjutTZ4r0gCSs4EVDtFiCt0MFuPx/exec";

const DEFAULT_PHOTO = "user.jpg";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const UPLOAD_TIMEOUT = 60000;

// ======================================================
// HTML ELEMENTS
// ======================================================

const fullNameInput = document.getElementById("fullName");
const dpInput = document.getElementById("dp");
const dpPreview = document.getElementById("dpPreview");
const uploadProgress = document.getElementById("uploadProgress");
const msg = document.getElementById("msg");
const profileForm = document.getElementById("profileForm");

const headerName = document.getElementById("headerName");
const headerDp = document.getElementById("headerDp");
const logoutBtn = document.getElementById("logoutBtn");
const adminMenu = document.getElementById("adminMenu");

// ======================================================
// STATE
// ======================================================

let currentUser = null;
let previewObjectURL = null;
let isSaving = false;

// ======================================================
// MESSAGE HELPER
// ======================================================

function showMessage(message, isError = false) {
  if (!msg) {
    console.log(message);
    return;
  }

  msg.textContent = message;
  msg.style.color = isError ? "#c62828" : "#16803c";
  msg.style.display = "block";
}

// ======================================================
// PROFILE PHOTO HELPERS
// ======================================================

function setPhoto(element, url) {
  if (!element) return;

  element.onerror = () => {
    element.onerror = null;
    element.src = DEFAULT_PHOTO;
  };

  element.src = url || DEFAULT_PHOTO;
}

function setProgress(value, visible = true) {
  if (!uploadProgress) return;

  uploadProgress.style.display = visible ? "block" : "none";
  uploadProgress.value = Math.max(0, Math.min(100, value));
}

function setSavingState(saving) {
  isSaving = saving;

  const button = profileForm?.querySelector(
    'button[type="submit"], input[type="submit"]'
  );

  if (button) {
    button.disabled = saving;
    button.textContent = saving ? "Saving..." : "Save Profile";
  }

  if (fullNameInput) fullNameInput.disabled = saving;
  if (dpInput) dpInput.disabled = saving;
}

// ======================================================
// LOAD USER PROFILE
// ======================================================

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (!user) {
    window.location.replace("auth.html");
    return;
  }

  if (headerName) {
    headerName.textContent = user.displayName || "Member";
  }

  setPhoto(headerDp, user.photoURL);
  setPhoto(dpPreview, user.photoURL);

  if (fullNameInput) {
    fullNameInput.value = user.displayName || "";
  }

  // Check whether the user has an admin role.
  if (adminMenu) {
    adminMenu.style.display = "none";

    try {
      const sheetUser = await fetchUserFromSheet(user.uid);

      if (sheetUser?.role === "admin") {
        adminMenu.style.display = "block";
      }
    } catch (error) {
      console.warn("Could not check admin role:", error);
    }
  }
});

// ======================================================
// SELECT AND PREVIEW PHOTO
// ======================================================

if (dpInput) {
  dpInput.addEventListener("change", () => {
    const file = dpInput.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      dpInput.value = "";
      showMessage("Please select an image file.", true);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      dpInput.value = "";
      showMessage(
        "Choose a JPG, PNG, or WEBP image.",
        true
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      dpInput.value = "";
      showMessage(
        "Your photo is too large. Maximum size is 5 MB.",
        true
      );
      return;
    }

    // Release the previous preview URL.
    if (previewObjectURL) {
      URL.revokeObjectURL(previewObjectURL);
    }

    previewObjectURL = URL.createObjectURL(file);
    setPhoto(dpPreview, previewObjectURL);

    showMessage(
      "Photo selected. Click Save Profile to upload it."
    );
  });
}

// ======================================================
// UPLOAD PHOTO TO CLOUDINARY
// ======================================================

function uploadProfilePhoto(file, uid) {
  return new Promise((resolve, reject) => {
    const endpoint =
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "kfgc-profiles");

    // Use a stable public ID for each user's profile image.
    formData.append("public_id", `user_${uid}`);

    const xhr = new XMLHttpRequest();
    let completed = false;

    function finishError(error) {
      if (completed) return;

      completed = true;
      clearTimeout(timeoutId);
      reject(error);
    }

    const timeoutId = setTimeout(() => {
      xhr.abort();

      finishError(
        new Error(
          "Photo upload timed out. Check your internet connection and Cloudinary settings."
        )
      );
    }, UPLOAD_TIMEOUT);

    xhr.open("POST", endpoint);
    xhr.timeout = UPLOAD_TIMEOUT;

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && !completed) {
        const percentage =
          (event.loaded / event.total) * 100;

        setProgress(percentage, true);

        showMessage(
          `Uploading photo: ${Math.round(percentage)}%`
        );
      }
    });

    xhr.addEventListener("load", () => {
      if (completed) return;

      clearTimeout(timeoutId);

      let result;

      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        finishError(
          new Error("Cloudinary returned an invalid response.")
        );
        return;
      }

      if (
        xhr.status >= 200 &&
        xhr.status < 300 &&
        result.secure_url
      ) {
        completed = true;
        resolve(result.secure_url);
        return;
      }

      const cloudinaryError =
        result.error?.message ||
        `Upload failed with HTTP ${xhr.status}.`;

      finishError(new Error(cloudinaryError));
    });

    xhr.addEventListener("error", () => {
      finishError(
        new Error(
          "Network error. Check your internet connection and try again."
        )
      );
    });

    xhr.addEventListener("timeout", () => {
      finishError(
        new Error(
          "Cloudinary took too long to respond. Please try again."
        )
      );
    });

    xhr.addEventListener("abort", () => {
      if (!completed) {
        finishError(new Error("Photo upload was cancelled."));
      }
    });

    xhr.send(formData);
  });
}

// ======================================================
// SAVE PROFILE
// ======================================================

if (profileForm) {
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSaving) return;

    const user = auth.currentUser || currentUser;

    if (!user) {
      showMessage(
        "Your session has expired. Please sign in again.",
        true
      );
      return;
    }

    const newName = fullNameInput?.value.trim() || "";
    const photoFile = dpInput?.files?.[0] || null;

    if (!newName) {
      showMessage("Please enter your full name.", true);
      fullNameInput?.focus();
      return;
    }

    if (newName.length > 100) {
      showMessage(
        "Your name must not exceed 100 characters.",
        true
      );
      return;
    }

    if (
      photoFile &&
      (
        !["image/jpeg", "image/png", "image/webp"].includes(
          photoFile.type
        ) ||
        photoFile.size > MAX_FILE_SIZE
      )
    ) {
      showMessage(
        "Choose a JPG, PNG, or WEBP image under 5 MB.",
        true
      );
      return;
    }

    setSavingState(true);
    setProgress(0, false);
    showMessage("Preparing to save your profile...");

    try {
      let photoURL = user.photoURL || "";

      // 1. Upload the selected photo, if any.
      if (photoFile) {
        showMessage("Connecting to Cloudinary...");
        setProgress(0, true);

        photoURL = await uploadProfilePhoto(
          photoFile,
          user.uid
        );
      }

      // 2. Update Firebase Authentication profile.
      showMessage("Updating your account...");

      await updateProfile(user, {
        displayName: newName,
        photoURL: photoURL || null
      });

      // 3. Update the visible page.
      if (headerName) {
        headerName.textContent = newName;
      }

      setPhoto(headerDp, photoURL);
      setPhoto(dpPreview, photoURL);

      // 4. Clear the selected file and release preview URL.
      if (dpInput) {
        dpInput.value = "";
      }

      if (previewObjectURL) {
        URL.revokeObjectURL(previewObjectURL);
        previewObjectURL = null;
      }

      setProgress(100, false);

      // 5. Update Google Sheets separately.
      // A Sheets error should not make a successful Firebase
      // profile update appear to have failed.
      showMessage("Profile saved. Updating member records...");

      try {
        await updateUserInSheet(
          user.uid,
          user.email,
          newName,
          photoURL
        );
      } catch (sheetError) {
        console.warn(
          "Profile saved, but Google Sheets update failed:",
          sheetError
        );

        showMessage(
          "Your profile was saved, but the member spreadsheet could not be updated."
        );

        return;
      }

      showMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Profile save error:", error);

      showMessage(
        error?.message || "Could not save your profile. Please try again.",
        true
      );
    } finally {
      setSavingState(false);
      setProgress(0, false);
    }
  });
}

// ======================================================
// GOOGLE SHEETS — FETCH USER
// ======================================================

async function fetchUserFromSheet(uid) {
const user = auth.currentUser;

if (!user) {
throw new Error("Please sign in to view your profile.");
}

if (user.uid !== uid) {
throw new Error("You can only access your own profile.");
}

const idToken = await user.getIdToken();

const response = await fetch(
"${SHEET_ENDPOINT}?uid=${encodeURIComponent(uid)}&idToken=${encodeURIComponent(idToken)}"
);

if (!response.ok) {
throw new Error(
"Could not retrieve member information (HTTP ${response.status})."
);
}

const result = await response.json();

if (!result.success) {
throw new Error(result.message || "Could not retrieve your profile.");
}

return result;
}
// ======================================================
// GOOGLE SHEETS — UPDATE USER
// ======================================================

async function updateUserInSheet(
uid,
email,
fullName,
photoURL
) {
const user = auth.currentUser;

if (!user) {
throw new Error("Please sign in before updating your profile.");
}

if (user.uid !== uid) {
throw new Error("You can only update your own profile.");
}

const idToken = await user.getIdToken();

const response = await fetch(SHEET_ENDPOINT, {
method: "POST",
headers: {
"Content-Type": "text/plain;charset=utf-8"
},
body: JSON.stringify({
uid,
idToken,
email,
fullName,
photoURL,
action: "update"
})
});

if (!response.ok) {
throw new Error(
"Google Sheets update failed (HTTP ${response.status})."
);
}

const result = await response.json();

if (!result.success) {
throw new Error(
result.message || "Could not update your member details."
);
}

return result;
}
// ======================================================
// LOG OUT
// ======================================================

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.replace("auth.html");
    } catch (error) {
      console.error("Logout failed:", error);

      showMessage(
        "Unable to log out. Please try again.",
        true
      );
    }
  });
  }
