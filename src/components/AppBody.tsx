import React from "react";

import { useAppSelector } from "../AppHooks";

import { Box, CircularProgress, Container, Paper, Stack } from "@mui/material";

import LoginPanel from "./LoginPanel";
import LoggedInHeader from "./LoggedInHeader";
import LoggedOutHeader from "./LoggedOutHeader";
import LoggedInFooter from "./LoggedInFooter";
import WelcomePage from "./WelcomePage";
import SceneCanvas from "./SceneCanvas";

const AppBody: React.FC = () => {
  const globalState = useAppSelector(
    (state) => state.globalAppState.globalState
  );
  const lastError = useAppSelector((state) => state.globalAppState.lastError);
  const loadedScene = useAppSelector(
    (state) => state.globalAppState.loadedScene
  );

  const renderLoggedInBody = () => {
    if (loadedScene == undefined) {
      return <WelcomePage />;
    }
    return <SceneCanvas />;
  };

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
      <Stack direction="column" display="flex" sx={{ height: "100%" }}>
        <LoggedInHeader />
        {renderLoggedInBody()}
        <LoggedInFooter />
      </Stack>
    );
  } else if (globalState === "LOGGED_OUT") {
    contents = (
      <Container maxWidth="sm">
        <LoggedOutHeader />
        <LoginPanel />
      </Container>
    );
  } else if (globalState === "ERROR") {
    contents = (
      <Container maxWidth="sm" sx={{ padding: "2em" }}>
        <LoggedOutHeader />
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
