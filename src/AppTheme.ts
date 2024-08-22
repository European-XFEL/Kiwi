import { createTheme } from "@mui/material/styles";

const appTheme = createTheme({
  palette: {
    primary: {
      main: "#e58a02",
      light: "#fe9902",
      dark: "#fe9902",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#f39200",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#ffee58",
    },
    text: {
      primary: "#0D1546",
      secondary: "162267",
    },
  },
  typography: {
    allVariants: {
      fontFamily: ["Neue Helvetica", "Helvetica", "arial", "sans-serif"].join(
        ","
      ),
    },
  },
});

export default appTheme;
