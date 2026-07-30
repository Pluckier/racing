import { create } from 'zustand'; // FIXED: Use named import

export const useAlarmStore = create((set) => ({
    // Using an array makes React re-renders highly reliable
    alarms: [],

    addAlarm: (id) => set((state) => ({
        // Only add if it doesn't already exist (simulating Set behavior)
        alarms: state.alarms.includes(id) ? state.alarms : [...state.alarms, id]
    })),

    removeAlarm: (id) => set((state) => ({
        alarms: state.alarms.filter(alarmId => alarmId !== id)
    })),

    clearAlarms: () => set({ alarms: [] })
}));
