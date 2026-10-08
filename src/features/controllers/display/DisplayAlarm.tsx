import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { GlobalAlarmModel } from '@/karabo/common/api';
import { getBindingValue } from '../utils/getBindingValue';

import icons from '@/assets/icons';

const DisplayAlarm: React.FC<{
  model: GlobalAlarmModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const value = getBindingValue(ctx?.proxy, undefined);
  let asset = icons.deviceOffline;
  let label = 'Not available';

  switch (value) {
    case 'none':
      asset = icons.alarmNone;
      label = 'No alarm';
      break;
    case 'warn':
      asset = icons.warnGlobal;
      label = 'Warning';
      break;
    case 'alarm':
      asset = icons.alarmGlobal;
      label = 'Alarm';
      break;
    case 'interlock':
      asset = icons.interlock;
      label = 'Interlock';
      break;
  }

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <image href={asset} width="100" height="100" preserveAspectRatio="none" />
    </svg>
  );
};

export default DisplayAlarm;
