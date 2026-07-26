import { memo } from 'react';
import Slider from './primitives/Slider.jsx';
import EditableNumber from './primitives/EditableNumber.jsx';
import { cx } from '../lib/cx.js';

/**
 * MixSlider — one labeled slider row (`.vol`): label + Slider + value readout.
 * This is the single row markup that every layer control reuses (tone
 * carrier/beat/vol, iso vol/offset, noise vol) — no copy-pasted slider markup.
 *
 * `driven` marks the row as owned by an automation drift: it fades, disables
 * the slider, and (per base.css `.basetone.driven`) greys the thumb. Callers
 * pass `className="basetone"` for the tone rows so the driven styling applies.
 */
// Memoized so the "driven" tone rows do NOT re-render when their parent
// re-renders on the coarse (~2/s) clock. That matters because React force-syncs
// a controlled <input value> back to its prop on every re-render, which would
// clobber the per-frame imperative thumb-mirroring below. With stable props
// (constant value while driven, module-level formats, useCallback'd onChange,
// ref objects) memo bails out and the imperative writes survive.
// The value readout is click-to-edit (reusing EditableNumber) EXCEPT when the
// row is `driven` by a drift — a driven row keeps the static `.vval` span so
// Phase 6's imperative per-frame `valueRef` mirroring stays intact. Editability
// is opt-in via `editParse`; `editFormat`/`unit`/`inputMode` shape the control,
// and `onCommit` (defaulting to `onChange`) dispatches the parsed number.
function MixSlider({
  label,
  value,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  onChange,
  className,
  driven = false,
  style,
  inputRef,
  valueRef,
  unit = '',
  editFormat,
  editParse,
  inputMode = 'decimal',
  onCommit,
}) {
  const editable = !driven && typeof editParse === 'function';
  return (
    <div className={cx('vol', className, driven && 'driven')} style={style}>
      <span className="vlab">{label}</span>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={driven}
        inputRef={inputRef}
      />
      {editable ? (
        <EditableNumber
          className="vval mono"
          value={value}
          unit={unit}
          format={editFormat ?? format}
          parse={editParse}
          inputMode={inputMode}
          onCommit={onCommit ?? onChange}
          title={`Edit ${label}`}
          ariaLabel={`Edit ${label}`}
        />
      ) : (
        <span className="vval mono" ref={valueRef}>{format(value)}</span>
      )}
    </div>
  );
}

export default memo(MixSlider);
