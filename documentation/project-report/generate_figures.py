#!/usr/bin/env python3
"""
Generate illustrative figures for the ft_transcendence LaTeX report.
Creates architecture diagrams, flow charts, and system diagrams as PNG images.
Enhanced with better text wrapping, proper box alignment, and connected arrows.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
from matplotlib.lines import Line2D
import numpy as np
from textwrap import wrap

# Set up matplotlib for high-quality output
plt.rcParams['figure.dpi'] = 300
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['font.size'] = 9
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['lines.linewidth'] = 2.0

def wrap_text(text, width=15):
    """Wrap text to specified width for better fitting in boxes"""
    lines = []
    for paragraph in text.split('\n'):
        if len(paragraph) <= width:
            lines.append(paragraph)
        else:
            wrapped = wrap(paragraph, width=width)
            lines.extend(wrapped)
    return '\n'.join(lines)

def create_box_with_text(ax, x, y, width, height, text, color='lightblue', 
                         edgecolor='blue', fontsize=8, fontweight='normal'):
    """Create a box with centered, wrapped text that fits inside"""
    rect = FancyBboxPatch((x - width/2, y - height/2), width, height, 
                          boxstyle="round,pad=0.08", 
                          edgecolor=edgecolor, facecolor=color, linewidth=2.5)
    ax.add_patch(rect)
    
    # Wrap text to fit within box
    wrapped_text = wrap_text(text, width=int(width * 2.5))
    
    # Add text with proper centering
    ax.text(x, y, wrapped_text, fontsize=fontsize, ha='center', va='center', 
            fontweight=fontweight, multialignment='center')

def create_architecture_diagram():
    """Create high-level system architecture diagram"""
    fig, ax = plt.subplots(figsize=(14, 10))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 12)
    ax.axis('off')
    
    # Title
    ax.text(7, 11.5, 'ft_transcendence System Architecture', 
            fontsize=14, fontweight='bold', ha='center')
    
    # CLIENT LAYER
    client_y = 10
    ax.text(7, client_y + 0.8, 'Client Layer', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.5))
    
    clients = [
        (2, 'Web Browser\n(SPA)', 'blue', 'lightblue'),
        (7, 'CLI Client\n(Terminal)', 'blue', 'lightblue'),
        (12, 'Mobile\nBrowser', 'blue', 'lightblue')
    ]
    
    for x, text, edge, face in clients:
        create_box_with_text(ax, x, client_y, 2.2, 0.8, text, color=face, 
                            edgecolor=edge, fontsize=7, fontweight='bold')
    
    # GATEWAY LAYER
    gateway_y = 8.3
    ax.text(7, gateway_y + 0.8, 'API Gateway & WAF', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.5))
    
    # Arrow from clients to gateway
    for x in [2, 7, 12]:
        ax.annotate('', xy=(x, gateway_y + 0.4), xytext=(x, client_y - 0.4),
                   arrowprops=dict(arrowstyle='->', lw=2.5, color='darkblue'))
    
    create_box_with_text(ax, 7, gateway_y, 10.5, 0.7, 
                        'Nginx + ModSecurity + Rate Limiting', 
                        color='lightyellow', edgecolor='red', fontsize=8, fontweight='bold')
    
    # MICROSERVICES LAYER
    services_y = 6.2
    ax.text(7, services_y + 1.2, 'Microservices (Docker Containers)', fontsize=10, fontweight='bold', 
            ha='center', bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.5))
    
    # Arrow from gateway to services
    ax.annotate('', xy=(7, services_y + 0.35), xytext=(7, gateway_y - 0.35),
               arrowprops=dict(arrowstyle='<->', lw=2.5, color='darkred'))
    
    services = [
        (2, 'Auth Service\n(3001)\nRegister, Login\nOAuth, 2FA'),
        (5, 'User Service\n(3002)\nProfiles\nFriends, GDPR'),
        (9, 'Game Service\n(3003)\nPong\nWebSocket, RT'),
        (12, 'Tournament\n(3004)\nBracket\nBlockchain')
    ]
    
    for x, text in services:
        create_box_with_text(ax, x, services_y, 2.2, 1.0, text, 
                            color='lightgreen', edgecolor='darkgreen', fontsize=7)
    
    # DATA & SECRETS LAYER
    data_y = 4.0
    ax.text(7, data_y + 1.2, 'Data & Secrets Management', fontsize=10, fontweight='bold',
            ha='center', bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.5))
    
    # Arrow from services to data
    ax.annotate('', xy=(7, data_y + 0.35), xytext=(7, services_y - 0.35),
               arrowprops=dict(arrowstyle='<->', lw=2.5, color='darkred'))
    
    databases = [
        (2, 'auth.db\nSQLite'),
        (5, 'users.db\nSQLite'),
        (9, 'games.db\nSQLite'),
        (12, 'tournaments.db\nSQLite')
    ]
    
    for x, text in databases:
        create_box_with_text(ax, x, data_y, 1.8, 0.7, text,
                            color='plum', edgecolor='purple', fontsize=7)
    
    # Side systems
    create_box_with_text(ax, 0.7, data_y, 1.2, 0.7, 'Vault\nSecrets',
                        color='moccasin', edgecolor='orange', fontsize=7)
    ax.annotate('', xy=(1.5, data_y), xytext=(1.3, data_y),
               arrowprops=dict(arrowstyle='<->', lw=2, color='orange'))
    
    create_box_with_text(ax, 13.3, data_y, 1.2, 0.7, 'Hardhat\nBlockchain',
                        color='moccasin', edgecolor='orange', fontsize=7)
    ax.annotate('', xy=(12.7, data_y), xytext=(12.5, data_y),
               arrowprops=dict(arrowstyle='<->', lw=2, color='orange'))
    
    # OBSERVABILITY LAYER
    obs_y = 1.5
    ax.text(7, obs_y + 1.2, 'Observability & Monitoring', fontsize=10, fontweight='bold',
            ha='center', bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.5))
    
    # Arrow from data to observability (dashed)
    ax.annotate('', xy=(7, obs_y + 0.35), xytext=(7, data_y - 0.35),
               arrowprops=dict(arrowstyle='->', lw=2, color='black', linestyle='dashed'))
    
    obs_systems = [
        (2.5, 'Prometheus\nMetrics'),
        (5.5, 'Grafana\nDashboards'),
        (8.5, 'Elasticsearch\nLogs'),
        (11.5, 'Kibana\nUI')
    ]
    
    for x, text in obs_systems:
        create_box_with_text(ax, x, obs_y, 2.0, 0.7, text,
                            color='lightcyan', edgecolor='teal', fontsize=7)
    
    plt.tight_layout()
    plt.savefig('architecture_diagram.png', dpi=300, bbox_inches='tight')
    print('✓ architecture_diagram.png created')
    plt.close()

def create_game_loop_diagram():
    """Create game loop synchronization diagram"""
    fig, ax = plt.subplots(figsize=(14, 9))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 11)
    ax.axis('off')
    
    # Title
    ax.text(7, 10.5, 'Game Loop Synchronization (60 FPS Server-Authoritative)', 
            fontsize=13, fontweight='bold', ha='center')
    
    # SERVER SIDE
    ax.text(3.5, 9.8, 'SERVER (60 FPS)', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.7))
    
    server_steps = [
        (9.2, '1. Input\nCollection'),
        (8.0, '2. Game\nLogic'),
        (6.8, '3. Ball\nCalc'),
        (5.6, '4. Score\nUpdate'),
        (4.4, '5. Broadcast\nState'),
    ]
    
    y_start = 9.0
    for idx, (y_pos, label) in enumerate(server_steps):
        y = y_pos
        create_box_with_text(ax, 3.5, y, 2.5, 0.7, label,
                            color='lightblue', edgecolor='darkblue', fontsize=7, fontweight='bold')
        
        if idx < len(server_steps) - 1:
            ax.annotate('', xy=(3.5, y - 0.35), xytext=(3.5, y_start - (idx+1)*1.2 + 0.35),
                       arrowprops=dict(arrowstyle='->', lw=2.5, color='darkblue'))
    
    # CLIENT SIDE
    ax.text(10.5, 9.8, 'CLIENT (Web/CLI)', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.7))
    
    client_steps = [
        (9.2, '1. Receive\nState'),
        (8.0, '2. Validate\nInput'),
        (6.8, '3. Render\nGame'),
        (5.6, '4. Update\nUI'),
        (4.4, '5. Send\nInput'),
    ]
    
    for idx, (y_pos, label) in enumerate(client_steps):
        y = y_pos
        create_box_with_text(ax, 10.5, y, 2.5, 0.7, label,
                            color='lightgreen', edgecolor='darkgreen', fontsize=7, fontweight='bold')
        
        if idx < len(client_steps) - 1:
            ax.annotate('', xy=(10.5, y - 0.35), xytext=(10.5, y_start - (idx+1)*1.2 + 0.35),
                       arrowprops=dict(arrowstyle='->', lw=2.5, color='darkgreen'))
    
    # SYNCHRONIZATION ARROWS
    # State broadcast
    ax.annotate('', xy=(5.5, 9.2), xytext=(8.5, 9.2),
               arrowprops=dict(arrowstyle='->', lw=3, color='red'))
    ax.text(7, 9.6, 'WebSocket State', fontsize=8, ha='center', fontweight='bold',
            bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.9))
    
    # Input message
    ax.annotate('', xy=(8.5, 4.4), xytext=(5.5, 4.4),
               arrowprops=dict(arrowstyle='->', lw=3, color='darkred'))
    ax.text(7, 4.0, 'Input Message', fontsize=8, ha='center', fontweight='bold',
            bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.9))
    
    # TIMING INFO BOX
    timing_text = '60 FPS Server Loop (16.67ms/frame) → 50ms WebSocket Throttle → Low Latency\nServer Authoritative (no cheating) | Fair state broadcasting'
    ax.text(7, 2.3, timing_text, fontsize=8, ha='center', va='center',
           bbox=dict(boxstyle='round', facecolor='lightyellow', edgecolor='orange', linewidth=2))
    
    plt.tight_layout()
    plt.savefig('game_loop_diagram.png', dpi=300, bbox_inches='tight')
    print('✓ game_loop_diagram.png created')
    plt.close()

def create_security_layers_diagram():
    """Create security layers defense-in-depth diagram"""
    fig, ax = plt.subplots(figsize=(12, 10))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 12)
    ax.axis('off')
    
    # Title
    ax.text(6, 11.5, 'Security Architecture: Defense-in-Depth', 
            fontsize=13, fontweight='bold', ha='center')
    
    layers_info = [
        ('Layer 1: Network Security', 'HTTPS (TLS 1.2+) | Nginx Reverse Proxy | ModSecurity WAF', 'red', 10.3),
        ('Layer 2: Input Validation', 'JSON Schema | Type Checking | Length Constraints', 'orange', 9.1),
        ('Layer 3: Application Logic', 'Parameterized SQL | CSRF Protection | XSS Prevention', 'gold', 7.9),
        ('Layer 4: Authentication', 'JWT (HS256) | Bcrypt (cost 10) | 2FA (TOTP) | OAuth', 'lightgreen', 6.7),
        ('Layer 5: Authorization', 'Role-Based Access Control (RBAC) | Resource-Level Permissions', 'cyan', 5.5),
        ('Layer 6: Data Protection', 'Encryption at Rest | Vault Secrets | Rotation Policy', 'lightblue', 4.3),
        ('Layer 7: Monitoring', 'Audit Logs (ELK) | Anomaly Detection | Security Events', 'plum', 3.1),
    ]
    
    for title, description, color, y in layers_info:
        # Main box with title and description
        rect = FancyBboxPatch((0.5, y - 0.5), 11, 1.0, boxstyle="round,pad=0.08",
                             edgecolor='black', facecolor=color, linewidth=2, alpha=0.85)
        ax.add_patch(rect)
        
        # Title on the left
        ax.text(1.2, y + 0.2, title, fontsize=9, fontweight='bold', va='center')
        
        # Description on the right
        ax.text(6.5, y, description, fontsize=8, va='center', style='italic')
    
    # Attack prevention box
    prevention_text = 'Prevents: SQLi | XSS | CSRF | DDoS | Brute Force | Unauthorized Access | Data Breaches'
    ax.text(6, 1.2, prevention_text, fontsize=8, ha='center', va='center',
           bbox=dict(boxstyle='round', facecolor='lightyellow', edgecolor='darkred', linewidth=2.5),
           fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('security_layers.png', dpi=300, bbox_inches='tight')
    print('✓ security_layers.png created')
    plt.close()

def create_user_authentication_flow():
    """Create user authentication and session flow diagram"""
    fig, ax = plt.subplots(figsize=(14, 10))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 11)
    ax.axis('off')
    
    # Title
    ax.text(7, 10.5, 'User Authentication & Session Flow', 
            fontsize=13, fontweight='bold', ha='center')
    
    # REGISTRATION PATH (Left)
    ax.text(3.5, 9.8, 'REGISTRATION PATH', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.6))
    
    reg_steps = [
        (9.0, '1. User Registration\nEmail + Password'),
        (7.8, '2. Password Hashing\n(Bcrypt, Cost 10)'),
        (6.6, '3. Store in auth.db\n(Encrypted)'),
    ]
    
    for y, label in reg_steps:
        create_box_with_text(ax, 3.5, y, 2.8, 0.9, label,
                            color='lightblue', edgecolor='darkblue', fontsize=7, fontweight='bold')
    
    for i in range(len(reg_steps) - 1):
        y1 = reg_steps[i][0]
        y2 = reg_steps[i+1][0]
        ax.annotate('', xy=(3.5, y2 + 0.45), xytext=(3.5, y1 - 0.45),
                   arrowprops=dict(arrowstyle='->', lw=2.5, color='darkblue'))
    
    # LOGIN PATH (Right)
    ax.text(10.5, 9.8, 'LOGIN PATH', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.6))
    
    login_steps = [
        (9.0, '1. User Login\nEmail + Password'),
        (7.8, '2. Validate Credentials\n(Bcrypt compare)'),
        (6.6, '3. Generate JWT\n(HS256, 24h)'),
    ]
    
    for y, label in login_steps:
        create_box_with_text(ax, 10.5, y, 2.8, 0.9, label,
                            color='lightgreen', edgecolor='darkgreen', fontsize=7, fontweight='bold')
    
    for i in range(len(login_steps) - 1):
        y1 = login_steps[i][0]
        y2 = login_steps[i+1][0]
        ax.annotate('', xy=(10.5, y2 + 0.45), xytext=(10.5, y1 - 0.45),
                   arrowprops=dict(arrowstyle='->', lw=2.5, color='darkgreen'))
    
    # SESSION MANAGEMENT (Center)
    ax.text(7, 5.5, 'SESSION MANAGEMENT', fontsize=10, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.6))
    
    create_box_with_text(ax, 7, 4.5, 4.0, 0.8, 'HttpOnly Cookie (Secure, SameSite=Strict)',
                        color='lightyellow', edgecolor='orange', fontsize=8, fontweight='bold')
    
    # Arrows from both paths to session
    ax.annotate('', xy=(5.5, 5.0), xytext=(4.5, 6.6),
               arrowprops=dict(arrowstyle='->', lw=2.5, color='purple'))
    ax.annotate('', xy=(8.5, 5.0), xytext=(9.5, 6.6),
               arrowprops=dict(arrowstyle='->', lw=2.5, color='purple'))
    
    # OPTIONAL 2FA
    ax.text(7, 3.2, 'OPTIONAL: Two-Factor Authentication (2FA)', fontsize=10, fontweight='bold',
            ha='center', bbox=dict(boxstyle='round', facecolor='lightsalmon', alpha=0.6))
    
    twofa_text = 'User scans QR code with authenticator app (TOTP)\nVerification code required on each login\nEnhanced security for sensitive operations'
    ax.text(7, 2.2, twofa_text, fontsize=7, ha='center', va='center',
           bbox=dict(boxstyle='round', facecolor='white', edgecolor='red', linewidth=2))
    
    # OAuth Path
    ax.text(7, 0.8, 'Alternative: OAuth Login (42 School intranet)',
            fontsize=8, ha='center', style='italic', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('authentication_flow.png', dpi=300, bbox_inches='tight')
    print('✓ authentication_flow.png created')
    plt.close()

def create_data_flow_diagram():
    """Create data flow diagram for a typical game match"""
    fig, ax = plt.subplots(figsize=(12, 9))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 10)
    ax.axis('off')
    
    # Title
    ax.text(6, 9.5, 'Game Match Data Flow Diagram', 
            fontsize=12, fontweight='bold', ha='center')
    
    # Player 1
    create_box_with_text(ax, 1.5, 8.2, 1.8, 0.8, 'Player 1\n(Web)', 
                        color='lightblue', edgecolor='darkblue', fontsize=8)
    
    # Game Service (center)
    create_box_with_text(ax, 6, 8.2, 3.0, 1.2, 'Game Service\n(Server-Authoritative)\nPong Logic',
                        color='lightgreen', edgecolor='darkgreen', fontsize=8, fontweight='bold')
    
    # Player 2
    create_box_with_text(ax, 10.5, 8.2, 1.8, 0.8, 'Player 2\n(Web/CLI)', 
                        color='lightcyan', edgecolor='darkcyan', fontsize=8)
    
    # Input flow arrows
    ax.annotate('', xy=(4.5, 8.2), xytext=(2.4, 8.2),
               arrowprops=dict(arrowstyle='->', lw=2.5, color='blue'))
    ax.text(3.4, 8.6, 'Input', fontsize=7, ha='center', fontweight='bold')
    
    ax.annotate('', xy=(7.5, 8.2), xytext=(9.6, 8.2),
               arrowprops=dict(arrowstyle='->', lw=2.5, color='blue'))
    ax.text(8.6, 8.6, 'Input', fontsize=7, ha='center', fontweight='bold')
    
    # Game loop steps
    loop_steps = ['Input\nCollection', 'Physics\nUpdate', 'Collision\nCheck', 'Score\nUpdate', 'Broadcast\nState']
    step_x_start = 1.5
    step_spacing = 2.0
    step_y = 6.2
    
    for idx, step in enumerate(loop_steps):
        x = step_x_start + idx * step_spacing
        create_box_with_text(ax, x, step_y, 1.6, 0.8, step,
                            color='lightyellow', edgecolor='orange', fontsize=7)
        if idx < len(loop_steps) - 1:
            ax.annotate('', xy=(x + 0.8, step_y), xytext=(x + 0.8, step_y - 0.4),
                       arrowprops=dict(arrowstyle='->', lw=2, color='orange'))
            ax.annotate('', xy=(x + 1.5, step_y - 0.4), xytext=(x + 0.8, step_y - 0.4),
                       arrowprops=dict(arrowstyle='->', lw=2, color='orange'))
    
    # Broadcast to players
    ax.annotate('', xy=(2.4, 7.6), xytext=(4.0, 5.8),
               arrowprops=dict(arrowstyle='->', lw=2.5, color='green'))
    ax.text(2.8, 6.5, 'State', fontsize=7, ha='center', fontweight='bold', color='green')
    
    ax.annotate('', xy=(9.6, 7.6), xytext=(8.0, 5.8),
               arrowprops=dict(arrowstyle='->', lw=2.5, color='green'))
    ax.text(9.2, 6.5, 'State', fontsize=7, ha='center', fontweight='bold', color='green')
    
    # Rendering
    create_box_with_text(ax, 1.5, 4.5, 2.0, 1.2, 'Render:\nBall\nPaddles\nScore',
                        color='lightyellow', edgecolor='orange', fontsize=7)
    
    create_box_with_text(ax, 10.5, 4.5, 2.0, 1.2, 'Render:\nBall\nPaddles\nScore',
                        color='lightyellow', edgecolor='orange', fontsize=7)
    
    # Database persistence
    create_box_with_text(ax, 6, 2.8, 2.5, 1.0, 'games.db\n(Match History)',
                        color='plum', edgecolor='purple', fontsize=8, fontweight='bold')
    
    ax.annotate('', xy=(6, 3.3), xytext=(6, 5.8),
               arrowprops=dict(arrowstyle='->', lw=2, color='purple', linestyle='dashed'))
    ax.text(6.6, 4.5, 'Store', fontsize=7, color='purple', fontweight='bold')
    
    # Tournament/Blockchain
    create_box_with_text(ax, 6, 1.0, 3.5, 0.9, 'Tournament End:\nRecord to Blockchain',
                        color='lightsalmon', edgecolor='darkorange', fontsize=8)
    
    plt.tight_layout()
    plt.savefig('data_flow_diagram.png', dpi=300, bbox_inches='tight')
    print('✓ data_flow_diagram.png created')
    plt.close()

def create_deployment_topology():
    """Create Docker Compose deployment topology"""
    fig, ax = plt.subplots(figsize=(14, 10))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 11)
    ax.axis('off')
    
    # Title
    ax.text(7, 10.5, 'Docker Compose Deployment Topology', 
            fontsize=13, fontweight='bold', ha='center')
    
    # Docker network boundary
    rect = FancyBboxPatch((0.3, 0.5), 13.4, 9.5, boxstyle="round,pad=0.1", 
                         edgecolor='purple', facecolor='white', linewidth=2.5, linestyle='dashed')
    ax.add_patch(rect)
    ax.text(0.8, 9.8, 'Docker Network: transcendence-network', fontsize=9, fontweight='bold', 
            color='purple', bbox=dict(boxstyle='round', facecolor='white', alpha=0.9))
    
    # Client access
    create_box_with_text(ax, 7, 9.2, 3.0, 0.6, 'Client Access\n(Browser/CLI)',
                        color='lightblue', edgecolor='darkblue', fontsize=8, fontweight='bold')
    
    # Arrow to Nginx
    ax.annotate('', xy=(7, 8.7), xytext=(7, 8.4),
               arrowprops=dict(arrowstyle='->', lw=2.5, color='darkblue'))
    
    # Nginx
    create_box_with_text(ax, 7, 8.0, 3.5, 0.8, 'Nginx (80, 443)\nTLS + WAF',
                        color='lightyellow', edgecolor='red', fontsize=8, fontweight='bold')
    
    # Arrow to services
    ax.annotate('', xy=(7, 7.6), xytext=(7, 7.2),
               arrowprops=dict(arrowstyle='->', lw=2.5, color='darkred'))
    
    # SERVICES ROW 1 (Microservices)
    services_row1 = [
        (1.8, 'Auth\nService\n:3001'),
        (4.3, 'User\nService\n:3002'),
        (6.8, 'Game\nService\n:3003'),
        (9.3, 'Tournament\nService\n:3004'),
    ]
    
    for x, label in services_row1:
        create_box_with_text(ax, x, 6.4, 1.8, 1.0, label,
                            color='lightgreen', edgecolor='darkgreen', fontsize=7, fontweight='bold')
    
    # SERVICES ROW 2 (Support Services)
    services_row2 = [
        (1.8, 'SSR\nService\n:3005'),
        (4.3, 'Vault\nServer\n:8200'),
        (6.8, 'Hardhat\nNode\n:8545'),
        (9.3, 'Prometheus\n:9090'),
    ]
    
    for x, label in services_row2:
        create_box_with_text(ax, x, 4.6, 1.8, 1.0, label,
                            color='moccasin', edgecolor='darkorange', fontsize=7, fontweight='bold')
    
    # SERVICES ROW 3 (Monitoring Stack)
    services_row3 = [
        (1.8, 'Elasticsearch\n:9200'),
        (4.3, 'Kibana\n:5601'),
        (6.8, 'Grafana\n:3000'),
        (9.3, 'Filebeat'),
    ]
    
    for x, label in services_row3:
        create_box_with_text(ax, x, 2.8, 1.8, 1.0, label,
                            color='lightcyan', edgecolor='teal', fontsize=7, fontweight='bold')
    
    # Persistent Volumes (right side)
    create_box_with_text(ax, 12.2, 4.6, 1.6, 3.6, 'Persistent\nVolumes:\nauth.db\nusers.db\ngames.db\ntournaments.db',
                        color='lightsteelblue', edgecolor='darkblue', fontsize=7, fontweight='bold')
    
    # Connections to databases
    for x, _ in services_row1:
        ax.annotate('', xy=(11.4, 6.4), xytext=(x + 0.9, 6.4),
                   arrowprops=dict(arrowstyle='->', lw=1.5, color='blue', linestyle='dashed', alpha=0.5))
    
    plt.tight_layout()
    plt.savefig('deployment_topology.png', dpi=300, bbox_inches='tight')
    print('✓ deployment_topology.png created')
    plt.close()

def create_testing_pyramid():
    """Create testing pyramid diagram"""
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')
    
    # Title
    ax.text(5, 9.5, 'Testing Pyramid: ft_transcendence', 
            fontsize=12, fontweight='bold', ha='center')
    
    # Pyramid layers
    from matplotlib.patches import Polygon
    
    # Unit tests (base)
    unit_points = np.array([[1, 1], [9, 1], [8, 3], [2, 3]])
    unit_poly = Polygon(unit_points, facecolor='lightgreen', edgecolor='darkgreen', linewidth=2)
    ax.add_patch(unit_poly)
    ax.text(5, 2, 'Unit Tests\n(Low-level functions)\n~60 tests', 
            fontsize=9, ha='center', va='center', fontweight='bold')
    
    # Integration tests (middle)
    int_points = np.array([[2.5, 3.5], [7.5, 3.5], [6.5, 5.5], [3.5, 5.5]])
    int_poly = Polygon(int_points, facecolor='lightyellow', edgecolor='orange', linewidth=2)
    ax.add_patch(int_poly)
    ax.text(5, 4.5, 'Integration Tests\n(Service interactions)\n~80 tests', 
            fontsize=9, ha='center', va='center', fontweight='bold')
    
    # E2E tests (top)
    e2e_points = np.array([[4, 6], [6, 6], [5.5, 8], [4.5, 8]])
    e2e_poly = Polygon(e2e_points, facecolor='lightblue', edgecolor='darkblue', linewidth=2)
    ax.add_patch(e2e_poly)
    ax.text(5, 7, 'End-to-End Tests\n(Full workflows)\n~40 tests', 
            fontsize=9, ha='center', va='center', fontweight='bold')
    
    # Total info
    ax.text(5, 0.5, 'Total: 180/180 Tests Passing (100%) | Test Duration: ~18 minutes', 
            fontsize=9, ha='center', bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.9),
            fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('testing_pyramid.png', dpi=300, bbox_inches='tight')
    print('✓ testing_pyramid.png created')
    plt.close()

def create_gdpr_compliance_flow():
    """Create GDPR compliance data flow diagram"""
    fig, ax = plt.subplots(figsize=(13, 9))
    ax.set_xlim(0, 13)
    ax.set_ylim(0, 10)
    ax.axis('off')
    
    # Title
    ax.text(6.5, 9.5, 'GDPR Compliance Data Flow', 
            fontsize=12, fontweight='bold', ha='center')
    
    # User request
    ax.text(6.5, 8.8, 'User Initiates GDPR Request', fontsize=10, fontweight='bold', ha='center')
    
    # Three main paths
    # Path 1: Data Export
    create_box_with_text(ax, 2, 7.8, 2.2, 0.7, 'Path 1:\nData Export',
                        color='lightblue', edgecolor='darkblue', fontsize=8, fontweight='bold')
    
    export_steps = [
        (7.2, 'Request'),
        (6.5, 'Collect'),
        (5.8, 'Anonymize'),
        (5.1, 'JSON'),
        (4.4, 'Download'),
    ]
    
    for idx, (y, label) in enumerate(export_steps):
        create_box_with_text(ax, 2, y, 1.8, 0.6, label,
                            color='lightblue', edgecolor='darkblue', fontsize=7)
        if idx < len(export_steps) - 1:
            ax.annotate('', xy=(2, y - 0.3), xytext=(2, y - 0.3 - 0.4),
                       arrowprops=dict(arrowstyle='->', lw=2, color='darkblue'))
    
    # Path 2: Account Deletion
    create_box_with_text(ax, 6.5, 7.8, 2.2, 0.7, 'Path 2:\nAccount Deletion',
                        color='lightyellow', edgecolor='orange', fontsize=8, fontweight='bold')
    
    delete_steps = [
        (7.2, 'Request'),
        (6.5, 'Anonymize'),
        (5.8, 'Keep History'),
        (5.1, 'Flag User'),
        (4.4, 'Confirm'),
    ]
    
    for idx, (y, label) in enumerate(delete_steps):
        create_box_with_text(ax, 6.5, y, 1.8, 0.6, label,
                            color='lightyellow', edgecolor='orange', fontsize=7)
        if idx < len(delete_steps) - 1:
            ax.annotate('', xy=(6.5, y - 0.3), xytext=(6.5, y - 0.3 - 0.4),
                       arrowprops=dict(arrowstyle='->', lw=2, color='orange'))
    
    # Path 3: Consent Management
    create_box_with_text(ax, 11, 7.8, 2.2, 0.7, 'Path 3:\nConsent Mgmt',
                        color='lightgreen', edgecolor='darkgreen', fontsize=8, fontweight='bold')
    
    consent_steps = [
        (7.2, 'Request'),
        (6.5, 'Manage'),
        (5.8, 'Log'),
        (5.1, 'Audit'),
        (4.4, 'Revoke'),
    ]
    
    for idx, (y, label) in enumerate(consent_steps):
        create_box_with_text(ax, 11, y, 1.8, 0.6, label,
                            color='lightgreen', edgecolor='darkgreen', fontsize=7)
        if idx < len(consent_steps) - 1:
            ax.annotate('', xy=(11, y - 0.3), xytext=(11, y - 0.3 - 0.4),
                       arrowprops=dict(arrowstyle='->', lw=2, color='darkgreen'))
    
    # Database changes
    create_box_with_text(ax, 6.5, 2.8, 5.0, 1.2, 'Database Changes:\ndeleted_at flag | username anonymized\nemail NULL | profile anonymized',
                        color='plum', edgecolor='purple', fontsize=7, fontweight='bold')
    
    # Compliance note
    create_box_with_text(ax, 6.5, 0.9, 6.0, 1.2, 'GDPR Compliance:\nArticles 15-22 (Access, Rectify, Erase,\nRestrict, Port, Objection)',
                        color='lightsalmon', edgecolor='darkorange', fontsize=7, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('gdpr_flow.png', dpi=300, bbox_inches='tight')
    print('✓ gdpr_flow.png created')
    plt.close()

# Generate all figures
if __name__ == '__main__':
    print('Generating illustrative figures for LaTeX report...\n')
    create_architecture_diagram()
    create_game_loop_diagram()
    create_security_layers_diagram()
    create_user_authentication_flow()
    create_data_flow_diagram()
    create_deployment_topology()
    create_testing_pyramid()
    create_gdpr_compliance_flow()
    print('\n✅ All figures generated successfully!')
    print('PNG files ready for inclusion in LaTeX report.')
