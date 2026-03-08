(function () {
  "use strict";

  const root = document.getElementById("demo1-root");
  const pointerGlow = document.getElementById("pointer-glow");
  const detailSection = document.getElementById("detail-section");
  const replayBtn = document.getElementById("replay-btn");
  const joinBtn = document.getElementById("join-btn");
  const toast = document.getElementById("demo1-toast");
  const revealBlocks = document.querySelectorAll(".reveal-block");

  let toastTimer = null;

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 1900);
  }

  function setupPointerGlow() {
    if (!pointerGlow || !root) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    function tick() {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      pointerGlow.style.transform = "translate(" + (currentX - 230) + "px, " + (currentY - 230) + "px)";
      requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", function (event) {
      targetX = event.clientX;
      targetY = event.clientY;
    });

    tick();
  }

  function setupRevealBlocks() {
    if (!revealBlocks.length || !("IntersectionObserver" in window)) {
      revealBlocks.forEach(function (block) {
        block.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );

    revealBlocks.forEach(function (block) {
      observer.observe(block);
    });
  }

  function setupUnlock() {
    if (!detailSection) return;

    if (!("IntersectionObserver" in window)) {
      document.body.classList.add("is-unlocked");
      return;
    }

    const unlockObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            document.body.classList.add("is-unlocked");
          }
        });
      },
      { threshold: 0.33 }
    );

    unlockObserver.observe(detailSection);
  }

  function setupScrollHint() {
    function onScroll() {
      if (window.scrollY > 60) {
        document.body.classList.add("has-scrolled");
      } else {
        document.body.classList.remove("has-scrolled");
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (replayBtn) {
    replayBtn.addEventListener("click", function () {
      document.body.classList.remove("is-unlocked");
      window.scrollTo({ top: 0, behavior: "smooth" });

      window.setTimeout(function () {
        document.body.classList.add("is-unlocked");
      }, 960);
    });
  }

  if (joinBtn) {
    joinBtn.addEventListener("click", function () {
      showToast("已确认赴约：3月15日 18:30，东区见");
    });
  }

  setupPointerGlow();
  setupRevealBlocks();
  setupUnlock();
  setupScrollHint();
})();
