(function () {
  "use strict";

  const body = document.body;
  const root = document.documentElement;
  const cyberRoot = document.getElementById("cyber-root");
  const title = document.querySelector(".glitch-title");
  const joinBtn = document.getElementById("join-btn");
  const declineBtn = document.getElementById("decline-btn");
  const toast = document.getElementById("cyber-toast");
  const timeSyncText = document.getElementById("time-sync-text");
  const countdownText = document.getElementById("countdown-text");
  const revealPanels = document.querySelectorAll(".reveal-panel");

  let toastTimer = null;

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 1900);
  }

  function pulseGlitchOffset() {
    const x = (Math.random() * 8 - 4).toFixed(1) + "px";
    const y = (Math.random() * 6 - 3).toFixed(1) + "px";
    root.style.setProperty("--glitch-x", x);
    root.style.setProperty("--glitch-y", y);

    if (title && Math.random() > 0.86) {
      title.style.opacity = "0.78";
      setTimeout(function () {
        title.style.opacity = "1";
      }, 48);
    }

    if (cyberRoot && Math.random() > 0.9) {
      cyberRoot.style.filter = "brightness(1.14)";
      setTimeout(function () {
        cyberRoot.style.filter = "";
      }, 44);
    }
  }

  function setPressed(button, pressed) {
    if (!button) return;
    if (pressed) {
      button.classList.add("is-pressed");
    } else {
      button.classList.remove("is-pressed");
    }
  }

  function updateTimeSync() {
    if (!timeSyncText) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    timeSyncText.textContent = "2026.05.31 // 19:00:00 :: " + hh + ":" + mm + ":" + ss + "." + ms;
  }

  function updateCountdown() {
    if (!countdownText) return;

    const target = new Date("2026-05-31T19:00:00+08:00").getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      countdownText.textContent = "LIVE NOW // BOARDING OPEN";
      return;
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const hourMs = 60 * 60 * 1000;
    const minuteMs = 60 * 1000;

    const days = Math.floor(diff / dayMs);
    const hours = Math.floor((diff % dayMs) / hourMs);
    const minutes = Math.floor((diff % hourMs) / minuteMs);

    countdownText.textContent = days + "D " + String(hours).padStart(2, "0") + "H " + String(minutes).padStart(2, "0") + "M";
  }

  revealPanels.forEach(function (panel, index) {
    panel.style.transitionDelay = String(80 + index * 70) + "ms";
  });

  if (joinBtn) {
    joinBtn.addEventListener("pointerdown", function () {
      setPressed(joinBtn, true);
    });
    joinBtn.addEventListener("pointerup", function () {
      setPressed(joinBtn, false);
    });
    joinBtn.addEventListener("pointercancel", function () {
      setPressed(joinBtn, false);
    });
    joinBtn.addEventListener("pointerleave", function () {
      setPressed(joinBtn, false);
    });

    joinBtn.addEventListener("click", function () {
      showToast("已接入网络 // 5月31日 19:00 外滩游艇见");
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener("pointerdown", function () {
      setPressed(declineBtn, true);
    });
    declineBtn.addEventListener("pointerup", function () {
      setPressed(declineBtn, false);
    });
    declineBtn.addEventListener("pointercancel", function () {
      setPressed(declineBtn, false);
    });
    declineBtn.addEventListener("pointerleave", function () {
      setPressed(declineBtn, false);
    });

    declineBtn.addEventListener("click", function () {
      showToast("协议已拒绝 // 如果改变主意，随时再接入");
    });
  }

  setTimeout(function () {
    body.classList.add("loaded");
  }, 80);

  updateTimeSync();
  updateCountdown();
  setInterval(updateTimeSync, 40);
  setInterval(updateCountdown, 30000);

  pulseGlitchOffset();
  setInterval(pulseGlitchOffset, 120);
})();
