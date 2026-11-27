const eventList = document.getElementById("eventList");
const eventModal = document.getElementById("eventModal");
const eventForm = document.getElementById("eventForm");
const eventSearch = document.getElementById("eventSearch");
const toast = document.getElementById("eventToast");
let events = [];
let registeredEventIds = new Set();
let activeFilter = "upcoming";
const DEFAULT_EVENT_CAPACITY = 30;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function toEventView(event) {
  const startsAt = new Date(event.starts_at);
  return {
    ...event,
    date: `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, "0")}-${String(startsAt.getDate()).padStart(2, "0")}`,
    time: `${String(startsAt.getHours()).padStart(2, "0")}:${String(startsAt.getMinutes()).padStart(2, "0")}`,
    attendeeCount: event.attendee_count
  };
}

async function loadEvents() {
  const response = await window.SteamCamAPI.request("/events");
  events = response.map(toEventView);
  registeredEventIds = new Set(response.filter(event => event.is_registered).map(event => event.id));
  renderEvents();
}

async function applyEventPermissions() {
  const addEventButton = document.getElementById("addEventButton");
  try {
    const isAdmin = await window.SteamCamAPI.isAdmin();
    addEventButton.hidden = !isAdmin;
    addEventButton.style.display = isAdmin ? "" : "none";
  } catch (error) {
    console.error("Không thể kiểm tra quyền quản trị.", error);
    addEventButton.hidden = true;
    addEventButton.style.display = "none";
  }
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
  dateBadge.setAttribute("aria-label", date.toLocaleDateString("vi-VN"));
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
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  details.append(
    createDetail("M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z", `${formattedDate} · ${event.time}`),
    createDetail("M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0ZM12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", event.location)
  );

  const footer = createElement("div", "event-card-footer");
  const attendance = createElement("span", "event-attendance");
  attendance.append(createElement("strong", "", `${event.attendeeCount}/${event.capacity}`), document.createTextNode(" chỗ đã đăng ký"));
  const button = createElement("button", "event-action");
  button.type = "button";
  button.dataset.eventId = event.id;
  const registered = registeredEventIds.has(event.id);
  if (registered) {
    button.textContent = "Đã đăng ký · Hủy";
    button.classList.add("registered");
    button.setAttribute("aria-label", `Hủy đăng ký sự kiện ${event.title}`);
  } else if (event.attendeeCount >= event.capacity) {
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

function renderStats() {
  document.getElementById("upcomingCount").textContent = String(events.filter(isUpcoming).length);
}

function renderEvents() {
  const query = eventSearch.value.trim().toLocaleLowerCase("vi");
  const visibleEvents = events.filter(event => {
    const upcoming = isUpcoming(event);
    if (activeFilter === "upcoming" && !upcoming) return false;
    if (activeFilter === "past" && upcoming) return false;
    return `${event.title} ${event.description} ${event.location}`.toLocaleLowerCase("vi").includes(query);
  });
  eventList.replaceChildren();
  if (visibleEvents.length === 0) {
    const empty = createElement("div", "event-empty");
    const title = events.length === 0
      ? activeFilter === "past" ? "Chưa có sự kiện nào đã kết thúc" : "Chưa có sự kiện nào"
      : activeFilter === "past" ? "Chưa có sự kiện nào đã kết thúc" : "Không tìm thấy sự kiện phù hợp";
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

async function toggleRegistration(eventId) {
  const event = events.find(item => item.id === eventId);
  if (!event) return;
  if (registeredEventIds.has(eventId)) {
    const message = `Bạn có chắc muốn hủy đăng ký sự kiện "${event.title}" không?`;
    const confirmed = window.SteamCamConfirm?.ask
      ? await window.SteamCamConfirm.ask({
        title: "Hủy đăng ký sự kiện?",
        message,
        confirmLabel: "Hủy đăng ký"
      })
      : window.confirm(message);
    if (!confirmed) return;
  }
  try {
    if (registeredEventIds.has(eventId)) {
      await window.SteamCamAPI.request(`/events/${eventId}/registrations`, { method: "DELETE" });
      showToast("Đã hủy đăng ký sự kiện.");
    } else {
      await window.SteamCamAPI.request(`/events/${eventId}/registrations`, { method: "POST" });
      showToast("Đăng ký tham gia sự kiện thành công!");
    }
    await loadEvents();
  } catch (error) {
    showToast(error.message);
  }
}

function openEventModal() {
  eventForm.reset();
  const today = new Date();
  document.getElementById("eventDate").min =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
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
  if (button) toggleRegistration(Number(button.dataset.eventId));
});
eventForm.addEventListener("submit", async event => {
  event.preventDefault();
  const data = new FormData(eventForm);
  const startsAt = `${data.get("date")}T${data.get("time")}:00`;
  try {
    await window.SteamCamAPI.request("/events", {
      method: "POST",
      body: JSON.stringify({
        title: String(data.get("title")).trim(),
        description: String(data.get("description")).trim(),
        category: String(data.get("category")).trim(),
        starts_at: startsAt,
        location: String(data.get("location")).trim(),
        capacity: DEFAULT_EVENT_CAPACITY
      })
    });
    closeEventModal();
    setActiveFilter("upcoming");
    await loadEvents();
    showToast("Đã tạo sự kiện mới.");
  } catch (error) {
    showToast(error.message);
  }
});

applyEventPermissions();
loadEvents().catch(error => showToast(`Không thể tải sự kiện: ${error.message}`));
