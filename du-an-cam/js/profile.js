(function () {
  const profileKey = window.SteamCamAPI.profileKey;
  const defaultAvatar = "../img/avatar-default.svg";

  function getProfile() {
    try {
      const stored = localStorage.getItem(profileKey);
      if (!stored) return null;

      const profile = JSON.parse(stored);
      if (!profile || typeof profile.fullName !== "string" ||
          typeof profile.nickname !== "string" || typeof profile.username !== "string") {
        throw new Error("Hồ sơ người dùng không đúng định dạng.");
      }
      if (typeof profile.role !== "string" || !profile.role.trim()) profile.role = "user";
      if (typeof profile.position !== "string" || !profile.position.trim()) {
        profile.position = "Thành viên";
      }
      if (typeof profile.introduction !== "string") profile.introduction = "";
      return profile;
    } catch (error) {
      console.error("Không thể đọc hồ sơ người dùng.", error);
      return null;
    }
  }

  function saveProfile(profile) {
    return window.SteamCamAPI.request("/auth/me", {
      method: "PATCH",
      body: JSON.stringify({
        full_name: profile.fullName,
        nickname: profile.nickname,
        avatar_url: profile.avatar === defaultAvatar ? null : profile.avatar,
        introduction: (profile.introduction || "").trim() || null
      })
    }).then(member => {
      const updatedProfile = window.SteamCamAPI.toProfile(member);
      localStorage.setItem(profileKey, JSON.stringify(updatedProfile));
      refresh(updatedProfile);
      return updatedProfile;
    });
  }

  function refresh(profile) {
    const role = profile && profile.role ? profile.role : "user";
    const position = profile && profile.position ? profile.position : "Thành viên";
    const roleLabel = window.SteamCamAPI.roleLabel(role);
    document.querySelectorAll(".sidebar-user").forEach(sidebarUser => {
      const avatar = sidebarUser.querySelector("img");
      if (avatar) {
        avatar.src = profile && profile.avatar ? profile.avatar : defaultAvatar;
        avatar.alt = profile ? `Ảnh đại diện ${profile.fullName}` : "Ảnh đại diện mặc định";
      }

      const name = sidebarUser.querySelector("strong");
      if (name && profile) name.textContent = profile.fullName;
      const sidebarRoleLabel = sidebarUser.querySelector("div span");
      if (sidebarRoleLabel) sidebarRoleLabel.textContent = roleLabel;
    });

    const profileCard = document.querySelector(".profile-card");
    if (profileCard) {
      const avatar = profileCard.querySelector("img");
      const name = profileCard.querySelector("h3");
      const nickname = profileCard.querySelector("p");
      const roleBadge = profileCard.querySelector(".role-badge");
      if (avatar) {
        avatar.src = profile && profile.avatar ? profile.avatar : defaultAvatar;
        avatar.alt = profile ? `Ảnh đại diện ${profile.fullName}` : "Ảnh đại diện mặc định";
      }
      if (name && profile) name.textContent = profile.fullName;
      if (nickname && profile) nickname.textContent = profile.nickname;
      if (roleBadge) roleBadge.textContent = position;
    }

    if (!profile) return;
    const fields = {
      fullName: profile.fullName,
      username: profile.username,
      nickname: profile.nickname,
      accountPosition: position,
      accountRole: roleLabel,
      email: profile.email,
      accountIntroduction: (profile.introduction || "").trim() || "Chưa có giới thiệu"
    };
    Object.keys(fields).forEach(id => {
      const field = document.getElementById(id);
      if (field && fields[id]) field.textContent = fields[id];
    });
  }

  window.SteamCamProfile = {
    get: getProfile,
    save: saveProfile,
    refresh: refresh,
    defaultAvatar: defaultAvatar
  };

  refresh(getProfile());
  if (localStorage.getItem(window.SteamCamAPI.tokenKey)) {
    window.SteamCamAPI.request("/auth/me")
      .then(member => {
        const profile = window.SteamCamAPI.toProfile(member);
        localStorage.setItem(profileKey, JSON.stringify(profile));
        refresh(profile);
      })
      .catch(error => {
        console.error("Không thể tải hồ sơ từ máy chủ.", error);
        if (error.message === "Vui lòng đăng nhập.") window.SteamCamAPI.clearSession();
      });
  }
})();
