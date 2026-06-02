import { render } from '@testing-library/react';
import React from 'react';
import { SceneViewport } from '../SceneViewport';

describe('SceneViewport', () => {
  it('preserves auto overflow without forcing scrollbars hidden', () => {
    const containerRef = React.createRef<HTMLDivElement>();

    render(
      <SceneViewport
        containerRef={containerRef}
        style={{ overflowX: 'auto', overflowY: 'auto' }}
      >
        content
      </SceneViewport>
    );

    expect(containerRef.current).not.toBeNull();
    expect(containerRef.current).toHaveStyle({
      overflowX: 'auto',
      overflowY: 'auto',
    });
    expect(containerRef.current?.style.scrollbarWidth).toBe('');
  });
});
