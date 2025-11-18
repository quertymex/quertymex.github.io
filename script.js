// ============================================
// TAB MANAGEMENT SYSTEM
// ============================================

// Tab state
let tabs = [];
let activeTabId = null;
const MAX_TABS = 20; // Maximum number of tabs allowed
let calculationMode = 'current'; // 'current' or 'target'

// Initialize tab system on page load
function initTabSystem() {
    // Load tabs from localStorage or create first tab
    const savedTabs = localStorage.getItem('stockTabs');
    if (savedTabs) {
        tabs = JSON.parse(savedTabs);
        activeTabId = localStorage.getItem('activeTabId') || tabs[0]?.id || null;
    }

    // If no tabs exist, create the first one
    if (tabs.length === 0) {
        addNewTab();
    } else {
        renderTabs();
        // Load the active tab's state
        if (activeTabId) {
            loadTabState(activeTabId);
        }
    }

    // Initialize calculation mode UI
    updateCalculationModeUI();
}

// Generate unique tab ID
function generateTabId() {
    return 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Add new tab
function addNewTab() {
    if (tabs.length >= MAX_TABS) {
        alert(`Maximum ${MAX_TABS} tabs allowed. Please close some tabs to add new ones.`);
        return;
    }

    // Save current tab state before creating new one
    if (activeTabId) {
        saveCurrentTabState();
    }

    const newTab = {
        id: generateTabId(),
        name: 'New Tab',
        stockSymbol: '',
        entryPrice: '',
        targetPrice: '',
        quantity: '',
        tpPercent: '',
        slPercent: '',
        autoPriceEnabled: false,
        calculationMode: 'current',
        createdAt: Date.now()
    };

    tabs.push(newTab);
    activeTabId = newTab.id;

    // Save and render
    saveTabsToStorage();
    renderTabs();

    // Clear the form for new tab
    clearCalculatorForm();
}

// Render all tabs
function renderTabs() {
    const tabsContainer = document.getElementById('tabsContainer');
    tabsContainer.innerHTML = '';

    tabs.forEach((tab, index) => {
        const tabElement = createTabElement(tab);
        tabsContainer.appendChild(tabElement);
    });
}

// Create tab element
function createTabElement(tab) {
    const tabDiv = document.createElement('div');
    tabDiv.className = `stock-tab tab-slide-in ${tab.id === activeTabId ? 'active' : ''}`;
    tabDiv.setAttribute('data-tab-id', tab.id);

    // Display stock symbol if available, otherwise show tab number
    const tabIndex = tabs.findIndex(t => t.id === tab.id) + 1;
    const displayName = tab.stockSymbol ? tab.stockSymbol.toUpperCase() : `Tab ${tabIndex}`;

    tabDiv.innerHTML = `
        <span class="tab-name" title="${displayName}">${displayName}</span>
        <button
            onclick="closeTab(event, '${tab.id}')"
            class="tab-close"
            title="Close tab"
        >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    `;

    // Add click handler to switch tabs
    tabDiv.addEventListener('click', (e) => {
        // Don't switch if clicking close button
        if (!e.target.closest('.tab-close')) {
            switchTab(tab.id);
        }
    });

    return tabDiv;
}

// Switch to a different tab
function switchTab(tabId) {
    if (tabId === activeTabId) return;

    // Save current tab state
    if (activeTabId) {
        saveCurrentTabState();
    }

    // Switch to new tab
    activeTabId = tabId;
    localStorage.setItem('activeTabId', activeTabId);

    // Update UI
    renderTabs();
    loadTabState(tabId);
}

// Close tab
function closeTab(event, tabId) {
    event.stopPropagation();

    // Don't allow closing the last tab
    if (tabs.length === 1) {
        alert('Cannot close the last tab. At least one tab must remain open.');
        return;
    }

    // Confirm before closing if tab has data
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.stockSymbol) {
        if (!confirm(`Close tab "${tab.stockSymbol.toUpperCase()}"?`)) {
            return;
        }
    }

    // Remove tab
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    tabs.splice(tabIndex, 1);

    // If we closed the active tab, switch to another
    if (tabId === activeTabId) {
        // Switch to the tab to the left, or the first tab if we closed the first tab
        const newActiveIndex = Math.max(0, tabIndex - 1);
        activeTabId = tabs[newActiveIndex].id;
        localStorage.setItem('activeTabId', activeTabId);
        loadTabState(activeTabId);
    }

    // Save and render
    saveTabsToStorage();
    renderTabs();
}

// Clear all tabs
function clearAllTabs() {
    // Confirm before clearing all tabs
    const tabCount = tabs.length;
    const hasData = tabs.some(tab => tab.stockSymbol || tab.entryPrice || tab.quantity);

    let confirmMessage = `Clear all ${tabCount} tab${tabCount > 1 ? 's' : ''}?`;
    if (hasData) {
        confirmMessage = `⚠️ This will delete all ${tabCount} tab${tabCount > 1 ? 's' : ''} and their data. This action cannot be undone.\n\nAre you sure?`;
    }

    if (!confirm(confirmMessage)) {
        return;
    }

    // Clear all tabs and create a fresh one
    tabs = [];
    activeTabId = null;

    // Clear localStorage
    localStorage.removeItem('stockTabs');
    localStorage.removeItem('activeTabId');

    // Create a fresh tab
    addNewTab();
}

// Save current tab state
function saveCurrentTabState() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    // Get current form values
    tab.stockSymbol = document.getElementById('stockSymbol').value.trim();
    tab.entryPrice = document.getElementById('entryPrice').value;
    tab.targetPrice = document.getElementById('targetPrice').value;
    tab.quantity = document.getElementById('quantity').value;
    tab.tpPercent = document.getElementById('tpPercent').value;
    tab.slPercent = document.getElementById('slPercent').value;
    tab.autoPriceEnabled = autoPriceEnabled;
    tab.calculationMode = calculationMode;

    // Update tab name in the UI
    saveTabsToStorage();
    renderTabs();
}

// Load tab state into form
function loadTabState(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Restore form values
    document.getElementById('stockSymbol').value = tab.stockSymbol || '';
    document.getElementById('entryPrice').value = tab.entryPrice || '';
    document.getElementById('targetPrice').value = tab.targetPrice || '';
    document.getElementById('quantity').value = tab.quantity || '';
    document.getElementById('tpPercent').value = tab.tpPercent || '';
    document.getElementById('slPercent').value = tab.slPercent || '';

    // Restore auto-price state
    if (tab.autoPriceEnabled !== autoPriceEnabled) {
        autoPriceEnabled = tab.autoPriceEnabled;
        updateAutoPriceUI();
    }

    // Restore calculation mode
    if (tab.calculationMode) {
        calculationMode = tab.calculationMode;
        updateCalculationModeUI();
    }

    // Recalculate if we have data
    if (tab.entryPrice && tab.quantity) {
        autoCalculate();
    } else {
        // Hide results if no data
        document.getElementById('results').classList.remove('result-active');
        document.getElementById('results').classList.add('result-inactive');
    }
}

// Clear calculator form
function clearCalculatorForm() {
    document.getElementById('tradeForm').reset();
    document.getElementById('results').classList.remove('result-active');
    document.getElementById('results').classList.add('result-inactive');

    // Clear errors
    document.querySelectorAll('[id$="Error"]').forEach(el => {
        el.classList.add('hidden');
        el.textContent = '';
    });

    // Reset auto-price if needed
    autoPriceEnabled = false;
    updateAutoPriceUI();
}

// Save tabs to localStorage
function saveTabsToStorage() {
    localStorage.setItem('stockTabs', JSON.stringify(tabs));
    localStorage.setItem('activeTabId', activeTabId);
}

// Update auto-price UI without triggering toggle
function updateAutoPriceUI() {
    const toggleBg = document.getElementById('toggleBg');
    const toggleDot = document.getElementById('toggleDot');
    const toggleText = document.getElementById('toggleText');
    const autoPriceToggle = document.getElementById('autoPriceToggle');

    if (autoPriceEnabled) {
        toggleBg.className = 'relative w-8 h-4 bg-trading-blue rounded-full transition-colors';
        toggleDot.className = 'absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform';
        toggleText.className = 'text-trading-blue';
        autoPriceToggle.className = 'flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-trading-blue transition-all';
    } else {
        toggleBg.className = 'relative w-8 h-4 bg-gray-600 rounded-full transition-colors';
        toggleDot.className = 'absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform';
        toggleText.className = 'text-gray-400';
        autoPriceToggle.className = 'flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-dark-border transition-all';
    }
}

// Listen to stock symbol changes to update tab name
document.addEventListener('DOMContentLoaded', function() {
    const stockSymbolInput = document.getElementById('stockSymbol');
    if (stockSymbolInput) {
        stockSymbolInput.addEventListener('input', function() {
            // Save current tab state which will update the tab name
            if (activeTabId) {
                saveCurrentTabState();
            }
        });
    }
});

// Initialize tabs when page loads
window.addEventListener('DOMContentLoaded', initTabSystem);

// ============================================
// THEME MANAGEMENT
// ============================================

// Theme management
function toggleTheme() {
    const body = document.body;
    const themeIconDark = document.getElementById('themeIconDark');
    const themeIconLight = document.getElementById('themeIconLight');

    body.classList.toggle('light-mode');

    if (body.classList.contains('light-mode')) {
        themeIconDark.classList.add('hidden');
        themeIconLight.classList.remove('hidden');
        localStorage.setItem('theme', 'light');
    } else {
        themeIconDark.classList.remove('hidden');
        themeIconLight.classList.add('hidden');
        localStorage.setItem('theme', 'dark');
    }
}

// Load saved theme on page load
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const themeIconDark = document.getElementById('themeIconDark');
    const themeIconLight = document.getElementById('themeIconLight');

    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        themeIconDark.classList.add('hidden');
        themeIconLight.classList.remove('hidden');
    }
}

// Load theme when page loads
window.addEventListener('DOMContentLoaded', loadTheme);

// ============================================
// CALCULATION MODE MANAGEMENT
// ============================================

// Set calculation mode (current or target price)
function setCalculationMode(mode) {
    calculationMode = mode;
    updateCalculationModeUI();

    // Save to current tab
    if (activeTabId) {
        saveCurrentTabState();
    }

    // Recalculate if we have data
    autoCalculate();
}

// Update calculation mode UI
function updateCalculationModeUI() {
    const currentBtn = document.getElementById('modeCurrentBtn');
    const targetBtn = document.getElementById('modeTargetBtn');

    if (calculationMode === 'current') {
        currentBtn.classList.remove('bg-dark-card', 'text-gray-400');
        currentBtn.classList.add('bg-trading-blue', 'text-white');
        targetBtn.classList.remove('bg-trading-blue', 'text-white');
        targetBtn.classList.add('bg-dark-card', 'text-gray-400');
    } else {
        targetBtn.classList.remove('bg-dark-card', 'text-gray-400');
        targetBtn.classList.add('bg-trading-blue', 'text-white');
        currentBtn.classList.remove('bg-trading-blue', 'text-white');
        currentBtn.classList.add('bg-dark-card', 'text-gray-400');
    }
}

// Toggle Trade Parameters collapsible section (for mobile)
function toggleTradeParams() {
    const content = document.getElementById('tradeParamsContent');
    const card = document.getElementById('tradeParamsCard');
    const chevronDown = document.getElementById('chevronDown');
    const chevronUp = document.getElementById('chevronUp');

    if (content.classList.contains('expanded')) {
        // Collapse it
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        card.classList.add('sticky-collapsed');
        chevronDown.classList.remove('hidden');
        chevronUp.classList.add('hidden');
    } else {
        // Expand it
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        card.classList.remove('sticky-collapsed');
        chevronDown.classList.add('hidden');
        chevronUp.classList.remove('hidden');
    }
}

// Numeric up/down functions for input fields
function incrementValue(fieldId, step) {
    const field = document.getElementById(fieldId);
    const currentValue = parseFloat(field.value) || 0;
    const minValue = parseFloat(field.min) || 0;

    // Round to avoid floating point issues
    const newValue = Math.round((currentValue + step) * 10) / 10;
    field.value = Math.max(newValue, minValue);

    // Trigger input event to auto-calculate
    field.dispatchEvent(new Event('input'));
}

function decrementValue(fieldId, step) {
    const field = document.getElementById(fieldId);
    const currentValue = parseFloat(field.value) || 0;
    const minValue = parseFloat(field.min) || 0;

    // Round to avoid floating point issues
    const newValue = Math.round((currentValue - step) * 10) / 10;
    field.value = Math.max(newValue, minValue);

    // Trigger input event to auto-calculate
    field.dispatchEvent(new Event('input'));
}

// Currency state
let USD_TO_MYR = 4.50; // Default fallback rate
let isLoadingRate = false;

// Fetch real-time exchange rate on page load
async function fetchExchangeRate() {
    if (isLoadingRate) return; // Prevent multiple simultaneous requests

    try {
        isLoadingRate = true;
        updateRateDisplay('Loading...');

        // Add spin animation to refresh icon
        const refreshIcon = document.getElementById('refreshIcon');
        if (refreshIcon) refreshIcon.classList.add('spin');

        // Using exchangerate-api.com (free tier)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();

        if (data && data.rates && data.rates.MYR) {
            USD_TO_MYR = data.rates.MYR;
            updateRateDisplay(`${USD_TO_MYR.toFixed(4)} MYR`);
            console.log('Exchange rate updated:', USD_TO_MYR);

            // If results are visible, recalculate to update MYR values
            const results = document.getElementById('results');
            if (results.classList.contains('result-active')) {
                autoCalculate();
            }
        } else {
            throw new Error('Invalid response');
        }
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        updateRateDisplay(`${USD_TO_MYR.toFixed(2)} MYR (Offline)`);
    } finally {
        isLoadingRate = false;

        // Remove spin animation
        const refreshIcon = document.getElementById('refreshIcon');
        if (refreshIcon) refreshIcon.classList.remove('spin');
    }
}

function updateRateDisplay(rateText, showTimestamp = true) {
    const rateElement = document.getElementById('exchangeRate');
    if (rateElement) {
        rateElement.innerHTML = `<span class="text-trading-blue">${rateText}</span>`;
    }

    if (showTimestamp && !rateText.includes('Loading')) {
        const timestampElement = document.getElementById('rateTimestamp');
        if (timestampElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            timestampElement.textContent = `Updated: ${timeString}`;
        }
    }
}

// Fetch rate when page loads
window.addEventListener('DOMContentLoaded', fetchExchangeRate);

// Market hours functionality (US Market: 9:30 AM - 4:00 PM EST)
function updateMarketStatus() {
    const now = new Date();

    // Get time parts in America/New_York timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const parts = formatter.formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour').value);
    const minutes = parseInt(parts.find(p => p.type === 'minute').value);
    const seconds = parseInt(parts.find(p => p.type === 'second').value);
    const weekday = parts.find(p => p.type === 'weekday').value;

    // Convert weekday to day number (0 = Sunday, 6 = Saturday)
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const day = dayMap[weekday];

    // Current time in minutes since midnight
    const currentMinutes = hours * 60 + minutes;

    // Market hours: 9:30 AM (570 minutes) to 4:00 PM (960 minutes)
    const marketOpen = 9 * 60 + 30; // 9:30 AM = 570 minutes
    const marketClose = 16 * 60; // 4:00 PM = 960 minutes

    const statusDot = document.getElementById('marketStatusDot');
    const statusText = document.getElementById('marketStatus');
    const timeText = document.getElementById('marketTime');
    const countdownText = document.getElementById('marketCountdown');

    // Determine if DST is in effect (EST or EDT)
    // Check month to determine timezone (DST is roughly March-November)
    const month = parseInt(parts.find(p => p.type === 'month').value);
    const isDST = month >= 3 && month <= 11;
    const timezone = isDST ? 'EDT' : 'EST';

    // Check if weekend
    if (day === 0 || day === 6) {
        statusDot.className = 'w-2 h-2 rounded-full bg-gray-500';
        statusText.textContent = 'CLOSED';
        statusText.className = 'text-sm font-semibold text-gray-400';
        timeText.textContent = `Weekend - Market opens Monday 9:30 AM ${timezone}`;
        countdownText.textContent = '';
        return;
    }

    // Format current EST time in 12-hour format
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'America/New_York'
    });

    const fullTimeString = `${timeString} ${timezone}`;

    if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
        // Market is OPEN
        statusDot.className = 'w-2 h-2 rounded-full bg-trading-up animate-pulse';
        statusText.textContent = 'OPEN';
        statusText.className = 'text-sm font-semibold text-trading-up';
        timeText.textContent = fullTimeString;

        // Calculate time until market close
        const minutesUntilClose = marketClose - currentMinutes;
        const hoursLeft = Math.floor(minutesUntilClose / 60);
        const minutesLeft = minutesUntilClose % 60;
        const secondsLeft = 60 - seconds;

        countdownText.textContent = `Closes in ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`;
        countdownText.className = 'mt-2 text-sm font-bold text-trading-up';
    } else {
        // Market is CLOSED
        statusDot.className = 'w-2 h-2 rounded-full bg-trading-down';
        statusText.textContent = 'CLOSED';
        statusText.className = 'text-sm font-semibold text-trading-down';
        timeText.textContent = fullTimeString;

        let nextOpen;
        if (currentMinutes < marketOpen) {
            // Before market opens today
            nextOpen = marketOpen - currentMinutes;
            const hoursUntil = Math.floor(nextOpen / 60);
            const minutesUntil = nextOpen % 60;
            const secondsUntil = 60 - seconds;

            countdownText.textContent = `Opens in ${hoursUntil}h ${minutesUntil}m ${secondsUntil}s`;
        } else {
            // After market closes, calculate time until next day
            const minutesUntilMidnight = (24 * 60) - currentMinutes;
            const minutesUntilOpen = minutesUntilMidnight + marketOpen;

            const hoursUntil = Math.floor(minutesUntilOpen / 60);
            const minutesUntil = minutesUntilOpen % 60;
            const secondsUntil = 60 - seconds;

            // Check if tomorrow is Saturday
            if (day === 5) { // Friday
                countdownText.textContent = `Opens Monday 9:30 AM ${timezone}`;
            } else {
                countdownText.textContent = `Opens in ${hoursUntil}h ${minutesUntil}m ${secondsUntil}s`;
            }
        }
        countdownText.className = 'mt-2 text-sm font-bold text-gray-400';
    }
}

// Update market status immediately and then every second
updateMarketStatus();
setInterval(updateMarketStatus, 1000);

function calculateTradeLevels() {

    // Get input values
    const currentPrice = parseFloat(document.getElementById('entryPrice').value);
    const targetPrice = parseFloat(document.getElementById('targetPrice').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    const tpPercent = parseFloat(document.getElementById('tpPercent').value);
    const slPercent = parseFloat(document.getElementById('slPercent').value);

    // Determine which price to use for calculations based on mode
    const basePrice = calculationMode === 'target' ? targetPrice : currentPrice;

    // Validation
    let isValid = true;
    const errors = {
        entry: '',
        target: '',
        quantity: '',
        tp: '',
        sl: ''
    };

    if (!currentPrice || currentPrice <= 0) {
        errors.entry = 'Current price must be greater than 0';
        isValid = false;
    }

    if (calculationMode === 'target' && (!targetPrice || targetPrice <= 0)) {
        errors.target = 'Target price must be greater than 0';
        isValid = false;
    }

    if (!quantity || quantity <= 0) {
        errors.quantity = 'Quantity must be greater than 0';
        isValid = false;
    }

    if (isNaN(tpPercent) || tpPercent < 0) {
        errors.tp = 'TP must be 0 or greater';
        isValid = false;
    }

    if (isNaN(slPercent) || slPercent < 0) {
        errors.sl = 'SL must be 0 or greater';
        isValid = false;
    }

    // Display errors
    for (const [field, error] of Object.entries(errors)) {
        const errorElement = document.getElementById(field + 'Error');
        if (error) {
            errorElement.textContent = error;
            errorElement.classList.remove('hidden');
        } else {
            errorElement.classList.add('hidden');
        }
    }

    if (!isValid) return;

    // Calculate prices based on selected mode
    const tpPrice = basePrice * (1 + tpPercent / 100);
    const slPrice = basePrice * (1 - slPercent / 100);

    // Calculate amounts using base price (current or target based on mode)
    const investment = basePrice * quantity;
    const maxProfit = (tpPrice - basePrice) * quantity;
    const maxLoss = (basePrice - slPrice) * quantity;
    const perShareTP = tpPrice - basePrice;
    const perShareSL = basePrice - slPrice;

    // Calculate risk/reward ratio
    const ratio = (maxProfit / maxLoss).toFixed(1);

    // Update display with USD values
    document.getElementById('resultEntry').textContent = '$' + basePrice.toFixed(2);
    document.getElementById('resultInvestment').textContent = '$' + investment.toFixed(2);
    document.getElementById('resultTP').textContent = '$' + tpPrice.toFixed(2);
    document.getElementById('resultSL').textContent = '$' + slPrice.toFixed(2);
    document.getElementById('maxProfit').textContent = '+$' + maxProfit.toFixed(2);
    document.getElementById('maxLoss').textContent = '-$' + maxLoss.toFixed(2);
    document.getElementById('perShareTPDisplay').textContent = '+$' + perShareTP.toFixed(2);
    document.getElementById('perShareSLDisplay').textContent = '-$' + perShareSL.toFixed(2);
    document.getElementById('riskReward').textContent = '1:' + ratio;

    // Update display with MYR values
    document.getElementById('resultEntryMYR').textContent = 'RM ' + (basePrice * USD_TO_MYR).toFixed(2);
    document.getElementById('resultInvestmentMYR').textContent = 'RM ' + (investment * USD_TO_MYR).toFixed(2);
    document.getElementById('resultTPMYR').textContent = 'RM ' + (tpPrice * USD_TO_MYR).toFixed(2);
    document.getElementById('resultSLMYR').textContent = 'RM ' + (slPrice * USD_TO_MYR).toFixed(2);
    document.getElementById('maxProfitMYR').textContent = '+RM ' + (maxProfit * USD_TO_MYR).toFixed(2);
    document.getElementById('maxLossMYR').textContent = '-RM ' + (maxLoss * USD_TO_MYR).toFixed(2);

    // Show results with animation
    document.getElementById('results').classList.remove('result-inactive');
    document.getElementById('results').classList.add('result-active');
}

function resetCalculator() {
    document.getElementById('tradeForm').reset();
    document.getElementById('results').classList.remove('result-active');
    document.getElementById('results').classList.add('result-inactive');

    // Clear errors
    document.querySelectorAll('[id$="Error"]').forEach(el => {
        el.classList.add('hidden');
        el.textContent = '';
    });
}

function showSuccessMessage() {
    const message = document.getElementById('successMessage');
    message.classList.remove('hidden');
    setTimeout(() => {
        message.classList.add('hidden');
    }, 2000);
}

function exportTradeCard() {
    // Check if results are available
    const results = document.getElementById('results');
    if (!results.classList.contains('result-active')) {
        alert('Please calculate trade levels first before exporting.');
        return;
    }

    // Get values from the form
    const stockSymbol = document.getElementById('stockSymbol').value.trim();
    const entryPrice = parseFloat(document.getElementById('entryPrice').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    const tpPercent = parseFloat(document.getElementById('tpPercent').value);
    const slPercent = parseFloat(document.getElementById('slPercent').value);

    // Calculate values
    const tpPrice = entryPrice * (1 + tpPercent / 100);
    const slPrice = entryPrice * (1 - slPercent / 100);
    const investment = entryPrice * quantity;
    const maxProfit = (tpPrice - entryPrice) * quantity;
    const maxLoss = (entryPrice - slPrice) * quantity;
    const ratio = (maxProfit / maxLoss).toFixed(1);

    // Calculate MYR values
    const entryMYR = entryPrice * USD_TO_MYR;
    const tpMYR = tpPrice * USD_TO_MYR;
    const slMYR = slPrice * USD_TO_MYR;
    const investmentMYR = investment * USD_TO_MYR;
    const maxProfitMYR = maxProfit * USD_TO_MYR;
    const maxLossMYR = maxLoss * USD_TO_MYR;

    // Determine if risk/reward is good (ratio >= 2)
    const ratioEmoji = parseFloat(ratio) >= 2 ? '✅' : '⚠️';

    // Get current date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Build title with stock symbol if provided
    const title = stockSymbol ? `📊 ${stockSymbol.toUpperCase()} TRADE SETUP` : '📊 TRADE SETUP';

    // Generate the trade card in a clean format with both currencies
    const tradeCard = `
═══════════════
${title}
═══════════════
📅 ${dateStr} • ${timeStr}
💰 Entry Price: $${entryPrice.toFixed(2)} (RM ${entryMYR.toFixed(2)})
📦 Quantity: ${quantity} shares
💵 Total Cost: $${investment.toFixed(2)} (RM ${investmentMYR.toFixed(2)})
═══════════════
🎯 TAKE PROFIT: $${tpPrice.toFixed(2)} (RM ${tpMYR.toFixed(2)})
   ↗️ +${tpPercent}% gain = +$${maxProfit.toFixed(2)} (+RM ${maxProfitMYR.toFixed(2)})
🛑 STOP LOSS: $${slPrice.toFixed(2)} (RM ${slMYR.toFixed(2)})
   ↘️ -${slPercent}% loss = -$${maxLoss.toFixed(2)} (-RM ${maxLossMYR.toFixed(2)})
═══════════════
Risk/Reward Ratio: 1:${ratio}
`.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(tradeCard).then(() => {
        showSuccessMessage();
    }).catch(err => {
        console.error('Failed to copy trade card:', err);
        alert('Failed to copy to clipboard. Please try again.');
    });
}

// Auto-calculate on input change
function autoCalculate() {
    const currentPrice = parseFloat(document.getElementById('entryPrice').value);
    const targetPrice = parseFloat(document.getElementById('targetPrice').value);
    const quantity = parseInt(document.getElementById('quantity').value);

    // Only auto-calculate if we have at least the required price and quantity
    if (currentPrice && currentPrice > 0 && quantity && quantity > 0) {
        // In target mode, also need target price
        if (calculationMode === 'target' && (!targetPrice || targetPrice <= 0)) {
            return;
        }
        calculateTradeLevels();
    }
}

// Add event listeners to all input fields
document.getElementById('entryPrice').addEventListener('input', autoCalculate);
document.getElementById('targetPrice').addEventListener('input', autoCalculate);
document.getElementById('quantity').addEventListener('input', autoCalculate);
document.getElementById('tpPercent').addEventListener('input', autoCalculate);
document.getElementById('slPercent').addEventListener('input', autoCalculate);

// Clear error on input
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', function() {
        const fieldName = this.id;
        const errorElement = document.getElementById(fieldName.replace('Price', '').replace('Percent', '') + 'Error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    });
});

// Auto-Price Toggle Functionality
let autoPriceEnabled = false;
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

function toggleAutoPrice() {
    autoPriceEnabled = !autoPriceEnabled;

    const toggleBg = document.getElementById('toggleBg');
    const toggleDot = document.getElementById('toggleDot');
    const toggleText = document.getElementById('toggleText');
    const autoPriceToggle = document.getElementById('autoPriceToggle');

    if (autoPriceEnabled) {
        // Enable auto-price
        toggleBg.className = 'relative w-8 h-4 bg-trading-blue rounded-full transition-colors';
        toggleDot.className = 'absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform';
        toggleText.className = 'text-trading-blue';
        autoPriceToggle.className = 'flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-trading-blue transition-all';

        // Fetch price if stock symbol is entered
        const stockSymbol = document.getElementById('stockSymbol').value.trim();
        if (stockSymbol) {
            fetchStockPrice(stockSymbol);
        }
    } else {
        // Disable auto-price
        toggleBg.className = 'relative w-8 h-4 bg-gray-600 rounded-full transition-colors';
        toggleDot.className = 'absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform';
        toggleText.className = 'text-gray-400';
        autoPriceToggle.className = 'flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-dark-border transition-all';
    }

    // Save state to current tab
    if (activeTabId) {
        saveCurrentTabState();
    }
}

// Note: loadAutoPriceState removed - now handled per-tab in loadTabState()

// Fetch stock price using free APIs
async function fetchStockPrice(symbol) {
    if (!symbol || !autoPriceEnabled) return;

    const upperSymbol = symbol.toUpperCase();
    const entryPriceInput = document.getElementById('entryPrice');

    // Check cache first
    const cachedData = getCachedPrice(upperSymbol);
    if (cachedData) {
        console.log('Using cached price for', upperSymbol, ':', cachedData.price);
        entryPriceInput.value = cachedData.price.toFixed(2);
        entryPriceInput.dispatchEvent(new Event('input'));
        return;
    }

    try {
        // Show loading state
        entryPriceInput.placeholder = 'Fetching price...';

        let currentPrice = null;

        // Method 1: Try Yahoo Finance via CORS proxy
        try {
            const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${upperSymbol}`;
            const corsProxy = 'https://api.allorigins.win/raw?url=';
            const response1 = await fetch(corsProxy + encodeURIComponent(yahooUrl));

            if (response1.ok) {
                const data1 = await response1.json();
                if (data1.chart && data1.chart.result && data1.chart.result[0]) {
                    const result = data1.chart.result[0];
                    const meta = result.meta;
                    if (meta.regularMarketPrice) {
                        currentPrice = meta.regularMarketPrice;
                        console.log('Fetched from Yahoo Finance:', currentPrice);
                    }
                }
            }
        } catch (e) {
            console.log('Yahoo Finance failed, trying alternative...', e);
        }

        // Method 2: Try Finnhub API (free tier with demo key)
        if (!currentPrice) {
            try {
                // Get a free API key at https://finnhub.io (60 calls/minute free)
                const finnhubKey = 'ctguukhr01ql2bu46te0ctguukhr01ql2bu46teg'; // Demo key
                const response2 = await fetch(`https://finnhub.io/api/v1/quote?symbol=${upperSymbol}&token=${finnhubKey}`);

                if (response2.ok) {
                    const data2 = await response2.json();
                    if (data2.c && data2.c > 0) {
                        currentPrice = data2.c; // Current price
                        console.log('Fetched from Finnhub:', currentPrice);
                    }
                }
            } catch (e) {
                console.log('Finnhub failed, trying alternative...', e);
            }
        }

        // Method 3: Try Twelve Data API
        if (!currentPrice) {
            try {
                const response3 = await fetch(`https://api.twelvedata.com/price?symbol=${upperSymbol}&apikey=demo`);

                if (response3.ok) {
                    const data3 = await response3.json();
                    if (data3.price && !isNaN(parseFloat(data3.price))) {
                        currentPrice = parseFloat(data3.price);
                        console.log('Fetched from Twelve Data:', currentPrice);
                    }
                }
            } catch (e) {
                console.log('Twelve Data failed', e);
            }
        }

        if (currentPrice && !isNaN(currentPrice) && currentPrice > 0) {
            // Cache the price
            cachePrice(upperSymbol, currentPrice);

            // Update entry price
            entryPriceInput.value = currentPrice.toFixed(2);
            entryPriceInput.placeholder = '0.00';

            // Trigger auto-calculation
            entryPriceInput.dispatchEvent(new Event('input'));

            console.log(`✓ Successfully fetched price for ${upperSymbol}: $${currentPrice.toFixed(2)}`);
        } else {
            throw new Error('Unable to fetch price from any source');
        }
    } catch (error) {
        console.error('Error fetching stock price:', error);
        entryPriceInput.placeholder = 'Enter manually';

        // Show user-friendly message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'text-xs text-trading-down mt-1';
        errorMsg.textContent = 'Auto-fetch unavailable. Please enter price manually.';
        errorMsg.id = 'priceFetchError';

        const existingError = document.getElementById('priceFetchError');
        if (existingError) existingError.remove();

        entryPriceInput.parentElement.parentElement.appendChild(errorMsg);

        // Reset placeholder after 3 seconds
        setTimeout(() => {
            entryPriceInput.placeholder = '0.00';
            const err = document.getElementById('priceFetchError');
            if (err) err.remove();
        }, 3000);
    }
}

// Cache management
function getCachedPrice(symbol) {
    const cacheKey = `stockPrice_${symbol}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still valid
        if (now - data.timestamp < PRICE_CACHE_DURATION) {
            return data;
        } else {
            // Remove expired cache
            localStorage.removeItem(cacheKey);
        }
    }

    return null;
}

function cachePrice(symbol, price) {
    const cacheKey = `stockPrice_${symbol}`;
    const data = {
        symbol: symbol,
        price: price,
        timestamp: Date.now()
    };

    localStorage.setItem(cacheKey, JSON.stringify(data));
}

// Listen for stock symbol changes
document.getElementById('stockSymbol').addEventListener('input', function() {
    const symbol = this.value.trim();
    const entryPriceInput = document.getElementById('entryPrice');

    // Debounce the API call
    clearTimeout(this.debounceTimer);

    // Clear entry price when symbol changes (if auto-price is on)
    if (autoPriceEnabled && !symbol) {
        entryPriceInput.value = '';
        entryPriceInput.placeholder = '0.00';
    }

    // Fetch new price if symbol is entered and auto-price is enabled
    if (symbol && autoPriceEnabled) {
        this.debounceTimer = setTimeout(() => {
            fetchStockPrice(symbol);
        }, 500); // Wait 500ms after user stops typing
    }
});

// Note: Auto-price state is now loaded per-tab via initTabSystem() and loadTabState()
