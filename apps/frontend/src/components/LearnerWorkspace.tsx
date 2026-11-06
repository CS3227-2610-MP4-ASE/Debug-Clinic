import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import {
  LearnerOutputPanel,
  type LearnerRunnerResult,
} from "./LearnerOutputPanel.js";

const MIN_EDITOR = 320;
const MIN_OUTPUT = 120;
const MAX_EDITOR = 720;
const editorHeightLimit = () =>
  Math.max(MIN_EDITOR, Math.min(MAX_EDITOR, window.innerHeight - 400));

interface LearnerWorkspaceProps {
  code: string;
  reasoning: string;
  disabled: boolean;
  saving: boolean;
  onCodeChange: (value: string) => void;
  onReasoningChange: (value: string) => void;
  onSave: () => void;
  onSubmit: () => void;
  outputResult?: LearnerRunnerResult;
}

export function LearnerWorkspace({
  code,
  reasoning,
  disabled,
  saving,
  onCodeChange,
  onReasoningChange,
  onSave,
  onSubmit,
  outputResult,
}: LearnerWorkspaceProps) {
  const [editorHeight, setEditorHeight] = useState(() =>
    Math.max(MIN_EDITOR, Math.min(420, editorHeightLimit())),
  );
  const resizing = useRef<{ startY: number; startHeight: number } | null>(null);
  useEffect(() => {
    const resize = () =>
      setEditorHeight((height) => Math.min(height, editorHeightLimit()));
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const resizeAt = (clientY: number) => {
    const start = resizing.current;
    if (!start) return;
    setEditorHeight(
      Math.max(
        MIN_EDITOR,
        Math.min(
          editorHeightLimit(),
          start.startHeight + clientY - start.startY,
        ),
      ),
    );
  };
  return (
    <Stack
      component="section"
      aria-label="Python workspace"
      sx={{
        minWidth: 0,
        minHeight: 0,
        overflow: { xs: "visible", md: "auto" },
        display: "flex",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 0.5 }}
      >
        <Typography variant="body2" color="text.secondary">
          Python 3
        </Typography>
        <Button
          disabled
          aria-describedby="run-placeholder"
          sx={{ minHeight: 44 }}
        >
          Run
        </Button>
      </Stack>
      <Typography
        id="run-placeholder"
        variant="body2"
        color="text.secondary"
        sx={{ mb: 0.5 }}
      >
        Run is unavailable until a secure Python runner is approved.
      </Typography>
      <Stack
        gap={1}
        sx={{
          height: { md: editorHeight },
          minHeight: { md: MIN_EDITOR },
          flexShrink: 0,
          overflow: { md: "hidden" },
        }}
      >
        <TextField
          label="Your Python 3 code"
          multiline
          minRows={5}
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          inputProps={{ maxLength: 20_000, "aria-label": "Your Python 3 code" }}
          disabled={disabled}
          sx={{
            flex: { md: 1 },
            minHeight: { md: 80 },
            "& .MuiInputBase-root": {
              height: { md: "100%" },
              alignItems: "flex-start",
              overflow: "auto",
              fontFamily: "monospace",
            },
            "& textarea": {
              height: "100% !important",
              overflow: "auto !important",
            },
          }}
        />
        <TextField
          label="Explain your reasoning"
          multiline
          minRows={3}
          value={reasoning}
          onChange={(event) => onReasoningChange(event.target.value)}
          inputProps={{ maxLength: 5_000 }}
          disabled={disabled}
        />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          gap={1}
          sx={{ flexShrink: 0 }}
        >
          <Button
            variant="outlined"
            disabled={disabled || saving}
            onClick={onSave}
            sx={{ minHeight: 44 }}
          >
            Save draft
          </Button>
          <Button
            variant="contained"
            disabled={disabled || saving}
            onClick={onSubmit}
            sx={{ minHeight: 44 }}
          >
            Submit final attempt
          </Button>
        </Stack>
      </Stack>
      <Box
        role="separator"
        aria-label="Resize editor and output"
        aria-orientation="horizontal"
        aria-valuemin={MIN_EDITOR}
        aria-valuemax={editorHeightLimit()}
        aria-valuenow={editorHeight}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            setEditorHeight((value) =>
              Math.max(
                MIN_EDITOR,
                Math.min(
                  editorHeightLimit(),
                  value + (event.key === "ArrowDown" ? 24 : -24),
                ),
              ),
            );
          }
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          resizing.current = {
            startY: event.clientY,
            startHeight: editorHeight,
          };
        }}
        onPointerMove={(event) => {
          if (resizing.current && event.buttons) resizeAt(event.clientY);
        }}
        onPointerUp={() => {
          resizing.current = null;
        }}
        sx={{
          display: { xs: "none", md: "block" },
          height: 14,
          flexShrink: 0,
          cursor: "row-resize",
          touchAction: "none",
          borderBlock: 1,
          borderColor: "divider",
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
          },
        }}
      />
      <Box
        sx={{
          flex: { md: 1 },
          minHeight: { xs: MIN_OUTPUT, md: 0 },
          overflow: "auto",
        }}
      >
        <LearnerOutputPanel
          {...(outputResult ? { result: outputResult } : {})}
        />
      </Box>
    </Stack>
  );
}
