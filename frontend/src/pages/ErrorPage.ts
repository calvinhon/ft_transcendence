import { AbstractComponent } from "../components/AbstractComponent";
import { App } from "../core/App";

export class ErrorPage extends AbstractComponent {
    private statusCode: number;
    private message: string;

    constructor(statusCode: number = 404, message: string = '') {
        super();
        this.statusCode = statusCode;
        this.message = message || this.getDefaultMessage(statusCode);
        this.setTitle(`Error ${statusCode}`);
    }

    private getDefaultMessage(code: number): string {
        switch (code) {
            case 400: return 'Bad Request';
            case 401: return 'Unauthorized';
            case 403: return 'Access Denied';
            case 404: return 'Page Not Found';
            case 500: return 'Internal Server Error';
            case 502: return 'Bad Gateway';
            case 503: return 'Service Unavailable';
            default: return 'Something Went Wrong';
        }
    }

    getHtml(): string {
        return `
            <div class="min-h-screen w-full bg-black flex flex-col items-center justify-center font-vcr text-white relative overflow-hidden">
                <!-- Scanlines -->
                <div class="absolute inset-0 pointer-events-none bg-scanlines opacity-20"></div>
                
                <!-- Grid Background -->
                <div class="absolute inset-0 opacity-10"
                     style="background-image: linear-gradient(rgba(119, 230, 255, 0.1) 1px, transparent 1px),
                                              linear-gradient(90deg, rgba(119, 230, 255, 0.1) 1px, transparent 1px);
                            background-size: 40px 40px;"></div>

                <!-- Error Content -->
                <div class="relative z-10 text-center px-8">
                    <!-- Glitch Effect Status Code -->
                    <div class="relative mb-8">
                        <h1 class="text-[150px] md:text-[200px] font-bold leading-none text-accent">
                            ${this.statusCode}
                        </h1>
                    </div>

                    <!-- Message -->
                    <h2 class="text-2xl md:text-4xl mb-4 text-white uppercase tracking-widest">
                        ${this.message}
                    </h2>

                    <!-- Subtitle -->
                    <p class="text-sm md:text-base text-gray-500 mb-12 max-w-md mx-auto">
                        The requested destination could not be located in this dimension.
                    </p>

                    <!-- Action Buttons -->
                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <button id="home-btn" 
                                class="px-8 py-3 border-2 border-accent text-accent hover:bg-accent hover:text-black 
                                       transition-all duration-300 uppercase tracking-wider">
                            <i class="fas fa-home mr-2"></i> Return Home
                        </button>
                        <button id="back-btn"
                                class="px-8 py-3 border border-white/30 text-white/60 hover:border-white hover:text-white
                                       transition-all duration-300 uppercase tracking-wider">
                            <i class="fas fa-arrow-left mr-2"></i> Go Back
                        </button>
                    </div>
                </div>

                <!-- Decorative Elements -->
                <div class="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-gray-600 font-pixel">
                    ERROR_CODE: ${this.statusCode} | TIMESTAMP: ${new Date().toISOString()}
                </div>
            </div>
        `;
    }

    onMounted(): void {
        this.$('#home-btn')?.addEventListener('click', () => {
            App.getInstance().router.navigateTo('/main-menu');
        });

        this.$('#back-btn')?.addEventListener('click', () => {
            window.history.back();
        });
    }
}
