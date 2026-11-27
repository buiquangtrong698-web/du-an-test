const notificationList = document.getElementById("notificationList");
const notificationEmpty = document.getElementById("notificationEmpty");
const notificationEmptyTitle = notificationEmpty.querySelector("h3");
const notificationEmptyMessage = notificationEmpty.querySelector("p");
const notificationCount = document.getElementById("notificationCount");
const allNotificationsFilter = document.getElementById("allNotificationsFilter");
const unreadNotificationsFilter = document.getElementById("unreadNotificationsFilter");
const allNotificationCount = document.getElementById("allNotificationCount");
const unreadNotificationCount = document.getElementById("unreadNotificationCount");
const markAllNotificationsRead = document.getElementById("markAllNotificationsRead");
const notificationActionStatus = document.getElementById("notificationActionStatus");
const notificationDetailModal = document.getElementById("notificationDetailModal");
const notificationDetailIcon = document.getElementById("notificationDetailIcon");
const notificationDetailType = document.getElementById("notificationDetailType");
const notificationDetailTitle = document.getElementById("notificationDetailTitle");
const notificationDetailMessage = document.getElementById("notificationDetailMessage");
const notificationDetailTime = document.getElementById("notificationDetailTime");
let notificationDetailTrigger = null;
let activeNotificationFilter = "all";

const notificationTypes = {
  member: {
    label: "Thành viên",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
  },
  rule: {
    label: "Quy định",
    icon: "M7 3h10a2 2 0 0 1 2 2v16l-7-3-7 3V5a2 2 0 0 1 2-2Zm2 5h6M9 12h6"
  },
  event: {
    label: "Sự kiện",
    icon: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z"
  }
};

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function openNotificationDetails(notification, trigger) {
  const date = new Date(notification.createdAt);
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  iconPath.setAttribute("d", notificationTypes[notification.type].icon);
  icon.append(iconPath);
  notificationDetailIcon.replaceChildren(icon);
  notificationDetailType.textContent = notificationTypes[notification.type].label;
  notificationDetailTitle.textContent = notification.title;
  notificationDetailMessage.textContent = notification.message;
  notificationDetailTime.dateTime = notification.createdAt;
  notificationDetailTime.textContent = date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  notificationDetailTrigger = trigger;
  notificationDetailModal.classList.add("open");
  notificationDetailModal.setAttribute("aria-hidden", "false");
  document.getElementById("closeNotificationDetail").focus();
}

function closeNotificationDetails() {
  notificationDetailModal.classList.remove("open");
  notificationDetailModal.setAttribute("aria-hidden", "true");
  if (notificationDetailTrigger && notificationDetailTrigger.isConnected) {
    notificationDetailTrigger.focus();
  }
}

function createNotificationItem(notification) {
  const item = createElement("article", "notification-item");
  if (!notification.read) item.classList.add("unread");
  item.dataset.type = notification.type;
  item.tabIndex = 0;
  item.setAttribute("role", "button");
  item.setAttribute("aria-label", `Xem chi tiết thông báo: ${notification.title}`);
  item.addEventListener("click", () => openNotificationDetails(notification, item));
  item.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openNotificationDetails(notification, item);
    }
  });

  const icon = createElement("div", "notification-icon");
  icon.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", notificationTypes[notification.type].icon);
  svg.append(path);
  icon.append(svg);

  const content = createElement("div", "notification-content");
  const contentHeading = createElement("div", "notification-content-heading");
  contentHeading.append(createElement("span", "notification-type", notificationTypes[notification.type].label));
  if (!notification.read) {
    contentHeading.append(createElement("span", "notification-unread-label", "Chưa đọc"));
  }
  content.append(
    contentHeading,
    createElement("h3", "", notification.title),
    createElement("p", "", notification.message)
  );

  const meta = createElement("div", "notification-meta");
  const time = createElement("time", "", new Date(notification.createdAt).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }));
  time.dateTime = notification.createdAt;
  meta.append(time, createElement("span", "notification-open-label", "Xem chi tiết"));

  item.append(icon, content, meta);
  return item;
}

async function renderNotifications() {
  let notifications;
  try {
    notifications = await window.SteamCamNotifications.getAll();
  } catch (error) {
    console.error("Không thể hiển thị danh sách thông báo.", error);
    notificationList.replaceChildren();
    notificationCount.hidden = true;
    allNotificationCount.textContent = "0";
    unreadNotificationCount.textContent = "0";
    markAllNotificationsRead.disabled = true;
    notificationEmpty.hidden = false;
    notificationEmptyTitle.textContent = "Không thể tải thông báo";
    notificationEmptyMessage.textContent = "Hãy tải lại trang để thử lại.";
    return;
  }

  const unreadNotifications = notifications.filter(notification => !notification.read);
  const visibleNotifications = activeNotificationFilter === "unread"
    ? unreadNotifications
    : notifications;

  allNotificationCount.textContent = String(notifications.length);
  unreadNotificationCount.textContent = String(unreadNotifications.length);
  markAllNotificationsRead.disabled = unreadNotifications.length === 0;
  notificationList.replaceChildren(...visibleNotifications.map(createNotificationItem));
  notificationCount.textContent = `${notifications.length} thông báo`;
  notificationCount.hidden = notifications.length === 0;
  notificationEmpty.hidden = visibleNotifications.length > 0;
  if (notifications.length === 0) {
    notificationEmptyTitle.textContent = "Chưa có thông báo";
    notificationEmptyMessage.textContent = "Thông báo mới sẽ xuất hiện tại đây.";
  } else if (activeNotificationFilter === "unread") {
    notificationEmptyTitle.textContent = "Bạn đã đọc hết";
    notificationEmptyMessage.textContent = "Hiện không còn thông báo chưa đọc.";
  } else {
    notificationEmptyTitle.textContent = "Chưa có thông báo";
    notificationEmptyMessage.textContent = "Thông báo mới sẽ xuất hiện tại đây.";
  }
}

function setNotificationFilter(filter) {
  activeNotificationFilter = filter;
  const showAll = filter === "all";
  allNotificationsFilter.classList.toggle("is-active", showAll);
  allNotificationsFilter.setAttribute("aria-pressed", String(showAll));
  unreadNotificationsFilter.classList.toggle("is-active", !showAll);
  unreadNotificationsFilter.setAttribute("aria-pressed", String(!showAll));
  notificationActionStatus.textContent = "";
  renderNotifications();
}

renderNotifications();

allNotificationsFilter.addEventListener("click", () => setNotificationFilter("all"));
unreadNotificationsFilter.addEventListener("click", () => setNotificationFilter("unread"));
markAllNotificationsRead.addEventListener("click", async () => {
  notificationActionStatus.textContent = "";
  try {
    await window.SteamCamNotifications.markAllRead();
  } catch (error) {
    console.error("Không thể đánh dấu thông báo đã đọc.", error);
    notificationActionStatus.textContent = "Không thể đánh dấu đã đọc. Vui lòng thử lại.";
    return;
  }
  notificationActionStatus.textContent = "Đã đánh dấu tất cả là đã đọc.";
  renderNotifications();
});

document.getElementById("closeNotificationDetail").addEventListener("click", closeNotificationDetails);
document.getElementById("dismissNotificationDetail").addEventListener("click", closeNotificationDetails);
notificationDetailModal.addEventListener("click", event => {
  if (event.target === notificationDetailModal) closeNotificationDetails();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && notificationDetailModal.classList.contains("open")) {
    closeNotificationDetails();
  }
});

window.addEventListener("focus", renderNotifications);
