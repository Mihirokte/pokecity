import type { ReactNode } from 'react';
import { badgeUrl, MODULE_BADGE_IDS } from '../../config/pokemon';

interface ModuleHeaderProps {
  moduleType: string;
  title: string;
  /** Action buttons / controls rendered on the right side of the header */
  children?: ReactNode;
}

export function ModuleHeader({ moduleType, title, children }: ModuleHeaderProps) {
  return (
    <div className="mod-header">
      <span className="mod-header__title-wrap">
        <img
          src={badgeUrl(MODULE_BADGE_IDS[moduleType] ?? 1)}
          alt=""
          className="pokecity-badge pokecity-badge--mod"
        />
        <span className="mod-title">{title}</span>
      </span>
      {children && <div style={{ display: 'flex', gap: 6 }}>{children}</div>}
    </div>
  );
}
