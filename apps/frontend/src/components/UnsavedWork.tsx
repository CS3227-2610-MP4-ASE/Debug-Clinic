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

type DiscardAction = () => void | boolean | Promise<void | boolean>;
interface DiscardState {
  setDirty: (value: boolean, owner?: string) => void;
  confirmDiscard: (action: DiscardAction) => void;
  clear: () => void;
}
const Context = createContext<DiscardState | null>(null);

export function UnsavedWorkProvider({ children }: PropsWithChildren) {
  const dirty = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [action, setAction] = useState<DiscardAction | null>(null);
  const registration = useRef(0);
  const owner = useRef<string | null>(null);
  const blocker = useBlocker(() => dirty.current);
  const stayButton = useRef<HTMLButtonElement>(null);
  const setDirty = useCallback((value: boolean, nextOwner?: string) => {
    if (nextOwner !== undefined) {
      if (!value && owner.current !== null && owner.current !== nextOwner)
        return;
      owner.current = nextOwner;
    }
    registration.current += 1;
    dirty.current = value;
    setIsDirty(value);
  }, []);
  const clear = useCallback(() => setDirty(false), [setDirty]);
  const confirmDiscard = useCallback((next: DiscardAction) => {
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
    const suspendedRegistration = registration.current;
    const next = action;
    setAction(null);
    if (blocker.state === "blocked") blocker.proceed();
    else if (next) {
      // Failed explicit actions keep the admitted editor mounted. Restore its
      // guard unless disposal/new registration has already replaced that work.
      void Promise.resolve()
        .then(next)
        .then((result) => {
          if (
            result === false &&
            registration.current === suspendedRegistration
          )
            setDirty(true);
        })
        .catch(() => {
          if (registration.current === suspendedRegistration) setDirty(true);
        });
    }
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
