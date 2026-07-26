import { useConfig, useConfigDispatch } from '../state/ConfigContext.jsx';
import { setField } from '../state/configReducer.js';
import Panel from './primitives/Panel.jsx';
import Layer from './Layer.jsx';
import BinauralLayerBody from './BinauralLayerBody.jsx';
import IsoLayerBody from './IsoLayerBody.jsx';
import NoiseLayerBody from './NoiseLayerBody.jsx';

/**
 * LayersPanel — the mixer. A collapsible Panel wrapping the three generic
 * Layer tracks; each layer's Power toggle dispatches its config `*.on` flag.
 */
export default function LayersPanel() {
  const { tone, iso, noise } = useConfig();
  const dispatch = useConfigDispatch();

  return (
    <Panel title="Layers">
      <div className="layers">
        <Layer
          name={tone.mode === 'monaural' ? 'Monaural tone' : 'Binaural tone'}
          variant="l-binaural"
          on={tone.on}
          onPower={(v) => dispatch(setField('tone.on', v))}
          hint={
            'Two sine tones (carrier and carrier+beat). Binaural mode hard-pans '
            + 'one to each ear — the beat is a phantom your brain fills in, so '
            + 'headphones are required. Monaural mode sums both tones together so '
            + 'they physically beat: one signal, audible on speakers.'
          }
        >
          <BinauralLayerBody />
        </Layer>

        <Layer
          name="Isochronic pulse"
          variant="l-iso"
          on={iso.on}
          onPower={(v) => dispatch(setField('iso.on', v))}
          hint={
            'A single tone switched on and off at the beat rate. The pulse is '
            + 'imposed by gating, not a beat between two tones — the sharpest, '
            + 'most distinct method, and it works on speakers too.'
          }
        >
          <IsoLayerBody />
        </Layer>

        <Layer
          name="Background noise"
          variant="l-noise"
          on={noise.on}
          onPower={(v) => dispatch(setField('noise.on', v))}
          hint={
            'White / pink / brown noise mixed over the tones to mask them and '
            + 'soften the sound. Optional — some find masked beats more '
            + 'comfortable for long sessions.'
          }
        >
          <NoiseLayerBody />
        </Layer>
      </div>
    </Panel>
  );
}
