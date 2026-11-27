const memberModal = document.getElementById("memberModal");
const closeMemberModalButton = document.querySelector(".member-modal-close");
const toggleFeaturedButton = document.getElementById("toggleFeaturedButton");
let lastSelectedMember = null;
let selectedMember = null;
let canManageFeatured = false;
let currentSearch = "";

const adminCheck = window.SteamCamAPI.isAdmin().catch(error => {
  console.error("Không thể kiểm tra quyền quản trị.", error);
  return false;
});

function renderFeaturedMembers(members) {
  const cards = [...document.querySelectorAll(".featured-card")];
  const leader = members.find(member => member.position === "Trưởng nhóm");
  const otherMembers = leader
    ? members.filter(member => member !== leader)
    : members;
  let otherMemberIndex = 0;
  const centerIndex = Math.floor(cards.length / 2);

  cards.forEach((card, index) => {
    const member = leader && index === centerIndex
      ? leader
      : otherMembers[otherMemberIndex++];
    card.classList.toggle("is-leader", member?.position === "Trưởng nhóm");
    card.hidden = !member;
    card.style.display = member ? "" : "none";
    if (!member) return;
    card.querySelector(".member-highlight-avatar").src =
      member.avatar_url || "../img/avatar-default.svg";
    card.querySelector(".member-highlight-name").textContent = member.full_name;
    card.querySelector(".member-highlight-nickname").textContent =
      member.nickname || "Chưa có biệt danh";
    card.querySelector(".member-highlight-role").textContent =
      `Chức vụ: ${member.position}`;
  });
}

async function loadMembers(query = "") {
  currentSearch = query;
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  const [members, featuredMembers, admin] = await Promise.all([
    window.SteamCamAPI.request(`/members?${params}`),
    window.SteamCamAPI.request("/members/featured"),
    adminCheck
  ]);
  canManageFeatured = admin;
  renderFeaturedMembers(featuredMembers);
  const list = document.querySelector(".member-list");
  list.replaceChildren();
  if (members.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Không tìm thấy thành viên.";
    list.append(empty);
    return;
  }
  members.forEach(member => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "member-row";
    button.dataset.memberId = String(member.id);
    button.dataset.isFeatured = String(member.is_featured);
    button.dataset.name = member.full_name;
    button.dataset.nickname = member.nickname || "Chưa có biệt danh";
    button.dataset.position = member.position;
    button.dataset.introduction = member.introduction || "Chưa có thông tin giới thiệu.";
    button.dataset.avatar = member.avatar_url || "../img/avatar-default.svg";
    const avatar = document.createElement("img");
    avatar.className = "member-row-avatar";
    avatar.src = button.dataset.avatar;
    avatar.alt = "";
    const name = document.createElement("strong");
    name.textContent = member.full_name;
    const arrow = document.createElement("span");
    arrow.className = "member-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";
    button.append(avatar, name, arrow);
    button.addEventListener("click", () => openMemberDetails(button));
    list.append(button);
  });
}

function openMemberDetails(button) {
  lastSelectedMember = button;
  selectedMember = {
    id: Number(button.dataset.memberId),
    isFeatured: button.dataset.isFeatured === "true",
    position: button.dataset.position
  };
  document.getElementById("memberInfoAvatar").src = button.dataset.avatar;
  document.getElementById("memberInfoAvatar").alt = `Ảnh đại diện ${button.dataset.name}`;
  document.getElementById("memberInfoName").textContent = button.dataset.name;
  document.getElementById("memberInfoNickname").textContent = button.dataset.nickname;
  document.getElementById("memberInfoPosition").textContent = button.dataset.position;
  document.getElementById("memberInfoIntroduction").textContent = button.dataset.introduction;
  document.getElementById("featuredActionStatus").textContent = "";
  document.getElementById("memberPositionStatus").textContent = "";
  document.getElementById("memberCurrentPosition").textContent = button.dataset.position;
  toggleFeaturedButton.hidden = !canManageFeatured;
  toggleFeaturedButton.style.display = canManageFeatured ? "" : "none";
  document.getElementById("memberPositionEditor").hidden = !canManageFeatured;
  document.getElementById("memberPositionSelect").value = selectedMember.position;
  document.getElementById("saveMemberPositionButton").disabled = true;
  toggleFeaturedButton.textContent = selectedMember.isFeatured
    ? "Gỡ khỏi thành viên nổi bật"
    : "Đưa lên thành viên nổi bật";
  memberModal.hidden = false;
  (canManageFeatured ? toggleFeaturedButton : closeMemberModalButton).focus();
}

document.getElementById("memberPositionSelect").addEventListener("change", event => {
  document.getElementById("saveMemberPositionButton").disabled =
    !selectedMember || event.target.value === selectedMember.position;
});

document.getElementById("saveMemberPositionButton").addEventListener("click", async () => {
  if (!canManageFeatured || !selectedMember) return;
  const saveButton = document.getElementById("saveMemberPositionButton");
  const status = document.getElementById("memberPositionStatus");
  saveButton.disabled = true;
  let member;
  try {
    member = await window.SteamCamAPI.request(
      `/admin/members/${selectedMember.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          position: document.getElementById("memberPositionSelect").value
        })
      }
    );
  } catch (error) {
    status.textContent = error.message;
    saveButton.disabled = false;
    return;
  }

  selectedMember.position = member.position;
  if (lastSelectedMember && lastSelectedMember.isConnected) {
    lastSelectedMember.dataset.position = member.position;
  }
  document.getElementById("memberInfoPosition").textContent = member.position;
  document.getElementById("memberCurrentPosition").textContent = member.position;
  status.textContent = `Đã cập nhật chức vụ thành ${member.position}.`;
  await loadMembers(currentSearch).catch(error => {
    console.error("Không thể làm mới danh sách thành viên sau khi cập nhật chức vụ.", error);
    status.textContent = "Đã cập nhật chức vụ nhưng không thể làm mới danh sách.";
  });
});

function closeMemberModal() {
  memberModal.hidden = true;
  if (lastSelectedMember && lastSelectedMember.isConnected) lastSelectedMember.focus();
}

toggleFeaturedButton.addEventListener("click", async () => {
  if (!canManageFeatured || !selectedMember) return;
  const nextFeatured = !selectedMember.isFeatured;
  if (!nextFeatured) {
    const message = `Bạn có chắc muốn gỡ ${lastSelectedMember.dataset.name} khỏi danh sách thành viên nổi bật không?`;
    const confirmed = window.SteamCamConfirm?.ask
      ? await window.SteamCamConfirm.ask({
        title: "Gỡ thành viên nổi bật?",
        message,
        confirmLabel: "Gỡ khỏi danh sách"
      })
      : window.confirm(message);
    if (!confirmed) return;
  }
  const status = document.getElementById("featuredActionStatus");
  toggleFeaturedButton.disabled = true;
  try {
    const member = await window.SteamCamAPI.request(
      `/admin/members/${selectedMember.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_featured: nextFeatured })
      }
    );
    selectedMember.isFeatured = member.is_featured;
    if (lastSelectedMember && lastSelectedMember.isConnected) {
      lastSelectedMember.dataset.isFeatured = String(member.is_featured);
    }
    toggleFeaturedButton.textContent = member.is_featured
      ? "Gỡ khỏi thành viên nổi bật"
      : "Đưa lên thành viên nổi bật";
    status.textContent = member.is_featured
      ? "Đã thêm vào danh sách thành viên nổi bật."
      : "Đã gỡ khỏi danh sách thành viên nổi bật.";
    await loadMembers(currentSearch);
  } catch (error) {
    status.textContent = error.message;
  } finally {
    toggleFeaturedButton.disabled = false;
  }
});

document.querySelector(".member-search input").addEventListener("input", event => {
  loadMembers(event.target.value).catch(error => console.error("Không thể tìm thành viên.", error));
});
closeMemberModalButton.addEventListener("click", closeMemberModal);
memberModal.addEventListener("click", event => {
  if (event.target === memberModal) closeMemberModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !memberModal.hidden) closeMemberModal();
});

loadMembers().catch(error => console.error("Không thể tải danh sách thành viên.", error));
