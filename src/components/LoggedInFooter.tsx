import { Stack, Divider, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";

import { useAppSelector } from "../AppHooks";

const LoggedInFooter: React.FC = () => {
  const appState = useAppSelector((state) => state.globalAppState);
  const [connectedFor, setConnectedFor] = useState("");

  const updateConnectedFor = () => {
    const sessionStartEpoc = appState.sessionInfo?.sessionStartEpoc;
    let intervalMsecs = 1000;
    if (sessionStartEpoc != undefined) {
      const elapsedSecs = Math.floor((Date.now() - sessionStartEpoc) / 1000);
      let elapsedStr: string;
      if (elapsedSecs > 3599) {
        elapsedStr =
          `${Math.floor(elapsedSecs / 3600)}`.padStart(2, "0") +
          "h " +
          `${Math.floor((elapsedSecs % 3600) / 60)}`.padStart(2, "0") +
          "m";
        intervalMsecs = 60 * 1000;
      } else if (elapsedSecs > 59) {
        elapsedStr =
          `${Math.floor(elapsedSecs / 60)}`.padStart(2, "0") +
          "m " +
          `${elapsedSecs % 60}`.padStart(2, "0") +
          "s";
        intervalMsecs = 3000;
      } else {
        elapsedStr = `${elapsedSecs.toString()}`.padStart(2, "0") + "s";
      }
      setConnectedFor(elapsedStr);
    }
    setTimeout(updateConnectedFor, intervalMsecs);
  };

  useEffect(() => {
    updateConnectedFor();
  });

  return (
    <React.Fragment>
      <Divider />
      <Stack
        direction="row"
        spacing={2}
        divider={<Divider orientation="vertical" flexItem />}
        display="flex"
        sx={{
          justifyContent: "left",
          alignContent: "center",
          alignItems: "center",
        }}
      >
        <span>
          <Typography variant="body2">
            Topic: <b>{appState.sessionInfo?.guiServerTopic}</b>
          </Typography>
        </span>
        <span>
          <Typography variant="body2">
            GUI Server:{" "}
            <b>
              {appState.sessionInfo?.guiServerHost}:
              {appState.sessionInfo?.guiServerPort}
            </b>
          </Typography>
        </span>
        <span>
          <Typography variant="body2">
            GUI Server Version: <b>{appState.sessionInfo?.guiServerVersion}</b>
          </Typography>
        </span>
        <span style={{ flexGrow: 1 }}>&nbsp;</span>
        <span>
          <Typography variant="body2">
            Connected for: <b>{connectedFor}</b>
          </Typography>
        </span>
      </Stack>
    </React.Fragment>
  );
};

export default LoggedInFooter;
