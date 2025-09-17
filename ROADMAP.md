# Kiwi Roadmap

## Phase 1 - Prototype Consolidation

- [x] Replace `npm` with `yarn` as the project package manager
- [x] Introduce `jest` use for unit and integration tests (https://git.xfel.eu/karaboweb/kiwi/-/issues/12 and https://git.xfel.eu/karaboweb/kiwi/-/issues/13)
- [ ] Evaluate (and possibly replace) `React-Redux` with `zustand` as the application state management support library (https://git.xfel.eu/karaboweb/kiwi/-/issues/17)
- [ ] Evaluate (and possibly replace) `mui` with `shadcn ui` as the application component library (https://git.xfel.eu/karaboweb/kiwi/-/issues/6)
- [ ] Add the missing infra-structure to support property types and schema updates - the equivalents of the Karabo GUI `PropertyProxy` and `Controller` types (https://git.xfel.eu/karaboweb/kiwi/-/issues/20)
- [ ] Improve the ergonomy of the `Karabo-TS` package (https://git.xfel.eu/karaboweb/kiwi/-/issues/10)
- [ ] Support scaling of scenes (Zoom-In, Zoom-Out, Full-Screen) with rescaling of all the scene elements (https://git.xfel.eu/karaboweb/kiwi/-/issues/7)
- [ ] Fix the lay-out and functional issues detected in the reference scene from issue https://git.xfel.eu/karaboweb/kiwi/-/issues/19
- [ ] Support the `DisplayTrendGraph` widget (https://git.xfel.eu/karaboweb/kiwi/-/issues/11)
- [ ] Support the `WebCamGraph` widget (https://git.xfel.eu/karaboweb/kiwi/-/issues/14)
- [ ] Support the `DisplayTableElement` widget (https://git.xfel.eu/karaboweb/kiwi/-/issues/21)

## Phase 2 - Widget Coverage & Performance Assessment

- [ ] Instrument Burrow to be able to monitor its performance metrics (https://git.xfel.eu/karaboweb/kiwi/-/issues/16)
- [ ] Implement some performance tests for Kiwi - scenes with muliple `WebCamGraph` and `DisplayTrendGraph` and also tests with multiple simultaneous Kiwi connections to Burrow (https://git.xfel.eu/karaboweb/kiwi/-/issues/15)
- [ ] Extend the set of widgets supported by Kiwi (TODO: define the set of widgets to be implemented)
- [ ] Move the Kiwi widgets (and their required infra-structure) into independent package(s). Kiwi at this point should be only a "shell" that makes use of this package(s).
- [ ] Add bi-directional translation between `Karabo Hash` and `MessagePack` messages to the set of responsabilities of Burrow (there's no decision yet to go into the `MessagePack` direction; this item is mostly a reminder at this point)
- [ ] Address any Kiwi or Burrow identified performance issue (mostly a placeholder as the performance is currently not well known)

## Phase 3 - Workspace Construction

On the last phase the goal is to replace the Kiwi "shell" used in the previous phases with a more definitive one. Support for multi-scene workspaces is currently foreseen; if it is decided to go for multi-scene support similary to Karabo Concert, some tasks can be anticipated:

- [ ] Integrate with KeyCloak for authentication (and maybe also authorization) (https://git.xfel.eu/karaboweb/kiwi/-/issues/8)
- [ ] Change the "bookmarkable entity" of Kiwi from single scenes to mosaics (temptative name for the set of scenes in a workspace along with their geometries). Note: mosaics could also contain the information of the Karabo Topic they are related to since their scenes probably only make sense for the topic they were created for. Kiwi should be able to warn the user when connected to a GUI Server from another topic.
- [ ] Extend Burrow to support persisting per-user configurations like preferences, last mosaics viewed and the mosaics themselves (mosaics would be at least initially a Kiwi-only entity). This will most likely some simple storage backend (SQL database?) for the mosaics - the CRUD endpoints could be part of Burrow API.
- [ ] Add telemetry support to Kiwi for gathering data on usage patterns that should support the evolution of its UX.
