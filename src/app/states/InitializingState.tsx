import React from 'react';
import { Card, CardContent } from '@/components/card';
import { Spinner } from '@/components/spinner';
import { cn } from '@/components/utils/cn';

type InitializingStateProps = {
  visible: boolean;
};

const InitializingState: React.FC<InitializingStateProps> = ({ visible }) => (
  <section
    className={cn(
      'fixed inset-0 z-50',
      'flex items-center justify-center',
      'px-4 sm:px-6 lg:px-8',
      'bg-background',
      'transition-opacity duration-200 ease-out',
      visible
        ? 'opacity-100 pointer-events-auto'
        : 'opacity-0 pointer-events-none'
    )}
    aria-label="App loading"
    role="status"
    aria-live="polite"
    aria-hidden={!visible}
  >
    <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg shadow-lg">
      <CardContent className="flex items-center gap-4 p-5 sm:p-6">
        <div className="relative" aria-hidden="true">
          <Spinner className="text-primary" variant="default" size={40} />
        </div>

        <div className="flex-1">
          <h4 className="text-base sm:text-lg md:text-xl font-medium leading-7 text-muted-foreground wrap-break-word">
            Initializing application …
          </h4>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground/80">
            This may take a moment.
          </p>
        </div>
      </CardContent>
    </Card>
  </section>
);

export default InitializingState;
