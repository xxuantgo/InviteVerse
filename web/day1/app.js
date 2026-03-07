(function () {
  "use strict";

  const page = document.body.dataset.page;
  initStarfield();

  if (page === "creator") {
    initCreatorPage();
  }

  if (page === "guest") {
    initGuestPage();
  }
})();

function initCreatorPage() {
  const form = document.getElementById("creator-form");
  const autoFillBtn = document.getElementById("auto-fill-btn");
  const promptInput = document.getElementById("prompt-input");

  if (autoFillBtn) {
    autoFillBtn.addEventListener("click", function () {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      date.setHours(19, 0, 0, 0);

      if (promptInput) {
        promptInput.value = "下周六晚 7 点，外滩生日晚宴，海洋风，想高级一点";
      }

      const eventName = form.querySelector('input[name="event_name"]');
      const eventTime = form.querySelector('input[name="event_time"]');
      const eventLocation = form.querySelector('input[name="event_location"]');
      const dressCode = form.querySelector('input[name="dress_code"]');

      if (eventName) eventName.value = "星河之夜年度盛典";
      if (eventTime) eventTime.value = toDatetimeLocal(date);
      if (eventLocation) eventLocation.value = "星际大酒店 宇宙宴会厅";
      if (dressCode) dressCode.value = "正装 / 晚礼服（可选）";
    });
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const data = {};
      new FormData(form).forEach(function (value, key) {
        if (typeof value === "string") data[key] = value;
      });

      localStorage.setItem("inviteverse_day1_draft", JSON.stringify(data));
      window.location.href = "./guest.html";
    });
  }
}

function initGuestPage() {
  setupIgniteOverlay();
  setupRevealOnScroll();
  setupRsvp();
  setupUtilityButtons();
}

function setupIgniteOverlay() {
  const overlay = document.getElementById("ignite-overlay");
  const button = document.getElementById("ignite-button");
  if (!overlay || !button) return;

  let timer = null;
  let unlocked = false;

  function startHold() {
    if (unlocked) return;
    button.classList.add("is-pressing");
    timer = setTimeout(function () {
      unlocked = true;
      button.classList.remove("is-pressing");
      overlay.classList.add("is-hidden");
      playEntrySound();
      if (navigator.vibrate) navigator.vibrate(24);
      showToast("邀请已点亮，欢迎入场");
    }, 1000);
  }

  function cancelHold() {
    button.classList.remove("is-pressing");
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  button.addEventListener("pointerdown", startHold);
  button.addEventListener("pointerup", cancelHold);
  button.addEventListener("pointerleave", cancelHold);
  button.addEventListener("pointercancel", cancelHold);
}

function setupRevealOnScroll() {
  const sections = document.querySelectorAll(".reveal-on-scroll");
  if (!sections.length) return;

  const io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
  );

  sections.forEach(function (section) {
    io.observe(section);
  });
}

function setupRsvp() {
  const buttons = document.querySelectorAll("[data-rsvp]");
  const status = document.getElementById("rsvp-status");
  if (!buttons.length || !status) return;

  const labels = {
    confirm: "已确认出席",
    pending: "状态待定",
    decline: "已婉拒"
  };

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      const key = button.getAttribute("data-rsvp");
      const text = labels[key] || "未回复";
      status.textContent = "当前状态：" + text;
      showToast("回执已提交：" + text);
    });
  });
}

function setupUtilityButtons() {
  const calendarBtn = document.getElementById("calendar-btn");
  const mapBtn = document.getElementById("map-btn");
  const contactBtn = document.getElementById("contact-btn");

  if (calendarBtn) {
    calendarBtn.addEventListener("click", function () {
      downloadIcs();
      showToast("日历文件已生成");
    });
  }

  if (mapBtn) {
    mapBtn.addEventListener("click", function () {
      const url = "https://uri.amap.com/search?keyword=" + encodeURIComponent("星际大酒店 宇宙宴会厅");
      window.open(url, "_blank");
    });
  }

  if (contactBtn) {
    contactBtn.addEventListener("click", function () {
      showToast("主办方：星河之夜筹备组");
    });
  }
}

function downloadIcs() {
  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InviteVerse Day1//CN",
    "BEGIN:VEVENT",
    "UID:inviteverse-day1-20260115@example.com",
    "DTSTAMP:20260306T000000Z",
    "DTSTART:20260115T103000Z",
    "DTEND:20260115T133000Z",
    "SUMMARY:星河之夜年度盛典",
    "DESCRIPTION:星光不问赶路人，时光不负有心人。",
    "LOCATION:上海市浦东新区星河路 88 号",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "星河之夜-邀请函.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function () {
    toast.classList.remove("show");
  }, 1600);
}

function toDatetimeLocal(date) {
  const pad = function (n) { return String(n).padStart(2, "0"); };
  return [
    date.getFullYear(), "-", pad(date.getMonth() + 1), "-", pad(date.getDate()),
    "T", pad(date.getHours()), ":", pad(date.getMinutes())
  ].join("");
}

function playEntrySound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.34);
  } catch (_) {
    // ignore
  }
}

function initStarfield() {
  const canvas = document.getElementById("starfield-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let stars = [];
  let pointerX = 0;
  let pointerY = 0;
  let tiltX = 0;
  let tiltY = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * devicePixelRatio);
    canvas.height = Math.floor(height * devicePixelRatio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    stars = makeStars(Math.max(80, Math.floor((width * height) / 15000)));
  }

  function makeStars(count) {
    const arr = [];
    for (let i = 0; i < count; i += 1) {
      arr.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.7 + 0.4,
        speed: Math.random() * 0.09 + 0.02,
        twinkle: Math.random() * 0.03 + 0.008,
        alpha: Math.random() * 0.6 + 0.2,
        depth: Math.random() * 0.75 + 0.25
      });
    }
    return arr;
  }

  function tick() {
    ctx.clearRect(0, 0, width, height);
    const ox = pointerX * 12 + tiltX * 14;
    const oy = pointerY * 12 + tiltY * 14;

    for (let i = 0; i < stars.length; i += 1) {
      const s = stars[i];
      s.y += s.speed * s.depth;
      s.alpha += (Math.random() - 0.5) * s.twinkle;
      if (s.y > height + 6) {
        s.y = -6;
        s.x = Math.random() * width;
      }
      if (s.alpha < 0.12) s.alpha = 0.12;
      if (s.alpha > 0.95) s.alpha = 0.95;

      ctx.beginPath();
      ctx.fillStyle = "rgba(252, 211, 77, " + s.alpha.toFixed(3) + ")";
      ctx.arc(s.x + ox * s.depth, s.y + oy * s.depth, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  addEventListener("resize", resize);
  addEventListener("pointermove", function (event) {
    pointerX = (event.clientX / width - 0.5) * 2;
    pointerY = (event.clientY / height - 0.5) * 2;
  });
  addEventListener("deviceorientation", function (event) {
    if (typeof event.gamma !== "number" || typeof event.beta !== "number") return;
    tiltX = Math.max(-1, Math.min(1, event.gamma / 30));
    tiltY = Math.max(-1, Math.min(1, event.beta / 50));
  });

  resize();
  tick();
}
