(function () {
  const storageKey = "steamCam.notifications.v1";
  const types = ["member", "rule", "event"];

  function isNotification(value) {
    return value && typeof value.id === "string" &&
      types.includes(value.type) &&
      typeof value.title === "string" &&
      typeof value.message === "string" &&
      typeof value.createdAt === "string" &&
      Number.isFinite(Date.parse(value.createdAt)) &&
      typeof value.read === "boolean";
  }

  function getAll() {
    const stored = localStorage.getItem(storageKey);
    if (stored === null) return [];

    const notifications = JSON.parse(stored);
    if (!Array.isArray(notifications) || !notifications.every(isNotification)) {
      throw new Error("Dữ liệu thông báo không đúng định dạng.");
    }

    return notifications.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  function add(type, title, message) {
    if (!types.includes(type) || typeof title !== "string" || !title.trim() ||
        typeof message !== "string" || !message.trim()) {
      throw new TypeError("Thông tin thông báo không hợp lệ.");
    }

    try {
      const notifications = getAll();
      notifications.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        type: type,
        title: title.trim(),
        message: message.trim(),
        createdAt: new Date().toISOString(),
        read: false
      });
      localStorage.setItem(storageKey, JSON.stringify(notifications));
      return true;
    } catch (error) {
      console.error("Không thể lưu thông báo vào bộ nhớ trình duyệt.", error);
      return false;
    }
  }

  function markAllRead() {
    try {
      const notifications = getAll();
      let updated = false;
      notifications.forEach(notification => {
        if (!notification.read) {
          notification.read = true;
          updated = true;
        }
      });
      if (updated) localStorage.setItem(storageKey, JSON.stringify(notifications));
      return true;
    } catch (error) {
      console.error("Không thể đánh dấu thông báo đã đọc.", error);
      return false;
    }
  }

  window.SteamCamNotifications = {
    storageKey: storageKey,
    getAll: getAll,
    add: add,
    markAllRead: markAllRead
  };
})();
