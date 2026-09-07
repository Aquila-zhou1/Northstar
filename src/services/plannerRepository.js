import { clone, defaultState, STORAGE_KEY } from '../domain/planner';

export const localPlannerRepository = {
  async load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...clone(defaultState), ...JSON.parse(saved) } : clone(defaultState);
    } catch {
      return clone(defaultState);
    }
  },

  async save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
};
