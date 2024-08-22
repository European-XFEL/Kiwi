import {
  AccountCircleOutlined,
  DynamicFormOutlined,
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

const LoggedInHeader: React.FC = () => {
  // The header panel dispatches setLoggedOut actions upon user requests.
  const dispatch = useAppDispatch();

  const appState = useAppSelector((state) => state.globalAppState);

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
            variant="outlined"
            startIcon={<FolderOutlined />}
          >
            Load Project Scene
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DynamicFormOutlined />}
          >
            Load Device Scene
          </Button>
          <Box width={"0.2em"} />
          <Divider orientation="vertical" flexItem />
          <Box width={"0.2em"} />
          <Tooltip title="Unload Scene">
            <span>
              <IconButton size="medium" color="primary" disabled>
                <EjectOutlined fontSize="medium" />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="body2">[No Scene Loaded]</Typography>
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
