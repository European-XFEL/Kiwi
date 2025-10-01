import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const InitializingState: React.FC = () => (
  <section
    className="h-screen flex flex-col overflow-hidden items-center px-4 pt-4 sm:px-6 lg:px-8"
    aria-label="App loading"
  >
    <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg shadow-lg">
      <CardContent className="flex items-center gap-4 p-5 sm:p-6">
        <div className="relative" aria-hidden="true">
          <Spinner className="text-primary" variant="default" size={40} />
        </div>
        <div className="flex-1">
          <h4 className="text-base sm:text-lg md:text-xl font-medium leading-7 text-muted-foreground break-words">
            Initializing application …
          </h4>
          <p
            className="mt-1 text-xs sm:text-sm text-muted-foreground/80"
            role="status"
            aria-live="polite"
          >
            This may take a moment.
          </p>
        </div>
      </CardContent>
    </Card>
  </section>
);

export default InitializingState;
