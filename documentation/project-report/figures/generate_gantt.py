import matplotlib.pyplot as plt
import matplotlib.patches as patches
from datetime import datetime


# Simplified Gantt chart with clean text positioning
start_date = datetime(2025, 9, 1)

# Scale factor for fonts (30% increase)
scale = 1.3

phases = [
    {
        'name': 'Planning & Design',
        'color': '#4A90E2',
        'start': 0,
        'duration': 21,
        'modules': [
            ('Website Flow', 0, 14),
            ('Microservices', 0, 14),
            ('Security', 0, 21)
        ]
    },
    {
        'name': 'Core Development',
        'color': '#50C878',
        'start': 14,
        'duration': 35,
        'modules': [
            ('Frontend', 14, 35),
            ('Auth Service', 14, 8),
            ('User Service', 22, 12),
            ('Game Service', 14, 15),
            ('Tournament Service', 29, 8)
        ]
    },
    {
        'name': 'Security & Blockchain',
        'color': '#FF6B6B',
        'start': 22,
        'duration': 39,
        'modules': [
            ('Vault', 22, 10),
            ('ModSecurity', 32, 10),
            ('Blockchain', 37, 14)
        ]
    },
    {
        'name': 'Testing & QA',
        'color': '#FFA500',
        'start': 49,
        'duration': 45,
        'modules': []
    },
]

# Create figure with clean layout - increased height for better spacing
fig, ax = plt.subplots(figsize=(16, 14))
# Give room on the left for the Party Assigned column
left_margin = 0.32
fig.subplots_adjust(left=left_margin)

# Plot main phases and modules with clean text positioning
y_pos = 0
plotted_items = []  # collect items for party labels and horizontal lines

for phase in phases:
    # skip Deployment if present

    phase_y = y_pos

    # compute shifted start to avoid left overlap with party column
    start = phase['start']

    # Main phase bar
    ax.broken_barh([(start, phase['duration'])], (phase_y-0.3, 0.6),
           facecolors=phase['color'], edgecolors='black', linewidth=1.5, alpha=0.8, zorder=2)

    # Phase label - left-aligned to the start of the bar
    ax.text(start + 0.2, phase_y + 1.0, phase['name'],
        ha='left', va='bottom', fontsize=int(14*scale), fontweight='bold', zorder=3)

    # record phase for party labeling and horizontal line
    plotted_items.append({'label': phase['name'], 'y': phase_y})

    # Add modules with increased vertical spacing and ensure they don't overlap next phase
    if phase['modules']:
        module_y = phase_y - 1.8  # more separation to avoid overlap

        for module_idx, (module_name, module_start, module_duration) in enumerate(phase['modules']):
            # (service, x, y) => service starts at day x and lasts y days
            module_x = module_start

            # Module bar
            ax.broken_barh([(module_x, module_duration)], (module_y-0.2, 0.4),
                           facecolors=phase['color'], edgecolors='black', linewidth=1, alpha=0.9, zorder=2)

            # Module label - positioned above the module bar with larger 12pt font and separation
            ax.text(module_x, module_y + 0.4, module_name,
                    ha='left', va='bottom', fontsize=int(12*scale), fontweight='medium', zorder=3)

            # record module for party labeling and horizontal line
            plotted_items.append({'label': module_name, 'y': module_y})

            # Increase vertical spacing between modules
            module_y -= 1.25

        # leave extra space after modules before next phase
        y_pos = module_y - 1.2
    else:
        y_pos -= 2.2

# Styling and axes
# Extend xlim to include the Party Assigned column at x=-20, but do NOT show negative tick labels.
ax.set_xlim(-22, 100)
ax.set_ylim(y_pos - 0.4, 4)  # Reduce whitespace above x-axis
ax.set_xlabel('Days from Project Start (2025-09-01)', fontsize=int(13*scale))

# Force x ticks to be non-negative only
xticks = list(range(0, 101, 10))
ax.set_xticks(xticks)

# Add grid
ax.grid(True, alpha=0.3, axis='x')
ax.set_axisbelow(True)

legend_elements = [
    patches.Patch(facecolor='#4A90E2', label='Planning & Design'),
    patches.Patch(facecolor='#50C878', label='Core Development'),
    patches.Patch(facecolor='#FF6B6B', label='Security & Blockchain'),
    patches.Patch(facecolor='#FFA500', label='Testing & QA'),
]
ax.legend(handles=legend_elements, loc='upper right', fontsize=int(10*scale))

# Remove y-axis ticks/markers for a cleaner look
ax.set_yticks([])
ax.yaxis.set_visible(False)

# Party Assigned column values
party_map = {
    'Testing & QA': 'Team',
    'Auth Service': 'Danish, Hoach',
    'User Service': 'Hoach',
    'Game Service': 'Hoach, Calvin',
    'Tournament Service': 'Calvin',
    'Website Flow': 'Mahad',
    'Microservices': 'Hoach, Calvin',
    'Security': 'Danish',
    'Frontend': 'Mahad',
    'Blockchain': 'Calvin',
    'Vault': 'Danish',
    'WAF': 'Danish'
}

party_x = -20

# Party Assigned header in true data coords (x=-20)
ax.text(party_x, 2.5, 'Party Assigned', fontsize=int(12*scale), fontweight='bold', ha='left', va='center', clip_on=False)

# Draw horizontal guide lines and party labels for each plotted item
for item in plotted_items:
    y = item['y']
    # horizontal guide line across plotting area
    ax.hlines(y, xmin=0, xmax=100, color='gray', linewidth=0.6, alpha=0.25, zorder=1)
    party = party_map.get(item['label'], '')
    if party:
        ax.text(party_x, y, party, fontsize=int(11*scale), ha='left', va='center', clip_on=False)

plt.tight_layout()
plt.savefig('gantt.png', dpi=150, bbox_inches='tight')
print('✓ Clean Gantt chart generated with service names above boxes and larger fonts')
