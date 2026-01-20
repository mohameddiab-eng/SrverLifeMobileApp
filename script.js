// --- DATA STORE ---
const initialData = {
    meds: [],
    contacts: [],
    tasks: [],
    schedule: [],
    notes: [],
    shop: []
};

let data = JSON.parse(localStorage.getItem('silverLifeData')) || initialData;
let currentCall = null;
let ringtoneAudio = null;
let volumeIncreaseInterval = null;
let volumeDecreaseInterval = null;
let activeMedicineAlarmId = null; // To track which medicine alarm is currently ringing
let medicineAlarmAudio = null; // Still needed for the audio element itself

function getMedicineAlarmAudioEl() {
    return document.getElementById('medicine-alarm-audio') || medicineAlarmAudio;
}

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // startClock(); // Clock initialization moved to index.html specific logic

    // No PWA functionality for now
    // if ('serviceWorker' in navigator) {
    //     navigator.serviceWorker.register('./sw.js')
    //         .then(reg => console.log('Service Worker Registered', reg))
    //         .catch(err => console.error('Service Worker Error', err));
    // }

    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

    if (currentPage === 'index.html' || currentPage === '') {
        updateClock();
        setInterval(updateClock, 1000);

        // Set a random daily tip on load
        const dailyTips = [
            "Stay hydrated! Drink plenty of water throughout the day to keep your body and mind refreshed.",
            "Take a short walk! Even 10-15 minutes of light activity can boost your mood and energy.",
            "Connect with loved ones! Social interaction is vital for mental well-being.",
            "Read something new! Keep your mind sharp by learning something every day.",
            "Practice gratitude! Acknowledging small blessings can significantly improve your outlook."
        ];
        const randomTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
        const dailyTipElement = document.getElementById('daily-tip-content');
        if (dailyTipElement) {
            dailyTipElement.textContent = randomTip;
        }
    }

    // Set initial text size and display mode based on localStorage
    applyAccessSettings();

    // Global Hamburger Menu Logic (applies to all pages now)
    const menuButton = document.getElementById('menu-button');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const menuOverlay = document.getElementById('menu-overlay');

    if (menuButton && sidebarMenu && menuOverlay) {
        menuButton.addEventListener('click', toggleMenu);
        menuOverlay.addEventListener('click', toggleMenu);
    } else {
        // console.warn("Hamburger menu elements not found. This is expected on pages without the menu.");
    }

    // Initialize rendering for the current page
    switch (currentPage) {
        case 'index':
            updateClock();
            setInterval(updateClock, 1000);
            fetchNewsFeed();
            break;
        case 'shop':
            renderShop();
            break;
        case 'wellness':
            // Breathing exercise will start only when user clicks the button
            break;
        case 'contacts':
            renderContacts();
            // Add event listeners for volume buttons for long press
            const volumeUpButton = document.getElementById('volume-up-button');
            const volumeDownButton = document.getElementById('volume-down-button');

            if (volumeUpButton) {
                volumeUpButton.addEventListener('mousedown', startVolumeIncrease);
                volumeUpButton.addEventListener('mouseup', stopVolumeIncrease);
                volumeUpButton.addEventListener('mouseleave', stopVolumeIncrease);
                volumeUpButton.addEventListener('touchstart', startVolumeIncrease, { passive: true });
                volumeUpButton.addEventListener('touchend', stopVolumeIncrease);
                volumeUpButton.addEventListener('touchcancel', stopVolumeIncrease);
            }
            if (volumeDownButton) {
                volumeDownButton.addEventListener('mousedown', startVolumeDecrease);
                volumeDownButton.addEventListener('mouseup', stopVolumeDecrease);
                volumeDownButton.addEventListener('mouseleave', stopVolumeDecrease);
                volumeDownButton.addEventListener('touchstart', startVolumeDecrease, { passive: true });
                volumeDownButton.addEventListener('touchend', stopVolumeDecrease);
                volumeDownButton.addEventListener('touchcancel', stopVolumeDecrease);
            }
            break;
        case 'meds':
            renderMeds();
            // The alarm check logic is now moved below to run on all pages
            break;
        case 'tasks':
            renderTasks();
            break;
        case 'schedule':
            renderSchedule();
            break;
        case 'notes':
            renderNotes();
            break;
    }

    // --- ALARM GLOBAL INITIALIZATION ---
    // These lines are moved outside the 'meds' case so they run on every page load.
    // The alarm elements MUST be copied to all other HTML files for this to work.
    medicineAlarmAudio = document.getElementById('medicine-alarm-audio');

    // Initialize alarm checking - works on ALL pages
    if (!window.alarmCheckInterval) {
        window.alarmCheckInterval = setInterval(checkAllMedicineAlarms, 1000); // Check all alarms every second
    }

    // Also update countdowns every second for real-time display
    if (!window.countdownUpdateInterval) {
        window.countdownUpdateInterval = setInterval(() => {
            // Update countdowns on meds page if it exists
            if (document.getElementById('med-list')) {
                renderMeds();
            }
            // Also update countdowns via checkAllMedicineAlarms which handles all pages
            checkAllMedicineAlarms();
        }, 1000);
    }

    // Initialize draggable accessibility button
    initDraggableAccessibilityButton();

    // Initialize horizontal scrolling for quick actions
    initQuickActionsScrolling();
});

// Function to make the accessibility button draggable
function initDraggableAccessibilityButton() {
    const accessBtn = document.querySelector('.floating-access-btn');
    if (!accessBtn) return;

    let isDragging = false;
    let startX, startY, initialX, initialY;
    const dragThreshold = 10; // Minimum distance to start dragging

    // Mouse events
    accessBtn.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    // Touch events
    accessBtn.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);

    function startDrag(e) {
        isDragging = false; // Reset dragging flag

        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }

        const rect = accessBtn.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;

        accessBtn.style.transition = 'none';
        accessBtn.style.cursor = 'grabbing';
    }

    function drag(e) {
        let currentX, currentY;
        if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        } else {
            currentX = e.clientX;
            currentY = e.clientY;
        }

        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > dragThreshold) {
            if (!isDragging) {
                isDragging = true;
                e.preventDefault(); // Only prevent default when actually dragging
            }

            const newX = initialX + deltaX;
            const newY = initialY + deltaY;

            // Constrain to viewport
            const maxX = window.innerWidth - accessBtn.offsetWidth;
            const maxY = window.innerHeight - accessBtn.offsetHeight;

            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));

            accessBtn.style.left = constrainedX + 'px';
            accessBtn.style.top = constrainedY + 'px';
            accessBtn.style.right = 'auto';
            accessBtn.style.bottom = 'auto';
            accessBtn.style.position = 'fixed';
        }
    }

    function endDrag(e) {
        if (isDragging) {
            // Save position to localStorage only if we actually dragged
            const rect = accessBtn.getBoundingClientRect();
            const position = {
                left: rect.left,
                top: rect.top
            };
            localStorage.setItem('accessibilityButtonPosition', JSON.stringify(position));
        }

        isDragging = false;
        accessBtn.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        accessBtn.style.cursor = 'pointer';
    }

    // Load saved position
    const savedPosition = localStorage.getItem('accessibilityButtonPosition');
    if (savedPosition) {
        try {
            const pos = JSON.parse(savedPosition);
            accessBtn.style.left = pos.left + 'px';
            accessBtn.style.top = pos.top + 'px';
            accessBtn.style.right = 'auto';
            accessBtn.style.bottom = 'auto';
            accessBtn.style.position = 'fixed';
        } catch (e) {
            console.warn('Failed to load accessibility button position');
        }
    }
}

// Remove splash screen AFTER all resources are loaded
window.addEventListener('load', () => {
    const splash = document.getElementById('splash');
    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 700); // Allow time for fade out
    }
});

// Toggle Hamburger Menu
window.toggleMenu = function() {
    const sidebarMenu = document.getElementById('sidebar-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    if (sidebarMenu && menuOverlay) {
        console.log("toggleMenu called"); // Added for debugging
        sidebarMenu.classList.toggle('open');
        menuOverlay.classList.toggle('open');
    }
};

// Accessibility Bar Toggle - Modern Panel
window.toggleAccessBar = function() {
    const accessBar = document.querySelector('.modern-access-panel') || document.getElementById('access-bar');
    if (accessBar) {
        accessBar.classList.toggle('open');
        // Prevent body scroll when panel is open
        if (accessBar.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

window.setAccess = function(type, val) {
    let currentSettings = JSON.parse(localStorage.getItem('accessibilitySettings')) || {};

    if(type === 'reset') {
        // Reset to defaults
        document.documentElement.classList.remove('text-lg-mode', 'text-xl-mode');
        document.body.classList.remove('high-contrast', 'dark-mode', 'light-mode');
        localStorage.removeItem('accessibilitySettings'); // Clear saved settings
        return;
    }

    if(type === 'size') {
        // Apply class to HTML tag to affect REM units
        document.documentElement.classList.remove('text-lg-mode', 'text-xl-mode');
        if(val === 'large') document.documentElement.classList.add('text-lg-mode');
        if(val === 'xl') document.documentElement.classList.add('text-xl-mode');
        currentSettings.size = val;
    }
    if(type === 'mode') {
        document.body.classList.remove('high-contrast', 'dark-mode', 'light-mode');
        if(val === 'contrast') document.body.classList.add('high-contrast');
        if(val === 'dark') document.body.classList.add('dark-mode');
        if(val === 'light') document.body.classList.add('light-mode');
        currentSettings.mode = val;
    }

    localStorage.setItem('accessibilitySettings', JSON.stringify(currentSettings));
}

window.readPage = function() {
    // Stop any current speech first
    window.speechSynthesis.cancel();

    // Get active section text
    const activeSection = document.querySelector('.page-section.active');
    if(!activeSection) return;

    // Clone and clean text (remove buttons text usually)
    const textToRead = activeSection.innerText.replace(/delete|add|edit|shop|call|meds|notes/gi, "");
    
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.9; // Slightly slower for seniors
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

window.stopReading = function() {
    window.speechSynthesis.cancel();
}

// --- ACCESSIBILITY SETTINGS APPLICATION ---
function applyAccessSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('accessibilitySettings'));
    if (savedSettings) {
        // Apply text size
        document.documentElement.classList.remove('text-lg-mode', 'text-xl-mode');
        if (savedSettings.size === 'large') document.documentElement.classList.add('text-lg-mode');
        if (savedSettings.size === 'xl') document.documentElement.classList.add('text-xl-mode');

        // Apply display mode
        document.body.classList.remove('high-contrast', 'dark-mode', 'light-mode');
        if (savedSettings.mode === 'contrast') document.body.classList.add('high-contrast');
        if (savedSettings.mode === 'dark') document.body.classList.add('dark-mode');
        if (savedSettings.mode === 'light') document.body.classList.add('light-mode');
    }
}

// --- CLOCK ---
function startClock() {
    function update() {
        const now = new Date();
        const weekdayOptions = { weekday: 'short' };
        const dateOptions = { month: 'long', day: 'numeric' };
        const yearOptions = { year: 'numeric' };

        // Update Weekday
        const weekdayEl = document.getElementById('clock-weekday');
        if (weekdayEl) weekdayEl.innerText = now.toLocaleDateString('en-US', weekdayOptions);

        // Update Full Date
        const dateFullEl = document.getElementById('clock-date-full');
        if (dateFullEl) dateFullEl.innerText = now.toLocaleDateString('en-US', dateOptions);

        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        
        const hoursEl = document.getElementById('clock-hours');
        if (hoursEl) hoursEl.innerText = hours.toString().padStart(2, '0');

        const minutesEl = document.getElementById('clock-minutes');
        if (minutesEl) minutesEl.innerText = minutes;

        const secondsEl = document.getElementById('clock-seconds');
        if (secondsEl) secondsEl.innerText = seconds;

        const ampmEl = document.getElementById('clock-ampm');
        if(ampmEl) ampmEl.innerText = ampm;
        
        const yearEl = document.getElementById('clock-year');
        if (yearEl) yearEl.innerText = now.toLocaleDateString('en-US', yearOptions);
    }
    update();
    setInterval(update, 1000);
}

function updateClock() {
    const now = new Date();
    const weekdayOptions = { weekday: 'short' };
    const dateOptions = { month: 'long', day: 'numeric' };
    const yearOptions = { year: 'numeric' };

    // Update Weekday
    const weekdayEl = document.getElementById('clock-weekday');
    if (weekdayEl) weekdayEl.textContent = now.toLocaleDateString('en-US', weekdayOptions);

    // Update Full Date
    const dateFullEl = document.getElementById('clock-date-full');
    if (dateFullEl) dateFullEl.textContent = now.toLocaleDateString('en-US', dateOptions);

    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toString().padStart(2, '0');

    // Check if modern clock elements exist (new structure)
    const hoursTensEl = document.getElementById('clock-hours-tens');
    const hoursOnesEl = document.getElementById('clock-hours-ones');
    
    if (hoursTensEl && hoursOnesEl) {
        // Modern clock structure - update individual digits
        const oldHours = hoursTensEl.textContent + hoursOnesEl.textContent;
        if (oldHours !== hoursStr) {
            hoursTensEl.classList.add('flip');
            hoursOnesEl.classList.add('flip');
            setTimeout(() => {
                hoursTensEl.textContent = hoursStr[0];
                hoursOnesEl.textContent = hoursStr[1];
                hoursTensEl.classList.remove('flip');
                hoursOnesEl.classList.remove('flip');
            }, 200);
        } else {
            hoursTensEl.textContent = hoursStr[0];
            hoursOnesEl.textContent = hoursStr[1];
        }
        
        const minutesTensEl = document.getElementById('clock-minutes-tens');
        const minutesOnesEl = document.getElementById('clock-minutes-ones');
        if (minutesTensEl && minutesOnesEl) {
            const oldMinutes = minutesTensEl.textContent + minutesOnesEl.textContent;
            if (oldMinutes !== minutesStr) {
                minutesTensEl.classList.add('flip');
                minutesOnesEl.classList.add('flip');
                setTimeout(() => {
                    minutesTensEl.textContent = minutesStr[0];
                    minutesOnesEl.textContent = minutesStr[1];
                    minutesTensEl.classList.remove('flip');
                    minutesOnesEl.classList.remove('flip');
                }, 200);
            } else {
                minutesTensEl.textContent = minutesStr[0];
                minutesOnesEl.textContent = minutesStr[1];
            }
        }
        
        const secondsTensEl = document.getElementById('clock-seconds-tens');
        const secondsOnesEl = document.getElementById('clock-seconds-ones');
        if (secondsTensEl && secondsOnesEl) {
            secondsTensEl.textContent = secondsStr[0];
            secondsOnesEl.textContent = secondsStr[1];
        }
    } else {
        // Legacy clock structure - fallback for old IDs
        const hoursEl = document.getElementById('clock-hours');
        if (hoursEl) hoursEl.innerText = hoursStr;

        const minutesEl = document.getElementById('clock-minutes');
        if (minutesEl) minutesEl.innerText = minutesStr;

        const secondsEl = document.getElementById('clock-seconds');
        if (secondsEl) secondsEl.innerText = secondsStr;
    }

    const ampmEl = document.getElementById('clock-ampm');
    if(ampmEl) ampmEl.textContent = ampm;
    
    const yearEl = document.getElementById('clock-year');
    if (yearEl) yearEl.textContent = now.toLocaleDateString('en-US', yearOptions);
}

// --- MEDICINE ALARM LOGIC (Individual Alarm Setup/Clearing - REMOVED AS IT USED OLD SINGLE ALARM SYSTEM) ---
// The following functions related to a single global alarm (setMedicineAlarm, clearMedicineAlarm, etc.) 
// are likely remnants of older code and have been replaced by the checkAllMedicineAlarms logic.
// They are kept here for continuity if they are referenced elsewhere, but the core logic
// relies on iterating through 'data.meds'.

window.setMedicineAlarm = function() {
    const alarmTimeInput = document.getElementById('medicine-alarm-time');
    const alarmNameInput = document.getElementById('medicine-alarm-name');

    if (!alarmTimeInput || !alarmNameInput) return;

    const time = alarmTimeInput.value;
    const name = alarmNameInput.value;

    if (time && name) {
        // Since we are using the multi-alarm system now, this part might need adjustment
        // depending on how you intend to use the single setMedicineAlarm function.
        // For now, these global variables are not used by checkAllMedicineAlarms.
        // medicineAlarmTime = time; 
        // medicineAlarmName = name;
        // localStorage.setItem('medicineAlarmTime', time);
        // localStorage.setItem('medicineAlarmName', name);
        // displayMedicineAlarmStatus(`Alarm set for ${name} at ${time}`);
        // startMedicineAlarmCheck();
    } else {
        alert("Please set both time and medicine name for the alarm.");
    }
};

// ... (Other single-alarm logic removed for brevity and because it's replaced by checkAllMedicineAlarms/triggerMedicineAlarm) ...


// --- NAVIGATION LOGIC ---
window.nav = function(pageId) {
    // Redirect to the appropriate HTML file
    if (pageId === 'home') {
        window.location.href = 'index.html';
    } else {
        window.location.href = `${pageId}.html`;
    }
};

// --- FAKE CALL LOGIC ---
window.startFakeCall = function(name, number) {
    const callScreen = document.getElementById('fake-call-screen');
    const callNameEl = document.getElementById('call-name');
    const callStatusEl = document.getElementById('call-status');
    const callAvatarEl = document.querySelector('#fake-call-screen .call-avatar');
    
    if (callScreen) callScreen.classList.add('active');
    if (callNameEl) callNameEl.innerText = name;
    if (callStatusEl) callStatusEl.innerText = 'Calling...';
    
    // Set default profile picture with initials
    if (callAvatarEl) {
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
        const colorIndex = name.charCodeAt(0) % colors.length;
        const avatarColor = colors[colorIndex];
        
        callAvatarEl.innerHTML = initials;
        callAvatarEl.style.background = avatarColor;
        callAvatarEl.style.fontSize = '40px';
        callAvatarEl.style.fontWeight = '700';
        callAvatarEl.style.color = 'white';
        callAvatarEl.style.display = 'flex';
        callAvatarEl.style.alignItems = 'center';
        callAvatarEl.style.justifyContent = 'center';
    }
    
    ringtoneAudio = document.getElementById('ringtone-audio');
    if (ringtoneAudio) {
        ringtoneAudio.currentTime = 0; // Reset audio to start
        ringtoneAudio.volume = 0.5; // Set initial volume
        ringtoneAudio.play().catch(e => console.error("Error playing ringtone: ", e));
    }
    currentCall = setTimeout(() => {
         if (callStatusEl) callStatusEl.innerText = 'Ringing...';
    }, 2000);
}

window.endFakeCall = function() {
    document.getElementById('fake-call-screen').classList.remove('active');
    clearTimeout(currentCall);
    if (ringtoneAudio) {
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
    }
}

window.increaseVolume = function() {
    if (ringtoneAudio) {
        if (ringtoneAudio.volume < 1) {
            ringtoneAudio.volume = Math.min(1, ringtoneAudio.volume + 0.1);
            console.log("Ringtone Volume: ", ringtoneAudio.volume);
        }
    }
};

window.decreaseVolume = function() {
    if (ringtoneAudio) {
        if (ringtoneAudio.volume > 0) {
            ringtoneAudio.volume = Math.max(0, ringtoneAudio.volume - 0.1);
            console.log("Ringtone Volume: ", ringtoneAudio.volume);
        }
    }
};

// --- BREATHING EXERCISE ---
window.startBreathing = function() {
    const bar = document.getElementById('breath-bar');
    bar.style.width = '0%';
    
    setTimeout(() => {
        bar.style.transition = 'width 4s ease-out';
        bar.style.width = '100%';
        setTimeout(() => {
            setTimeout(() => {
                bar.style.transition = 'width 4s ease-in';
                bar.style.width = '0%';
            }, 4000);
        }, 4000);
    }, 100);
}

// --- MODAL LOGIC ---
window.openModal = function(id) {
    document.getElementById(id).classList.add('open');
}

window.closeModal = function(id) {
    document.getElementById(id).classList.remove('open');
    document.querySelectorAll(`#${id} input, #${id} textarea`).forEach(input => input.value = '');
}

// --- CRUD OPERATIONS ---
function saveToLocal(shouldRender = true) {
    localStorage.setItem('silverLifeData', JSON.stringify(data));
    if (shouldRender) {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        switch (currentPage) {
            case 'meds': renderMeds(); break;
            case 'contacts': renderContacts(); break;
            case 'tasks': renderTasks(); break;
            case 'shop': renderShop(); break;
            case 'schedule': renderSchedule(); break;
            case 'notes': renderNotes(); break;
        }
    }
}

window.saveItem = function(type) {
    const id = Date.now().toString(); 
    
    if (type === 'meds') {
        const name = document.getElementById('med-name').value;
        const time = document.getElementById('med-time').value;
        const desc = document.getElementById('med-desc').value;
        if(!name) return alert('Please enter a name');
        data.meds.push({ id, name, time, desc, alarmIntervalId: null, alarmTriggered: false });
        closeModal('med-modal');
    }
    else if (type === 'contacts') {
        const name = document.getElementById('contact-name').value;
        const phone = document.getElementById('contact-phone').value;
        if(!name || !phone) return alert('Name and phone required');
        data.contacts.push({ id, name, phone });
        closeModal('contact-modal');
    }
    else if (type === 'tasks') {
        const desc = document.getElementById('task-desc').value;
        if(!desc) return alert('Please enter a task');
        data.tasks.push({ id, desc, done: false });
        closeModal('task-modal');
    }
    else if (type === 'shop') {
        const desc = document.getElementById('shop-desc').value;
        if(!desc) return alert('Please enter an item');
        // Ensure data.shop exists for old users
        if(!data.shop) data.shop = [];
        data.shop.push({ id, desc, done: false });
        closeModal('shop-modal');
    }
    else if (type === 'schedule') {
        const title = document.getElementById('sched-title').value;
        const time = document.getElementById('sched-time').value;
        if(!title) return alert('Activity required');
        data.schedule.push({ id, title, time });
        data.schedule.sort((a,b) => (a.time || '').localeCompare(b.time || ''));
        closeModal('schedule-modal');
    }
    else if (type === 'notes') {
        const title = document.getElementById('note-title').value;
        const body = document.getElementById('note-body').value;
        if(!title) return alert('Title required');
        data.notes.push({ id, title, body, date: new Date().toLocaleDateString() });
        closeModal('note-modal');
    }

    saveToLocal();
}

// --- ROBUST DELETE FUNCTION ---
window.deleteItem = function(event, type, id) {
    // Stop event bubbling immediately
    if(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if(confirm('Are you sure you want to delete this?')) {
        // Ensure the array exists before filtering
        if(data[type]) {
            data[type] = data[type].filter(item => item.id !== id);
            // Re-render the specific list after deletion
            const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
            switch (currentPage) {
                case 'meds': renderMeds(); break;
                case 'contacts': renderContacts(); break;
                case 'tasks': renderTasks(); break;
                case 'shop': renderShop(); break;
                case 'schedule': renderSchedule(); break;
                case 'notes': renderNotes(); break;
            }
            saveToLocal(false); // Pass false to prevent infinite loop of rendering
        }
    }
    return false; // Prevent further action
}

window.toggleTask = function(id, type = 'tasks') {
    // Handle both tasks and shopping list checkboxes
    const list = type === 'shop' ? (data.shop || []) : data.tasks;
    const item = list.find(t => t.id === id);
    if(item) {
        item.done = !item.done;
        saveToLocal(); // This will now trigger the correct page's render function
    }
}

// --- RENDERING ---
function saveToLocal(shouldRender = true) {
    localStorage.setItem('silverLifeData', JSON.stringify(data));
    if (shouldRender) {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        switch (currentPage) {
            case 'meds': renderMeds(); break;
            case 'contacts': renderContacts(); break;
            case 'tasks': renderTasks(); break;
            case 'shop': renderShop(); break;
            case 'schedule': renderSchedule(); break;
            case 'notes': renderNotes(); break;
        }
    }
}
function renderMeds() {
    const container = document.getElementById('med-list');
    if(data.meds.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 mt-10 text-xl font-bold">No medications</div>';
        return;
    }
    container.innerHTML = `<div style="max-height: 60vh; overflow-y-auto;">${data.meds.map(item => {
        const now = new Date();
        const [alarmHours, alarmMinutes] = item.time.split(':').map(Number);
        let alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarmHours, alarmMinutes, 0);

        // If the alarm time has passed for today, set it for tomorrow
        if (alarmDate < now && !item.alarmTriggered) {
            alarmDate.setDate(alarmDate.getDate() + 1);
        }

        const timeLeft = alarmDate.getTime() - now.getTime();
        const seconds = Math.floor((timeLeft / 1000) % 60);
        const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
        const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

        let countdownDisplay = '';
        if (timeLeft > 0) {
            countdownDisplay = `Alarm in: `;
            if (days > 0) countdownDisplay += `${days}d `;
            countdownDisplay += `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        } else if (item.alarmTriggered) {
            countdownDisplay = 'Ringing now!';
        } else {
            countdownDisplay = 'Alarm due.'; // Should be handled by alarm triggering logic
        }

        return `
        <div class="bg-white p-5 rounded-2xl shadow-sm border-l-8 border-blue-500 flex justify-between items-center mb-4">
            <div>
                <h4 class="font-bold text-2xl text-gray-800">${item.name}</h4>
                <div class="text-blue-700 font-bold text-lg"><i class="far fa-clock mr-1"></i> ${item.time || 'Anytime'}</div>
                <div class="text-gray-600 text-lg">${item.desc}</div>
                <div id="countdown-${item.id}" class="text-orange-500 font-bold text-sm mt-1">${countdownDisplay}</div>
            </div>
            <button onclick="deleteItem(event, 'meds', '${item.id}')" class="bg-red-50 text-red-500 p-4 rounded-xl tap-effect border border-red-100"><i class="fas fa-trash-alt text-2xl"></i></button>
        </div>
        `;
    }).join('')}</div>`;
}

function renderContacts() {
    const container = document.getElementById('contact-list');
    if(data.contacts.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 mt-10 text-xl font-bold">No contacts</div>';
        return;
    }
    container.innerHTML = `<div style="max-height: 60vh; overflow-y-auto;">${data.contacts.map(item => `
        <div class="flex gap-2 mb-4">
            <div onclick="startFakeCall('${item.name}', '${item.phone}')" class="flex-1 bg-white p-4 rounded-2xl shadow-sm flex items-center tap-effect border border-gray-100">
                <div class="bg-green-100 text-green-700 w-16 h-16 rounded-full flex items-center justify-center text-3xl mr-4 shrink-0">
                    <i class="fas fa-phone"></i>
                </div>
                <div>
                    <h4 class="font-bold text-2xl text-gray-800">${item.name}</h4>
                    <div class="text-gray-600 font-mono text-xl">${item.phone}</div>
                </div>
            </div>
            <button onclick="deleteItem(event, 'contacts', '${item.id}')" class="bg-red-100 text-red-600 w-20 rounded-2xl shadow-sm flex items-center justify-center tap-effect border border-red-200">
                <i class="fas fa-trash-alt text-2xl"></i>
            </button>
        </div>
    `).join('')}</div>`;
}

function renderTasks() {
    const container = document.getElementById('task-list');
    if(data.tasks.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 mt-10 text-xl font-bold">No tasks today</div>';
        return;
    }
    container.innerHTML = data.tasks.map(item => `
        <div class="bg-white p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-all ${item.done ? 'opacity-60 bg-gray-50' : ''} mb-3 border-l-8 ${item.done ? 'border-gray-300' : 'border-orange-500'}">
            <button onclick="toggleTask('${item.id}')" class="w-12 h-12 rounded-full border-4 ${item.done ? 'bg-orange-500 border-orange-500' : 'border-gray-300'} flex items-center justify-center shrink-0">
                ${item.done ? '<i class="fas fa-check text-white text-2xl"></i>' : ''}
            </button>
            <span class="flex-1 text-2xl font-bold ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}">${item.desc}</span>
            <button onclick="deleteItem(event, 'tasks', '${item.id}')" class="text-red-300 p-4 hover:text-red-500"><i class="fas fa-trash-alt text-2xl"></i></button>
        </div>
    `).join('');
}

function renderShop() {
    const container = document.getElementById('shop-list');
    if(!data.shop || data.shop.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 mt-10 text-xl font-bold">List is empty</div>';
        return;
    }
    container.innerHTML = `<div style="max-height: 60vh; overflow-y-auto;">${data.shop.map(item => `
        <div class="bg-white p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-all ${item.done ? 'opacity-60 bg-gray-50' : ''} mb-3 border-l-8 ${item.done ? 'border-gray-300' : 'border-lime-500'}">
            <button onclick="toggleTask('${item.id}', 'shop')" class="w-12 h-12 rounded-full border-4 ${item.done ? 'bg-lime-500 border-lime-500' : 'border-gray-300'} flex items-center justify-center shrink-0">
                ${item.done ? '<i class="fas fa-circle text-green-500 text-xl"></i>' : ''}
            </button>
            <span class="flex-1 text-2xl font-bold ${item.done ? 'text-gray-400' : 'text-gray-800'}">${item.desc}</span>
            <button onclick="deleteItem(event, 'shop', '${item.id}')" class="text-red-300 p-4 hover:text-red-500"><i class="fas fa-trash-alt text-2xl"></i></button>
        </div>
    `).join('')}</div>`;
}

function renderSchedule() {
    const container = document.getElementById('schedule-list');
    if(data.schedule.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 mt-10 text-xl font-bold">No routine added</div>';
        return;
    }
    container.innerHTML = data.schedule.map(item => `
        <div class="bg-white p-5 rounded-2xl shadow-sm border-l-8 border-indigo-500 flex justify-between items-center mb-3">
            <div>
                <div class="text-indigo-700 font-bold text-xl"><i class="far fa-clock mr-1"></i> ${item.time || 'Anytime'}</div>
                <h4 class="font-bold text-2xl text-gray-800">${item.title}</h4>
            </div>
            <button onclick="deleteItem(event, 'schedule', '${item.id}')" class="bg-red-50 text-red-500 p-4 rounded-xl tap-effect border border-red-100"><i class="fas fa-trash-alt text-2xl"></i></button>
        </div>
    `).join('');
}

function renderNotes() {
    const container = document.getElementById('note-list');
    if(data.notes.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 mt-10 text-xl font-bold">No entries yet</div>';
        return;
    }
    container.innerHTML = data.notes.map(item => `
        <div class="bg-yellow-50 p-6 rounded-2xl shadow-sm border-2 border-yellow-200 relative mb-4">
            <h4 class="font-bold text-2xl text-yellow-900 mb-2">${item.title}</h4>
            <p class="text-gray-800 whitespace-pre-wrap text-xl leading-relaxed font-medium">${item.body}</p>
            <div class="mt-4 flex justify-between items-end border-t-2 border-yellow-200 pt-2">
                <span class="text-yellow-700 font-bold text-sm">${item.date}</span>
                <button onclick="deleteItem(event, 'notes', '${item.id}')" class="text-red-400 hover:text-red-600 p-2"><i class="fas fa-trash-alt text-2xl"></i></button>
            </div>
        </div>
    `).join('');
}

// --- YNET RSS FEED ---
async function fetchNewsFeed() {
    const RSS_URL = 'http://feeds.bbci.co.uk/news/world/rss.xml'; // BBC World News RSS feed
    const container = document.getElementById('ynet-rss-feed');
    if (!container) return;

    const MAX_RETRIES = 3;
    let retries = 0;

    async function attemptFetch() {
        try {
            const proxyUrl = 'https://api.allorigins.win/get?url=';
            console.log("Attempting to fetch news feed...");
            const response = await fetch(proxyUrl + encodeURIComponent(RSS_URL));
            const data = await response.json();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data.contents, "text/xml");

            const items = xmlDoc.querySelectorAll('item');
            let html = '';
            items.forEach((item, index) => {
                if (index < 5) { // Display top 5 headlines
                    const title = item.querySelector('title').textContent;
                    const link = item.querySelector('link').textContent;
                    const description = item.querySelector('description') ? item.querySelector('description').textContent : '';

                    const cleanDescription = description.replace(/<[^>]*>?/gm, '');

                    html += `
                        <a href="${link}" target="_blank" class="block p-3 border-b border-gray-200 hover:bg-gray-50 last:border-b-0">
                            <h4 class="font-semibold text-lg text-gray-900">${title}</h4>
                            <p class="text-gray-600 text-sm mt-1 line-clamp-2">${cleanDescription}</p>
                        </a>
                    `;
                }
            });
            container.innerHTML = html;
            console.log("News feed fetched successfully.");

        } catch (error) {
            console.error("Error fetching or parsing RSS feed:", error);
            if (retries < MAX_RETRIES) {
                retries++;
                console.log(`Retrying news fetch... Attempt ${retries}`);
                setTimeout(attemptFetch, 5000); // Retry after 5 seconds
            } else {
                container.innerHTML = '<p class="text-red-500 text-center">Failed to load news after multiple attempts. Please try again later. (Error: ' + error.message + ')</p>' +
                                    '<p class="text-red-500 text-center text-sm mt-2">If running locally, please ensure you are using a local server (e.g., `python -m http.server`) due to browser security restrictions (CORS).</p>';
            }
        }
    }
    attemptFetch();
}
 
function startVolumeIncrease() {
    if (ringtoneAudio) {
        increaseVolume(); // Initial click for immediate response
        volumeIncreaseInterval = setInterval(increaseVolume, 150); // Continue increasing every 150ms
    }
}

function stopVolumeIncrease() {
    clearInterval(volumeIncreaseInterval);
    volumeIncreaseInterval = null;
}

function startVolumeDecrease() {
    if (ringtoneAudio) {
        decreaseVolume(); // Initial click for immediate response
        volumeDecreaseInterval = setInterval(decreaseVolume, 150); // Continue decreasing every 150ms
    }
}

function stopVolumeDecrease() {
    clearInterval(volumeDecreaseInterval);
    volumeDecreaseInterval = null;
}

window.increaseVolume = function() {
    if (ringtoneAudio) {
        if (ringtoneAudio.volume < 1) {
            ringtoneAudio.volume = Math.min(1, ringtoneAudio.volume + 0.1);
            console.log("Ringtone Volume: ", ringtoneAudio.volume);
        }
    }
};

window.decreaseVolume = function() {
    if (ringtoneAudio) {
        if (ringtoneAudio.volume > 0) {
            ringtoneAudio.volume = Math.max(0, ringtoneAudio.volume - 0.1);
            console.log("Ringtone Volume: ", ringtoneAudio.volume);
        }
    }
};

// --- BREATHING EXERCISE ---
window.startBreathing = function() {
    const bar = document.getElementById('breath-bar');
    bar.style.width = '0%';
    
    setTimeout(() => {
        bar.style.transition = 'width 4s ease-out';
        bar.style.width = '100%';
        setTimeout(() => {
            setTimeout(() => {
                bar.style.transition = 'width 4s ease-in';
                bar.style.width = '0%';
            }, 4000);
        }, 4000);
    }, 100);
}

// --- MODAL LOGIC ---
window.openModal = function(id) {
    document.getElementById(id).classList.add('open');
}

window.closeModal = function(id) {
    document.getElementById(id).classList.remove('open');
    document.querySelectorAll(`#${id} input, #${id} textarea`).forEach(input => input.value = '');
}

// --- CRUD OPERATIONS ---
function saveToLocal(shouldRender = true) {
    localStorage.setItem('silverLifeData', JSON.stringify(data));
    if (shouldRender) {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        switch (currentPage) {
            case 'meds': renderMeds(); break;
            case 'contacts': renderContacts(); break;
            case 'tasks': renderTasks(); break;
            case 'shop': renderShop(); break;
            case 'schedule': renderSchedule(); break;
            case 'notes': renderNotes(); break;
        }
    }
}

window.saveItem = function(type) {
    const id = Date.now().toString(); 
    
    if (type === 'meds') {
        const name = document.getElementById('med-name').value;
        const time = document.getElementById('med-time').value;
        const desc = document.getElementById('med-desc').value;
        if(!name) return alert('Please enter a name');
        data.meds.push({ id, name, time, desc, alarmIntervalId: null, alarmTriggered: false });
        closeModal('med-modal');
    }
    else if (type === 'contacts') {
        const name = document.getElementById('contact-name').value;
        const phone = document.getElementById('contact-phone').value;
        if(!name || !phone) return alert('Name and phone required');
        data.contacts.push({ id, name, phone });
        closeModal('contact-modal');
    }
    else if (type === 'tasks') {
        const desc = document.getElementById('task-desc').value;
        if(!desc) return alert('Please enter a task');
        data.tasks.push({ id, desc, done: false });
        closeModal('task-modal');
    }
    else if (type === 'shop') {
        const desc = document.getElementById('shop-desc').value;
        if(!desc) return alert('Please enter an item');
        // Ensure data.shop exists for old users
        if(!data.shop) data.shop = [];
        data.shop.push({ id, desc, done: false });
        closeModal('shop-modal');
    }
    else if (type === 'schedule') {
        const title = document.getElementById('sched-title').value;
        const time = document.getElementById('sched-time').value;
        if(!title) return alert('Activity required');
        data.schedule.push({ id, title, time });
        data.schedule.sort((a,b) => (a.time || '').localeCompare(b.time || ''));
        closeModal('schedule-modal');
    }
    else if (type === 'notes') {
        const title = document.getElementById('note-title').value;
        const body = document.getElementById('note-body').value;
        if(!title) return alert('Title required');
        data.notes.push({ id, title, body, date: new Date().toLocaleDateString() });
        closeModal('note-modal');
    }

    saveToLocal();
}

// --- ROBUST DELETE FUNCTION ---
window.deleteItem = function(event, type, id) {
    // Stop event bubbling immediately
    if(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if(confirm('Are you sure you want to delete this?')) {
        // Ensure the array exists before filtering
        if(data[type]) {
            data[type] = data[type].filter(item => item.id !== id);
            // Re-render the specific list after deletion
            const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
            switch (currentPage) {
                case 'meds': renderMeds(); break;
                case 'contacts': renderContacts(); break;
                case 'tasks': renderTasks(); break;
                case 'shop': renderShop(); break;
                case 'schedule': renderSchedule(); break;
                case 'notes': renderNotes(); break;
            }
            saveToLocal(false); // Pass false to prevent infinite loop of rendering
        }
    }
    return false; // Prevent further action
}

window.toggleTask = function(id, type = 'tasks') {
    // Handle both tasks and shopping list checkboxes
    const list = type === 'shop' ? (data.shop || []) : data.tasks;
    const item = list.find(t => t.id === id);
    if(item) {
        item.done = !item.done;
        saveToLocal(); // This will now trigger the correct page's render function
    }
}

// --- RENDERING ---
function saveToLocal(shouldRender = true) {
    localStorage.setItem('silverLifeData', JSON.stringify(data));
    if (shouldRender) {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        switch (currentPage) {
            case 'meds': renderMeds(); break;
            case 'contacts': renderContacts(); break;
            case 'tasks': renderTasks(); break;
            case 'shop': renderShop(); break;
            case 'schedule': renderSchedule(); break;
            case 'notes': renderNotes(); break;
        }
    }
}
function renderMeds() {
    const container = document.getElementById('med-list');
    if(data.meds.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 mt-10 text-xl font-bold">No medications</div>';
        return;
    }
    container.innerHTML = data.meds.map(item => {
        const now = new Date();
        const [alarmHours, alarmMinutes] = item.time.split(':').map(Number);
        let alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarmHours, alarmMinutes, 0);
        
        // If the alarm time has passed for today, set it for tomorrow
        if (alarmDate < now && !item.alarmTriggered) {
            alarmDate.setDate(alarmDate.getDate() + 1);
        }

        const timeLeft = alarmDate.getTime() - now.getTime();
        const seconds = Math.floor((timeLeft / 1000) % 60);
        const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
        const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

        let countdownDisplay = '';
        if (timeLeft > 0) {
            countdownDisplay = `Alarm in: `;
            if (days > 0) countdownDisplay += `${days}d `;
            countdownDisplay += `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        } else if (item.alarmTriggered) {
            countdownDisplay = 'Ringing now!';
        } else {
            countdownDisplay = 'Alarm due.'; // Should be handled by alarm triggering logic
        }

        return `
        <div class="bg-white p-5 rounded-2xl shadow-sm border-l-8 border-blue-500 flex justify-between items-center mb-4">
            <div>
                <h4 class="font-bold text-2xl text-gray-800">${item.name}</h4>
                <div class="text-blue-700 font-bold text-lg"><i class="far fa-clock mr-1"></i> ${item.time || 'Anytime'}</div>
                <div class="text-gray-600 text-lg">${item.desc}</div>
                <div id="countdown-${item.id}" class="text-orange-500 font-bold text-sm mt-1">${countdownDisplay}</div>
            </div>
            <button onclick="deleteItem(event, 'meds', '${item.id}')" class="bg-red-50 text-red-500 p-4 rounded-xl tap-effect border border-red-100"><i class="fas fa-trash-alt text-2xl"></i></button>
        </div>
        `;
    }).join('');
}

function checkAllMedicineAlarms() {
    const now = new Date();
    data.meds.forEach(item => {
        if (!item.time) return; // No alarm time set for this medication

        const [alarmHours, alarmMinutes] = item.time.split(':').map(Number);
        let alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarmHours, alarmMinutes, 0);

        // If alarm time has passed for today, set for tomorrow
        if (alarmDate < now) {
            alarmDate.setDate(alarmDate.getDate() + 1);
        }

        // Check if the alarm should trigger (when time matches exactly)
        const timeUntilAlarm = alarmDate.getTime() - now.getTime();
        const secondsUntilAlarm = Math.floor(timeUntilAlarm / 1000);

        // Trigger alarm when we're at exactly 0 seconds (within 1 second window)
        // This ensures it triggers on all pages
        if (secondsUntilAlarm === 0 && timeUntilAlarm >= 0 && timeUntilAlarm < 1000 && !item.alarmTriggered) {
            triggerMedicineAlarm(item.id, item.name);
            item.alarmTriggered = true; // Mark as triggered to prevent multiple triggers
            saveToLocal(false); // Save state without re-rendering to avoid disrupting countdowns
        } else if (secondsUntilAlarm > 0 && item.alarmTriggered) {
            // Reset triggered flag if alarm is now in the future (e.g., after snooze or next day)
            item.alarmTriggered = false;
            saveToLocal(false);
        }

        // Update countdown display in real-time
        const countdownElement = document.getElementById(`countdown-${item.id}`);
        if (countdownElement) {
            if (timeUntilAlarm > 0) {
                const seconds = Math.floor((timeUntilAlarm / 1000) % 60);
                const minutes = Math.floor((timeUntilAlarm / (1000 * 60)) % 60);
                const hours = Math.floor((timeUntilAlarm / (1000 * 60 * 60)) % 24);
                const days = Math.floor(timeUntilAlarm / (1000 * 60 * 60 * 24));

                let display = `Alarm in: `;
                if (days > 0) display += `${days}d `;
                display += `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
                countdownElement.textContent = display;
            } else if (item.alarmTriggered) {
                countdownElement.textContent = 'Ringing now!';
            } else {
                countdownElement.textContent = 'Alarm due.';
            }
        }
    });
}

window.triggerMedicineAlarm = function(id, name) {
    // These elements must exist in the DOM for the alarm to work on ALL pages
    const alarmScreen = document.getElementById('medicine-alarm-screen');
    const alarmNameDisplay = document.getElementById('medicine-alarm-name-display');

    if (alarmScreen) {
        // Remember where the user was when the alarm popped up (so Stop can return cleanly)
        try {
            sessionStorage.setItem('alarmReturnUrl', window.location.href);
        } catch (_) {}

        alarmScreen.classList.add('active');
        alarmScreen.style.display = 'flex';
        alarmScreen.style.zIndex = '9999';

        // Add click handler to play audio on user interaction (for mobile autoplay restrictions)
        const playAudioOnClick = () => {
            const audioEl = getMedicineAlarmAudioEl();
            if (audioEl && audioEl.paused) {
                audioEl.play().catch(e => console.error("Error playing medicine alarm on click: ", e));
            }
            alarmScreen.removeEventListener('click', playAudioOnClick);
        };
        alarmScreen.addEventListener('click', playAudioOnClick);
    }
    if (alarmNameDisplay) {
        alarmNameDisplay.textContent = name || "Medicine";
    }

    activeMedicineAlarmId = id; // Set the active alarm ID

    // Play alarm sound - works on all pages
    const audioEl = getMedicineAlarmAudioEl();
    if (audioEl) {
        medicineAlarmAudio = audioEl;
        audioEl.currentTime = 0;
        audioEl.volume = 0.7;
        // Try to play immediately, but also set up fallback for mobile
        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.warn("Autoplay blocked, audio will play on user interaction: ", e);
                // Audio will be played when user clicks the alarm screen
            });
        }
    }

    // Also show browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Medicine Reminder', {
            body: `Time to take ${name}`,
            icon: 'SA.png',
            tag: 'medicine-alarm'
        });
    }
};

// Test function to simulate alarm (for testing purposes)
window.testMedicineAlarm = function() {
    if (data.meds.length > 0) {
        const testMed = data.meds[0];
        triggerMedicineAlarm(testMed.id, testMed.name);
    } else {
        // Create a test alarm
        triggerMedicineAlarm('test', 'Test Medicine');
    }
};

window.stopMedicineAlarmSound = function() {
    const audioEl = getMedicineAlarmAudioEl();
    if (audioEl) {
        medicineAlarmAudio = audioEl;
        audioEl.pause();
        audioEl.currentTime = 0;
    }
    const alarmScreen = document.getElementById('medicine-alarm-screen');
    if (alarmScreen) {
        alarmScreen.classList.remove('active');
        // Clear any inline styles set when triggering (prevents getting "stuck" visible)
        alarmScreen.style.display = '';
        alarmScreen.style.zIndex = '';
    }
    
    // Reset the triggered flag for the active alarm
    if (activeMedicineAlarmId) {
        const med = data.meds.find(m => m.id === activeMedicineAlarmId);
        if (med) med.alarmTriggered = false;
        activeMedicineAlarmId = null;
        saveToLocal(false);
    }

    // If the alarm UI ever becomes its own page in the future, this will return correctly.
    try {
        const returnUrl = sessionStorage.getItem('alarmReturnUrl');
        if (returnUrl && returnUrl !== window.location.href) {
            window.location.href = returnUrl;
        }
    } catch (_) {}
};

window.snoozeMedicineAlarm = function() {
    // Keep the id before stop clears it
    const snoozeId = activeMedicineAlarmId;
    stopMedicineAlarmSound();

    if (snoozeId) {
        const med = data.meds.find(m => m.id === snoozeId);
        if (med) {
            // Set the alarm for 5 minutes from now
            const now = new Date();
            now.setMinutes(now.getMinutes() + 5);
            const newAlarmTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            med.time = newAlarmTime;
            med.alarmTriggered = false; // Reset triggered flag
            saveToLocal(); // Save and re-render to update countdown
        }
    }
    activeMedicineAlarmId = null; // Clear active alarm
};
