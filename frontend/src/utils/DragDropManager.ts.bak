// frontend/src/utils/DragDropManager.ts
import { logger } from './Logger';
import { eventManager } from './EventManager';

export interface DragDropCallbacks {
  onDragStart?: (element: HTMLElement, data: any) => void;
  onDragEnd?: (element: HTMLElement, data: any) => void;
  onDragOver?: (target: HTMLElement, draggedData: any) => boolean;
  onDrop?: (target: HTMLElement, draggedData: any) => void;
}

export class DragDropManager {
  private static instance: DragDropManager;
  private draggedElement: HTMLElement | null = null;
  private draggedData: any = null;
  private callbacks: DragDropCallbacks = {};
  private dragGroups: Map<string, HTMLElement[]> = new Map();

  private constructor() {}

  static getInstance(): DragDropManager {
    if (!DragDropManager.instance) {
      DragDropManager.instance = new DragDropManager();
    }
    return DragDropManager.instance;
  }

  /**
   * Initialize drag and drop for a group of elements
   */
  initializeGroup(
    groupName: string,
    draggableElements: HTMLElement[],
    dropZones: HTMLElement[],
    callbacks: DragDropCallbacks
  ): void {
    this.callbacks = callbacks;
    this.dragGroups.set(groupName, draggableElements);

    // Setup draggable elements
    draggableElements.forEach(element => {
      this.makeDraggable(element);
    });

    // Setup drop zones
    dropZones.forEach(zone => {
      this.makeDroppable(zone);
    });

    logger.info('DragDropManager', `Initialized drag-drop group: ${groupName}`);
  }

  /**
   * Make an element draggable
   */
  private makeDraggable(element: HTMLElement): void {
    element.draggable = true;
    element.setAttribute('data-draggable', 'true');

    eventManager.add('drag-drop', element, 'dragstart', (e: Event) => {
      const dragEvent = e as DragEvent;
      this.draggedElement = element;

      // Get drag data from element attributes
      this.draggedData = {
        id: element.getAttribute('data-player-id') || element.id,
        name: element.getAttribute('data-player-name') || element.textContent?.trim(),
        type: element.getAttribute('data-player-type') || 'unknown'
      };

      element.classList.add('dragging');

      if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.effectAllowed = 'move';
        dragEvent.dataTransfer.setData('text/plain', this.draggedData.id);
      }

      this.callbacks.onDragStart?.(element, this.draggedData);
      logger.debug('DragDropManager', 'Drag started', this.draggedData);
    });

    eventManager.add('drag-drop', element, 'dragend', (e: Event) => {
      element.classList.remove('dragging');
      this.draggedElement = null;

      // Clean up drag-over classes
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

      this.callbacks.onDragEnd?.(element, this.draggedData);
      logger.debug('DragDropManager', 'Drag ended', this.draggedData);

      this.draggedData = null;
    });
  }

  /**
   * Make an element a drop zone
   */
  private makeDroppable(zone: HTMLElement): void {
    eventManager.add('drag-drop', zone, 'dragover', (e: Event) => {
      e.preventDefault();
      const dragEvent = e as DragEvent;

      if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.dropEffect = 'move';
      }

      zone.classList.add('drag-over');

      // Check if drop is allowed
      const allowed = this.callbacks.onDragOver?.(zone, this.draggedData) ?? true;
      if (!allowed) {
        zone.classList.add('drag-not-allowed');
      }
    });

    eventManager.add('drag-drop', zone, 'dragleave', (e: Event) => {
      const dragEvent = e as DragEvent;
      const rect = zone.getBoundingClientRect();
      const x = dragEvent.clientX;
      const y = dragEvent.clientY;

      // Only remove classes if we're actually leaving the zone
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        zone.classList.remove('drag-over', 'drag-not-allowed');
      }
    });

    eventManager.add('drag-drop', zone, 'drop', (e: Event) => {
      e.preventDefault();
      e.stopPropagation();

      zone.classList.remove('drag-over', 'drag-not-allowed');

      if (!this.draggedElement || !this.draggedData) {
        logger.warn('DragDropManager', 'Drop event but no dragged element');
        return;
      }

      logger.debug('DragDropManager', 'Drop event', {
        dragged: this.draggedData,
        target: zone.id || zone.className
      });

      this.callbacks.onDrop?.(zone, this.draggedData);
    });
  }

  /**
   * Move an element to a new parent
   */
  moveElement(element: HTMLElement, newParent: HTMLElement, insertPosition: 'before' | 'after' | 'append' = 'append'): void {
    if (!element || !newParent) return;

    try {
      if (insertPosition === 'append') {
        newParent.appendChild(element);
      } else {
        const reference = insertPosition === 'before' ? newParent : newParent.nextSibling;
        newParent.parentNode?.insertBefore(element, reference);
      }

      logger.debug('DragDropManager', 'Element moved', {
        element: element.id,
        newParent: newParent.id,
        position: insertPosition
      });
    } catch (error) {
      logger.error('DragDropManager', 'Failed to move element', error);
    }
  }

  /**
   * Swap two elements
   */
  swapElements(element1: HTMLElement, element2: HTMLElement): void {
    if (!element1 || !element2) return;

    try {
      const parent1 = element1.parentNode;
      const parent2 = element2.parentNode;

      if (!parent1 || !parent2) return;

      const sibling1 = element1.nextSibling;
      const sibling2 = element2.nextSibling;

      parent1.insertBefore(element2, sibling1);
      parent2.insertBefore(element1, sibling2);

      logger.debug('DragDropManager', 'Elements swapped', {
        element1: element1.id,
        element2: element2.id
      });
    } catch (error) {
      logger.error('DragDropManager', 'Failed to swap elements', error);
    }
  }

  /**
   * Clean up all drag-drop event listeners
   */
  cleanup(): void {
    eventManager.removeGroup('drag-drop');
    this.dragGroups.clear();
    this.draggedElement = null;
    this.draggedData = null;
    logger.info('DragDropManager', 'Cleaned up all drag-drop listeners');
  }

  /**
   * Get current dragged data
   */
  getDraggedData(): any {
    return this.draggedData;
  }

  /**
   * Check if an element is currently being dragged
   */
  isDragging(): boolean {
    return this.draggedElement !== null;
  }
}

export const dragDropManager = DragDropManager.getInstance();