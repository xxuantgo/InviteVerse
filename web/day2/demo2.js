(function () {
  "use strict";

  const body = document.body;
  const root = document.documentElement;
  const cyberRoot = document.getElementById("cyber-root");
  const title = document.querySelector(".glitch-title");
  const joinBtn = document.getElementById("join-btn");
  const declineBtn = document.getElementById("decline-btn");
  const langToggle = document.getElementById("lang-toggle");
  const toast = document.getElementById("cyber-toast");
  const timeSyncText = document.getElementById("time-sync-text");
  const countdownText = document.getElementById("countdown-text");
  const revealPanels = document.querySelectorAll(".reveal-panel");
  const i18nNodes = document.querySelectorAll("[data-i18n]");

  const storageKey = "inviteverse_demo2_lang";
  const targetTime = new Date("2026-05-31T19:00:00+08:00").getTime();

  const localeText = {
    zh: {
      langToggle: "切换 EN",
      sysUpdate: "[SYS_UPDATE] CYBER BIRTHDAY PARTY",
      heroSubtitle: ">_ 协议覆盖：[Lucas] 迎来了他的 20 岁生日。",
      missionIntel: "MISSION INTEL",
      hostTitle: "主理人设定",
      hostCopy: "我是 Lucas，5 月 31 日是我 20 岁生日。想邀请我的朋友们一起登上外滩游艇，把这一晚过成真正的赛博生日局！",
      themeTitle: "主题动机",
      themeCopy: "我们都被《赛博朋克 2077》的世界深深吸引。最上头的就是“高科技与低生活”并存的冲突美学：霓虹、工业、噪声、夜景，和年轻人的荷尔蒙。",
      targetLabel: "目标 TARGET",
      targetValue: "20 岁生日派对",
      timeLabel: "时间 TIME_SYNC",
      coordLabel: "坐标 COORD",
      coordValue: "上海外滩码头 登陆游艇",
      boardingLabel: "登船 BOARDING",
      boardingValue: "18:30 码头集合，过时错过启航窗口",
      dressLabel: "装备要求 DRESS_CODE",
      dressValue: "赛博穿搭，怎么炫酷怎么来",
      countdownLabel: "倒计时 COUNTDOWN",
      countdownLoading: "同步中...",
      countdownLive: "正在进行 // 登船通道已开启",
      joinBtn: "[ 接入网络 // JACK IN ]",
      declineBtn: "[ 拒绝协议 // DECLINE ]",
      ctaNote: "登船时间 18:30 // 2026.05.31 // 外滩码头",
      toastJoin: "已接入网络 // 5月31日 19:00 外滩游艇见",
      toastDecline: "协议已拒绝 // 如果改变主意，随时再接入",
      timeSyncPrefix: "2026.05.31 // 19:00:00 :: "
    },
    en: {
      langToggle: "SWITCH 中文",
      sysUpdate: "[SYS_UPDATE] CYBER BIRTHDAY PARTY",
      heroSubtitle: ">_ PROTOCOL OVERRIDE: [Lucas] IS TURNING 20.",
      missionIntel: "MISSION INTEL",
      hostTitle: "HOST PROFILE",
      hostCopy: "I am Lucas. May 31 is my 20th birthday, and I want my friends to board a Bund yacht with me and turn this night into a true cyber birthday run.",
      themeTitle: "THEME DRIVE",
      themeCopy: "We are all obsessed with Cyberpunk 2077. The thrill comes from the clash of high tech and low life: neon, industry, noise, city nights, and pure youth energy.",
      targetLabel: "TARGET",
      targetValue: "20TH BIRTHDAY PARTY",
      timeLabel: "TIME_SYNC",
      coordLabel: "COORD",
      coordValue: "BUND PIER, SHANGHAI // BOARD THE YACHT",
      boardingLabel: "BOARDING",
      boardingValue: "18:30 PIER CHECK-IN // MISS IT, MISS LAUNCH",
      dressLabel: "DRESS_CODE",
      dressValue: "CYBER LOOKS ONLY // GO AS FLASHY AS YOU CAN",
      countdownLabel: "COUNTDOWN",
      countdownLoading: "SYNCING...",
      countdownLive: "LIVE NOW // BOARDING OPEN",
      joinBtn: "[ JACK IN // JOIN THE NETWORK ]",
      declineBtn: "[ DECLINE // ABORT PROTOCOL ]",
      ctaNote: "BOARDING 18:30 // 2026.05.31 // BUND PIER",
      toastJoin: "NETWORK LINKED // SEE YOU 19:00, MAY 31 AT THE BUND YACHT",
      toastDecline: "PROTOCOL DECLINED // JACK IN ANYTIME IF YOU CHANGE YOUR MIND",
      timeSyncPrefix: "2026.05.31 // 19:00:00 :: "
    }
  };

  let toastTimer = null;
  let currentLang = getInitialLanguage();

  function getInitialLanguage() {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === "en" ? "en" : "zh";
    } catch (error) {
      return "zh";
    }
  }

  function saveLanguage(lang) {
    try {
      localStorage.setItem(storageKey, lang);
    } catch (error) {
      // localStorage may be disabled in private mode; fail silently.
    }
  }

  function t(key) {
    const activeDict = localeText[currentLang] || localeText.zh;
    return activeDict[key] || localeText.zh[key] || "";
  }

  function applyLanguage(lang) {
    currentLang = lang === "en" ? "en" : "zh";
    document.documentElement.lang = currentLang === "en" ? "en" : "zh-CN";

    i18nNodes.forEach(function (node) {
      const key = node.getAttribute("data-i18n");
      const value = t(key);
      if (!value) {
        return;
      }
      node.textContent = value;
    });

    if (langToggle) {
      langToggle.textContent = t("langToggle");
    }

    updateTimeSync();
    updateCountdown();
    saveLanguage(currentLang);
  }

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
    timeSyncText.textContent = t("timeSyncPrefix") + hh + ":" + mm + ":" + ss + "." + ms;
  }

  function updateCountdown() {
    if (!countdownText) return;

    const now = Date.now();
    const diff = targetTime - now;

    if (diff <= 0) {
      countdownText.textContent = t("countdownLive");
      return;
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const hourMs = 60 * 60 * 1000;
    const minuteMs = 60 * 1000;

    const days = Math.floor(diff / dayMs);
    const hours = Math.floor((diff % dayMs) / hourMs);
    const minutes = Math.floor((diff % hourMs) / minuteMs);

    if (currentLang === "en") {
      countdownText.textContent =
        days + "D " + String(hours).padStart(2, "0") + "H " + String(minutes).padStart(2, "0") + "M";
      return;
    }

    countdownText.textContent =
      days + "天 " + String(hours).padStart(2, "0") + "时 " + String(minutes).padStart(2, "0") + "分";
  }

  revealPanels.forEach(function (panel, index) {
    panel.style.transitionDelay = String(80 + index * 70) + "ms";
  });

  if (langToggle) {
    langToggle.addEventListener("click", function () {
      applyLanguage(currentLang === "zh" ? "en" : "zh");
    });
  }

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
      showToast(t("toastJoin"));
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
      showToast(t("toastDecline"));
    });
  }

  setTimeout(function () {
    body.classList.add("loaded");
  }, 80);

  applyLanguage(currentLang);
  setInterval(updateTimeSync, 40);
  setInterval(updateCountdown, 30000);

  pulseGlitchOffset();
  setInterval(pulseGlitchOffset, 120);
})();
