# Reload restores the active tab from sessionStorage

`PanelWrangler` owns the tabs, so it also saves the active one. When opening,
selecting, or closing a tab changes the active center tab, it writes that tab
to `sessionStorage` and broadcasts `ActiveSceneTabChanged`. A project scene is
saved as its server host and port, domain, owning project UUID, and scene UUID.
A device scene removes the saved entry.

Going Home is a reset, not a tab change. The Home button and closing the last
tab both broadcast `GoHome`. `PanelWrangler` handles it: it tears down every
tab, removes the saved entry, and clears the project root. Ending the session is
also a reset and removes the saved entry. Neither broadcasts
`ActiveSceneTabChanged`, so that event only ever means a tab change within the
session. After a logout, the next login starts at Home.

`sessionStorage` survives a reload but belongs to one browser tab. Each browser
tab restores its own scene, and the saved entry ends with the browser tab.

## Restoring

On startup, `SceneBootstrap` asks `PanelWrangler` for the saved tab. It is only
returned when its host and port match the connected session. A reload
reconnects to the server last used in any browser tab, which is not necessarily
the server of this tab's scene.

Once topology is ready, the existing project loader opens the scene and makes
the scene-owning project the new root, as in
[the navigation-root decision](project-navigation-root.md). A scene that fails
to load is forgotten, so the next reload starts at Home. Restoration runs once
per workspace mount; returning Home does not trigger it.

Every storage read and write is wrapped in `try`/`catch`. A failure logs a
warning, the workspace keeps working, and a reload starts at Home.

## The URL

Tab changes no longer write the URL, and a reload no longer reads it. Opening a
scene from a URL, for bookmarks or cinema links, will be designed separately.
