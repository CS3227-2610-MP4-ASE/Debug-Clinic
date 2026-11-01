import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function EmptyWorkspace({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action: string;
  icon: ReactNode;
}) {
  return (
    <Stack gap={4} maxWidth={760}>
      <Box>
        <Typography
          variant="h2"
          component="h1"
          fontSize={{ xs: "2.3rem", md: "3.5rem" }}
        >
          {title}
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          fontWeight={400}
          maxWidth="62ch"
          mt={2}
        >
          {description}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 3,
          p: { xs: 3, sm: 4 },
          bgcolor: "background.paper",
          borderRadius: 1,
          boxShadow: "0 14px 40px rgba(33, 39, 55, 0.08)",
        }}
      >
        <Box
          sx={{
            color: "primary.main",
            display: "grid",
            placeItems: "center",
            "& svg": { fontSize: 42 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" gutterBottom>
            Nothing queued yet
          </Typography>
          <Typography color="text.secondary">
            This infrastructure milestone provides the authenticated workspace.
            Exercise features arrive in a later specification.
          </Typography>
        </Box>
        <Button variant="contained" endIcon={<ArrowForwardRounded />} disabled>
          {action}
        </Button>
      </Box>
    </Stack>
  );
}
