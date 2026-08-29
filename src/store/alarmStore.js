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

             // W/D/G slider values (0-100)
            wValue: 0,
            dValue: 0,
            gValue: 0,

            // Selected trainers list (defaults to null)
            selectedTrainers: null,
            // Selected jockeys list (defaults to null)
            selectedJockeys: null,
            // Selected owners list (defaults to null)
            selectedOwners: null,
            // Selected foaled list (defaults to null)
            selectedFoaled: null,

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
            }),

            // =================================================================
            // 4. TRAINER/JOCKEY ACTIONS
            // =================================================================
            setSelectedTrainers: (trainers) => set({ selectedTrainers: trainers }),
            setSelectedJockeys: (jockeys) => set({ selectedJockeys: jockeys }),
            setSelectedOwners: (owners) => set({ selectedOwners: owners }),
            setSelectedFoaled: (foaled) => set({ selectedFoaled: foaled }),

            // =================================================================
            // 5. SLIDER ACTIONS
            // =================================================================
            setW: (v) => set({ wValue: Math.min(100, Math.max(0, v)) }),
            setD: (v) => set({ dValue: Math.min(100, Math.max(0, v)) }),
            setG: (v) => set({ gValue: Math.min(100, Math.max(0, v)) }),
        }),
        {
            name: 'alarm-storage',

            storage: typeof window !== 'undefined'
                ? createJSONStorage(() => localStorage)
                : undefined
        }
    )
);
