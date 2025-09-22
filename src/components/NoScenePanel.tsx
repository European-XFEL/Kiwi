import { FolderOutlined, DeleteOutline } from "@mui/icons-material";
import { Box, Divider, IconButton, Stack, Typography } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import { RecentSceneModel } from "../view_models/RecentScenesModel";
import { useGlobalStore } from "../store/globalAppStateStore";
import useRecentStore from "../store/recentScenesStore";

const NoScenePanel: React.FC = () => {
  const { sessionInfo } = useGlobalStore();
  const { getRecentScenesForUser, removeRecentScene } = useRecentStore();
  const navigate = useNavigate();

  document.title = "Kiwi";

  const loggedUser = sessionInfo?.loggedUser ?? null;

  // Get this user's recent scenes using the selector function
  const userScenes: RecentSceneModel[] = loggedUser
    ? getRecentScenesForUser(loggedUser)
    : [];

  const handleSceneClick = (recentScene: RecentSceneModel) => {
    navigate(
      `/scene?host=${sessionInfo!.guiServerHost}` +
        `&port=${sessionInfo!.guiServerPort}` +
        `&domain=${encodeURIComponent(recentScene.domain)}` +
        `&projectName=${encodeURIComponent(recentScene.projectName)}` +
        `&uuid=${encodeURIComponent(recentScene.uuid)}`,
      { replace: true }
    );
  };

  const handleRemoveScene = (recentScene: RecentSceneModel) => {
    if (loggedUser) {
      removeRecentScene(loggedUser, {
        domain: recentScene.domain,
        uuid: recentScene.uuid,
      });
    }
  };

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
          To reload a recent scene, click on the folder icon. To remove a scene
          from this list, click the delete icon.
        </Typography>
        <Divider />
        {!loggedUser || userScenes.length === 0 ? (
          <Typography variant="body2" fontWeight={"bold"}>
            [No recent scene yet]
          </Typography>
        ) : (
          userScenes.map((recentScene: RecentSceneModel) => (
            <Typography
              variant="body1"
              component="div"
              key={`${recentScene.domain}::${recentScene.uuid}`}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <IconButton
                  color="primary"
                  onClick={() => handleSceneClick(recentScene)}
                  disabled={!sessionInfo}
                  title="Open scene"
                >
                  <FolderOutlined />
                </IconButton>
                <IconButton
                  color="secondary"
                  onClick={() => handleRemoveScene(recentScene)}
                  title="Remove from recent scenes"
                  size="small"
                >
                  <DeleteOutline />
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
