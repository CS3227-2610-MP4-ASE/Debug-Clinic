import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import PsychologyOutlined from "@mui/icons-material/PsychologyOutlined";
import RuleOutlined from "@mui/icons-material/RuleOutlined";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const steps = [
  {
    icon: <RuleOutlined />,
    color: "primary.main",
    title: "Propose and explain",
    body: "Learners will change the Python code and state why the fix addresses the bug.",
  },
  {
    icon: <PsychologyOutlined />,
    color: "primary.main",
    title: "Request focused coaching",
    body: "They will receive one approved hint stage based on the current attempt.",
  },
  {
    icon: <FactCheckOutlined />,
    color: "primary.main",
    title: "Submit for human review",
    body: "An instructor will make the decision and leave the final comment.",
  },
];

export function HomePage() {
  return (
    <Stack gap={{ xs: 7, md: 10 }}>
      <Box sx={{ maxWidth: 850, pt: { md: 4 } }}>
        <Typography
          variant="h1"
          fontSize={{ xs: "3rem", sm: "4.6rem", md: "5.7rem" }}
          lineHeight={0.98}
          maxWidth="12ch"
        >
          Debug Python without surrendering the thinking.
        </Typography>
        <Typography
          variant="h5"
          component="p"
          color="text.secondary"
          fontWeight={400}
          maxWidth="65ch"
          mt={3}
          lineHeight={1.55}
        >
          DebugClinic is built around instructor-verified exercises and
          progressive AI coaching. This milestone provides the secure
          application foundation; exercise practice and review arrive in later
          specifications.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2} mt={4}>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardRounded />}
          >
            Create an account
          </Button>
          <Button
            component={RouterLink}
            to="/sign-in"
            variant="outlined"
            size="large"
          >
            Sign in
          </Button>
        </Stack>
      </Box>
      <Box component="section" aria-labelledby="practice-flow-title">
        <Typography
          id="practice-flow-title"
          variant="h2"
          fontSize={{ xs: "2rem", md: "2.8rem" }}
          mb={4}
        >
          The intended practice loop keeps authority clear
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: { xs: 4, md: 6 },
          }}
        >
          {steps.map((step) => (
            <Box key={step.title}>
              <Box
                sx={{
                  color: step.color,
                  mb: 2,
                  "& svg": { fontSize: 36 },
                }}
              >
                {step.icon}
              </Box>
              <Typography variant="h5" component="h3" gutterBottom>
                {step.title}
              </Typography>
              <Typography color="text.secondary" maxWidth="38ch">
                {step.body}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Stack>
  );
}
