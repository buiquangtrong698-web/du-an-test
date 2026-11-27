const pageTitles = {
  home: "Trang chủ",
  rules: "Quy định",
  members: "Thành viên",
  community: "Giao lưu",
  account: "Tài khoản"
};

let rules = [
  { id: 1, title: "Tôn trọng mọi thành viên", description: "Giao tiếp lịch sự, không công kích cá nhân, phân biệt vùng miền, giới tính hoặc tôn giáo." },
  { id: 2, title: "Không spam hoặc quảng cáo", description: "Không gửi tin nhắn trùng lặp, chèn link quảng cáo hoặc tự quảng bá khi chưa được phép." },
  { id: 3, title: "Chia sẻ nội dung phù hợp", description: "Đăng bài đúng chủ đề, ghi rõ nguồn khi trích dẫn và không chia sẻ thông tin vi phạm bản quyền." },
  { id: 4, title: "Bảo vệ thông tin cá nhân", description: "Không công khai số điện thoại, địa chỉ, tài khoản ngân hàng hoặc thông tin nhạy cảm của người khác." }
];

const members = [
  { name: "Trần Anh", username: "@trananh", role: "Nhà sáng tạo", image: 47, joined: "09/2025" },
  { name: "Hoàng Nam", username: "@hoangnam", role: "Trưởng nhóm", image: 11, joined: "08/2025" },
  { name: "Lê Hà", username: "@leha", role: "Quản trị viên", image: 32, joined: "08/2025" },
  { name: "Phạm Đức", username: "@phamduc", role: "Thành viên", image: 13, joined: "10/2025" },
  { name: "Nguyễn Linh", username: "@nguyenlinh", role: "Thành viên", image: 44, joined: "10/2025" }
];

function navigateTo(page) {
  document.querySelectorAll(".page").forEach(section => section.classList.toggle("active", section.id === page));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.page === page));
  document.getElementById("pageTitle").textContent = pageTitles[page];
  document.querySelector(".sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(control => {
  control.addEventListener("click", event => {
    event.preventDefault();
    navigateTo(control.dataset.page);
  });
});

document.querySelector(".mobile-menu").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

function renderRules() {
  const list = document.getElementById("rulesList");
  list.innerHTML = rules.map((rule, index) => `
    <article class="rule-card">
      <div class="rule-number">${String(index + 1).padStart(2, "0")}</div>
      <div>
        <h3>${escapeHtml(rule.title)}</h3>
        <p>${escapeHtml(rule.description)}</p>
      </div>
      <div class="rule-actions">
        <button type="button" onclick="editRule(${rule.id})" aria-label="Sửa quy định">
          <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
        </button>
        <button type="button" onclick="deleteRule(${rule.id})" aria-label="Xóa quy định">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg>
        </button>
      </div>
    </article>
  `).join("");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

const modal = document.getElementById("ruleModal");
function openRuleModal(rule = null) {
  document.getElementById("modalTitle").textContent = rule ? "Sửa quy định" : "Thêm quy định";
  document.getElementById("ruleId").value = rule ? rule.id : "";
  document.getElementById("ruleTitle").value = rule ? rule.title : "";
  document.getElementById("ruleDescription").value = rule ? rule.description : "";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.getElementById("ruleTitle").focus();
}
function closeRuleModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.getElementById("ruleForm").reset();
}

document.getElementById("addRuleButton").addEventListener("click", () => openRuleModal());
document.getElementById("closeModal").addEventListener("click", closeRuleModal);
document.getElementById("cancelModal").addEventListener("click", closeRuleModal);
modal.addEventListener("click", event => { if (event.target === modal) closeRuleModal(); });

document.getElementById("ruleForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = document.getElementById("ruleId").value;
  const title = document.getElementById("ruleTitle").value.trim();
  const description = document.getElementById("ruleDescription").value.trim();
  if (!title || !description) return;
  if (id) {
    const rule = rules.find(item => item.id === Number(id));
    rule.title = title;
    rule.description = description;
    showToast("Đã cập nhật quy định");
  } else {
    rules.push({ id: Date.now(), title, description });
    showToast("Đã thêm quy định mới");
  }
  closeRuleModal();
  renderRules();
});

function editRule(id) {
  openRuleModal(rules.find(rule => rule.id === id));
}
function deleteRule(id) {
  if (!confirm("Bạn có chắc muốn xóa quy định này?")) return;
  rules = rules.filter(rule => rule.id !== id);
  renderRules();
  showToast("Đã xóa quy định");
}

function renderMembers(query = "") {
  const table = document.getElementById("memberTable");
  const filtered = members.filter(member =>
    member.name.toLowerCase().includes(query.toLowerCase()) ||
    member.username.toLowerCase().includes(query.toLowerCase())
  );
  table.innerHTML = filtered.map(member => `
    <div class="member-row">
      <img src="https://i.pravatar.cc/100?img=${member.image}" alt="${member.name}">
      <strong>${member.name}<br><span>${member.username}</span></strong>
      <span>Tham gia ${member.joined}</span>
      <span class="member-role">${member.role}</span>
      <button class="icon-button" aria-label="Xem thành viên"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
  `).join("") || `<div class="member-row"><strong>Không tìm thấy thành viên</strong></div>`;
}

document.getElementById("memberSearch").addEventListener("input", event => renderMembers(event.target.value));

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

document.getElementById("logoutButton").addEventListener("click", () => {
  if (confirm("Bạn có muốn đăng xuất khỏi tài khoản?")) showToast("Đã đăng xuất");
});

renderRules();
renderMembers();
