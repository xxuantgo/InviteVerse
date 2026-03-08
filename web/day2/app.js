(function () {
  "use strict";

  const page = document.body.dataset.page;

  if (page === "creator") {
    initStarfield();
    initCreatorPage();
    return;
  }

  if (page === "guest") {
    initGuestPage();
  }
})();

const SPEC_STORAGE_KEY = "inviteverse_day2_spec";
const DRAFT_STORAGE_KEY = "inviteverse_day2_draft";
const DEFAULT_SPEC_PATH = "./spec/default-spec.json";
const TEMPLATE_REGISTRY = {
  galaxy_v1: {
    id: "galaxy_v1",
    stylePreset: "dream",
    copy: {
      heroTagline: "ANNUAL GALA 2026",
      invitationTitle: "诚挚邀请",
      ctaText: "确认出席"
    },
    actions: {
      rsvpEnabled: true,
      calendarEnabled: true,
      mapEnabled: true,
      shareEnabled: true
    }
  }
};

async function initCreatorPage() {
  const form = document.getElementById("creator-form");
  const autoFillBtn = document.getElementById("auto-fill-btn");
  const promptInput = document.getElementById("prompt-input");

  if (autoFillBtn) {
    autoFillBtn.addEventListener("click", function () {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      date.setHours(19, 0, 0, 0);

      const eventName = form.querySelector('input[name="event_name"]');
      const eventTime = form.querySelector('input[name="event_time"]');
      const address = form.querySelector('input[name="event_address"]');
      const contact = form.querySelector('input[name="event_contact"]');
      const dressCode = form.querySelector('input[name="dress_code"]');

      if (promptInput) {
        promptInput.value = "下周六晚 7 点，年度晚宴，星河主题，整体偏优雅电影感";
      }
      if (eventName) eventName.value = "星河之夜年度盛典";
      if (eventTime) eventTime.value = toDatetimeLocal(date);
      if (address) address.value = "上海浦东喜来登由由大酒店 (浦东新区浦建路38号)";
      if (contact) contact.value = "星河之夜筹备组";
      if (dressCode) dressCode.value = "正装 / 晚礼服（Black Tie Optional）";
    });
  }

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const inputPayload = collectCreatorInput(form);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(inputPayload));

    const spec = await generateInvitationSpec(inputPayload);
    localStorage.setItem(SPEC_STORAGE_KEY, JSON.stringify(spec));

    window.location.href = "./guest.html";
  });
}

function collectCreatorInput(form) {
  /**
   * 收集 Creator 表单输入（Day2 当前版）
   *
   * 说明：
   * 1. 主输入：一句话描述 + 4 个基础字段（活动名称/时间/地址/联系人）。
   * 2. 可选输入：描述文件、照片、着装要求（折叠面板）。
   * 3. 为兼容既有 Spec 结构（包含 checkin/style 等字段），
   *    这里会补部分默认空值，后续由 buildSpecLocally 再补默认内容。
   */
  const data = {};
  let descFileName = "";
  let photoFileName = "";

  new FormData(form).forEach(function (value, key) {
    if (typeof value === "string") {
      data[key] = value.trim();
      return;
    }

    if (typeof File !== "undefined" && value instanceof File && value.size > 0) {
      if (key === "desc_file") descFileName = value.name;
      if (key === "photo_file") photoFileName = value.name;
    }
  });

  return {
    prompt: data.prompt || "",
    eventName: data.event_name || "",
    eventTime: data.event_time || "",
    checkinTime: "",
    venue: "",
    address: data.event_address || "",
    dressCode: data.dress_code || "",
    contact: data.event_contact || "",
    style: "dream",
    descFileName: descFileName,
    photoFileName: photoFileName
  };
}

async function generateInvitationSpec(inputPayload) {
  /**
   * 生成 InvitationSpec 的主入口（核心分流点）
   *
   * 流程（先远端，后本地）：
   * 1. 先请求 /api/spec/generate（真实后端接入后由 LLM 生成）。
   * 2. 若远端返回有效 JSON -> normalizeSpec() 做结构清洗与兜底。
   * 3. 若远端失败/超时/不存在 -> buildSpecLocally() 本地规则生成。
   *
   * 为什么你现在常看到 fallback：
   * - Day2 当前还未接真实后端接口，所以第 1 步通常拿不到结果。
   * - 这是刻意设计，保证“无后端也可演示完整前端链路”。
   */
  const remoteSpec = await tryGenerateSpecViaApi(inputPayload);
  if (remoteSpec) {
    const normalizedRemote = normalizeSpec(remoteSpec, inputPayload);
    const debugBaseSpec = buildBaseSpec(inputPayload);
    const debugPresentationSpec = extractPresentationSpecFromRender(
      normalizedRemote,
      inputPayload,
      TEMPLATE_REGISTRY
    );
    debugSpecLayers(debugBaseSpec, debugPresentationSpec, normalizedRemote, "remote");
    return normalizedRemote;
  }

  const localSpec = buildSpecLocally(inputPayload);
  localSpec.warnings = mergeUniqueStrings(
    localSpec.warnings.concat("未检测到 /api/spec/generate，已使用本地规则生成 Spec")
  );
  return localSpec;
}

async function tryGenerateSpecViaApi(inputPayload) {
  /**
   * 尝试调用后端生成接口（可失败，失败不抛错）
   *
   * 设计原则：
   * 1. 有后端：返回远端 Spec。
   * 2. 无后端或异常：返回 null，让上层自动走本地规则。
   *
   * 注意：
   * - 设置了 5.5 秒超时，避免页面长时间卡住。
   * - Day2 阶段此接口大概率不存在，属于预留路径。
   */
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, 5500);

  try {
    const response = await fetch("/api/spec/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputPayload),
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data && typeof data === "object" ? data : null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildSpecLocally(inputPayload) {
  const baseSpec = buildBaseSpec(inputPayload);
  const presentationSpec = buildPresentationSpec(baseSpec, inputPayload, TEMPLATE_REGISTRY);
  const renderSpec = composeRenderSpec(baseSpec, presentationSpec);
  debugSpecLayers(baseSpec, presentationSpec, renderSpec, "local");
  return renderSpec;
}

function buildBaseSpec(inputPayload) {
  /**
   * BaseSpec：事实层（不关心视觉）
   * - 只描述事件事实、用户意图、素材占位信息。
   * - 不负责模板、文案风格、动效 tokens。
   */
  const datetime = formatDatetimeForSpec(inputPayload.eventTime) || "2026-01-15 18:30";
  const location = normalizeLocationText(inputPayload.address);
  const warnings = [];

  if (inputPayload.descFileName) {
    warnings.push("已接收描述文件：" + inputPayload.descFileName + "（Day2 暂未解析文件内容）");
  }
  if (inputPayload.photoFileName) {
    warnings.push("已接收照片：" + inputPayload.photoFileName + "（Day2 暂未用于视觉生成）");
  }

  return {
    version: "1.1",
    event: {
      title: inputPayload.eventName ? stripYearTag(inputPayload.eventName) : "星河之夜",
      subtitle: inputPayload.eventName && inputPayload.eventName.includes("年度") ? "年度盛典" : "特别邀请",
      datetime: datetime,
      timezone: "北京时间",
      checkinTime: inputPayload.checkinTime || "18:00",
      venue: location.venue,
      address: location.address,
      dressCode: inputPayload.dressCode || "正装 / 晚礼服（Black Tie Optional）",
      contact: inputPayload.contact || "主办方联系待补充"
    },
    intent: {
      rawPrompt: inputPayload.prompt || ""
    },
    assets: {
      descriptionFileName: inputPayload.descFileName || null,
      photoFileName: inputPayload.photoFileName || null
    },
    warnings: warnings
  };
}

function buildPresentationSpec(baseSpec, inputPayload, templateRegistry) {
  /**
   * PresentationSpec：呈现层（不改事实）
   * - 只负责模板选择、文案、风格标签、视觉 tokens。
   * - 当前 Day2 固定从 registry 中取模板配置，便于后续扩展多模板。
   */
  const templateId = selectTemplateId(inputPayload, templateRegistry);
  const templateConfig = (templateRegistry && templateRegistry[templateId]) || TEMPLATE_REGISTRY.galaxy_v1;
  const stylePreset = getStylePreset(templateConfig.stylePreset || inputPayload.style || "dream");

  return {
    template: { id: templateConfig.id || "galaxy_v1" },
    copy: {
      locale: "zh-CN",
      heroTagline: get(templateConfig, ["copy", "heroTagline"], "ANNUAL GALA 2026"),
      invitationTitle: get(templateConfig, ["copy", "invitationTitle"], "诚挚邀请"),
      body: buildBodyCopy(get(baseSpec, ["intent", "rawPrompt"], "")),
      ctaText: get(templateConfig, ["copy", "ctaText"], "确认出席")
    },
    style: {
      mood: stylePreset.mood,
      keywords: stylePreset.keywords
    },
    tokens: stylePreset.tokens,
    media: {
      bgmUrl: null
    },
    actions: {
      rsvpEnabled: Boolean(get(templateConfig, ["actions", "rsvpEnabled"], true)),
      calendarEnabled: Boolean(get(templateConfig, ["actions", "calendarEnabled"], true)),
      mapEnabled: Boolean(get(templateConfig, ["actions", "mapEnabled"], true)),
      shareEnabled: true
    }
  };
}

function composeRenderSpec(baseSpec, presentationSpec) {
  /**
   * RenderSpec：最终渲染层（Guest 直接消费）
   * - 组合 BaseSpec + PresentationSpec，输出兼容现有 Guest 的 InvitationSpec v1.1 结构。
   */
  return {
    version: get(baseSpec, ["version"], "1.1"),
    template: {
      id: get(presentationSpec, ["template", "id"], "galaxy_v1")
    },
    event: {
      title: get(baseSpec, ["event", "title"], "星河之夜"),
      subtitle: get(baseSpec, ["event", "subtitle"], "年度盛典"),
      datetime: normalizeDatetimeText(get(baseSpec, ["event", "datetime"], "2026-01-15 18:30")),
      timezone: get(baseSpec, ["event", "timezone"], "北京时间"),
      checkinTime: normalizeTimeText(get(baseSpec, ["event", "checkinTime"], "18:00")),
      venue: get(baseSpec, ["event", "venue"], "星际大酒店·宇宙宴会厅"),
      address: get(baseSpec, ["event", "address"], "上海市浦东新区星河路88号"),
      dressCode: get(baseSpec, ["event", "dressCode"], "正装 / 晚礼服（Black Tie Optional）"),
      contact: get(baseSpec, ["event", "contact"], "主办方联系待补充")
    },
    copy: {
      locale: "zh-CN",
      heroTagline: get(presentationSpec, ["copy", "heroTagline"], "ANNUAL GALA 2026"),
      invitationTitle: get(presentationSpec, ["copy", "invitationTitle"], "诚挚邀请"),
      body: normalizeBodyArray(get(presentationSpec, ["copy", "body"], [])),
      ctaText: get(presentationSpec, ["copy", "ctaText"], "确认出席")
    },
    style: {
      mood: normalizeStringArray(get(presentationSpec, ["style", "mood"], [])),
      keywords: normalizeStringArray(get(presentationSpec, ["style", "keywords"], []))
    },
    tokens: get(presentationSpec, ["tokens"], getStylePreset("dream").tokens),
    media: {
      bgmUrl: get(presentationSpec, ["media", "bgmUrl"], null)
    },
    actions: {
      rsvpEnabled: Boolean(get(presentationSpec, ["actions", "rsvpEnabled"], true)),
      calendarEnabled: Boolean(get(presentationSpec, ["actions", "calendarEnabled"], true)),
      mapEnabled: Boolean(get(presentationSpec, ["actions", "mapEnabled"], true)),
      shareEnabled: true
    },
    warnings: mergeUniqueStrings([].concat(
      normalizeStringArray(get(baseSpec, ["warnings"], [])),
      normalizeStringArray(get(presentationSpec, ["warnings"], []))
    ))
  };
}

function normalizeSpec(rawSpec, inputPayload) {
  /**
   * 只做规范化：默认值回填 + 边界约束 + warnings 汇总
   * - 不在此函数里重新设计内容策略。
   * - 默认值统一来自 BaseSpec + PresentationSpec 组合后的 RenderSpec。
   */
  const baseSpec = buildBaseSpec(inputPayload);
  const presentationSpec = buildPresentationSpec(baseSpec, inputPayload, TEMPLATE_REGISTRY);
  const fallbackRender = composeRenderSpec(baseSpec, presentationSpec);

  const spec = {
    version: get(rawSpec, ["version"], fallbackRender.version),
    template: {
      id: get(rawSpec, ["template", "id"], fallbackRender.template.id)
    },
    event: {
      title: get(rawSpec, ["event", "title"], fallbackRender.event.title),
      subtitle: get(rawSpec, ["event", "subtitle"], fallbackRender.event.subtitle),
      datetime: normalizeDatetimeText(get(rawSpec, ["event", "datetime"], fallbackRender.event.datetime)),
      timezone: get(rawSpec, ["event", "timezone"], fallbackRender.event.timezone),
      checkinTime: normalizeTimeText(get(rawSpec, ["event", "checkinTime"], fallbackRender.event.checkinTime)),
      venue: get(rawSpec, ["event", "venue"], fallbackRender.event.venue),
      address: get(rawSpec, ["event", "address"], fallbackRender.event.address),
      dressCode: get(rawSpec, ["event", "dressCode"], fallbackRender.event.dressCode),
      contact: get(rawSpec, ["event", "contact"], fallbackRender.event.contact)
    },
    copy: {
      locale: "zh-CN",
      heroTagline: get(rawSpec, ["copy", "heroTagline"], fallbackRender.copy.heroTagline),
      invitationTitle: get(rawSpec, ["copy", "invitationTitle"], fallbackRender.copy.invitationTitle),
      body: normalizeBodyArray(get(rawSpec, ["copy", "body"], fallbackRender.copy.body)),
      ctaText: get(rawSpec, ["copy", "ctaText"], fallbackRender.copy.ctaText)
    },
    style: {
      mood: normalizeStringArray(get(rawSpec, ["style", "mood"], fallbackRender.style.mood)),
      keywords: normalizeStringArray(get(rawSpec, ["style", "keywords"], fallbackRender.style.keywords))
    },
    tokens: {
      colors: {
        bg1: get(rawSpec, ["tokens", "colors", "bg1"], get(fallbackRender, ["tokens", "colors", "bg1"], "#0f172a")),
        bg2: get(rawSpec, ["tokens", "colors", "bg2"], get(fallbackRender, ["tokens", "colors", "bg2"], "#1e1b4b")),
        gold: get(rawSpec, ["tokens", "colors", "gold"], get(fallbackRender, ["tokens", "colors", "gold"], "#FCD34D")),
        text: get(rawSpec, ["tokens", "colors", "text"], get(fallbackRender, ["tokens", "colors", "text"], "#F8FAFC"))
      },
      glass: {
        opacity: clampNumber(get(rawSpec, ["tokens", "glass", "opacity"], get(fallbackRender, ["tokens", "glass", "opacity"], 0.1)), 0.06, 0.24),
        blurPx: clampNumber(get(rawSpec, ["tokens", "glass", "blurPx"], get(fallbackRender, ["tokens", "glass", "blurPx"], 22)), 8, 30),
        borderGlow: clampNumber(get(rawSpec, ["tokens", "glass", "borderGlow"], get(fallbackRender, ["tokens", "glass", "borderGlow"], 0.35)), 0, 1)
      },
      motion: {
        pace: normalizePace(get(rawSpec, ["tokens", "motion", "pace"], get(fallbackRender, ["tokens", "motion", "pace"], "slow"))),
        fadeUpDistancePx: clampNumber(get(rawSpec, ["tokens", "motion", "fadeUpDistancePx"], get(fallbackRender, ["tokens", "motion", "fadeUpDistancePx"], 16)), 8, 28),
        staggerMs: clampNumber(get(rawSpec, ["tokens", "motion", "staggerMs"], get(fallbackRender, ["tokens", "motion", "staggerMs"], 120)), 60, 240)
      },
      particles: {
        density: clampNumber(get(rawSpec, ["tokens", "particles", "density"], get(fallbackRender, ["tokens", "particles", "density"], 0.65)), 0.2, 1),
        speed: clampNumber(get(rawSpec, ["tokens", "particles", "speed"], get(fallbackRender, ["tokens", "particles", "speed"], 0.35)), 0.1, 1),
        twinkle: clampNumber(get(rawSpec, ["tokens", "particles", "twinkle"], get(fallbackRender, ["tokens", "particles", "twinkle"], 0.6)), 0, 1)
      }
    },
    media: {
      bgmUrl: get(rawSpec, ["media", "bgmUrl"], get(fallbackRender, ["media", "bgmUrl"], null))
    },
    actions: {
      rsvpEnabled: Boolean(get(rawSpec, ["actions", "rsvpEnabled"], get(fallbackRender, ["actions", "rsvpEnabled"], true))),
      calendarEnabled: Boolean(get(rawSpec, ["actions", "calendarEnabled"], get(fallbackRender, ["actions", "calendarEnabled"], true))),
      mapEnabled: Boolean(get(rawSpec, ["actions", "mapEnabled"], get(fallbackRender, ["actions", "mapEnabled"], true))),
      shareEnabled: true
    },
    warnings: mergeUniqueStrings([].concat(
      normalizeStringArray(get(fallbackRender, ["warnings"], [])),
      normalizeStringArray(get(rawSpec, ["warnings"], []))
    ))
  };

  if (!spec.event.contact || spec.event.contact === "主办方联系待补充") {
    spec.warnings = mergeUniqueStrings(spec.warnings.concat("主办方联系人缺失，已使用默认值"));
  }

  return spec;
}

function extractPresentationSpecFromRender(renderSpec, inputPayload, templateRegistry) {
  const baseForFallback = buildBaseSpec(inputPayload);
  const fallback = buildPresentationSpec(baseForFallback, inputPayload, templateRegistry);
  return {
    template: {
      id: get(renderSpec, ["template", "id"], get(fallback, ["template", "id"], "galaxy_v1"))
    },
    copy: {
      locale: "zh-CN",
      heroTagline: get(renderSpec, ["copy", "heroTagline"], get(fallback, ["copy", "heroTagline"], "ANNUAL GALA 2026")),
      invitationTitle: get(renderSpec, ["copy", "invitationTitle"], get(fallback, ["copy", "invitationTitle"], "诚挚邀请")),
      body: normalizeBodyArray(get(renderSpec, ["copy", "body"], get(fallback, ["copy", "body"], []))),
      ctaText: get(renderSpec, ["copy", "ctaText"], get(fallback, ["copy", "ctaText"], "确认出席"))
    },
    style: {
      mood: normalizeStringArray(get(renderSpec, ["style", "mood"], get(fallback, ["style", "mood"], []))),
      keywords: normalizeStringArray(get(renderSpec, ["style", "keywords"], get(fallback, ["style", "keywords"], [])))
    },
    tokens: get(renderSpec, ["tokens"], get(fallback, ["tokens"], getStylePreset("dream").tokens)),
    media: {
      bgmUrl: get(renderSpec, ["media", "bgmUrl"], get(fallback, ["media", "bgmUrl"], null))
    },
    actions: {
      rsvpEnabled: Boolean(get(renderSpec, ["actions", "rsvpEnabled"], get(fallback, ["actions", "rsvpEnabled"], true))),
      calendarEnabled: Boolean(get(renderSpec, ["actions", "calendarEnabled"], get(fallback, ["actions", "calendarEnabled"], true))),
      mapEnabled: Boolean(get(renderSpec, ["actions", "mapEnabled"], get(fallback, ["actions", "mapEnabled"], true))),
      shareEnabled: true
    }
  };
}

function selectTemplateId(inputPayload, templateRegistry) {
  const preferred = (inputPayload && inputPayload.templateId) || "galaxy_v1";
  if (templateRegistry && templateRegistry[preferred]) return preferred;
  return "galaxy_v1";
}

function debugSpecLayers(baseSpec, presentationSpec, renderSpec, source) {
  if (typeof console === "undefined") return;
  const tag = source || "local";
  console.groupCollapsed("[InviteVerse][SpecLayer] source=" + tag);
  console.log("baseSpec", baseSpec);
  console.log("presentationSpec", presentationSpec);
  console.log("finalRenderSpec", renderSpec);
  console.groupEnd();
}
async function initGuestPage() {
  const spec = await loadActiveSpec();
  applySpecTokens(spec);
  initStarfield(spec.tokens && spec.tokens.particles);

  renderGuestBySpec(spec);

  setupIgniteOverlay();
  setupRevealOnScroll();
  setupRsvp(spec);
  setupUtilityButtons(spec);

  if (spec.warnings && spec.warnings.length) {
    showToast("提示：本页包含 " + spec.warnings.length + " 条自动补全");
  }
}

async function loadActiveSpec() {
  /**
   * 读取“当前要渲染的 Spec”
   *
   * 优先级：
   * 1. localStorage 中最近一次生成的 Spec
   * 2. 项目内置 default-spec.json
   * 3. 最后兜底：现场 buildSpecLocally()
   *
   * 这样即使本地缓存损坏或文件加载失败，也不会白屏。
   */
  const cached = localStorage.getItem(SPEC_STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (isValidSpec(parsed)) {
        return parsed;
      }
    } catch (_) {
      // ignore
    }
  }

  try {
    const response = await fetch(DEFAULT_SPEC_PATH, { cache: "no-store" });
    if (response.ok) {
      const json = await response.json();
      if (isValidSpec(json)) {
        return json;
      }
    }
  } catch (_) {
    // ignore
  }

  return buildSpecLocally({
    prompt: "",
    eventName: "星河之夜年度盛典",
    eventTime: "2026-01-15T18:30",
    address: "上海浦东喜来登由由大酒店 (浦东新区浦建路38号)",
    contact: "星河之夜筹备组",
    style: "dream"
  });
}

function isValidSpec(spec) {
  return !!(
    spec &&
    spec.event &&
    spec.copy &&
    spec.tokens &&
    spec.actions &&
    typeof spec.event.title === "string" &&
    typeof spec.event.datetime === "string"
  );
}

function applySpecTokens(spec) {
  const root = document.documentElement;
  const colors = spec.tokens && spec.tokens.colors;
  if (!root || !colors) return;

  root.style.setProperty("--bg-1", colors.bg1 || "#0f172a");
  root.style.setProperty("--bg-2", colors.bg2 || "#1e1b4b");
  root.style.setProperty("--gold", colors.gold || "#FCD34D");
  root.style.setProperty("--moon", colors.text || "#F8FAFC");
}

function renderGuestBySpec(spec) {
  const overlayEyebrow = document.getElementById("overlay-eyebrow");
  const heroTagline = document.getElementById("hero-tagline");
  const heroTitle = document.getElementById("hero-title");
  const heroSubtitle = document.getElementById("hero-subtitle");
  const eventDatetime = document.getElementById("event-datetime");
  const eventCheckin = document.getElementById("event-checkin");
  const eventVenue = document.getElementById("event-venue");
  const eventAddress = document.getElementById("event-address");
  const eventDress = document.getElementById("event-dress");
  const eventContact = document.getElementById("event-contact");
  const invitationTitle = document.getElementById("invitation-title");
  const invitationBody = document.getElementById("invitation-body");
  const ctaConfirmBtn = document.getElementById("cta-confirm-btn");

  document.title = spec.event.title + " - 动态邀请函";

  if (overlayEyebrow) overlayEyebrow.textContent = spec.event.title + spec.event.subtitle;
  if (heroTagline) heroTagline.textContent = spec.copy.heroTagline;
  if (heroTitle) heroTitle.textContent = spec.event.title;
  if (heroSubtitle) heroSubtitle.textContent = spec.event.subtitle;
  if (eventDatetime) eventDatetime.textContent = formatDatetimeCN(spec.event.datetime);
  if (eventCheckin) eventCheckin.textContent = (spec.event.checkinTime || "18:00") + " 开始签到入场";
  if (eventVenue) eventVenue.textContent = spec.event.venue;
  if (eventAddress) eventAddress.textContent = spec.event.address;
  if (eventDress) eventDress.textContent = spec.event.dressCode;
  if (eventContact) eventContact.textContent = spec.event.contact;
  if (invitationTitle) invitationTitle.textContent = spec.copy.invitationTitle;
  if (ctaConfirmBtn) ctaConfirmBtn.textContent = spec.copy.ctaText || "确认出席";

  if (invitationBody) {
    invitationBody.innerHTML = "";
    (spec.copy.body || []).forEach(function (text) {
      const p = document.createElement("p");
      p.textContent = text;
      invitationBody.appendChild(p);
    });
  }

  setElementVisible("rsvp-actions", spec.actions.rsvpEnabled);
  setElementVisible("calendar-btn", spec.actions.calendarEnabled);
  setElementVisible("map-btn", spec.actions.mapEnabled);
  setElementVisible("share-btn", true);
}

function setElementVisible(id, isVisible) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = isVisible ? "" : "none";
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
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
  );

  sections.forEach(function (section) {
    io.observe(section);
  });
}

function setupRsvp(spec) {
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
      persistRsvpMock(key, spec);
    });
  });
}

function persistRsvpMock(status, spec) {
  const payload = {
    inviteId: "inv_local_day2",
    guestId: "guest_local",
    guestName: "匿名来宾",
    status: status,
    message: "",
    device: detectDeviceType(),
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem("inviteverse_day2_last_rsvp", JSON.stringify(payload));
  localStorage.setItem("inviteverse_day2_last_event", spec.event.title);
}

function setupUtilityButtons(spec) {
  const calendarBtn = document.getElementById("calendar-btn");
  const mapBtn = document.getElementById("map-btn");
  const contactBtn = document.getElementById("contact-btn");
  const shareBtn = document.getElementById("share-btn");

  if (calendarBtn) {
    calendarBtn.addEventListener("click", function () {
      downloadIcs(spec);
      showToast("日历文件已生成");
    });
  }

  if (mapBtn) {
    mapBtn.addEventListener("click", function () {
      const url = buildMapUrl(spec.event);
      window.open(url, "_blank");
    });
  }

  if (contactBtn) {
    contactBtn.addEventListener("click", function () {
      showToast("主办方：" + (spec.event.contact || "待补充"));
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", async function () {
      const shareData = {
        title: spec.event.title + spec.event.subtitle,
        text: "邀请你参加「" + spec.event.title + "」",
        url: window.location.href
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          showToast("已打开系统分享面板");
          return;
        } catch (_) {
          // ignore cancel/error
        }
      }

      await copyText(window.location.href);
      showToast("链接已复制，可发送给来宾");
    });
  }
}
function buildMapUrl(eventInfo) {
  const venue = String(eventInfo.venue || "").trim();
  const address = String(eventInfo.address || "").trim();
  const keyword = venue && address && venue !== address ? venue + " " + address : (address || venue);
  const encoded = encodeURIComponent(keyword.trim());

  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isMobileOrTablet = window.matchMedia("(max-width: 1024px)").matches || navigator.maxTouchPoints > 1;

  if (isIOS && isMobileOrTablet) {
    return "https://maps.apple.com/?q=" + encoded;
  }

  return "https://uri.amap.com/search?keyword=" + encoded;
}

function normalizeLocationText(locationText) {
  /**
   * 把“活动地址（含场馆名）”拆成 venue + address
   *
   * 约定输入示例：
   * - "星际大酒店·宇宙宴会厅，上海市浦东新区星河路88号"
   *
   * 规则：
   * 1. 若含逗号（中/英）：
   *    - 第一段作为 venue
   *    - 其余段拼成 address
   * 2. 若不含逗号：
   *    - venue 与 address 都使用整段文本
   * 3. 若为空：
   *    - 返回默认 venue/address
   */
  const fallback = {
    venue: "星际大酒店·宇宙宴会厅",
    address: "上海市浦东新区星河路88号"
  };

  if (!locationText || typeof locationText !== "string") return fallback;
  const text = locationText.trim();
  if (!text) return fallback;

  const bracketMatch = text.match(/^(.+?)\s*[（(]\s*(.+?)\s*[）)]\s*$/);
  if (bracketMatch) {
    return {
      venue: bracketMatch[1].trim(),
      address: bracketMatch[2].trim()
    };
  }

  const parts = text.split(/[，,]/).map(function (item) {
    return item.trim();
  }).filter(Boolean);

  if (parts.length >= 2) {
    return {
      venue: parts[0],
      address: parts.slice(1).join("，")
    };
  }

  return {
    venue: text,
    address: text
  };
}

function downloadIcs(spec) {
  const start = spec.event.datetime || "2026-01-15 18:30";
  const end = addHoursToDatetimeText(start, 3);

  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InviteVerse Day2//CN",
    "BEGIN:VEVENT",
    "UID:inviteverse-day2-local@example.com",
    "DTSTAMP:" + toIcsUtcStamp(new Date()),
    "DTSTART:" + toIcsLocal(start),
    "DTEND:" + toIcsLocal(end),
    "SUMMARY:" + escapeIcs(spec.event.title + spec.event.subtitle),
    "DESCRIPTION:" + escapeIcs((spec.copy.body || []).join(" ")),
    "LOCATION:" + escapeIcs(spec.event.address),
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (spec.event.title || "邀请函") + ".ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatDatetimeCN(text) {
  const norm = normalizeDatetimeText(text);
  const match = norm.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/);
  if (!match) return text;
  return Number(match[1]) + "年" + Number(match[2]) + "月" + Number(match[3]) + "日 " + match[4] + ":" + match[5];
}

function normalizeDatetimeText(text) {
  if (!text || typeof text !== "string") return "2026-01-15 18:30";
  const trimmed = text.trim();

  const dtMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})(?::\d{2})?(?:Z|[+\-]\d{2}:?\d{2})?$/);
  if (dtMatch) {
    return dtMatch[1] + " " + dtMatch[2];
  }

  return "2026-01-15 18:30";
}

function normalizeTimeText(text) {
  if (!text || typeof text !== "string") return "18:00";
  const match = text.trim().match(/^(\d{2}:\d{2})/);
  return match ? match[1] : "18:00";
}

function formatDatetimeForSpec(datetimeLocal) {
  if (!datetimeLocal) return "";
  const match = String(datetimeLocal).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) return "";
  return match[1] + " " + match[2];
}

function stripYearTag(text) {
  return String(text || "").replace(/年度盛典|年度晚宴|年会/g, "").trim() || "星河之夜";
}

function buildBodyCopy(prompt) {
  const defaultBody = [
    "星光不问赶路人，时光不负有心人。在过去的一年里，我们携手并肩，共同创造了璀璨的星河。",
    "值此辞旧迎新之际，我们诚挚地邀请您出席“星河之夜”年度盛典。让我们在星光下重聚，共赏繁星，同谱华章。"
  ];

  if (!prompt) return defaultBody;

  return [
    "我们已收到你的活动灵感：" + prompt + "。",
    "这封邀请函已根据你的描述生成，期待与你在重要时刻相聚。"
  ];
}

function getStylePreset(styleName) {
  const presets = {
    dream: {
      mood: ["梦幻", "优雅", "高级感", "电影感"],
      keywords: ["星河", "午夜蓝", "香槟金", "玻璃拟态"],
      tokens: {
        colors: { bg1: "#0f172a", bg2: "#1e1b4b", gold: "#FCD34D", text: "#F8FAFC" },
        glass: { opacity: 0.1, blurPx: 22, borderGlow: 0.35 },
        motion: { pace: "slow", fadeUpDistancePx: 16, staggerMs: 120 },
        particles: { density: 0.65, speed: 0.35, twinkle: 0.6 }
      }
    },
    movie: {
      mood: ["电影感", "庄重", "戏剧性"],
      keywords: ["聚光", "深海蓝", "金线", "序章"],
      tokens: {
        colors: { bg1: "#0a1021", bg2: "#1d234f", gold: "#f6c453", text: "#f8fafc" },
        glass: { opacity: 0.12, blurPx: 18, borderGlow: 0.42 },
        motion: { pace: "slow", fadeUpDistancePx: 18, staggerMs: 140 },
        particles: { density: 0.55, speed: 0.28, twinkle: 0.52 }
      }
    },
    warm: {
      mood: ["温馨", "柔和", "亲近"],
      keywords: ["暖光", "烛火", "柔焦", "邀请"],
      tokens: {
        colors: { bg1: "#1a233d", bg2: "#2b2e5f", gold: "#eecb7f", text: "#fff7ea" },
        glass: { opacity: 0.14, blurPx: 16, borderGlow: 0.3 },
        motion: { pace: "medium", fadeUpDistancePx: 14, staggerMs: 110 },
        particles: { density: 0.45, speed: 0.26, twinkle: 0.46 }
      }
    }
  };

  return presets[styleName] || presets.dream;
}

function detectDeviceType() {
  const width = window.innerWidth;
  if (width <= 600) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

function get(object, path, fallback) {
  let cursor = object;
  for (let i = 0; i < path.length; i += 1) {
    if (!cursor || typeof cursor !== "object" || !(path[i] in cursor)) {
      return fallback;
    }
    cursor = cursor[path[i]];
  }
  return cursor;
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizePace(value) {
  const v = String(value || "slow").toLowerCase();
  return v === "medium" || v === "fast" ? v : "slow";
}

function normalizeBodyArray(arr) {
  if (!Array.isArray(arr) || !arr.length) {
    return ["欢迎参加本次活动。"];
  }
  return arr.map(function (item) {
    return String(item || "").trim();
  }).filter(Boolean).slice(0, 3);
}

function normalizeStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(function (item) {
    return String(item || "").trim();
  }).filter(Boolean);
}

function mergeUniqueStrings(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = {};
  const result = [];
  arr.forEach(function (item) {
    const text = String(item || "").trim();
    if (!text || seen[text]) return;
    seen[text] = true;
    result.push(text);
  });
  return result;
}

function toDatetimeLocal(date) {
  return [
    date.getFullYear(),
    "-", pad(date.getMonth() + 1),
    "-", pad(date.getDate()),
    "T", pad(date.getHours()),
    ":", pad(date.getMinutes())
  ].join("");
}

function addHoursToDatetimeText(datetimeText, hours) {
  const norm = normalizeDatetimeText(datetimeText);
  const match = norm.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/);
  if (!match) return "2026-01-15 21:30";
  const dt = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0
  );
  dt.setHours(dt.getHours() + hours);
  return [
    dt.getFullYear(),
    "-", pad(dt.getMonth() + 1),
    "-", pad(dt.getDate()),
    " ", pad(dt.getHours()),
    ":", pad(dt.getMinutes())
  ].join("");
}

function toIcsLocal(datetimeText) {
  const norm = normalizeDatetimeText(datetimeText);
  const match = norm.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/);
  if (!match) return "20260115T183000";
  return match[1] + match[2] + match[3] + "T" + match[4] + match[5] + "00";
}

function toIcsUtcStamp(date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z"
  ].join("");
}

function escapeIcs(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

function pad(n) {
  return String(n).padStart(2, "0");
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "readonly");
  area.style.position = "absolute";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function () {
    toast.classList.remove("show");
  }, 1800);
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

function initStarfield(particleTokens) {
  const canvas = document.getElementById("starfield-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const density = clampNumber(get(particleTokens, ["density"], 0.65), 0.2, 1);
  const speedFactor = clampNumber(get(particleTokens, ["speed"], 0.35), 0.1, 1);
  const twinkleFactor = clampNumber(get(particleTokens, ["twinkle"], 0.6), 0, 1);

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

    const baseCount = Math.floor((width * height) / 15000);
    const count = Math.max(80, Math.floor(baseCount * density));
    stars = makeStars(count);
  }

  function makeStars(count) {
    const arr = [];
    for (let i = 0; i < count; i += 1) {
      arr.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.7 + 0.4,
        speed: (Math.random() * 0.09 + 0.02) * speedFactor,
        twinkle: (Math.random() * 0.03 + 0.008) * (0.35 + twinkleFactor),
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

