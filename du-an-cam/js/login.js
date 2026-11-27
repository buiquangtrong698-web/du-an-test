document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const error = document.getElementById("loginError");
  error.textContent = "";
  try {
    const session = await window.SteamCamAPI.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: String(form.get("username")).trim(),
        password: String(form.get("password"))
      })
    });
    window.SteamCamAPI.saveSession(session);
    window.location.href = "trang_chu.html";
  } catch (requestError) {
    error.textContent = requestError.message;
  }
});
