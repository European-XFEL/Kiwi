import { memo, useEffect, useMemo, useState } from 'react';
import type { Timestamp } from '@/karabo/data/api';

const MILLISECONDS_PER_SECOND = 1000;
const LIVE_FRAME_MAX_AGE_MS = 5000;
const OVERLAY_INSET_PX = 6;
const OVERLAY_FONT_SIZE_PX = 12;
const STATUS_DOT_SIZE_PX = 8;
const STATUS_DOT_GAP_PX = 4;
const LABEL_PADDING = '2px 5px';
const LABEL_BACKGROUND = 'rgba(0, 0, 0, 0.6)';
const LABEL_CORNER_RADIUS_PX = 4;

/** Keep expiry updates local to the overlay so they do not redraw the canvas. */
export const WebcamLiveIndicator = memo(function WebcamLiveIndicator({
  timestamp,
}: {
  timestamp?: Timestamp;
}) {
  const time = timestamp?.toTimestamp();
  const formattedTimestamp = useMemo(
    () =>
      timestamp
        ? {
            dateTime: new Date(
              timestamp.toTimestamp() * MILLISECONDS_PER_SECOND
            ).toISOString(),
            text: timestamp.toLocal(' ', 'seconds'),
          }
        : undefined,
    [timestamp]
  );
  const [live, setLive] = useState(false);
  useEffect(() => {
    const remaining =
      time === undefined
        ? 0
        : time * MILLISECONDS_PER_SECOND + LIVE_FRAME_MAX_AGE_MS - Date.now();
    setLive(remaining > 0);
    if (remaining <= 0) {
      return;
    }
    const timeout = window.setTimeout(() => setLive(false), remaining);
    return () => window.clearTimeout(timeout);
  }, [time]);

  return (
    <span
      style={{
        position: 'absolute',
        top: OVERLAY_INSET_PX,
        left: OVERLAY_INSET_PX,
        right: OVERLAY_INSET_PX,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'white',
        fontSize: OVERLAY_FONT_SIZE_PX,
        pointerEvents: 'none',
      }}
    >
      <span
        aria-label={live ? 'Live image' : 'Waiting for image'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: STATUS_DOT_GAP_PX,
          padding: LABEL_PADDING,
          background: LABEL_BACKGROUND,
          borderRadius: LABEL_CORNER_RADIUS_PX,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: STATUS_DOT_SIZE_PX,
            height: STATUS_DOT_SIZE_PX,
            borderRadius: '50%',
            background: live ? 'red' : 'gray',
          }}
        />
        {live ? 'Live' : 'Waiting ...'}
      </span>
      {formattedTimestamp && (
        <time
          aria-label="Image timestamp"
          dateTime={formattedTimestamp.dateTime}
          style={{
            padding: LABEL_PADDING,
            background: LABEL_BACKGROUND,
            borderRadius: LABEL_CORNER_RADIUS_PX,
          }}
        >
          {formattedTimestamp.text}
        </time>
      )}
    </span>
  );
});
