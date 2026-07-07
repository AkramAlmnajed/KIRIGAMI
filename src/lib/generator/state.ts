/**
 * Store files for the chosen state option (the app-layer Provider wiring now
 * lives in providers.ts, since a provider is always present for React Query).
 *   - none:    nothing
 *   - zustand: a `useCounterStore` in shared/store (providerless)
 *   - redux:   a store + counter slice in shared/store (Provider added by
 *              providers.ts)
 */
import type { FileSpec } from './types.js';
import type { StateMgmt } from '../../types.js';

export function stateFiles(state: StateMgmt): FileSpec[] {
  if (state === 'none') return [];

  if (state === 'zustand') {
    return [
      {
        path: 'src/shared/store/counter-store.ts',
        contents: `import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  reset: () => set({ count: 0 }),
}));
`,
      },
      {
        path: 'src/shared/store/index.ts',
        contents: `export { useCounterStore } from './counter-store';\n`,
      },
    ];
  }

  // redux
  return [
    {
      path: 'src/shared/store/counter-slice.ts',
      contents: `import { createSlice } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
  },
});

export const { increment, decrement } = counterSlice.actions;
export default counterSlice.reducer;
`,
    },
    {
      path: 'src/shared/store/store.ts',
      contents: `import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './counter-slice';

export const store = configureStore({
  reducer: { counter: counterReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`,
    },
    {
      path: 'src/shared/store/index.ts',
      contents: `export { store } from './store';
export type { RootState, AppDispatch } from './store';
export { increment, decrement } from './counter-slice';
`,
    },
  ];
}
