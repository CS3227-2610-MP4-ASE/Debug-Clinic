import CloseOutlined from "@mui/icons-material/CloseOutlined";
import DragIndicatorOutlined from "@mui/icons-material/DragIndicatorOutlined";
import ForumOutlined from "@mui/icons-material/ForumOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import {
  Alert,
  Box,
  Button,
  Dialog,
  FormControlLabel,
  FormGroup,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type { PointerEvent } from "react";
import type {
  AssistantMessageRequest,
  AssistantState,
} from "@debugclinic/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AssistantRequestError,
  clearLearnerAssistant,
  getLearnerAssistant,
  reconcileLearnerAssistant,
  sendLearnerAssistant,
} from "../lib/learner-assistant.js";

type Position = { x: number; y: number };
type PendingRequest = {
  id: string;
  body:
    AssistantMessageRequest | { requestId: string; expectedRevision: number };
  kind: "message" | "clear";
};

interface LearnerAssistantPanelProps {
  exerciseId: string;
  exerciseVersionId: string;
  userId: string;
  readOnly: boolean;
  code: string;
  reasoning: string;
  output: string;
  openRequest: number;
}

const positionKey = (userId: string) =>
  `debugclinic-assistant-position:${userId}`;
const clampPosition = (position: Position): Position => ({
  x: Math.min(1, Math.max(0, position.x)),
  y: Math.min(1, Math.max(0, position.y)),
});

export function LearnerAssistantPanel(props: LearnerAssistantPanelProps) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 1, y: 1 });
  const [assistant, setAssistant] = useState<AssistantState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [shareCode, setShareCode] = useState(true);
  const [shareReasoning, setShareReasoning] = useState(false);
  const [shareOutput, setShareOutput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(
    null,
  );
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const launcher = useRef<HTMLButtonElement | null>(null);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    position: Position;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(positionKey(props.userId)) ?? "null",
      );
      if (
        saved &&
        typeof saved === "object" &&
        "x" in saved &&
        "y" in saved &&
        typeof saved.x === "number" &&
        typeof saved.y === "number"
      )
        setPosition(clampPosition(saved as Position));
    } catch {
      /* Ignore a damaged local position preference. */
    }
  }, [props.userId]);
  useEffect(() => {
    localStorage.setItem(positionKey(props.userId), JSON.stringify(position));
  }, [position, props.userId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getLearnerAssistant(props.exerciseId);
      if (result.assistant.exerciseVersionId !== props.exerciseVersionId)
        throw new Error(
          "This exercise version changed. Reload the page to continue.",
        );
      setAssistant(result.assistant);
      setError(null);
    } catch (failed) {
      setError(
        failed instanceof Error
          ? failed.message
          : "The assistant could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [props.exerciseId, props.exerciseVersionId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (props.openRequest > 0) setOpen(true);
  }, [props.openRequest]);

  const setMovedPosition = (clientX: number, clientY: number) => {
    const maxRight = Math.max(1, window.innerWidth - 64);
    const maxBottom = Math.max(1, window.innerHeight - 64);
    setPosition(
      clampPosition({ x: clientX / maxRight, y: clientY / maxBottom }),
    );
  };
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      position,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (!active.moved && Math.hypot(dx, dy) < 6) return;
    active.moved = true;
    event.preventDefault();
    setMovedPosition(event.clientX, event.clientY);
  };
  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drag.current = null;
    if (!active.moved) setOpen(true);
  };
  const moveByKeyboard = (dx: number, dy: number) => {
    const maxRight = Math.max(1, window.innerWidth - 64);
    const maxBottom = Math.max(1, window.innerHeight - 64);
    setPosition(
      clampPosition({
        x: position.x + dx / maxRight,
        y: position.y + dy / maxBottom,
      }),
    );
  };

  const send = async (action: "MESSAGE" | "NEXT_HINT") => {
    if (!assistant || busy || (action === "MESSAGE" && !draft.trim())) return;
    const body: AssistantMessageRequest = {
      requestId: crypto.randomUUID(),
      expectedRevision: assistant.revision,
      expectedExerciseVersionId: props.exerciseVersionId,
      action,
      ...(action === "MESSAGE" ? { message: draft } : {}),
      context: { shareCode, shareReasoning, shareOutput },
      ...(shareCode ? { sharedCode: props.code } : {}),
      ...(shareReasoning ? { sharedReasoning: props.reasoning } : {}),
      ...(shareOutput ? { sharedOutput: props.output } : {}),
    };
    setBusy(true);
    setError(null);
    setStatusNote(null);
    try {
      const result = await sendLearnerAssistant(props.exerciseId, body);
      setAssistant(result.assistant);
      if (action === "MESSAGE") setDraft("");
      setShareReasoning(false);
      setShareOutput(false);
      setPendingRequest(null);
    } catch (failed) {
      setError(
        failed instanceof Error
          ? failed.message
          : "Your message could not be sent.",
      );
      if (
        failed instanceof AssistantRequestError &&
        failed.outcome === "UNKNOWN"
      )
        setPendingRequest({ id: body.requestId, body, kind: "message" });
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (
      !assistant ||
      busy ||
      !window.confirm(
        "Clear this private chat? Messages and shared snapshots will be deleted. Your coaching level will stay the same.",
      )
    )
      return;
    const body = {
      requestId: crypto.randomUUID(),
      expectedRevision: assistant.revision,
    };
    setBusy(true);
    setError(null);
    setStatusNote(null);
    try {
      const result = await clearLearnerAssistant(props.exerciseId, body);
      setAssistant(result.assistant);
      setDraft("");
      setPendingRequest(null);
    } catch (failed) {
      setError(
        failed instanceof Error
          ? failed.message
          : "The chat could not be cleared.",
      );
      if (
        failed instanceof AssistantRequestError &&
        failed.outcome === "UNKNOWN"
      )
        setPendingRequest({ id: body.requestId, body, kind: "clear" });
    } finally {
      setBusy(false);
    }
  };

  const checkStatus = async () => {
    if (!pendingRequest || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await reconcileLearnerAssistant(
        props.exerciseId,
        pendingRequest.id,
      );
      if (result.status === "PENDING")
        setStatusNote(
          "This request is still processing. Check again in a moment.",
        );
      else {
        if (pendingRequest.kind === "clear" && result.status === "SUCCEEDED")
          await refresh();
        else if (result.status === "SUCCEEDED") {
          const latest = await getLearnerAssistant(props.exerciseId);
          setAssistant(latest.assistant);
          setDraft("");
          setShareReasoning(false);
          setShareOutput(false);
        } else
          setStatusNote(
            "No reply was saved. You can send the message again with a new request.",
          );
        setPendingRequest(null);
      }
    } catch (failed) {
      setError(
        failed instanceof Error
          ? failed.message
          : "The request status could not be checked.",
      );
    } finally {
      setBusy(false);
    }
  };

  const launcherStyle = {
    position: "fixed" as const,
    right: `calc(12px + (100vw - 76px) * ${1 - position.x})`,
    bottom: `calc(12px + (100dvh - 76px) * ${1 - position.y})`,
    zIndex: theme.zIndex.modal + 1,
    width: 52,
    height: 52,
    touchAction: "none" as const,
    boxShadow: theme.shadows[4],
  };

  const content = (
    <Stack
      sx={{
        height: mobile ? "100dvh" : "min(680px, calc(100dvh - 32px))",
        maxHeight: mobile ? "100dvh" : "calc(100dvh - 32px)",
        width: mobile ? "100%" : 400,
        maxWidth: "100vw",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}
      >
        <Box>
          <Typography id="assistant-dialog-title" component="h2" variant="h6">
            Debugging coach
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Level {assistant?.unlockedLevel ?? 1} of 3
          </Typography>
        </Box>
        <IconButton
          aria-label="Minimize coaching chat"
          onClick={() => {
            setOpen(false);
            requestAnimationFrame(() => launcher.current?.focus());
          }}
        >
          <CloseOutlined />
        </IconButton>
      </Stack>
      {assistant?.readOnly && (
        <Alert severity="info" sx={{ mx: 1.5, mt: 1 }}>
          This submission is final. Coaching is read-only; you can still clear
          this private chat.
        </Alert>
      )}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 1.5, py: 0.75, borderBottom: 1, borderColor: "divider" }}
      >
        <Typography variant="subtitle2">Share with the coach</Typography>
        <IconButton
          aria-label="Clear chat"
          title="Clear chat"
          onClick={() => void clear()}
          disabled={busy || loading}
        >
          <DeleteOutlineOutlined />
        </IconButton>
      </Stack>
      <FormGroup
        row
        sx={{
          px: 1.5,
          py: 0.25,
          borderBottom: 1,
          borderColor: "divider",
          flexWrap: "wrap",
        }}
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={shareCode}
              onChange={(_, checked) => setShareCode(checked)}
            />
          }
          label="Current code"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={shareReasoning}
              onChange={(_, checked) => setShareReasoning(checked)}
            />
          }
          label="Reasoning"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={shareOutput}
              onChange={(_, checked) => setShareOutput(checked)}
            />
          }
          label="Run output"
        />
      </FormGroup>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 1.75, py: 0.75 }}
      >
        {shareCode ? "Your current editor code" : "No editor code"}
        {shareReasoning ? ", your reasoning" : ""}
        {shareOutput ? ", and local run output" : ""} will be shared with this
        message. Scratch tests and standard input are never shared.
      </Typography>
      <Box
        role="log"
        aria-label="Coaching conversation"
        aria-live="polite"
        sx={{
          flex: 1,
          minHeight: 100,
          overflowY: "auto",
          px: 1.75,
          py: 1,
          borderBlock: 1,
          borderColor: "divider",
        }}
      >
        {loading ? (
          <Typography color="text.secondary">
            Loading your private chat…
          </Typography>
        ) : null}
        {!loading && assistant?.messages.length === 0 && (
          <Typography color="text.secondary">
            Ask a question about the exercise. Advice stays at your current
            level until you choose Next hint.
          </Typography>
        )}
        <Stack
          component="ol"
          spacing={1.25}
          sx={{ listStyle: "none", m: 0, p: 0 }}
        >
          {assistant?.messages.map((message) => (
            <Box
              component="li"
              key={message.id}
              sx={{ borderBottom: 1, borderColor: "divider", pb: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                {message.role === "LEARNER"
                  ? "You"
                  : `Coach · Level ${message.level}`}
                {message.context.shareCode ? " · Shared code" : ""}
                {message.context.shareReasoning ? " · Shared reasoning" : ""}
                {message.context.shareOutput ? " · Shared run output" : ""}
              </Typography>
              <Typography
                sx={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  userSelect: "text",
                }}
              >
                {message.text}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
      {error && (
        <Alert
          severity="warning"
          action={
            pendingRequest ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => void checkStatus()}
                disabled={busy}
              >
                Check status
              </Button>
            ) : undefined
          }
          sx={{ m: 1 }}
        >
          {error}
        </Alert>
      )}
      {statusNote && (
        <Typography role="status" variant="caption" sx={{ px: 1.75, pt: 0.5 }}>
          {statusNote}
        </Typography>
      )}
      <Stack spacing={1} sx={{ p: 1.5 }}>
        <TextField
          label="Message the coach"
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 2_000))}
          multiline
          minRows={2}
          maxRows={4}
          inputProps={{ maxLength: 2_000 }}
          disabled={
            loading || busy || Boolean(pendingRequest) || assistant?.readOnly
          }
        />
        <Stack direction="row" justifyContent="space-between" gap={1}>
          <Button
            variant="outlined"
            onClick={() => void send("NEXT_HINT")}
            disabled={
              loading ||
              busy ||
              Boolean(pendingRequest) ||
              assistant?.readOnly ||
              !assistant?.hasSuccessfulReply ||
              assistant.unlockedLevel >= 3
            }
          >
            Next hint
          </Button>
          <Button
            variant="contained"
            endIcon={<SendOutlined />}
            onClick={() => void send("MESSAGE")}
            disabled={
              loading ||
              busy ||
              Boolean(pendingRequest) ||
              assistant?.readOnly ||
              !draft.trim()
            }
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );

  return (
    <>
      <IconButton
        ref={launcher}
        color="primary"
        aria-label="Open debugging coach. Drag to move. Use arrow keys to move and Home to reset."
        title="Open debugging coach · drag to move · arrow keys move · Home resets"
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onClick={(event) => {
          if (event.detail === 0) setOpen(true);
        }}
        onKeyDown={(event) => {
          const delta = event.shiftKey ? 40 : 16;
          if (event.key === "Home") {
            event.preventDefault();
            setPosition({ x: 1, y: 1 });
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveByKeyboard(-delta, 0);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            moveByKeyboard(delta, 0);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveByKeyboard(0, -delta);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            moveByKeyboard(0, delta);
          }
        }}
        sx={{
          ...launcherStyle,
          opacity: open ? 0 : 1,
          pointerEvents: open ? "none" : "auto",
        }}
      >
        {drag.current ? <DragIndicatorOutlined /> : <ForumOutlined />}
      </IconButton>
      {open && mobile ? (
        <Dialog
          open
          fullScreen
          onClose={() => setOpen(false)}
          aria-labelledby="assistant-dialog-title"
          PaperProps={{
            sx: { m: 0, maxWidth: "100vw", width: "100vw", height: "100dvh" },
          }}
        >
          {content}
        </Dialog>
      ) : null}
      {open && !mobile ? (
        <Paper
          role="dialog"
          aria-label="Debugging coach"
          elevation={8}
          sx={{
            position: "fixed",
            right: 24,
            bottom: 16,
            zIndex: theme.zIndex.modal,
            borderRadius: 1.5,
            overflow: "hidden",
          }}
        >
          {content}
        </Paper>
      ) : null}
    </>
  );
}
