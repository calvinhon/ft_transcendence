// frontend/src/utils/EventManager.ts
import { logger } from './Logger';

export interface EventListener {
  element: EventTarget;
  type: string;
  handler: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
}

export class EventManager {
  private static instance: EventManager;
  private listeners: Map<string, EventListener[]> = new Map();
  private debouncers: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * Add an event listener with optional grouping
   */
  add(
    group: string,
    element: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!this.listeners.has(group)) {
      this.listeners.set(group, []);
    }

    const listener: EventListener = { element, type, handler, options };
    this.listeners.get(group)!.push(listener);

    try {
      element.addEventListener(type, handler, options);
      logger.debug('EventManager', `Added ${type} listener to group ${group}`);
    } catch (error) {
      logger.error('EventManager', `Failed to add ${type} listener to group ${group}`, error);
    }
  }

  /**
   * Remove all listeners in a group
   */
  removeGroup(group: string): void {
    const groupListeners = this.listeners.get(group);
    if (!groupListeners) return;

    groupListeners.forEach(listener => {
      try {
        listener.element.removeEventListener(listener.type, listener.handler, listener.options);
      } catch (error) {
        logger.warn('EventManager', `Failed to remove ${listener.type} listener from group ${group}`, error);
      }
    });

    this.listeners.delete(group);
    logger.debug('EventManager', `Removed all listeners from group ${group}`);
  }

  /**
   * Debounce a function call
   */
  debounce(key: string, func: Function, delay: number): void {
    const existingTimeout = this.debouncers.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = window.setTimeout(() => {
      func();
      this.debouncers.delete(key);
    }, delay);

    this.debouncers.set(key, timeout);
  }

  /**
   * Clear all debouncers
   */
  clearDebouncers(): void {
    this.debouncers.forEach(timeout => clearTimeout(timeout));
    this.debouncers.clear();
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(): number {
    let count = 0;
    this.listeners.forEach(group => count += group.length);
    return count;
  }

  /**
   * Get group names for debugging
   */
  getGroups(): string[] {
    return Array.from(this.listeners.keys());
  }
}

export const eventManager = EventManager.getInstance();