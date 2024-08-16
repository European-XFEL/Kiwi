import React from "react";

import { useAppSelector } from "../AppHooks";

import { Box, CircularProgress, Container, Paper } from "@mui/material";
import { Grid } from "@mui/material";

import LoginPanel from "./LoginPanel";

const AppBody: React.FC = () => {
  const globalState = useAppSelector(
    (state) => state.globalAppState.globalState
  );
  const lastError = useAppSelector((state) => state.globalAppState.lastError);

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
  } else if (globalState === "LOGGED_IN") {
    contents = (
      <Grid container spacing={3} sx={{ mt: 1, mb: 1, flexGrow: 1 }}>
        &nsbp;
      </Grid>
    );
  } else if (globalState === "LOGGED_OUT") {
    contents = (
      <Container maxWidth="sm" sx={{ padding: "2em" }}>
        <LoginPanel />
      </Container>
    );
  } else if (globalState === "ERROR") {
    contents = (
      <Container maxWidth="sm" sx={{ padding: "2em" }}>
        <Paper
          elevation={8}
          sx={{ bgcolor: "#ee0000", color: "#ffffff", padding: "1.5em" }}
        >
          <p>Application Initialization Failure:</p>
          <h3>{lastError}</h3>
          <p>please wait a few seconds and refresh the page</p>
        </Paper>
      </Container>
    );
  }

  return contents;
};

export default AppBody;
