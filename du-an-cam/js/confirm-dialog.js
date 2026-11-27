function askForConfirmation({ title, message, confirmLabel = "Xác nhận" }) {
  return new Promise(resolve => {
    if (typeof HTMLDialogElement === "undefined" || !HTMLDialogElement.prototype.showModal) {
      resolve(window.confirm(message));
      return;
    }

    const dialog = document.createElement("dialog");
    dialog.className = "confirm-dialog";
    dialog.setAttribute("aria-labelledby", "confirmDialogTitle");
    dialog.setAttribute("aria-describedby", "confirmDialogMessage");

    const panel = document.createElement("div");
    panel.className = "confirm-dialog-panel";

    const icon = document.createElement("span");
    icon.className = "confirm-dialog-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "!";

    const heading = document.createElement("h2");
    heading.className = "confirm-dialog-title";
    heading.id = "confirmDialogTitle";
    heading.textContent = title;

    const description = document.createElement("p");
    description.className = "confirm-dialog-message";
    description.id = "confirmDialogMessage";
    description.textContent = message;

    const actions = document.createElement("div");
    actions.className = "confirm-dialog-actions";

    const cancelButton = document.createElement("button");
    cancelButton.className = "confirm-dialog-cancel";
    cancelButton.type = "button";
    cancelButton.textContent = "Hủy";

    const confirmButton = document.createElement("button");
    confirmButton.className = "confirm-dialog-confirm";
    confirmButton.type = "button";
    confirmButton.textContent = confirmLabel;

    actions.append(cancelButton, confirmButton);
    panel.append(icon, heading, description, actions);
    dialog.append(panel);

    let settled = false;
    const finish = confirmed => {
      if (settled) return;
      settled = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(confirmed);
    };

    cancelButton.addEventListener("click", () => finish(false));
    confirmButton.addEventListener("click", () => finish(true));
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      finish(false);
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog) finish(false);
    });

    document.body.append(dialog);
    dialog.showModal();
    cancelButton.focus();
  });
}

window.SteamCamConfirm = { ask: askForConfirmation };
