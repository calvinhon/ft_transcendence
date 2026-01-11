import { AbstractComponent } from "../components/AbstractComponent";
import { App } from "../core/App";
import { AuthService } from "../services/AuthService";
import { UserProfile } from "../services/ProfileService";
import { Api } from "../core/Api";
import { WebGLService } from "../services/WebGLService";
import { ErrorModal } from "../components/ErrorModal";
import { ConfirmationModal } from "../components/ConfirmationModal";

export class SettingsPage extends AbstractComponent {
    private profile: UserProfile | null = null;
    private loading: boolean = true;
    private error: string | null = null;
    private successMsg: string | null = null;

    getHtml(): string {
        return `
            <div class="w-full h-full bg-black flex flex-col relative font-vcr text-white overflow-hidden">
                <!-- Header -->
                <div class="p-4 border-b border-accent flex items-center justify-between bg-black/80 z-10">
                    <button id="back-btn" class="text-accent hover:text-white flex items-center gap-2">
                        <i class="fas fa-chevron-left"></i> CANCEL
                    </button>
                    <h1 class="text-xl tracking-widest text-shadow-neon">SYSTEM CONFIGURATION</h1>
                    <div class="w-20"></div>
                </div>

                <div class="flex-1 overflow-y-auto custom-scrollbar p-8 flex justify-center">
                    ${this.renderContent()}
                </div>
            </div>
        `;
    }

    private renderContent(): string {
        if (this.loading) {
            return `
                <div class="flex flex-col items-center justify-center h-64 animate-pulse">
                    <div class="text-accent tracking-widest">LOADING CONFIG...</div>
                </div>
            `;
        }

        if (this.error && !this.profile) {
            return `
                <div class="flex flex-col items-center justify-center h-64 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <div>${this.error}</div>
                    <button id="retry-btn" class="mt-4 px-4 py-2 border border-red-500 hover:bg-red-900/20">RETRY</button>
                </div>
            `;
        }

        const p = this.profile!;

        return `
            <div class="w-full max-w-2xl space-y-8">
                
                ${this.error ? `<div class="bg-red-900/20 border border-red-500 text-red-500 p-3 text-center">${this.error}</div>` : ''}
                ${this.successMsg ? `<div class="bg-green-900/20 border border-green-500 text-green-500 p-3 text-center">${this.successMsg}</div>` : ''}

                <!-- Avatar Section -->
                <div class="border border-white/20 p-6 bg-white/5 relative group">
                    <h2 class="text-accent mb-4 border-b border-white/10 pb-2">AVATAR IDENTITY</h2>
                    <div class="flex items-start gap-6">
                        <div class="w-24 h-24 border-2 border-accent rounded-full overflow-hidden bg-black flex-shrink-0">
                             ${p.avatarUrl
                ? `<img src="${p.avatarUrl}" class="w-full h-full object-cover">`
                : `<div class="w-full h-full flex items-center justify-center text-2xl text-gray-600">${p.username.charAt(0).toUpperCase()}</div>`
            }
                        </div>
                        <div class="flex-1 space-y-4">
                            <div>
                                <label class="block text-xs text-gray-400 mb-1">IMAGE URL</label>
                                <input type="text" id="input-avatar" value="${p.avatarUrl || ''}" 
                                    class="w-full bg-black border border-white/30 p-2 text-white focus:border-accent outline-none font-mono text-sm"
                                    placeholder="https://example.com/image.png">
                            </div>
                            <div class="text-[10px] text-gray-500">
                                * Enter a direct link to an image file (JPG, PNG).
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Profile Info -->
                <div class="border border-white/20 p-6 bg-white/5">
                    <h2 class="text-accent mb-4 border-b border-white/10 pb-2">PROFILE METADATA</h2>
                    
                    <div class="grid grid-cols-1 gap-4">
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">DISPLAY NAME</label>
                            <input type="text" id="input-displayname" value="${p.username}" maxlength="16"
                                class="w-full bg-black border border-white/30 p-2 text-white focus:border-accent outline-none font-mono text-sm">
                        </div>

                        <div>
                            <label class="block text-xs text-gray-400 mb-1">BIO / STATUS</label>
                            <textarea id="input-bio" rows="3"
                                class="w-full bg-black border border-white/30 p-2 text-white focus:border-accent outline-none font-mono text-sm"
                                placeholder="Enter your status message...">${p.bio || ''}</textarea>
                        </div>

                        <div>
                            <label class="block text-xs text-gray-400 mb-1">COUNTRY / REGION</label>
                            <input type="text" id="input-country" value="${p.country || ''}" 
                                class="w-full bg-black border border-white/30 p-2 text-white focus:border-accent outline-none font-mono text-sm"
                                placeholder="Unknown">
                        </div>
                        
                    </div>
                </div>

                <!-- 3D Mode Settings -->
                <div class="border border-white/20 p-6 bg-white/5">
                    <h2 class="text-accent mb-4 border-b border-white/10 pb-2">DISPLAY MODE</h2>
                    ${this.render3DModeSection()}
                </div>

                <!-- Actions -->
                <div class="flex gap-4 pt-4 border-t border-white/10">
                    <button id="save-btn" class="flex-1 bg-accent/10 border border-accent text-accent py-3 hover:bg-accent hover:text-black transition-all font-bold tracking-widest">
                        SAVE CONFIGURATION
                    </button>
                </div>

            </div>
        `;
    }

    private render3DModeSection(): string {
        const webglService = WebGLService.getInstance();
        const isWebGLSupported = webglService.isWebGLSupported();
        const is3DEnabled = webglService.is3DModeEnabled();

        if (!isWebGLSupported) {
            return `
                <div class="flex items-center justify-between text-gray-500">
                    <div>
                        <div class="text-sm">WebGL NOT SUPPORTED</div>
                        <div class="text-xs text-gray-600">3D Mode unavailable in this browser</div>
                    </div>
                    <div class="text-red-500">
                        <i class="fas fa-times-circle text-xl"></i>
                    </div>
                </div>
            `;
        }

        return `
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-sm">3D MODE</div>
                    <div class="text-xs text-gray-500">Immersive retro office environment</div>
                </div>
                <button id="toggle-3d-mode" 
                    class="px-4 py-2 border ${is3DEnabled
                ? 'border-green-500 text-green-500 hover:bg-green-900/20'
                : 'border-gray-600 text-gray-500 hover:bg-gray-900/20'} 
                    transition-all font-mono text-sm flex items-center gap-2">
                    <i class="fas ${is3DEnabled ? 'fa-cube' : 'fa-square'}"></i>
                    ${is3DEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
                </button>
            </div>
            
            <!-- Post Processing Toggle -->
             <div class="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <div>
                     <div class="text-sm">POST PROCESSING</div>
                     <div class="text-xs text-gray-500">Enable advanced visual effects (Glow)</div>
                 </div>
                 <button id="toggle-pp-mode" 
                     class="px-4 py-2 border ${webglService.isPostProcessingEnabled()
                ? 'border-green-500 text-green-500 hover:bg-green-900/20'
                : 'border-gray-600 text-gray-500 hover:bg-gray-900/20'} 
                     transition-all font-mono text-sm flex items-center gap-2">
                     <i class="fas ${webglService.isPostProcessingEnabled() ? 'fa-magic' : 'fa-square'}"></i>
                     ${webglService.isPostProcessingEnabled() ? 'ENABLED' : 'DISABLED'}
                 </button>
             </div>
            <div class="mt-3 text-xs text-gray-600">
                <i class="fas fa-info-circle mr-1"></i>
                Changes require page reload to take effect
            </div>
        `;
    }

    async onMounted(): Promise<void> {
        this.bindEvents();
        await this.loadProfile();
    }

    private bindEvents(): void {
        this.$('#back-btn')?.addEventListener('click', () => {
            // Return to Profile Page instead of Main Menu? 
            // Ideally back to where we came from. But Main Menu is safe.
            App.getInstance().router.navigateTo('/main-menu');
        });

        this.$('#retry-btn')?.addEventListener('click', () => {
            this.loading = true;
            this.error = null;
            this.refresh();
            this.loadProfile();
        });

        this.$('#save-btn')?.addEventListener('click', () => {
            this.saveProfile();
        });

        // 3D Mode toggle
        this.$('#toggle-3d-mode')?.addEventListener('click', () => {
            const webglService = WebGLService.getInstance();
            const newValue = !webglService.is3DModeEnabled();

            new ConfirmationModal(
                newValue ? 'ENABLE 3D MODE? PAGE WILL RELOAD.' : 'DISABLE 3D MODE? PAGE WILL RELOAD.',
                () => {
                    webglService.set3DModeEnabled(newValue);
                    window.location.reload();
                },
                () => { },
                'neutral'
            ).render();
        });

        // Post Processing toggle
        this.$('#toggle-pp-mode')?.addEventListener('click', () => {
            const webglService = WebGLService.getInstance();
            const newValue = !webglService.isPostProcessingEnabled();

            // Direct update then reload
            webglService.setPostProcessingEnabled(newValue);
            window.location.reload();
        });
    }

    private async loadProfile(): Promise<void> {
        try {
            const user = AuthService.getInstance().getCurrentUser();
            if (!user) {
                this.error = "Not authenticated";
                this.loading = false;
                this.refresh();
                return;
            }

            // Using ProfileService would be ideal, but update is not exposed there yet?
            // Actually, let's stick to Api.get directly if ProfileService doesn't have it,
            // OR use ProfileService.getUserProfile(id) which exists.
            const { ProfileService } = await import('../services/ProfileService');
            this.profile = await ProfileService.getInstance().getUserProfile(user.userId);

            if (!this.profile) {
                this.error = "Failed to load profile data";
            }
        } catch (e) {
            console.error(e);
            this.error = "Network error loading profile";
        } finally {
            this.loading = false;
            this.refresh();
        }
    }

    private async saveProfile(): Promise<void> {
        if (!this.profile) return;

        const displayName = (this.$('#input-displayname') as HTMLInputElement).value;
        const bio = (this.$('#input-bio') as HTMLTextAreaElement).value;
        const country = (this.$('#input-country') as HTMLInputElement).value;
        const avatarUrl = (this.$('#input-avatar') as HTMLInputElement).value;
        const customAvatar = avatarUrl !== this.profile.avatarUrl ? 1 : this.profile.customAvatar;

        // Visual Feedback
        const btn = this.$('#save-btn') as HTMLButtonElement;
        if (btn) {
            btn.disabled = true;
            btn.innerText = "SAVING...";
        }

        try {
            const user = AuthService.getInstance().getCurrentUser();
            if (!user) throw new Error("Not logged in");

            // Direct update without password verification

            const updates = {
                displayName,
                bio,
                country,
                avatarUrl,
                customAvatar
            };

            const res = await Api.put(`/api/user/profile/${user.userId}`, updates);
            if (res.error) throw new Error(res.error);

            this.successMsg = "CONFIGURATION UPDATED SUCCESSFULLY";
            this.error = null;

            // Reload profile to get confirmed data
            // this.loading = true; // Don't show full loading spinner, just update
            // await this.loadProfile(); 
            // Just update local state for now? No, full reload is safer.
            await this.loadProfile();

        } catch (e: any) {
            this.showError(e.message || "Failed to save changes");
            if (btn) {
                btn.disabled = false;
                btn.innerText = "SAVE CONFIGURATION";
            }
        }
    }

    private showError(msg: string) {
        this.error = msg;
        new ErrorModal(msg.toUpperCase()).render();
    }

    private refresh(): void {
        const container = this.container;
        if (container) {
            container.innerHTML = this.getHtml();
            this.bindEvents(); // Re-bind events after innerHTML swap

            // Restore values if we are not loading and have profile
            // (Assuming re-render from state)
        }
    }
}
