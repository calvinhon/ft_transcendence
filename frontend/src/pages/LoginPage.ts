import { AbstractComponent } from "../components/AbstractComponent";
import { AuthService } from "../services/AuthService";

export class LoginPage extends AbstractComponent {
  constructor() {
    super();
    this.setTitle("Login");
  }

  getHtml(): string {
    return `
            <div class="flex bg-black items-center justify-center relative w-full h-full">
                <div class="w-full max-w-[600px] border-2 border-accent shadow-[0_0_20px_rgba(0,255,255,0.2)] bg-black relative pointer-events-auto">
                    <!-- Tabs -->
                    <div class="flex w-full border-b-2 border-accent">
                        <div class="w-1/2 justify-center items-center flex py-4 bg-accent text-black font-vcr font-bold text-xl cursor-default">
                            LOGIN
                        </div>
                        <button id="tab-register" class="w-1/2 justify-center items-center flex py-4 bg-transparent hover:bg-white/5 text-text-muted hover:text-white font-vcr font-bold text-xl transition-colors cursor-pointer">
                            REGISTER
                        </button>
                    </div>

                    <div class="p-12 flex flex-col gap-8">
                        <form id="login-form" class="flex flex-col gap-6">
                            <input
                                type="text"
                                id="username"
                                placeholder="Username"
                                required
                                class="w-full p-4 bg-transparent border border-white/20 text-white font-vcr focus:border-accent focus:shadow-[0_0_10px_rgba(0,255,255,0.5)] outline-none transition-all placeholder:text-text-muted"
                            />
                            <input
                                type="password"
                                id="password"
                                placeholder="Password"
                                required
                                class="w-full p-4 bg-transparent border border-white/20 text-white font-vcr focus:border-accent focus:shadow-[0_0_10px_rgba(0,255,255,0.5)] outline-none transition-all placeholder:text-text-muted"
                            />
    
                            <div id="error-msg" class="text-red-500 text-xs text-center hidden font-vcr uppercase"></div>
    
                            <button
                                type="submit"
                                class="w-full py-4 bg-accent hover:bg-accent-hover text-black font-bold font-vcr uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]"
                            >
                                LOGIN
                            </button>
                        </form>
    
                        <div class="flex flex-col gap-6 items-center w-full">
                             <div class="relative flex items-center w-full">
                                <span class="mx-auto text-white font-vcr uppercase">OR</span>
                            </div>
                            
                            <button id="login-google" class="w-full py-4 flex items-center justify-center gap-3 bg-transparent border border-accent hover:bg-accent/10 text-accent font-bold font-vcr uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(0,255,255,0.2)] hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] group">
                                <i class="fab fa-google text-lg"></i>
                                <span>Login with Google</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  onMounted(): void {
    const form = this.$("#login-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = (this.$("#username") as HTMLInputElement).value;
      const password = (this.$("#password") as HTMLInputElement).value;
      const errorDiv = this.$("#error-msg")!;

      try {
        if (
          username.toLowerCase() == "snyysbevg" &&
          password.toLowerCase() == "tbgpuln!"
        )
          throw new Error("Try again with ROT13");
        else if (
          username.toLowerCase() == "fallforit" &&
          password.toLowerCase() == "gotchya!"
        )
          throw new Error("Literally just read those values again.");
        const result = await AuthService.getInstance().login(
          username,
          password
        );
        if (!result.success) {
          throw new Error(result.error || "Authentication Failed");
        }
      } catch (err: any) {
        errorDiv.textContent = err.message || "Authentication Failed";
        errorDiv.classList.remove("hidden");
      }
    });

    this.$("#login-google")?.addEventListener("click", async () => {
      await AuthService.getInstance().loginWithGoogle();
    });

    this.$("#tab-register")?.addEventListener("click", (e) => {
      e.preventDefault();
      const app = (window as any).app;
      if (app) app.router.navigateTo("/register");
    });
  }
}
