import {
  AccountCircleOutlined,
  //   DynamicFormOutlined,
  EjectOutlined,
  FolderOutlined,
  Logout,
} from "@mui/icons-material";
import {
  Box,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Divider,
  IconButton,
  Button,
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";

import { useAppDispatch } from "../AppHooks";

import { GuiServerConnector } from "../GuiServerConnector";

import { AccessLevel } from "../karabo_data/AccessLevel";

import { useAppSelector } from "../AppHooks";
import { setLoggedOut } from "../store/slices/globalAppStateSlice";
import { setLoadedScene } from "../store/slices/loadedSceneSlice";
import SelectProjectSceneDialog from "./SelectProjectSceneDialog";
import SelectDeviceSceneDialog from "./SelectDeviceSceneDialog";
import { ProjectSceneInfo } from "../karabo_data/ProjectDbInfo";
import { useLocation, useNavigate } from "react-router-dom";
import { ProjectSceneCache } from "../store/ProjectSceneCache";

const LoggedInHeader: React.FC = () => {
  // The header panel dispatches setLoggedOut actions upon user requests to log out.
  const dispatch = useAppDispatch();

  // Used to inspect the URL for loaded scene data whenever it changes.
  const location = useLocation();

  const appState = useAppSelector((state) => state.globalAppState);

  // After dispatching the setProjectSceneOpening action, a programmatic
  // navigation to the scene URL must take place.
  const navigate = useNavigate();

  const [openLoadFromScene, setOpenLoadFromScene] = React.useState(false);
  const [sceneName, setSceneName] = React.useState("");

  const onLoadFromSceneClick = () => {
    setOpenLoadFromScene(true);
  };
  const onLoadFromSceneCancel = () => {
    setOpenLoadFromScene(false);
  };
  const onLoadFromSceneSelected = (selectedScene: ProjectSceneInfo) => {
    setOpenLoadFromScene(false);
    ProjectSceneCache.inst.storeSceneInfo(selectedScene);
    navigate(
      `/scene?host=${appState.sessionInfo!.guiServerHost}&port=${
        appState.sessionInfo!.guiServerPort
      }&domain=${encodeURIComponent(
        selectedScene.domain
      )}&projectName=${encodeURIComponent(
        selectedScene.projectName
      )}&uuid=${encodeURIComponent(selectedScene.uuid)}`
    );
  };

  const onUnloadSceneClick = () => {
    dispatch(setLoadedScene(undefined));
    setSceneName("");
    navigate("/");
  };

  const [openLoadFromDevice, setOpenLoadFromDevice] = React.useState(false);
  // TODO: uncomment the lines below when the device scene loading is implemented
  //   const onLoadFromDeviceClick = () => {
  //     setOpenLoadFromDevice(true);
  //   };
  const onLoadFromDeviceCancel = () => {
    setOpenLoadFromDevice(false);
  };
  const onLoadFromDeviceSelected = (deviceId: string, sceneId: string) => {
    // TODO: Dispatch action to load scene from device
    console.log(`Will open scene ${sceneId} from ${deviceId}`);
    setOpenLoadFromDevice(false);
  };

  const [anchorUserMenu, setAnchorUserMenu] =
    React.useState<null | HTMLElement>(null);

  const onUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorUserMenu(event.currentTarget);
  };

  const onLogoutClick = () => {
    setAnchorUserMenu(null);
    GuiServerConnector.inst.finishSession();
    dispatch(setLoggedOut());
  };

  const onUserMenuClose = () => {
    setAnchorUserMenu(null);
  };

  React.useEffect(() => {
    // Retrieve scene data from URL query params, if possible.
    ProjectSceneCache.inst.getSceneInfoFromQueryParams(
      location.search,
      (info: ProjectSceneInfo | null) => {
        if (info) {
          setSceneName(`${info.domain} :: ${info.projectName} :: ${info.name}`);
        } else {
          setSceneName("");
        }
      }
    );
  }, [location]);

  return (
    <Stack direction="column">
      <Stack direction="row" position="static" display="flex">
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
          }}
        >
          <Box sx={{ mt: 1 }}>
            <img
              src="logo192.png"
              style={{ maxWidth: "56px", height: "auto" }}
              alt="Karabo"
            />
          </Box>
          <h4>KIWI</h4>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexGrow: 1,
            alignItems: "center",
          }}
        >
          <Box width={"1.0em"} />
          <Divider orientation="vertical" flexItem />
          <Box width={"0.2em"} />
          <Button
            size="small"
            variant="contained"
            startIcon={<FolderOutlined />}
            onClick={onLoadFromSceneClick}
          >
            Load Project Scene
          </Button>
          <SelectProjectSceneDialog
            open={openLoadFromScene}
            onSceneSelected={onLoadFromSceneSelected}
            onCancel={onLoadFromSceneCancel}
          />
          {/* TODO: Uncomment the lines below when the device scene loading is implemented */}
          {/* <Button
            size="small"
            variant="contained"
            startIcon={<DynamicFormOutlined />}
            onClick={onLoadFromDeviceClick}
          >
            Load Device Scene
          </Button> */}
          <SelectDeviceSceneDialog
            open={openLoadFromDevice}
            onSceneSelected={onLoadFromDeviceSelected}
            onCancel={onLoadFromDeviceCancel}
          />
          <Box width={"0.2em"} />
          <Divider orientation="vertical" flexItem />
          <Box width={"0.2em"} />
          <Tooltip title={`Unload Scene (${sceneName})`}>
            <span>
              <IconButton
                size="medium"
                color="primary"
                onClick={onUnloadSceneClick}
                {...(sceneName.length > 0
                  ? { disabled: false }
                  : { disabled: true })}
              >
                <EjectOutlined fontSize="medium" />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="body1">
            {sceneName.length > 0 ? sceneName : "[No Scene Loaded]"}
          </Typography>
        </Stack>
        <Box width={"0.2em"} />
        <Divider orientation="vertical" flexItem />
        <Box width={"0.2em"} />
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Tooltip title="User Operations">
            <IconButton
              size="medium"
              edge="end"
              color="primary"
              aria-label="Current User"
              aria-controls="menu-user"
              aria-haspopup="true"
              onClick={onUserMenuOpen}
            >
              <AccountCircleOutlined fontSize="medium" />
            </IconButton>
          </Tooltip>
          <Menu
            id="menu-user"
            anchorEl={anchorUserMenu}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorUserMenu)}
            onClose={onUserMenuClose}
          >
            <MenuItem onClick={onUserMenuClose}>
              "{appState.sessionInfo?.loggedUser}" (
              {AccessLevel[appState.sessionInfo!.accessLevel]})
            </MenuItem>
            <Divider />
            <MenuItem onClick={onLogoutClick}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>
      <Divider />
    </Stack>
  );
};

export default LoggedInHeader;
