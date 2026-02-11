function territoryApp() {
    return {
        view: 'dashboard',
        isDark: false,
        territories: [],
        activeTerritory: null,
        selectionMode: false,
        selectedUnits: [],
        modals: { newTerritory: false, newAddress: false, note: false, deleteConfirm: false, colorPickerId: null },
        deleteState: { type: null, id: null, targetName: '' },
        forms: { territoryName: '', territoryColor: null, addressName: '', addressUnits: '', addressRows: '', addressCols: '', addressCreationMode: 'simple', customCols: [], noteText: '' },
        currentEditingUnit: null,
        touchTimer: null,
        longPressTriggered: false,
        touchStartX: 0,
        isUpdatingAddresses: false,
        searchQuery: '',
        filterType: 'all',

        initApp() {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                this.isDark = true;
            }
            // Apply dark class to html element
            document.documentElement.classList.toggle('dark', this.isDark);

            const stored = localStorage.getItem('territories');
            if (stored) this.territories = JSON.parse(stored);
            this.$watch('territories', (val) => localStorage.setItem('territories', JSON.stringify(val)));
            this.$watch('isDark', (val) => {
                localStorage.theme = val ? 'dark' : 'light';
                document.documentElement.classList.toggle('dark', val);
            });
            this.$watch('view', (val) => {
                // Helper for infinite scroll or similar
            });
        },

        handleSwipeStart(e) { this.touchStartX = e.changedTouches[0].screenX; },
        handleSwipeEnd(e) {
            const diffX = e.changedTouches[0].screenX - this.touchStartX;
            if (diffX > 100 && (this.view === 'editor' || this.view === 'info')) this.goBack();
        },

        toggleTheme() { this.isDark = !this.isDark; },
        getDateString() { return new Date().toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' }); },
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

        setTerritoryColor(t, color) {
            t.color = color;
            this.modals.colorPickerId = null; // Close picker
        },

        submitNewTerritory() {
            if (!this.forms.territoryName) return;
            const newT = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: this.forms.territoryName,
                color: this.forms.territoryColor,
                expiration: '',
                notes: '',
                addresses: []
            };
            this.territories.push(newT);
            this.filterType = 'all';
            this.modals.newTerritory = false;
        },
        openTerritory(id) {
            this.activeTerritory = this.territories.find(t => t.id === id);
            this.view = 'editor';
            this.selectionMode = false;
        },
        goBack() {
            this.activeTerritory = null;
            this.view = 'dashboard';
            this.selectionMode = false;
        },
        openInfo() {
            this.view = 'info';
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
            this.forms.addressRows = '';
            this.forms.addressCols = '';
            this.forms.addressCreationMode = 'simple';
            this.forms.customCols = [];
            this.modals.newAddress = true;
        },
        submitNewAddress() {
            if (!this.forms.addressName) return;

            let count = 0;
            let cols = null;
            let columnsLayout = null;

            if (this.forms.addressCreationMode === 'simple') {
                count = parseInt(this.forms.addressUnits) || 0;
            } else if (this.forms.addressCreationMode === 'grid') {
                const r = parseInt(this.forms.addressRows) || 0;
                const c = parseInt(this.forms.addressCols) || 0;
                count = r * c;
                cols = c;
            } else if (this.forms.addressCreationMode === 'custom') {
                columnsLayout = this.forms.customCols.map(val => parseInt(val) || 0);
                count = columnsLayout.reduce((acc, val) => acc + val, 0);
                cols = columnsLayout.length;
            }

            const units = Array.from({ length: count }, () => ({ id: Date.now() + Math.random().toString(), status: 0, note: '' }));
            this.activeTerritory.addresses.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: this.forms.addressName,
                units: units,
                cols: cols,
                columnsLayout: columnsLayout
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
                if (unit.status === 0) unit.status = 1; else if (unit.status === 1) unit.status = 2; else unit.status = 0;
                if (addr) addr.lastInteraction = new Date().toISOString();
            }
        },
        getUnitClasses(unit) {
            let base = '';
            switch (unit.status) {
                case 1: base = 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-2 border-green-300 dark:border-green-800'; break;
                case 2: base = 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-2 border-red-300 dark:border-red-800'; break;
                default: base = 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700';
            }
            if (this.selectionMode && this.isSelected(unit.id)) {
                return 'scale-95 ring-4 ring-jw-600 ring-inset opacity-100 ' + base;
            }
            if (this.selectionMode) return 'opacity-60 ' + base;
            return base;
        },
        bulkAction(action) {
            if (this.selectedUnits.length === 0) return;
            const targetStatus = action === 'green' ? 1 : 2;
            this.activeTerritory.addresses.forEach(a => {
                a.units.forEach(u => { if (this.selectedUnits.includes(u.id)) u.status = targetStatus; });
            });
            this.selectedUnits = []; this.selectionMode = false;
        },
        handleTouchStart(unit, addr, e) {
            if (this.selectionMode) return;
            this.longPressTriggered = false;
            clearTimeout(this.touchTimer);
            this.touchTimer = setTimeout(() => {
                this.longPressTriggered = true;
                if (navigator.vibrate) {
                    try { navigator.vibrate(50); } catch (err) { }
                }
                this.openNoteModal(unit, addr);
            }, 600);
        },
        handleTouchEnd(e) {
            clearTimeout(this.touchTimer);
        },
        handleNoteLongPress(unit, addr, e) {
            if (this.selectionMode) return;
            this.longPressTriggered = true;
            this.openNoteModal(unit, addr);
        },
        openNoteModal(unit, addr) {
            this.currentEditingUnit = { unit, addr };
            this.forms.noteText = unit.note || '';
            this.modals.note = true;
        },
        closeNoteModal() { this.modals.note = false; this.currentEditingUnit = null; },
        saveNote() {
            if (this.currentEditingUnit) {
                this.currentEditingUnit.unit.note = this.forms.noteText;
                this.currentEditingUnit.addr.lastInteraction = new Date().toISOString();
            }
            this.closeNoteModal();
        },

        calculateGlobalStats() {
            let totalUnits = 0;
            let completedUnits = 0;

            this.territories.forEach(t => {
                if (t.addresses) {
                    t.addresses.forEach(a => {
                        if (a.units) {
                            totalUnits += a.units.length;
                            completedUnits += a.units.filter(u => u.status !== 0).length;
                        }
                    });
                }
            });

            const remaining = totalUnits - completedUnits;
            const percent = totalUnits === 0 ? 0 : Math.round((completedUnits / totalUnits) * 100);

            return { percent, remaining, total: totalUnits };
        },

        calculateStats(t) {
            if (!t || !t.addresses || t.addresses.length === 0) return { percent: 0, green: 0, red: 0, neutral: 0 };
            let total = 0, green = 0, red = 0;
            t.addresses.forEach(a => {
                if (a && a.units) {
                    total += a.units.length;
                    green += a.units.filter(u => u.status === 1).length;
                    red += a.units.filter(u => u.status === 2).length;
                }
            });
            const percent = total === 0 ? 0 : Math.round(((green + red) / total) * 100);
            return { percent, green, red, neutral: total - green - red, total };
        },
        countTotalUnits(t) {
            if (!t || !t.addresses) return 0;
            return t.addresses.reduce((acc, a) => acc + (a && a.units ? a.units.length : 0), 0);
        },
        getFilteredTerritories() {
            return this.territories.filter(t => {
                // Filter logic
                const matchesSearch = t.name.toLowerCase().includes(this.searchQuery.toLowerCase());
                if (!matchesSearch) return false;

                const stats = this.calculateStats(t);
                const isCompleted = stats.percent === 100 && stats.total > 0;
                const isInProgress = stats.percent > 0 && stats.percent < 100;

                let isExpired = false;
                if (t.expiration) {
                    const expDate = new Date(t.expiration);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    isExpired = expDate < today;
                }

                if (this.filterType === 'in_progress') return isInProgress;
                if (this.filterType === 'completed') return isCompleted;
                if (this.filterType === 'expired') return isExpired;

                return true;
            });
        }
    }
}
