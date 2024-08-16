import { AccountCircle, Logout } from "@mui/icons-material";
import {
  AppBar,
  Toolbar,
  Box,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Divider,
  IconButton,
  Typography,
} from "@mui/material";
import React from "react";

import { useAppDispatch } from "../AppHooks";

import { GuiServerConnector } from "../GuiServerConnector";

import { AccessLevel } from "../karabo_data/AccessLevel";

import KaraboCubeImg from "../img/karabo_cube_48.png";

import { useAppSelector } from "../AppHooks";
import { setLoggedOut } from "../store/slices/globalAppStateSlice";

const AppHeader: React.FC = () => {
  // The header panel dispatches setLoggedOut actions upon user requests.
  const dispatch = useAppDispatch();

  const appState = useAppSelector((state) => state.globalAppState);

  const [anchorUserMenu, setAnchorUserMenu] =
    React.useState<null | HTMLElement>(null);

  const onMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorUserMenu(event.currentTarget);
  };

  const onLogoutClick = () => {
    setAnchorUserMenu(null);
    GuiServerConnector.inst.finishSession();
    dispatch(setLoggedOut());
  };

  const onMenuClose = () => {
    setAnchorUserMenu(null);
  };

  let connectedTools = <span></span>;

  if (appState.globalState === "LOGGED_IN") {
    connectedTools = (
      <React.Fragment>
        <Stack
          direction="row"
          spacing={2}
          divider={<Divider orientation="vertical" flexItem />}
          sx={{
            justifyContent: "center",
            alignContent: "center",
            flexGrow: 1,
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
              Server Version: <b>{appState.sessionInfo?.guiServerVersion}</b>
            </Typography>
          </span>
        </Stack>

        <div>
          <IconButton
            size="large"
            edge="end"
            aria-label="Current User"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={onMenuOpen}
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="menu-appbar"
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
            onClose={onMenuClose}
          >
            <MenuItem onClick={onMenuClose}>
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
        </div>
      </React.Fragment>
    );
  }

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Box sx={{ mt: 1, mr: 2 }}>
          <img src={KaraboCubeImg} alt="Karabo" />
        </Box>
        <h3>GUI Protocol Viewer</h3>
        {connectedTools}
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;
