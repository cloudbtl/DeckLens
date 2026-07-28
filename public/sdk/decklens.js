/*!
 * DeckLens SDK v0.2 — section-level reading analytics.
 * Open-source instrumentation. Hosted storage/dashboards: CloudBTL (cloudbtl.com).
 *
 * v0.2 (2026-07-28): CloudBTL event-contract alignment
 *  - userId → visitorId (CloudBTL Event.visitor_id)
 *  - options.sessionId / visitorId / linkId injectable (host page decides identity)
 *  - transport: "fetch" (default) | "postMessage" — sandboxed iframes can't reach
 *    the API origin, so events relay to the parent frame instead
 *  - section events carry target=sectionId, action events target=targetName
 *    (maps onto CloudBTL's events.target column; everything else lands in payload)
 *  - storage access is best-effort: opaque-origin iframes throw on *Storage
 */
(function () {
  const DEFAULT_ENDPOINT = "/api/events";
  const DEFAULT_FLUSH_INTERVAL = 5000;
  const ACTION_SELECTOR = [
    "a",
    "button",
    "input",
    "textarea",
    "select",
    "summary",
    "[role='button']",
    "[role='link']",
    "[onclick]",
    "[tabindex]",
    "[contenteditable='true']",
    "[data-track]"
  ].join(",");

  function now() {
    return Date.now();
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return `dl_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }

  function safeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  // 샌드박스(opaque origin) iframe 에선 storage 접근 자체가 throw — 전부 best-effort.
  function storageGet(store, key) {
    try {
      return window[store].getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(store, key, value) {
    try {
      window[store].setItem(key, value);
    } catch {
      /* opaque origin — 무시 */
    }
  }

  function persistentId(scope, kind, store) {
    const key = `decklens:${scope}:${kind}`;
    const existing = storageGet(store, key);
    if (existing) return existing;
    const created = uuid();
    storageSet(store, key, created);
    return created;
  }

  function createTracker(options) {
    const config = {
      projectId: "demo",
      deckId: document.title || "untitled-deck",
      linkId: null, // CloudBTL 공유 링크 컨텍스트 — 있으면 모든 이벤트에 실림
      endpoint: DEFAULT_ENDPOINT,
      transport: "fetch", // "fetch" | "postMessage"
      flushInterval: DEFAULT_FLUSH_INTERVAL,
      sectionSelector: "[data-decklens-section], [data-slide-id], section, article",
      actionSelector: ACTION_SELECTOR,
      visibilityThreshold: 0.25,
      sessionId: null, // 호스트가 주입 가능 (미지정 시 sessionStorage 기반 생성)
      visitorId: null, // 호스트가 주입 가능 (미지정 시 localStorage 기반 생성)
      debug: false,
      ...options
    };

    const sessionId = config.sessionId || persistentId(config.projectId, "session", "sessionStorage");
    const visitorId = config.visitorId || persistentId(config.projectId, "visitor", "localStorage");

    const sectionMeta = new WeakMap();
    const visibleSections = new Map();
    const hoverStarts = new WeakMap();
    const hoverCooldowns = new WeakMap();
    let queue = [];
    let sequence = 0;
    let started = false;

    function pageInfo() {
      return {
        pageUrl: location.href,
        pagePath: `${location.pathname}${location.search}${location.hash}`,
        pageTitle: document.title || ""
      };
    }

    function baseEvent(type, data) {
      const event = {
        type,
        projectId: config.projectId,
        deckId: config.deckId,
        sessionId,
        visitorId,
        sequence: ++sequence,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        occurredAt: new Date().toISOString(),
        ...pageInfo(),
        ...data
      };
      if (config.linkId) event.linkId = config.linkId;
      return event;
    }

    function enqueue(type, data) {
      const event = baseEvent(type, data);
      queue.push(event);
      if (config.debug) console.log("[decklens]", event);
      return event;
    }

    function flush(useBeacon) {
      if (!queue.length) return;
      const events = queue.splice(0, queue.length);

      if (config.transport === "postMessage") {
        try {
          window.parent.postMessage({ __decklens: 1, events }, "*");
        } catch {
          /* 부모 없음 — 드랍 */
        }
        return;
      }

      const payload = JSON.stringify({ events });
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(config.endpoint, new Blob([payload], { type: "application/json" }));
        return;
      }

      fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true
      }).catch(() => {
        queue = events.concat(queue).slice(-500);
      });
    }

    function sectionTitle(element) {
      const explicit =
        element.getAttribute("data-section-title") ||
        element.getAttribute("aria-label") ||
        element.getAttribute("data-track-name");
      if (explicit) return safeText(explicit).slice(0, 120);

      const heading = element.querySelector("h1, h2, h3, [data-section-heading]");
      return safeText(heading ? heading.textContent : element.textContent).slice(0, 120) || "Untitled section";
    }

    function getSectionMeta(element) {
      if (sectionMeta.has(element)) return sectionMeta.get(element);
      const sections = Array.from(document.querySelectorAll(config.sectionSelector));
      const index = Math.max(0, sections.indexOf(element));
      const id =
        element.getAttribute("data-decklens-section") ||
        element.getAttribute("data-slide-id") ||
        element.id ||
        `section-${index + 1}`;
      const meta = {
        sectionId: id,
        sectionTitle: sectionTitle(element),
        sectionIndex: index + 1
      };
      sectionMeta.set(element, meta);
      return meta;
    }

    function currentSectionFor(element) {
      const section = element.closest(config.sectionSelector);
      return section ? getSectionMeta(section) : null;
    }

    function targetMeta(element) {
      const section = currentSectionFor(element);
      const name =
        element.getAttribute("data-track-name") ||
        element.getAttribute("aria-label") ||
        element.getAttribute("name") ||
        safeText(element.textContent).slice(0, 80) ||
        element.id ||
        element.tagName.toLowerCase();

      return {
        target: safeText(name).slice(0, 120), // CloudBTL events.target
        targetId: element.id || null,
        targetTag: element.tagName.toLowerCase(),
        targetType: element.getAttribute("type") || element.getAttribute("role") || null,
        href: element.href || null,
        sectionId: section ? section.sectionId : null,
        sectionTitle: section ? section.sectionTitle : null,
        sectionIndex: section ? section.sectionIndex : null
      };
    }

    function closeSection(element, nextSectionId) {
      const active = visibleSections.get(element);
      if (!active) return;

      const durationMs = now() - active.startedAt;
      visibleSections.delete(element);
      if (durationMs < 100) return;

      enqueue("section_view", {
        ...active.meta,
        target: active.meta.sectionId, // CloudBTL events.target = 섹션 id
        durationMs,
        maxRatio: Number(active.maxRatio.toFixed(3)),
        nextSectionId: nextSectionId || null
      });
    }

    function openSection(element, ratio) {
      if (visibleSections.has(element)) {
        const active = visibleSections.get(element);
        active.maxRatio = Math.max(active.maxRatio, ratio);
        return;
      }

      const meta = getSectionMeta(element);
      visibleSections.set(element, {
        meta,
        startedAt: now(),
        maxRatio: ratio
      });
      enqueue("section_enter", {
        ...meta,
        target: meta.sectionId,
        ratio: Number(ratio.toFixed(3))
      });
    }

    function closeAllSections(nextSectionId) {
      Array.from(visibleSections.keys()).forEach((element) => closeSection(element, nextSectionId));
    }

    function observeSections() {
      const sections = Array.from(document.querySelectorAll(config.sectionSelector));
      if (!sections.length) {
        document.body.setAttribute("data-decklens-section", "document");
        sections.push(document.body);
      }

      const thresholds = [0, config.visibilityThreshold, 0.5, 0.75, 1];
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= config.visibilityThreshold) {
              openSection(entry.target, entry.intersectionRatio);
            } else {
              closeSection(entry.target);
            }
          });
        },
        { threshold: thresholds }
      );

      sections.forEach((section) => observer.observe(section));
      scanVisibleSections(sections);
    }

    function scanVisibleSections(sections) {
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        const ratio = rect.height > 0 ? Math.max(0, Math.min(1, visibleHeight / rect.height)) : 0;
        if (ratio >= config.visibilityThreshold) openSection(section, ratio);
      });
    }

    function trackAction(element, actionType, extra) {
      enqueue("action", {
        actionType,
        ...targetMeta(element),
        ...extra
      });
    }

    function bindActions() {
      document.addEventListener("click", (event) => {
        const target = event.target.closest(config.actionSelector);
        if (target) trackAction(target, "click", { x: event.clientX, y: event.clientY });
      });

      document.addEventListener(
        "pointerenter",
        (event) => {
          const target = event.target.closest(config.actionSelector);
          if (target) hoverStarts.set(target, now());
        },
        true
      );

      document.addEventListener(
        "pointerleave",
        (event) => {
          const target = event.target.closest(config.actionSelector);
          if (!target || !hoverStarts.has(target)) return;

          const durationMs = now() - hoverStarts.get(target);
          hoverStarts.delete(target);
          const lastTrackedAt = hoverCooldowns.get(target) || 0;
          if (durationMs >= 250 && now() - lastTrackedAt > 1000) {
            hoverCooldowns.set(target, now());
            trackAction(target, "hover", { durationMs });
          }
        },
        true
      );

      document.addEventListener("focusin", (event) => {
        const target = event.target.closest(config.actionSelector);
        if (target) trackAction(target, "focus", {});
      });

      document.addEventListener("input", (event) => {
        const target = event.target.closest(config.actionSelector);
        if (!target) return;
        trackAction(target, "input", {
          valueLength: typeof target.value === "string" ? target.value.length : null
        });
      });

      document.addEventListener("submit", (event) => {
        trackAction(event.target, "submit", {});
      });
    }

    function start() {
      if (started) return;
      started = true;
      enqueue("section_session_start", {
        target: "document",
        referrer: document.referrer || null,
        documentHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
      });
      const sections = Array.from(document.querySelectorAll(config.sectionSelector));
      observeSections();
      bindActions();
      setInterval(() => flush(false), config.flushInterval);

      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          closeAllSections(null);
          flush(true);
        } else {
          scanVisibleSections(sections.length ? sections : [document.body]);
        }
      });

      window.addEventListener("beforeunload", () => {
        closeAllSections(null);
        enqueue("section_session_end", { target: "document" });
        flush(true);
      });
    }

    return {
      start,
      track: enqueue,
      flush,
      closeAllSections
    };
  }

  const api = { createTracker };

  window.DeckLens = api;
  window.DeckLensAnalytics = api;
})();
