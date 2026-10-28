// profile.js
import { auth } from "./firebase.js";

import {
  onAuthStateChanged,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dvnyyq3ru";
const CLOUDINARY_UPLOAD_PRESET = "kfgc_profiles";

// Google Apps Script endpoint
const SHEET_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbx__CHeBV6cEkMycG85Nn-ThWkW0SJIHTRhwXNnyjutTZ4r0gCSs4EVDtFiCt0MFuPx/exec";

// HTML elements
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

const DEFAULT_PHOTO = "user.jpg";

// Display messages
function showMessage(message, isError = false) {
  if (!msg) return;
  msg.textContent = message;
  msg.style.color = isError ? "#c62828" : "#16803c";
}

// Load authenticated user's profile
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("auth.html");
    return;
  }

  if (headerName) {
    headerName.textContent = user.displayName || "Member";
  }

  if (headerDp) {
    headerDp.src = user.photoURL || DEFAULT_PHOTO;
  }

  if (fullNameInput) {
    fullNameInput.value = user.displayName || "";
  }

  if (dpPreview) {
    dpPreview.src = user.photoURL || DEFAULT_PHOTO;
  }

  if (adminMenu) {
    adminMenu.style.display = "none";

    const sheetUser = await fetchUserFromSheet(user.uid);

    if (sheetUser?.role === "admin") {
      adminMenu.style.display = "block";
    }
  }
});

// Preview selected profile picture
if (dpInput) {
  dpInput.addEventListener("change", () => {
    const file = dpInput.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("Please select a valid image.", true);
      dpInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("The image must be 5 MB or smaller.", true);
      dpInput.value = "";
      return;
    }

    if (dpPreview) {
      dpPreview.src = URL.createObjectURL(file);
    }

    showMessage("Photo selected. Remember to save your profile.");
  });
}

// Upload an image to Cloudinary
async function uploadProfilePhoto(file, uid) {
  const endpoint =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "kfgc-profiles");
  formData.append("public_id", `user_${uid}`);

  if (uploadProgress) {
    uploadProgress.style.display = "block";
    uploadProgress.value = 0;
  }

  // XMLHttpRequest provides upload progress events.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", endpoint);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && uploadProgress) {
        uploadProgress.value =
          (event.loaded / event.total) * 100;
      }
    });

    xhr.addEventListener("load", () => {
      if (uploadProgress) {
        uploadProgress.style.display = "none";
      }

      let result;

      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Cloudinary returned an invalid response."));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && result.secure_url) {
        resolve(result.secure_url);
      } else {
        reject(
          new Error(
            result.error?.message ||
            `Cloudinary upload failed (HTTP ${xhr.status}).`
          )
        );
      }
    });

    xhr.addEventListener("error", () => {
      if (uploadProgress) {
        uploadProgress.style.display = "none";
      }

      reject(new Error("Network error while uploading the photo."));
    });

    xhr.addEventListener("abort", () => {
      if (uploadProgress) {
        uploadProgress.style.display = "none";
      }

      reject(new Error("Photo upload was cancelled."));
    });

    xhr.send(formData);
  });
}

// Save profile changes
if (profileForm) {
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user) {
      showMessage("Please sign in again.", true);
      return;
    }

    const newName = fullNameInput?.value.trim() || "";
    const photoFile = dpInput?.files?.[0];
    let photoURL = user.photoURL || "";

    if (!newName) {
      showMessage("Please enter your full name.", true);
      return;
    }

    if (newName.length > 100) {
      showMessage("Your name must be 100 characters or fewer.", true);
      return;
    }

    const saveButton = profileForm.querySelector(
      'button[type="submit"]'
    );

    if (saveButton) {
      saveButton.disabled = true;
    }

    showMessage("Saving your profile...");

    try {
      // Upload the photo first, if one was selected.
      if (photoFile) {
        showMessage("Uploading your profile photo...");
        photoURL = await uploadProfilePhoto(photoFile, user.uid);
      }

      // Update Firebase Authentication profile.
      await updateProfile(user, {
        displayName: newName,
        photoURL: photoURL || null
      });

      // Update the page immediately.
      if (headerName) {
        headerName.textContent = newName;
      }

      if (headerDp) {
        headerDp.src = photoURL || DEFAULT_PHOTO;
      }

      if (dpPreview) {
        dpPreview.src = photoURL || DEFAULT_PHOTO;
      }

      // Update the Google Sheet separately.
      // A Sheet failure should not undo a successful Firebase update.
      try {
        await updateUserInSheet(
          user.uid,
          user.email,
          newName,
          photoURL
        );
      } catch (sheetError) {
        console.error("Google Sheet update failed:", sheetError);
      }

      if (dpInput) {
        dpInput.value = "";
      }

      showMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Profile save error:", error);
      showMessage(error.message || "Could not save your profile.", true);
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
      }

      if (uploadProgress) {
        uploadProgress.style.display = "none";
      }
    }
  });
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.replace("auth.html");
    } catch (error) {
      console.error("Logout error:", error);
      showMessage("Unable to log out. Please try again.", true);
    }
  });
}

// Fetch user data from Google Sheets
async function fetchUserFromSheet(uid) {
  try {
    const response = await fetch(
      `${SHEET_ENDPOINT}?uid=${encodeURIComponent(uid)}`
    );

    if (!response.ok) {
      throw new Error(`Google Sheet request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Could not fetch user from Google Sheets:", error);
    return null;
  }
}

// Update user data in Google Sheets
async function updateUserInSheet(uid, email, fullName, photoURL) {
  const response = await fetch(SHEET_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      uid,
      email,
      fullName,
      photoURL,
      action: "update"
    })
  });

  if (!response.ok) {
    throw new Error("Google Sheets could not be updated.");
  }

  return response;
                                    }
