import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { PythonCodeEditor } from "./PythonCodeEditor.js";
import {
  startPythonRun,
  type PythonOutputChannel,
  type PythonRunMode,
  type PythonRunState,
} from "../python/sandboxed-runner.js";

const MIN_EDITOR = 180;
const MAX_EDITOR = 640;
const TEST_LIMIT = 10_000;
const STDIN_LIMIT = 8_000;

interface LearnerWorkspaceProps {
  code: string;
  reasoning: string;
  disabled: boolean;
  saving: boolean;
  onCodeChange: (value: string) => void;
  onReasoningChange: (value: string) => void;
  onOutputChange: (value: string) => void;
  onSave: () => void;
  onSubmit: () => void;
}

const maxEditorHeight = (viewportHeight: number) =>
  Math.max(MIN_EDITOR, Math.min(MAX_EDITOR, viewportHeight - 420));
const clampEditorHeight = (height: number, viewportHeight: number) =>
  Math.max(MIN_EDITOR, Math.min(maxEditorHeight(viewportHeight), height));
const initialHeight = (viewportHeight: number) =>
  clampEditorHeight(Math.min(320, viewportHeight * 0.38), viewportHeight);

export function LearnerWorkspace({
  code,
  reasoning,
  disabled,
  saving,
  onCodeChange,
  onReasoningChange,
  onOutputChange,
  onSave,
  onSubmit,
}: LearnerWorkspaceProps) {
  const [viewportHeight, setViewportHeight] = useState(
    () => window.innerHeight,
  );
  const [editorHeight, setEditorHeight] = useState(() =>
    initialHeight(viewportHeight),
  );
  const [scratchTests, setScratchTests] = useState("");
  const [stdin, setStdin] = useState("");
  const [runState, setRunState] = useState<PythonRunState | "idle">("idle");
  const [runMessage, setRunMessage] = useState("");
  const [lastMode, setLastMode] = useState<PythonRunMode>("run");
  const [output, setOutput] = useState<Record<PythonOutputChannel, string>>({
    stdout: "",
    stderr: "",
    notice: "",
  });
  useEffect(() => {
    onOutputChange(
      [output.stdout, output.stderr, output.notice].filter(Boolean).join("\n"),
    );
  }, [onOutputChange, output]);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const stopRun = useRef<(() => void) | null>(null);
  const dragStart = useRef<{ y: number; height: number } | null>(null);

  useEffect(() => () => stopRun.current?.(), []);
  useEffect(() => {
    const handleResize = () => {
      const nextViewportHeight = window.innerHeight;
      setViewportHeight(nextViewportHeight);
      setEditorHeight((height) =>
        clampEditorHeight(height, nextViewportHeight),
      );
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    if (disabled) stopRun.current?.();
  }, [disabled]);

  const changedSinceRun =
    snapshot !== null &&
    snapshot !== JSON.stringify([code, scratchTests, stdin]);
  const active = runState === "loading" || runState === "running";
  const run = (mode: PythonRunMode) => {
    stopRun.current?.();
    setLastMode(mode);
    setOutput({ stdout: "", stderr: "", notice: "" });
    setRunMessage("");
    setSnapshot(JSON.stringify([code, scratchTests, stdin]));
    stopRun.current = startPythonRun({
      code,
      tests: scratchTests,
      stdin,
      mode,
      onState: (state: PythonRunState, message) => {
        setRunState(state);
        setRunMessage(message ?? "");
        if (
          state === "completed" ||
          state === "error" ||
          state === "stopped" ||
          state === "timeout"
        ) {
          stopRun.current = null;
        }
      },
      onOutput: (channel, text) =>
        setOutput((current) => ({
          ...current,
          [channel]: current[channel] + text,
        })),
    });
  };
  const resize = (delta: number) =>
    setEditorHeight((current) =>
      clampEditorHeight(current + delta, viewportHeight),
    );

  return (
    <Stack
      component="section"
      aria-label="Python workspace"
      gap={1}
      sx={{
        minWidth: 0,
        minHeight: 0,
        overflow: { xs: "visible", md: "auto" },
        pb: { md: 1 },
        // MUI's blue field border already provides visible keyboard focus.
        "& .MuiOutlinedInput-input:focus-visible": {
          outline: "none",
          boxShadow: "none",
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
      >
        <Typography variant="body2" color="text.secondary">
          Python 3 · Local browser run
        </Typography>
        <Stack direction="row" gap={0.75}>
          {active ? (
            <Button
              color="error"
              variant="outlined"
              onClick={() => stopRun.current?.()}
              sx={{ minHeight: 40 }}
            >
              Stop
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                disabled={disabled}
                onClick={() => run("test")}
                sx={{ minHeight: 40 }}
              >
                Test
              </Button>
              <Button
                variant="contained"
                disabled={disabled}
                onClick={() => run("run")}
                sx={{ minHeight: 40 }}
              >
                Run
              </Button>
            </>
          )}
        </Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Runs in an isolated browser sandbox. Results are local feedback, not
        official grading. Scratch tests and stdin stay on this device and are
        never saved or submitted.
      </Typography>
      <Box
        sx={{
          height: { xs: 320, md: editorHeight },
          minHeight: { xs: 240, md: MIN_EDITOR },
          flexShrink: 0,
        }}
      >
        <PythonCodeEditor
          value={code}
          disabled={disabled}
          onChange={onCodeChange}
        />
      </Box>
      <Stack
        role="separator"
        aria-label="Resize editor and output"
        aria-orientation="horizontal"
        aria-valuemin={MIN_EDITOR}
        aria-valuemax={maxEditorHeight(viewportHeight)}
        aria-valuenow={editorHeight}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            resize(event.key === "ArrowDown" ? 24 : -24);
          }
        }}
        onPointerDown={(event) => {
          dragStart.current = { y: event.clientY, height: editorHeight };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragStart.current)
            setEditorHeight(
              clampEditorHeight(
                dragStart.current.height + event.clientY - dragStart.current.y,
                viewportHeight,
              ),
            );
        }}
        onPointerUp={() => {
          dragStart.current = null;
        }}
        sx={{
          display: { xs: "none", md: "flex" },
          height: 12,
          flexShrink: 0,
          cursor: "row-resize",
          touchAction: "none",
          borderBlock: 1,
          borderColor: "divider",
          alignItems: "center",
          justifyContent: "center",
          "&::after": {
            content: '""',
            width: 48,
            height: 4,
            borderRadius: 2,
            bgcolor: "text.disabled",
          },
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
          },
        }}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "minmax(0, 3fr) minmax(160px, 2fr)",
          },
          gap: 1,
        }}
      >
        <TextField
          label="Scratch tests (not saved)"
          multiline
          minRows={2}
          maxRows={3}
          value={scratchTests}
          onChange={(event) =>
            setScratchTests(event.target.value.slice(0, TEST_LIMIT))
          }
          disabled={disabled || active}
          inputProps={{
            maxLength: TEST_LIMIT,
            "aria-label": "Scratch tests (not saved)",
          }}
        />
        <TextField
          label="Standard input (not saved)"
          multiline
          minRows={2}
          maxRows={3}
          value={stdin}
          onChange={(event) =>
            setStdin(event.target.value.slice(0, STDIN_LIMIT))
          }
          disabled={disabled || active}
          inputProps={{
            maxLength: STDIN_LIMIT,
            "aria-label": "Standard input (not saved)",
          }}
        />
      </Box>
      <TextField
        label="Explain your reasoning"
        multiline
        minRows={2}
        maxRows={3}
        value={reasoning}
        onChange={(event) => onReasoningChange(event.target.value)}
        inputProps={{ maxLength: 5_000 }}
        disabled={disabled}
      />
      <Box
        component="section"
        aria-labelledby="python-output-title"
        sx={{
          minHeight: { xs: 120, md: 112 },
          p: 1.25,
          border: 1,
          borderColor: "divider",
          borderRadius: 1.5,
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          sx={{ mb: 0.75 }}
        >
          <Typography
            id="python-output-title"
            component="h2"
            variant="subtitle2"
          >
            Output
          </Typography>
          <Typography
            role="status"
            aria-live="polite"
            variant="caption"
            color={
              runState === "error" || runState === "timeout"
                ? "error.main"
                : "text.secondary"
            }
          >
            {runState === "idle"
              ? "Ready"
              : runState === "loading"
                ? "Loading Python…"
                : runState === "running"
                  ? "Running…"
                  : runState === "completed"
                    ? lastMode === "test"
                      ? "Scratch tests completed"
                      : "Completed"
                    : runState === "timeout"
                      ? "Timed out"
                      : runState === "stopped"
                        ? "Stopped"
                        : "Error"}
          </Typography>
        </Stack>
        {runMessage && (
          <Typography
            role="alert"
            variant="body2"
            color="error.main"
            sx={{ mb: 0.5 }}
          >
            {runMessage}
          </Typography>
        )}
        {changedSinceRun && (
          <Typography variant="caption" color="warning.dark" display="block">
            Inputs changed since this run; output is from an earlier snapshot.
          </Typography>
        )}
        <Box
          component="pre"
          aria-label="Python output"
          sx={{
            m: 0,
            maxHeight: 150,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "0.82rem",
          }}
        >
          {output.stdout || output.stderr || output.notice ? (
            <>
              {output.stdout && (
                <Box component="span" sx={{ color: "text.primary" }}>
                  {output.stdout}
                </Box>
              )}
              {output.stderr && (
                <Box component="span" sx={{ color: "error.main" }}>
                  {output.stderr}
                </Box>
              )}
              {output.notice && (
                <Box component="span" sx={{ color: "text.secondary" }}>
                  {output.notice}
                </Box>
              )}
            </>
          ) : (
            <Typography component="span" variant="body2" color="text.secondary">
              {runState === "completed"
                ? lastMode === "test"
                  ? "Scratch tests completed. No output was printed."
                  : "The program completed without printing output."
                : "Run your code to see local output."}
            </Typography>
          )}
        </Box>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
        <Button
          variant="outlined"
          disabled={disabled || saving || active}
          onClick={onSave}
          sx={{ minHeight: 44 }}
        >
          Save draft
        </Button>
        <Button
          variant="contained"
          disabled={disabled || saving || active}
          onClick={onSubmit}
          sx={{ minHeight: 44 }}
        >
          Submit final attempt
        </Button>
      </Stack>
    </Stack>
  );
}
