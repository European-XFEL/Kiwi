import { createTheme } from "@mui/material/styles";

const appTheme = createTheme({
  palette: {
    primary: {
      main: "#ededed",
      light: "#f0f0f0",
      dark: "#a5a5a5",
      contrastText: "#0d1546",
    },
    secondary: {
      main: "#f39200",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#ffee58",
    },
  },
  typography: {
    allVariants: {
      fontFamily: ["Helvetica", "arial", "sans-serif"].join(","),
    },
  },
});

export default appTheme;
