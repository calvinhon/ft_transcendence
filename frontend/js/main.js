// js/main.js or add this to your existing JavaScript file

document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginScreen = document.getElementById('login-screen');
    const gameScreen = document.getElementById('game-screen');
    const userDisplay = document.getElementById('user-display');
    const logoutBtn = document.getElementById('logout-btn');

    // Handle registration form submission
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault(); // Prevent default form submission
        
        // Get form data
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        // Basic validation
        if (!username || !email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        console.log('Attempting registration:', { username, email });
        
        try {
            const result = await window.authManager.register(username, email, password);
            
            if (result.success) {
                // Registration successful - switch to game screen
                switchToGameScreen(username);
                registerForm.reset();
                console.log('Registration successful');
            } else {
                alert('Registration failed: ' + result.error);
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed: Network error');
        }
    });

    // Handle login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        console.log('Attempting login:', { username });
        
        try {
            const result = await window.authManager.login(username, password);
            console.log('Login result:', result);
            
            if (result.success) {
                // Login successful - switch to game screen
                console.log('Login successful, user data:', result.data);
                switchToGameScreen(username);
                loginForm.reset();
                console.log('Login successful');
            } else {
                console.log('Login failed:', result.error);
                alert('Login failed: ' + result.error);
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: Network error');
        }
    });

    // Handle logout
    logoutBtn.addEventListener('click', function() {
        window.authManager.logout();
        switchToLoginScreen();
    });

    // Function to switch to game screen
    function switchToGameScreen(username) {
        // Verify we have a valid user before switching screens
        const user = window.authManager.getCurrentUser();
        if (!user || !user.userId) {
            console.error('Cannot switch to game screen: No valid user found');
            alert('Authentication error. Please log in again.');
            switchToLoginScreen();
            return;
        }
        
        loginScreen.classList.remove('active');
        gameScreen.classList.add('active');
        userDisplay.textContent = `Welcome, ${username}!`;
        console.log('Switched to game screen for user:', user);
    }

    // Function to switch back to login screen
    function switchToLoginScreen() {
        gameScreen.classList.remove('active');
        loginScreen.classList.add('active');
        userDisplay.textContent = 'Welcome!';
    }

    // Check if user is already logged in (page refresh)
    async function checkExistingLogin() {
        const isValid = await window.authManager.verifyToken();
        if (isValid) {
            const user = window.authManager.getCurrentUser();
            if (user) {
                switchToGameScreen(user.username);
            }
        }
    }
    
    // Periodic authentication check (every 30 seconds when on game page)
    function startAuthCheck() {
        setInterval(async () => {
            if (gameScreen.classList.contains('active')) {
                const isValid = await window.authManager.verifyToken();
                if (!isValid) {
                    console.log('Authentication expired, redirecting to login');
                    alert('Your session has expired. Please log in again.');
                    switchToLoginScreen();
                }
            }
        }, 30000); // Check every 30 seconds
    }
    
    checkExistingLogin();
    startAuthCheck();
});

// Additional functions for game navigation
document.addEventListener('DOMContentLoaded', function() {
    const playBtn = document.getElementById('play-btn');
    const tournamentsBtn = document.getElementById('tournaments-btn');
    const profileBtn = document.getElementById('profile-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    
    const playSection = document.getElementById('play-section');
    const tournamentSection = document.getElementById('tournament-section');
    
    // Navigation handlers
    playBtn.addEventListener('click', function() {
        showSection(playSection);
        setActiveNavBtn(playBtn);
    });
    
    tournamentsBtn.addEventListener('click', function() {
        showSection(tournamentSection);
        setActiveNavBtn(tournamentsBtn);
    });
    
    // Add more navigation handlers as needed...
    
    function showSection(section) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(s => s.classList.remove('active'));
        
        // Show selected section
        section.classList.add('active');
    }
    
    function setActiveNavBtn(activeBtn) {
        // Remove active class from all nav buttons
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        activeBtn.classList.add('active');
    }
});