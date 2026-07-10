// Portão de idade bloqueante. Sem isso, o resto não importa.
(function () {
  const STORAGE_KEY = "vippods_age_confirmed";
  const dialog = document.getElementById("age-gate");
  const yesBtn = document.getElementById("age-gate-yes");
  const noBtn = document.getElementById("age-gate-no");
  if (!dialog) return;

  if (localStorage.getItem(STORAGE_KEY) === "1") return;

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  });

  yesBtn.addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    dialog.close ? dialog.close() : dialog.removeAttribute("open");
  });

  noBtn.addEventListener("click", () => {
    window.location.href = "https://www.google.com";
  });
})();
