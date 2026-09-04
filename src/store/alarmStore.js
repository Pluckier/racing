import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Internal parser matching your component logic exactly
const parseFoaled = (str) => {
    if (!str) return { dam: '', broodmareSire: '', sire: '' };
    const match = str.match(/D:\s*(.*?)\s*\((.*?)\)\s*S:\s*(.*)/i);
    return match 
        ? { dam: match[1].trim(), broodmareSire: match[2].trim(), sire: match[3].trim() }
        : { dam: str.trim(), broodmareSire: '', sire: '' };
};

export const useStore = create(
    persist(
        (set, get) => ({
            // =================================================================
            // 1. STATE DEFINITIONS
            // =================================================================
            alarms: [],
            // 0 = Off, 1 = Basic/Mode A, 2 = Advanced/Mode B
            aiMode: 0,

            // W/D/G slider values (0-100) - legacy / fallback
            wValue: 0,
            dValue: 0,
            gValue: 0,

            // Per-race slider values { [raceKey]: { w: 0, d: 0, g: 0 } }
            raceSliders: {},

            // Selected trainers list (defaults to null)
            selectedTrainers: null,
            // Selected jockeys list (defaults to null)
            selectedJockeys: null,
            // Selected owners list (defaults to null)
            selectedOwners: null,
            
            // Legacy selected foaled list (automatically updated & synced)
            selectedFoaled: null,

            // New separate lineage tracks (defaults to null)
            selectedDams: null,
            selectedBroodmareSires: null,
            selectedSires: null,

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
            
            // Left intact for direct overrides if legacy code updates it from outside
            setSelectedFoaled: (foaled) => set({ selectedFoaled: foaled }),

            // ✅ CHANGED: Setters now receive 'races' data to rebuild full combo strings
            setSelectedDams: (dams, races) => set((state) => {
                const nextState = { selectedDams: dams };
                nextState.selectedFoaled = state.deriveLegacyFoaled(dams, state.selectedBroodmareSires, state.selectedSires, races);
                return nextState;
            }),

            setSelectedBroodmareSires: (bms, races) => set((state) => {
                const nextState = { selectedBroodmareSires: bms };
                nextState.selectedFoaled = state.deriveLegacyFoaled(state.selectedDams, bms, state.selectedSires, races);
                return nextState;
            }),

            setSelectedSires: (sires, races) => set((state) => {
                const nextState = { selectedSires: sires };
                nextState.selectedFoaled = state.deriveLegacyFoaled(state.selectedDams, state.selectedBroodmareSires, sires, races);
                return nextState;
            }),

            // ✅ CHANGED: Scans today's races to find full text strings for backwards-compatibility
            deriveLegacyFoaled: (dams, bms, sires, races) => {
                if (dams === null && bms === null && sires === null) return null;

                const activeDams = dams || [];
                const activeBms = bms || [];
                const activeSires = sires || [];

                const matchingFullStrings = new Set();

                races?.forEach(race => {
                    race.horses?.forEach(horse => {
                        const rawFoaled = horse.foaled?.trim();
                        if (rawFoaled) {
                            const parsed = parseFoaled(rawFoaled);
                            // If ANY component is checked in its panel, save the entire combination string!
                            if (
                                activeDams.includes(parsed.dam) || 
                                activeBms.includes(parsed.broodmareSire) || 
                                activeSires.includes(parsed.sire)
                            ) {
                                matchingFullStrings.add(rawFoaled);
                            }
                        }
                    });
                });

                return Array.from(matchingFullStrings);
            },

            // =================================================================
            // 5. SLIDER ACTIONS
            // =================================================================
            setW: (v) => set({ wValue: Math.min(100, Math.max(0, v)) }),
            setD: (v) => set({ dValue: Math.min(100, Math.max(0, v)) }),
            setG: (v) => set({ gValue: Math.min(100, Math.max(0, v)) }),

            setRaceSlider: (raceKey, key, value) => set((state) => ({
                raceSliders: {
                    ...(state.raceSliders || {}),
                    [raceKey]: {
                        w: 0,
                        d: 0,
                        g: 0,
                        ...(state.raceSliders?.[raceKey] || {}),
                        [key]: Math.min(100, Math.max(0, value))
                    }
                }
            })),
        }),
        {
            name: 'alarm-storage',

            storage: typeof window !== 'undefined'
                ? createJSONStorage(() => localStorage)
                : undefined
        }
    )
);
