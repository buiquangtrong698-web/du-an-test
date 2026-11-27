(function () {
  async function getAll() {
    const notifications = await window.SteamCamAPI.request("/notifications");
    return notifications.map(notification => ({
      id: String(notification.id),
      type: notification.notification_type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.created_at,
      read: notification.is_read
    }));
  }

  async function markAllRead() {
    await window.SteamCamAPI.request("/notifications/read-all", { method: "POST" });
    return true;
  }

  window.SteamCamNotifications = { getAll, markAllRead };
})();
