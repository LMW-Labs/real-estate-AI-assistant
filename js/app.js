// Application State
const AppState = {
    listings: [],
    apiKey: null,
    model: 'gemini-pro',
    isGenerating: false
};
// Configuration
const CONFIG = {
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    LOCAL_STORAGE_KEY: 'proplistai_config'
};
// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadConfiguration();
    setupEventListeners();
    loadSampleData(); // For demo purposes
});
function setupEventListeners() {
    document.getElementById('propertyForm').addEventListener('submit', handleFormSubmit);
    // Auto-save form data
    const formInputs = document.querySelectorAll('#propertyForm input, #propertyForm select, #propertyForm textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', debounce(saveFormData, 500));
    });
}

function loadConfiguration() {
    const saved = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
    if (saved) {
        try {
            const config = JSON.parse(saved);
            AppState.apiKey = config.apiKey;
            AppState.model = config.model || 'gemini-pro';
        } catch (e) {
            console.error('Failed to load configuration:', e);
        }
    }
}

function saveConfiguration() {
    const config = {
        apiKey: AppState.apiKey,
        model: AppState.model
    };
    localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(config));
}

function loadSampleData() {
    // Pre-populate with sample data for demo
    const sampleData = {
        address: '123 Elm Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        price: 1250000,
        propertyType: 'single-family',
        bedrooms: 3,
        bathrooms: 2.5,
        squareFootage: 2200,
        lotSize: 6000,
        yearBuilt: 2018,
        garage: 2,
        neighborhood: 'Mission District, Top-rated schools',
        specialFeatures: 'Recently renovated kitchen with quartz countertops, smart home automation system, new hardwood floors throughout.'
    }
}