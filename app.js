/* ============================================
   DAILY ENGINE — Core Application Logic
   ============================================ */

(function () {
    'use strict';

    // ── Constants ──────────────────────────────────────────────
    const STORAGE_KEY = 'dailyEngine';
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
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Ensure all fields exist
                if (!parsed.schedule) parsed.schedule = getDefaultSchedule();
                if (!parsed.timeBlocks) parsed.timeBlocks = getDefaultTimeBlocks();
                if (!parsed.completions) parsed.completions = {};
                if (!parsed.history) parsed.history = {};
                return parsed;
            }
        } catch (e) {
            console.warn('Failed to load state, using defaults', e);
        }
        return {
            schedule: getDefaultSchedule(),
            timeBlocks: getDefaultTimeBlocks(),
            completions: {},  // { "2026-03-07": { "morning": [true, false, ...], ... } }
            history: {}       // { "2026-03-07": { completed: 5, total: 10 } }
        };
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save state', e);
        }
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
                    <p>No tasks for this block yet.<br>Tap the ✏️ icon to add some!</p>
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
                `;
                item.addEventListener('click', () => {
                    setCompletion(dateStr, selectedBlock, i, !checked);
                    renderToday();
                });
                container.appendChild(item);
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

            // Delete
            const deleteBtn = item.querySelector('.btn-delete-task');
            deleteBtn.addEventListener('click', () => {
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
