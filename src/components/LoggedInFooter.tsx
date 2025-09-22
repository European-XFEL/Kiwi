import { Stack, Divider, Typography, Tooltip } from "@mui/material";
import React, { useEffect, useState } from "react";

import { useGlobalStore } from "../store/globalAppStateStore";

const LoggedInFooter: React.FC = () => {
  const { sessionInfo, loadedScene } = useGlobalStore();

  const [connectedFor, setConnectedFor] = useState("");

  const updateConnectedFor = () => {
    const sessionStartEpoc = sessionInfo?.sessionStartEpoc;
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
          <Typography variant="body2" sx={{ pt: 1, pb: 1, pl: 1 }}>
            Topic: <b>{sessionInfo?.guiServerTopic}</b>
          </Typography>
        </span>
        <span>
          <Tooltip title={`version: ${sessionInfo?.guiServerVersion}`}>
            <Typography variant="body2">
              GUI Server:{" "}
              <b>
                {sessionInfo?.guiServerHost}:{sessionInfo?.guiServerPort}
              </b>
            </Typography>
          </Tooltip>
        </span>
        <span style={{ flexGrow: 1 }}>
          {loadedScene !== undefined ? (
            <Typography variant="body2">
              Scene size (pixels):{" "}
              {/* de-DE is used to force the group separator to be a dot */}
              <b>{loadedScene?.width.toLocaleString("de-DE")}</b> x{" "}
              <b>{loadedScene?.height.toLocaleString("de-DE")}</b>
            </Typography>
          ) : (
            <Typography variant="body2">&nbsp;</Typography>
          )}
        </span>
        <span>
          <Typography variant="body2" sx={{ pt: 1, pb: 1, pr: 1 }}>
            Connected for: <b>{connectedFor}</b>
          </Typography>
        </span>
      </Stack>
    </React.Fragment>
  );
};

export default LoggedInFooter;
