// Application State
const AppState = {
    listings: [],
    apiKey: localStorage.getItem('proplistai_apikey') || null,
    model: localStorage.getItem('proplistai_model') || 'gemini-1.5-flash',
    isGenerating: false
};

// Configuration
const CONFIG = {
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    PLATFORMS: [
        { name: 'Zillow', focus: 'comprehensive details and buyer appeal' },
        { name: 'Redfin', focus: 'data-driven insights and neighborhood highlights' },
        { name: 'Agent Website', focus: 'personal touch and unique selling points' }
    ]
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
    propertyForm: document.getElementById('propertyForm')
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    loadConfiguration();
    setupEventListeners();
    console.log('🏡 PropListAI initialized successfully!');
});

function setupEventListeners() {
    ui.propertyForm.addEventListener('submit', handleFormSubmit);
    
    // Click outside modal to close
    ui.apiModal.addEventListener('click', function(e) {
        if (e.target === ui.apiModal) {
            closeApiConfig();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && ui.apiModal.style.display === 'flex') {
            closeApiConfig();
        }
    });
}

function loadConfiguration() {
    ui.geminiApiKeyInput.value = AppState.apiKey || '';
    ui.apiModelSelect.value = AppState.model;
    console.log('Configuration loaded:', { hasApiKey: !!AppState.apiKey, model: AppState.model });
}

function showApiConfig() {
    ui.apiModal.style.display = 'flex';
    ui.geminiApiKeyInput.value = AppState.apiKey || '';
    ui.apiModelSelect.value = AppState.model;
    // Focus on the API key input
    setTimeout(() => ui.geminiApiKeyInput.focus(), 100);
}

function closeApiConfig() {
    ui.apiModal.style.display = 'none';
}

function saveApiConfig() {
    const apiKey = ui.geminiApiKeyInput.value.trim();
    const model = ui.apiModelSelect.value;
    
    if (!apiKey) {
        showErrorMessage('❌ Please enter a valid API key.');
        return;
    }

    // Basic API key validation
    if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
        showErrorMessage('❌ Please enter a valid Gemini API key (should start with "AIza").');
        return;
    }
    
    AppState.apiKey = apiKey;
    AppState.model = model;
    
    localStorage.setItem('proplistai_apikey', AppState.apiKey);
    localStorage.setItem('proplistai_model', AppState.model);
    
    closeApiConfig();
    showSuccessMessage('✅ API Configuration saved successfully!');
    console.log('API configuration updated:', { model: AppState.model });
}

function clearForm() {
    if (confirm('Are you sure you want to clear all form data and results?')) {
        ui.propertyForm.reset();
        AppState.listings = [];
        ui.listingResults.innerHTML = '';
        ui.resultsSection.style.display = 'none';
        hideMessages();
        showSuccessMessage('🔄 Form cleared successfully!');
        console.log('Form cleared');
    }
}

function exportAllListings() {
    if (AppState.listings.length === 0) {
        showErrorMessage('❌ No listings to export. Generate some listings first!');
        return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const propertyInfo = gatherPropertyInfo();
    
    let exportContent = `PROPLISTAI GENERATED LISTINGS\n`;
    exportContent += `Generated: ${new Date().toLocaleString()}\n`;
    exportContent += `Property: ${propertyInfo.address}\n`;
    exportContent += `Price: $${parseInt(propertyInfo.price).toLocaleString()}\n`;
    exportContent += `${'='.repeat(60)}\n\n`;

    exportContent += AppState.listings.map((listing, index) => {
        return `${index + 1}. ${listing.platform.toUpperCase()} LISTING\n${'='.repeat(40)}\n\n${listing.content}\n\n`;
    }).join('');

    exportContent += `${'='.repeat(60)}\n`;
    exportContent += `Total listings: ${AppState.listings.length}\n`;
    exportContent += `Total words: ${AppState.listings.reduce((total, l) => total + l.content.split(/\s+/).length, 0)}\n`;
    exportContent += `Generated by PropListAI - AI Real Estate Listing Generator`;

    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PropListAI-Listings-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccessMessage('📥 All listings exported successfully!');
    console.log('Listings exported:', AppState.listings.length);
}

function toggleLoadingState(isLoading) {
    AppState.isGenerating = isLoading;
    ui.generateBtn.disabled = isLoading;
    ui.btnText.textContent = isLoading ? '⏳ Generating Amazing Listings...' : '🚀 Generate AI Listings';
    ui.loadingSpinner.style.display = isLoading ? 'inline-block' : 'none';
}

function showErrorMessage(message) {
    ui.errorMessage.textContent = message;
    ui.errorMessage.style.display = 'block';
    ui.successMessage.style.display = 'none';
    
    // Auto-hide after 5 seconds
    setTimeout(hideMessages, 5000);
    
    // Scroll to message
    ui.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    console.error('Error message:', message);
}

function showSuccessMessage(message) {
    ui.successMessage.textContent = message;
    ui.successMessage.style.display = 'block';
    ui.errorMessage.style.display = 'none';
    
    // Auto-hide after 3 seconds
    setTimeout(hideMessages, 3000);
    
    console.log('Success message:', message);
}

function hideMessages() {
    ui.errorMessage.style.display = 'none';
    ui.successMessage.style.display = 'none';
}

function gatherPropertyInfo() {
    const formData = new FormData(ui.propertyForm);
    const data = Object.fromEntries(formData.entries());
    const features = Array.from(document.querySelectorAll('input[name="features"]:checked')).map(el => el.value);

    return {
        address: `${data.address}, ${data.city}, ${data.state} ${data.zipCode}`,
        price: data.price || '0',
        propertyType: data.propertyType || 'Property',
        bedrooms: data.bedrooms || 'Not specified',
        bathrooms: data.bathrooms || 'Not specified',
        squareFootage: data.squareFootage || 'Not specified',
        lotSize: data.lotSize || 'Not specified',
        yearBuilt: data.yearBuilt || 'Not specified',
        garage: data.garage || 'Not specified',
        neighborhood: data.neighborhood || 'Not specified',
        listingStyle: data.listingStyle || 'professional',
        features: features,
        specialFeatures: data.specialFeatures || 'None specified',
        additionalNotes: data.additionalNotes || 'None'
    };
}

function buildGeminiPrompt(propertyData, platform) {
    const styleInstructions = {
        'professional': 'Write in a professional, authoritative tone that builds trust and credibility. Focus on facts, market appeal, and investment value.',
        'warm': 'Use warm, inviting language that makes readers feel at home and emotionally connected. Emphasize comfort and lifestyle.',
        'luxury': 'Employ sophisticated, elegant language that emphasizes exclusivity, premium quality, and luxury amenities.',
        'modern': 'Use contemporary, clean language that highlights innovation, cutting-edge features, and sleek design.',
        'family-friendly': 'Focus on family lifestyle benefits with warm, community-oriented language. Emphasize safety, schools, and family spaces.'
    };

    const style = styleInstructions[propertyData.listingStyle] || styleInstructions['professional'];
    const featuresText = propertyData.features.length ? propertyData.features.map(f => f.replace(/-/g, ' ')).join(', ') : 'Standard home features';

    return `You are an expert real estate copywriter specializing in ${platform.name}. Create a compelling, engaging listing that focuses on ${platform.focus}.

PROPERTY DETAILS:
- Address: ${propertyData.address}
- Price: $${parseInt(propertyData.price).toLocaleString()}
- Type: ${propertyData.propertyType}
- Bedrooms: ${propertyData.bedrooms}
- Bathrooms: ${propertyData.bathrooms}
- Square Footage: ${propertyData.squareFootage === 'Not specified' ? propertyData.squareFootage : propertyData.squareFootage + ' sq ft'}
- Lot Size: ${propertyData.lotSize === 'Not specified' ? propertyData.lotSize : propertyData.lotSize + ' sq ft'}
- Year Built: ${propertyData.yearBuilt}
- Garage: ${propertyData.garage === 'Not specified' ? propertyData.garage : propertyData.garage + ' spaces'}
- Neighborhood: ${propertyData.neighborhood}
- Key Features: ${featuresText}
- Special Features: ${propertyData.specialFeatures}
- Additional Notes: ${propertyData.additionalNotes}

WRITING STYLE: ${style}

PLATFORM REQUIREMENTS FOR ${platform.name}:
${getPlatformSpecificRequirements(platform.name)}

INSTRUCTIONS:
1. Create a compelling headline that grabs attention
2. Write a detailed description (300-500 words) that highlights the property's best features
3. Use persuasive real estate language and emotional triggers
4. Include specific details that justify the price point
5. End with a strong call-to-action
6. Format with proper paragraphs and spacing

Generate the complete listing now:`;
}

function getPlatformSpecificRequirements(platformName) {
    switch (platformName) {
        case 'Zillow':
            return 'Create a comprehensive listing optimized for search. Include bullet points for key features, emphasize neighborhood benefits, and focus on factors that help buyers make decisions quickly. Use keywords that buyers commonly search for.';
        case 'Redfin':
            return 'Emphasize data-driven insights, market trends, walkability scores, and practical details. Tech-savvy buyers appreciate specifics about efficiency, smart home features, and investment potential.';
        case 'Agent Website':
            return 'Create a personalized listing that tells the property\'s story. Build emotional connection, emphasize unique selling points, and showcase your local expertise. Make it feel exclusive and special.';
        default:
            return 'Create a balanced listing that appeals to a broad audience with clear details and compelling language.';
    }
}

async function generateAIListing(prompt, platform, propertyData) {
    const url = `${CONFIG.GEMINI_API_URL}${AppState.model}:generateContent?key=${AppState.apiKey}`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            stopSequences: []
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };

    try {
        console.log(`Generating ${platform.name} listing...`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = `API Error (${response.status})`;
            
            if (response.status === 401) {
                errorMessage = 'Invalid API key. Please check your Gemini API key in settings.';
            } else if (response.status === 403) {
                errorMessage = 'API access denied. Please verify your API key permissions.';
            } else if (response.status === 429) {
                errorMessage = 'Rate limit exceeded. Please try again in a moment.';
            } else if (errorData.error?.message) {
                errorMessage += ': ' + errorData.error.message;
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from Gemini API');
        }

        const candidate = data.candidates[0];
        
        if (candidate.finishReason === 'SAFETY') {
            throw new Error('Content was filtered by safety settings. Try adjusting your property description.');
        }

        if (!candidate.content.parts || !candidate.content.parts[0] || !candidate.content.parts[0].text) {
            throw new Error('No content generated. Please try again.');
        }

        const generatedContent = candidate.content.parts[0].text.trim();
        
        if (generatedContent.length < 50) {
            throw new Error('Generated content too short. Please try again.');
        }

        displayListing(platform.name, generatedContent);
        console.log(`✅ ${platform.name} listing generated successfully`);
        
    } catch (error) {
        console.error(`Failed to generate ${platform.name} listing:`, error);
        
        // Generate demo listing on error
        const demoListing = generateDemoListing(platform.name, propertyData);
        displayListing(platform.name, demoListing);
        
        // Don't throw the error to prevent stopping other listings
        return { error: error.message };
    }
}

function generateDemoListing(platformName, propertyData) {
    const features = propertyData.features.length 
        ? propertyData.features.map(f => `• ${f.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`).join('\n') 
        : '• Standard home features';

    return `🏡 **STUNNING ${propertyData.propertyType.toUpperCase()} IN PRIME LOCATION** 🏡

✨ **DEMO LISTING - Please Configure API Key for AI Generation** ✨

Welcome to this beautiful ${propertyData.propertyType} located at ${propertyData.address}. This exceptional property offers ${propertyData.bedrooms} bedrooms and ${propertyData.bathrooms} bathrooms across ${propertyData.squareFootage} square feet of thoughtfully designed living space.

💰 **COMPETITIVELY PRICED AT $${parseInt(propertyData.price).toLocaleString()}**

🔑 **Outstanding Features:**
${features}

📍 **PRIME LOCATION**
Situated in the desirable ${propertyData.neighborhood || 'neighborhood'}, this property offers convenient access to schools, shopping, dining, and transportation.

🏠 **PROPERTY HIGHLIGHTS:**
• Year Built: ${propertyData.yearBuilt}
• Lot Size: ${propertyData.lotSize} sq ft
• Garage: ${propertyData.garage} spaces
• Special Features: ${propertyData.specialFeatures}

⚠️ **DEMO MODE NOTICE**
This is a sample listing generated in demo mode. To create personalized, AI-powered listings tailored specifically for ${platformName}, please configure your Gemini API key in the settings menu.

📞 **READY TO MAKE THIS HOME YOURS?**
Contact us today to schedule a private showing and experience all this exceptional property has to offer!

---
Generated by PropListAI - Professional Real Estate Listing Generator`;
}

function displayListing(platform, content) {
    const listingCard = document.createElement('div');
    listingCard.className = 'listing-card animate-fade-in-up';
    
    // Create a unique ID for this listing
    const listingId = `listing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    listingCard.innerHTML = `
        <div class="listing-header">
            <div class="listing-title">${platform} Listing</div>
            <div class="listing-platform">${platform}</div>
        </div>
        <div class="listing-content" id="content-${listingId}">${content.replace(/\n/g, '<br>')}</div>
        <div class="listing-actions">
            <button class="btn-copy" onclick="copyToClipboard('${listingId}')">📋 Copy</button>
        </div>
    `;
    
    ui.listingResults.appendChild(listingCard);
    
    // Update stats
    AppState.listings.push({ platform, content });
    updateStats();
    
    console.log(`Listing displayed for ${platform}`);
}

function updateStats() {
    ui.listingCount.textContent = AppState.listings.length;
    const totalWords = AppState.listings.reduce((total, listing) => 
        total + listing.content.split(/\s+/).filter(word => word.length > 0).length, 0
    );
    ui.totalWords.textContent = totalWords;
}

async function copyToClipboard(listingId) {
    const contentElement = document.getElementById(`content-${listingId}`);
    
    if (!contentElement) {
        showErrorMessage('❌ Failed to find content to copy');
        return;
    }
    
    const content = contentElement.innerText || contentElement.textContent;
    const button = contentElement.closest('.listing-card').querySelector('.btn-copy');
    
    try {
        await navigator.clipboard.writeText(content);
        
        const originalText = button.textContent;
        const originalBackground = button.style.backgroundColor;
        
        button.textContent = '✅ Copied!';
        button.style.backgroundColor = 'var(--success)';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = originalBackground;
        }, 2000);
        
        console.log('Content copied to clipboard');
        
    } catch (err) {
        console.error('Failed to copy text:', err);
        
        // Fallback for older browsers
        try {
            const textArea = document.createElement('textarea');
            textArea.value = content;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            button.textContent = '✅ Copied!';
            setTimeout(() => button.textContent = '📋 Copy', 2000);
            
        } catch (fallbackErr) {
            showErrorMessage('❌ Failed to copy to clipboard. Please select and copy manually.');
        }
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    if (!AppState.apiKey) {
        showErrorMessage('🔑 Please configure your Gemini API key first!');
        showApiConfig();
        return;
    }

    // Validate required fields
    const requiredFields = ['address', 'city', 'state', 'zipCode', 'price', 'propertyType'];
    const formData = new FormData(event.target);
    
    for (const field of requiredFields) {
        if (!formData.get(field) || formData.get(field).trim() === '') {
            showErrorMessage(`❌ Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`);
            return;
        }
    }
    
    toggleLoadingState(true);
    hideMessages();

    const propertyData = gatherPropertyInfo();
    
    console.log('Starting listing generation for:', propertyData.address);

    // Clear previous results
    AppState.listings = [];
    ui.listingResults.innerHTML = '';
    updateStats();

    const startTime = performance.now();
    const errors = [];

    // Generate listings for all platforms
    const promises = CONFIG.PLATFORMS.map(platform => {
        const prompt = buildGeminiPrompt(propertyData, platform);
        return generateAIListing(prompt, platform, propertyData);
    });

    try {
        const results = await Promise.allSettled(promises);
        
        // Check for errors
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                errors.push(`${CONFIG.PLATFORMS[index].name}: ${result.reason}`);
            } else if (result.value && result.value.error) {
                errors.push(`${CONFIG.PLATFORMS[index].name}: ${result.value.error}`);
            }
        });
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        ui.generationTime.textContent = duration;

        // Show results
        ui.resultsSection.style.display = 'block';
        
        if (errors.length === 0) {
            showSuccessMessage('🎉 All listings generated successfully!');
        } else if (errors.length < CONFIG.PLATFORMS.length) {
            showSuccessMessage(`✅ ${CONFIG.PLATFORMS.length - errors.length} listings generated successfully! ${errors.length} had issues but demo versions were created.`);
        } else {
            showErrorMessage('⚠️ All listings are showing demo versions. Please check your API key and try again.');
        }
        
        // Smooth scroll to results
        setTimeout(() => {
            ui.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        
        console.log('Listing generation completed:', {
            successful: CONFIG.PLATFORMS.length - errors.length,
            errors: errors.length,
            duration: duration + 's'
        });
        
    } catch (error) {
        console.error('Unexpected error during listing generation:', error);
        showErrorMessage('❌ An unexpected error occurred. Please try again.');
    } finally {
        toggleLoadingState(false);
    }
}

// Make functions globally accessible for onclick handlers
window.showApiConfig = showApiConfig;
window.closeApiConfig = closeApiConfig;
window.saveApiConfig = saveApiConfig;
window.exportAllListings = exportAllListings;
window.clearForm = clearForm;
window.copyToClipboard = copyToClipboard;

// Add some utility functions for debugging
window.AppState = AppState;
window.CONFIG = CONFIG;

console.log('🚀 PropListAI JavaScript loaded successfully!');

// Add this function to your existing app.js file

function displayListing(platform, content) {
    const listingCard = document.createElement('div');
    listingCard.className = 'listing-card animate-fade-in-up';
    
    // Create a unique ID for this listing
    const listingId = `listing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get platform logo class
    const platformClass = platform.toLowerCase().replace(/\s+/g, '');
    
    listingCard.innerHTML = `
        <div class="listing-header">
            <div class="listing-title">
                <!-- Option 1: Platform name with logo (uncomment to use) -->
                <!-- <span class="listing-platform-logo ${platformClass}"></span> -->
                ${platform} Listing
            </div>
            <div class="listing-platform">${platform}</div>
        </div>
        <div class="listing-content" id="content-${listingId}">${content.replace(/\n/g, '<br>')}</div>
        <div class="listing-actions">
            <button class="btn-copy" onclick="copyToClipboard('${listingId}')">📋 Copy</button>
        </div>
    `;
    
    ui.listingResults.appendChild(listingCard);
    
    // Update stats
    AppState.listings.push({ platform, content });
    updateStats();
    
    console.log(`Listing displayed for ${platform}`);
}

// Function to dynamically change hero background
function setHeroBackground(imageName) {
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.backgroundImage = `
            linear-gradient(135deg, rgba(26, 32, 44, 0.8) 0%, rgba(45, 55, 72, 0.9) 100%),
            url('assets/${imageName}')
        `;
    }
}

// Function to preload images for better performance
function preloadImages() {
    const imagesToPreload = [
        'assets/hero-bg.jpg',
        'assets/luxury-home.jpg',
        'assets/modern-home.jpg',
        'assets/family-home.jpg',
        'assets/logo.png',
        'assets/logos/zillow-logo.png',
        'assets/logos/redfin-logo.png',
        'assets/logos/agent-logo.png'
    ];

    imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Call preload function when app initializes
document.addEventListener('DOMContentLoaded', function() {
    loadConfiguration();
    setupEventListeners();
    preloadImages(); // Add this line
    console.log('🏡 PropListAI initialized successfully!');
});