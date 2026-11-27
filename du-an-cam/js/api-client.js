(function () {
  const tokenKey = "steamCam.accessToken.v1";
  const profileKey = "steamCam.userProfile.v1";

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem(tokenKey);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`/api${path}`, { ...options, headers });
    if (response.status === 204) return null;
    const body = await response.json();
    if (!response.ok) {
      const message = typeof body.detail === "string" ? body.detail : "Yêu cầu không thành công.";
      throw new Error(message);
    }
    return body;
  }

  async function isAdmin() {
    if (!localStorage.getItem(tokenKey)) return false;
    const member = await request("/auth/me");
    return member.role === "admin";
  }

  function toProfile(member) {
    return {
      id: member.id,
      fullName: member.full_name,
      nickname: member.nickname || "",
      username: member.username,
      role: member.role,
      position: member.position || "Thành viên",
      avatar: member.avatar_url || window.SteamCamProfile?.defaultAvatar || "../img/avatar-default.svg",
      email: member.email || "",
      introduction: member.introduction || ""
    };
  }

  function roleLabel(role) {
    if (role === "admin") return "Quản trị viên";
    if (role === "user" || !role) return "Thành viên";
    return role;
  }

  function saveSession(session) {
    localStorage.setItem(tokenKey, session.access_token);
    localStorage.setItem(profileKey, JSON.stringify(toProfile(session.member)));
  }

  function clearSession() {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(profileKey);
  }

  window.SteamCamAPI = {
    request, isAdmin, saveSession, clearSession, toProfile, roleLabel, tokenKey, profileKey
  };
})();
