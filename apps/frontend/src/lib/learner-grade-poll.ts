const cadenceMs = 5_000;
const eventCooldownMs = 1_000;
const maxTimerMs = 2_147_483_647;

// The read returns a Retry-After duration when the server asks the view to wait.
export function startLearnerGradePoll(
  read: (signal: AbortSignal) => Promise<number | void>,
  active = true,
) {
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timerDue = Infinity;
  let request: AbortController | undefined;
  let lastStart = -Infinity;
  let backoffUntil = -Infinity;

  const visible = () =>
    active && !disposed && document.visibilityState === "visible";

  function clearTimer() {
    clearTimeout(timer);
    timer = undefined;
    timerDue = Infinity;
  }

  function suspend() {
    clearTimer();
    const interrupted = request;
    request = undefined;
    interrupted?.abort();
  }

  function schedule(earliest: number) {
    if (!visible() || request) return;
    const due = Math.max(earliest, backoffUntil);
    if (timer !== undefined && timerDue <= due) return;
    clearTimer();
    timerDue = due;
    timer = setTimeout(
      () => {
        clearTimer();
        if (due > performance.now()) schedule(due);
        else start();
      },
      Math.min(maxTimerMs, Math.max(0, due - performance.now())),
    );
  }

  function start() {
    if (!visible() || request) return;
    const current = new AbortController();
    request = current;
    lastStart = performance.now();
    const finish = (retryAfter?: number | void) => {
      if (request !== current) return;
      request = undefined;
      if (typeof retryAfter === "number")
        backoffUntil = performance.now() + retryAfter;
      schedule(lastStart + cadenceMs);
    };
    void read(current.signal).then(finish, () => finish());
  }

  const retry = () => schedule(lastStart + eventCooldownMs);
  const changeVisibility = () => {
    if (visible()) retry();
    else suspend();
  };
  document.addEventListener("visibilitychange", changeVisibility);
  window.addEventListener("online", retry);
  window.addEventListener("focus", retry);
  start();

  return {
    retry,
    setActive(next: boolean) {
      if (active === next) return;
      active = next;
      changeVisibility();
    },
    dispose() {
      disposed = true;
      suspend();
      document.removeEventListener("visibilitychange", changeVisibility);
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
    },
  };
}
