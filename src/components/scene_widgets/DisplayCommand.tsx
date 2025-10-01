import * as React from "react";
import { Button } from "@/components/ui/button";
import { DisplayCommandElementProps } from "../../karabo_data/SceneElements";
import { splitKaraboKeys } from "./shared/helpers/splitKaraboKeys";

const DisplayCommand: React.FC<DisplayCommandElementProps> = (props) => {
  const { propertyId } = React.useMemo(
    () => splitKaraboKeys(props.karaboKeys),
    [props.karaboKeys]
  );

  return (
    <Button
      size="sm"
      className="absolute border-2 border-gray-300 bg-primary/80 px-2"
      style={{
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
