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
          name="Binaural tone"
          variant="l-binaural"
          on={tone.on}
          onPower={(v) => dispatch(setField('tone.on', v))}
        >
          <BinauralLayerBody />
        </Layer>

        <Layer
          name="Isochronic pulse"
          variant="l-iso"
          on={iso.on}
          onPower={(v) => dispatch(setField('iso.on', v))}
        >
          <IsoLayerBody />
        </Layer>

        <Layer
          name="Background noise"
          variant="l-noise"
          on={noise.on}
          onPower={(v) => dispatch(setField('noise.on', v))}
        >
          <NoiseLayerBody />
        </Layer>
      </div>
    </Panel>
  );
}
