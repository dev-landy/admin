const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const TRANSITION_DURATION_MS = 350;

let revision = 0;
let active: ViewTransition | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

function clearTransitionTimer() {
  if (cleanupTimer !== null) clearTimeout(cleanupTimer);
  cleanupTimer = null;
}

/** Changes palette without replacing any of the live page, forms or portals. */
export function transitionTheme(update: () => void, animate: boolean) {
  const current = ++revision;
  active?.skipTransition();
  active = null;
  clearTransitionTimer();
  const root = document.documentElement;
  root.style.setProperty("--admin-theme-transition-duration", `${TRANSITION_DURATION_MS}ms`);
  let applied = false;
  const apply = () => {
    if (current !== revision || applied) return;
    applied = true;
    update();
  };
  const cleanup = () => {
    if (current !== revision) return;
    active = null;
    clearTransitionTimer();
    delete root.dataset.adminThemeTransition;
  };
  const colors = () => {
    root.dataset.adminThemeTransition = "colors";
    // Establish the shared transition rule before changing CSS variables.
    void getComputedStyle(root).transitionDuration;
    apply();
    cleanupTimer = setTimeout(cleanup, TRANSITION_DURATION_MS);
  };

  if (!animate) {
    cleanup();
    apply();
    return;
  }
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
    root.dataset.adminThemeTransition = "instant";
    apply();
    // Keep transitions suppressed through the browser's next style update.
    cleanupTimer = setTimeout(cleanup, 0);
    return;
  }
  if (typeof document.startViewTransition !== "function") {
    colors();
    return;
  }

  root.dataset.adminThemeTransition = "snapshot";
  try {
    const transition = document.startViewTransition(apply);
    active = transition;
    // Skipping an old transition rejects ready; consume every lifecycle promise.
    void transition.ready.catch(apply);
    void transition.updateCallbackDone.catch(() => { apply(); cleanup(); });
    void transition.finished.then(cleanup, () => { apply(); cleanup(); });
  } catch {
    colors();
  }
}

/** Invalidates callbacks when the last provider leaves the page. */
export function cancelThemeTransition() {
  revision += 1;
  active?.skipTransition();
  active = null;
  clearTransitionTimer();
  delete document.documentElement.dataset.adminThemeTransition;
}
