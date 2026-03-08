/* ============================================
   DAILY ENGINE — Core Application Logic
   ============================================ */

(function () {
    'use strict';

    // ── Constants ──────────────────────────────────────────────
    const STORAGE_KEY = 'dailyEngine';
    const BACKUP_KEY = 'dailyEngine_backup';
    const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const WEEKENDS = ['saturday', 'sunday'];

    const BLOCKS_WEEKDAY = ['morning', 'workday', 'evening'];
    const BLOCKS_WEEKEND = ['morning', 'free', 'evening'];

    const BLOCK_LABELS = {
        morning: '🌅 Morning',
        workday: '💼 Workday',
        evening: '🌙 Evening',
        free: '🏖️ Free Time'
    };

    // ── Default Data ──────────────────────────────────────────
    function getDefaultSchedule() {
        const weekdayMorning = [
            'Wake up & stretch',
            'Meditate / quiet time',
            'Get kids dressed',
            'Brush teeth (kids + you)',
            'Sunscreen on kids',
            'Prepare water bottles',
            'Healthy breakfast',
            'Pack bags / lunches',
            'Out the door on time'
        ];

        const weekdayWork = [
            'Review emails & messages',
            'Plan top 3 priorities',
            'Deep work block (2 hrs)',
            'Team standup / check-in',
            'Lunch break (step away)',
            'Afternoon focus block',
            'Wrap up & prep for tomorrow'
        ];

        const weekdayEvening = [
            'Pick up / greet kids',
            'Snack & unwind time',
            'Cook dinner',
            'Family dinner together',
            'Kids bath time',
            'Brush teeth & floss (kids)',
            'PJs & bedtime routine',
            'Story time / lights out',
            'Clean up kitchen',
            'Personal wind-down',
            'Plan tomorrow',
            'Lights out for you'
        ];

        const weekendMorning = [
            'Sleep in (a little!)',
            'Get kids dressed',
            'Brush teeth (kids + you)',
            'Sunscreen if going out',
            'Prepare water bottles',
            'Breakfast together'
        ];

        const weekendFree = [
            'Family activity / outing',
            'Grocery run / errands',
            'House chores',
            'Personal project time',
            'Exercise / outdoor time',
            'Lunch'
        ];

        const weekendEvening = [
            'Cook dinner',
            'Family dinner',
            'Kids bath time',
            'Brush teeth & floss (kids)',
            'PJs & bedtime routine',
            'Story time / lights out',
            'Meal prep for the week',
            'Plan the week ahead',
            'Relax / personal time',
            'Lights out'
        ];

        const schedule = {};
        for (const day of DAYS) {
            const isWeekend = WEEKENDS.includes(day);
            schedule[day] = {
                morning: (isWeekend ? weekendMorning : weekdayMorning).map(t => ({ text: t })),
                evening: (isWeekend ? weekendEvening : weekdayEvening).map(t => ({ text: t }))
            };
            if (isWeekend) {
                schedule[day].free = weekendFree.map(t => ({ text: t }));
            } else {
                schedule[day].workday = weekdayWork.map(t => ({ text: t }));
            }
        }
        return schedule;
    }

    function getDefaultTimeBlocks() {
        return {
            morning: { start: '05:00', end: '09:00' },
            workday: { start: '09:00', end: '17:00' },
            evening: { start: '17:00', end: '23:00' },
            free: { start: '09:00', end: '17:00' }
        };
    }

    // ── State ─────────────────────────────────────────────────
    let state = loadState();
    let currentView = 'today';
    let selectedBlock = null;
    let editDay = null;
    let editBlock = null;

    function loadState() {
        // First check if there's a restore payload in the URL hash
        const restored = restoreFromUrl();
        if (restored) return restored;

        // Try primary storage
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return ensureStateFields(parsed);
            }
        } catch (e) {
            console.warn('Primary storage failed, trying backup...', e);
        }

        // Try backup storage
        try {
            const backupRaw = localStorage.getItem(BACKUP_KEY);
            if (backupRaw) {
                const backupData = JSON.parse(backupRaw);
                console.info('Recovered from backup, timestamp:', backupData._backupTime);
                return ensureStateFields(backupData);
            }
        } catch (e) {
            console.warn('Backup storage also failed, using defaults', e);
        }

        return freshState();
    }

    function ensureStateFields(parsed) {
        if (!parsed.schedule) parsed.schedule = getDefaultSchedule();
        if (!parsed.timeBlocks) parsed.timeBlocks = getDefaultTimeBlocks();
        if (!parsed.completions) parsed.completions = {};
        if (!parsed.history) parsed.history = {};
        if (!parsed.archive) parsed.archive = {};
        return parsed;
    }

    function freshState() {
        return {
            schedule: getDefaultSchedule(),
            timeBlocks: getDefaultTimeBlocks(),
            completions: {},
            history: {},
            archive: {}
        };
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            // Also save a redundant backup with timestamp
            const backupCopy = JSON.parse(JSON.stringify(state));
            backupCopy._backupTime = new Date().toISOString();
            localStorage.setItem(BACKUP_KEY, JSON.stringify(backupCopy));
        } catch (e) {
            console.warn('Failed to save state', e);
        }
    }

    // ── URL-based backup/restore ─────────────────────────────
    function restoreFromUrl() {
        try {
            const hash = window.location.hash;
            if (!hash || !hash.startsWith('#backup=')) return null;
            const encoded = hash.substring('#backup='.length);
            const json = decodeURIComponent(atob(encoded));
            const parsed = JSON.parse(json);
            if (parsed.schedule && parsed.timeBlocks) {
                // Clear the hash so it doesn't re-import on refresh
                history.replaceState(null, '', window.location.pathname);
                return ensureStateFields(parsed);
            }
        } catch (e) {
            console.warn('Failed to restore from URL', e);
        }
        return null;
    }

    function generateBackupUrl() {
        // Strip completions/history to keep URL shorter — only schedule, timeBlocks, archive
        const exportData = {
            schedule: state.schedule,
            timeBlocks: state.timeBlocks,
            archive: state.archive
        };
        const json = JSON.stringify(exportData);
        const encoded = btoa(encodeURIComponent(json));
        return window.location.origin + window.location.pathname + '#backup=' + encoded;
    }

    function copyBackupToClipboard() {
        const dataStr = JSON.stringify(state, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(dataStr).then(() => {
                showToast('✅ Backup copied to clipboard!');
            }).catch(() => {
                fallbackCopy(dataStr);
            });
        } else {
            fallbackCopy(dataStr);
        }
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('✅ Backup copied to clipboard!');
    }

    function copyBackupLink() {
        const url = generateBackupUrl();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                showToast('🔗 Backup link copied! Save it somewhere safe.');
            }).catch(() => {
                // Fallback
                fallbackCopy(url);
                showToast('🔗 Backup link copied!');
            });
        } else {
            fallbackCopy(url);
            showToast('🔗 Backup link copied!');
        }
    }

    function showToast(message) {
        // Remove existing toast
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // ── Archive helpers ──────────────────────────────────────
    function getArchive(dayName, block) {
        if (!state.archive[dayName]) state.archive[dayName] = {};
        if (!state.archive[dayName][block]) state.archive[dayName][block] = [];
        return state.archive[dayName][block];
    }

    function archiveTask(dayName, block, task) {
        const archive = getArchive(dayName, block);
        // Don't archive empty tasks or duplicates
        if (task.text && task.text.trim()) {
            const exists = archive.some(t => t.text === task.text);
            if (!exists) {
                archive.push({ text: task.text });
            }
        }
        saveState();
    }

    function restoreFromArchive(dayName, block, index) {
        const archive = getArchive(dayName, block);
        if (index < 0 || index >= archive.length) return;
        const task = archive.splice(index, 1)[0];
        if (!state.schedule[dayName]) state.schedule[dayName] = {};
        if (!state.schedule[dayName][block]) state.schedule[dayName][block] = [];
        state.schedule[dayName][block].push(task);
        saveState();
    }

    // ── Confirm dialog ───────────────────────────────────────
    function showConfirm(message) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-dialog">
                    <p class="confirm-message">${message}</p>
                    <div class="confirm-buttons">
                        <button class="confirm-btn confirm-cancel">Cancel</button>
                        <button class="confirm-btn confirm-yes">Delete</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            // Animate in
            requestAnimationFrame(() => overlay.classList.add('visible'));

            overlay.querySelector('.confirm-cancel').addEventListener('click', () => {
                overlay.classList.remove('visible');
                setTimeout(() => overlay.remove(), 200);
                resolve(false);
            });
            overlay.querySelector('.confirm-yes').addEventListener('click', () => {
                overlay.classList.remove('visible');
                setTimeout(() => overlay.remove(), 200);
                resolve(true);
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('visible');
                    setTimeout(() => overlay.remove(), 200);
                    resolve(false);
                }
            });
        });
    }

    // ── Export / Import ──────────────────────────────────────
    function exportData() {
        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = todayStr();
        a.download = `daily-engine-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (imported.schedule && imported.timeBlocks) {
                        state = imported;
                        if (!state.archive) state.archive = {};
                        if (!state.completions) state.completions = {};
                        if (!state.history) state.history = {};
                        saveState();
                        switchView(currentView); // refresh
                        alert('✅ Backup restored successfully!');
                    } else {
                        alert('❌ Invalid backup file — missing schedule or timeBlocks.');
                    }
                } catch (err) {
                    alert('❌ Could not read file. Make sure it\'s a valid Daily Engine backup.');
                }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    // ── Helpers ───────────────────────────────────────────────
    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function todayDayName() {
        return DAYS[new Date().getDay()];
    }

    function isWeekend(dayName) {
        return WEEKENDS.includes(dayName);
    }

    function getBlocksForDay(dayName) {
        return isWeekend(dayName) ? BLOCKS_WEEKEND : BLOCKS_WEEKDAY;
    }

    function getCurrentBlock() {
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const tb = state.timeBlocks;
        const dayName = todayDayName();
        const blocks = getBlocksForDay(dayName);

        for (const block of blocks) {
            const [sh, sm] = tb[block].start.split(':').map(Number);
            const [eh, em] = tb[block].end.split(':').map(Number);
            const start = sh * 60 + sm;
            const end = eh * 60 + em;
            if (minutes >= start && minutes < end) {
                return block;
            }
        }
        return blocks[0]; // fallback
    }

    function getCompletions(dateStr, block) {
        if (!state.completions[dateStr]) state.completions[dateStr] = {};
        if (!state.completions[dateStr][block]) state.completions[dateStr][block] = [];
        return state.completions[dateStr][block];
    }

    function setCompletion(dateStr, block, index, value) {
        const comps = getCompletions(dateStr, block);
        while (comps.length <= index) comps.push(false);
        comps[index] = value;
        updateHistory(dateStr);
        saveState();
    }

    function updateHistory(dateStr) {
        const dayName = DAYS[new Date(dateStr + 'T12:00:00').getDay()];
        const blocks = getBlocksForDay(dayName);
        let completed = 0;
        let total = 0;
        for (const block of blocks) {
            const tasks = (state.schedule[dayName] && state.schedule[dayName][block]) || [];
            const comps = getCompletions(dateStr, block);
            total += tasks.length;
            for (let i = 0; i < tasks.length; i++) {
                if (comps[i]) completed++;
            }
        }
        state.history[dateStr] = { completed, total };
    }

    // ── Navigation ────────────────────────────────────────────
    const btnToday = document.getElementById('btn-today');
    const btnEdit = document.getElementById('btn-edit');
    const btnStats = document.getElementById('btn-stats');
    const views = {
        today: document.getElementById('view-today'),
        edit: document.getElementById('view-edit'),
        stats: document.getElementById('view-stats')
    };

    function switchView(name) {
        currentView = name;
        Object.values(views).forEach(v => v.classList.remove('active'));
        views[name].classList.add('active');
        [btnToday, btnEdit, btnStats].forEach(b => b.classList.remove('active'));
        if (name === 'today') btnToday.classList.add('active');
        if (name === 'edit') btnEdit.classList.add('active');
        if (name === 'stats') btnStats.classList.add('active');

        if (name === 'today') renderToday();
        if (name === 'edit') renderEdit();
        if (name === 'stats') renderStats();
    }

    btnToday.addEventListener('click', () => switchView('today'));
    btnEdit.addEventListener('click', () => switchView('edit'));
    btnStats.addEventListener('click', () => switchView('stats'));

    // ── TODAY VIEW ────────────────────────────────────────────
    function renderToday() {
        const dateStr = todayStr();
        const dayName = todayDayName();
        const blocks = getBlocksForDay(dayName);
        const currentBlock = getCurrentBlock();

        if (!selectedBlock || !blocks.includes(selectedBlock)) {
            selectedBlock = currentBlock;
        }

        // Date header
        const dateEl = document.getElementById('today-date');
        const d = new Date();
        dateEl.textContent = d.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
        });

        // Time block pills
        const pillRow = document.getElementById('time-block-pills');
        pillRow.innerHTML = '';
        for (const block of blocks) {
            const pill = document.createElement('button');
            pill.className = 'pill' +
                (block === selectedBlock ? ' active' : '') +
                (block === currentBlock ? ' current-indicator' : '');
            pill.dataset.block = block;
            pill.textContent = BLOCK_LABELS[block];
            pill.addEventListener('click', () => {
                selectedBlock = block;
                renderToday();
            });
            pillRow.appendChild(pill);
        }

        // Checklist
        const container = document.getElementById('today-checklist');
        container.innerHTML = '';

        const tasks = (state.schedule[dayName] && state.schedule[dayName][selectedBlock]) || [];
        const comps = getCompletions(dateStr, selectedBlock);

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>No tasks for this block yet.<br>Tap + below to add some!</p>
                </div>
            `;
        } else {
            tasks.forEach((task, i) => {
                const checked = !!comps[i];
                const item = document.createElement('div');
                item.className = 'checklist-item' + (checked ? ' checked' : '');
                item.dataset.block = selectedBlock;
                item.innerHTML = `
                    <div class="custom-checkbox">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <span class="task-text">${escapeHtml(task.text)}</span>
                    <button class="btn-inline-delete" aria-label="Delete task">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                `;
                // Check/uncheck on tap (but not if delete button was tapped)
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-inline-delete')) return;
                    setCompletion(dateStr, selectedBlock, i, !checked);
                    renderToday();
                });
                // Delete task (with confirmation + archive)
                item.querySelector('.btn-inline-delete').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const confirmed = await showConfirm(`Remove "${task.text}" from your routine?`);
                    if (!confirmed) return;
                    // Archive it first
                    archiveTask(dayName, selectedBlock, task);
                    tasks.splice(i, 1);
                    // Also remove the completion entry for this index
                    const c = getCompletions(dateStr, selectedBlock);
                    c.splice(i, 1);
                    updateHistory(dateStr);
                    saveState();
                    renderToday();
                });
                container.appendChild(item);
            });
        }

        // Quick-add button (always visible in Today view)
        const quickAdd = document.createElement('div');
        quickAdd.className = 'quick-add-container';
        quickAdd.innerHTML = `
            <button class="btn-quick-add" id="btn-quick-add-toggle">+ Add Task</button>
            <div class="quick-add-input-row hidden" id="quick-add-row">
                <input type="text" id="quick-add-input" class="quick-add-input" placeholder="What needs to get done?" autocomplete="off">
                <button class="btn-quick-add-confirm" id="btn-quick-add-confirm">Add</button>
            </div>
        `;
        container.appendChild(quickAdd);

        // Quick-add interactions
        const toggleBtn = quickAdd.querySelector('#btn-quick-add-toggle');
        const inputRow = quickAdd.querySelector('#quick-add-row');
        const input = quickAdd.querySelector('#quick-add-input');
        const confirmBtn = quickAdd.querySelector('#btn-quick-add-confirm');

        toggleBtn.addEventListener('click', () => {
            toggleBtn.classList.add('hidden');
            inputRow.classList.remove('hidden');
            input.focus();
        });

        function addQuickTask() {
            const text = input.value.trim();
            if (!text) return;
            // Ensure schedule structure exists
            if (!state.schedule[dayName]) state.schedule[dayName] = {};
            if (!state.schedule[dayName][selectedBlock]) state.schedule[dayName][selectedBlock] = [];
            state.schedule[dayName][selectedBlock].push({ text });
            saveState();
            renderToday();
        }

        confirmBtn.addEventListener('click', addQuickTask);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addQuickTask();
            if (e.key === 'Escape') {
                toggleBtn.classList.remove('hidden');
                inputRow.classList.add('hidden');
            }
        });

        // Archived tasks section
        const archive = getArchive(dayName, selectedBlock);
        if (archive.length > 0) {
            const archiveSection = document.createElement('div');
            archiveSection.className = 'archive-section';
            archiveSection.innerHTML = `
                <button class="archive-toggle" id="archive-toggle">
                    <span class="archive-toggle-icon">▶</span>
                    Archived Tasks (${archive.length})
                </button>
                <div class="archive-list hidden" id="archive-list"></div>
            `;
            container.appendChild(archiveSection);

            const archiveToggle = archiveSection.querySelector('#archive-toggle');
            const archiveList = archiveSection.querySelector('#archive-list');
            const archiveIcon = archiveSection.querySelector('.archive-toggle-icon');

            archiveToggle.addEventListener('click', () => {
                archiveList.classList.toggle('hidden');
                archiveIcon.textContent = archiveList.classList.contains('hidden') ? '▶' : '▼';
            });

            archive.forEach((task, i) => {
                const item = document.createElement('div');
                item.className = 'archive-item';
                item.innerHTML = `
                    <span class="archive-task-text">${escapeHtml(task.text)}</span>
                    <button class="btn-restore" aria-label="Restore task">↩ Restore</button>
                `;
                item.querySelector('.btn-restore').addEventListener('click', () => {
                    restoreFromArchive(dayName, selectedBlock, i);
                    renderToday();
                });
                archiveList.appendChild(item);
            });
        }

        // Progress bar (across ALL blocks for today)
        let totalDone = 0;
        let totalTasks = 0;
        for (const block of blocks) {
            const bTasks = (state.schedule[dayName] && state.schedule[dayName][block]) || [];
            const bComps = getCompletions(dateStr, block);
            totalTasks += bTasks.length;
            for (let i = 0; i < bTasks.length; i++) {
                if (bComps[i]) totalDone++;
            }
        }
        const pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;
        document.getElementById('progress-fill').style.width = pct + '%';
        document.getElementById('progress-label').textContent = `${totalDone} / ${totalTasks}`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── EDIT VIEW ─────────────────────────────────────────────
    function renderEdit() {
        const dayName = todayDayName();
        if (!editDay) editDay = dayName;

        const blocks = getBlocksForDay(editDay);
        if (!editBlock || !blocks.includes(editBlock)) {
            editBlock = blocks[0];
        }

        // Day pills
        const dayPills = document.getElementById('edit-day-pills');
        dayPills.innerHTML = '';
        DAYS.forEach((day, i) => {
            const pill = document.createElement('button');
            pill.className = 'pill' + (day === editDay ? ' active' : '');
            pill.textContent = DAY_LABELS[i];
            pill.addEventListener('click', () => {
                editDay = day;
                editBlock = null; // reset block selection
                renderEdit();
            });
            dayPills.appendChild(pill);
        });

        // Block pills
        const blockPills = document.getElementById('edit-block-pills');
        blockPills.innerHTML = '';
        for (const block of blocks) {
            const pill = document.createElement('button');
            pill.className = 'pill' + (block === editBlock ? ' active' : '');
            pill.dataset.block = block;
            pill.textContent = BLOCK_LABELS[block];
            pill.addEventListener('click', () => {
                editBlock = block;
                renderEdit();
            });
            blockPills.appendChild(pill);
        }

        // Task list
        renderEditTaskList();

        // Time settings
        const tb = state.timeBlocks;
        document.getElementById('time-morning-start').value = tb.morning.start;
        document.getElementById('time-morning-end').value = tb.morning.end;
        document.getElementById('time-workday-start').value = tb.workday.start;
        document.getElementById('time-workday-end').value = tb.workday.end;
        document.getElementById('time-evening-start').value = tb.evening.start;
        document.getElementById('time-evening-end').value = tb.evening.end;
        document.getElementById('time-free-start').value = tb.free.start;
        document.getElementById('time-free-end').value = tb.free.end;

        // Bind time inputs
        const timeInputs = document.querySelectorAll('.time-input');
        timeInputs.forEach(input => {
            // Remove old listeners by cloning
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            newInput.addEventListener('change', () => {
                const id = newInput.id;
                const val = newInput.value;
                if (id === 'time-morning-start') tb.morning.start = val;
                else if (id === 'time-morning-end') tb.morning.end = val;
                else if (id === 'time-workday-start') tb.workday.start = val;
                else if (id === 'time-workday-end') tb.workday.end = val;
                else if (id === 'time-evening-start') tb.evening.start = val;
                else if (id === 'time-evening-end') tb.evening.end = val;
                else if (id === 'time-free-start') tb.free.start = val;
                else if (id === 'time-free-end') tb.free.end = val;
                saveState();
            });
        });

        // Backup buttons
        const exportBtn = document.getElementById('btn-export');
        const importBtn = document.getElementById('btn-import');
        const clipboardBtn = document.getElementById('btn-copy-clipboard');
        const linkBtn = document.getElementById('btn-copy-link');

        // Clone to remove old listeners
        const newExportBtn = exportBtn.cloneNode(true);
        exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
        newExportBtn.addEventListener('click', exportData);

        const newImportBtn = importBtn.cloneNode(true);
        importBtn.parentNode.replaceChild(newImportBtn, importBtn);
        newImportBtn.addEventListener('click', importData);

        const newClipboardBtn = clipboardBtn.cloneNode(true);
        clipboardBtn.parentNode.replaceChild(newClipboardBtn, clipboardBtn);
        newClipboardBtn.addEventListener('click', copyBackupToClipboard);

        const newLinkBtn = linkBtn.cloneNode(true);
        linkBtn.parentNode.replaceChild(newLinkBtn, linkBtn);
        newLinkBtn.addEventListener('click', copyBackupLink);
    }

    function renderEditTaskList() {
        const container = document.getElementById('edit-task-list');
        container.innerHTML = '';

        if (!state.schedule[editDay]) state.schedule[editDay] = {};
        if (!state.schedule[editDay][editBlock]) state.schedule[editDay][editBlock] = [];

        const tasks = state.schedule[editDay][editBlock];

        tasks.forEach((task, i) => {
            const item = document.createElement('div');
            item.className = 'edit-task-item';
            item.draggable = true;
            item.dataset.index = i;
            item.innerHTML = `
                <span class="drag-handle">⠿</span>
                <input type="text" value="${escapeAttr(task.text)}" placeholder="Task name...">
                <button class="btn-delete-task" aria-label="Delete task">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;

            // Edit task text
            const input = item.querySelector('input');
            input.addEventListener('input', () => {
                tasks[i].text = input.value;
                saveState();
            });

            // Delete (with confirmation + archive)
            const deleteBtn = item.querySelector('.btn-delete-task');
            deleteBtn.addEventListener('click', async () => {
                const taskText = tasks[i].text || '(empty task)';
                const confirmed = await showConfirm(`Remove "${taskText}" from your routine?`);
                if (!confirmed) return;
                archiveTask(editDay, editBlock, tasks[i]);
                tasks.splice(i, 1);
                saveState();
                renderEditTaskList();
            });

            // Drag & drop
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', i);
                item.style.opacity = '0.4';
            });
            item.addEventListener('dragend', () => {
                item.style.opacity = '1';
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                item.style.borderTop = '2px solid var(--accent-workday)';
            });
            item.addEventListener('dragleave', () => {
                item.style.borderTop = '';
            });
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.style.borderTop = '';
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = i;
                if (fromIndex !== toIndex) {
                    const [moved] = tasks.splice(fromIndex, 1);
                    tasks.splice(toIndex, 0, moved);
                    saveState();
                    renderEditTaskList();
                }
            });

            container.appendChild(item);
        });

        // Re-bind add button
        const addBtn = document.getElementById('btn-add-task');
        const newAddBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newAddBtn, addBtn);
        newAddBtn.addEventListener('click', () => {
            tasks.push({ text: '' });
            saveState();
            renderEditTaskList();
            // Focus the new input
            setTimeout(() => {
                const inputs = container.querySelectorAll('input[type="text"]');
                if (inputs.length > 0) inputs[inputs.length - 1].focus();
            }, 50);
        });

        // Archive section in edit view
        const archive = getArchive(editDay, editBlock);
        if (archive.length > 0) {
            const archiveSection = document.createElement('div');
            archiveSection.className = 'archive-section';
            archiveSection.innerHTML = `
                <button class="archive-toggle">
                    <span class="archive-toggle-icon">▶</span>
                    Archived Tasks (${archive.length})
                </button>
                <div class="archive-list hidden"></div>
            `;
            container.appendChild(archiveSection);

            const archiveToggle = archiveSection.querySelector('.archive-toggle');
            const archiveList = archiveSection.querySelector('.archive-list');
            const archiveIcon = archiveSection.querySelector('.archive-toggle-icon');

            archiveToggle.addEventListener('click', () => {
                archiveList.classList.toggle('hidden');
                archiveIcon.textContent = archiveList.classList.contains('hidden') ? '▶' : '▼';
            });

            archive.forEach((task, i) => {
                const item = document.createElement('div');
                item.className = 'archive-item';
                item.innerHTML = `
                    <span class="archive-task-text">${escapeHtml(task.text)}</span>
                    <button class="btn-restore" aria-label="Restore task">↩ Restore</button>
                `;
                item.querySelector('.btn-restore').addEventListener('click', () => {
                    restoreFromArchive(editDay, editBlock, i);
                    renderEditTaskList();
                });
                archiveList.appendChild(item);
            });
        }
    }

    function escapeAttr(str) {
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ── STATS VIEW ────────────────────────────────────────────
    function renderStats() {
        const container = document.getElementById('stats-content');
        container.innerHTML = '';

        const dateStr = todayStr();
        const dayName = todayDayName();
        const blocks = getBlocksForDay(dayName);

        // Today's stats
        let todayDone = 0;
        let todayTotal = 0;
        for (const block of blocks) {
            const tasks = (state.schedule[dayName] && state.schedule[dayName][block]) || [];
            const comps = getCompletions(dateStr, block);
            todayTotal += tasks.length;
            for (let i = 0; i < tasks.length; i++) {
                if (comps[i]) todayDone++;
            }
        }
        const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

        // Per-block stats
        let blockStatsHtml = '';
        for (const block of blocks) {
            const tasks = (state.schedule[dayName] && state.schedule[dayName][block]) || [];
            const comps = getCompletions(dateStr, block);
            let done = 0;
            for (let i = 0; i < tasks.length; i++) {
                if (comps[i]) done++;
            }
            const colorClass = block === 'morning' ? 'orange' : block === 'workday' ? 'blue' : block === 'evening' ? 'purple' : 'green';
            blockStatsHtml += `
                <div class="stat-card">
                    <h3>${BLOCK_LABELS[block]}</h3>
                    <div class="stat-value ${colorClass}">${done} / ${tasks.length}</div>
                    <div class="stat-sub">${tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0}% complete</div>
                </div>
            `;
        }

        // 7-day streak
        let streakHtml = '';
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0');
            const h = state.history[ds];
            const isToday = i === 0;
            let cls = '';
            let label = DAY_LABELS[d.getDay()].charAt(0);
            if (h && h.total > 0) {
                const pct = h.completed / h.total;
                if (pct >= 1) cls = 'completed';
                else if (pct > 0) cls = 'partial';
            }
            if (isToday) cls += ' today';
            streakHtml += `<div class="streak-dot ${cls}">${label}</div>`;
        }

        container.innerHTML = `
            <div class="stat-card">
                <h3>Today's Progress</h3>
                <div class="stat-value green">${todayPct}%</div>
                <div class="stat-sub">${todayDone} of ${todayTotal} tasks completed</div>
            </div>
            ${blockStatsHtml}
            <div class="stat-card">
                <h3>Last 7 Days</h3>
                <div class="streak-row">${streakHtml}</div>
                <div class="stat-sub" style="margin-top: 10px">🟢 = 100% &nbsp; 🟡 = partial &nbsp; ⬛ = no data</div>
            </div>
        `;
    }

    // ── Daily Reset ───────────────────────────────────────────
    function cleanupOldCompletions() {
        const keep = 14; // keep 14 days of data
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - keep);
        const cutoffStr = cutoff.getFullYear() + '-' +
            String(cutoff.getMonth() + 1).padStart(2, '0') + '-' +
            String(cutoff.getDate()).padStart(2, '0');

        for (const key of Object.keys(state.completions)) {
            if (key < cutoffStr) delete state.completions[key];
        }
        for (const key of Object.keys(state.history)) {
            if (key < cutoffStr) delete state.history[key];
        }
        saveState();
    }

    // ── Boot ──────────────────────────────────────────────────
    function init() {
        cleanupOldCompletions();
        switchView('today');

        // Update every minute to handle time block transitions
        setInterval(() => {
            if (currentView === 'today') {
                renderToday();
            }
        }, 60000);
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.warn('SW registration failed:', err);
        });
    }

    init();
})();
