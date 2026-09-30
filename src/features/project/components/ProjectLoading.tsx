import { Spinner } from '@/components/api';

export function ProjectLoading() {
  return (
    <div
      role="status"
      data-testid="project-loading"
      className="flex h-full w-full flex-col items-center justify-center gap-6 bg-muted/20 px-6 sm:gap-8"
    >
      <div
        aria-hidden="true"
        className="relative size-28 sm:size-40 lg:size-32"
      >
        {/* The halo helps on small screens; on a large canvas it reads as a
            blob, so desktop keeps just the ring */}
        <div className="absolute inset-0 rounded-full bg-primary/10 motion-safe:animate-pulse lg:hidden" />
        <div className="absolute inset-3 sm:inset-4 lg:inset-0">
          {/* Track: same radius as the LoaderCircle arc drawn over it */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            className="absolute inset-0 size-full text-primary/15 lg:stroke-1"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
          <Spinner
            variant="circle"
            strokeWidth={1.75}
            className="absolute inset-0 size-full text-primary lg:stroke-1"
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-lg font-semibold text-foreground sm:text-xl">
          Loading project
        </span>
        <span className="text-sm text-muted-foreground sm:text-base">
          This might take a while.
        </span>
      </div>
    </div>
  );
}
