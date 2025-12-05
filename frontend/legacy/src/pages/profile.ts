export class ProfilePage {
    private router: any;
    private app: any;

    constructor(router: any, app: any) {
        this.router = router;
        this.app = app;
    }

    init(): void {
        document.getElementById('back-to-main-profile-btn')?.addEventListener('click', () => {
            this.router.navigate('main-menu');
        });

        // Load profile data
        this.app.loadProfileData();
    }

    cleanup(): void { }
}
