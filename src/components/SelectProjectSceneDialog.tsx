import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useRef } from "react";
import { ProjectDBConnector } from "../ProjectDBConnector";
import { useAppSelector } from "../AppHooks";
import {
  ProjectItemInfo,
  ProjectSceneInfo,
} from "../karabo_data/ProjectDbInfo";
import { BackspaceOutlined, FilterAltOutlined } from "@mui/icons-material";

enum ActivityStatus {
  NO_ACTIVITY,
  GETTING_DOMAINS,
  GETTING_PROJECTS,
  GETTING_SCENES,
}

export interface SelectProjectSceneDialogProps {
  open: boolean;
  onSceneSelected: (scene: ProjectSceneInfo) => void;
  onCancel: () => void;
}

function SelectProjectSceneDialog(props: SelectProjectSceneDialogProps) {
  // Access to the global app state is required to retrieve the current topic.
  // The current topic is used to for the initial domain selection.
  const appState = useAppSelector((state) => state.globalAppState);

  const { open, onSceneSelected, onCancel } = props;

  const [activityStatus, setActivityStatus] = React.useState(
    ActivityStatus.NO_ACTIVITY
  );
  const [errorMsg, setErrorMessage] = React.useState("");
  const [domains, setDomains] = React.useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = React.useState("");
  const [projects, setProjects] = React.useState<ProjectItemInfo[]>([]);
  const [selectedProject, setSelectedProject] = React.useState<
    ProjectItemInfo | undefined
  >(undefined);
  // The total number of projects in a domain, just with is_trashed project
  // removed - no filtering based on name part.
  const [totalProjects, setTotalProjects] = React.useState<number>(0);
  const [scenes, setScenes] = React.useState<ProjectSceneInfo[]>([]);
  const [selectedScene, setSelectedScene] = React.useState<
    ProjectSceneInfo | undefined
  >(undefined);

  const executedOnceRef = React.useRef("");
  const projectFilterRef = useRef<HTMLInputElement>(null);

  // #region Dialog lifecycle event handlers
  const handleCancel = () => {
    onCancel();
  };

  const handleSelectScene = () => {
    onSceneSelected(selectedScene!);
  };
  // #endregion

  // #region Dialog UI event handlers and helpers

  const onDomainChange = (evt: SelectChangeEvent) => {
    setSelectedDomain(evt.target.value);
    updateProjects(evt.target.value.toString());
    // Scenes will be populated again when a project for the new selected domain
    // is selected.
    setScenes([]);
    setSelectedScene(undefined);
  };

  const updateProjects = (domain: string) => {
    setActivityStatus(ActivityStatus.GETTING_PROJECTS);
    ProjectDBConnector.inst.listProjects(domain, (projectsInfo) => {
      if (projectsInfo.error_msg) {
        setErrorMessage(projectsInfo.error_msg);
      } else {
        let projectsFiltered = projectsInfo.projects.filter(
          (pInf) => !pInf.isTrashed
        );
        setTotalProjects(projectsFiltered.length);
        const projectFilter = projectFilterRef.current!.value.toLowerCase();
        if (projectFilter !== undefined && projectFilter.length > 0) {
          projectsFiltered = projectsFiltered.filter(
            (pInf) => pInf.name.toLowerCase().indexOf(projectFilter) >= 0
          );
        }
        setProjects(projectsFiltered);
        if (projectsFiltered.length > 0) {
          const selProject = projectsFiltered[0];
          setSelectedProject(selProject);
          updateScenes(selProject.domain, selProject.uuid);
          setSelectedScene(undefined);
        }
      }
      setActivityStatus(ActivityStatus.NO_ACTIVITY);
    });
  };

  const updateScenes = (domain: string, uuidProject: string) => {
    setActivityStatus(ActivityStatus.GETTING_SCENES);
    ProjectDBConnector.inst.listScenes(domain, uuidProject, (scenesInfo) => {
      if (scenesInfo.error_msg) {
        setErrorMessage(scenesInfo.error_msg);
      } else {
        setScenes(scenesInfo.scenes);
        if (scenesInfo.scenes.length > 0) {
          setSelectedScene(scenesInfo.scenes[0]);
        }
      }
      setActivityStatus(ActivityStatus.NO_ACTIVITY);
    });
  };

  const onDBInitError = () => {
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
    setErrorMessage(
      "ProjectDB initialization error! Please reopen the dialog."
    );
  };

  const handleProjectClick = (
    _event: React.MouseEvent<unknown>,
    project: ProjectItemInfo
  ) => {
    setSelectedProject(project);
    updateScenes(project.domain, project.uuid);
    setSelectedScene(undefined);
  };

  const handleSceneClick = (
    _event: React.MouseEvent<unknown>,
    scene: ProjectSceneInfo
  ) => {
    setSelectedScene(scene);
  };

  const onProjectFilterClick = () => {
    updateProjects(selectedDomain);
  };

  const onClearFilterClick = () => {
    projectFilterRef.current!.value = "";
    updateProjects(selectedDomain);
  };

  // #endregion

  // #region Dialog component rendering helpers

  const renderStatusBox = () => {
    if (errorMsg) {
      return (
        <Box sx={{ flexGrow: 1, p: 1, color: "error.main" }}>
          <Typography variant="body2">{errorMsg}</Typography>
        </Box>
      );
    }

    let statusText = "";
    let inProgress = false;
    switch (activityStatus) {
      case ActivityStatus.GETTING_DOMAINS:
        statusText = "Retrieving domains ...";
        inProgress = true;
        break;
      case ActivityStatus.GETTING_PROJECTS:
        statusText = "Retrieving projects ...";
        inProgress = true;
        break;
      case ActivityStatus.GETTING_SCENES:
        statusText = "Retrieving scenes ...";
        inProgress = true;
        break;
    }

    if (inProgress) {
      return (
        <React.Fragment>
          <CircularProgress size={24} />
          <Box sx={{ flexGrow: 1, p: 1 }}>
            <Typography variant="body2">{statusText}</Typography>
          </Box>
        </React.Fragment>
      );
    } else {
      return (
        <Box sx={{ flexGrow: 1, p: 1 }}>
          <Typography variant="body2">{statusText}</Typography>
        </Box>
      );
    }
  };

  // #endregion

  React.useEffect(() => {
    if (!executedOnceRef.current) {
      // The executedOnceRef avoids multiple assignments of the onDBInitializationError when React.StrictMode is active.
      executedOnceRef.current = "true";
      ProjectDBConnector.inst.onDBInitializationError = onDBInitError;
    }
    if (open) {
      setActivityStatus(ActivityStatus.GETTING_DOMAINS);
      ProjectDBConnector.inst.listDomains((domainsInfo) => {
        if (domainsInfo.error_msg) {
          setErrorMessage(
            `Error reading domains: ${domainsInfo.error_msg}. Close and reopen the dialog`
          );
        } else {
          setDomains(domainsInfo.domains);
          if (
            selectedDomain.length == 0 ||
            domainsInfo.domains.findIndex(
              (domain) => domain === selectedDomain
            ) === -1
          ) {
            // If there's no current domain selection, or the current domain is not among
            // the available domains anymore, select the domain that matches the current
            // topic (if any) or the first domain
            const currentTopic = appState.sessionInfo!.guiServerTopic;
            const currentTopicIdx = domainsInfo.domains.findIndex(
              (domain) => domain === currentTopic
            );
            const startupDomain =
              currentTopicIdx >= 0 ? currentTopic : domainsInfo.domains[0];
            setSelectedDomain(startupDomain);
            updateProjects(startupDomain);
          }
        }
        setActivityStatus(ActivityStatus.NO_ACTIVITY);
      });
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      fullWidth={true}
      maxWidth={"md"}
      onClose={handleCancel}
      onKeyUp={(evt: React.KeyboardEvent) => {
        if (evt.key === "Enter" && selectedScene !== undefined) {
          handleSelectScene();
        }
      }}
    >
      <DialogTitle>LOAD PROJECT SCENE</DialogTitle>
      <DialogContent>
        <Stack spacing={0.2}>
          <Box sx={{ mt: "0.5em" }}>PROJECT FILTER</Box>
          <Paper elevation={3} sx={{ padding: "1.2em" }}>
            <Stack
              direction="row"
              display="flex"
              spacing={1}
              sx={{ alignItems: "center" }}
            >
              <FormControl sx={{ minWidth: "12em" }} size="small">
                <InputLabel id="domain-label">Domain</InputLabel>
                <Select
                  value={selectedDomain}
                  onChange={onDomainChange}
                  labelId="domain-label"
                  autoWidth
                  label="Domain"
                  maxRows={15}
                  // Details about the restriction on the maxHeight of the dropdown:
                  // https://stackoverflow.com/questions/61686939/material-ui-apply-max-height-to-select-children
                  MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                >
                  {domains.map((domain) => (
                    <MenuItem key={domain} value={domain}>
                      {domain}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl variant="outlined" sx={{ flexGrow: 2 }}>
                <OutlinedInput
                  size="small"
                  placeholder="Project Name Part Filter"
                  inputRef={projectFilterRef}
                  onKeyUp={(evt: React.KeyboardEvent<HTMLInputElement>) => {
                    if (
                      evt.key === "Enter" &&
                      projectFilterRef.current!.value !== undefined
                    ) {
                      // User pressed Enter in the name part filter text field;
                      // Apply the filter with whatever is in the text field -
                      // if emppty will remove the filtering.
                      evt.stopPropagation();
                      updateProjects(selectedDomain);
                    }
                  }}
                  sx={{ width: "100%" }}
                  endAdornment={
                    <InputAdornment position="end">
                      <Tooltip title="Clear Filter">
                        <span>
                          <IconButton
                            aria-label="clear filter"
                            onClick={onClearFilterClick}
                            color="primary"
                            size="small"
                          >
                            <BackspaceOutlined />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </InputAdornment>
                  }
                ></OutlinedInput>
              </FormControl>
              <Tooltip title="Filter Projects by Name Part">
                <span>
                  <IconButton
                    aria-label="filter projects"
                    color="primary"
                    size="large"
                    onClick={onProjectFilterClick}
                  >
                    <FilterAltOutlined />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Paper>
          <Box sx={{ pt: "1em" }}>
            <Stack direction="row" display="flex">
              <Box sx={{ flexGrow: 1 }}>
                PROJECTS ON DOMAIN "{selectedDomain}"
              </Box>
              <Typography variant="body2" sx={{ justifyContent: "flex-end" }}>
                (
                {totalProjects === projects.length
                  ? projects.length
                  : `${projects.length} of ${totalProjects}`}
                )
              </Typography>
            </Stack>
          </Box>
          <Paper elevation={3} sx={{ padding: "0.5em" }}>
            <TableContainer sx={{ maxHeight: "12em", minHeight: "12em" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>PROJECT NAME</TableCell>
                    <TableCell>LAST MODIFIED ON</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projects.map((project: ProjectItemInfo, index: number) => (
                    <TableRow
                      key={`${index}::${project.uuid}`}
                      selected={selectedProject?.uuid === project.uuid}
                      onClick={(event) => handleProjectClick(event, project)}
                    >
                      <TableCell>
                        <Typography noWrap>{project.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography noWrap>{project.dateModified}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          <Box sx={{ pt: "1em" }}>
            <Stack direction="row" display="flex">
              <Box sx={{ flexGrow: 1 }}>
                SCENES ON PROJECT "{selectedProject?.name ?? ""}"
              </Box>
              <Typography variant="body2" sx={{ justifyContent: "flex-end" }}>
                ({scenes.length})
              </Typography>
            </Stack>
          </Box>
          <Paper elevation={3} sx={{ padding: "0.5em" }}>
            <TableContainer sx={{ maxHeight: "12em", minHeight: "12em" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SCENE NAME</TableCell>
                    <TableCell>LAST MODIFIED ON</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scenes.map((scene: ProjectSceneInfo, index: number) => (
                    <TableRow
                      key={`${index}::${scene.uuid}`}
                      selected={selectedScene?.uuid === scene.uuid}
                      onClick={(event) => handleSceneClick(event, scene)}
                    >
                      <TableCell>
                        <Typography noWrap>{scene.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography noWrap>{scene.dateModified}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{ display: "flex", alignItems: "center", pl: 3, pr: 3, pb: 2 }}
      >
        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
          {renderStatusBox()}
        </Box>
        <Button variant="outlined" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSelectScene}
          disabled={selectedScene === undefined}
          sx={{ minWidth: "11em" }}
        >
          Open Scene
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SelectProjectSceneDialog;
