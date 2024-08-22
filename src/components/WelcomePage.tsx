import { DynamicFormOutlined, FolderOutlined } from "@mui/icons-material";
import { Box, Divider, IconButton, Stack, Typography } from "@mui/material";
import React from "react";

const WelcomePage: React.FC = () => {
  return (
    <Stack
      direction="row"
      sx={{ flexGrow: 1, alignItems: "center" }}
      display="flex"
    >
      <Box sx={{ flexGrow: 1 }} />
      <Stack direction="column" spacing={"0.5em"} justifyContent="left">
        <Typography variant="h5">Karabo Kiwi</Typography>
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
        <Typography variant="body1" component="div">
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <IconButton color="primary">
              <FolderOutlined />
            </IconButton>
            <span>
              Valves Status
              <Typography variant="caption">
                &nbsp;- project SASE3::Tunnel Vaccum
              </Typography>
            </span>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <IconButton color="primary">
              <FolderOutlined />
            </IconButton>
            <span>
              Gases Overview
              <Typography variant="caption">
                &nbsp;- project BKR::Tunnel Gases
              </Typography>
            </span>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <IconButton color="primary">
              <DynamicFormOutlined />
            </IconButton>
            <span>
              Basler Status
              <Typography variant="caption">
                &nbsp;- device MID/SECTION_2/CAMERAS/BASLER_CAM_1
              </Typography>
            </span>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <IconButton color="primary">
              <FolderOutlined />
            </IconButton>
            <span>
              Broker Overview
              <Typography variant="caption">
                &nbsp;- project CONTROLS_LAB::Broker Health
              </Typography>
            </span>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <IconButton color="primary">
              <FolderOutlined />
            </IconButton>
            <span>
              Influx Overview
              <Typography variant="caption">
                &nbsp;- project CONTROLS_LAB::Influx Health
              </Typography>
            </span>
          </Stack>
        </Typography>
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
export default WelcomePage;
