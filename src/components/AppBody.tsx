import React from "react";

import { Box, CircularProgress, Container, Paper, Stack } from "@mui/material";
import { useGlobalStore } from "../store/globalAppStateStore";

import LoginPanel from "./LoginPanel";
import LoggedInHeader from "./LoggedInHeader";
import LoggedOutHeader from "./LoggedOutHeader";
import LoggedInFooter from "./LoggedInFooter";
import { Outlet } from "react-router-dom";

const AppBody: React.FC = () => {
  const globalState = useGlobalStore((s) => s.globalState);
  const lastError = useGlobalStore((s) => s.lastError);

  let contents = <div></div>;
  if (globalState === "INIT") {
    contents = (
      <Container maxWidth="sm" sx={{ padding: "2em" }}>
        <Paper
          elevation={8}
          sx={{
            padding: "1.5em",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <CircularProgress />
          <Box sx={{ flexGrow: 1 }}>Initializing application ...</Box>
        </Paper>
      </Container>
    );
  } else if (globalState === "LOGGED_OUT") {
    contents = (
      <Container maxWidth="sm">
        <LoggedOutHeader />
        <LoginPanel />
      </Container>
    );
  } else if (globalState === "UNRECOVERABLE_ERROR") {
    contents = (
      <Container maxWidth="sm" sx={{ padding: "2em" }}>
        <LoggedOutHeader />
        <Paper
          elevation={8}
          sx={{ bgcolor: "#ee0000", color: "#ffffff", padding: "1.5em" }}
        >
          <h4>Application Error:</h4>
          <h3>{lastError}</h3>
          <p>Please wait a few seconds and refresh this page</p>
        </Paper>
      </Container>
    );
  } else {
    contents = (
      <Stack
        direction="column"
        display="flex"
        sx={{ height: "100%", pt: 0, pb: 0 }}
      >
        <LoggedInHeader />
        <Outlet />
        <LoggedInFooter />
      </Stack>
    );
  }

  return contents;
};

export default AppBody;
