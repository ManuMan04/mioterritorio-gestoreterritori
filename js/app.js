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
        sortableTerritories: null,
        sortableAddresses: null,
        forms: { territoryName: '', territoryColor: null, addressName: '', addressUnits: '', noteText: '' },
        currentEditingUnit: null,
        touchTimer: null,
        longPressTriggered: false,
        touchStartX: 0,

        initApp() {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                this.isDark = true;
            }
            // Apply dark class to html element for Tailwind classes to work
            document.documentElement.classList.toggle('dark', this.isDark);

            const stored = localStorage.getItem('territories');
            if (stored) this.territories = JSON.parse(stored);
            this.$watch('territories', (val) => localStorage.setItem('territories', JSON.stringify(val)));
            this.$watch('isDark', (val) => {
                localStorage.theme = val ? 'dark' : 'light';
                document.documentElement.classList.toggle('dark', val);
            });
            this.$watch('view', (val) => {
                if (val === 'dashboard') this.$nextTick(() => this.initSortableTerritories());
                else if (val === 'editor') this.$nextTick(() => this.initSortableAddresses());
            });
            this.$nextTick(() => this.initSortableTerritories());
        },

        handleSwipeStart(e) { this.touchStartX = e.changedTouches[0].screenX; },
        handleSwipeEnd(e) {
            const diffX = e.changedTouches[0].screenX - this.touchStartX;
            if (diffX > 100 && this.view === 'editor') this.goBack();
        },

        toggleTheme() { this.isDark = !this.isDark; },
        getDateString() { return new Date().toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' }); },
        formatDate(dateStr) { if (!dateStr) return ''; return new Date(dateStr).toLocaleDateString('it-IT'); },
        formatDateShort(dateStr) { if (!dateStr) return ''; return new Date(dateStr).toLocaleDateString('it-IT'); },
        initSortableTerritories() {
            const el = document.getElementById('territory-list');

            if (!el || this.view !== 'dashboard') return;
            if (this.sortableTerritories) this.sortableTerritories.destroy();

            const grid = el.querySelector('.grid');
            if (!grid) return;

            this.sortableTerritories = new Sortable(grid, {
                draggable: '.group', animation: 150, ghostClass: 'sortable-ghost', delay: 200, delayOnTouchOnly: true, touchStartThreshold: 3, fallbackTolerance: 3,
                onEnd: (evt) => {
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;


                    if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;

                    // --- REVERT DOM MOVE ---
                    // This is crucial: we undo Sortable's manual DOM movement 
                    // and let AlpineJS re-render the list based on the new state.
                    const parent = evt.from;
                    const item = evt.item;
                    // Move the DOM element back to its original position
                    if (newIndex > oldIndex) {
                        parent.insertBefore(item, parent.children[oldIndex]);
                    } else {
                        parent.insertBefore(item, parent.children[oldIndex + 1] || null);
                    }

                    // --- UPDATE ALPINE STATE ---
                    const currentList = Alpine.raw(this.territories);
                    const newList = [...currentList];
                    const [movedItem] = newList.splice(oldIndex, 1);
                    newList.splice(newIndex, 0, movedItem);

                    // This will trigger Alpine's reactivity and render the list in the correct order
                    this.territories = newList;

                }
            });
        },

        initSortableAddresses() {
            const el = document.getElementById('address-list');

            if (!el || this.view !== 'editor') return;
            if (this.sortableAddresses) this.sortableAddresses.destroy();

            const list = el.querySelector('.space-y-4') || el; // Support both cases
            this.sortableAddresses = new Sortable(list, {
                draggable: '.group', animation: 150, ghostClass: 'sortable-ghost', delay: 200, delayOnTouchOnly: true, touchStartThreshold: 3, fallbackTolerance: 3,
                onEnd: (evt) => {
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;


                    if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
                    if (!this.activeTerritory || !this.activeTerritory.addresses) return;

                    // Revert DOM move for address list too
                    const parent = evt.from;
                    const item = evt.item;
                    if (newIndex > oldIndex) {
                        parent.insertBefore(item, parent.children[oldIndex]);
                    } else {
                        parent.insertBefore(item, parent.children[oldIndex + 1] || null);
                    }

                    const currentList = Alpine.raw(this.activeTerritory.addresses);
                    const newList = [...currentList];

                    const [movedItem] = newList.splice(oldIndex, 1);
                    newList.splice(newIndex, 0, movedItem);

                    this.activeTerritory.addresses = newList;

                }
            });
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
            this.modals.colorPickerId = null; // Close picker after selection
        },

        submitNewTerritory() {
            if (!this.forms.territoryName.trim()) return;
            this.territories.push({
                id: Date.now().toString(),
                name: this.forms.territoryName,
                notes: '',
                expiration: null,
                addresses: [],
                color: this.forms.territoryColor
            });
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
                this.activeTerritory.addresses.forEach(a => a.units = a.units.filter(u => !this.selectedUnits.includes(u.id)));
                this.selectedUnits = []; this.selectionMode = false;
            }
            this.modals.deleteConfirm = false;
        },
        openNewAddressModal() { this.forms.addressName = ''; this.forms.addressUnits = ''; this.modals.newAddress = true; },
        submitNewAddress() {
            if (!this.forms.addressName.trim()) return;
            const count = parseInt(this.forms.addressUnits) || 0;
            const units = Array.from({ length: count }, () => ({ id: Date.now() + Math.random().toString(), status: 0, note: '' }));
            this.activeTerritory.addresses.push({ id: Date.now().toString(), name: this.forms.addressName, units: units });
            this.modals.newAddress = false;
        },
        createUnitObject() { return { id: Date.now() + Math.random().toString(), status: 0, note: '' }; },
        addUnit(addressId) {
            const addr = this.activeTerritory.addresses.find(a => a.id === addressId);
            if (addr) addr.units.push(this.createUnitObject());
        },
        toggleSelectionMode() { this.selectionMode = !this.selectionMode; this.selectedUnits = []; },

        isSelected(unitId) { return this.selectedUnits.includes(unitId); },

        handleUnitClick(unit) {
            if (this.longPressTriggered) { this.longPressTriggered = false; return; }
            if (this.selectionMode) {
                if (this.isSelected(unit.id)) this.selectedUnits = this.selectedUnits.filter(id => id !== unit.id);
                else this.selectedUnits.push(unit.id);
            } else {
                if (unit.status === 0) unit.status = 1; else if (unit.status === 1) unit.status = 2; else unit.status = 0;
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
        handleTouchStart(unit, e) {
            if (this.selectionMode) return;
            this.longPressTriggered = false;
            this.touchTimer = setTimeout(() => {
                this.longPressTriggered = true; if (navigator.vibrate) navigator.vibrate(50);
                this.openNoteModal(unit);
            }, 500);
        },
        handleTouchEnd(e) { clearTimeout(this.touchTimer); },
        openNoteModal(unit) { this.currentEditingUnit = unit; this.forms.noteText = unit.note || ''; this.modals.note = true; },
        closeNoteModal() { this.modals.note = false; this.currentEditingUnit = null; },
        saveNote() { if (this.currentEditingUnit) this.currentEditingUnit.note = this.forms.noteText; this.closeNoteModal(); },

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
            return { percent, green, red, neutral: total - green - red };
        },
        countTotalUnits(t) {
            if (!t || !t.addresses) return 0;
            return t.addresses.reduce((acc, a) => acc + (a && a.units ? a.units.length : 0), 0);
        }
    }
}
