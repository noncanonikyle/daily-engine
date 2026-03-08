# ⚡ Daily Engine

A time-aware daily routine checklist PWA (Progressive Web App) that keeps your life on track.

## What Is This?

A web app that acts like a native iPhone app. It shows you a customized checklist based on the **time of day** and **day of the week** — so you always know what you should be doing right now.

### Features
- 🕐 **Time-aware**: Automatically shows Morning, Workday, or Evening tasks
- 📅 **Day-specific**: Different schedules for each day (weekday vs weekend)
- ✅ **Tap to check off**: Satisfying checklist with progress bar
- 📊 **Progress tracking**: See your daily and weekly stats
- ✏️ **Fully editable**: Add, remove, reorder tasks for any day/block
- ⏰ **Custom time blocks**: Set your own morning/workday/evening hours
- 🌙 **Dark mode**: Easy on the eyes
- 📴 **Works offline**: Cached on your phone after first visit
- 📱 **Installable**: Add to home screen, launches like a real app

---

## 🚀 How To Deploy & Install On Your iPhone

### Option 1: GitHub Pages (FREE, easiest)

#### Step 1: Create a GitHub account (if you don't have one)
1. Go to [github.com](https://github.com)
2. Sign up for a free account

#### Step 2: Create a new repository
1. Click the **"+"** button (top right) → **New repository**
2. Name it: `daily-engine`
3. Make it **Public** (required for free GitHub Pages)
4. Click **Create repository**

#### Step 3: Upload the files
1. On the repository page, click **"uploading an existing file"**
2. Drag and drop ALL these files from the `daily-engine` folder:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `sw.js`
   - `manifest.json`
   - `icons/` folder (with both SVG files)
3. Click **Commit changes**

#### Step 4: Enable GitHub Pages
1. Go to your repo → **Settings** tab
2. Scroll to **Pages** (left sidebar)
3. Under "Source", select **main** branch
4. Click **Save**
5. Wait 1-2 minutes, then your app will be live at:
   ```
   https://YOUR-USERNAME.github.io/daily-engine/
   ```

#### Step 5: Install on your iPhone
1. Open **Safari** on your iPhone (must be Safari, not Chrome)
2. Go to `https://YOUR-USERNAME.github.io/daily-engine/`
3. Tap the **Share** button (square with arrow pointing up)
4. Scroll down and tap **"Add to Home Screen"**
5. Name it "Daily Engine" → tap **Add**
6. 🎉 The app icon now appears on your home screen!

---

### Option 2: Netlify (FREE, also easy)

1. Go to [netlify.com](https://www.netlify.com) and sign up
2. Click **"Add new site"** → **Deploy manually**
3. Drag and drop the entire `daily-engine` folder
4. Your app gets a URL like `https://random-name.netlify.app`
5. Install on iPhone using the same Safari → Add to Home Screen steps above

---

### Option 3: Vercel (FREE)

1. Go to [vercel.com](https://vercel.com) and sign up
2. Install the Vercel CLI or use the dashboard
3. Upload/deploy the `daily-engine` folder
4. Same iPhone install steps as above

---

## 🧪 Testing Locally (On Your Computer)

To test the app in your browser before deploying:

### Using Python (probably already installed):
```bash
cd daily-engine
python3 -m http.server 8080
```
Then open: `http://localhost:8080`

### Using Node.js:
```bash
npx serve daily-engine
```

### Using VS Code:
Install the **"Live Server"** extension, then right-click `index.html` → **Open with Live Server**

---

## 📁 Project Structure

```
daily-engine/
├── index.html          # Main app HTML
├── styles.css          # All styles (dark mode)
├── app.js              # Core app logic
├── sw.js               # Service worker (offline support)
├── manifest.json       # PWA manifest (app metadata)
├── icons/
│   ├── icon-192.svg    # App icon (small)
│   └── icon-512.svg    # App icon (large)
└── README.md           # This file
```

## 🔧 Customization

### Editing Default Tasks
Open `app.js` and find the `getDefaultSchedule()` function. Edit the arrays for each time block.

### Changing Colors
Open `styles.css` and edit the CSS variables in `:root { ... }` at the top.

### Changing Time Blocks
Either edit in the app (Settings section of Edit view) or change `getDefaultTimeBlocks()` in `app.js`.

---

## ❓ FAQ

**Q: Do I need an Apple Developer account?**
No! This is a web app, not a native App Store app.

**Q: Does it work offline?**
Yes! After the first visit, the service worker caches everything.

**Q: Where is my data stored?**
Locally on your device in the browser's localStorage. It never leaves your phone.

**Q: Can I use this on Android too?**
Yes! Same steps but you'll get an "Install App" prompt in Chrome automatically.

**Q: How do I update the app after deploying?**
Just update the files on GitHub/Netlify/Vercel. Bump the `CACHE_NAME` version in `sw.js` to force a refresh.
