const HALF_LIFE = 5.7;
let chart = null;
let doseCounter = 1;

function addDose() {
    const container = document.getElementById('dosesContainer');
    const doseEntry = document.createElement('div');
    doseEntry.className = 'dose-entry';
    doseEntry.setAttribute('data-dose-id', doseCounter);
    
    doseEntry.innerHTML = `
        <div class="input-group">
            <div class="input-field">
                <label>Caffeine Dosage (mg)</label>
                <input type="number" class="dosage-input" value="100" min="1" step="1">
            </div>
            <div class="input-field">
                <label>Time Consumed</label>
                <input type="time" class="time-input" value="14:00">
            </div>
            <button class="remove-btn" onclick="removeDose(${doseCounter})">✕</button>
        </div>
    `;
    
    container.appendChild(doseEntry);
    doseCounter++;
    
    // Show remove buttons on all doses if more than one
    updateRemoveButtons();
}

function removeDose(doseId) {
    const doseEntry = document.querySelector(`[data-dose-id="${doseId}"]`);
    if (doseEntry) {
        doseEntry.remove();
    }
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const doses = document.querySelectorAll('.dose-entry');
    const removeButtons = document.querySelectorAll('.remove-btn');
    
    if (doses.length === 1) {
        removeButtons.forEach(btn => btn.style.display = 'none');
    } else {
        removeButtons.forEach(btn => btn.style.display = 'block');
    }
}

function getAllDoses() {
    const doses = [];
    const doseEntries = document.querySelectorAll('.dose-entry');
    
    doseEntries.forEach(entry => {
        const dosage = parseFloat(entry.querySelector('.dosage-input').value);
        const time = entry.querySelector('.time-input').value;
        
        if (dosage && dosage > 0 && time) {
            doses.push({ dosage, time });
        }
    });
    
    return doses;
}

function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = Math.floor(minutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function calculate() {
    const doses = getAllDoses();
    
    if (doses.length === 0) {
        alert('Please enter at least one valid caffeine dose');
        return;
    }
    
    // Find the earliest time to use as reference
    const earliestTime = Math.min(...doses.map(d => timeToMinutes(d.time)));
    
    // Calculate combined caffeine levels
    const combinedData = calculateCombinedCaffeine(doses, earliestTime);
    const timeToNearZero = findTimeToNearZero(combinedData);
    
    displayResult(timeToNearZero, earliestTime);
    updateChart(combinedData, earliestTime);
}

function calculateCombinedCaffeine(doses, referenceTime) {
    const data = [];
    const maxHours = 48;
    
    for (let hour = 0; hour <= maxHours; hour += 0.5) {
        let totalCaffeine = 0;
        
        doses.forEach(dose => {
            const doseTimeMinutes = timeToMinutes(dose.time);
            const timeDiff = (doseTimeMinutes - referenceTime) / 60; // in hours
            const hoursSinceDose = hour - timeDiff;
            
            if (hoursSinceDose >= 0) {
                const amount = dose.dosage * Math.pow(0.5, hoursSinceDose / HALF_LIFE);
                totalCaffeine += amount;
            }
        });
        
        data.push({ hour, amount: totalCaffeine });
        
        if (totalCaffeine < 0.01 && hour > 12) break;
    }
    
    return data;
}

function findTimeToNearZero(data) {
    for (let i = 0; i < data.length; i++) {
        if (data[i].amount < 2) {
            return data[i].hour;
        }
    }
    return data[data.length - 1].hour;
}

function displayResult(hours, startTimeMinutes) {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    
    const resultDiv = document.getElementById('result');
    const resultText = document.getElementById('resultText');
    
    let timeText = '';
    if (days > 0) {
        timeText = `<span class="highlight">${hours.toFixed(1)} hours</span> (<span class="highlight">${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}</span>)`;
    } else {
        timeText = `<span class="highlight">${hours.toFixed(1)} hours</span>`;
    }
    
    resultText.innerHTML = `Caffeine less than 2 mg after: ${timeText}`;
    resultDiv.style.display = 'block';
}

function updateChart(data, startTimeMinutes) {
    const ctx = document.getElementById('caffeineChart').getContext('2d');
    
    const labels = data.map(d => {
        const totalMinutes = startTimeMinutes + (d.hour * 60);
        return minutesToTime(totalMinutes);
    });
    
    const values = data.map(d => d.amount);
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Caffeine in Body (mg)',
                data: values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Caffeine: ${context.parsed.y.toFixed(2)} mg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time of Day',
                        font: { size: 14, weight: 'bold' }
                    },
                    ticks: {
                        maxTicksLimit: 12
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Caffeine (mg)',
                        font: { size: 14, weight: 'bold' }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Initial calculation on page load
window.addEventListener('DOMContentLoaded', () => {
    calculate();
});