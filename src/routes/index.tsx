import AppBody from "@/components/AppBody";
import NoScenePanel from "@/components/NoScenePanel";
import SceneCanvas from "@/components/SceneCanvas";
import { RouteProp } from "@/shared/types";

export const appRoutes: RouteProp[] = [
  {
    path: "/",
    element: <AppBody />,
    children: [
      {
        path: "scene",
        element: <SceneCanvas />,
      },
      {
        path: "no_scene",
        element: <NoScenePanel />,
      },
    ],
  },
];
