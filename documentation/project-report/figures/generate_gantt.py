import matplotlib.pyplot as plt
import matplotlib.patches as patches
from datetime import datetime

# Simplified Gantt chart with clean text positioning
start_date = datetime(2025, 9, 1)

# Main phases with modules - simplified
phases = [
    {
        'name': 'Planning & Design',
        'color': '#4A90E2',
        'start': 0,
        'duration': 14,
        'modules': []
    },
    {
        'name': 'Core Development',
        'color': '#50C878',
        'start': 14,
        'duration': 35,
        'modules': [
            ('Auth Service', 14, 8),
            ('User Service', 18, 8),
            ('Game Service', 22, 10),
            ('Tournament Service', 26, 8),
            ('Frontend', 30, 12)
        ]
    },
    {
        'name': 'Security & Blockchain',
        'color': '#FF6B6B',
        'start': 49,
        'duration': 14,
        'modules': [
            ('Blockchain', 49, 6),
            ('Vault', 51, 4),
            ('WAF', 53, 6)
        ]
    },
    {
        'name': 'Testing & QA',
        'color': '#FFA500',
        'start': 63,
        'duration': 21,
        'modules': []
    },
    {
        'name': 'Deployment & Launch',
        'color': '#9B59B6',
        'start': 84,
        'duration': 14,
        'modules': [
            ('SSR Service', 84, 7)
        ]
    }
]

# Create figure with clean layout - increased height for better spacing
fig, ax = plt.subplots(figsize=(16, 14))

# Plot main phases and modules with clean text positioning
y_pos = 0

for phase_idx, phase in enumerate(phases):
    phase_y = y_pos

    # Main phase bar
    ax.broken_barh([(phase['start'], phase['duration'])], (phase_y-0.3, 0.6),
                   facecolors=phase['color'], edgecolors='black', linewidth=1.5, alpha=0.8)

    # Phase label - positioned above the bar with larger font and more separation
    ax.text(phase['start'] + phase['duration']/2, phase_y + 1.0, phase['name'],
            ha='center', va='bottom', fontsize=14, fontweight='bold')

    # Add modules with increased vertical spacing
    if phase['modules']:
        module_y = phase_y - 1.5  # Position modules further below the phase bar

        for module_idx, (module_name, module_start, module_duration) in enumerate(phase['modules']):
            # Calculate x position to avoid overlap - distribute evenly in available space
            available_width = phase['duration']
            module_spacing = available_width / (len(phase['modules']) + 1)
            module_x = phase['start'] + module_spacing * (module_idx + 1) - module_duration/2

            # Ensure module stays within phase boundaries
            module_x = max(phase['start'], min(module_x, phase['start'] + phase['duration'] - module_duration))

            # Module bar
            ax.broken_barh([(module_x, module_duration)], (module_y-0.2, 0.4),
                           facecolors=phase['color'], edgecolors='black', linewidth=1, alpha=0.9)

            # Module label - positioned above the module bar with larger 12pt font and separation
            ax.text(module_x + module_duration/2, module_y + 0.4, module_name,
                    ha='center', va='bottom', fontsize=12, fontweight='medium')

            # Increase vertical spacing between modules
            module_y -= 1.2

        y_pos -= 4.0  # More space between phases with modules due to increased spacing
    else:
        y_pos -= 1.5  # Normal spacing for phases without modules

# Add current progress indicator with larger font
current_date = datetime(2025, 12, 18)
days_elapsed = (current_date - start_date).days
if days_elapsed > 0:
    ax.axvline(x=days_elapsed, color='red', linewidth=2, alpha=0.8)
    ax.text(days_elapsed, 1.5, 'Today', ha='center', va='bottom',
            fontsize=13, color='red', fontweight='bold')

# Styling with adjusted limits for new spacing
ax.set_xlim(-5, 110)
ax.set_ylim(y_pos - 2, 4)  # Adjust y limits for increased text separation
ax.set_xlabel('Days from Project Start (2025-09-01)', fontsize=13)
ax.set_title('ft_transcendence Project Timeline - Phases & Modules', fontsize=16, fontweight='bold', pad=20)

# Add grid
ax.grid(True, alpha=0.3, axis='x')
ax.set_axisbelow(True)

# Clean legend
legend_elements = [
    patches.Patch(facecolor='#4A90E2', label='Planning & Design'),
    patches.Patch(facecolor='#50C878', label='Core Development'),
    patches.Patch(facecolor='#FF6B6B', label='Security & Blockchain'),
    patches.Patch(facecolor='#FFA500', label='Testing & QA'),
    patches.Patch(facecolor='#9B59B6', label='Deployment & Launch'),
    plt.Line2D([0], [0], color='red', linewidth=2, label='Current Progress')
]
ax.legend(handles=legend_elements, loc='upper right', fontsize=10)

# Add week markers with adjusted positioning
for week in range(0, 101, 14):  # Every 2 weeks
    ax.axvline(x=week, color='gray', alpha=0.2, linewidth=0.5)
    ax.text(week, y_pos - 1, f'W{week//7}', ha='center', va='top', fontsize=11, color='gray')

plt.tight_layout()
plt.savefig('gantt.png', dpi=150, bbox_inches='tight')
print('✓ Clean Gantt chart generated with service names above boxes and larger fonts')
