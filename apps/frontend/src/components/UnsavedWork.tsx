import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from "@mui/material";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useBlocker } from "react-router-dom";

interface DiscardState {
  setDirty: (value: boolean) => void;
  confirmDiscard: (action: () => void | Promise<void>) => void;
  clear: () => void;
}
const Context = createContext<DiscardState | null>(null);

export function UnsavedWorkProvider({ children }: PropsWithChildren) {
  const dirty = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [action, setAction] = useState<(() => void | Promise<void>) | null>(
    null,
  );
  const blocker = useBlocker(() => dirty.current);
  const stayButton = useRef<HTMLButtonElement>(null);
  const setDirty = useCallback((value: boolean) => {
    dirty.current = value;
    setIsDirty(value);
  }, []);
  const clear = useCallback(() => setDirty(false), [setDirty]);
  const confirmDiscard = useCallback((next: () => void | Promise<void>) => {
    if (dirty.current) setAction(() => next);
    else void next();
  }, []);
  useEffect(() => {
    if (!isDirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [isDirty]);
  function stay() {
    setAction(null);
    if (blocker.state === "blocked") blocker.reset();
  }
  function leave() {
    clear();
    const next = action;
    setAction(null);
    if (blocker.state === "blocked") blocker.proceed();
    else if (next) void next();
  }
  return (
    <Context.Provider value={{ setDirty, clear, confirmDiscard }}>
      {children}
      <Dialog
        open={Boolean(action) || blocker.state === "blocked"}
        onClose={stay}
        aria-describedby="discard-prompt"
        slotProps={{
          transition: { onEntered: () => stayButton.current?.focus() },
        }}
      >
        <DialogContent>
          <DialogContentText id="discard-prompt">
            You have unsaved changes. Leave and discard them?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button autoFocus ref={stayButton} onClick={stay}>
            Stay
          </Button>
          <Button onClick={leave}>Leave</Button>
        </DialogActions>
      </Dialog>
    </Context.Provider>
  );
}

export function useUnsavedWork() {
  const state = useContext(Context);
  if (!state) throw new Error("UnsavedWorkProvider is required");
  return state;
}
