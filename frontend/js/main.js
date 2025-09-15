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
    registerForm.addEventListener('submit', function(e) {
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
        
        // Here you would typically send data to your backend
        // For now, we'll simulate a successful registration
        console.log('Registration data:', { username, email, password });
        
        // Simulate API call delay
        setTimeout(() => {
            // Registration successful - switch to game screen
            switchToGameScreen(username);
            
            // Clear the form
            registerForm.reset();
        }, 500);
    });

    // Handle login form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        // Simulate login process
        console.log('Login data:', { username, password });
        
        setTimeout(() => {
            switchToGameScreen(username);
            loginForm.reset();
        }, 500);
    });

    // Handle logout
    logoutBtn.addEventListener('click', function() {
        switchToLoginScreen();
    });

    // Function to switch to game screen
    function switchToGameScreen(username) {
        loginScreen.classList.remove('active');
        gameScreen.classList.add('active');
        userDisplay.textContent = `Welcome, ${username}!`;
        
        // Store username for later use
        sessionStorage.setItem('currentUser', username);
    }

    // Function to switch back to login screen
    function switchToLoginScreen() {
        gameScreen.classList.remove('active');
        loginScreen.classList.add('active');
        userDisplay.textContent = 'Welcome!';
        
        // Clear stored user
        sessionStorage.removeItem('currentUser');
    }

    // Check if user is already logged in (page refresh)
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
        switchToGameScreen(currentUser);
    }
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