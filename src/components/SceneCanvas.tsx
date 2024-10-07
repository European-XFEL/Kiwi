import { Box, Paper } from "@mui/material";
import React from "react";
import { useLocation } from "react-router-dom";
import { ProjectSceneCache } from "../store/ProjectSceneCache";
import { ProjectSceneInfo } from "../karabo_data/ProjectDbInfo";
import { useAppDispatch, useAppSelector } from "../AppHooks";
import { setLoadedScene } from "../store/slices/loadedSceneSlice";
import { setRecentScene } from "../store/slices/recentScenesSlice";
import { UserRecentSceneModel } from "../view_models/RecentScenesModel";
import { Scene } from "../karabo_data/Scene";

const SceneCanvas: React.FC = () => {
  const location = useLocation();
  const [scene, setScene] = React.useState<Scene | null>(null);

  // The current GUI Session data, more specifically, the logged user is needed
  // for registering the use of the scene.
  const appState = useAppSelector((state) => state.globalAppState);

  // The scene canvas dispatches setProjectSceneOpening actions whenever an URL
  // designating a scene is activated. It also updates the list of recently
  // used scenes.
  const dispatch = useAppDispatch();

  const renderScene = () => {
    if (scene) {
      return (
        <Paper
          sx={{
            width: scene.width,
            height: scene.height,
            minWidth: scene.width,
            minHeight: scene.height,
            backgroundColor: "#eeeeee",
          }}
          elevation={4}
        ></Paper>
      );
    } else {
      return <div>Scene being loaded...</div>;
    }
  };

  React.useEffect(() => {
    // Retrieve scene data from URL query params, if possible.
    ProjectSceneCache.inst.getSceneInfoFromQueryParams(
      location.search,
      (info: ProjectSceneInfo | null) => {
        // setSceneInfo(info);
        if (info) {
          const scene = new Scene(info.svg);
          dispatch(
            setLoadedScene({ width: scene.width, height: scene.height })
          );
          const userRecentScenes: UserRecentSceneModel = {
            userId: appState.sessionInfo!.loggedUser,
            domain: info.domain,
            uuid: info.uuid,
            name: info.name,
            projectName: info.projectName,
          };
          dispatch(setRecentScene(userRecentScenes));
          document.title = `Kiwi [${info.domain}:${info.name}]`;
          if (info?.svg !== undefined) {
            setScene(scene);
          }
        } else {
          document.title = "Kiwi";
        }
      }
    );
  }, [location, dispatch, appState]);

  return (
    <Box
      sx={{
        display: "flex",
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        overflow: "auto",
      }}
    >
      {renderScene()}
    </Box>
  );
};
export default SceneCanvas;
