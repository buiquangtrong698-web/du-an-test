const memberModal = document.getElementById("memberModal");
const closeMemberModalButton = document.querySelector(".member-modal-close");
const memberInfoAvatar = document.getElementById("memberInfoAvatar");
const memberInfoName = document.getElementById("memberInfoName");
const memberInfoNickname = document.getElementById("memberInfoNickname");
const memberInfoRole = document.getElementById("memberInfoRole");
const memberInfoIntroduction = document.getElementById("memberInfoIntroduction");
let lastSelectedMember = null;

document.querySelectorAll(".member-row").forEach(memberButton => {
  memberButton.addEventListener("click", () => {
    lastSelectedMember = memberButton;
    memberInfoAvatar.src = memberButton.dataset.avatar;
    memberInfoAvatar.alt = "Ảnh đại diện " + memberButton.dataset.name;
    memberInfoName.textContent = memberButton.dataset.name;
    memberInfoNickname.textContent = memberButton.dataset.nickname;
    memberInfoRole.textContent = memberButton.dataset.role;
    memberInfoIntroduction.textContent = memberButton.dataset.introduction;
    memberModal.hidden = false;
    closeMemberModalButton.focus();
  });
});

function closeMemberModal() {
  memberModal.hidden = true;
  if (lastSelectedMember) lastSelectedMember.focus();
}

closeMemberModalButton.addEventListener("click", closeMemberModal);

memberModal.addEventListener("click", event => {
  if (event.target === memberModal) closeMemberModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !memberModal.hidden) closeMemberModal();
});
