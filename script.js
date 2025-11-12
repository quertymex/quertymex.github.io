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
    const entryPrice = parseFloat(document.getElementById('entryPrice').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    const tpPercent = parseFloat(document.getElementById('tpPercent').value);
    const slPercent = parseFloat(document.getElementById('slPercent').value);

    // Validation
    let isValid = true;
    const errors = {
        entry: '',
        quantity: '',
        tp: '',
        sl: ''
    };

    if (!entryPrice || entryPrice <= 0) {
        errors.entry = 'Entry price must be greater than 0';
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

    // Calculate prices
    const tpPrice = entryPrice * (1 + tpPercent / 100);
    const slPrice = entryPrice * (1 - slPercent / 100);

    // Calculate amounts
    const investment = entryPrice * quantity;
    const maxProfit = (tpPrice - entryPrice) * quantity;
    const maxLoss = (entryPrice - slPrice) * quantity;
    const perShareTP = tpPrice - entryPrice;
    const perShareSL = entryPrice - slPrice;

    // Calculate risk/reward ratio
    const ratio = (maxProfit / maxLoss).toFixed(1);

    // Update display with USD values
    document.getElementById('resultEntry').textContent = '$' + entryPrice.toFixed(2);
    document.getElementById('resultInvestment').textContent = '$' + investment.toFixed(2);
    document.getElementById('resultTP').textContent = '$' + tpPrice.toFixed(2);
    document.getElementById('resultSL').textContent = '$' + slPrice.toFixed(2);
    document.getElementById('maxProfit').textContent = '+$' + maxProfit.toFixed(2);
    document.getElementById('maxLoss').textContent = '-$' + maxLoss.toFixed(2);
    document.getElementById('perShareTPDisplay').textContent = '+$' + perShareTP.toFixed(2);
    document.getElementById('perShareSLDisplay').textContent = '-$' + perShareSL.toFixed(2);
    document.getElementById('riskReward').textContent = '1:' + ratio;

    // Update display with MYR values
    document.getElementById('resultEntryMYR').textContent = 'RM ' + (entryPrice * USD_TO_MYR).toFixed(2);
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
    const stockName = document.getElementById('stockName').value.trim();
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

    // Build title with stock name if provided
    const title = stockName ? `📊 ${stockName.toUpperCase()} TRADE SETUP` : '📊 TRADE SETUP';

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
    const entryPrice = parseFloat(document.getElementById('entryPrice').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    const tpPercent = parseFloat(document.getElementById('tpPercent').value);
    const slPercent = parseFloat(document.getElementById('slPercent').value);

    // Only auto-calculate if we have at least entry price and quantity
    if (entryPrice && entryPrice > 0 && quantity && quantity > 0) {
        calculateTradeLevels();
    }
}

// Add event listeners to all input fields
document.getElementById('entryPrice').addEventListener('input', autoCalculate);
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
