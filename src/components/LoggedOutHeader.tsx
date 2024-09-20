import { Divider, Grid } from "@mui/material";
import React from "react";

const LoggedOutHeader: React.FC = () => {
  return (
    <Grid
      container
      sx={{
        width: "100%",
        maxWidth: 580,
        mx: "auto",
        mt: 1,
        mb: 3,
        flexDirection: "row",
        justifyContents: "start",
        alignItems: "baseline",
      }}
    >
      <Grid item sx={{ flexGrow: 1, fontWeight: "bold" }}>
        KIWI
      </Grid>
      <Grid>
        <img
          src="xfel_logo_128.png"
          alt="XFEL Logo"
          style={{ maxWidth: "64px", height: "auto" }}
        />
      </Grid>
      <Grid item xs={12}>
        <Divider />
      </Grid>
    </Grid>
  );
};

export default LoggedOutHeader;
