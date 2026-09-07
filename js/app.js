function territoryApp() {
    return {
        view: 'dashboard',
        isDark: false,
        territories: [],
        activeTerritory: null,
        selectionMode: false,
        selectedUnits: [],
        modals: { newTerritory: false, newAddress: false, note: false, deleteConfirm: false, colorPickerId: null, tutorial: false, tutorialComplete: false, pwaGuide: false, resetConfirm: false, filterModal: false },
        filters: { status: 'all', sortBy: 'name_asc', minUnits: 0, maxUnits: 100, hasNotesOnly: false, selectedColor: null },
        deleteState: { type: null, id: null, targetName: '' },
        forms: { territoryName: '', territoryColor: null, addressName: '', addressUnits: '', addressRows: '', addressCols: '', addressCreationMode: 'simple', customCols: [], noteText: '' },
        currentEditingUnit: null,
        touchTimer: null,
        longPressTriggered: false,
        touchStartX: 0,
        touchStartY: 0,
        touchStartUnitX: 0,
        touchStartUnitY: 0,
        isUpdatingAddresses: false,
        searchQuery: '',
        filterType: 'all',
        introStep: 0,
        pwaStep: 0,
        tutorialActive: false,
        tutorialStep: 1,
        testedStates: { green: false, red: false, hole: false },
        isStandalone: false,
        visitLogs: [],
        statsTimeRange: '7d',
        statsDropdownOpen: false,
        timeRangeOptions: [
            { id: '7d', label: 'Ultimi 7 giorni' },
            { id: '14d', label: 'Ultimi 14 giorni' },
            { id: '30d', label: 'Ultimi 30 giorni' },
            { id: 'month', label: 'Questo mese' },
            { id: 'all', label: 'Tutto il periodo' }
        ],
        hoveredChartPoint: null,

        initApp() {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                this.isDark = true;
            }
            // Apply dark class to html element
            document.documentElement.classList.toggle('dark', this.isDark);

            // Check standalone PWA mode
            this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || document.referrer.includes('android-app://');

            const stored = localStorage.getItem('territories');
            if (stored) this.territories = JSON.parse(stored);
            this.$watch('territories', (val) => localStorage.setItem('territories', JSON.stringify(val)));

            // Visit logs initialization
            const storedLogs = localStorage.getItem('visitLogs');
            if (storedLogs) {
                try { this.visitLogs = JSON.parse(storedLogs); } catch(e) { this.visitLogs = []; }
            } else {
                this.visitLogs = [];
            }
            if (this.visitLogs.length === 0) {
                this.seedInitialVisitLogs();
            }
            this.$watch('visitLogs', (val) => localStorage.setItem('visitLogs', JSON.stringify(val)));

            this.$watch('isDark', (val) => {
                localStorage.theme = val ? 'dark' : 'light';
                document.documentElement.classList.toggle('dark', val);
            });
            this.$watch('view', (val) => {
                // Helper for infinite scroll or similar
            });

            // Trigger intro modal on first visit
            if (!localStorage.getItem('tutorialSeen')) {
                setTimeout(() => {
                    this.openIntroModal();
                }, 400);
            }
        },

        openIntroModal() {
            this.introStep = 0;
            this.modals.tutorial = true;
        },
        nextIntroStep() {
            if (this.introStep < 3) {
                this.introStep++;
            }
        },
        prevIntroStep() {
            if (this.introStep > 0) {
                this.introStep--;
            }
        },
        startInteractiveGuideFromIntro() {
            this.modals.tutorial = false;
            this.startInteractiveGuide();
        },
        openPwaGuide() {
            this.pwaStep = 0;
            this.modals.tutorial = false;
            this.modals.tutorialComplete = false;
            this.modals.pwaGuide = true;
        },
        closePwaGuide() {
            this.modals.pwaGuide = false;
        },
        nextPwaStep() {
            if (this.pwaStep < 3) {
                this.pwaStep++;
            }
        },
        prevPwaStep() {
            if (this.pwaStep > 0) {
                this.pwaStep--;
            }
        },
        startInteractiveGuide() {
            this.modals.tutorial = false;
            this.tutorialActive = true;
            this.tutorialStep = 1;
            this.testedStates = { green: false, red: false, hole: false };
            this.view = 'dashboard';
        },
        finishTutorial() {
            localStorage.setItem('tutorialSeen', 'true');
            this.modals.tutorial = false;
            this.modals.tutorialComplete = false;
            this.tutorialActive = false;
            this.tutorialStep = 0;
            this.view = 'dashboard';
            this.activeTerritory = null;
            this.selectionMode = false;
        },
        introTouchStartX: 0,
        handleIntroTouchStart(e) {
            if (e.touches && e.touches.length > 0) {
                this.introTouchStartX = e.touches[0].clientX;
            }
        },
        handleIntroTouchEnd(e) {
            if (e.changedTouches && e.changedTouches.length > 0) {
                const diffX = e.changedTouches[0].clientX - this.introTouchStartX;
                if (diffX < -40) {
                    this.nextIntroStep();
                } else if (diffX > 40) {
                    this.prevIntroStep();
                }
            }
        },

        cardTouchStartX: 0,
        cardTouchStartY: 0,
        cardIsDragging: false,
        handleCardTouchStart(e) {
            if (e.touches && e.touches.length > 0) {
                this.cardTouchStartX = e.touches[0].clientX;
                this.cardTouchStartY = e.touches[0].clientY;
                this.cardIsDragging = false;
            }
        },
        handleCardTouchMove(e) {
            if (e.touches && e.touches.length > 0) {
                const dx = e.touches[0].clientX - this.cardTouchStartX;
                const dy = e.touches[0].clientY - this.cardTouchStartY;
                if (Math.hypot(dx, dy) > 8) {
                    this.cardIsDragging = true;
                }
            }
        },

        handleSwipeStart(e) {
            if (!e.changedTouches || e.changedTouches.length === 0) return;
            this.touchStartX = e.changedTouches[0].clientX;
            this.touchStartY = e.changedTouches[0].clientY;
        },
        handleSwipeEnd(e) {
            if (!e.changedTouches || e.changedTouches.length === 0) return;
            const diffX = e.changedTouches[0].clientX - this.touchStartX;
            const diffY = e.changedTouches[0].clientY - this.touchStartY;
            if (diffX > 100 && Math.abs(diffY) < 50 && Math.abs(diffX) > Math.abs(diffY) * 2 && (this.view === 'editor' || this.view === 'info')) {
                this.goBack();
            }
        },

        openTerritory(id) {
            if (this.cardIsDragging) {
                this.cardIsDragging = false;
                return;
            }
            this.activeTerritory = this.territories.find(t => t.id === id);
            this.view = 'editor';
            this.selectionMode = false;
        },

        toggleTheme() {
            document.documentElement.classList.add('no-theme-transition');
            this.isDark = !this.isDark;
            localStorage.theme = this.isDark ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', this.isDark);
            window.requestAnimationFrame(() => {
                setTimeout(() => {
                    document.documentElement.classList.remove('no-theme-transition');
                }, 50);
            });
        },
        getDateString() {
            const now = new Date();
            const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
            const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
            return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
        },
        formatDate(dateStr) { if (!dateStr) return ''; return new Date(dateStr).toLocaleDateString('it-IT'); },
        formatDateShort(dateStr) { if (!dateStr) return ''; return new Date(dateStr).toLocaleDateString('it-IT'); },
        formatDateTime(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        },

        openNewTerritoryModal() {
            this.forms.territoryName = '';
            this.forms.territoryColor = null;
            this.modals.newTerritory = true;
            if (this.tutorialActive && this.tutorialStep === 1) {
                this.tutorialStep = 2;
            }
        },
        focusAtEnd(el) {
            if (!el) return;
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        },

        colorPalette: ['#a1305b', '#7858a4', '#6081b6', '#50a8b0', '#1f8d52', '#61c18d', '#b4c757', '#be7352', '#ac5655', '#895613'],

        activeCardMenuId: null,
        toggleCardMenu(id) {
            this.activeCardMenuId = this.activeCardMenuId === id ? null : id;
        },
        closeCardMenu() {
            this.activeCardMenuId = null;
        },
        openColorModal(id) {
            this.activeCardMenuId = null;
            this.modals.colorPickerId = id;
        },
        setTerritoryColor(t, color) {
            if (t) t.color = color;
            this.modals.colorPickerId = null;
        },

        submitNewTerritory() {
            if (!this.forms.territoryName) return;
            const newT = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: this.forms.territoryName,
                color: this.forms.territoryColor,
                notes: '',
                addresses: []
            };
            this.territories.push(newT);
            this.filterType = 'all';
            this.modals.newTerritory = false;
            if (this.tutorialActive) {
                this.openTerritory(newT.id);
                this.tutorialStep = 3;
            }
        },
        openTerritory(id) {
            if (this.cardIsDragging) {
                this.cardIsDragging = false;
                return;
            }
            this.activeTerritory = this.territories.find(t => t.id === id);
            this.view = 'editor';
            this.selectionMode = false;
            if (this.tutorialActive && this.tutorialStep <= 2) {
                this.tutorialStep = 3;
            }
        },
        goBack() {
            this.activeTerritory = null;
            this.view = 'dashboard';
            this.selectionMode = false;
            this.activeCardMenuId = null;
        },
        currentTab: 'territori',
        previousView: 'dashboard',
        previousInfoView: 'settings',
        switchTab(tab) {
            this.currentTab = tab;
            if (tab === 'territori') {
                this.view = 'dashboard';
            } else if (tab === 'stats') {
                this.view = 'stats';
            } else if (tab === 'altro') {
                this.openSettings();
            }
        },
        openSettings() {
            if (this.view !== 'settings' && this.view !== 'info') {
                this.previousView = this.view;
            }
            this.currentTab = 'altro';
            this.view = 'settings';
        },
        goBackFromSettings() {
            this.view = this.previousView || 'dashboard';
            this.currentTab = (this.view === 'stats') ? 'stats' : 'territori';
        },
        openInfo() {
            if (this.view !== 'info') {
                this.previousInfoView = this.view;
            }
            this.view = 'info';
        },
        goBackFromInfo() {
            this.view = this.previousInfoView || 'settings';
        },
        countAllAddresses() {
            if (!this.territories || this.territories.length === 0) return 0;
            return this.territories.reduce((sum, t) => sum + (t.addresses ? t.addresses.length : 0), 0);
        },
        countAllAppUnits() {
            if (!this.territories || this.territories.length === 0) return 0;
            return this.territories.reduce((sum, t) => sum + this.countTotalUnits(t), 0);
        },
        getLocalStorageSize() {
            try {
                let total = 0;
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        total += ((localStorage[key].length + key.length) * 2);
                    }
                }
                const mb = (total / (1024 * 1024)).toFixed(2);
                return `${mb} MB`;
            } catch (e) {
                return '0 MB';
            }
        },
        getLocalStoragePercent() {
            try {
                let total = 0;
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        total += ((localStorage[key].length + key.length) * 2);
                    }
                }
                const percent = Math.min(100, Math.round((total / 5242880) * 100));
                return percent;
            } catch (e) {
                return 0;
            }
        },
        formatAppData() {
            localStorage.removeItem('territories');
            localStorage.removeItem('visitLogs');
            localStorage.removeItem('tutorialSeen');
            this.territories = [];
            this.visitLogs = [];
            this.activeTerritory = null;
            this.selectionMode = false;
            this.selectedUnits = [];
            this.modals.resetConfirm = false;
            this.view = 'dashboard';
        },

        confirmDelete(type, id) {
            this.deleteState.type = type; this.deleteState.id = id;
            if (type === 'territory') this.deleteState.targetName = 'questo territorio';
            else if (type === 'address') this.deleteState.targetName = 'questo indirizzo';
            else if (type === 'units') this.deleteState.targetName = `${this.selectedUnits.length} citofoni selezionati`;
            this.modals.deleteConfirm = true;
        },
        executeDelete() {
            const { type, id } = this.deleteState;
            if (type === 'territory') this.territories = this.territories.filter(t => t.id !== id);
            else if (type === 'address') this.activeTerritory.addresses = this.activeTerritory.addresses.filter(a => a.id !== id);
            else if (type === 'units') {
                this.activeTerritory.addresses.forEach(a => {
                    if (a.columnsLayout) {
                        let currentStart = 0;
                        const newLayout = [...a.columnsLayout];
                        a.columnsLayout.forEach((count, colIdx) => {
                            const colUnits = a.units.slice(currentStart, currentStart + count);
                            const removedInThisCol = colUnits.filter(u => this.selectedUnits.includes(u.id)).length;
                            newLayout[colIdx] -= removedInThisCol;
                            currentStart += count;
                        });
                        a.columnsLayout = newLayout;
                    }
                    a.units = a.units.filter(u => !this.selectedUnits.includes(u.id));
                });
                this.selectedUnits = []; this.selectionMode = false;
            }
            this.modals.deleteConfirm = false;
        },
        openNewAddressModal() {
            this.forms.addressName = '';
            this.forms.addressUnits = '';
            this.forms.addressRows = '4';
            this.forms.addressCols = '3';
            this.forms.addressCreationMode = 'simple';
            this.forms.visualRows = 4;
            this.forms.visualCols = 3;
            this.forms.visualSlots = [];
            this.updateVisualGridSlots();
            this.modals.newAddress = true;
        },
        updateVisualGridSlots() {
            const total = this.forms.visualRows * this.forms.visualCols;
            const newSlots = [];
            for (let i = 0; i < total; i++) {
                const existing = this.forms.visualSlots && this.forms.visualSlots[i];
                newSlots.push({ id: i, isHole: existing ? existing.isHole : false });
            }
            this.forms.visualSlots = newSlots;
        },
        addVisualRow() { this.forms.visualRows++; this.updateVisualGridSlots(); },
        removeVisualRow() { if (this.forms.visualRows > 1) { this.forms.visualRows--; this.updateVisualGridSlots(); } },
        addVisualCol() { this.forms.visualCols++; this.updateVisualGridSlots(); },
        removeVisualCol() { if (this.forms.visualCols > 1) { this.forms.visualCols--; this.updateVisualGridSlots(); } },
        toggleVisualSlot(idx) {
            if (this.forms.visualSlots[idx]) {
                this.forms.visualSlots[idx].isHole = !this.forms.visualSlots[idx].isHole;
            }
        },
        getVisualSlotUnitNumber(idx) {
            let activeCount = 0;
            for (let i = 0; i <= idx; i++) {
                if (this.forms.visualSlots[i] && !this.forms.visualSlots[i].isHole) {
                    activeCount++;
                }
            }
            return activeCount;
        },
        countActiveVisualUnits() {
            if (!this.forms.visualSlots) return 0;
            return this.forms.visualSlots.filter(s => !s.isHole).length;
        },
        submitNewAddress() {
            if (!this.forms.addressName) return;

            let units = [];
            let cols = null;

            if (this.forms.addressCreationMode === 'simple') {
                const count = parseInt(this.forms.addressUnits) || 0;
                units = Array.from({ length: count }, () => ({ id: Date.now() + Math.random().toString(), status: 0, note: '' }));
            } else if (this.forms.addressCreationMode === 'grid') {
                const r = parseInt(this.forms.addressRows) || 0;
                const c = parseInt(this.forms.addressCols) || 0;
                const count = r * c;
                cols = c;
                units = Array.from({ length: count }, () => ({ id: Date.now() + Math.random().toString(), status: 0, note: '' }));
            } else if (this.forms.addressCreationMode === 'custom') {
                cols = this.forms.visualCols;
                units = this.forms.visualSlots.map(s => ({
                    id: Date.now() + Math.random().toString(),
                    isHole: s.isHole,
                    status: 0,
                    note: ''
                }));
            }

            this.activeTerritory.addresses.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: this.forms.addressName,
                units: units,
                cols: cols
            });
            this.modals.newAddress = false;
        },
        getUnitsForColumn(addr, colIndex) {
            if (!addr.columnsLayout) return [];
            let start = 0;
            for (let i = 0; i < colIndex; i++) {
                start += addr.columnsLayout[i];
            }
            const count = addr.columnsLayout[colIndex];
            return addr.units.slice(start, start + count).map((u, i) => ({ ...u, globalIndex: start + i }));
        },
        createUnitObject() { return { id: Date.now() + Math.random().toString(), status: 0, note: '' }; },
        addUnit(addressId) {
            const addr = this.activeTerritory.addresses.find(a => a.id === addressId);
            if (addr) {
                addr.units.push(this.createUnitObject());
                if (addr.columnsLayout && addr.columnsLayout.length > 0) {
                    addr.columnsLayout[addr.columnsLayout.length - 1]++;
                }
            }
        },
        toggleSelectionMode() { this.selectionMode = !this.selectionMode; this.selectedUnits = []; },

        isSelected(unitId) { return this.selectedUnits.includes(unitId); },

        handleUnitClick(unit, addr) {
            if (this.longPressTriggered) { this.longPressTriggered = false; return; }
            if (this.selectionMode) {
                if (this.isSelected(unit.id)) this.selectedUnits = this.selectedUnits.filter(id => id !== unit.id);
                else this.selectedUnits.push(unit.id);
            } else {
                if (unit.isHole) {
                    // Tap on Hole -> Reset to Normal Non-Visitato (status 0)
                    unit.isHole = false;
                    unit.status = 0;
                } else if (unit.status === 0) {
                    // Click 1: Fatto (Green, 1)
                    unit.status = 1;
                    this.logVisit(unit.id, addr ? addr.id : null, this.activeTerritory ? this.activeTerritory.id : null, 1);
                } else if (unit.status === 1) {
                    // Click 2: Assente (Red, 2)
                    unit.status = 2;
                    this.logVisit(unit.id, addr ? addr.id : null, this.activeTerritory ? this.activeTerritory.id : null, 2);
                } else if (unit.status === 2) {
                    // Click 3: Spazio Vuoto (isHole: true)
                    unit.isHole = true;
                    unit.status = 0;
                }
                if (addr) addr.lastInteraction = new Date().toISOString();
                if (this.tutorialActive && this.tutorialStep === 3) {
                    if (unit.status === 1) this.testedStates.green = true;
                    if (unit.status === 2) this.testedStates.red = true;
                    if (unit.isHole) this.testedStates.hole = true;

                    if (this.testedStates.green && this.testedStates.red && this.testedStates.hole) {
                        setTimeout(() => {
                            if (this.tutorialActive && this.tutorialStep === 3) {
                                this.tutorialStep = 4;
                            }
                        }, 450);
                    }
                }
            }
        },
        getActiveUnitNumber(addr, unitId, fallbackIndex) {
            if (!addr || !addr.units) return fallbackIndex + 1;
            let activeCount = 0;
            for (let i = 0; i < addr.units.length; i++) {
                const u = addr.units[i];
                if (!u.isHole) {
                    activeCount++;
                }
                if (u.id === unitId) {
                    return activeCount;
                }
            }
            return fallbackIndex + 1;
        },
        getUnitClasses(unit) {
            if (unit.isHole) {
                let holeBase = 'bg-slate-100/40 dark:bg-slate-900/40 text-slate-300 dark:text-slate-700 border border-dashed border-slate-200/80 dark:border-slate-800/80';
                if (this.selectionMode && this.isSelected(unit.id)) {
                    return 'scale-95 ring-4 ring-jw-600 ring-inset opacity-100 ' + holeBase;
                }
                return holeBase;
            }
            let base = '';
            switch (unit.status) {
                case 1: base = 'bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-400 dark:border-emerald-600'; break;
                case 2: base = 'bg-rose-50/90 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-2 border-rose-300 dark:border-rose-700'; break;
                default: base = 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700';
            }
            if (this.selectionMode && this.isSelected(unit.id)) {
                return 'scale-95 ring-4 ring-jw-600 ring-inset opacity-100 ' + base;
            }
            if (this.selectionMode) return 'opacity-60 ' + base;
            return base;
        },
        bulkAction(action) {
            if (this.selectedUnits.length === 0) return;
            if (action === 'hole') {
                this.activeTerritory.addresses.forEach(a => {
                    a.units.forEach(u => {
                        if (this.selectedUnits.includes(u.id)) u.isHole = !u.isHole;
                    });
                });
            } else {
                const targetStatus = action === 'green' ? 1 : (action === 'red' ? 2 : 0);
                this.activeTerritory.addresses.forEach(a => {
                    a.units.forEach(u => {
                        if (this.selectedUnits.includes(u.id)) {
                            u.isHole = false;
                            u.status = targetStatus;
                            if (targetStatus === 1 || targetStatus === 2) {
                                this.logVisit(u.id, a.id, this.activeTerritory.id, targetStatus);
                            }
                        }
                    });
                });
            }
            this.selectedUnits = []; this.selectionMode = false;
        },
        handleTouchStart(unit, addr, e) {
            if (this.selectionMode || unit.isHole) return;
            this.longPressTriggered = false;
            clearTimeout(this.touchTimer);
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
            if (touch) {
                this.touchStartUnitX = touch.clientX;
                this.touchStartUnitY = touch.clientY;
            }
            this.touchTimer = setTimeout(() => {
                this.longPressTriggered = true;
                if (navigator.vibrate) {
                    try { navigator.vibrate(50); } catch (err) { }
                }
                this.openNoteModal(unit, addr);
            }, 600);
        },
        handleTouchMove(e) {
            if (!this.touchTimer) return;
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
            if (touch) {
                const dx = touch.clientX - this.touchStartUnitX;
                const dy = touch.clientY - this.touchStartUnitY;
                if (Math.hypot(dx, dy) > 8) {
                    clearTimeout(this.touchTimer);
                    this.touchTimer = null;
                }
            }
        },
        handleTouchEnd(e) {
            clearTimeout(this.touchTimer);
            this.touchTimer = null;
        },
        handleNoteLongPress(unit, addr, e) {
            if (this.selectionMode || unit.isHole) return;
            this.longPressTriggered = true;
            this.openNoteModal(unit, addr);
        },
        openNoteModal(unit, addr) {
            this.currentEditingUnit = { unit, addr };
            this.forms.noteText = unit.note || '';
            this.modals.note = true;
        },
        handleCardClick(t, e) {
            this.openTerritory(t.id);
        },

        closeNoteModal() { this.modals.note = false; this.currentEditingUnit = null; },
        saveNote() {
            if (this.currentEditingUnit) {
                this.currentEditingUnit.unit.note = this.forms.noteText;
                this.currentEditingUnit.addr.lastInteraction = new Date().toISOString();
            }
            this.closeNoteModal();
            if (this.tutorialActive && this.tutorialStep === 4) {
                this.tutorialActive = false;
                this.tutorialStep = 0;
                localStorage.setItem('tutorialSeen', 'true');
                setTimeout(() => {
                    this.modals.tutorialComplete = true;
                }, 300);
            }
        },
        promptRenameTerritory(t) {
            const newName = prompt("Modifica il nome del territorio:", t.name);
            if (newName && newName.trim()) {
                t.name = newName.trim();
            }
        },
        promptRenameAddress(addr) {
            const newName = prompt("Modifica nome indirizzo:", addr.name);
            if (newName && newName.trim()) {
                addr.name = newName.trim();
            }
        },
        deleteCurrentEditingUnit() {
            if (this.currentEditingUnit && this.currentEditingUnit.addr && this.currentEditingUnit.unit) {
                const { addr, unit } = this.currentEditingUnit;
                if (addr.columnsLayout) {
                    let currentStart = 0;
                    const newLayout = [...addr.columnsLayout];
                    addr.columnsLayout.forEach((count, colIdx) => {
                        const colUnits = addr.units.slice(currentStart, currentStart + count);
                        if (colUnits.some(u => u.id === unit.id)) {
                            newLayout[colIdx] = Math.max(0, newLayout[colIdx] - 1);
                        }
                        currentStart += count;
                    });
                    addr.columnsLayout = newLayout;
                }
                addr.units = addr.units.filter(u => u.id !== unit.id);
            }
            this.closeNoteModal();
        },

        calculateGlobalStats() {
            let totalUnits = 0;
            let green = 0;
            let red = 0;
            let inProgress = 0;
            let completed = 0;
            let notStarted = 0;

            this.territories.forEach(t => {
                const s = this.calculateStats(t);
                if (s.percent === 100 && s.total > 0) completed++;
                else if (s.percent > 0) inProgress++;
                else notStarted++;

                totalUnits += s.total;
                green += s.green;
                red += s.red;
            });

            const completedUnits = green + red;
            const neutral = totalUnits - completedUnits;
            const percent = totalUnits === 0 ? 0 : Math.round((completedUnits / totalUnits) * 100);

            return {
                percent,
                totalUnits,
                completedUnits,
                green,
                red,
                neutral,
                totalTerritories: this.territories.length,
                inProgress,
                completed,
                notStarted,
                totalAddresses: this.countAllAddresses()
            };
        },

        getStatsPercent(type) {
            const stats = this.calculateGlobalStats();
            if (type === 'completed') {
                return stats.totalTerritories === 0 ? 0 : Math.round((stats.completed / stats.totalTerritories) * 100);
            }
            if (type === 'in_progress') {
                return stats.totalTerritories === 0 ? 0 : Math.round((stats.inProgress / stats.totalTerritories) * 100);
            }
            if (type === 'red') {
                return stats.totalUnits === 0 ? 0 : Math.round((stats.red / stats.totalUnits) * 100);
            }
            if (type === 'neutral') {
                return stats.totalUnits === 0 ? 0 : Math.round((stats.neutral / stats.totalUnits) * 100);
            }
            return 0;
        },

        getDonutSegments() {
            const stats = this.calculateGlobalStats();
            const total = stats.totalTerritories;
            const circumference = 2 * Math.PI * 38; // ~238.76
            if (total === 0) {
                return {
                    circumference,
                    compDash: '0',
                    inProgDash: '0',
                    compOffset: '0',
                    inProgOffset: '0',
                    empty: true
                };
            }
            const compRatio = stats.completed / total;
            const inProgRatio = stats.inProgress / total;
            const compLen = compRatio * circumference;
            const inProgLen = inProgRatio * circumference;

            return {
                circumference,
                compDash: `${compLen.toFixed(1)} ${circumference.toFixed(1)}`,
                inProgDash: `${inProgLen.toFixed(1)} ${circumference.toFixed(1)}`,
                inProgOffset: (-compLen).toFixed(1),
                empty: false
            };
        },

        logVisit(unitId, addressId, territoryId, status) {
            if (status === 1 || status === 2) {
                const now = Date.now();
                this.visitLogs.push({
                    id: now.toString() + Math.random().toString(36).substr(2, 4),
                    timestamp: now,
                    status: status,
                    unitId: unitId,
                    addressId: addressId,
                    territoryId: territoryId
                });
                if (this.visitLogs.length > 1000) {
                    this.visitLogs = this.visitLogs.slice(-1000);
                }
            }
        },

        seedInitialVisitLogs() {
            if (this.visitLogs && this.visitLogs.length > 0) return;
            const now = Date.now();
            const seeded = [];
            if (this.territories) {
                this.territories.forEach((t, tIdx) => {
                    if (t.addresses) {
                        t.addresses.forEach((a, aIdx) => {
                            if (a.units) {
                                a.units.forEach((u, uIdx) => {
                                    if (u.status === 1 || u.status === 2) {
                                        const offsetDays = (tIdx * 3 + aIdx * 2 + uIdx) % 6;
                                        const ts = now - offsetDays * 86400000;
                                        seeded.push({
                                            id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
                                            timestamp: ts,
                                            status: u.status,
                                            unitId: u.id,
                                            addressId: a.id,
                                            territoryId: t.id
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
            this.visitLogs = seeded;
        },

        getTimeRangeLabel(rangeId) {
            const opt = this.timeRangeOptions.find(o => o.id === rangeId);
            return opt ? opt.label : 'Ultimi 7 giorni';
        },

        getVisitChartData() {
            const now = new Date();
            let buckets = [];
            const range = this.statsTimeRange || '7d';

            if (range === '7d' || range === '14d') {
                const numDays = range === '7d' ? 7 : 14;
                const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
                for (let i = numDays - 1; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    d.setHours(0, 0, 0, 0);
                    const nextD = new Date(d);
                    nextD.setDate(d.getDate() + 1);

                    const startTs = d.getTime();
                    const endTs = nextD.getTime();

                    const dayLogs = this.visitLogs.filter(l => l.timestamp >= startTs && l.timestamp < endTs);
                    const green = dayLogs.filter(l => l.status === 1).length;
                    const red = dayLogs.filter(l => l.status === 2).length;
                    const count = dayLogs.length;

                    buckets.push({
                        date: d,
                        label: dayNames[d.getDay()],
                        fullDate: `${d.getDate()}/${d.getMonth() + 1}`,
                        count,
                        green,
                        red
                    });
                }
            } else if (range === '30d' || range === 'all') {
                const numBuckets = 7;
                const totalDays = 30;
                const daysPerBucket = Math.ceil(totalDays / numBuckets);
                for (let i = numBuckets - 1; i >= 0; i--) {
                    const dStart = new Date();
                    dStart.setDate(now.getDate() - (i + 1) * daysPerBucket);
                    dStart.setHours(0, 0, 0, 0);
                    const dEnd = new Date();
                    dEnd.setDate(now.getDate() - i * daysPerBucket);
                    dEnd.setHours(23, 59, 59, 999);

                    const startTs = dStart.getTime();
                    const endTs = dEnd.getTime();

                    const bucketLogs = this.visitLogs.filter(l => l.timestamp >= startTs && l.timestamp <= endTs);
                    buckets.push({
                        label: `${dEnd.getDate()}/${dEnd.getMonth() + 1}`,
                        fullDate: `${dStart.getDate()}/${dStart.getMonth() + 1} - ${dEnd.getDate()}/${dEnd.getMonth() + 1}`,
                        count: bucketLogs.length,
                        green: bucketLogs.filter(l => l.status === 1).length,
                        red: bucketLogs.filter(l => l.status === 2).length
                    });
                }
            } else if (range === 'month') {
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const intervals = [
                    { start: 1, end: 7, label: '1-7' },
                    { start: 8, end: 14, label: '8-14' },
                    { start: 15, end: 21, label: '15-21' },
                    { start: 22, end: 28, label: '22-28' },
                    { start: 29, end: daysInMonth, label: `29-${daysInMonth}` }
                ];
                intervals.forEach(inv => {
                    const dStart = new Date(currentYear, currentMonth, inv.start, 0, 0, 0, 0);
                    const dEnd = new Date(currentYear, currentMonth, inv.end, 23, 59, 59, 999);
                    const startTs = dStart.getTime();
                    const endTs = dEnd.getTime();
                    const bucketLogs = this.visitLogs.filter(l => l.timestamp >= startTs && l.timestamp <= endTs);
                    buckets.push({
                        label: inv.label,
                        fullDate: `${inv.label} ${now.toLocaleString('it-IT', { month: 'short' })}`,
                        count: bucketLogs.length,
                        green: bucketLogs.filter(l => l.status === 1).length,
                        red: bucketLogs.filter(l => l.status === 2).length
                    });
                });
            }

            // Y Scale calculation
            const maxCount = Math.max(...buckets.map(b => b.count), 0);
            let yScaleMax = 10;
            if (maxCount > 10) {
                yScaleMax = Math.ceil(maxCount / 5) * 5;
            }

            const yLabels = [
                yScaleMax,
                (yScaleMax * 0.75) % 1 === 0 ? (yScaleMax * 0.75) : (yScaleMax * 0.75).toFixed(1),
                (yScaleMax * 0.5) % 1 === 0 ? (yScaleMax * 0.5) : (yScaleMax * 0.5).toFixed(1),
                (yScaleMax * 0.25) % 1 === 0 ? (yScaleMax * 0.25) : (yScaleMax * 0.25).toFixed(1),
                0
            ];

            // SVG Coordinate generation (Viewbox: 0 0 300 120)
            const N = buckets.length;
            const xStart = 8;
            const xEnd = 292;
            const yTop = 15;
            const yBase = 110;
            const yHeight = yBase - yTop; // 95

            const points = buckets.map((b, i) => {
                const x = N === 1 ? 150 : xStart + (i / (N - 1)) * (xEnd - xStart);
                const y = yScaleMax === 0 ? yBase : yBase - (b.count / yScaleMax) * yHeight;
                return {
                    x,
                    y,
                    count: b.count,
                    green: b.green,
                    red: b.red,
                    label: b.label,
                    fullDate: b.fullDate
                };
            });

            // Curve Path Generation
            let strokePath = '';
            let areaPath = '';
            if (points.length > 0) {
                if (points.length === 1) {
                    strokePath = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
                } else {
                    strokePath = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
                    for (let i = 0; i < points.length - 1; i++) {
                        const p0 = points[Math.max(0, i - 1)];
                        const p1 = points[i];
                        const p2 = points[i + 1];
                        const p3 = points[Math.min(points.length - 1, i + 2)];
                        const cp1x = p1.x + (p2.x - p0.x) / 6;
                        const cp1y = p1.y + (p2.y - p0.y) / 6;
                        const cp2x = p2.x - (p3.x - p1.x) / 6;
                        const cp2y = p2.y - (p3.y - p1.y) / 6;
                        strokePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
                    }
                }
                areaPath = `${strokePath} L ${points[points.length - 1].x.toFixed(1)},120 L ${points[0].x.toFixed(1)},120 Z`;
            }

            return {
                buckets,
                points,
                strokePath,
                areaPath,
                yLabels,
                yScaleMax,
                totalVisits: buckets.reduce((s, b) => s + b.count, 0),
                totalGreen: buckets.reduce((s, b) => s + b.green, 0),
                totalRed: buckets.reduce((s, b) => s + b.red, 0)
            };
        },

        calculateStats(t) {
            if (!t || !t.addresses || t.addresses.length === 0) return { percent: 0, green: 0, red: 0, neutral: 0, total: 0 };
            let total = 0, green = 0, red = 0;
            t.addresses.forEach(a => {
                if (a && a.units) {
                    const valid = a.units.filter(u => !u.isHole);
                    total += valid.length;
                    green += valid.filter(u => u.status === 1).length;
                    red += valid.filter(u => u.status === 2).length;
                }
            });
            const percent = total === 0 ? 0 : Math.round(((green + red) / total) * 100);
            return { percent, green, red, neutral: total - green - red, total };
        },
        calculateAddressStats(addr) {
            if (!addr || !addr.units || addr.units.length === 0) return { percent: 0, green: 0, red: 0, neutral: 0, total: 0 };
            const valid = addr.units.filter(u => !u.isHole);
            const total = valid.length;
            const green = valid.filter(u => u.status === 1).length;
            const red = valid.filter(u => u.status === 2).length;
            const percent = total === 0 ? 0 : Math.round(((green + red) / total) * 100);
            return { percent, green, red, neutral: total - green - red, total };
        },
        countTotalUnits(t) {
            if (!t || !t.addresses) return 0;
            return t.addresses.reduce((acc, a) => {
                if (!a || !a.units) return acc;
                return acc + a.units.filter(u => !u.isHole).length;
            }, 0);
        },
        openFilterModal() {
            this.modals.filterModal = true;
        },
        closeFilterModal() {
            this.modals.filterModal = false;
        },
        resetFilters() {
            this.filters = {
                status: 'all',
                sortBy: 'name_asc',
                minUnits: 0,
                maxUnits: 100,
                hasNotesOnly: false,
                selectedColor: null
            };
            this.filterType = 'all';
        },
        hasActiveFilters() {
            return this.filters.status !== 'all' ||
                   this.filters.sortBy !== 'name_asc' ||
                   this.filters.minUnits > 0 ||
                   this.filters.maxUnits < 100 ||
                   this.filters.hasNotesOnly ||
                   this.filters.selectedColor !== null;
        },
        getRecentActivities() {
            if (!this.territories || this.territories.length === 0) return [];
            return this.territories
                .flatMap((territory) => (territory.addresses || [])
                    .filter((address) => address.lastInteraction)
                    .map((address) => ({ territory, address })))
                .sort((a, b) => new Date(b.address.lastInteraction) - new Date(a.address.lastInteraction))
                .slice(0, 5);
        },
        getFilteredTerritories() {
            return this.territories.filter(t => {
                if (this.searchQuery) {
                    const matchesSearch = t.name.toLowerCase().includes(this.searchQuery.toLowerCase());
                    if (!matchesSearch) return false;
                }

                const stats = this.calculateStats(t);
                const totalUnits = stats.total;
                const isCompleted = stats.percent === 100 && stats.total > 0;
                const isInProgress = stats.percent > 0 && stats.percent < 100;
                const isNotStarted = stats.percent === 0;

                // Pill quick filter
                if (this.filterType === 'in_progress' && !isInProgress) return false;
                if (this.filterType === 'completed' && !isCompleted) return false;

                // Modal status filter
                if (this.filters.status === 'in_progress' && !isInProgress) return false;
                if (this.filters.status === 'completed' && !isCompleted) return false;
                if (this.filters.status === 'not_started' && !isNotStarted) return false;

                // Units range filter
                if (totalUnits < this.filters.minUnits) return false;
                if (this.filters.maxUnits < 100 && totalUnits > this.filters.maxUnits) return false;

                // Color filter
                if (this.filters.selectedColor && t.color !== this.filters.selectedColor) return false;

                // Notes only filter
                if (this.filters.hasNotesOnly) {
                    const hasNote = t.addresses && t.addresses.some(a => a.units && a.units.some(u => u.note && u.note.trim().length > 0));
                    if (!hasNote) return false;
                }

                return true;
            }).sort((a, b) => {
                const statsA = this.calculateStats(a);
                const statsB = this.calculateStats(b);

                if (this.filters.sortBy === 'name_asc') return a.name.localeCompare(b.name);
                if (this.filters.sortBy === 'name_desc') return b.name.localeCompare(a.name);
                if (this.filters.sortBy === 'percent_desc') return statsB.percent - statsA.percent;
                if (this.filters.sortBy === 'percent_asc') return statsA.percent - statsB.percent;
                if (this.filters.sortBy === 'units_desc') return statsB.total - statsA.total;
                if (this.filters.sortBy === 'units_asc') return statsA.total - statsB.total;
                return 0;
            });
        }
    }
}
