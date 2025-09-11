import * as React from "react";
import { Button } from "@mui/material";
import { DisplayCommandElementProps } from "../../karabo_data/SceneElements";
import { splitKaraboKeys } from "./shared/helpers/splitKaraboKeys";

const DisplayCommand: React.FC<DisplayCommandElementProps> = (props) => {
  const { propertyId } = React.useMemo(
    () => splitKaraboKeys(props.karaboKeys),
    [props.karaboKeys]
  );

  return (
    <Button
      size="small"
      variant="contained"
      sx={{
        position: "absolute",
        width: props.width,
        height: props.height,
        left: props.x,
        top: props.y,
        fontFamily: "Arial, Helvetica, Sans-serif",
        fontSize: 11,
        fontWeight: "bolder",
      }}
    >
      {propertyId}
    </Button>
  );
};

export default DisplayCommand;
