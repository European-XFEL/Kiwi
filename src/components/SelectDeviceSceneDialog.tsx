import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import React from "react";

export interface SelectDeviceSceneDialogProps {
  open: boolean;
  onSceneSelected: (deviceId: string, sceneId: string) => void;
  onCancel: () => void;
}

const SelectDeviceSceneDialog: React.FC<SelectDeviceSceneDialogProps> = (
  props
) => {
  const { open, onSceneSelected, onCancel } = props;

  const [selectedDeviceId, setSelectedDeviceId] = React.useState("");
  const [selectedSceneId, setSelectedSceneId] = React.useState("");

  const handleCancel = () => {
    onCancel();
  };

  const handleSelectScene = () => {
    onSceneSelected(selectedDeviceId, selectedSceneId);
  };

  React.useEffect(() => {
    //TODO: Replace the hard-coded "scene" below with a  real selection; added
    //      to keep the linter happy for now
    setSelectedDeviceId("FAKE_DEVICE_1");
    setSelectedSceneId("Overview");
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      onKeyUp={(evt: React.KeyboardEvent) => {
        if (evt.key === "Enter" && selectedSceneId.length > 0) {
          handleSelectScene();
        }
      }}
    >
      <DialogTitle>Load Device Scene</DialogTitle>
      <DialogContent></DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSelectScene}>Open Scene</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SelectDeviceSceneDialog;
