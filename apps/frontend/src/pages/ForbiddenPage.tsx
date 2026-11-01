import LockOutlined from "@mui/icons-material/LockOutlined";
import { Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function ForbiddenPage() {
  return (
    <Stack alignItems="flex-start" gap={2} maxWidth={620}>
      <LockOutlined color="primary" sx={{ fontSize: 48 }} />
      <Typography variant="h2" component="h1">
        This workspace belongs to another role
      </Typography>
      <Typography color="text.secondary" variant="h6" fontWeight={400}>
        Your account is valid, but it does not have permission to open this
        route.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Return home
      </Button>
    </Stack>
  );
}
