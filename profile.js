// KFGC MEDIA APP — profile controller
import { auth, storage } from "./firebase.js";
import { onAuthStateChanged, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const byId = (id) => document.getElementById(id);
const fullNameInput = byId("fullName");
const dpInput = byId("dp");
const dpPreview = byId("dpPreview");
const uploadProgress = byId("uploadProgress");
const msg = byId("msg");
const profileForm = byId("profileForm");
const headerName = byId("headerName");
const headerDp = byId("headerDp");
const heroName = byId("profileDisplayName");
const heroDp = byId("heroDp");
const profileEmail = byId("profileEmail");
const logoutBtn = byId("logoutBtn");
const adminMenu = byId("adminMenu");
const selectedFileName = byId("selectedFileName");
const saveProfileBtn = byId("saveProfileBtn");
const resetProfileBtn = byId("resetProfileBtn");
const completionPercent = byId("completionPercent");
const completionFill = byId("completionFill");
const completionBar = byId("completionBar");
const completionMessage = byId("completionMessage");

const DEFAULT_PHOTO = "user.jpg";
const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbx__CHeBV6cEkMycG85Nn-ThWkW0SJIHTRhwXNnyjutTZ4r0gCSs4EVDtFiCt0MFuPx/exec";
let currentUser = null;
let originalName = "";
let objectPreviewUrl = null;

function setMessage(text, type = "") {
  if (!msg) return;
  msg.textContent = text;
  msg.className = `form-message ${type}`.trim();
}

function setPhoto(src) {
  const safeSrc = src || DEFAULT_PHOTO;
  if (headerDp) headerDp.src = safeSrc;
  if (heroDp) heroDp.src = safeSrc;
  if (dpPreview) dpPreview.src = safeSrc;
}

function updateCompletion(name, photoURL) {
  const hasName = Boolean((name || "").trim());
  const hasPhoto = Boolean(photoURL && photoURL !== DEFAULT_PHOTO);
  const percent = (hasName ? 50 : 0) + (hasPhoto ? 50 : 0);
  if (completionPercent) completionPercent.textContent = `${percent}%`;
  if (completionFill) completionFill.style.width = `${percent}%`;
  if (completionBar) completionBar.setAttribute("aria-valuenow", String(percent));
  if (completionMessage) {
    completionMessage.textContent = percent === 100
      ? "Your profile looks great. Thanks for keeping it up to date!"
      : "Add your full name and a profile picture to complete your profile.";
  }
}

function renderUser(user, sheetUser = null) {
  const name = user.displayName || sheetUser?.fullName || "Member";
  const photo = user.photoURL || sheetUser?.photoURL || DEFAULT_PHOTO;
  if (headerName) headerName.textContent = name;
  if (heroName) heroName.textContent = name === "Member" ? "Welcome, Member" : `Welcome, ${name}`;
  if (fullNameInput) fullNameInput.value = name === "Member" ? "" : name;
  if (profileEmail) profileEmail.value = user.email || "";
  setPhoto(photo);
  updateCompletion(name === "Member" ? "" : name, photo);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // auth-guard.js should normally handle this; this is a safe fallback.
    window.location.replace("auth.html");
    return;
  }

  currentUser = user;
  renderUser(user);

  const sheetUser = await fetchUserFromSheet(user.uid);
  if (sheetUser) {
    if (adminMenu) adminMenu.style.display = sheetUser.role === "admin" ? "" : "none";
    // If Firebase Auth has no display name/photo, use the sheet values as a fallback.
    renderUser(user, sheetUser);
  } else if (adminMenu) {
    adminMenu.style.display = "none";
  }
  originalName = fullNameInput?.value || "";
});

if (dpInput) {
  dpInput.addEventListener("change", () => {
    const file = dpInput.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      dpInput.value = "";
      if (selectedFileName) selectedFileName.textContent = "No new photo selected";
      setMessage("Please choose a JPG, PNG, or WEBP image.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      dpInput.value = "";
      if (selectedFileName) selectedFileName.textContent = "No new photo selected";
      setMessage("Please choose an image smaller than 5 MB.", "error");
      return;
    }

    if (objectPreviewUrl) URL.revokeObjectURL(objectPreviewUrl);
    objectPreviewUrl = URL.createObjectURL(file);
    if (dpPreview) dpPreview.src = objectPreviewUrl;
    if (selectedFileName) selectedFileName.textContent = file.name;
    setMessage("Photo preview ready. Save changes to upload it.", "info");
  });
}

if (profileForm) {
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = auth.currentUser || currentUser;
    if (!user) {
      setMessage("Please sign in again before updating your profile.", "error");
      return;
    }

    const newName = fullNameInput.value.trim();
    const dpFile = dpInput.files?.[0];
    if (!newName) {
      setMessage("Please enter your full name.", "error");
      fullNameInput.focus();
      return;
    }

    let photoURL = user.photoURL || "";
    saveProfileBtn.disabled = true;
    saveProfileBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    setMessage("Saving your profile...", "info");

    try {
      if (dpFile) {
        const extension = dpFile.type === "image/png" ? "png" : dpFile.type === "image/webp" ? "webp" : "jpg";
        const photoRef = ref(storage, `user-dps/${user.uid}.${extension}`);
        const uploadTask = uploadBytesResumable(photoRef, dpFile, { contentType: dpFile.type });
        if (uploadProgress) {
          uploadProgress.style.display = "block";
          uploadProgress.value = 0;
        }

        photoURL = await new Promise((resolve, reject) => {
          uploadTask.on("state_changed",
            (snapshot) => {
              const percent = snapshot.totalBytes ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 : 0;
              if (uploadProgress) uploadProgress.value = percent;
            },
            reject,
            async () => {
              try { resolve(await getDownloadURL(uploadTask.snapshot.ref)); }
              catch (error) { reject(error); }
            }
          );
        });
      }

      await updateProfile(user, { displayName: newName, photoURL: photoURL || null });
      // Refresh the current Firebase user reference after updateProfile.
      currentUser = auth.currentUser || user;
      renderUser(currentUser);
      await updateUserInSheet(user.uid, user.email || "", newName, photoURL);

      originalName = newName;
      if (dpInput) dpInput.value = "";
      if (selectedFileName) selectedFileName.textContent = "No new photo selected";
      if (objectPreviewUrl) {
        URL.revokeObjectURL(objectPreviewUrl);
        objectPreviewUrl = null;
      }
      setMessage("Your profile has been updated successfully.", "success");
    } catch (error) {
      console.error("Profile update failed:", error);
      const detail = error?.code === "storage/unauthorized"
        ? "Photo upload was denied. Check your Firebase Storage rules."
        : "We couldn't update your profile. Please try again.";
      setMessage(detail, "error");
    } finally {
      if (uploadProgress) {
        uploadProgress.style.display = "none";
        uploadProgress.value = 0;
      }
      if (saveProfileBtn) {
        saveProfileBtn.disabled = false;
        saveProfileBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save changes';
      }
    }
  });
}

if (resetProfileBtn) {
  resetProfileBtn.addEventListener("click", () => {
    window.setTimeout(() => {
      if (fullNameInput) fullNameInput.value = originalName;
      if (dpInput) dpInput.value = "";
      if (selectedFileName) selectedFileName.textContent = "No new photo selected";
      if (objectPreviewUrl) {
        URL.revokeObjectURL(objectPreviewUrl);
        objectPreviewUrl = null;
      }
      const user = auth.currentUser || currentUser;
      setPhoto(user?.photoURL || DEFAULT_PHOTO);
      setMessage("");
    }, 0);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    try {
      await signOut(auth);
      window.location.replace("auth.html");
    } catch (error) {
      console.error("Logout failed:", error);
      setMessage("Unable to log out right now. Please try again.", "error");
      logoutBtn.disabled = false;
    }
  });
}

async function fetchUserFromSheet(uid) {
  try {
    const response = await fetch(`${SHEET_ENDPOINT}?uid=${encodeURIComponent(uid)}`);
    if (!response.ok) throw new Error(`Sheet request failed: ${response.status}`);
    const data = await response.json();
    return data && typeof data === "object" ? data : null;
  } catch (error) {
    console.warn("Could not fetch profile details from Google Sheets:", error);
    return null;
  }
}

async function updateUserInSheet(uid, email, fullName, photoURL) {
  try {
    const response = await fetch(SHEET_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ uid, email, fullName, photoURL, action: "update" })
    });
    // Apps Script deployments may return a response that is not JSON.
    const responseText = await response.text();
    try { return JSON.parse(responseText); }
    catch { return { success: response.ok, message: responseText }; }
  } catch (error) {
    console.warn("Profile saved to Firebase, but Google Sheets update may have failed:", error);
    return null;
  }
}
