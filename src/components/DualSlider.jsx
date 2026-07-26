import { useRef } from 'react';
import EditableNumber from './primitives/EditableNumber.jsx';
import { cx } from '../lib/cx.js';

/**
 * DualSlider — the mock's two-handle drift slider (drag + keyboard +
 * click-to-edit), as one reusable controlled control. Ports initDual's
 * pointer/keyboard logic; the click-to-edit numbers reuse EditableNumber.
 *
 * Controlled: `start`/`end` come from config; every change calls
 * `onChange('start'|'end', value)` and the parent dispatches to config (the
 * reducer clamps, so this only snaps to `step`). Handles may cross — the range
 * bar + cue flip between descent/ascent/steady.
 */
export default function DualSlider({
  min, max, step, unit = '', decimals = 0, start, end, onChange,
}) {
  const trackRef = useRef(null);
  const draggingRef = useRef(null);

  const pct = (v) => ((v - min) / (max - min)) * 100;
  const snap = (v) => {
    let s = Math.round((v - min) / step) * step + min;
    s = Math.max(min, Math.min(max, s));
    return Math.round(s * 1e6) / 1e6;
  };
  const fmt = (v) => v.toFixed(decimals);

  function valueFromClientX(clientX) {
    const r = trackRef.current.getBoundingClientRect();
    let p = (clientX - r.left) / r.width;
    p = Math.max(0, Math.min(1, p));
    return snap(min + p * (max - min));
  }

  function handleProps(which) {
    return {
      onPointerDown: (e) => {
        e.preventDefault();
        draggingRef.current = which;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
        e.currentTarget.classList.add('grabbing');
      },
      onPointerMove: (e) => {
        if (draggingRef.current !== which) return;
        onChange?.(which, valueFromClientX(e.clientX));
      },
      onPointerUp: (e) => {
        draggingRef.current = null;
        e.currentTarget.classList.remove('grabbing');
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      },
      onPointerCancel: () => { draggingRef.current = null; },
      onKeyDown: (e) => {
        const cur = which === 'start' ? start : end;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange?.(which, snap(cur - step)); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange?.(which, snap(cur + step)); }
        else if (e.key === 'Home') { e.preventDefault(); onChange?.(which, min); }
        else if (e.key === 'End') { e.preventDefault(); onChange?.(which, max); }
      },
    };
  }

  const ps = pct(start);
  const pe = pct(end);
  const lo = Math.min(ps, pe);
  const hi = Math.max(ps, pe);
  const descent = start > end;
  const steady = start === end;
  const cueText = steady ? '— steady' : (descent ? '↓ descent' : '↑ ascent');

  return (
    <div className="dual">
      <EditableNumber
        className="dnum start"
        value={start}
        unit={unit}
        format={fmt}
        onCommit={(v) => onChange?.('start', snap(v))}
        title="Click to edit start"
      />
      <div className="dtrack" ref={trackRef}>
        <div className={cx('drange', !descent && !steady && 'ascent')} style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
        <span className="dcue" style={{ left: `${(lo + hi) / 2}%` }}>{cueText}</span>
        <button
          type="button"
          className="dhandle h-start"
          style={{ left: `${ps}%` }}
          role="slider"
          aria-label="Start frequency"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={start}
          aria-valuetext={`${fmt(start)}${unit}`}
          {...handleProps('start')}
        />
        <button
          type="button"
          className="dhandle h-end"
          style={{ left: `${pe}%` }}
          role="slider"
          aria-label="End frequency"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={end}
          aria-valuetext={`${fmt(end)}${unit}`}
          {...handleProps('end')}
        />
      </div>
      <EditableNumber
        className="dnum end"
        value={end}
        unit={unit}
        format={fmt}
        onCommit={(v) => onChange?.('end', snap(v))}
        title="Click to edit end"
      />
    </div>
  );
}
