import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useStore = create(
    persist(
        (set) => ({
            // =================================================================
            // 1. STATE DEFINITIONS
            // =================================================================
            alarms: [],
            isAiEnabled: false,

            // =================================================================
            // 2. ALARM ACTIONS
            // =================================================================
            addAlarm: (id) => set((state) => ({
                // Ensures item array behaves like a Set to keep identity values unique
                alarms: state.alarms.includes(id) ? state.alarms : [...state.alarms, id]
            })),

            removeAlarm: (id) => set((state) => ({
                alarms: state.alarms.filter(alarmId => alarmId !== id)
            })),

            clearAlarms: () => set({ alarms: [] }),

            // =================================================================
            // 3. AI TOGGLE ACTIONS
            // =================================================================
            toggleAi: () => set((state) => ({
                isAiEnabled: !state.isAiEnabled
            })),

            setAi: (isEnabled) => set({
                isAiEnabled: isEnabled
            })
        }),
        {
            name: 'alarm-storage',

            // Modern, error-free storage binding safe for both SSR and standard client apps
            storage: typeof window !== 'undefined'
                ? createJSONStorage(() => localStorage)
                : undefined
        }
    )
);
