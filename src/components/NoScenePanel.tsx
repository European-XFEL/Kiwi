import { FolderOutlined } from "@mui/icons-material";
import { Box, Divider, IconButton, Stack, Typography } from "@mui/material";
import React from "react";
import { useAppSelector } from "../AppHooks";
import { useNavigate } from "react-router-dom";
import { RecentSceneModel } from "../view_models/RecentScenesModel";
import { RecentScenesByUser } from "../view_models/RecentScenesModel";

const NoScenePanel: React.FC = () => {
  const recenteScenesState = useAppSelector((state) => state.recentScenes);
  const appState = useAppSelector((state) => state.globalAppState);
  const navigate = useNavigate();

  document.title = "Kiwi";

  return (
    <Stack
      direction="row"
      sx={{ flexGrow: 1, alignItems: "center" }}
      display="flex"
    >
      <Box sx={{ flexGrow: 1 }} />
      <Stack direction="column" spacing={"0.5em"} justifyContent="left">
        <Typography variant="h5">Kiwi</Typography>
        <Typography variant="body1">
          View Karabo scenes in the browser
        </Typography>
        <Divider />
        <Box height={"0.1em"} />
        <Typography variant="h6">Recent Scenes</Typography>
        <Typography variant="body2">
          To reload a recent scene, click on the icon to the left of its name
        </Typography>
        <Divider />
        {recenteScenesState.recentScenes.find(
          (scenes: RecentScenesByUser) =>
            scenes.userId === appState.sessionInfo!.loggedUser
        ) === undefined ? (
          <Typography variant="body2" fontWeight={"bold"}>
            [No recent scene yet]
          </Typography>
        ) : (
          recenteScenesState.recentScenes
            .find(
              (scenes: RecentScenesByUser) =>
                scenes.userId === appState.sessionInfo!.loggedUser
            )!
            .scenes.map((recentScene: RecentSceneModel) => (
              <Typography
                variant="body1"
                component="div"
                key={`${recentScene.domain}::${recentScene.uuid}`}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <IconButton
                    color="primary"
                    onClick={() => {
                      navigate(
                        `/scene?host=${
                          appState.sessionInfo!.guiServerHost
                        }&port=${
                          appState.sessionInfo!.guiServerPort
                        }&domain=${encodeURIComponent(
                          recentScene.domain
                        )}&projectName=${encodeURIComponent(
                          recentScene.projectName
                        )}&uuid=${encodeURIComponent(recentScene.uuid)}`,
                        { replace: true }
                      );
                    }}
                  >
                    <FolderOutlined />
                  </IconButton>
                  <span>
                    {recentScene.name}
                    <Typography variant="caption">
                      &nbsp;- project {recentScene.domain}::
                      {recentScene.projectName}
                    </Typography>
                  </span>
                </Stack>
              </Typography>
            ))
        )}
        <Box height={"0.1em"} />
        <Typography variant="h6">Scene Bookmarks</Typography>
        <Box width={"44em"}>
          <Typography variant="body2">
            Bookmarking the Kiwi page with a scene is all that is needed to
            display that scene again later.
            <br />
            &nbsp;
            <br />
            Whenever a scene is being displayed, the URL in the address bar of
            your browser will contain all the information Kiwi needs to locate
            and display the scene.
          </Typography>
        </Box>
        <Divider />
      </Stack>
      <Box sx={{ flexGrow: 1 }} />
    </Stack>
  );
};
export default NoScenePanel;
