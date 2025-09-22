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
import { UserRecentSceneModel } from "../view_models/RecentScenesModel";
import {
  SceneElement,
  SceneElementProps,
  WidgetElement,
} from "../karabo_data/SceneElements";
import { Scene } from "../karabo_data/Scene";
import { useGlobalStore } from "../store/globalAppStateStore";
import useRecentStore from "../store/recentScenesStore";
import { useLoadedSceneStore } from "../store/loadedSceneStore";

const SceneCanvas: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [scene, setScene] = React.useState<Scene | null>(null);
  const [loadingError, setLoadingError] = React.useState<string>("");

  const { sessionInfo } = useGlobalStore();
  const { setRecentScene } = useRecentStore();
  const { setScene: setLoadedScene } = useLoadedSceneStore();
  const loggedUser = sessionInfo?.loggedUser;

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
            return null; // avoid React warnings for missing returns
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
            <p dangerouslySetInnerHTML={{ __html: loadingError }} />
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
    ProjectSceneCache.inst.getSceneInfoFromQueryParams(
      location.search,
      (info: ProjectSceneInfo | null) => {
        if (info) {
          try {
            const parsed = new Scene(info.svg);

            setLoadedScene({
              width: parsed.width,
              height: parsed.height,
            });

            if (loggedUser) {
              const userRecentScenes: UserRecentSceneModel = {
                userId: loggedUser,
                domain: info.domain,
                uuid: info.uuid,
                name: info.name,
                projectName: info.projectName,
              };
              setRecentScene(userRecentScenes);
            }

            document.title = `Kiwi [${info.domain}:${info.name}]`;
            setScene(parsed);
            setLoadingError("");
          } catch (e) {
            setLoadingError(
              `Couldn't parse scene data. Details:<br />${String(e)}`
            );
            setScene(null);
          }
        } else {
          document.title = "Kiwi";
          setLoadingError(
            "Couldn't retrieve scene data.<br />Please check the availability of the Project Database"
          );
          setScene(null);
        }
      }
    );
  }, [location.search, loggedUser, setLoadedScene, setRecentScene]);

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
