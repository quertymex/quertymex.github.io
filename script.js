// ============================================
// TAB MANAGEMENT SYSTEM
// ============================================

// Tab state
let tabs = [];
let activeTabId = null;
const MAX_TABS = 20; // Maximum number of tabs allowed
let calculationMode = 'current'; // 'current' or 'target'

// Drag and drop state
let draggedTabId = null;
let draggedOverTabId = null;

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

    // Immediately fetch prices for all tabs with auto-price enabled on page load
    checkAutoFetchInterval();

    // Clean up any orphaned cache entries
    setTimeout(() => {
        cleanupOrphanedCache();
    }, 1000); // Delay to ensure tabs are fully loaded
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
    tabDiv.setAttribute('draggable', 'true');

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

    // Add drag event handlers
    tabDiv.addEventListener('dragstart', handleDragStart);
    tabDiv.addEventListener('dragover', handleDragOver);
    tabDiv.addEventListener('drop', handleDrop);
    tabDiv.addEventListener('dragenter', handleDragEnter);
    tabDiv.addEventListener('dragleave', handleDragLeave);
    tabDiv.addEventListener('dragend', handleDragEnd);

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

    // Check and restart auto-fetch interval for the new active tab
    checkAutoFetchInterval();
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

    // Clean up cached price data for this tab's stock symbol
    if (tab && tab.stockSymbol) {
        const cacheKey = `stockPrice_${tab.stockSymbol.toUpperCase()}`;
        localStorage.removeItem(cacheKey);
        console.log(`Removed cached price data for ${tab.stockSymbol.toUpperCase()}`);
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

    // Check if we need to stop auto-fetch interval (if no tabs have auto-price)
    checkAutoFetchInterval();
}

// ============================================
// TAB DRAG AND DROP HANDLERS
// ============================================

function handleDragStart(e) {
    const tabElement = e.target.closest('.stock-tab');
    if (!tabElement) return;

    draggedTabId = tabElement.getAttribute('data-tab-id');
    tabElement.classList.add('dragging');

    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', tabElement.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault(); // Necessary to allow drop
    }

    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    const tabElement = e.target.closest('.stock-tab');
    if (!tabElement) return;

    const tabId = tabElement.getAttribute('data-tab-id');

    // Don't add class to the dragged element itself
    if (tabId !== draggedTabId) {
        tabElement.classList.add('drag-over');
        draggedOverTabId = tabId;
    }
}

function handleDragLeave(e) {
    const tabElement = e.target.closest('.stock-tab');
    if (!tabElement) return;

    tabElement.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation(); // Stops some browsers from redirecting
    }

    const dropTarget = e.target.closest('.stock-tab');
    if (!dropTarget) return;

    const dropTabId = dropTarget.getAttribute('data-tab-id');

    // Don't do anything if dropping on itself
    if (draggedTabId !== dropTabId) {
        // Reorder tabs
        reorderTabs(draggedTabId, dropTabId);
    }

    return false;
}

function handleDragEnd(e) {
    const tabElement = e.target.closest('.stock-tab');
    if (tabElement) {
        tabElement.classList.remove('dragging');
    }

    // Remove drag-over class from all tabs
    document.querySelectorAll('.stock-tab').forEach(tab => {
        tab.classList.remove('drag-over');
    });

    draggedTabId = null;
    draggedOverTabId = null;
}

function reorderTabs(draggedId, dropTargetId) {
    // Find indices
    const draggedIndex = tabs.findIndex(t => t.id === draggedId);
    const dropIndex = tabs.findIndex(t => t.id === dropTargetId);

    if (draggedIndex === -1 || dropIndex === -1) return;

    // Remove dragged tab from its position
    const [draggedTab] = tabs.splice(draggedIndex, 1);

    // Insert it at the new position
    tabs.splice(dropIndex, 0, draggedTab);

    // Save and re-render
    saveTabsToStorage();
    renderTabs();

    console.log('Tabs reordered');
}

// ============================================
// TAB KEYBOARD NAVIGATION
// ============================================

// Switch to next tab (right arrow)
function switchToNextTab() {
    if (tabs.length <= 1) return;

    const currentIndex = tabs.findIndex(t => t.id === activeTabId);
    if (currentIndex === -1) return;

    // Move to next tab, or wrap to first tab
    const nextIndex = (currentIndex + 1) % tabs.length;
    const nextTabId = tabs[nextIndex].id;

    switchTab(nextTabId);
}

// Switch to previous tab (left arrow)
function switchToPrevTab() {
    if (tabs.length <= 1) return;

    const currentIndex = tabs.findIndex(t => t.id === activeTabId);
    if (currentIndex === -1) return;

    // Move to previous tab, or wrap to last tab
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    const prevTabId = tabs[prevIndex].id;

    switchTab(prevTabId);
}

// Add keyboard event listener for arrow key navigation
document.addEventListener('keydown', function (e) {
    // Only handle arrow keys when not typing in an input field
    const activeElement = document.activeElement;
    const isInputFocused = activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable;

    // If user is typing, don't intercept arrow keys
    if (isInputFocused) return;

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        switchToNextTab();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        switchToPrevTab();
    }
});

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

    // Clean up all cached price data for all tabs
    tabs.forEach(tab => {
        if (tab.stockSymbol) {
            const cacheKey = `stockPrice_${tab.stockSymbol.toUpperCase()}`;
            localStorage.removeItem(cacheKey);
        }
    });
    console.log('Cleared all cached price data');

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
let isLoadingTabState = false; // Flag to prevent saving during load
let saveDebounceTimer = null; // Debounce timer for saving

function saveCurrentTabState() {
    // Don't save if we're currently loading tab state
    if (isLoadingTabState) {
        return;
    }

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

// Debounced version of saveCurrentTabState for input events
function debouncedSaveTabState() {
    // Don't save if we're currently loading tab state
    if (isLoadingTabState) {
        return;
    }

    // Clear existing timer
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }

    // Set new timer to save after 300ms of no activity
    saveDebounceTimer = setTimeout(() => {
        saveCurrentTabState();
    }, 300);
}

// Load tab state into form
function loadTabState(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Set flag to prevent saving during load
    isLoadingTabState = true;

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

    // Clear the loading flag after a short delay to ensure all events have processed
    setTimeout(() => {
        isLoadingTabState = false;
    }, 100);
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
document.addEventListener('DOMContentLoaded', function () {
    const stockSymbolInput = document.getElementById('stockSymbol');
    if (stockSymbolInput) {
        stockSymbolInput.addEventListener('input', function () {
            // Use debounced save to prevent race conditions during load
            if (activeTabId) {
                debouncedSaveTabState();
                // Check if we need to start auto-fetch interval
                checkAutoFetchInterval();
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
   📌 Set Limit (BUY)
📦 Quantity: ${quantity} shares
💵 Total Cost: $${investment.toFixed(2)} (RM ${investmentMYR.toFixed(2)})
═══════════════
🎯 TAKE PROFIT: $${tpPrice.toFixed(2)} (RM ${tpMYR.toFixed(2)})
   📌 Limit if Touched (TP)
   ↗️ +${tpPercent}% gain = +$${maxProfit.toFixed(2)} (+RM ${maxProfitMYR.toFixed(2)})
🛑 STOP LOSS: $${slPrice.toFixed(2)} (RM ${slMYR.toFixed(2)})
   📌 Stop Limit (SL)
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

// Calculate and display price difference percentage
function calculatePriceDifference() {
    const currentPrice = parseFloat(document.getElementById('entryPrice').value);
    const targetPrice = parseFloat(document.getElementById('targetPrice').value);

    const priceDiffElement = document.getElementById('priceDifference');
    const percentChangeElement = document.getElementById('percentChange');
    const arrowIcon = document.getElementById('arrowIcon');

    // Hide if either price is missing or invalid
    if (!currentPrice || currentPrice <= 0 || !targetPrice || targetPrice <= 0) {
        priceDiffElement.classList.add('hidden');
        return;
    }

    // Calculate percentage difference: ((current - target) / target) * 100
    // Positive = current is above target, Negative = current is below target
    const percentDiff = ((currentPrice - targetPrice) / targetPrice) * 100;
    const isPositive = percentDiff >= 0;

    // Update the percentage text
    const sign = isPositive ? '+' : '';
    percentChangeElement.textContent = `${sign}${percentDiff.toFixed(2)}%`;

    // Update colors and arrow direction
    if (isPositive) {
        // Positive change (green/up) - current is above target
        priceDiffElement.className = 'mt-2 text-xs font-semibold flex items-center gap-1 text-trading-up';
        // Up arrow
        arrowIcon.setAttribute('d', 'M5 10l7-7m0 0l7 7m-7-7v18');
    } else {
        // Negative change (red/down) - current is below target
        priceDiffElement.className = 'mt-2 text-xs font-semibold flex items-center gap-1 text-trading-down';
        // Down arrow
        arrowIcon.setAttribute('d', 'M19 14l-7 7m0 0l-7-7m7 7V3');
    }

    // Show the element
    priceDiffElement.classList.remove('hidden');
}

// Auto-calculate on input change
function autoCalculate() {
    const currentPrice = parseFloat(document.getElementById('entryPrice').value);
    const targetPrice = parseFloat(document.getElementById('targetPrice').value);
    const quantity = parseInt(document.getElementById('quantity').value);

    // Calculate price difference percentage
    calculatePriceDifference();

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
document.getElementById('entryPrice').addEventListener('input', function () {
    autoCalculate();
    debouncedSaveTabState();
});
document.getElementById('targetPrice').addEventListener('input', function () {
    autoCalculate();
    debouncedSaveTabState();
});
document.getElementById('quantity').addEventListener('input', function () {
    autoCalculate();
    debouncedSaveTabState();
});
document.getElementById('tpPercent').addEventListener('input', function () {
    autoCalculate();
    debouncedSaveTabState();
});
document.getElementById('slPercent').addEventListener('input', function () {
    autoCalculate();
    debouncedSaveTabState();
});

// Clear error on input
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', function () {
        const fieldName = this.id;
        const errorElement = document.getElementById(fieldName.replace('Price', '').replace('Percent', '') + 'Error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    });
});

// Auto-Price Toggle Functionality
let autoPriceEnabled = false;
const PRICE_CACHE_DURATION = 1 * 60 * 1000; // 1 minute in milliseconds
const AUTO_FETCH_INTERVAL = 1 * 60 * 1000; // Fetch every 1 minute for active tab only

// Global interval for auto-fetching price (active tab only)
let autoFetchIntervalId = null;

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

    // Check if we need to start/stop the auto-fetch interval
    checkAutoFetchInterval();
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
        updatePriceChangeDisplay(cachedData.percentChange);
        updateMarketPricesDisplay(cachedData.previousClose, cachedData.openPrice, cachedData.dayHigh, cachedData.dayLow, cachedData.volume, cachedData.week52High, cachedData.week52Low);
        entryPriceInput.dispatchEvent(new Event('input'));
        return;
    }

    try {
        // Show loading state
        entryPriceInput.placeholder = 'Fetching price...';

        let currentPrice = null;
        let percentChange = null;
        let previousClose = null;
        let openPrice = null;
        let dayHigh = null;
        let dayLow = null;
        let volume = null;
        let week52High = null;
        let week52Low = null;

        // Fetch from Finnhub API
        try {
            const finnhubKey = 'd4eu0qhr01ql649g4o0gd4eu0qhr01ql649g4o10'; // Your API key
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${upperSymbol}&token=${finnhubKey}`);

            if (response.ok) {
                const data = await response.json();
                if (data.c && data.c > 0) {
                    currentPrice = data.c; // Current price
                    percentChange = data.dp; // Percent change
                    previousClose = data.pc; // Previous close
                    openPrice = data.o; // Open price
                    dayHigh = data.h; // Day high
                    dayLow = data.l; // Day low
                    volume = data.v; // Volume
                    week52High = data.w52h || null; // 52-week high (if available)
                    week52Low = data.w52l || null; // 52-week low (if available)
                    console.log('Fetched from Finnhub:', {
                        current: currentPrice,
                        change: `${percentChange}%`,
                        prevClose: previousClose,
                        open: openPrice,
                        high: dayHigh,
                        low: dayLow,
                        volume: volume
                    });
                }
            }
        } catch (e) {
            console.log('Finnhub API error:', e);
        }

        if (currentPrice && !isNaN(currentPrice) && currentPrice > 0) {
            // Cache the price with all data
            cachePrice(upperSymbol, currentPrice, percentChange, previousClose, openPrice, dayHigh, dayLow, volume, week52High, week52Low);

            // Update entry price
            entryPriceInput.value = currentPrice.toFixed(2);
            entryPriceInput.placeholder = '0.00';

            // Update percent change display
            updatePriceChangeDisplay(percentChange);

            // Update market prices display with all data
            updateMarketPricesDisplay(previousClose, openPrice, dayHigh, dayLow, volume, week52High, week52Low);

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

// Update price change percentage display
function updatePriceChangeDisplay(percentChange) {
    const priceChangeContainer = document.getElementById('priceChangeContainer');
    const priceChangeElement = document.getElementById('priceChangePercent');

    if (percentChange !== null && !isNaN(percentChange)) {
        const sign = percentChange >= 0 ? '+' : '';
        priceChangeElement.textContent = `${sign}${percentChange.toFixed(2)}%`;

        // Set color based on positive/negative
        if (percentChange >= 0) {
            priceChangeElement.className = 'text-xs font-semibold text-trading-up';
        } else {
            priceChangeElement.className = 'text-xs font-semibold text-trading-down';
        }

        // Show the container
        priceChangeContainer.classList.remove('hidden');
        priceChangeContainer.classList.add('flex');
    } else {
        // Hide the container
        priceChangeContainer.classList.remove('flex');
        priceChangeContainer.classList.add('hidden');
    }
}

// Update market prices display (previous close & today open) with percentages
function updateMarketPricesDisplay(previousClose, openPrice, dayHigh, dayLow, volume, week52High, week52Low) {
    const marketPricesInfoIcon = document.getElementById('marketPricesInfoIcon');
    const prevClosePriceElement = document.getElementById('prevClosePrice');
    const prevClosePercentElement = document.getElementById('prevClosePercent');
    const todayOpenPriceElement = document.getElementById('todayOpenPrice');
    const todayOpenPercentElement = document.getElementById('todayOpenPercent');
    const dayHighPriceElement = document.getElementById('dayHighPrice');
    const dayHighPercentElement = document.getElementById('dayHighPercent');
    const dayLowPriceElement = document.getElementById('dayLowPrice');
    const dayLowPercentElement = document.getElementById('dayLowPercent');
    const volumeDisplayElement = document.getElementById('volumeDisplay');
    const week52HighElement = document.getElementById('week52High');
    const week52LowElement = document.getElementById('week52Low');

    // Get current price for percentage calculations
    const currentPrice = parseFloat(document.getElementById('entryPrice').value);

    if ((previousClose !== null && !isNaN(previousClose)) || (openPrice !== null && !isNaN(openPrice)) ||
        (dayHigh !== null && !isNaN(dayHigh)) || (dayLow !== null && !isNaN(dayLow)) ||
        (volume !== null && !isNaN(volume)) || (week52High !== null && !isNaN(week52High)) || (week52Low !== null && !isNaN(week52Low))) {

        // Update previous close
        if (previousClose !== null && !isNaN(previousClose)) {
            prevClosePriceElement.textContent = `$${previousClose.toFixed(2)}`;

            if (currentPrice && currentPrice > 0) {
                const percentDiff = ((currentPrice - previousClose) / previousClose) * 100;
                const sign = percentDiff >= 0 ? '+' : '';
                prevClosePercentElement.textContent = `${sign}${percentDiff.toFixed(2)}%`;
                prevClosePercentElement.className = percentDiff >= 0 ? 'text-xs font-medium text-trading-up' : 'text-xs font-medium text-trading-down';
            } else {
                prevClosePercentElement.textContent = '0.00%';
                prevClosePercentElement.className = 'text-xs font-medium text-gray-400';
            }
        } else {
            prevClosePriceElement.textContent = 'N/A';
            prevClosePercentElement.textContent = 'N/A';
            prevClosePercentElement.className = 'text-xs font-medium text-gray-400';
        }

        // Update today's open
        if (openPrice !== null && !isNaN(openPrice)) {
            todayOpenPriceElement.textContent = `$${openPrice.toFixed(2)}`;

            if (currentPrice && currentPrice > 0) {
                const percentDiff = ((currentPrice - openPrice) / openPrice) * 100;
                const sign = percentDiff >= 0 ? '+' : '';
                todayOpenPercentElement.textContent = `${sign}${percentDiff.toFixed(2)}%`;
                todayOpenPercentElement.className = percentDiff >= 0 ? 'text-xs font-medium text-trading-up' : 'text-xs font-medium text-trading-down';
            } else {
                todayOpenPercentElement.textContent = '0.00%';
                todayOpenPercentElement.className = 'text-xs font-medium text-gray-400';
            }
        } else {
            todayOpenPriceElement.textContent = 'N/A';
            todayOpenPercentElement.textContent = 'N/A';
            todayOpenPercentElement.className = 'text-xs font-medium text-gray-400';
        }

        // Update day high
        if (dayHigh !== null && !isNaN(dayHigh)) {
            dayHighPriceElement.textContent = `$${dayHigh.toFixed(2)}`;

            if (currentPrice && currentPrice > 0) {
                const percentDiff = ((currentPrice - dayHigh) / dayHigh) * 100;
                const sign = percentDiff >= 0 ? '+' : '';
                dayHighPercentElement.textContent = `${sign}${percentDiff.toFixed(2)}%`;
                dayHighPercentElement.className = percentDiff >= 0 ? 'text-xs font-medium text-trading-up' : 'text-xs font-medium text-trading-down';
            } else {
                dayHighPercentElement.textContent = '0.00%';
                dayHighPercentElement.className = 'text-xs font-medium text-gray-400';
            }
        } else {
            dayHighPriceElement.textContent = 'N/A';
            dayHighPercentElement.textContent = 'N/A';
            dayHighPercentElement.className = 'text-xs font-medium text-gray-400';
        }

        // Update day low
        if (dayLow !== null && !isNaN(dayLow)) {
            dayLowPriceElement.textContent = `$${dayLow.toFixed(2)}`;

            if (currentPrice && currentPrice > 0) {
                const percentDiff = ((currentPrice - dayLow) / dayLow) * 100;
                const sign = percentDiff >= 0 ? '+' : '';
                dayLowPercentElement.textContent = `${sign}${percentDiff.toFixed(2)}%`;
                dayLowPercentElement.className = percentDiff >= 0 ? 'text-xs font-medium text-trading-up' : 'text-xs font-medium text-trading-down';
            } else {
                dayLowPercentElement.textContent = '0.00%';
                dayLowPercentElement.className = 'text-xs font-medium text-gray-400';
            }
        } else {
            dayLowPriceElement.textContent = 'N/A';
            dayLowPercentElement.textContent = 'N/A';
            dayLowPercentElement.className = 'text-xs font-medium text-gray-400';
        }

        // Update volume
        if (volume !== null && !isNaN(volume)) {
            volumeDisplayElement.textContent = formatVolume(volume);
        } else {
            volumeDisplayElement.textContent = 'N/A';
        }

        // Update 52-week range
        if (week52High !== null && !isNaN(week52High)) {
            week52HighElement.textContent = `$${week52High.toFixed(2)}`;
        } else {
            week52HighElement.textContent = 'N/A';
        }

        if (week52Low !== null && !isNaN(week52Low)) {
            week52LowElement.textContent = `$${week52Low.toFixed(2)}`;
        } else {
            week52LowElement.textContent = 'N/A';
        }

        // Show the info icon
        marketPricesInfoIcon.classList.remove('hidden');
    } else {
        // Hide the info icon
        marketPricesInfoIcon.classList.add('hidden');
    }
}

// Format volume with M/B notation
function formatVolume(volume) {
    if (volume >= 1000000000) {
        return (volume / 1000000000).toFixed(2) + 'B';
    } else if (volume >= 1000000) {
        return (volume / 1000000).toFixed(2) + 'M';
    } else if (volume >= 1000) {
        return (volume / 1000).toFixed(2) + 'K';
    } else {
        return volume.toString();
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

function cachePrice(symbol, price, percentChange = null, previousClose = null, openPrice = null, dayHigh = null, dayLow = null, volume = null, week52High = null, week52Low = null) {
    const cacheKey = `stockPrice_${symbol}`;
    const data = {
        symbol: symbol,
        price: price,
        percentChange: percentChange,
        previousClose: previousClose,
        openPrice: openPrice,
        dayHigh: dayHigh,
        dayLow: dayLow,
        volume: volume,
        week52High: week52High,
        week52Low: week52Low,
        timestamp: Date.now()
    };

    localStorage.setItem(cacheKey, JSON.stringify(data));
}

// Clean up orphaned cache entries (cache for symbols not in any tab)
function cleanupOrphanedCache() {
    // Get all stock symbols currently in tabs
    const activeSymbols = new Set(
        tabs
            .filter(tab => tab.stockSymbol)
            .map(tab => tab.stockSymbol.toUpperCase())
    );

    // Find all cached price entries
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('stockPrice_')) {
            const symbol = key.replace('stockPrice_', '');
            // If this symbol is not in any active tab, mark for removal
            if (!activeSymbols.has(symbol)) {
                keysToRemove.push(key);
            }
        }
    }

    // Remove orphaned entries
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });

    if (keysToRemove.length > 0) {
        console.log(`Cleaned up ${keysToRemove.length} orphaned cache entries:`, keysToRemove);
    }

    return keysToRemove.length;
}

// ============================================
// AUTO-FETCH INTERVAL FOR ACTIVE TAB ONLY
// ============================================

// Fetch price for the active tab only
async function fetchPriceForActiveTab() {
    // Get the active tab
    const activeTab = tabs.find(t => t.id === activeTabId);

    if (!activeTab) {
        console.log('No active tab found');
        return;
    }

    // Check if auto-price is enabled and symbol exists
    if (!activeTab.autoPriceEnabled || !activeTab.stockSymbol) {
        console.log('Active tab does not have auto-price enabled or no symbol');
        return;
    }

    const symbol = activeTab.stockSymbol.trim().toUpperCase();
    if (!symbol) return;

    console.log(`Auto-fetching price for active tab: ${symbol}`);

    try {
        // Fetch from Finnhub API
        let currentPrice = null;
        let percentChange = null;
        let previousClose = null;
        let openPrice = null;
        let dayHigh = null;
        let dayLow = null;
        let volume = null;
        let week52High = null;
        let week52Low = null;

        try {
            const finnhubKey = 'd4eu0qhr01ql649g4o0gd4eu0qhr01ql649g4o10';
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`);

            if (response.ok) {
                const data = await response.json();
                if (data.c && data.c > 0) {
                    currentPrice = data.c;
                    percentChange = data.dp;
                    previousClose = data.pc;
                    openPrice = data.o;
                    dayHigh = data.h;
                    dayLow = data.l;
                    volume = data.v;
                    week52High = data.w52h || null;
                    week52Low = data.w52l || null;
                    console.log(`Fetched ${symbol} from Finnhub:`, {
                        current: currentPrice,
                        change: `${percentChange}%`,
                        prevClose: previousClose,
                        open: openPrice,
                        high: dayHigh,
                        low: dayLow,
                        volume: volume
                    });
                }
            }
        } catch (e) {
            console.log(`Finnhub API error for ${symbol}:`, e);
        }

        if (currentPrice && !isNaN(currentPrice) && currentPrice > 0) {
            // Cache the new price with all data
            cachePrice(symbol, currentPrice, percentChange, previousClose, openPrice, dayHigh, dayLow, volume, week52High, week52Low);

            // Update the active tab's entry price
            activeTab.entryPrice = currentPrice.toFixed(2);

            // Update the UI
            document.getElementById('entryPrice').value = currentPrice.toFixed(2);

            // Update percent change display
            updatePriceChangeDisplay(percentChange);

            // Update market prices display with all data
            updateMarketPricesDisplay(previousClose, openPrice, dayHigh, dayLow, volume, week52High, week52Low);

            // Trigger auto-calculation
            autoCalculate();

            // Save updated tabs to storage
            saveTabsToStorage();

            console.log(`✓ Updated ${symbol} price to $${currentPrice.toFixed(2)}`);
        } else {
            console.warn(`Failed to fetch price for ${symbol}`);
        }
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
    }
}

// Start auto-fetch interval
function startAutoFetchInterval() {
    // Clear any existing interval first
    if (autoFetchIntervalId) {
        clearInterval(autoFetchIntervalId);
    }

    // Check if active tab has auto-price enabled
    const activeTab = tabs.find(t => t.id === activeTabId);
    const hasAutoPrice = activeTab && activeTab.autoPriceEnabled && activeTab.stockSymbol;

    if (hasAutoPrice) {
        console.log('Starting auto-fetch interval for active tab (every 1 minute)');

        // Fetch immediately for active tab
        fetchPriceForActiveTab();

        // Set up interval to fetch every 1 minute for active tab only
        autoFetchIntervalId = setInterval(() => {
            fetchPriceForActiveTab();
        }, AUTO_FETCH_INTERVAL);
    }
}

// Stop auto-fetch interval
function stopAutoFetchInterval() {
    if (autoFetchIntervalId) {
        console.log('Stopping auto-fetch interval');
        clearInterval(autoFetchIntervalId);
        autoFetchIntervalId = null;
    }
}

// Check if we should run the auto-fetch interval
function checkAutoFetchInterval() {
    const activeTab = tabs.find(t => t.id === activeTabId);
    const hasAutoPrice = activeTab && activeTab.autoPriceEnabled && activeTab.stockSymbol;

    if (hasAutoPrice && !autoFetchIntervalId) {
        // Start interval if active tab has auto-price but no interval running
        startAutoFetchInterval();
    } else if (!hasAutoPrice && autoFetchIntervalId) {
        // Stop interval if active tab doesn't have auto-price enabled
        stopAutoFetchInterval();
    } else if (hasAutoPrice && autoFetchIntervalId) {
        // Restart interval to fetch for the new active tab immediately
        startAutoFetchInterval();
    }
}

// Listen for stock symbol changes
document.getElementById('stockSymbol').addEventListener('input', function () {
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
