# The selected project is the navigation root

A project can be shared by several parents. The navigation root is the project
chosen for the current opening, not a permanent ancestor of the scene.

## Loading

Dialog selections, bookmarks, and Recent Scenes load a fresh model for the
selected project. A bookmark records the scene-owning project and scene UUIDs.
Opening a subproject this way makes it the new root, even if an already loaded
parent contains it. Older saved `rootProjectUuid` fields are ignored.

The project controller uses this sequence:

1. Load the requested project.
2. Find the requested scene in that project tree.
3. Check cancellation before changing active state.
4. Set the root. The model emits `RootProjectChanged`.
5. Open the scene. The controller emits `OpenScene`.

Failed or cancelled loads leave the active root untouched. Browsing and opening
scenes inside the current project browser continues to use its loaded tree.

## Clearing

Home closes scene tabs, calls `clearRootProject`, and navigates to `/main`.
Clearing uses the same `RootProjectChanged` notification. `useRootProject`
reads the now-absent root and clears navigation, selection, and searches.
Recent Scenes remains available; reopening an entry loads its project again.
