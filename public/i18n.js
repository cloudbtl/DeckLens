(function () {
  const dictionaries = {
    ko: {
      "nav.demo": "데모 덱",
      "nav.dashboard": "대시보드",
      "lang.toggle": "English",
      "home.eyebrow": "CloudBTL / 오픈 SDK + 호스팅 분석",
      "home.title": "모든 HTML 제안서 읽기와 상호작용을 측정합니다.",
      "home.body": "변환기와 SDK는 오픈소스로 배포하고, 실제 이벤트 수집 서버와 대시보드는 CloudBTL 호스팅으로 제공합니다.",
      "home.demo": "데모 열기",
      "home.dashboard": "대시보드 보기",
      "home.sdk.body": "`data-slide-id`, `section`, `article`, `data-track` 기반으로 섹션 체류와 액션 이벤트를 수집합니다.",
      "home.collector.body": "로컬에서는 자유롭게 테스트하고, 실서비스 데이터는 호스팅 collector로 전송합니다.",
      "home.marketer.body": "어떤 섹션을 오래 봤는지, 어떤 CTA에 hover/click/input이 있었는지 히트맵으로 보여줍니다.",
      "dashboard.title": "행동 분석 대시보드",
      "dashboard.body": "페이지와 섹션 체류, 클릭, hover, 입력, 제출 이벤트를 로컬 collector에서 바로 확인합니다.",
      "dashboard.openDemo": "데모 열기",
      "dashboard.clear": "로컬 데이터 초기화",
      "dashboard.empty": "아직 수집된 데이터가 없습니다.",
      "dashboard.emptySections": "아직 수집된 섹션 체류 데이터가 없습니다.",
      "dashboard.emptyPaths": "아직 세션 이동 경로가 없습니다.",
      "demo.cover.body": "HTML 제안서를 보는 순서, 체류 시간, 클릭 행동까지 자동 측정합니다.",
      "demo.cover.cta": "데모 시작",
      "demo.problem.title": "제안서는 보내지만, 어디서 설득됐는지 모릅니다.",
      "demo.problem.attention": "관심 구간",
      "demo.problem.dropoff": "이탈 구간",
      "demo.problem.question": "질문 발생",
      "demo.solution.title": "HTML 제안서에 GA처럼 붙는 분석 SDK",
      "demo.solution.slider": "관여도 시뮬레이션",
      "demo.solution.submit": "후속 미팅 요청",
      "demo.solution.dashboard": "분석 대시보드 보기",
      "demo.business.title": "변환기는 오픈소스, 데이터 수집 서버는 호스팅",
      "demo.business.body": "로컬 테스트는 자유롭게. 실제 고객 행동 데이터를 모으려면 직접 구축하거나 CloudBTL 호스팅 collector를 사용합니다.",
      "demo.business.export": "리포트 내보내기",
      "demo.long.title": "긴 HTML 제안서도 섹션 단위로 체류 시간을 나눠 봅니다.",
      "demo.long.body": "슬라이드형 페이지뿐 아니라 아래로 긴 랜딩 페이지, 제안서, 브로슈어에서도 각 섹션이 얼마 동안 보였는지 수집합니다. CTA hover와 클릭은 액션 테이블에 따로 집계됩니다.",
      "demo.long.primary": "관심 있음",
      "demo.long.secondary": "나중에 보기"
    }
  };

  function requestedLanguage() {
    const query = new URLSearchParams(location.search).get("lang");
    if (query) return query.toLowerCase();
    return localStorage.getItem("decklens:lang") || "en";
  }

  function setLanguage(language) {
    const normalized = language === "ko" ? "ko" : "en";
    localStorage.setItem("decklens:lang", normalized);
    document.documentElement.lang = normalized;
    document.documentElement.dataset.lang = normalized;
    applyTranslations(normalized);
    window.dispatchEvent(new CustomEvent("decklens:languagechange", { detail: { language: normalized } }));
  }

  function translate(key, fallback) {
    const lang = document.documentElement.dataset.lang || requestedLanguage();
    return dictionaries[lang] && dictionaries[lang][key] ? dictionaries[lang][key] : fallback || key;
  }

  function applyTranslations(language) {
    const dictionary = dictionaries[language] || {};

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (dictionary[key]) element.textContent = dictionary[key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      if (dictionary[key]) element.setAttribute("placeholder", dictionary[key]);
    });

    document.querySelectorAll("[data-lang-toggle]").forEach((element) => {
      element.textContent = language === "ko" ? translate("lang.toggle", "English") : "한국어";
      element.setAttribute("href", language === "ko" ? "?lang=en" : "?lang=ko");
    });
  }

  window.DeckLensI18n = {
    setLanguage,
    t: translate,
    get language() {
      return document.documentElement.dataset.lang || "en";
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const language = requestedLanguage() === "ko" ? "ko" : "en";
    setLanguage(language);

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-lang-toggle]");
      if (!toggle) return;
      event.preventDefault();
      setLanguage(window.DeckLensI18n.language === "ko" ? "en" : "ko");
    });
  });
})();
