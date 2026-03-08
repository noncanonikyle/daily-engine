# ⚡ Daily Engine

A time-aware daily routine checklist that lives on your phone. It shows you what to do based on the **time of day** and **day of the week** — so you always know what's next.

**👉 Get the app: [noncanonikyle.github.io/daily-engine](https://noncanonikyle.github.io/daily-engine/)**

---

## 📱 Install on Your Phone

### iPhone
1. Open **Safari** (must be Safari, not Chrome)
2. Go to **[noncanonikyle.github.io/daily-engine](https://noncanonikyle.github.io/daily-engine/)**
3. Tap the **Share** button (square with arrow ↑)
4. Tap **"Add to Home Screen"**
5. Name it "Daily Engine" → tap **Add**
6. 🎉 It's on your home screen — launches like a real app!

### Android
1. Open **Chrome**
2. Go to **[noncanonikyle.github.io/daily-engine](https://noncanonikyle.github.io/daily-engine/)**
3. You should see an **"Install App"** banner — tap it
4. Or tap the **⋮ menu** → **"Add to Home Screen"**

### Desktop
Just bookmark the URL. It works great in any modern browser too.

---

## ✨ Features

- 🕐 **Time-aware** — automatically shows Morning, Workday/Free, or Evening tasks
- 📅 **Day-specific** — different routines for weekdays vs weekends
- ✅ **Tap to check off** — satisfying checklist with progress bar
- 📝 **To-Do list** — separate section for one-off tasks (rolls forward if incomplete)
- 📆 **Calendar view** — browse past days, see color-coded completion history
- 🔥 **Streak counter** — track your consistency
- ✏️ **Fully customizable** — add, remove, reorder tasks for any day and time block
- ⏰ **Custom time blocks** — set your own morning/workday/evening hours
- 🌙 **Dark mode** — easy on the eyes
- 📴 **Works offline** — cached on your phone after first visit
- 💾 **Your data stays private** — everything is stored locally on your device, never sent anywhere
- 🔄 **Backup & restore** — export, copy, or generate a backup link

---

## 🔒 Privacy & Data

Your data **never leaves your device**. Everything is stored in your browser's local storage. There are no accounts, no servers, no tracking. Each person who uses the app has their own completely independent data.

**Backup options** (found in the Edit view):
- 📥 Export as JSON file
- 📋 Copy to clipboard
- 🔗 Generate a backup link

---

## ❓ FAQ

**Q: Do I need to create an account?**
Nope. Just open the link and start using it.

**Q: Do I need a GitHub account?**
No! Only the developer needs that. You just use the link.

**Q: Can other people see my tasks?**
No. Your data is stored locally on your device only.

**Q: Does it work offline?**
Yes! After the first visit, everything is cached on your phone.

**Q: What if I clear my browser data?**
You'll lose your saved tasks and history. Use the backup feature in the Edit view to save a copy first!

**Q: Does it work on Android?**
Yes! Works on any modern phone or computer.

---

## 🛠️ For Developers

### Project Structure

```
daily-engine/
├── index.html          # App shell
├── styles.css          # Dark mode styles
├── app.js              # Core logic
├── sw.js               # Service worker (offline)
├── manifest.json       # PWA manifest
├── icons/
│   ├── icon-192.svg    # App icon (small)
│   └── icon-512.svg    # App icon (large)
└── README.md           # This file
```

### Self-Hosting

If you want to host your own copy:

1. Fork or clone this repo
2. Enable GitHub Pages (Settings → Pages → main branch)
3. Your version will be at `https://YOUR-USERNAME.github.io/daily-engine/`

Or deploy to Netlify/Vercel by dragging the folder into their dashboard.

### Updating

After making code changes, bump the `CACHE_NAME` version in `sw.js` to force a cache refresh for existing users.
