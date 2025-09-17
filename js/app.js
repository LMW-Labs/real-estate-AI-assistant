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

// UI Elements
const ui = {
    generateBtn: document.getElementById('generateBtn'),
    btnText: document.getElementById('btnText'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    resultsSection: document.getElementById('resultsSection'),
    listingResults: document.getElementById('listingResults'),
    errorMessage: document.getElementById('errorMessage'),
    successMessage: document.getElementById('successMessage'),
    apiModal: document.getElementById('apiModal'),
    geminiApiKeyInput: document.getElementById('geminiApiKey'),
    apiModelSelect: document.getElementById('apiModel'),
    generationTime: document.getElementById('generationTime'),
    listingCount: document.getElementById('listingCount'),
    totalWords: document.getElementById('totalWords'),
    propertyForm: document.getElementById('propertyForm'),
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadConfiguration();
    setupEventListeners();
    loadSampleData(); // For demo purposes
});

function setupEventListeners() {
    ui.propertyForm.addEventListener('submit', handleFormSubmit);

    // Auto-save form data
    const formInputs = document.querySelectorAll('#propertyForm input, #propertyForm select, #propertyForm textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', debounce(saveFormData, 500));
    });

    document.getElementById('saveConfigBtn').addEventListener('click', saveApiConfig);
    document.getElementById('clearFormBtn').addEventListener('click', clearForm);
    document.getElementById('exportAllBtn').addEventListener('click', exportAllListings);
    document.getElementById('apiConfigBtn').addEventListener('click', showApiConfig);
    document.getElementById('closeApiModalBtn').addEventListener('click', closeApiConfig);
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
        specialFeatures: 'Recently renovated kitchen with quartz countertops, smart home automation system, new hardwood floors throughout.',
        listingStyle: 'professional' // Set a default style for the sample data
    };
    
    // Set form values
    for (const key in sampleData) {
        const input = document.getElementById(key);
        if (input) {
            input.value = sampleData[key];
        }
    }
}

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

function saveFormData() {
    // This function can be implemented to save form data to localStorage if needed
    // For now, it's a placeholder for the debounce function
}

// UI Functions
function showApiConfig() {
    ui.apiModal.style.display = 'flex';
    ui.geminiApiKeyInput.value = AppState.apiKey || '';
    ui.apiModelSelect.value = AppState.model;
}

function closeApiConfig() {
    ui.apiModal.style.display = 'none';
}

function saveApiConfig() {
    AppState.apiKey = ui.geminiApiKeyInput.value;
    AppState.model = ui.apiModelSelect.value;
    saveConfiguration();
    closeApiConfig();
}

function clearForm() {
    ui.propertyForm.reset();
    AppState.listings = [];
    ui.listingResults.innerHTML = '';
    ui.resultsSection.style.display = 'none';
    hideMessages();
}

function exportAllListings() {
    if (AppState.listings.length === 0) {
        showErrorMessage('No listings to export.');
        return;
    }

    const allListingsText = AppState.listings.map(listing => {
        return `--- ${listing.platform} LISTING ---\n\n${listing.content}`;
    }).join('\n\n');

    const blob = new Blob([allListingsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai_listings.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccessMessage('All listings exported as a text file!');
}

function toggleLoadingState(isLoading) {
    ui.generateBtn.disabled = isLoading;
    ui.btnText.textContent = isLoading ? 'Generating...' : 'Generate AI Listings';
    ui.loadingSpinner.style.display = isLoading ? 'inline-block' : 'none';
}

function showErrorMessage(message) {
    ui.errorMessage.textContent = message;
    ui.errorMessage.style.display = 'block';
    ui.successMessage.style.display = 'none';
}

function showSuccessMessage(message) {
    ui.successMessage.textContent = message;
    ui.successMessage.style.display = 'block';
    ui.errorMessage.style.display = 'none';
}

function hideMessages() {
    ui.errorMessage.style.display = 'none';
    ui.successMessage.style.display = 'none';
}

function displayListing(platform, content) {
    const listingCard = document.createElement('div');
    listingCard.className = 'listing-card';
    
    listingCard.innerHTML = `
        <div class="listing-header">
            <div class="listing-title">${platform} Listing</div>
            <div class="listing-platform">${platform}</div>
        </div>
        <div class="listing-content">
            ${content.replace(/\n/g, '<br>')}
        </div>
        <div class="listing-actions">
            <button class="action-btn btn-copy" onclick="copyToClipboard(this)">Copy</button>
        </div>
    `;
    ui.listingResults.appendChild(listingCard);
    
    // Update stats
    AppState.listings.push({ platform, content });
    ui.listingCount.textContent = AppState.listings.length;
    ui.totalWords.textContent = AppState.listings.reduce((total, l) => total + l.content.split(/\s+/).length, 0);
}

function copyToClipboard(button) {
    const content = button.closest('.listing-card').querySelector('.listing-content').innerText;
    navigator.clipboard.writeText(content).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

/**
 * Builds a real estate listing prompt for a Vertex AI text generation model.
 * @param {object} propertyData - The data of the property to be listed.
 * @param {string} style - The desired style for the listing ('professional', 'warm', 'luxury', 'modern', 'family-friendly').
 * @returns {string} The complete, formatted prompt string.
 */
function buildGeminiPrompt(propertyData, style) {
    let styleInstructions;

    switch (style) {
        case 'professional':
            styleInstructions = `Write a professional real estate listing that emphasizes facts, features, and investment value. Use industry terminology appropriately. Focus on market position, key specifications, and measurable benefits. Maintain a formal tone while highlighting the property's competitive advantages. Include specific details about square footage, lot size, and premium features. Target serious buyers and investors who value detailed information and market data.
            Key elements to include: Lead with square footage and lot size, emphasize investment potential, use formal real estate terminology, include neighborhood market data, and focus on ROI and property value.`;
            break;
        case 'warm':
            styleInstructions = `Create a warm and inviting listing that makes readers feel at home before they even visit. Use emotional language that helps buyers envision their daily life in the space. Focus on comfort, family moments, and the feeling of 'home.' Include sensory details and paint pictures of cozy evenings, family gatherings, and peaceful mornings. Make the property feel welcoming and lived-in rather than just a house.
            Key elements to include: Use words like "cozy," "welcoming," "inviting," describe potential family moments, include sensory details (natural light, morning coffee, etc.), focus on comfort and lifestyle, and create emotional connections.`;
            break;
        case 'luxury':
            styleInstructions = `Craft an elegant, sophisticated listing that appeals to discerning buyers seeking premium properties. Use refined language and emphasize exclusivity, craftsmanship, and high-end finishes. Focus on unique architectural details, designer elements, and luxury amenities. Convey prestige and exceptional quality. Use words that suggest sophistication, elegance, and a superior lifestyle. Target affluent buyers who appreciate fine details and premium experiences.
            Key elements to include: Emphasize exclusivity and rarity, highlight premium materials and finishes, use sophisticated vocabulary, focus on architectural details, and mention luxury amenities and lifestyle.`;
            break;
        case 'modern':
            styleInstructions = `Write a contemporary listing that emphasizes modern design, clean lines, and current trends. Focus on smart home features, energy efficiency, and innovative design elements. Use crisp, clean language that reflects the property's modern aesthetic. Highlight technology integration, sustainable features, and forward-thinking design. Appeal to buyers who value contemporary living and cutting-edge amenities.
            Key elements to include: Emphasize clean lines and modern design, highlight smart home technology, focus on energy efficiency, use contemporary language, and mention innovative features and sustainability.`;
            break;
        case 'family-friendly':
            styleInstructions = `Create a family-oriented listing that highlights safety, convenience, and child-friendly features. Emphasize school districts, neighborhood amenities, and spaces where families can grow and thrive. Focus on practical benefits like storage, play areas, and proximity to parks and activities. Use language that speaks to parents' priorities: safety, education, community, and room to grow. Make the property feel like the perfect place to raise children.
            Key elements to include: Highlight school districts and ratings, mention safety features and quiet streets, focus on play areas and family spaces, emphasize storage and organization, and include community amenities and parks.`;
            break;
        default:
            throw new Error(`Invalid style provided: ${style}. Please choose from: professional, warm, luxury, modern, family-friendly.`);
    }

    const propertyDetails = `
    Property Details:
    - Address: ${propertyData.address}
    - Price: $${propertyData.price.toLocaleString()}
    - Bedrooms: ${propertyData.bedrooms}
    - Bathrooms: ${propertyData.bathrooms}
    - Square Footage: ${propertyData.squareFootage} sq ft
    - Special Features: ${propertyData.specialFeatures.join(', ')}
    - Lot Size: ${propertyData.lotSize} sq ft
    - Year Built: ${propertyData.yearBuilt}
    - Garage: ${propertyData.garage} spaces
    - Neighborhood: ${propertyData.neighborhood}
    `;

    return `${styleInstructions}\n\n${propertyDetails}\n\nGenerate a compelling real estate listing description. Also, provide a shorter, engaging version suitable for social media with relevant hashtags.`;
}

async function handleFormSubmit(event) {
    event.preventDefault();

    if (!AppState.apiKey) {
        showErrorMessage('Please enter your Gemini API Key in the API Config menu.');
        return;
    }

    AppState.isGenerating = true;
    toggleLoadingState(true);
    hideMessages();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    const features = Array.from(document.querySelectorAll('input[name="features"]:checked')).map(el => el.value);

    const propertyData = {
        address: `${data.address}, ${data.city}, ${data.state} ${data.zipCode}`,
        price: data.price,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFootage: data.squareFootage,
        lotSize: data.lotSize,
        yearBuilt: data.yearBuilt,
        garage: data.garage,
        neighborhood: data.neighborhood,
        specialFeatures: features.concat(data.specialFeatures.split(',').map(s => s.trim()).filter(s => s.length > 0))
    };

    const listingStyle = data.listingStyle || 'professional';
    const platforms = ['Zillow', 'Redfin', 'Agent Website'];

    AppState.listings = [];
    ui.listingResults.innerHTML = '';
    ui.listingCount.textContent = 0;
    ui.totalWords.textContent = 0;

    const startTime = performance.now();

    for (const platform of platforms) {
        try {
            const prompt = buildGeminiPrompt(propertyData, listingStyle);
            await generateAIListing(prompt, platform);
        } catch (error) {
            console.error('Failed to generate listing:', error);
            showErrorMessage(`Failed to generate listing for ${platform}: ${error.message}`);
        }
    }

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    ui.generationTime.textContent = duration;

    AppState.isGenerating = false;
    toggleLoadingState(false);
    showSuccessMessage('Listings generated successfully!');
    ui.resultsSection.style.display = 'block';
}

async function generateAIListing(prompt, platform) {
    const url = `${CONFIG.GEMINI_API_URL}${AppState.model}:generateContent`;

    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: prompt
                    }
                ]
            }
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': AppState.apiKey
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `API error: ${response.status}`);
        }

        const result = await response.json();
        const generatedText = result.candidates[0]?.content?.parts[0]?.text;
        
        if (generatedText) {
            displayListing(platform, generatedText);
        } else {
            throw new Error('No content was generated by the API.');
        }

    } catch (error) {
        console.error('API call failed:', error);
        throw error; // Re-throw to be caught by the calling function
    }
}