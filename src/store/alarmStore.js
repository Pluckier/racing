import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useStore = create(
    persist(
        (set) => ({
            // =================================================================
            // 1. STATE DEFINITIONS
            // =================================================================
            alarms: [],
            // 0 = Off, 1 = Basic/Mode A, 2 = Advanced/Mode B
            aiMode: 0,

            // =================================================================
            // 2. ALARM ACTIONS
            // =================================================================
            addAlarm: (id) => set((state) => ({
                alarms: state.alarms.includes(id) ? state.alarms : [...state.alarms, id]
            })),

            removeAlarm: (id) => set((state) => ({
                alarms: state.alarms.filter(alarmId => alarmId !== id)
            })),

            clearAlarms: () => set({ alarms: [] }),

            // =================================================================
            // 3. AI TOGGLE ACTIONS
            // =================================================================
            // Cycles cleanly: 0 -> 1 -> 2 -> 0
            toggleAi: () => set((state) => ({
                aiMode: (state.aiMode + 1) % 3
            })),

            // Directly sets the mode, ensuring it stays within the 0-2 range
            setAi: (mode) => set({
                aiMode: [0, 1, 2].includes(mode) ? mode : 0
            })
        }),
        {
            name: 'alarm-storage',

            storage: typeof window !== 'undefined'
                ? createJSONStorage(() => localStorage)
                : undefined
        }
    )
);
