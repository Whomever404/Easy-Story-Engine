import type { EngineEventCallback } from '../types';

export class EventBus {
  private listeners: Map<string, Set<EngineEventCallback>> = new Map();

  on(event: string, callback: EngineEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EngineEventCallback): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  once(event: string, callback: EngineEventCallback): void {
    const wrapper: EngineEventCallback = (payload: any) => {
      this.off(event, wrapper);
      callback(payload);
    };
    this.on(event, wrapper);
  }

  emit(event: string, payload?: any): void {
    const set = this.listeners.get(event);
    if (set) {
      // Clone set to prevent mutation issues during callback execution
      for (const cb of Array.from(set)) {
        try {
          cb(payload);
        } catch (e) {
          console.error(`[EventBus] Error in listener for event "${event}":`, e);
        }
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
