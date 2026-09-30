import { fireEvent, render, screen } from '@testing-library/react';
import { KaraboEvent } from '@/lib/events';
import { getMediator } from '@/lib/singletons/api';
import { SceneOpenError } from '../SceneStatusViews';

describe('SceneOpenError', () => {
  it('goes back to the Home tab', () => {
    const onGoToHomeTab = jest.fn();
    const unsubscribe = getMediator().on(
      KaraboEvent.GoToHomeTab,
      onGoToHomeTab
    );

    render(<SceneOpenError message="Scene missing" />);
    fireEvent.click(screen.getByTestId('scene-error-back'));

    expect(onGoToHomeTab).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
