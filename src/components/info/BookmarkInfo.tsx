import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BookmarkInfo() {
  return (
    <div className="space-y-4">
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scene Bookmarks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bookmarking the Kiwi page with a scene is all that is needed to
            display that scene again later.
          </p>
          <p className="text-sm text-muted-foreground">
            Whenever a scene is being displayed, the URL in the address bar of
            your browser will contain all the information Kiwi needs to locate
            and display the scene.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
