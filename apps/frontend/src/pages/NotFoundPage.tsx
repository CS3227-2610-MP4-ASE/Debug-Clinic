import SearchOffOutlined from "@mui/icons-material/SearchOffOutlined";
import { Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function NotFoundPage() {
  return (
    <Stack alignItems="flex-start" gap={2} maxWidth={620}>
      <SearchOffOutlined color="primary" sx={{ fontSize: 48 }} />
      <Typography variant="h2" component="h1">
        That page is not part of this exercise
      </Typography>
      <Typography color="text.secondary" variant="h6" fontWeight={400}>
        Check the address or return to the DebugClinic home page.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Return home
      </Button>
    </Stack>
  );
}
