import matplotlib.pyplot as plt
from datetime import datetime, timedelta

# Simple Gantt chart based on project timeline
start = datetime(2025, 9, 1)
tasks = [
    ("Planning", 0, 14),
    ("Design", 14, 21),
    ("Implementation", 35, 60),
    ("Testing", 95, 28),
    ("Deployment", 123, 7),
    ("Documentation", 130, 20)
]

fig, ax = plt.subplots(figsize=(10,4))
for i,(name, offset, length) in enumerate(reversed(tasks)):
    ax.broken_barh([(offset, length)], (i-0.4, 0.8), facecolors=('tab:blue'))
    ax.text(offset+1, i, name, va='center', ha='left', color='white', fontsize=12)

ax.set_ylim(-1, len(tasks))
ax.set_xlim(0, 120)
ax.set_xlabel('Days since 2025-09-01')
ax.set_yticks([])
ax.set_title('Project Gantt Chart')
plt.tight_layout()
plt.savefig('gantt.png', dpi=150)
print('gantt.png generated')
