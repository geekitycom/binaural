// ConfigContext — provides the config state + dispatch to the React tree.
//
// Split contexts (config value vs. dispatch) so components that only dispatch
// actions don't re-render every time the config changes. This is a standard
// useReducer + context optimization.

import { createContext, useContext, useReducer } from 'react';
import { configReducer, initialConfig } from './configReducer.js';

const ConfigStateContext = createContext(initialConfig);
const ConfigDispatchContext = createContext(() => {});

export function ConfigProvider({ children, initial }) {
  const [config, dispatch] = useReducer(configReducer, initial ?? initialConfig);
  return (
    <ConfigStateContext.Provider value={config}>
      <ConfigDispatchContext.Provider value={dispatch}>
        {children}
      </ConfigDispatchContext.Provider>
    </ConfigStateContext.Provider>
  );
}

// Returns the current (clamped) config object.
export function useConfig() {
  return useContext(ConfigStateContext);
}

// Returns the dispatch function. Pair with the action creators in configReducer.
export function useConfigDispatch() {
  return useContext(ConfigDispatchContext);
}
