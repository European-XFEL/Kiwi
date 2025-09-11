import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
} from "@mui/material";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProjectSceneCache } from "../store/ProjectSceneCache";
import { ProjectSceneInfo } from "../karabo_data/ProjectDbInfo";
import { useAppDispatch, useAppSelector } from "../AppHooks";
import { setLoadedScene } from "../store/slices/loadedSceneSlice";
import { setRecentScene } from "../store/slices/recentScenesSlice";
import { UserRecentSceneModel } from "../view_models/RecentScenesModel";
import {
  SceneElement,
  SceneElementProps,
  WidgetElement,
} from "../karabo_data/SceneElements";
import { Scene } from "../karabo_data/Scene";

const SceneCanvas: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [scene, setScene] = React.useState<Scene | null>(null);
  const [loadingError, setLoadingError] = React.useState<string>("");

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
          key={`scene_${scene}`}
          sx={{
            width: `${scene.width}px`,
            height: `${scene.height}px`,
            minWidth: scene.width,
            minHeight: scene.height,
            backgroundColor: "#eeeeee",
            position: "relative",
            overflow: "clip",
          }}
          elevation={4}
        >
          {scene.sceneElements.map((el: SceneElement) => {
            if (el instanceof WidgetElement) {
              const widget = el as WidgetElement<SceneElementProps>;
              if (widget.reactComponent !== undefined) {
                return React.createElement(
                  widget.reactComponent!,
                  widget.props
                );
              }
            }
          })}
        </Paper>
      );
    } else if (loadingError.length > 0) {
      return (
        <Stack>
          <Paper
            elevation={8}
            sx={{
              bgcolor: "#ee0000",
              color: "#ffffff",
              padding: "1.5em",
            }}
          >
            <h4>Couldn't load scene</h4>
            <p>{loadingError}</p>
          </Paper>
          <Button variant="contained" onClick={() => navigate("/")}>
            Back to Starting Page
          </Button>
          <Box sx={{ height: "4em" }} />
        </Stack>
      );
    } else {
      return (
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
            <CircularProgress size={32} style={{ padding: 4 }} />
            <Box sx={{ flexGrow: 1 }}>Loading scene ...</Box>
          </Paper>
        </Container>
      );
    }
  };

  React.useEffect(() => {
    // Retrieve scene data from URL query params, if possible.
    ProjectSceneCache.inst.getSceneInfoFromQueryParams(
      location.search,
      (info: ProjectSceneInfo | null) => {
        if (info) {
          try {
            const scene = new Scene(info.svg);
           
            dispatch(
              setLoadedScene({
                width: scene.width,
                height: scene.height,
              })
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
            setLoadingError("");
          } catch (e) {
            setLoadingError(`Couldn't parse scene data. Details:<br />${e}`);
          }
        } else {
          document.title = "Kiwi";
          setLoadingError(
            "Couldn't retrieve scene data.<br />" +
              "Please check the availability of the Project Database"
          );
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
