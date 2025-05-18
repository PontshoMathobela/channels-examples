/**
 * Language selection functionality for Connect Chat
 */

// Language data with translations
const languageData = {
    'en': {
        'welcome': 'Welcome to Connect Chat',
        'login': 'Login',
        'register': 'Register',
        'username': 'Username',
        'password': 'Password',
        'search': 'Search users...',
        'online': 'Online',
        'offline': 'Offline',
        'typing': 'is typing...',
        'send': 'Send',
        'logout': 'Logout'
    },
    'en-za': {
        'welcome': 'Welcome to Connect Chat',
        'login': 'Login',
        'register': 'Register',
        'username': 'Username',
        'password': 'Password',
        'search': 'Search users...',
        'online': 'Online',
        'offline': 'Offline',
        'typing': 'is typing...',
        'send': 'Send',
        'logout': 'Logout'
    },
    'af': {
        'welcome': 'Welkom by Connect Chat',
        'login': 'Teken in',
        'register': 'Registreer',
        'username': 'Gebruikernaam',
        'password': 'Wagwoord',
        'search': 'Soek gebruikers...',
        'online': 'Aanlyn',
        'offline': 'Aflyn',
        'typing': 'tik tans...',
        'send': 'Stuur',
        'logout': 'Teken uit'
    },
    'zu': {
        'welcome': 'Siyakwamukela ku-Connect Chat',
        'login': 'Ngena',
        'register': 'Bhalisa',
        'username': 'Igama lomsebenzisi',
        'password': 'Iphasiwedi',
        'search': 'Sesha abasebenzisi...',
        'online': 'Ku-inthanethi',
        'offline': 'Akuxhunyiwe',
        'typing': 'iyathayipha...',
        'send': 'Thumela',
        'logout': 'Phuma'
    },
    'xh': {
        'welcome': 'Wamkelekile kwi-Connect Chat',
        'login': 'Ngena',
        'register': 'Bhalisela',
        'username': 'Igama lomsebenzisi',
        'password': 'Iphasiwedi',
        'search': 'Khangela abasebenzisi...',
        'online': 'Kuqhagamshelwe',
        'offline': 'Akuqhagamshelwanga',
        'typing': 'iyachwetheza...',
        'send': 'Thumela',
        'logout': 'Phuma'
    },
    'st': {
        'welcome': 'O amohetswe ho Connect Chat',
        'login': 'Kena',
        'register': 'Ingodisa',
        'username': 'Lebitso la mosebedisi',
        'password': 'Phasewete',
        'search': 'Batla basebedisi...',
        'online': 'Hoqhagamshelwa',
        'offline': 'Ha ho qhagamshelwang',
        'typing': 'o a tlanya...',
        'send': 'Romela',
        'logout': 'Tswa'
    },
    'es': {
        'welcome': 'Bienvenido a Connect Chat',
        'login': 'Iniciar sesión',
        'register': 'Registrarse',
        'username': 'Nombre de usuario',
        'password': 'Contraseña',
        'search': 'Buscar usuarios...',
        'online': 'En línea',
        'offline': 'Desconectado',
        'typing': 'está escribiendo...',
        'send': 'Enviar',
        'logout': 'Cerrar sesión'
    }
};

// Default language
let currentLanguage = 'en-za';

/**
 * Initialize language functionality
 */
function initLanguage() {
    // Try to get saved language from localStorage
    const savedLanguage = localStorage.getItem('connectChatLanguage');
    if (savedLanguage && languageData[savedLanguage]) {
        currentLanguage = savedLanguage;
    }
    
    // Add click handlers to language options
    document.querySelectorAll('.dropdown-item[data-language]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const language = this.getAttribute('data-language');
            changeLanguage(language);
        });
    });
    
    // Apply current language
    applyLanguage();
}

/**
 * Change the application language
 * @param {string} language - Language code to switch to
 */
function changeLanguage(language) {
    // Skip if language doesn't exist or is already selected
    if (!languageData[language] || language === currentLanguage) {
        return;
    }
    
    // Update current language
    currentLanguage = language;
    
    // Save to localStorage
    localStorage.setItem('connectChatLanguage', language);
    
    // Apply language changes
    applyLanguage();
}

/**
 * Apply the current language to page elements
 */
function applyLanguage() {
    const translations = languageData[currentLanguage];
    
    // Update data-language attributes
    for (const key in translations) {
        const elements = document.querySelectorAll(`[data-lang="${key}"]`);
        elements.forEach(el => {
            el.textContent = translations[key];
        });
        
        // Also update placeholders
        const placeholders = document.querySelectorAll(`[data-lang-placeholder="${key}"]`);
        placeholders.forEach(el => {
            el.setAttribute('placeholder', translations[key]);
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initLanguage);