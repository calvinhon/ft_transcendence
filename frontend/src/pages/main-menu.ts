export class MainMenuPage {
    private router: any;

    constructor(router: any) {
        this.router = router;
    }

    init(): void {
        document.getElementById('play-btn')?.addEventListener('click', () => {
            this.router.navigate('play-config');
        });

        document.getElementById('profile-btn')?.addEventListener('click', () => {
            this.router.navigate('profile');
        });

        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.router.navigate('settings');
        });

        document.getElementById('main-menu-logout-btn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        this.updateUserDisplay();
    }

    cleanup(): void { }

    private handleLogout(): void {
        const authManager = (window as any).authManager;
        if (authManager) {
            authManager.logout();
        }
        this.router.navigate('login');
    }

    private updateUserDisplay(): void {
        const authManager = (window as any).authManager;
        const user = authManager?.getCurrentUser();

        const userDisplay = document.getElementById('main-menu-user-display');
        if (userDisplay && user) {
            userDisplay.textContent = `Welcome, ${user.username}!`;
        }
    }
}
