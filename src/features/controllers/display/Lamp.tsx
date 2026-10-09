import { getLampAsset } from '../utils/lampStateMapping';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { LampModel } from '@/karabo/common/api';
import { getBindingValue } from '../utils/getBindingValue';

const Lamp: React.FC<{
  model: LampModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const value = getBindingValue(ctx?.proxy);

  return (
    <img
      src={getLampAsset(value)}
      alt={typeof value === 'string' ? value : 'Unknown'}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
};

export default Lamp;
