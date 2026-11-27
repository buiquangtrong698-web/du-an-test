const rulesList = document.getElementById("rulesList");
const ruleModal = document.getElementById("ruleModal");
const ruleForm = document.getElementById("ruleForm");
let rules = [];
let isAdmin = false;

function showRuleToast(message) {
  let toast = document.getElementById("ruleToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "ruleToast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function renderRules() {
  rulesList.replaceChildren();
  rules.forEach((rule, index) => {
    const card = document.createElement("article");
    card.className = "rule-card";
    const number = document.createElement("div");
    number.className = "rule-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = rule.title;
    const content = document.createElement("p");
    content.textContent = rule.content;
    details.append(title, content);
    card.append(number, details);
    if (isAdmin) {
      const actions = document.createElement("div");
      actions.className = "rule-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Sửa";
      edit.addEventListener("click", () => openRuleModal(rule));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Xóa";
      remove.addEventListener("click", () => deleteRule(rule.id));
      actions.append(edit, remove);
      card.append(actions);
    }
    rulesList.append(card);
  });
}

async function loadRules() {
  try {
    isAdmin = await window.SteamCamAPI.isAdmin();
  } catch (error) {
    console.error("Không thể kiểm tra quyền quản trị.", error);
    isAdmin = false;
  }
  const addRuleButton = document.getElementById("addRuleButton");
  addRuleButton.hidden = !isAdmin;
  addRuleButton.style.display = isAdmin ? "" : "none";
  rules = await window.SteamCamAPI.request("/rules");
  renderRules();
}

function openRuleModal(rule = null) {
  document.getElementById("modalTitle").textContent = rule ? "Sửa quy định" : "Thêm quy định";
  document.getElementById("ruleId").value = rule ? rule.id : "";
  document.getElementById("ruleTitle").value = rule ? rule.title : "";
  document.getElementById("ruleDescription").value = rule ? rule.content : "";
  ruleModal.classList.add("open");
  ruleModal.setAttribute("aria-hidden", "false");
  document.getElementById("ruleTitle").focus();
}

function closeRuleModal() {
  ruleModal.classList.remove("open");
  ruleModal.setAttribute("aria-hidden", "true");
  ruleForm.reset();
}

document.getElementById("addRuleButton").addEventListener("click", () => openRuleModal());
document.getElementById("closeModal").addEventListener("click", closeRuleModal);
document.getElementById("cancelModal").addEventListener("click", closeRuleModal);
ruleModal.addEventListener("click", event => {
  if (event.target === ruleModal) closeRuleModal();
});
ruleForm.addEventListener("submit", async event => {
  event.preventDefault();
  const id = document.getElementById("ruleId").value;
  const payload = {
    title: document.getElementById("ruleTitle").value.trim(),
    content: document.getElementById("ruleDescription").value.trim()
  };
  try {
    await window.SteamCamAPI.request(id ? `/rules/${id}` : "/rules", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload)
    });
    closeRuleModal();
    await loadRules();
    showRuleToast(id ? "Đã cập nhật quy định." : "Đã thêm quy định mới.");
  } catch (error) {
    showRuleToast(error.message);
  }
});

async function deleteRule(id) {
  const message = "Quy định này sẽ bị xóa khỏi danh sách và không thể khôi phục.";
  const confirmed = window.SteamCamConfirm?.ask
    ? await window.SteamCamConfirm.ask({
        title: "Xóa quy định?",
        message,
        confirmLabel: "Xóa quy định"
      })
    : window.confirm(message);
  if (!confirmed) return;
  try {
    await window.SteamCamAPI.request(`/rules/${id}`, { method: "DELETE" });
    await loadRules();
    showRuleToast("Đã xóa quy định.");
  } catch (error) {
    showRuleToast(error.message);
  }
}

loadRules().catch(error => showRuleToast(`Không thể tải quy định: ${error.message}`));
