import { useCallback, useLayoutEffect, useRef } from "react";

import { useGradingAccess } from "../auth/GradingAdmission.js";
import { GradingRequestError } from "./grading.js";

export function useGradingRequest() {
  const { actorId, verified, deny } = useGradingAccess();
  const current = useRef<AbortController | null>(null);

  useLayoutEffect(() => {
    return () => {
      const interrupted = current.current;
      current.current = null;
      interrupted?.abort();
    };
  }, [actorId, verified]);

  return useCallback(
    <T>(
      request: (access: { actorId: string; signal: AbortSignal }) => Promise<T>,
      resolve: (value: T) => void,
      reject: (error: unknown) => void,
    ) => {
      if (!verified || current.current) return;
      const controller = new AbortController();
      current.current = controller;
      const finish = () => {
        if (current.current !== controller) return false;
        current.current = null;
        return true;
      };
      void request({ actorId, signal: controller.signal }).then(
        (value) => {
          if (finish()) resolve(value);
        },
        (error: unknown) => {
          if (!finish()) return;
          if (error instanceof GradingRequestError && error.accessDenied) {
            if (error.accessDenied === 401)
              window.dispatchEvent(new Event("debugclinic:session-expired"));
            deny(error.accessDenied);
          } else reject(error);
        },
      );
    },
    [actorId, deny, verified],
  );
}
