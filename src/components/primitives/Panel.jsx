import { useState } from 'react';
import { cx } from '../../lib/cx.js';

/**
 * Panel — a collapsible card. Renders the mock's `.panel` shell with a
 * collapsible header (title + caret); clicking the header toggles `collapsed`
 * (local UI state). base.css hides everything but the header when collapsed.
 *
 * The body is provided by the caller as children (e.g. a `.bd` or `.layers`
 * wrapper) so Panel stays layout-agnostic and reusable across Layers, Saved
 * sessions and the drift cards.
 */
export default function Panel({ title, children, className, defaultCollapsed = false, id }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <div className={cx('panel', collapsed && 'collapsed', className)} id={id}>
      <div
        className="hd hd-collapsible"
        onClick={() => setCollapsed((c) => !c)}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed((c) => !c); }
        }}
      >
        <h3>{title}</h3>
        <span className="hd-caret">▾</span>
      </div>
      {children}
    </div>
  );
}
