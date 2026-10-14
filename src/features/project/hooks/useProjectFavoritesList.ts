import { useEffect, useState, type HTMLAttributes } from 'react';
import type { StoredProjectFavorite } from '@/lib/singletons/api';
import type { ProjectFavoritesListProps } from '../types/projectFavorites.types';

export function useProjectFavoritesList(
  favorites: readonly StoredProjectFavorite[],
  onMove: ProjectFavoritesListProps['onMove'],
  disabled: boolean
) {
  const [dragged, setDragged] = useState<{
    favorite: StoredProjectFavorite;
    favorites: readonly StoredProjectFavorite[];
    key: string;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const activeDrag =
    !disabled && dragged?.favorites === favorites ? dragged : null;

  const clearDrag = () => {
    setDragged(null);
    setDropTarget(null);
  };

  useEffect(() => {
    setDragged(null);
    setDropTarget(null);
  }, [favorites, disabled]);

  return favorites.map((favorite, index) => {
    const key = JSON.stringify([
      favorite.domain,
      favorite.projectUuid,
      favorite.sceneUuid,
    ]);
    const moveUpDisabled = disabled || index === 0;
    const moveDownDisabled = disabled || index === favorites.length - 1;

    return {
      key,
      favorite,
      rank: String(index + 1).padStart(2, '0'),
      dragging: activeDrag?.key === key,
      dropTarget: activeDrag !== null && dropTarget === key,
      moveUpDisabled,
      moveDownDisabled,
      onMoveUp: () => {
        if (!moveUpDisabled) onMove(favorite, index - 1);
      },
      onMoveDown: () => {
        if (!moveDownDisabled) onMove(favorite, index + 1);
      },
      dragProps: {
        draggable: !disabled,
        onDragStart: (event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          event.dataTransfer.effectAllowed = 'move';
          // Keep the trees' React DnD backend from cancelling this native drag.
          event.dataTransfer.setData('text/plain', key);
          setDragged({ favorite, favorites, key });
          setDropTarget(null);
        },
        onDragOver: (event) => {
          if (!activeDrag) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDropTarget(activeDrag.key === key ? null : key);
        },
        onDragLeave: (event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setDropTarget(null);
          }
        },
        onDrop: (event) => {
          if (!activeDrag) return;
          event.preventDefault();
          clearDrag();
          onMove(activeDrag.favorite, index);
        },
        onDragEnd: clearDrag,
      } satisfies HTMLAttributes<HTMLLIElement>,
    };
  });
}
