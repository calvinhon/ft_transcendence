import { AbstractComponent } from "../components/AbstractComponent";
import { App } from "../core/App";
import { Api } from "../core/Api";
import Chart from 'chart.js/auto';

export class MatchDetailsPage extends AbstractComponent {
    private gameId: number | null = null;
    private gameData: any | null = null;
    private gameEvents: any[] = [];
    private loading: boolean = true;
    private error: string | null = null;
    private charts: Chart[] = [];

    getHtml(): string {
        return `
            <div class="w-full h-full bg-black flex flex-col relative font-vcr text-white overflow-hidden">
                <!-- Header -->
                <div class="p-4 border-b border-accent flex items-center justify-between bg-black/80 z-10">
                    <button id="back-btn" class="text-accent hover:text-white flex items-center gap-2">
                        <i class="fas fa-chevron-left"></i> BACK
                    </button>
                    <h1 class="text-xl tracking-widest text-shadow-neon">MATCH ANALYSIS</h1>
                    <div class="w-20"></div>
                </div>

                <div class="flex-1 overflow-y-auto custom-scrollbar p-8">
                    ${this.renderContent()}
                </div>
            </div>
        `;
    }

    private renderContent(): string {
        if (this.loading) {
            return `
                <div class="h-full flex flex-col items-center justify-center gap-4 animate-pulse">
                    <div class="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <div class="text-accent tracking-widest">DECRYPTING MATCH DATA...</div>
                </div>
            `;
        }

        if (this.error || !this.gameData) {
            return `
                <div class="h-full flex flex-col items-center justify-center gap-4 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl"></i>
                    <div class="text-xl">${this.error || 'Match Data Corrupted'}</div>
                </div>
            `;
        }

        return `
            <div class="max-w-4xl mx-auto space-y-8">
                <!-- Scoreboard -->
                <div class="border border-accent p-8 bg-black/50 text-center relative overflow-hidden">
                    <div class="absolute inset-0 bg-accent/5 pointer-events-none"></div>
                    
                    <div class="grid grid-cols-[1fr,auto,1fr] items-center gap-4 mb-4">
                        <h2 class="text-2xl text-accent font-bold text-center truncate" title="${this.gameData.player1_name}">${this.gameData.player1_name || 'PLAYER 1'}</h2>
                        <span class="text-gray-500 text-sm px-2">VS</span>
                        <h2 class="text-2xl text-red-500 font-bold text-center truncate" title="${this.gameData.player2_name}">${this.gameData.player2_name || 'PLAYER 2'}</h2>
                    </div>
                    
                    <div class="text-6xl font-bold font-vcr tracking-widest text-white text-shadow-neon">
                        ${this.gameData.player1_score} - ${this.gameData.player2_score}
                    </div>
                    
                    <div class="mt-4 text-sm text-gray-400">
                        ${new Date(this.gameData.finished_at).toLocaleString()} • ${this.gameData.game_mode?.toUpperCase() || 'NORMAL'}
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border border-white/20 p-4">
                         <h3 class="text-gray-400 font-bold mb-2">MATCH DURATION</h3>
                         <div class="text-2xl">${this.calculateDuration(this.gameData.started_at, this.gameData.finished_at)}</div>
                    </div>
                     <div class="border border-white/20 p-4">
                         <h3 class="text-gray-400 font-bold mb-2">WINNER</h3>
                         <div class="text-2xl text-accent">${this.gameData.winner_name || 'Unknown'}</div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="border border-white/20 bg-black/50 p-6">
                    <h3 class="text-accent font-bold mb-4 uppercase">Score Progression</h3>
                    <div class="relative h-64 w-full">
                        <canvas id="scoreTimelineChart"></canvas>
                    </div>
                </div>

                <!-- Match Log -->
                <div class="border border-white/20">
                    <div class="bg-white/5 p-3 border-b border-white/20 font-bold">MATCH LOG</div>
                    <div class="divide-y divide-white/10 max-h-[300px] overflow-y-auto">
                        ${this.gameEvents.length > 0
                ? this.gameEvents.map(e => this.renderEventRow(e)).join('')
                : '<div class="p-4 text-center text-gray-500">No detailed events recorded for this match.</div>'
            }
                    </div>
                </div>
            </div>
        `;
    }

    private renderEventRow(e: any): string {
        const time = new Date(e.timestamp).toLocaleTimeString();
        let content = '';

        if (e.event_type === 'goal') {
            const scorer = e.event_data.scorer === 'player1' ? this.gameData.player1_name : this.gameData.player2_name;
            content = `<span class="text-accent">${scorer}</span> SCORED! Score is now ${e.event_data.newScore.player1}-${e.event_data.newScore.player2}`;
        } else {
            content = JSON.stringify(e.event_data);
        }

        return `
            <div class="p-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
                <span class="text-gray-500 text-xs font-pixel">${time}</span>
                <div class="text-sm text-gray-300">
                    ${content}
                </div>
            </div>
        `;
    }

    private calculateDuration(start: string, end: string): string {
        if (!start || !end) return '--:--';
        const diff = new Date(end).getTime() - new Date(start).getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    async onMounted(): Promise<void> {
        this.container = document.getElementById('app') || document.body;
        console.log('Mounting MatchDetailsPage');

        this.$('#back-btn')?.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                App.getInstance().router.navigateTo('/profile');
            }
        });

        const params = new URLSearchParams(window.location.search);
        const idParam = params.get('id');

        if (idParam) {
            this.gameId = parseInt(idParam);
            await this.loadGameDetails(this.gameId);
            this.initCharts();
        } else {
            this.error = "No match ID specified";
            this.loading = false;
            this.refresh();
        }
    }

    private async loadGameDetails(id: number): Promise<void> {
        try {
            // Fetch Details
            const res = await Api.get(`/api/game/${id}`);
            if (res.error) throw new Error(res.error);
            this.gameData = res.data; // Fixed: Backend wraps in {data: ...}
            console.log("Game Data Loaded:", this.gameData);

            // Fetch Events
            const eventsRes = await Api.get(`/api/game/${id}/events`);
            if (eventsRes && eventsRes.data) {
                this.gameEvents = Array.isArray(eventsRes.data) ? eventsRes.data : [];
                console.log("Game Events Loaded:", this.gameEvents);
            } else {
                console.warn("No events found or request failed", eventsRes);
            }

        } catch (e) {
            console.error("Match load error", e);
            this.error = "Failed to load match data.";
        } finally {
            this.loading = false;
            this.refresh();
        }
    }

    private initCharts(): void {
        // Destroy existing charts before creating new ones
        this.destroyCharts();

        const canvas = document.getElementById('scoreTimelineChart') as HTMLCanvasElement;
        if (!canvas || !this.gameEvents.length) return;

        // Process data using linear time scale
        const startTime = new Date(this.gameData.started_at).getTime();
        const endTime = this.gameData.finished_at ? new Date(this.gameData.finished_at).getTime() : Date.now();
        const totalDuration = (endTime - startTime) / 1000;

        // Data points: {x: seconds, y: score}
        const p1Data: any[] = [{ x: 0, y: 0 }];
        const p2Data: any[] = [{ x: 0, y: 0 }];

        this.gameEvents.filter(e => e.event_type === 'goal').forEach(e => {
            const timeOffset = Math.max(0, Math.floor((new Date(e.timestamp).getTime() - startTime) / 1000));
            p1Data.push({ x: timeOffset, y: e.event_data.newScore.player1 });
            p2Data.push({ x: timeOffset, y: e.event_data.newScore.player2 });
        });

        // Add final point
        p1Data.push({ x: totalDuration, y: this.gameData.player1_score });
        p2Data.push({ x: totalDuration, y: this.gameData.player2_score });

        this.charts.push(new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: this.gameData.player1_name || 'Player 1',
                        data: p1Data,
                        borderColor: '#29b6f6',
                        backgroundColor: 'rgba(41, 182, 246, 0.1)',
                        tension: 0.1,
                        stepped: true
                    },
                    {
                        label: this.gameData.player2_name || 'Player 2',
                        data: p2Data,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.1,
                        stepped: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: '#888' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        title: { display: true, text: 'Score' }
                    },
                    x: {
                        type: 'linear',
                        grid: { display: false, color: '#333' },
                        ticks: {
                            color: '#888',
                            callback: function (value) {
                                const seconds = Number(value);
                                const m = Math.floor(seconds / 60);
                                const s = Math.floor(seconds % 60);
                                return `${m}:${s.toString().padStart(2, '0')}`;
                            }
                        },
                        title: { display: true, text: 'Time (min:sec)' },
                        min: 0,
                        max: totalDuration + 2 // Add a little breathing room
                    }
                },
                plugins: {
                    legend: { labels: { color: '#fff', usePointStyle: true, pointStyle: 'line' } },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const seconds = Number(items[0].parsed.x);
                                const m = Math.floor(seconds / 60);
                                const s = Math.floor(seconds % 60);
                                return `Time: ${m}:${s.toString().padStart(2, '0')}`;
                            }
                        }
                    }
                }
            }
        }));
    }

    private refresh(): void {
        const container = this.container;
        if (container) {
            this.destroyCharts();
            container.innerHTML = this.getHtml();
            this.bindEvents();
            this.initCharts();
        }
    }

    private destroyCharts(): void {
        this.charts.forEach(c => {
            try {
                c.destroy();
            } catch (e) {
                console.warn("Chart destroy failed", e);
            }
        });
        this.charts = [];
    }

    private bindEvents(): void {
        this.$('#back-btn')?.addEventListener('click', () => {
            if (window.history.length > 1) window.history.back();
            else App.getInstance().router.navigateTo('/profile');
        });
    }

    disconnect(): void {
        this.destroyCharts();
    }
}
