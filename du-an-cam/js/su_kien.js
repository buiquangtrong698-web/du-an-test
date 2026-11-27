const EVENT_STORAGE_KEY = "steamCam.events.v1";
const REGISTRATION_STORAGE_KEY = "steamCam.eventRegistrations.v1";
const EVENT_RESET_KEY = "steamCam.events.reset.v1";
const eventList = document.getElementById("eventList");
const eventModal = document.getElementById("eventModal");
const eventForm = document.getElementById("eventForm");
const eventSearch = document.getElementById("eventSearch");
const toast = document.getElementById("eventToast");

function localDateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateTimeAfter(minutes) {
  const date = new Date(Date.now() + minutes * 60 * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`
  };
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function readStorage(key, fallback, isValid, label) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    const parsed = JSON.parse(stored);
    if (!isValid(parsed)) throw new Error("Dữ liệu không đúng định dạng.");
    return parsed;
  } catch (error) {
    console.error(`Không thể đọc ${label} từ bộ nhớ trình duyệt.`, error);
    showToast(`Không đọc được ${label} đã lưu; đang dùng dữ liệu mặc định.`);
    return fallback;
  }
}

function saveStorage(key, value, label) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Không thể lưu ${label} vào bộ nhớ trình duyệt.`, error);
    showToast(`Không thể lưu ${label}. Hãy kiểm tra dung lượng trình duyệt.`);
    return false;
  }
}

function isValidEvent(event) {
  return event && typeof event.id === "string" &&
    typeof event.title === "string" && typeof event.description === "string" &&
    ["Học tập", "Giao lưu", "Workshop"].includes(event.category) &&
    /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
    /^\d{2}:\d{2}$/.test(event.time) &&
    typeof event.location === "string" &&
    Number.isInteger(event.capacity) && event.capacity > 0 &&
    Number.isInteger(event.attendeeCount) && event.attendeeCount >= 0;
}

function clearPreviousEvents() {
  try {
    if (localStorage.getItem(EVENT_RESET_KEY) === "done") return false;
    localStorage.setItem(EVENT_STORAGE_KEY, "[]");
    localStorage.removeItem(REGISTRATION_STORAGE_KEY);
    localStorage.setItem(EVENT_RESET_KEY, "done");
    return true;
  } catch (error) {
    console.error("Không thể xóa dữ liệu sự kiện cũ khỏi bộ nhớ trình duyệt.", error);
    showToast("Không thể xóa sự kiện cũ khỏi bộ nhớ trình duyệt.");
    return true;
  }
}

const eventsWereReset = clearPreviousEvents();
let events = eventsWereReset ? [] : readStorage(EVENT_STORAGE_KEY, [], value =>
  Array.isArray(value) && value.every(isValidEvent), "sự kiện");
let registeredEventIds = eventsWereReset ? [] : readStorage(REGISTRATION_STORAGE_KEY, [], value =>
  Array.isArray(value) && value.every(id => typeof id === "string"), "đăng ký");
let activeFilter = "upcoming";
function persistEvents() {
  return saveStorage(EVENT_STORAGE_KEY, events, "danh sách sự kiện");
}

function persistRegistrations() {
  return saveStorage(REGISTRATION_STORAGE_KEY, registeredEventIds, "danh sách đăng ký");
}

function eventDateTime(event) {
  return new Date(`${event.date}T${event.time}:00`);
}

function isUpcoming(event) {
  return eventDateTime(event).getTime() >= Date.now();
}

function formatEventDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createDetail(iconPath, text) {
  const row = createElement("div", "event-detail");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", iconPath);
  icon.append(path);
  row.append(icon, createElement("span", "", text));
  return row;
}

function createEventCard(event) {
  const card = createElement("article", "event-card");
  const top = createElement("div", "event-card-top");
  const date = formatEventDate(event.date);
  const dateBadge = createElement("div", "event-date-badge");
  dateBadge.setAttribute("aria-label", date.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" }));
  dateBadge.append(
    createElement("span", "", String(date.getDate()).padStart(2, "0")),
    createElement("span", "", date.toLocaleDateString("vi-VN", { month: "short" }).replace(".", ""))
  );

  const heading = createElement("div", "event-card-heading");
  const tag = createElement("span", "event-tag", event.category);
  tag.dataset.category = event.category;
  heading.append(tag, createElement("h4", "", event.title));
  top.append(dateBadge, heading);

  const description = createElement("p", "event-card-description", event.description);
  const details = createElement("div", "event-details");
  const formattedDate = date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  details.append(
    createDetail("M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z", `${formattedDate} · ${event.time}`),
    createDetail("M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0ZM12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", event.location)
  );

  const footer = createElement("div", "event-card-footer");
  const attendance = createElement("span", "event-attendance");
  const attendanceCount = createElement("strong", "", `${event.attendeeCount}/${event.capacity}`);
  attendance.append(attendanceCount, document.createTextNode(" chỗ đã đăng ký"));

  const button = createElement("button", "event-action");
  button.type = "button";
  button.dataset.eventId = event.id;
  const registered = registeredEventIds.includes(event.id);
  const full = event.attendeeCount >= event.capacity && !registered;
  if (registered) {
    button.textContent = "Đã đăng ký · Hủy";
    button.classList.add("registered");
    button.setAttribute("aria-label", `Hủy đăng ký sự kiện ${event.title}`);
  } else if (full) {
    button.textContent = "Đã đủ chỗ";
    button.disabled = true;
  } else if (!isUpcoming(event)) {
    button.textContent = "Đã kết thúc";
    button.disabled = true;
  } else {
    button.textContent = "Đăng ký tham gia";
    button.setAttribute("aria-label", `Đăng ký tham gia sự kiện ${event.title}`);
  }
  footer.append(attendance, button);
  card.append(top, description, details, footer);
  return card;
}

function getVisibleEvents() {
  const query = eventSearch.value.trim().toLocaleLowerCase("vi");

  return events
    .filter(event => {
      const upcoming = isUpcoming(event);
      if (activeFilter === "upcoming" && !upcoming) return false;
      if (activeFilter === "past" && upcoming) return false;
      const searchableText = `${event.title} ${event.description} ${event.location}`.toLocaleLowerCase("vi");
      return searchableText.includes(query);
    })
    .sort((a, b) => eventDateTime(a) - eventDateTime(b));
}

function renderStats() {
  document.getElementById("upcomingCount").textContent = events.filter(isUpcoming).length;
}

function renderEvents() {
  const visibleEvents = getVisibleEvents();
  eventList.replaceChildren();

  if (visibleEvents.length === 0) {
    const empty = createElement("div", "event-empty");
    const title = events.length === 0
      ? activeFilter === "past"
        ? "Chưa có sự kiện nào đã kết thúc"
        : "Chưa có sự kiện nào"
      : activeFilter === "past"
        ? "Chưa có sự kiện nào đã kết thúc"
        : "Không tìm thấy sự kiện phù hợp";
    empty.append(
      createElement("strong", "", title),
      createElement("span", "", "Hãy đổi bộ lọc hoặc tạo một sự kiện mới cho cộng đồng.")
    );
    eventList.append(empty);
  } else {
    visibleEvents.forEach(event => eventList.append(createEventCard(event)));
  }

  renderStats();
}

function setActiveFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll(".event-tab").forEach(button => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderEvents();
}

function toggleRegistration(eventId) {
  const event = events.find(item => item.id === eventId);
  if (!event) {
    showToast("Không tìm thấy sự kiện này.");
    return;
  }

  const registered = registeredEventIds.includes(eventId);
  if (registered) {
    registeredEventIds = registeredEventIds.filter(id => id !== eventId);
    event.attendeeCount = Math.max(0, event.attendeeCount - 1);
    persistRegistrations();
    persistEvents();
    showToast("Đã hủy đăng ký sự kiện.");
  } else if (!isUpcoming(event)) {
    showToast("Sự kiện này đã kết thúc.");
  } else if (event.attendeeCount >= event.capacity) {
    showToast("Sự kiện đã đủ số lượng tham gia.");
  } else {
    registeredEventIds.push(eventId);
    event.attendeeCount += 1;
    persistRegistrations();
    persistEvents();
    showToast("Đăng ký tham gia sự kiện thành công!");
  }
  renderEvents();
}

function openEventModal() {
  eventForm.reset();
  const defaultDateTime = localDateTimeAfter(30);
  document.getElementById("eventDate").min = localDateAfter(0);
  document.getElementById("eventDate").value = defaultDateTime.date;
  document.getElementById("eventTime").value = defaultDateTime.time;
  document.getElementById("eventCapacity").value = "30";
  eventModal.classList.add("open");
  eventModal.setAttribute("aria-hidden", "false");
  document.getElementById("eventTitle").focus();
}

function closeEventModal() {
  eventModal.classList.remove("open");
  eventModal.setAttribute("aria-hidden", "true");
  eventForm.reset();
  document.getElementById("addEventButton").focus();
}

document.querySelector(".mobile-menu").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});
document.getElementById("addEventButton").addEventListener("click", openEventModal);
document.getElementById("closeEventModal").addEventListener("click", closeEventModal);
document.getElementById("cancelEvent").addEventListener("click", closeEventModal);
eventModal.addEventListener("click", event => {
  if (event.target === eventModal) closeEventModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && eventModal.classList.contains("open")) closeEventModal();
});
eventSearch.addEventListener("input", renderEvents);
document.querySelectorAll(".event-tab").forEach(button => {
  button.addEventListener("click", () => setActiveFilter(button.dataset.filter));
});
eventList.addEventListener("click", event => {
  const button = event.target.closest("[data-event-id]");
  if (button) toggleRegistration(button.dataset.eventId);
});
eventForm.addEventListener("submit", event => {
  event.preventDefault();

  const formData = new FormData(eventForm);
  const newEvent = {
    id: `event-${Date.now()}`,
    title: String(formData.get("title")).trim(),
    description: String(formData.get("description")).trim(),
    category: String(formData.get("category")),
    date: String(formData.get("date")),
    time: String(formData.get("time")),
    location: String(formData.get("location")).trim(),
    capacity: Number(formData.get("capacity")),
    attendeeCount: 0
  };

  if (!isValidEvent(newEvent) || !newEvent.title || !newEvent.description || !newEvent.location) {
    showToast("Kiểm tra lại thông tin sự kiện.");
    return;
  }
  if (eventDateTime(newEvent).getTime() <= Date.now()) {
    showToast("Vui lòng chọn thời gian trong tương lai.");
    return;
  }

  events.push(newEvent);
  if (!persistEvents()) {
    events = events.filter(item => item.id !== newEvent.id);
    renderEvents();
    return;
  }
  const notificationSaved = window.SteamCamNotifications.add(
    "event",
    "Sự kiện mới",
    `"${newEvent.title}" (${newEvent.category}) vừa được tạo.`
  );
  closeEventModal();
  setActiveFilter("upcoming");
  showToast(notificationSaved
    ? "Đã tạo sự kiện mới."
    : "Sự kiện đã tạo nhưng thông báo không lưu được.");
});

renderEvents();
