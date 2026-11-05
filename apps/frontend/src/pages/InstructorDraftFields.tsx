import { Alert, Box, Stack, TextField, Typography } from "@mui/material";
import type { QuestionFields } from "@debugclinic/contracts";

const fields: {
  key: keyof QuestionFields;
  label: string;
  code?: boolean;
  maximum: number;
}[] = [
  { key: "title", label: "Title", maximum: 120 },
  { key: "problemStatement", label: "Problem statement", maximum: 2000 },
  { key: "buggyCode", label: "Buggy Python code", code: true, maximum: 4000 },
  { key: "expectedBehavior", label: "Expected behavior", maximum: 1500 },
  { key: "bugExplanation", label: "Bug explanation", maximum: 2000 },
  {
    key: "correctedSolution",
    label: "Corrected solution",
    code: true,
    maximum: 4000,
  },
];

type Props = {
  value: QuestionFields;
  disabled?: boolean;
  errors?: Partial<Record<keyof QuestionFields, string>>;
  onChange?: (key: keyof QuestionFields, value: string) => void;
};

export function InstructorDraftFields({
  value,
  disabled,
  errors,
  onChange,
}: Props) {
  return (
    <Stack gap={3} minWidth={0}>
      <Alert severity="warning">
        Unverified instructor draft. Review every field before using this
        content.
      </Alert>
      <Typography color="text.secondary">
        Bug explanation and corrected solution are instructor-only.
      </Typography>
      {fields.map((field) =>
        onChange ? (
          <TextField
            key={field.key}
            label={field.label}
            value={value[field.key]}
            onChange={(event) => onChange(field.key, event.target.value)}
            disabled={disabled}
            required
            multiline
            minRows={field.code ? 4 : field.key === "title" ? 1 : 2}
            error={Boolean(errors?.[field.key])}
            helperText={
              errors?.[field.key] ?? `Maximum ${field.maximum} characters.`
            }
            slotProps={{
              input: { sx: field.code ? { fontFamily: "monospace" } : {} },
            }}
          />
        ) : (
          <Box key={field.key} minWidth={0}>
            <Typography component="h2" variant="h6" gutterBottom>
              {field.label}
            </Typography>
            <Box
              component={field.code ? "pre" : "p"}
              sx={{
                m: 0,
                p: field.code ? 2 : 0,
                bgcolor: field.code ? "background.paper" : undefined,
                borderRadius: 1,
                fontFamily: field.code ? "monospace" : "inherit",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                maxWidth: "100%",
              }}
            >
              {value[field.key]}
            </Box>
          </Box>
        ),
      )}
    </Stack>
  );
}
