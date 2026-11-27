const registerForm = document.getElementById("registerForm");
const profileForm = document.getElementById("profileForm");
const registerPanel = document.getElementById("registerPanel");
const profilePanel = document.getElementById("profilePanel");
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");
let pendingUsername = "";
let uploadedAvatar = "";

registerForm.addEventListener("submit", event => {
  event.preventDefault();
  const password = document.getElementById("registerPassword").value;
  const confirmation = document.getElementById("confirmPassword").value;
  const error = document.getElementById("registerError");

  if (password !== confirmation) {
    error.textContent = "Mật khẩu nhập lại chưa khớp.";
    document.getElementById("confirmPassword").focus();
    return;
  }

  error.textContent = "";
  pendingUsername = document.getElementById("registerUsername").value.trim();
  registerPanel.hidden = true;
  profilePanel.hidden = false;
  document.getElementById("profileFullName").focus();
});

document.getElementById("backToRegister").addEventListener("click", () => {
  profilePanel.hidden = true;
  registerPanel.hidden = false;
  document.getElementById("registerUsername").focus();
});

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  const error = document.getElementById("profileError");
  uploadedAvatar = "";

  if (!file) {
    avatarPreview.src = window.SteamCamProfile.defaultAvatar;
    avatarPreview.alt = "Ảnh đại diện mặc định";
    error.textContent = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    avatarInput.value = "";
    avatarPreview.src = window.SteamCamProfile.defaultAvatar;
    avatarPreview.alt = "Ảnh đại diện mặc định";
    error.textContent = "Vui lòng chọn một tệp hình ảnh.";
    return;
  }

  if (file.size > 1572864) {
    avatarInput.value = "";
    avatarPreview.src = window.SteamCamProfile.defaultAvatar;
    avatarPreview.alt = "Ảnh đại diện mặc định";
    error.textContent = "Ảnh đại diện cần có dung lượng tối đa 1,5 MB.";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== "string") {
      error.textContent = "Không thể đọc ảnh này. Hãy thử chọn ảnh khác.";
      return;
    }
    uploadedAvatar = reader.result;
    avatarPreview.src = uploadedAvatar;
    avatarPreview.alt = "Ảnh đại diện xem trước";
    error.textContent = "";
  };
  reader.onerror = () => {
    avatarInput.value = "";
    avatarPreview.src = window.SteamCamProfile.defaultAvatar;
    avatarPreview.alt = "Ảnh đại diện mặc định";
    error.textContent = "Không thể đọc ảnh này. Hãy thử chọn ảnh khác.";
  };
  reader.readAsDataURL(file);
});

profileForm.addEventListener("submit", async event => {
  event.preventDefault();
  const error = document.getElementById("profileError");
  const selectedFile = avatarInput.files[0];

  if (selectedFile && !uploadedAvatar) {
    error.textContent = "Ảnh vẫn đang được tải. Vui lòng đợi một chút.";
    return;
  }

  const profile = {
    fullName: document.getElementById("profileFullName").value.trim(),
    nickname: document.getElementById("profileNickname").value.trim(),
    username: pendingUsername,
    avatar: uploadedAvatar || null
  };

  if (!profile.fullName || !profile.nickname || !profile.username) {
    error.textContent = "Vui lòng nhập họ tên và biệt danh.";
    return;
  }

  const submitButton = profileForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const session = await window.SteamCamAPI.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: profile.username,
        password: document.getElementById("registerPassword").value,
        full_name: profile.fullName,
        nickname: profile.nickname,
        avatar_url: profile.avatar,
        introduction: document.getElementById("profileIntroduction").value.trim() || null
      })
    });
    window.SteamCamAPI.saveSession(session);
  } catch (requestError) {
    error.textContent = requestError.message;
    submitButton.disabled = false;
    return;
  }

  window.location.href = "trang_chu.html";
});
