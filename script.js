const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const TRANSITION_EXIT_DURATION = 180;

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = motionQuery.matches;
  initThemeToggle();
  initPageTransitions(reduceMotion);
  document.querySelectorAll("[data-tabs]").forEach((root) => initTabs(root, reduceMotion));
  animateVisibleElements(document, { reduceMotion });
});

function initThemeToggle() {
  const buttons = document.querySelectorAll(".theme-switch");
  const storageKey = "theme-preference";
  const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const getPreferredTheme = () => localStorage.getItem(storageKey) || (systemQuery.matches ? "dark" : "light");

  const updateThemeUI = (theme) => {
    const isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", theme);
    buttons.forEach((button) => button.setAttribute("aria-checked", String(isDark)));
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute("content", isDark ? "#020813" : "#f4f7fa");
  };

  const setTheme = (theme, persist = true) => {
    updateThemeUI(theme);
    if (persist) localStorage.setItem(storageKey, theme);
  };

  updateThemeUI(getPreferredTheme());

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || getPreferredTheme();
      setTheme(current === "dark" ? "light" : "dark", true);
    });
  });

  const onSystemThemeChange = (event) => {
    if (!localStorage.getItem(storageKey)) updateThemeUI(event.matches ? "dark" : "light");
  };

  if (typeof systemQuery.addEventListener === "function") {
    systemQuery.addEventListener("change", onSystemThemeChange);
  } else if (typeof systemQuery.addListener === "function") {
    systemQuery.addListener(onSystemThemeChange);
  }
}

function initPageTransitions(reduceMotion) {
  if (reduceMotion || "startViewTransition" in document) return;

  document.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const targetUrl = new URL(link.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (targetUrl.origin !== currentUrl.origin) return;

      const sameDocumentHash = targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search && targetUrl.hash;
      if (sameDocumentHash) return;

      event.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(() => { window.location.href = targetUrl.href; }, TRANSITION_EXIT_DURATION);
    });
  });
}

function getAnimatedTargets(root) {
  return Array.from(root.querySelectorAll([
    ".home-hero", ".tab-grid", ".info-item", ".timeline-content", ".project-card",
    ".summary-image", ".pdf-actions", ".project-pager-wrapper", ".audit-card"
  ].join(",")));
}

function animateVisibleElements(root, { restart = false, reduceMotion = motionQuery.matches } = {}) {
  const targets = getAnimatedTargets(root).filter((element) => !element.closest("[hidden]"));
  if (!targets.length) return;

  if (reduceMotion) {
    targets.forEach((element) => {
      element.classList.remove("reveal-init");
      element.classList.add("is-revealed");
      element.style.removeProperty("--reveal-delay");
      element.dataset.entranceReady = "true";
    });
    return;
  }

  if (restart) {
    targets.forEach((element) => {
      element.classList.remove("reveal-init", "is-revealed");
      element.style.removeProperty("--reveal-delay");
    });
    void root.offsetWidth;
  }

  targets.forEach((element, index) => {
    if (!restart && element.dataset.entranceReady === "true" && element.classList.contains("is-revealed")) return;
    element.dataset.entranceReady = "true";
    element.classList.add("reveal-init");
    element.classList.remove("is-revealed");
    element.style.setProperty("--reveal-delay", `${Math.min(index, 6) * 35}ms`);
  });

  requestAnimationFrame(() => {
    targets.forEach((element) => element.classList.add("is-revealed"));
  });
}

function runScopeEntrance(scope, reduceMotion) {
  if (!scope) return;
  if (!reduceMotion) {
    scope.classList.remove("is-entering");
    void scope.offsetWidth;
    scope.classList.add("is-entering");
    scope.addEventListener("animationend", () => scope.classList.remove("is-entering"), { once: true });
  }
  animateVisibleElements(scope, { restart: true, reduceMotion });
}

function initTabs(root, reduceMotion) {
  const tablist = root.querySelector('[role="tablist"]');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
  if (!tabs.length || panels.some((panel) => !panel)) return;

  const normaliseHash = (value) => value.replace(/^#/, "").replace(/^tab-/, "").replace(/^panel-/, "");
  const hash = normaliseHash(window.location.hash);
  let activeIndex = tabs.findIndex((tab, index) => {
    const slug = normaliseHash(tab.id);
    const panelSlug = normaliseHash(panels[index].id);
    return hash && (hash === slug || hash === panelSlug || hash === tab.dataset.slug);
  });

  if (activeIndex < 0) {
    activeIndex = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true" || tab.classList.contains("active"));
  }
  if (activeIndex < 0) activeIndex = 0;

  let isTransitioning = false;

  const setTabButtonsState = (index) => {
    tabs.forEach((tab, tabIndex) => {
      const isActive = tabIndex === index;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });
  };

  const showOnlyPanel = (index) => {
    panels.forEach((panel, panelIndex) => {
      const isActive = panelIndex === index;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
      if (!isActive) panel.classList.remove("is-entering", "is-leaving");
    });
  };

  const writeHash = (index) => {
    const slug = tabs[index].dataset.slug || normaliseHash(tabs[index].id);
    if (!slug) return;
    const url = new URL(window.location.href);
    url.hash = slug;
    history.replaceState(null, "", url);
  };

  const activateTab = (index, moveFocus = false, initial = false) => {
    if (index < 0 || index >= tabs.length) return;
    if (!initial && index === activeIndex) {
      if (moveFocus) tabs[index].focus();
      writeHash(index);
      return;
    }
    if (!initial && isTransitioning) return;

    const nextPanel = panels[index];
    const currentPanel = panels[activeIndex];
    if (!nextPanel) return;

    if (moveFocus) tabs[index].focus();

    const commit = () => {
      setTabButtonsState(index);
      showOnlyPanel(index);
      activeIndex = index;
      if (!initial) writeHash(index);
      runScopeEntrance(nextPanel, reduceMotion);
    };

    if (initial || reduceMotion) {
      commit();
      return;
    }

    isTransitioning = true;
    if ("startViewTransition" in document) {
      const transition = document.startViewTransition(commit);
      transition.finished.finally(() => { isTransitioning = false; });
      return;
    }

    if (currentPanel) currentPanel.classList.add("is-leaving");
    window.setTimeout(() => {
      if (currentPanel) currentPanel.classList.remove("is-leaving");
      commit();
      isTransitioning = false;
    }, TRANSITION_EXIT_DURATION);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(index));
    tab.addEventListener("keydown", (event) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let nextIndex = null;
      if (event.key in keys) nextIndex = (index + keys[event.key] + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex !== null) {
        event.preventDefault();
        activateTab(nextIndex, true);
      }
    });
  });

  activateTab(activeIndex, false, true);
}
