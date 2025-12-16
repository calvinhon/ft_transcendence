// frontend/src/managers/tournament/TournamentDragDropManager.ts
// Handles drag and drop functionality for tournament bracket player swapping

import { showToast } from '../../toast';

export class TournamentDragDropManager {
  private draggedElement: HTMLElement | null = null;

  constructor() {
    console.log('🏆 [TournamentDragDropManager] Initialized');
  }

  // Initialize drag and drop for a tournament bracket
  public initializeDragAndDrop(): void {
    const draggablePlayers = document.querySelectorAll('.draggable-player');
    const playerSlots = document.querySelectorAll('.match-player-slot');

    console.log('🎯 [DRAG-DROP] Initializing drag and drop:');
    console.log('  - Draggable players found:', draggablePlayers.length);
    console.log('  - Player slots found:', playerSlots.length);

    if (draggablePlayers.length === 0) {
      console.warn('⚠️ [DRAG-DROP] No draggable players found! Check if tournament is active and matches are pending.');
      return;
    }

    // Set up draggable players
    draggablePlayers.forEach((player, index) => {
      const playerElement = player as HTMLElement;
      console.log(`  - Player ${index}:`, {
        name: playerElement.getAttribute('data-player-name'),
        draggable: playerElement.getAttribute('draggable'),
        hasClass: playerElement.classList.contains('draggable-player')
      });

      player.addEventListener('dragstart', (e: Event) => {
        const dragEvent = e as DragEvent;
        const target = dragEvent.target as HTMLElement;
        this.draggedElement = target;
        target.classList.add('dragging');
        dragEvent.dataTransfer!.effectAllowed = 'move';
        dragEvent.dataTransfer!.setData('text/plain', target.getAttribute('data-player-id') || '');
        console.log('🎯 [DRAG-DROP] Drag started:', target.getAttribute('data-player-name'));
      });

      player.addEventListener('dragend', (e: Event) => {
        const target = e.target as HTMLElement;
        target.classList.remove('dragging');
        this.draggedElement = null;
        // Clean up all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        console.log('🎯 [DRAG-DROP] Drag ended');
      });
    });

    // Set up drop zones (player slots)
    playerSlots.forEach(slot => {
      slot.addEventListener('dragover', (e: Event) => {
        e.preventDefault();
        const dragEvent = e as DragEvent;
        dragEvent.dataTransfer!.dropEffect = 'move';
        const slotElement = slot as HTMLElement;
        slotElement.classList.add('drag-over');
      });

      slot.addEventListener('dragleave', (e: Event) => {
        const dragEvent = e as DragEvent;
        const slotElement = e.currentTarget as HTMLElement;
        // Only remove if we're actually leaving the slot (not entering a child)
        const rect = slotElement.getBoundingClientRect();
        const x = dragEvent.clientX;
        const y = dragEvent.clientY;
        if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
          slotElement.classList.remove('drag-over');
        }
      });

      slot.addEventListener('drop', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const dragEvent = e as DragEvent;

        console.log('🎯 [DRAG-DROP] Drop event triggered');

        // Get the target slot (could be the slot itself or a child element)
        let targetSlot = e.target as HTMLElement;
        if (!targetSlot.classList.contains('match-player-slot')) {
          targetSlot = targetSlot.closest('.match-player-slot') as HTMLElement;
        }

        if (!targetSlot) {
          console.warn('🎯 [DRAG-DROP] Target slot not found');
          return;
        }

        targetSlot.classList.remove('drag-over');

        if (!this.draggedElement) {
          console.log('🎯 [DRAG-DROP] No dragged element found');
          return;
        }

        const sourceSlot = this.draggedElement.parentElement as HTMLElement;

        // Only allow swapping within the same match
        const sourceMatchId = sourceSlot.closest('.match-players-container')?.getAttribute('data-match-id');
        const targetMatchId = targetSlot.closest('.match-players-container')?.getAttribute('data-match-id');

        console.log('🎯 [DRAG-DROP] Drop details:', {
          sourceMatchId,
          targetMatchId,
          sourceSlot: sourceSlot.getAttribute('data-side'),
          targetSlot: targetSlot.getAttribute('data-side')
        });

        if (sourceMatchId !== targetMatchId) {
          showToast('Can only swap players within the same match', 'error');
          return;
        }

        // Don't swap if dropping on the same slot
        if (sourceSlot === targetSlot) {
          console.log('🎯 [DRAG-DROP] Same slot, no swap needed');
          return;
        }

        // Get the player in the target slot
        const targetPlayer = targetSlot.querySelector('.match-player') as HTMLElement;

        if (targetPlayer) {
          // Swap the players
          console.log('🎯 [DRAG-DROP] Swapping players:', {
            source: this.draggedElement.getAttribute('data-player-name'),
            target: targetPlayer.getAttribute('data-player-name')
          });

          sourceSlot.appendChild(targetPlayer);
          targetSlot.appendChild(this.draggedElement);

          showToast('Players swapped! Click Play Match to start.', 'success');
        }
      });
    });

    console.log('🎯 [DRAG-DROP] Initialization complete!');
  }

  // Clean up drag and drop event listeners
  public cleanup(): void {
    // Remove all drag-related event listeners
    const draggablePlayers = document.querySelectorAll('.draggable-player');
    const playerSlots = document.querySelectorAll('.match-player-slot');

    draggablePlayers.forEach(player => {
      const element = player as HTMLElement;
      element.removeEventListener('dragstart', this.handleDragStart);
      element.removeEventListener('dragend', this.handleDragEnd);
    });

    playerSlots.forEach(slot => {
      const element = slot as HTMLElement;
      element.removeEventListener('dragover', this.handleDragOver);
      element.removeEventListener('dragleave', this.handleDragLeave);
      element.removeEventListener('drop', this.handleDrop);
    });

    // Clean up drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));

    console.log('🎯 [DRAG-DROP] Cleanup complete');
  }

  // Event handler methods (for cleanup purposes)
  private handleDragStart = (e: Event): void => {
    // Implementation moved to initializeDragAndDrop
  };

  private handleDragEnd = (e: Event): void => {
    // Implementation moved to initializeDragAndDrop
  };

  private handleDragOver = (e: Event): void => {
    // Implementation moved to initializeDragAndDrop
  };

  private handleDragLeave = (e: Event): void => {
    // Implementation moved to initializeDragAndDrop
  };

  private handleDrop = (e: Event): void => {
    // Implementation moved to initializeDragAndDrop
  };
}