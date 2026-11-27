window.SteamCamAPI.request("/members/featured")
  .then(members => {
    const cards = [...document.querySelectorAll(".home-feature-card")];
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
      card.setAttribute("aria-label", `Thành viên nổi bật ${member.full_name}`);
    });
  })
  .catch(error => console.error("Không thể tải thành viên nổi bật.", error));
