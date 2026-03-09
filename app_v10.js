/* ============================================
   DAILY ENGINE v10 — Complete Rewrite
   Task Library + Custom Time Blocks
   ============================================ */

(function () {
    'use strict';

    // ── Constants ──────────────────────────────────────────────
    const STORAGE_KEY = 'dailyEngine';
    const BACKUP_KEY = 'dailyEngine_backup';
    const RECOVERY_CODE_KEY = 'dailyEngine_recoveryCode';

    const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const WEEKENDS = ['sat', 'sun'];

    // ── ID generators ─────────────────────────────────────────
    function genBlockId() { return 'blk_' + Math.random().toString(36).substring(2, 8); }
    function genTaskId() { return 'tsk_' + Math.random().toString(36).substring(2, 10); }

    // ── Block color palette ───────────────────────────────────
    const BLOCK_COLORS = [
        { name: 'amber', hex: '#f59e0b' },
        { name: 'blue', hex: '#3b82f6' },
        { name: 'purple', hex: '#8b5cf6' },
        { name: 'green', hex: '#10b981' },
        { name: 'pink', hex: '#ec4899' },
        { name: 'red', hex: '#ef4444' },
        { name: 'cyan', hex: '#06b6d4' },
        { name: 'lime', hex: '#84cc16' },
    ];

    // ── Default blocks ────────────────────────────────────────
    function getDefaultBlocks() {
        return [
            { id: 'blk_morning', name: '🌅 Morning', color: 'amber',
              groups: [{ days: ALL_DAYS.slice(), start: '05:00', end: '09:00' }] },
            { id: 'blk_work', name: '💼 Work', color: 'blue',
              groups: [{ days: WEEKDAYS.slice(), start: '09:00', end: '17:00' }] },
            { id: 'blk_daytime', name: '☀️ Daytime', color: 'green',
              groups: [{ days: WEEKENDS.slice(), start: '10:00', end: '17:00' }] },
            { id: 'blk_evening', name: '🌙 Evening', color: 'purple',
              groups: [{ days: ALL_DAYS.slice(), start: '17:00', end: '23:00' }] }
        ];
    }

    // ── Default tasks ─────────────────────────────────────────
    function getDefaultTasks() {
        let order = 0;
        const t = (text, blockId, days, time, duration) => ({
            id: genTaskId(), text, blockId, days: days.slice(),
            time: time || '', duration: duration || '',
            recurrence: null, sortOrder: order++
        });
        return [
            t('Make bed', 'blk_morning', ALL_DAYS, '5:30 AM', '2 min'),
            t('Hydrate', 'blk_morning', ALL_DAYS, '5:35 AM', ''),
            t('Morning stretch / workout', 'blk_morning', ALL_DAYS, '6:00 AM', '30 min'),
            t('Shower & get ready', 'blk_morning', ALL_DAYS, '6:30 AM', '20 min'),
            t('Breakfast', 'blk_morning', ALL_DAYS, '7:00 AM', '20 min'),
            t('Review today\'s plan', 'blk_morning', ALL_DAYS, '7:30 AM', '5 min'),
            t('Deep work block', 'blk_work', WEEKDAYS, '9:00 AM', '2 hrs'),
            t('Check email / messages', 'blk_work', WEEKDAYS, '11:00 AM', '15 min'),
            t('Lunch break', 'blk_work', WEEKDAYS, '12:00 PM', '30 min'),
            t('Afternoon focus', 'blk_work', WEEKDAYS, '1:00 PM', '2 hrs'),
            t('Wrap up & plan tomorrow', 'blk_work', WEEKDAYS, '4:30 PM', '15 min'),
            t('Errands / free time', 'blk_daytime', WEEKENDS, '10:00 AM', ''),
            t('Hobby / project time', 'blk_daytime', WEEKENDS, '2:00 PM', '1 hr'),
            t('Cook dinner', 'blk_evening', ALL_DAYS, '6:00 PM', '30 min'),
            t('Clean up kitchen', 'blk_evening', ALL_DAYS, '6:45 PM', '10 min'),
            t('Relax / hobby', 'blk_evening', ALL_DAYS, '7:00 PM', '1 hr'),
            t('Plan tomorrow', 'blk_evening', ALL_DAYS, '9:00 PM', '10 min'),
            t('Wind down — no screens', 'blk_evening', ALL_DAYS, '9:30 PM', '30 min'),
        ];
    }

    // ── State ─────────────────────────────────────────────────
    let state = loadState();
    let currentView = 'today';
    let selectedBlock = null;
    let editSection = 'blocks'; // 'blocks' | 'tasks'
    let taskFilterBlock = null;
    let viewingDate = null; // null = today, or 'YYYY-MM-DD' for other days
    let manualBlockSelection = false; // true if user tapped a block pill this session

    function loadState() {
        const restored = restoreFromUrl();
        if (restored) return restored;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return ensureStateFields(JSON.parse(raw));
        } catch (e) {
            console.warn('Primary storage failed, trying backup...', e);
        }
        try {
            const backupRaw = localStorage.getItem(BACKUP_KEY);
            if (backupRaw) return ensureStateFields(JSON.parse(backupRaw));
        } catch (e) {
            console.warn('Backup also failed, using defaults', e);
        }
        return freshState();
    }

    function ensureStateFields(p) {
        if (!Array.isArray(p.blocks)) p.blocks = getDefaultBlocks();
        if (!Array.isArray(p.tasks)) p.tasks = getDefaultTasks();
        if (!p.completions) p.completions = {};
        if (!p.history) p.history = {};
        if (!Array.isArray(p.archive)) p.archive = [];
        if (!p.todos) p.todos = {};
        if (!p.reschedules) p.reschedules = {};
        if (!p.measurements) p.measurements = {};
        if (typeof p.bestStreak !== 'number') p.bestStreak = 0;
        p.blocks.forEach(b => { if (!b.id) b.id = genBlockId(); if (!b.color) b.color = 'blue'; if (!Array.isArray(b.groups)) b.groups = [{ days: ALL_DAYS.slice(), start: '09:00', end: '17:00' }]; });
        p.tasks.forEach(t => { if (!t.id) t.id = genTaskId(); if (!Array.isArray(t.days)) t.days = ALL_DAYS.slice(); });
        return p;
    }

    function freshState() {
        return {
            blocks: getDefaultBlocks(),
            tasks: getDefaultTasks(),
            completions: {},
            history: {},
            archive: [],
            todos: {},
            reschedules: {},
            measurements: {},
            bestStreak: 0
        };
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            const bc = JSON.parse(JSON.stringify(state));
            bc._backupTime = new Date().toISOString();
            localStorage.setItem(BACKUP_KEY, JSON.stringify(bc));
        } catch (e) { console.warn('Save failed', e); }
        syncToCloud();
    }

    // ══════════════════════════════════════════════════════════
    // ── Firebase Cloud Sync ───────────────────────────────────
    // ══════════════════════════════════════════════════════════
    const firebaseConfig = {
        apiKey: "AIzaSyCPgkLBUOohUkJkl8-6A5IB-FNmHZjKcts",
        authDomain: "daily-engine.firebaseapp.com",
        databaseURL: "https://daily-engine-default-rtdb.firebaseio.com",
        projectId: "daily-engine",
        storageBucket: "daily-engine.firebasestorage.app",
        messagingSenderId: "78664979281",
        appId: "1:78664979281:web:21dd7280ea1b863625f970"
    };

    let firebaseDb = null;
    let cloudSyncEnabled = false;

    function initFirebase() {
        try {
            if (typeof firebase !== 'undefined' && firebase.initializeApp) {
                firebase.initializeApp(firebaseConfig);
                firebaseDb = firebase.database();
                cloudSyncEnabled = true;
                console.info('☁️ Firebase initialized');
            }
        } catch (e) { console.warn('Firebase init failed:', e); }
    }

    function generateRecoveryCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const segments = [];
        for (let s = 0; s < 3; s++) {
            let seg = '';
            for (let i = 0; i < 4; i++) seg += chars[Math.floor(Math.random() * chars.length)];
            segments.push(seg);
        }
        return 'ENGINE-' + segments.join('-');
    }

    function getRecoveryCode() {
        let code = localStorage.getItem(RECOVERY_CODE_KEY);
        if (!code) { code = generateRecoveryCode(); localStorage.setItem(RECOVERY_CODE_KEY, code); }
        return code;
    }

    function setRecoveryCode(code) { localStorage.setItem(RECOVERY_CODE_KEY, code); }

    let syncDebounceTimer = null;
    function syncToCloud() {
        if (!cloudSyncEnabled || !firebaseDb) return;
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
            const code = getRecoveryCode();
            const payload = JSON.parse(JSON.stringify(state));
            payload._syncTime = new Date().toISOString();
            firebaseDb.ref('users/' + code).set(payload).then(() => {
                updateSyncIndicator('synced');
            }).catch(() => {
                updateSyncIndicator('error');
            });
        }, 2000);
    }

    function restoreFromCloud(code) {
        return new Promise((resolve, reject) => {
            if (!cloudSyncEnabled || !firebaseDb) { reject(new Error('Cloud not available')); return; }
            firebaseDb.ref('users/' + code).once('value').then((snapshot) => {
                const data = snapshot.val();
                if (data && (data.blocks || data.tasks || data.schedule)) {
                    resolve(data);
                } else {
                    reject(new Error('No data found'));
                }
            }).catch(reject);
        });
    }

    let isPulling = false;
    function pullFromCloudIfNewer() {
        if (!cloudSyncEnabled || !firebaseDb || isPulling) return;
        const code = localStorage.getItem(RECOVERY_CODE_KEY);
        if (!code) return;
        isPulling = true;
        updateSyncIndicator('syncing');
        firebaseDb.ref('users/' + code).once('value').then((snapshot) => {
            const cloudData = snapshot.val();
            isPulling = false;
            if (!cloudData || !cloudData._syncTime) { updateSyncIndicator('synced'); return; }
            const localBackup = localStorage.getItem(BACKUP_KEY);
            let localTime = null;
            if (localBackup) { try { localTime = new Date(JSON.parse(localBackup)._backupTime); } catch (e) { /* */ } }
            const cloudTime = new Date(cloudData._syncTime);
            if (!localTime || cloudTime > localTime) {
                state = ensureStateFields(cloudData);
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                    const bc = JSON.parse(JSON.stringify(state));
                    bc._backupTime = new Date().toISOString();
                    localStorage.setItem(BACKUP_KEY, JSON.stringify(bc));
                } catch (e) { /* */ }
                switchView(currentView);
                showToast('☁️ Synced latest from cloud');
            }
            updateSyncIndicator('synced');
        }).catch(() => { isPulling = false; updateSyncIndicator('error'); });
    }

    function updateSyncIndicator(status) {
        const el = document.getElementById('sync-indicator');
        if (!el) return;
        if (status === 'synced') { el.textContent = '☁️ Synced'; el.className = 'sync-indicator synced'; }
        else if (status === 'error') { el.textContent = '⚠️ Offline'; el.className = 'sync-indicator error'; }
        else if (status === 'syncing') { el.textContent = '☁️ Syncing…'; el.className = 'sync-indicator syncing'; }
    }

    // ══════════════════════════════════════════════════════════
    // ── Recovery / Welcome Modals ─────────────────────────────
    // ══════════════════════════════════════════════════════════
    function showRecoveryCodeModal(code, isFirstTime) {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        const title = isFirstTime ? '☁️ Cloud Backup Enabled!' : '☁️ Your Recovery Code';
        const subtitle = isFirstTime
            ? 'Your data now auto-syncs to the cloud. Use this code to restore:'
            : 'Use this code to restore your data on any device:';
        overlay.innerHTML = `
            <div class="confirm-dialog recovery-dialog">
                <h3 class="recovery-title">${title}</h3>
                <p class="recovery-subtitle">${subtitle}</p>
                <div class="recovery-code-display">${code}</div>
                <p class="recovery-hint">📸 Screenshot this or write it down!</p>
                <div class="confirm-buttons">
                    <button class="confirm-btn confirm-cancel" id="recovery-copy">📋 Copy</button>
                    <button class="confirm-btn confirm-yes recovery-done-btn">Got It</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));
        overlay.querySelector('#recovery-copy').addEventListener('click', () => {
            copyText(code); showToast('✅ Recovery code copied!');
        });
        overlay.querySelector('.recovery-done-btn').addEventListener('click', () => {
            overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200);
        });
    }

    function showRecoveryInputModal() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-dialog recovery-dialog">
                    <h3 class="recovery-title">🔑 Restore Your Data</h3>
                    <p class="recovery-subtitle">Enter your recovery code to restore from the cloud:</p>
                    <input type="text" class="recovery-code-input" id="recovery-input" placeholder="ENGINE-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false">
                    <div id="recovery-error" class="recovery-error hidden"></div>
                    <div class="confirm-buttons">
                        <button class="confirm-btn confirm-cancel" id="recovery-skip">Start Fresh</button>
                        <button class="confirm-btn confirm-yes recovery-done-btn" id="recovery-restore">Restore</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('visible'));
            const input = overlay.querySelector('#recovery-input');
            const errorEl = overlay.querySelector('#recovery-error');
            input.focus();
            input.addEventListener('input', () => { input.value = input.value.toUpperCase(); });
            overlay.querySelector('#recovery-restore').addEventListener('click', async () => {
                const code = input.value.trim();
                if (!code) { errorEl.textContent = 'Please enter your recovery code'; errorEl.classList.remove('hidden'); return; }
                errorEl.textContent = 'Restoring…'; errorEl.classList.remove('hidden'); errorEl.style.color = 'var(--text-secondary)';
                try {
                    const data = await restoreFromCloud(code);
                    state = ensureStateFields(data); setRecoveryCode(code); saveState();
                    overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200);
                    showToast('✅ Data restored!'); switchView('today'); resolve(true);
                } catch (err) {
                    errorEl.textContent = '❌ No data found. Check and try again.'; errorEl.style.color = 'var(--accent-danger)';
                }
            });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') overlay.querySelector('#recovery-restore').click(); });
            overlay.querySelector('#recovery-skip').addEventListener('click', () => {
                overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200); resolve(false);
            });
        });
    }

    function showWelcomeOrRestoreModal() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-dialog recovery-dialog">
                    <h3 class="recovery-title">👋 Welcome to Daily Engine!</h3>
                    <p class="recovery-subtitle">Have a recovery code? Restore your data, or start fresh.</p>
                    <input type="text" class="recovery-code-input" id="welcome-recovery-input" placeholder="ENGINE-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false">
                    <div id="welcome-recovery-error" class="recovery-error hidden"></div>
                    <div class="confirm-buttons">
                        <button class="confirm-btn confirm-cancel" id="welcome-fresh">Start Fresh</button>
                        <button class="confirm-btn confirm-yes recovery-done-btn" id="welcome-restore">Restore</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('visible'));
            const input = overlay.querySelector('#welcome-recovery-input');
            const errorEl = overlay.querySelector('#welcome-recovery-error');
            input.addEventListener('input', () => { input.value = input.value.toUpperCase(); });
            overlay.querySelector('#welcome-restore').addEventListener('click', async () => {
                const code = input.value.trim();
                if (!code) { errorEl.textContent = 'Please enter your recovery code'; errorEl.classList.remove('hidden'); return; }
                errorEl.textContent = 'Restoring…'; errorEl.classList.remove('hidden'); errorEl.style.color = 'var(--text-secondary)';
                try {
                    const data = await restoreFromCloud(code);
                    state = ensureStateFields(data); setRecoveryCode(code); saveState();
                    overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200);
                    showToast('✅ Data restored!'); switchView('today'); resolve(true);
                } catch (err) {
                    errorEl.textContent = '❌ No data found. Check and try again.'; errorEl.style.color = 'var(--accent-danger)';
                }
            });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') overlay.querySelector('#welcome-restore').click(); });
            overlay.querySelector('#welcome-fresh').addEventListener('click', () => {
                overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200); resolve(false);
            });
        });
    }

    // ══════════════════════════════════════════════════════════
    // ── URL Backup / Export / Import ──────────────────────────
    // ══════════════════════════════════════════════════════════
    function restoreFromUrl() {
        try {
            const hash = window.location.hash;
            if (!hash || !hash.startsWith('#backup=')) return null;
            const encoded = hash.substring('#backup='.length);
            const json = decodeURIComponent(atob(encoded));
            const parsed = JSON.parse(json);
            if (parsed.blocks || parsed.tasks) {
                history.replaceState(null, '', window.location.pathname);
                return ensureStateFields(parsed);
            }
        } catch (e) { /* */ }
        return null;
    }

    function generateBackupUrl() {
        const d = { blocks: state.blocks, tasks: state.tasks, archive: state.archive, todos: state.todos, reschedules: state.reschedules, measurements: state.measurements };
        return window.location.origin + window.location.pathname + '#backup=' + btoa(encodeURIComponent(JSON.stringify(d)));
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else { fallbackCopy(text); }
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }

    function copyBackupToClipboard() { copyText(JSON.stringify(state, null, 2)); showToast('✅ Backup copied!'); }
    function copyBackupLink() { copyText(generateBackupUrl()); showToast('🔗 Backup link copied!'); }

    function exportData() {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `daily-engine-backup-${todayStr()}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    function importData() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (imported.blocks || imported.tasks || imported.schedule) {
                        state = ensureStateFields(imported); saveState(); switchView(currentView);
                        showToast('✅ Backup restored!');
                    } else { alert('❌ Invalid backup file.'); }
                } catch (err) { alert('❌ Could not read file.'); }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    // ══════════════════════════════════════════════════════════
    // ── UI Helpers ────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════
    function showToast(message) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast'; toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 300); }, 2500);
    }

    function showConfirm(message, yesText) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-dialog">
                    <p class="confirm-message">${message}</p>
                    <div class="confirm-buttons">
                        <button class="confirm-btn confirm-cancel">Cancel</button>
                        <button class="confirm-btn confirm-yes">${yesText || 'Delete'}</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('visible'));
            const close = (val) => { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200); resolve(val); };
            overlay.querySelector('.confirm-cancel').addEventListener('click', () => close(false));
            overlay.querySelector('.confirm-yes').addEventListener('click', () => close(true));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
        });
    }

    function showMeasurementModal(taskName, unit) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-dialog measurement-dialog">
                    <h3 class="measurement-title">📏 Log Measurement</h3>
                    <p class="measurement-subtitle">${escapeHtml(taskName)}</p>
                    <div class="measurement-input-row">
                        <input type="number" step="any" class="measurement-input" id="measurement-value" placeholder="0" autocomplete="off" inputmode="decimal">
                        <span class="measurement-unit">${escapeHtml(unit || '')}</span>
                    </div>
                    <div class="confirm-buttons">
                        <button class="confirm-btn confirm-cancel">Skip</button>
                        <button class="confirm-btn confirm-yes">Log</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => { overlay.classList.add('visible'); overlay.querySelector('#measurement-value').focus(); });
            const close = (val) => { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200); resolve(val); };
            overlay.querySelector('.confirm-cancel').addEventListener('click', () => close(null));
            overlay.querySelector('.confirm-yes').addEventListener('click', () => {
                const v = parseFloat(overlay.querySelector('#measurement-value').value);
                close(isNaN(v) ? null : v);
            });
            overlay.querySelector('#measurement-value').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') overlay.querySelector('.confirm-yes').click();
                if (e.key === 'Escape') close(null);
            });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
        });
    }

    function escapeHtml(str) {
        const div = document.createElement('div'); div.textContent = str; return div.innerHTML;
    }

    function escapeAttr(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ══════════════════════════════════════════════════════════
    // ── Data Helpers ──────────────────────────────────────────
    // ══════════════════════════════════════════════════════════
    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function todayDayName() { return DAYS[new Date().getDay()]; }

    function dayNameFromStr(dateStr) { return DAYS[new Date(dateStr + 'T12:00:00').getDay()]; }

    function getBlockColor(block) {
        const c = BLOCK_COLORS.find(bc => bc.name === block.color);
        return c ? c.hex : '#3b82f6';
    }

    function getBlockById(id) { return state.blocks.find(b => b.id === id) || null; }
    function getTaskById(id) { return state.tasks.find(t => t.id === id) || null; }

    // Parse time string like "5:30 AM", "9:00 AM", "1:00 PM" to minutes since midnight
    function parseTimeToMinutes(timeStr) {
        if (!timeStr) return Infinity; // tasks with no time sort to end
        const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return Infinity;
        let hours = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const period = match[3].toUpperCase();
        if (period === 'AM' && hours === 12) hours = 0;
        if (period === 'PM' && hours !== 12) hours += 12;
        return hours * 60 + mins;
    }

    // Find which block a task's start time falls into (for time-block override)
    function getTimeMatchedBlock(task, dayName) {
        if (!task.time) return null;
        const taskMinutes = parseTimeToMinutes(task.time);
        if (taskMinutes === Infinity) return null;
        const dayBlocks = getBlocksForDay(dayName);
        for (const block of dayBlocks) {
            const group = block.groups.find(g => g.days.includes(dayName));
            if (!group) continue;
            const [sh, sm] = group.start.split(':').map(Number);
            const [eh, em] = group.end.split(':').map(Number);
            if (taskMinutes >= sh * 60 + sm && taskMinutes < eh * 60 + em) return block;
        }
        return null;
    }

    // Blocks active on a given day
    function getBlocksForDay(dayName) {
        return state.blocks.filter(b => b.groups.some(g => g.days.includes(dayName)));
    }

    // Current time block
    function getCurrentBlock() {
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const dayName = todayDayName();
        const dayBlocks = getBlocksForDay(dayName);
        for (const block of dayBlocks) {
            const group = block.groups.find(g => g.days.includes(dayName));
            if (!group) continue;
            const [sh, sm] = group.start.split(':').map(Number);
            const [eh, em] = group.end.split(':').map(Number);
            if (minutes >= sh * 60 + sm && minutes < eh * 60 + em) return block;
        }
        return dayBlocks[0] || null;
    }

    // Tasks for a day+block, sorted by sortOrder
    function getTasksForDayAndBlock(dayName, blockId) {
        return state.tasks
            .filter(t => t.blockId === blockId && t.days.includes(dayName))
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }

    // ── Completions (ID-based) ────────────────────────────────
    function getCompletion(dateStr, taskId) {
        return !!(state.completions[dateStr] && state.completions[dateStr][taskId]);
    }

    function setTaskCompletion(dateStr, taskId, value) {
        if (!state.completions[dateStr]) state.completions[dateStr] = {};
        state.completions[dateStr][taskId] = !!value;
        updateHistory(dateStr);
        saveState();
    }

    // ── Recurrence ────────────────────────────────────────────
    function isTaskDueOnDate(task, dateStr) {
        if (!task.recurrence) return true;
        const r = task.recurrence;
        const start = new Date(r.startDate + 'T12:00:00');
        const check = new Date(dateStr + 'T12:00:00');
        if (check < start) return false;
        const diffDays = Math.round((check - start) / (1000 * 60 * 60 * 24));
        if (r.unit === 'weeks') return diffDays % (r.every * 7) === 0;
        if (r.unit === 'months') {
            if (start.getDate() !== check.getDate()) return false;
            const md = (check.getFullYear() - start.getFullYear()) * 12 + (check.getMonth() - start.getMonth());
            return md >= 0 && md % r.every === 0;
        }
        return true;
    }

    // ── To-Dos ────────────────────────────────────────────────
    function getTodos(dateStr) {
        if (!state.todos[dateStr]) state.todos[dateStr] = [];
        return state.todos[dateStr];
    }

    function rollForwardTodos() {
        const today = todayStr();
        const dates = Object.keys(state.todos).filter(d => d < today).sort().reverse();
        if (!dates.length) return;
        const todayTodos = getTodos(today);
        for (const prevDate of dates) {
            const prev = state.todos[prevDate];
            if (!prev || !prev.length) continue;
            for (const t of prev.filter(t => !t.done)) {
                if (!todayTodos.some(x => x.text === t.text)) todayTodos.push({ text: t.text, done: false });
            }
            state.todos[prevDate] = prev.filter(t => t.done);
            if (!state.todos[prevDate].length) delete state.todos[prevDate];
        }
        saveState();
    }

    // ── Overdue & Upcoming Recurring Tasks ────────────────────
    function dateStr(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function formatDateLabel(ds) {
        const d = new Date(ds + 'T12:00:00');
        const today = new Date(); today.setHours(12, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const ds2 = dateStr(tomorrow);
        if (ds === todayStr()) return 'Today';
        if (ds === ds2) return 'Tomorrow';
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function daysUntil(ds) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const target = new Date(ds + 'T00:00:00');
        return Math.round((target - today) / (1000 * 60 * 60 * 24));
    }

    function getOverdueRecurringTasks() {
        const today = todayStr();
        const overdue = [];
        const recurringTasks = state.tasks.filter(t => t.recurrence);
        for (const task of recurringTasks) {
            // Check if rescheduled away (already handled)
            const rKey = 'skip_' + task.id;
            // Look back up to 90 days for missed occurrences
            for (let i = 1; i <= 90; i++) {
                const d = new Date(); d.setDate(d.getDate() - i);
                const ds = dateStr(d);
                const dayName = DAYS[d.getDay()];
                // Must be a day the task runs on, and block must be active
                if (!task.days.includes(dayName)) continue;
                const block = getBlockById(task.blockId);
                if (!block || !block.groups.some(g => g.days.includes(dayName))) continue;
                if (!isTaskDueOnDate(task, ds)) continue;
                // Was it completed?
                if (getCompletion(ds, task.id)) break; // Most recent occurrence was done, stop
                // Was it skipped/rescheduled?
                if (state.reschedules[task.id + '_' + ds]) break;
                // It's overdue!
                overdue.push({ task, dueDate: ds, daysAgo: i });
                break; // Only show most recent missed occurrence per task
            }
        }
        return overdue.sort((a, b) => b.daysAgo - a.daysAgo);
    }

    function getUpcomingRecurringTasks(lookAheadDays) {
        lookAheadDays = lookAheadDays || 7;
        const today = todayStr();
        const upcoming = [];
        const recurringTasks = state.tasks.filter(t => t.recurrence);
        for (const task of recurringTasks) {
            for (let i = 1; i <= lookAheadDays; i++) {
                const d = new Date(); d.setDate(d.getDate() + i);
                const ds = dateStr(d);
                const dayName = DAYS[d.getDay()];
                if (!task.days.includes(dayName)) continue;
                const block = getBlockById(task.blockId);
                if (!block || !block.groups.some(g => g.days.includes(dayName))) continue;
                if (!isTaskDueOnDate(task, ds)) continue;
                // Don't show if already rescheduled away
                if (state.reschedules[task.id + '_' + ds]) continue;
                upcoming.push({ task, dueDate: ds, daysOut: i });
                break; // Only next occurrence per task
            }
        }
        return upcoming.sort((a, b) => a.daysOut - b.daysOut);
    }

    function rescheduleTask(taskId, fromDate, toDate) {
        // Mark the original date as "rescheduled" so it doesn't show as overdue
        state.reschedules[taskId + '_' + fromDate] = toDate;
        // Add a to-do on the target date as a reminder
        if (!state.todos[toDate]) state.todos[toDate] = [];
        const task = getTaskById(taskId);
        const text = '🔁 ' + (task ? task.text : 'Rescheduled task');
        if (!state.todos[toDate].some(t => t.text === text)) {
            state.todos[toDate].push({ text, done: false });
        }
        saveState();
    }

    function doTaskToday(taskId, fromDate) {
        // Mark original as rescheduled
        state.reschedules[taskId + '_' + fromDate] = todayStr();
        // Set completion for today
        if (!state.completions[todayStr()]) state.completions[todayStr()] = {};
        // Don't auto-complete — just add it as a to-do for today
        const task = getTaskById(taskId);
        const today = todayStr();
        const todos = getTodos(today);
        const text = '🔁 ' + (task ? task.text : 'Task');
        if (!todos.some(t => t.text === text)) {
            todos.push({ text, done: false });
        }
        updateHistory(today);
        saveState();
    }

    function skipTask(taskId, fromDate) {
        state.reschedules[taskId + '_' + fromDate] = 'skipped';
        saveState();
    }

    function showRescheduleModal(taskId, fromDate) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            const task = getTaskById(taskId);
            const taskName = task ? task.text : 'Task';
            // Build date options for next 14 days
            let dateOptions = '';
            for (let i = 0; i <= 14; i++) {
                const d = new Date(); d.setDate(d.getDate() + i);
                const ds = dateStr(d);
                const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                dateOptions += `<button class="reschedule-date-btn" data-date="${ds}">${label}</button>`;
            }
            overlay.innerHTML = `
                <div class="confirm-dialog reschedule-dialog">
                    <h3 class="reschedule-title">📅 Reschedule</h3>
                    <p class="reschedule-subtitle">${escapeHtml(taskName)}</p>
                    <div class="reschedule-dates">${dateOptions}</div>
                    <div class="confirm-buttons">
                        <button class="confirm-btn confirm-cancel">Cancel</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('visible'));
            const close = (val) => { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200); resolve(val); };
            overlay.querySelector('.confirm-cancel').addEventListener('click', () => close(null));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
            overlay.querySelectorAll('.reschedule-date-btn').forEach(btn => {
                btn.addEventListener('click', () => close(btn.dataset.date));
            });
        });
    }

    // ── History ───────────────────────────────────────────────
    function updateHistory(dateStr) {
        const dayName = dayNameFromStr(dateStr);
        const dayBlocks = getBlocksForDay(dayName);
        let completed = 0, total = 0;
        for (const block of dayBlocks) {
            for (const task of getTasksForDayAndBlock(dayName, block.id)) {
                if (!isTaskDueOnDate(task, dateStr)) continue;
                total++;
                if (getCompletion(dateStr, task.id)) completed++;
            }
        }
        const todos = getTodos(dateStr);
        total += todos.length;
        for (const t of todos) { if (t.done) completed++; }
        state.history[dateStr] = { completed, total };
    }

    // ── Streaks ───────────────────────────────────────────────
    function computeStreaks() {
        let current = 0;
        const today = new Date();
        for (let i = 0; i < 3650; i++) {
            const d = new Date(today); d.setDate(d.getDate() - i);
            const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const h = state.history[ds];
            if (i === 0) { if (h && h.completed > 0) current++; else break; }
            else { if (h && h.total > 0 && h.completed / h.total >= 0.5) current++; else break; }
        }
        if (current > state.bestStreak) { state.bestStreak = current; saveState(); }
        return { current, best: state.bestStreak };
    }

    function computeTaskStreak(taskId) {
        const task = getTaskById(taskId);
        if (!task) return 0;
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const d = new Date(today); d.setDate(d.getDate() - i);
            if (d > today) continue;
            const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const dayName = DAYS[d.getDay()];
            if (!task.days.includes(dayName)) continue;
            if (!isTaskDueOnDate(task, ds)) continue;
            const block = getBlockById(task.blockId);
            if (!block || !block.groups.some(g => g.days.includes(dayName))) continue;
            if (getCompletion(ds, task.id)) streak++;
            else break;
        }
        return streak;
    }

    // ── Archive ───────────────────────────────────────────────
    function archiveTask(task) {
        if (task.text && task.text.trim()) {
            if (!state.archive.some(a => a.text === task.text && a.blockId === task.blockId)) {
                state.archive.push({
                    text: task.text, blockId: task.blockId, days: task.days.slice(),
                    time: task.time || '', duration: task.duration || '',
                    archivedAt: new Date().toISOString()
                });
            }
        }
        saveState();
    }

    // ══════════════════════════════════════════════════════════
    // ── Navigation ────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════
    const btnToday = document.getElementById('btn-today');
    const btnEdit = document.getElementById('btn-edit');
    const btnStats = document.getElementById('btn-stats');
    const btnTrack = document.getElementById('btn-track');
    const views = {
        today: document.getElementById('view-today'),
        edit: document.getElementById('view-edit'),
        stats: document.getElementById('view-stats'),
        track: document.getElementById('view-track')
    };

    function switchView(name) {
        currentView = name;
        Object.values(views).forEach(v => v.classList.remove('active'));
        views[name].classList.add('active');
        [btnToday, btnEdit, btnStats, btnTrack].forEach(b => b.classList.remove('active'));
        if (name === 'today') btnToday.classList.add('active');
        if (name === 'edit') btnEdit.classList.add('active');
        if (name === 'stats') btnStats.classList.add('active');
        if (name === 'track') btnTrack.classList.add('active');
        if (name === 'today') renderToday();
        if (name === 'edit') renderEdit();
        if (name === 'stats') renderStats();
        if (name === 'track') renderTrack();
    }

    btnToday.addEventListener('click', () => { viewingDate = null; selectedBlock = null; manualBlockSelection = false; switchView('today'); });
    btnEdit.addEventListener('click', () => switchView('edit'));
    btnStats.addEventListener('click', () => switchView('stats'));
    btnTrack.addEventListener('click', () => switchView('track'));

    // ══════════════════════════════════════════════════════════
    // ── TODAY VIEW ────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    function shiftViewingDate(offset) {
        const current = viewingDate || todayStr();
        const d = new Date(current + 'T12:00:00');
        d.setDate(d.getDate() + offset);
        viewingDate = dateStr(d);
        selectedBlock = null; // reset block selection for new day
        manualBlockSelection = false;
        renderToday();
    }

    function renderToday() {
        const isToday = !viewingDate || viewingDate === todayStr();
        const activeDate = viewingDate || todayStr();
        const dayName = dayNameFromStr(activeDate);
        const dayBlocks = getBlocksForDay(dayName);
        const currentBlk = isToday ? getCurrentBlock() : null;

        // Auto-advance to current time block unless user manually selected one
        if (!selectedBlock || !dayBlocks.find(b => b.id === selectedBlock)) {
            selectedBlock = currentBlk ? currentBlk.id : (dayBlocks[0] ? dayBlocks[0].id : null);
            manualBlockSelection = false;
        } else if (isToday && currentBlk && !manualBlockSelection) {
            // Auto-advance: if it's today and user hasn't manually picked, follow the clock
            selectedBlock = currentBlk.id;
        }

        // Date header with navigation
        const dateEl = document.getElementById('today-date');
        const displayDate = new Date(activeDate + 'T12:00:00');
        dateEl.textContent = displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        // Day navigation row
        let dayNav = document.getElementById('day-nav-row');
        if (!dayNav) {
            dayNav = document.createElement('div');
            dayNav.id = 'day-nav-row';
            dayNav.className = 'day-nav-row';
            dateEl.parentNode.insertBefore(dayNav, dateEl);
        }
        dayNav.innerHTML = `
            <button class="day-nav-btn" id="day-nav-prev" aria-label="Previous day">‹</button>
            <button class="day-nav-today-pill${isToday ? ' active' : ''}" id="day-nav-today">Today</button>
            <button class="day-nav-btn" id="day-nav-next" aria-label="Next day">›</button>`;
        dayNav.querySelector('#day-nav-prev').addEventListener('click', () => shiftViewingDate(-1));
        dayNav.querySelector('#day-nav-next').addEventListener('click', () => shiftViewingDate(1));
        dayNav.querySelector('#day-nav-today').addEventListener('click', () => {
            viewingDate = null;
            selectedBlock = null;
            manualBlockSelection = false;
            renderToday();
        });

        // Streak badge
        const streaks = computeStreaks();
        let streakEl = document.getElementById('streak-badge');
        if (!streakEl) {
            streakEl = document.createElement('div');
            streakEl.id = 'streak-badge';
            streakEl.className = 'streak-badge';
            dateEl.parentNode.insertBefore(streakEl, dateEl.nextSibling);
        }
        if (isToday) {
            if (streaks.current > 0) {
                streakEl.innerHTML = `<span class="streak-fire">🔥</span> <span class="streak-count">${streaks.current}-day streak</span>` +
                    (streaks.best > streaks.current ? ` <span class="streak-best">· Best: ${streaks.best}</span>` : ` <span class="streak-best">· Personal best!</span>`);
            } else {
                streakEl.innerHTML = `<span class="streak-dimmed">Start a streak today!</span>`;
            }
            streakEl.classList.remove('hidden');
        } else {
            streakEl.classList.add('hidden');
        }

        // Time block pills (scroll anchors — tapping scrolls to that section)
        const pillRow = document.getElementById('time-block-pills');
        pillRow.innerHTML = '';
        for (const block of dayBlocks) {
            const pill = document.createElement('button');
            pill.className = 'pill' + (isToday && currentBlk && block.id === currentBlk.id ? ' current-indicator' : '');
            pill.dataset.blockId = block.id;
            pill.style.setProperty('--pill-color', getBlockColor(block));
            pill.textContent = block.name;
            pill.addEventListener('click', () => {
                // Scroll to that block section
                const section = document.getElementById('block-section-' + block.id);
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Highlight this pill
                pillRow.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            });
            pillRow.appendChild(pill);
        }

        // Checklist — render ALL blocks in one continuous scrollable list
        const container = document.getElementById('today-checklist');
        container.innerHTML = '';
        const isFuture = activeDate >= todayStr();

        // Helper: gather tasks for a given block (including time-overrides)
        function gatherTasksForBlock(block) {
            // Tasks natively assigned to this block
            const nativeTasks = getTasksForDayAndBlock(dayName, block.id)
                .filter(t => isTaskDueOnDate(t, activeDate))
                .map(t => ({ task: t, originBlock: null }));

            // Tasks from OTHER blocks whose start time falls in THIS block
            const otherTasks = state.tasks.filter(t => {
                if (t.blockId === block.id) return false;
                if (!t.days.includes(dayName)) return false;
                if (!isTaskDueOnDate(t, activeDate)) return false;
                const matched = getTimeMatchedBlock(t, dayName);
                return matched && matched.id === block.id;
            }).map(t => ({ task: t, originBlock: getBlockById(t.blockId) }));

            // Remove native tasks whose time actually falls in a different block
            const nativeFiltered = nativeTasks.filter(({ task }) => {
                const matched = getTimeMatchedBlock(task, dayName);
                return !matched || matched.id === block.id;
            });

            const all = [...nativeFiltered, ...otherTasks];
            all.sort((a, b) => parseTimeToMinutes(a.task.time) - parseTimeToMinutes(b.task.time));
            return all;
        }

        // Render each block section
        dayBlocks.forEach((block, blockIndex) => {
            const blockTasks = gatherTasksForBlock(block);

            // Section wrapper
            const section = document.createElement('div');
            section.className = 'block-section block-section-enter';
            section.id = 'block-section-' + block.id;
            section.style.animationDelay = (blockIndex * 0.08) + 's';

            // Section header
            const isCurrentBlock = isToday && currentBlk && block.id === currentBlk.id;
            const header = document.createElement('div');
            header.className = 'block-section-header' + (isCurrentBlock ? ' block-section-active' : '');
            header.style.borderLeftColor = getBlockColor(block);
            header.innerHTML = `
                <span class="block-section-name">${escapeHtml(block.name)}</span>
                ${isCurrentBlock ? '<span class="block-section-now">NOW</span>' : ''}
                <span class="block-section-count">${blockTasks.filter(({ task }) => getCompletion(activeDate, task.id)).length}/${blockTasks.length}</span>`;
            section.appendChild(header);

            // Tasks
            if (blockTasks.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'block-section-empty';
                empty.textContent = 'No tasks in this block';
                section.appendChild(empty);
            } else {
                blockTasks.forEach(({ task, originBlock }, taskIndex) => {
                    const checked = getCompletion(activeDate, task.id);
                    const item = document.createElement('div');
                    item.className = 'checklist-item task-item-enter' + (checked ? ' checked' : '') + (originBlock ? ' time-overridden' : '');
                    item.style.animationDelay = (blockIndex * 0.08 + taskIndex * 0.04) + 's';
                    const displayColor = originBlock ? getBlockColor(originBlock) : getBlockColor(block);
                    item.style.borderLeftColor = displayColor;
                    let metaHtml = '';
                    if (task.time || task.duration) {
                        const parts = [];
                        if (task.time) parts.push(task.time);
                        if (task.duration) parts.push(task.duration);
                        metaHtml = `<span class="task-meta">${escapeHtml(parts.join(' · '))}</span>`;
                    }
                    const recurHtml = task.recurrence ? `<span class="task-recur-badge">🔁</span>` : '';
                    const measureHtml = task.measurement ? `<span class="task-measure-badge">📏</span>` : '';
                    const overrideBadge = originBlock ? `<span class="task-override-badge" style="color:${getBlockColor(originBlock)}">↗ ${escapeHtml(originBlock.name)}</span>` : '';
                    let measureValueHtml = '';
                    if (task.measurement && state.measurements[task.id] && state.measurements[task.id].length) {
                        const last = state.measurements[task.id][state.measurements[task.id].length - 1];
                        measureValueHtml = `<span class="task-measure-value">${last.value} ${escapeHtml(task.measurement.unit || '')}</span>`;
                    }
                    item.innerHTML = `
                        <div class="custom-checkbox">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </div>
                        <div class="task-content">
                            <span class="task-text">${recurHtml}${measureHtml}${escapeHtml(task.text)}${overrideBadge}</span>
                            ${metaHtml}
                            ${measureValueHtml}
                        </div>`;
                    item.addEventListener('click', async () => {
                        const newChecked = !checked;
                        if (newChecked && task.measurement) {
                            const value = await showMeasurementModal(task.text, task.measurement.unit);
                            if (value !== null) {
                                if (!state.measurements[task.id]) state.measurements[task.id] = [];
                                state.measurements[task.id].push({ date: activeDate, value });
                            }
                        }
                        setTaskCompletion(activeDate, task.id, newChecked);
                        renderToday();
                    });
                    section.appendChild(item);
                });
            }

            // Quick-add per block (only on today or future dates)
            if (isFuture) {
                const quickAdd = document.createElement('div');
                quickAdd.className = 'quick-add-container';
                const qId = 'qa-' + block.id;
                quickAdd.innerHTML = `
                    <button class="btn-quick-add" data-qa="${qId}">+ Add to ${escapeHtml(block.name)}</button>
                    <div class="quick-add-input-row hidden" data-qa-row="${qId}">
                        <input type="text" class="quick-add-input" data-qa-input="${qId}" placeholder="What needs to get done?" autocomplete="off">
                        <button class="btn-quick-add-confirm" data-qa-confirm="${qId}">Add</button>
                    </div>`;
                section.appendChild(quickAdd);

                const toggleBtn = quickAdd.querySelector(`[data-qa="${qId}"]`);
                const inputRow = quickAdd.querySelector(`[data-qa-row="${qId}"]`);
                const qInput = quickAdd.querySelector(`[data-qa-input="${qId}"]`);
                const confirmBtn = quickAdd.querySelector(`[data-qa-confirm="${qId}"]`);
                toggleBtn.addEventListener('click', () => { toggleBtn.classList.add('hidden'); inputRow.classList.remove('hidden'); qInput.focus(); });

                const addQuickTask = () => {
                    const text = qInput.value.trim();
                    if (!text) return;
                    const maxOrder = state.tasks.reduce((m, t) => Math.max(m, t.sortOrder || 0), 0);
                    state.tasks.push({ id: genTaskId(), text, blockId: block.id, days: [dayName], time: '', duration: '', recurrence: null, sortOrder: maxOrder + 1 });
                    saveState(); renderToday();
                };
                confirmBtn.addEventListener('click', addQuickTask);
                qInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') addQuickTask();
                    if (e.key === 'Escape') { toggleBtn.classList.remove('hidden'); inputRow.classList.add('hidden'); }
                });
            }

            container.appendChild(section);
        });

        // IntersectionObserver to update active pill as user scrolls
        const observerCallback = (entries) => {
            let topVisible = null;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!topVisible || entry.boundingClientRect.top < topVisible.boundingClientRect.top) {
                        topVisible = entry;
                    }
                }
            });
            if (topVisible) {
                const blockId = topVisible.target.id.replace('block-section-', '');
                pillRow.querySelectorAll('.pill').forEach(p => {
                    p.classList.toggle('active', p.dataset.blockId === blockId);
                });
            }
        };
        const observer = new IntersectionObserver(observerCallback, {
            root: null,
            rootMargin: '-80px 0px -60% 0px',
            threshold: 0
        });
        dayBlocks.forEach(block => {
            const el = document.getElementById('block-section-' + block.id);
            if (el) observer.observe(el);
        });

        // Auto-scroll to current block on initial load (today only)
        if (isToday && currentBlk) {
            const currentSection = document.getElementById('block-section-' + currentBlk.id);
            if (currentSection) {
                setTimeout(() => currentSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
            }
        }

        // ── To-Dos ──────────────────────────────────────────────
        const todoContainer = document.getElementById('today-todos');
        todoContainer.innerHTML = '';
        const todos = getTodos(activeDate);

        const todoLabel = isToday ? "Today's To-Dos" : 'To-Dos';
        todoContainer.innerHTML = `<div class="todo-header"><h3>📝 ${todoLabel}</h3></div>`;

        if (todos.length > 0) {
            const todoList = document.createElement('div');
            todoList.className = 'todo-list';
            todos.forEach((todo, i) => {
                const item = document.createElement('div');
                item.className = 'todo-item' + (todo.done ? ' checked' : '');
                item.innerHTML = `
                    <div class="custom-checkbox todo-checkbox">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <span class="task-text">${escapeHtml(todo.text)}</span>
                    <button class="btn-inline-delete" aria-label="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>`;
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-inline-delete')) return;
                    todos[i].done = !todos[i].done; updateHistory(activeDate); saveState(); renderToday();
                });
                item.querySelector('.btn-inline-delete').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (await showConfirm(`Remove "${todo.text}"?`)) { todos.splice(i, 1); updateHistory(activeDate); saveState(); renderToday(); }
                });
                todoList.appendChild(item);
            });
            todoContainer.appendChild(todoList);
        }

        // Quick-add to-do
        const todoAdd = document.createElement('div');
        todoAdd.className = 'quick-add-container';
        todoAdd.innerHTML = `
            <button class="btn-quick-add btn-quick-add-todo" id="btn-todo-add-toggle">+ Add To-Do</button>
            <div class="quick-add-input-row hidden" id="todo-add-row">
                <input type="text" id="todo-add-input" class="quick-add-input" placeholder="What else needs doing?" autocomplete="off">
                <button class="btn-quick-add-confirm btn-todo-confirm" id="btn-todo-add-confirm">Add</button>
            </div>`;
        todoContainer.appendChild(todoAdd);

        const todoToggle = todoAdd.querySelector('#btn-todo-add-toggle');
        const todoRow = todoAdd.querySelector('#todo-add-row');
        const todoInput = todoAdd.querySelector('#todo-add-input');
        const todoConfirm = todoAdd.querySelector('#btn-todo-add-confirm');
        todoToggle.addEventListener('click', () => { todoToggle.classList.add('hidden'); todoRow.classList.remove('hidden'); todoInput.focus(); });
        function addTodo() { const text = todoInput.value.trim(); if (!text) return; todos.push({ text, done: false }); updateHistory(activeDate); saveState(); renderToday(); }
        todoConfirm.addEventListener('click', addTodo);
        todoInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addTodo();
            if (e.key === 'Escape') { todoToggle.classList.remove('hidden'); todoRow.classList.add('hidden'); }
        });

        // ── Scheduled Panel (Overdue + Upcoming) — only on today ──
        const scheduledContainer = document.getElementById('today-scheduled');
        if (scheduledContainer) {
            if (isToday) {
                renderScheduledPanel();
            } else {
                scheduledContainer.innerHTML = '';
            }
        }

        // Progress bar
        let totalDone = 0, totalTasks = 0;
        for (const bl of dayBlocks) {
            for (const t of getTasksForDayAndBlock(dayName, bl.id)) {
                if (!isTaskDueOnDate(t, activeDate)) continue;
                totalTasks++; if (getCompletion(activeDate, t.id)) totalDone++;
            }
        }
        totalTasks += todos.length;
        for (const t of todos) { if (t.done) totalDone++; }
        const pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;
        document.getElementById('progress-fill').style.width = pct + '%';
        document.getElementById('progress-label').textContent = `${totalDone} / ${totalTasks}`;
    }

    // ══════════════════════════════════════════════════════════
    // ── SCHEDULED PANEL (Overdue + Upcoming) ──────────────────
    // ══════════════════════════════════════════════════════════
    function renderScheduledPanel() {
        const container = document.getElementById('today-scheduled');
        if (!container) return;
        container.innerHTML = '';

        const overdue = getOverdueRecurringTasks();
        const upcoming = getUpcomingRecurringTasks(7);

        // Don't render the panel at all if nothing to show
        if (!overdue.length && !upcoming.length) return;

        container.innerHTML = `<div class="scheduled-header"><h3>📅 Scheduled</h3></div>`;

        // ── Overdue Section ──
        if (overdue.length > 0) {
            const overdueSection = document.createElement('div');
            overdueSection.className = 'scheduled-subsection overdue-subsection';
            overdueSection.innerHTML = `<div class="scheduled-sublabel overdue-label">⚠️ OVERDUE</div>`;

            overdue.forEach(({ task, dueDate, daysAgo }) => {
                const block = getBlockById(task.blockId);
                const item = document.createElement('div');
                item.className = 'scheduled-item overdue-item';
                item.style.borderLeftColor = block ? getBlockColor(block) : 'var(--accent-danger)';

                const dueDateLabel = new Date(dueDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                item.innerHTML = `
                    <div class="scheduled-item-content">
                        <span class="scheduled-task-text">🔁 ${escapeHtml(task.text)}</span>
                        <span class="scheduled-meta overdue-meta">was due ${dueDateLabel} — ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago</span>
                    </div>
                    <div class="scheduled-actions">
                        <button class="sched-btn sched-do-today" title="Add to today">Do Today</button>
                        <button class="sched-btn sched-skip" title="Skip this one">Skip</button>
                        <button class="sched-btn sched-reschedule" title="Pick a new date">Reschedule</button>
                    </div>`;

                item.querySelector('.sched-do-today').addEventListener('click', async () => {
                    if (await showConfirm(`Add "${task.text}" to today's to-dos?`, 'Do Today')) {
                        doTaskToday(task.id, dueDate);
                        showToast('✅ Added to today\'s to-dos');
                        renderToday();
                    }
                });
                item.querySelector('.sched-skip').addEventListener('click', async () => {
                    if (await showConfirm(`Skip "${task.text}" (was due ${dueDateLabel})?`, 'Skip')) {
                        skipTask(task.id, dueDate);
                        showToast('⏭️ Skipped');
                        renderToday();
                    }
                });
                item.querySelector('.sched-reschedule').addEventListener('click', async () => {
                    const newDate = await showRescheduleModal(task.id, dueDate);
                    if (newDate) {
                        rescheduleTask(task.id, dueDate, newDate);
                        showToast('📅 Rescheduled to ' + formatDateLabel(newDate));
                        renderToday();
                    }
                });

                overdueSection.appendChild(item);
            });
            container.appendChild(overdueSection);
        }

        // ── Upcoming Section ──
        if (upcoming.length > 0) {
            const upcomingSection = document.createElement('div');
            upcomingSection.className = 'scheduled-subsection upcoming-subsection';
            upcomingSection.innerHTML = `<div class="scheduled-sublabel upcoming-label">📆 COMING UP</div>`;

            upcoming.forEach(({ task, dueDate, daysOut }) => {
                const block = getBlockById(task.blockId);
                const item = document.createElement('div');
                item.className = 'scheduled-item upcoming-item';
                item.style.borderLeftColor = block ? getBlockColor(block) : 'var(--border)';

                const dayLabel = formatDateLabel(dueDate);
                const daysText = daysOut === 1 ? 'tomorrow' : `in ${daysOut} days`;

                // Contextual actions: Do Today only for items within 2 days
                const showDoToday = daysOut <= 2;
                const actionsHtml = `
                    <div class="scheduled-actions">
                        ${showDoToday ? '<button class="sched-btn sched-do-today" title="Add to today">Do Today</button>' : ''}
                        <button class="sched-btn sched-skip" title="Skip this one">Skip</button>
                        <button class="sched-btn sched-reschedule" title="Pick a new date">Reschedule</button>
                    </div>`;

                item.innerHTML = `
                    <div class="scheduled-item-content">
                        <span class="scheduled-task-text">🔁 ${escapeHtml(task.text)}</span>
                        <span class="scheduled-meta upcoming-meta">${dayLabel} (${daysText})</span>
                    </div>
                    ${actionsHtml}`;

                if (showDoToday) {
                    item.querySelector('.sched-do-today').addEventListener('click', async () => {
                        if (await showConfirm(`Add "${task.text}" to today's to-dos?`, 'Do Today')) {
                            doTaskToday(task.id, dueDate);
                            showToast('✅ Added to today\'s to-dos');
                            renderToday();
                        }
                    });
                }
                item.querySelector('.sched-skip').addEventListener('click', async () => {
                    const dueDateLabel = new Date(dueDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    if (await showConfirm(`Skip "${task.text}" (${dueDateLabel})?`, 'Skip')) {
                        skipTask(task.id, dueDate);
                        showToast('⏭️ Skipped');
                        renderToday();
                    }
                });
                item.querySelector('.sched-reschedule').addEventListener('click', async () => {
                    const newDate = await showRescheduleModal(task.id, dueDate);
                    if (newDate) {
                        rescheduleTask(task.id, dueDate, newDate);
                        showToast('📅 Rescheduled to ' + formatDateLabel(newDate));
                        renderToday();
                    }
                });

                upcomingSection.appendChild(item);
            });
            container.appendChild(upcomingSection);
        }
    }

    // ══════════════════════════════════════════════════════════
    // ── EDIT VIEW ─────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════
    function renderEdit() {
        const container = document.getElementById('edit-content');
        container.innerHTML = '';

        // Tab switcher
        const tabs = document.createElement('div');
        tabs.className = 'edit-tabs';
        tabs.innerHTML = `
            <button class="edit-tab ${editSection === 'blocks' ? 'active' : ''}" data-section="blocks">⏰ Time Blocks</button>
            <button class="edit-tab ${editSection === 'tasks' ? 'active' : ''}" data-section="tasks">📋 Task Library</button>`;
        container.appendChild(tabs);
        tabs.querySelectorAll('.edit-tab').forEach(tab => {
            tab.addEventListener('click', () => { editSection = tab.dataset.section; renderEdit(); });
        });

        if (editSection === 'blocks') renderEditBlocks(container);
        else renderEditTasks(container);

        // Backup section
        renderBackupSection(container);
    }

    // ── Edit: Time Blocks ─────────────────────────────────────
    function renderEditBlocks(parent) {
        const section = document.createElement('div');
        section.className = 'edit-blocks-section';
        section.innerHTML = '<p class="edit-section-intro">Define your time blocks. Each block can have different times on different day groups.</p>';

        state.blocks.forEach((block, blockIdx) => {
            const card = document.createElement('div');
            card.className = 'block-card';
            card.style.borderLeftColor = getBlockColor(block);

            // Header row
            const header = document.createElement('div');
            header.className = 'block-card-header';
            header.innerHTML = `
                <input type="text" class="block-name-input" value="${escapeAttr(block.name)}" placeholder="Block name…">
                <select class="block-color-select">
                    ${BLOCK_COLORS.map(c => `<option value="${c.name}" ${c.name === block.color ? 'selected' : ''}>● ${c.name}</option>`).join('')}
                </select>
                <button class="btn-delete-block" title="Delete block">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>`;
            card.appendChild(header);

            header.querySelector('.block-name-input').addEventListener('input', (e) => { block.name = e.target.value; saveState(); });
            header.querySelector('.block-color-select').addEventListener('change', (e) => {
                block.color = e.target.value; card.style.borderLeftColor = getBlockColor(block); saveState();
            });
            header.querySelector('.btn-delete-block').addEventListener('click', async () => {
                const count = state.tasks.filter(t => t.blockId === block.id).length;
                const msg = count > 0 ? `Delete "${block.name}"? ${count} task(s) use this block.` : `Delete "${block.name}"?`;
                if (await showConfirm(msg)) { state.blocks.splice(blockIdx, 1); saveState(); renderEdit(); }
            });

            // Day groups
            const groupsDiv = document.createElement('div');
            groupsDiv.className = 'block-groups';

            block.groups.forEach((group, gIdx) => {
                const gEl = document.createElement('div');
                gEl.className = 'day-group';

                // Day toggles
                const dayToggles = document.createElement('div');
                dayToggles.className = 'day-toggles';
                ALL_DAYS.forEach(day => {
                    const btn = document.createElement('button');
                    btn.className = 'day-toggle' + (group.days.includes(day) ? ' active' : '');
                    btn.textContent = DAY_SHORT[DAYS.indexOf(day)];
                    btn.addEventListener('click', () => {
                        const idx = group.days.indexOf(day);
                        if (idx >= 0) group.days.splice(idx, 1); else group.days.push(day);
                        saveState(); renderEdit();
                    });
                    dayToggles.appendChild(btn);
                });
                gEl.appendChild(dayToggles);

                // Time range
                const timeRow = document.createElement('div');
                timeRow.className = 'group-time-row';
                timeRow.innerHTML = `
                    <input type="time" class="time-input grp-start" value="${group.start}">
                    <span class="time-sep">→</span>
                    <input type="time" class="time-input grp-end" value="${group.end}">
                    ${block.groups.length > 1 ? '<button class="btn-remove-group" title="Remove">✕</button>' : ''}`;
                gEl.appendChild(timeRow);

                timeRow.querySelector('.grp-start').addEventListener('change', (e) => { group.start = e.target.value; saveState(); });
                timeRow.querySelector('.grp-end').addEventListener('change', (e) => { group.end = e.target.value; saveState(); });
                const rmBtn = timeRow.querySelector('.btn-remove-group');
                if (rmBtn) rmBtn.addEventListener('click', () => { block.groups.splice(gIdx, 1); saveState(); renderEdit(); });

                groupsDiv.appendChild(gEl);
            });

            // Add day group
            const addGrp = document.createElement('button');
            addGrp.className = 'btn-add-day-group';
            addGrp.textContent = '+ Add different times for other days';
            addGrp.addEventListener('click', () => {
                const used = new Set(block.groups.flatMap(g => g.days));
                const unused = ALL_DAYS.filter(d => !used.has(d));
                block.groups.push({ days: unused.length ? unused.slice() : ['sat', 'sun'], start: '09:00', end: '17:00' });
                saveState(); renderEdit();
            });
            groupsDiv.appendChild(addGrp);
            card.appendChild(groupsDiv);
            section.appendChild(card);
        });

        // Add block
        const addBlock = document.createElement('button');
        addBlock.className = 'btn-add-block';
        addBlock.textContent = '+ Add Time Block';
        addBlock.addEventListener('click', () => {
            const usedColors = new Set(state.blocks.map(b => b.color));
            const nextColor = BLOCK_COLORS.find(c => !usedColors.has(c.name)) || BLOCK_COLORS[0];
            state.blocks.push({ id: genBlockId(), name: '📌 New Block', color: nextColor.name, groups: [{ days: ALL_DAYS.slice(), start: '09:00', end: '17:00' }] });
            saveState(); renderEdit();
        });
        section.appendChild(addBlock);
        parent.appendChild(section);
    }

    // ── Edit: Task Library ────────────────────────────────────
    function renderEditTasks(parent) {
        const section = document.createElement('div');
        section.className = 'edit-tasks-section';
        section.innerHTML = '<p class="edit-section-intro">Your master task list. Assign each task to a block and pick which days it runs.</p>';

        // Filter pills
        const filterRow = document.createElement('div');
        filterRow.className = 'task-filter-row';
        filterRow.innerHTML = '<span class="filter-label">Filter:</span>';

        const allBtn = document.createElement('button');
        allBtn.className = 'pill filter-pill' + (!taskFilterBlock ? ' active' : '');
        allBtn.textContent = 'All';
        allBtn.addEventListener('click', () => { taskFilterBlock = null; renderEdit(); });
        filterRow.appendChild(allBtn);

        state.blocks.forEach(block => {
            const pill = document.createElement('button');
            pill.className = 'pill filter-pill' + (taskFilterBlock === block.id ? ' active' : '');
            pill.style.setProperty('--pill-color', getBlockColor(block));
            pill.textContent = block.name;
            pill.addEventListener('click', () => { taskFilterBlock = block.id; renderEdit(); });
            filterRow.appendChild(pill);
        });
        section.appendChild(filterRow);

        // Task list
        const filtered = taskFilterBlock ? state.tasks.filter(t => t.blockId === taskFilterBlock) : state.tasks.slice();
        filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        const taskList = document.createElement('div');
        taskList.className = 'edit-task-list';

        filtered.forEach(task => {
            const tBlock = getBlockById(task.blockId);
            const item = document.createElement('div');
            item.className = 'edit-task-item';
            item.draggable = true;
            item.dataset.taskId = task.id;
            item.style.borderLeftColor = tBlock ? getBlockColor(tBlock) : 'var(--border)';

            item.innerHTML = `
                <span class="drag-handle">⠿</span>
                <div class="edit-task-fields">
                    <div class="edit-task-row-main">
                        <input type="text" class="edit-task-name" value="${escapeAttr(task.text)}" placeholder="Task name…">
                        <button class="btn-delete-task" aria-label="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="edit-task-row-assign">
                        <select class="task-block-select">
                            <option value="">— No block —</option>
                            ${state.blocks.map(b => `<option value="${b.id}" ${b.id === task.blockId ? 'selected' : ''}>${b.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="edit-task-row-days">
                        ${ALL_DAYS.map(day => `<button class="day-toggle small ${task.days.includes(day) ? 'active' : ''}" data-day="${day}">${DAY_SHORT[DAYS.indexOf(day)]}</button>`).join('')}
                    </div>
                    <div class="edit-task-row-meta">
                        <input type="text" class="edit-task-time" value="${escapeAttr(task.time || '')}" placeholder="⏰ Time">
                        <input type="text" class="edit-task-duration" value="${escapeAttr(task.duration || '')}" placeholder="⏱ Duration">
                    </div>
                    <div class="edit-task-row-recur">
                        <label class="recur-toggle-label">
                            <input type="checkbox" class="recur-checkbox" ${task.recurrence ? 'checked' : ''}>
                            <span>🔁 Recurring</span>
                        </label>
                        <div class="recur-fields ${task.recurrence ? '' : 'hidden'}">
                            <span>Every</span>
                            <input type="number" class="recur-every" min="1" max="52" value="${task.recurrence ? task.recurrence.every : 1}">
                            <select class="recur-unit">
                                <option value="weeks" ${(!task.recurrence || task.recurrence.unit === 'weeks') ? 'selected' : ''}>weeks</option>
                                <option value="months" ${(task.recurrence && task.recurrence.unit === 'months') ? 'selected' : ''}>months</option>
                            </select>
                            <span>from</span>
                            <input type="date" class="recur-start" value="${task.recurrence ? task.recurrence.startDate : todayStr()}">
                        </div>
                    </div>
                    <div class="edit-task-row-measure">
                        <label class="measure-toggle-label">
                            <input type="checkbox" class="measure-checkbox" ${task.measurement ? 'checked' : ''}>
                            <span>📏 Track measurement</span>
                        </label>
                        <div class="measure-fields ${task.measurement ? '' : 'hidden'}">
                            <span>Unit</span>
                            <input type="text" class="measure-unit-input" value="${escapeAttr(task.measurement ? task.measurement.unit : '')}" placeholder="e.g. lbs, kg, mins">
                            <span>Goal</span>
                            <input type="number" step="any" class="measure-goal-input" value="${task.measurement && task.measurement.goal ? task.measurement.goal : ''}" placeholder="optional">
                        </div>
                    </div>
                </div>`;

            // Bindings
            item.querySelector('.edit-task-name').addEventListener('input', (e) => { task.text = e.target.value; saveState(); });
            item.querySelector('.task-block-select').addEventListener('change', (e) => {
                task.blockId = e.target.value;
                const nb = getBlockById(task.blockId);
                item.style.borderLeftColor = nb ? getBlockColor(nb) : 'var(--border)';
                saveState();
            });
            item.querySelectorAll('.day-toggle').forEach(btn => {
                btn.addEventListener('click', () => {
                    const day = btn.dataset.day;
                    const idx = task.days.indexOf(day);
                    if (idx >= 0) task.days.splice(idx, 1); else task.days.push(day);
                    btn.classList.toggle('active'); saveState();
                });
            });
            item.querySelector('.edit-task-time').addEventListener('input', (e) => { task.time = e.target.value.trim(); saveState(); });
            item.querySelector('.edit-task-duration').addEventListener('input', (e) => { task.duration = e.target.value.trim(); saveState(); });

            const recurCb = item.querySelector('.recur-checkbox');
            const recurF = item.querySelector('.recur-fields');
            recurCb.addEventListener('change', () => {
                if (recurCb.checked) {
                    recurF.classList.remove('hidden');
                    task.recurrence = { every: parseInt(item.querySelector('.recur-every').value) || 1, unit: item.querySelector('.recur-unit').value, startDate: item.querySelector('.recur-start').value || todayStr() };
                } else { recurF.classList.add('hidden'); task.recurrence = null; }
                saveState();
            });
            item.querySelector('.recur-every').addEventListener('input', (e) => { if (task.recurrence) { task.recurrence.every = parseInt(e.target.value) || 1; saveState(); } });
            item.querySelector('.recur-unit').addEventListener('change', (e) => { if (task.recurrence) { task.recurrence.unit = e.target.value; saveState(); } });
            item.querySelector('.recur-start').addEventListener('change', (e) => { if (task.recurrence) { task.recurrence.startDate = e.target.value; saveState(); } });

            // Measurement bindings
            const measureCb = item.querySelector('.measure-checkbox');
            const measureF = item.querySelector('.measure-fields');
            measureCb.addEventListener('change', () => {
                if (measureCb.checked) {
                    measureF.classList.remove('hidden');
                    task.measurement = { unit: item.querySelector('.measure-unit-input').value.trim() || '', goal: parseFloat(item.querySelector('.measure-goal-input').value) || null };
                } else { measureF.classList.add('hidden'); task.measurement = null; }
                saveState();
            });
            item.querySelector('.measure-unit-input').addEventListener('input', (e) => { if (task.measurement) { task.measurement.unit = e.target.value.trim(); saveState(); } });
            item.querySelector('.measure-goal-input').addEventListener('input', (e) => { if (task.measurement) { task.measurement.goal = parseFloat(e.target.value) || null; saveState(); } });

            item.querySelector('.btn-delete-task').addEventListener('click', async () => {
                if (await showConfirm(`Remove "${task.text || '(empty)'}"?`)) {
                    archiveTask(task);
                    const idx = state.tasks.indexOf(task);
                    if (idx >= 0) state.tasks.splice(idx, 1);
                    saveState(); renderEdit();
                }
            });

            // Drag & drop
            item.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', task.id); item.style.opacity = '0.4'; });
            item.addEventListener('dragend', () => { item.style.opacity = '1'; });
            item.addEventListener('dragover', (e) => { e.preventDefault(); item.style.borderTop = '2px solid var(--accent-workday)'; });
            item.addEventListener('dragleave', () => { item.style.borderTop = ''; });
            item.addEventListener('drop', (e) => {
                e.preventDefault(); item.style.borderTop = '';
                const fromId = e.dataTransfer.getData('text/plain');
                const fromTask = getTaskById(fromId);
                if (fromTask && fromTask !== task) {
                    const tmp = fromTask.sortOrder; fromTask.sortOrder = task.sortOrder; task.sortOrder = tmp;
                    saveState(); renderEdit();
                }
            });

            taskList.appendChild(item);
        });
        section.appendChild(taskList);

        // Add task
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-task';
        addBtn.textContent = '+ Add Task';
        addBtn.addEventListener('click', () => {
            const maxOrder = state.tasks.reduce((m, t) => Math.max(m, t.sortOrder || 0), 0);
            const defBlock = taskFilterBlock || (state.blocks.length > 0 ? state.blocks[0].id : '');
            state.tasks.push({ id: genTaskId(), text: '', blockId: defBlock, days: ALL_DAYS.slice(), time: '', duration: '', recurrence: null, sortOrder: maxOrder + 1 });
            saveState(); renderEdit();
            setTimeout(() => { const inputs = section.querySelectorAll('.edit-task-name'); if (inputs.length) inputs[inputs.length - 1].focus(); }, 50);
        });
        section.appendChild(addBtn);

        // Archive
        if (state.archive.length > 0) {
            const archSec = document.createElement('div');
            archSec.className = 'archive-section';
            archSec.innerHTML = `
                <button class="archive-toggle"><span class="archive-toggle-icon">▶</span> Archived (${state.archive.length})</button>
                <div class="archive-list hidden"></div>`;
            const toggle = archSec.querySelector('.archive-toggle');
            const list = archSec.querySelector('.archive-list');
            const icon = archSec.querySelector('.archive-toggle-icon');
            toggle.addEventListener('click', () => { list.classList.toggle('hidden'); icon.textContent = list.classList.contains('hidden') ? '▶' : '▼'; });
            state.archive.forEach((a, i) => {
                const ai = document.createElement('div');
                ai.className = 'archive-item';
                ai.innerHTML = `<span class="archive-task-text">${escapeHtml(a.text)}</span><button class="btn-restore">↩ Restore</button>`;
                ai.querySelector('.btn-restore').addEventListener('click', () => {
                    const maxOrder = state.tasks.reduce((m, t) => Math.max(m, t.sortOrder || 0), 0);
                    state.tasks.push({ id: genTaskId(), text: a.text, blockId: a.blockId || (state.blocks[0] ? state.blocks[0].id : ''), days: a.days || ALL_DAYS.slice(), time: a.time || '', duration: a.duration || '', recurrence: null, sortOrder: maxOrder + 1 });
                    state.archive.splice(i, 1); saveState(); renderEdit();
                });
                list.appendChild(ai);
            });
            section.appendChild(archSec);
        }

        parent.appendChild(section);
    }

    // ── Backup Section ────────────────────────────────────────
    function renderBackupSection(parent) {
        const section = document.createElement('div');
        section.className = 'backup-section';
        section.innerHTML = `
            <h3>☁️ Backup & Sync</h3>
            <p class="backup-subtitle">Your data auto-syncs to the cloud. Extra safety options below.</p>
            <div class="backup-buttons">
                <button class="btn-backup btn-recovery" id="btn-show-recovery">🔑 Recovery Code</button>
                <button class="btn-backup btn-cloud" id="btn-cloud-restore">☁️ Cloud Restore</button>
            </div>
            <div class="backup-buttons" style="margin-top:8px">
                <button class="btn-backup btn-export" id="btn-export">⬇ Export</button>
                <button class="btn-backup btn-import" id="btn-import">⬆ Import</button>
            </div>
            <div class="backup-buttons" style="margin-top:8px">
                <button class="btn-backup btn-clipboard" id="btn-copy-clipboard">📋 Copy Data</button>
                <button class="btn-backup btn-link" id="btn-copy-link">🔗 Backup Link</button>
            </div>`;
        parent.appendChild(section);
        section.querySelector('#btn-show-recovery').addEventListener('click', () => showRecoveryCodeModal(getRecoveryCode(), false));
        section.querySelector('#btn-cloud-restore').addEventListener('click', async () => { if (await showRecoveryInputModal()) switchView('today'); });
        section.querySelector('#btn-export').addEventListener('click', exportData);
        section.querySelector('#btn-import').addEventListener('click', importData);
        section.querySelector('#btn-copy-clipboard').addEventListener('click', copyBackupToClipboard);
        section.querySelector('#btn-copy-link').addEventListener('click', copyBackupLink);
    }

    // ══════════════════════════════════════════════════════════
    // ── CALENDAR / STATS VIEW ─────────────────────────────────
    // ══════════════════════════════════════════════════════════
    let calYear = new Date().getFullYear();
    let calMonth = new Date().getMonth();
    let calSelectedDate = null;

    function renderStats() {
        const container = document.getElementById('stats-content');
        container.innerHTML = '';

        const dateStr = todayStr();
        const dayName = todayDayName();
        const dayBlocks = getBlocksForDay(dayName);

        let todayDone = 0, todayTotal = 0;
        for (const block of dayBlocks) {
            for (const t of getTasksForDayAndBlock(dayName, block.id)) {
                if (!isTaskDueOnDate(t, dateStr)) continue;
                todayTotal++; if (getCompletion(dateStr, t.id)) todayDone++;
            }
        }
        const todos = getTodos(dateStr);
        todayTotal += todos.length;
        for (const t of todos) { if (t.done) todayDone++; }
        const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;
        const streaks = computeStreaks();

        // Calendar
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const todayDate = new Date();
        const isCurrentMonth = calYear === todayDate.getFullYear() && calMonth === todayDate.getMonth();

        let cells = '';
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(h => { cells += `<div class="cal-header-cell">${h}</div>`; });
        for (let i = 0; i < firstDay; i++) cells += '<div class="cal-cell empty"></div>';
        for (let day = 1; day <= daysInMonth; day++) {
            const ds = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            const h = state.history[ds];
            const isFuture = new Date(calYear, calMonth, day) > todayDate;
            const isToday = isCurrentMonth && day === todayDate.getDate();
            const isSel = ds === calSelectedDate;
            let dc = '';
            if (!isFuture && h && h.total > 0) {
                const p = h.completed / h.total;
                if (p >= 1) dc = 'cal-perfect'; else if (p >= 0.5) dc = 'cal-good'; else if (p > 0) dc = 'cal-partial'; else dc = 'cal-none';
            }
            cells += `<div class="cal-cell ${dc}${isToday ? ' cal-today' : ''}${isSel ? ' cal-selected' : ''}${isFuture ? ' cal-future' : ''}" data-date="${ds}">${day}</div>`;
        }

        container.innerHTML = `
            <div class="stat-card">
                <h3>Today's Progress</h3>
                <div class="stat-value green">${todayPct}%</div>
                <div class="stat-sub">${todayDone} of ${todayTotal} tasks · 🔥 ${streaks.current}-day streak${streaks.best > streaks.current ? ` · Best: ${streaks.best}` : ''}</div>
            </div>
            <div class="cal-card">
                <div class="cal-nav">
                    <button class="cal-nav-btn" id="cal-prev">‹</button>
                    <span class="cal-month-label">${monthNames[calMonth]} ${calYear}</span>
                    <button class="cal-nav-btn" id="cal-next">›</button>
                </div>
                <div class="cal-grid">${cells}</div>
                <div class="cal-legend">
                    <span class="cal-leg"><span class="cal-leg-dot cal-perfect"></span>100%</span>
                    <span class="cal-leg"><span class="cal-leg-dot cal-good"></span>50%+</span>
                    <span class="cal-leg"><span class="cal-leg-dot cal-partial"></span>&lt;50%</span>
                    <span class="cal-leg"><span class="cal-leg-dot cal-none"></span>0%</span>
                </div>
            </div>
            <div id="cal-detail"></div>`;

        document.getElementById('cal-prev').addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } calSelectedDate = null; renderStats(); });
        document.getElementById('cal-next').addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } calSelectedDate = null; renderStats(); });

        container.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
            cell.addEventListener('click', () => {
                const ds = cell.dataset.date;
                if (new Date(ds + 'T12:00:00') > todayDate) return;
                calSelectedDate = ds;
                container.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('cal-selected'));
                cell.classList.add('cal-selected');
                renderCalendarDetail(ds);
            });
        });
        if (calSelectedDate) renderCalendarDetail(calSelectedDate);
    }

    function renderCalendarDetail(dateStr) {
        const detailEl = document.getElementById('cal-detail');
        if (!detailEl) return;
        const d = new Date(dateStr + 'T12:00:00');
        const dayName = DAYS[d.getDay()];
        const dayBlocks = getBlocksForDay(dayName);
        const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        let html = `<div class="cal-detail-card"><h3>📋 ${dateLabel}</h3>`;
        for (const block of dayBlocks) {
            const tasks = getTasksForDayAndBlock(dayName, block.id).filter(t => isTaskDueOnDate(t, dateStr));
            if (!tasks.length) continue;
            html += `<div class="cal-detail-block"><h4>${block.name}</h4><ul class="cal-detail-list">`;
            tasks.forEach(task => {
                const done = getCompletion(dateStr, task.id);
                const ts = done ? computeTaskStreak(task.id) : 0;
                const sb = ts >= 2 ? ` <span class="task-streak-badge">🔥${ts}</span>` : '';
                const ri = task.recurrence ? '🔁 ' : '';
                html += `<li class="${done ? 'done' : 'missed'}">${done ? '✅' : '⬜'} ${ri}${escapeHtml(task.text)}${done ? sb : ''}</li>`;
            });
            html += '</ul></div>';
        }
        const dateTodos = state.todos[dateStr];
        if (dateTodos && dateTodos.length) {
            html += '<div class="cal-detail-block"><h4>📝 To-Dos</h4><ul class="cal-detail-list">';
            for (const t of dateTodos) html += `<li class="${t.done ? 'done' : 'missed'}">${t.done ? '✅' : '⬜'} ${escapeHtml(t.text)}</li>`;
            html += '</ul></div>';
        }
        const h = state.history[dateStr];
        if (h && h.total > 0) {
            html += `<div class="cal-detail-summary">${h.completed}/${h.total} completed (${Math.round((h.completed / h.total) * 100)}%)</div>`;
        } else { html += '<div class="cal-detail-summary">No data for this day</div>'; }
        html += '</div>';
        detailEl.innerHTML = html;
    }

    // ══════════════════════════════════════════════════════════
    // ── TRACK VIEW (Measurements) ─────────────────────────────
    // ══════════════════════════════════════════════════════════
    let trackRanges = {}; // taskId -> { range: '1M', offset: 0 }

    function renderTrack() {
        const container = document.getElementById('track-content');
        container.innerHTML = '';

        // Find all tasks with measurement enabled
        const measurableTasks = state.tasks.filter(t => t.measurement);

        if (!measurableTasks.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <p>No measurable tasks yet.<br>Go to Edit → enable "📏 Track measurement" on a task.</p>
                </div>`;
            return;
        }

        measurableTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'track-card';
            const block = getBlockById(task.blockId);
            card.style.borderLeftColor = block ? getBlockColor(block) : 'var(--border)';

            // Get or init range state
            if (!trackRanges[task.id]) trackRanges[task.id] = { range: '1M', offset: 0 };
            const rs = trackRanges[task.id];

            const data = (state.measurements[task.id] || []).slice().sort((a, b) => a.date.localeCompare(b.date));

            // Header
            const header = document.createElement('div');
            header.className = 'track-card-header';
            header.innerHTML = `
                <div>
                    <span class="track-task-name">${escapeHtml(task.text)}</span>
                    <span class="track-task-unit">${escapeHtml(task.measurement.unit || '')}</span>
                </div>
                <div class="track-latest">
                    ${data.length ? `<span class="track-latest-value">${data[data.length - 1].value}</span> <span class="track-latest-unit">${escapeHtml(task.measurement.unit || '')}</span>` : '<span class="track-no-data">No data yet</span>'}
                </div>`;
            card.appendChild(header);

            // Range toggle buttons
            const rangeRow = document.createElement('div');
            rangeRow.className = 'track-range-row';
            ['1W', '1M', '6M', '1Y'].forEach(r => {
                const btn = document.createElement('button');
                btn.className = 'track-range-btn' + (rs.range === r ? ' active' : '');
                btn.textContent = r;
                btn.addEventListener('click', () => { rs.range = r; rs.offset = 0; renderTrack(); });
                rangeRow.appendChild(btn);
            });
            card.appendChild(rangeRow);

            // Navigation arrows + chart
            const chartRow = document.createElement('div');
            chartRow.className = 'track-chart-row';

            const prevBtn = document.createElement('button');
            prevBtn.className = 'track-nav-btn';
            prevBtn.textContent = '‹';
            prevBtn.addEventListener('click', () => { rs.offset++; renderTrack(); });

            const nextBtn = document.createElement('button');
            nextBtn.className = 'track-nav-btn';
            nextBtn.textContent = '›';
            nextBtn.disabled = rs.offset === 0;
            nextBtn.addEventListener('click', () => { if (rs.offset > 0) { rs.offset--; renderTrack(); } });

            const canvasWrap = document.createElement('div');
            canvasWrap.className = 'track-canvas-wrap';
            const canvas = document.createElement('canvas');
            canvas.className = 'track-canvas';
            canvas.width = 600;
            canvas.height = 220;
            canvasWrap.appendChild(canvas);

            chartRow.appendChild(prevBtn);
            chartRow.appendChild(canvasWrap);
            chartRow.appendChild(nextBtn);
            card.appendChild(chartRow);

            // Data count
            const countEl = document.createElement('div');
            countEl.className = 'track-data-count';
            countEl.textContent = `${data.length} measurement${data.length !== 1 ? 's' : ''} logged`;
            card.appendChild(countEl);

            container.appendChild(card);

            // Draw chart after DOM insertion
            requestAnimationFrame(() => drawMeasurementChart(canvas, data, task.measurement, rs));
        });
    }

    function drawMeasurementChart(canvas, data, measurement, rangeState) {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Scale for high-DPI
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = 220 * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = '220px';
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const H = 220;
        const pad = { top: 25, right: 15, bottom: 35, left: 45 };
        const chartW = W - pad.left - pad.right;
        const chartH = H - pad.top - pad.bottom;

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Compute date range
        const rangeDays = { '1W': 7, '1M': 30, '6M': 182, '1Y': 365 }[rangeState.range] || 30;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - rangeState.offset * rangeDays);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - rangeDays);

        const startStr = dateStr(startDate);
        const endStr = dateStr(endDate);

        // Filter data to range
        const rangeData = data.filter(d => d.date >= startStr && d.date <= endStr);

        // Date label for range
        const rangeLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' — ' +
            endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        ctx.fillStyle = '#8888a8';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rangeLabel, W / 2, H - 5);

        if (rangeData.length === 0) {
            ctx.fillStyle = '#55556a';
            ctx.font = '13px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data in this range', W / 2, H / 2);
            return;
        }

        // Compute Y range
        const values = rangeData.map(d => d.value);
        let minY = Math.min(...values);
        let maxY = Math.max(...values);
        if (measurement.goal) {
            minY = Math.min(minY, measurement.goal);
            maxY = Math.max(maxY, measurement.goal);
        }
        const yPad = (maxY - minY) * 0.15 || 1;
        minY -= yPad;
        maxY += yPad;

        // X scale: days from startDate
        const totalDays = rangeDays;
        function xPos(ds) {
            const d = new Date(ds + 'T12:00:00');
            const diff = (d - startDate) / (1000 * 60 * 60 * 24);
            return pad.left + (diff / totalDays) * chartW;
        }
        function yPos(v) {
            return pad.top + chartH - ((v - minY) / (maxY - minY)) * chartH;
        }

        // Grid lines
        ctx.strokeStyle = '#2a2a3e';
        ctx.lineWidth = 0.5;
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = pad.top + (i / gridLines) * chartH;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(W - pad.right, y);
            ctx.stroke();

            // Y-axis labels
            const val = maxY - (i / gridLines) * (maxY - minY);
            ctx.fillStyle = '#8888a8';
            ctx.font = '10px -apple-system, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(val.toFixed(1), pad.left - 6, y + 3);
        }

        // Goal line
        if (measurement.goal) {
            const gy = yPos(measurement.goal);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(pad.left, gy);
            ctx.lineTo(W - pad.right, gy);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#10b981';
            ctx.font = '10px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Goal: ' + measurement.goal, W - pad.right - 60, gy - 6);
        }

        // Data line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        rangeData.forEach((d, i) => {
            const x = xPos(d.date);
            const y = yPos(d.value);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Gradient fill under line
        const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        rangeData.forEach((d, i) => {
            const x = xPos(d.date);
            const y = yPos(d.value);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(xPos(rangeData[rangeData.length - 1].date), pad.top + chartH);
        ctx.lineTo(xPos(rangeData[0].date), pad.top + chartH);
        ctx.closePath();
        ctx.fill();

        // Data points
        rangeData.forEach(d => {
            const x = xPos(d.date);
            const y = yPos(d.value);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#3b82f6';
            ctx.fill();
            ctx.strokeStyle = '#0a0a0f';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // X-axis date labels (sparse)
        ctx.fillStyle = '#8888a8';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        const labelInterval = Math.max(1, Math.floor(rangeDays / 6));
        for (let i = 0; i <= rangeDays; i += labelInterval) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const x = pad.left + (i / totalDays) * chartW;
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            ctx.fillText(label, x, pad.top + chartH + 18);
        }
    }

    // ══════════════════════════════════════════════════════════
    // ── Boot ──────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════
    function init() {
        initFirebase();
        const hasLocalData = localStorage.getItem(STORAGE_KEY) !== null;
        const hasRecoveryCode = localStorage.getItem(RECOVERY_CODE_KEY) !== null;
        rollForwardTodos();
        switchView('today');

        setTimeout(async () => {
            if (!hasLocalData && cloudSyncEnabled) {
                const restored = await showWelcomeOrRestoreModal();
                if (!restored) { const code = getRecoveryCode(); syncToCloud(); showRecoveryCodeModal(code, true); }
            } else if (hasRecoveryCode && cloudSyncEnabled) { syncToCloud(); }
        }, 500);

        setInterval(() => { if (currentView === 'today') renderToday(); }, 60000);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && cloudSyncEnabled) pullFromCloudIfNewer();
        });
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(reg => {
            // Check for updates every 60 seconds
            setInterval(() => reg.update(), 60 * 1000);

            // Also check when the app comes back to foreground
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') reg.update();
            });

            // When a new service worker is waiting, activate it and reload
            const onNewSW = () => {
                if (reg.waiting) {
                    reg.waiting.postMessage('skipWaiting');
                }
            };

            if (reg.waiting) onNewSW();

            reg.addEventListener('updatefound', () => {
                const newSW = reg.installing;
                if (newSW) {
                    newSW.addEventListener('statechange', () => {
                        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version ready — auto-reload
                            onNewSW();
                        }
                    });
                }
            });
        }).catch(err => console.warn('SW failed:', err));

        // When the new SW takes over, reload the page to get fresh assets
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }

    init();
})();
