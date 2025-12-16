import { AbstractComponent } from "../components/AbstractComponent";
import { AuthService } from "../services/AuthService";

export class OAuthCallbackPage extends AbstractComponent {
    constructor() {
        super();
    }

    getHtml(): string {
        return `
            <div class="flex items-center justify-center h-screen bg-black text-accent font-vcr">
                <div class="text-center animate-pulse">
                    <h1 class="text-2xl mb-4">AUTHENTICATING...</h1>
                    <p class="text-xs text-gray-500">Please wait while we verify your credentials.</p>
                </div>
            </div>
        `;
    }

    onMounted(): void {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userStr = urlParams.get('user');
        const error = urlParams.get('error');

        // Note: The backend should redirect to this page with params
        // like /oauth/callback?token=...&user={...}
        // If the backend sets a cookie, we might not get a token in URL.
        // But for popup flow, passing it in URL or having the backend return HTML that posts message is common.
        // Assuming the backend redirects here.

        const authService = AuthService.getInstance();

        if (error) {
            authService.handleOAuthErrorInPopup(error);
            return;
        }

        if (token && userStr) {
            try {
                const user = JSON.parse(decodeURIComponent(userStr));
                authService.handleOAuthCallbackInPopup(user, token);
            } catch (e) {
                console.error("Failed to parse user data", e);
                authService.handleOAuthErrorInPopup("Invalid server response");
            }
        } else {
            // Check if we can just verify session?
            // Usually oauth callback has 'code' which we exchange.
            // But if the backend handles the exchange and redirects here with the final session/token:
            // Let's assume the "legacy" backend flow or the one I adapted.
            // If the backend returns a 'code', we need to exchange it.
            // Plan said "handleOAuthCallback(code, provider)".

            const code = urlParams.get('code');
            // const provider = urlParams.get('provider'); // might be state or implicit

            if (code) {
                // We need to exchange code. 
                // Actually the backend endpoint `/oauth/callback` usually IS the callback URL registered with provider.
                // So the provider redirects browser to Backend. Backend does logic, then redirects browser to Frontend.
                // Frontend URL: /oauth/callback (this page).
                // So backend SHOULD pass result here.

                // If param "token" is missing, maybe it failed.
                authService.handleOAuthErrorInPopup("Authentication incomplete");
            }
        }
    }
}
