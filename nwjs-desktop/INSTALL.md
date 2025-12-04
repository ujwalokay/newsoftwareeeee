# Complete Installation Guide for Airavoto Gaming POS Desktop

This guide will walk you through setting up the NW.js desktop application step by step.

---

## STEP 1: Prerequisites

### Install Node.js

1. Go to https://nodejs.org/
2. Download the **LTS version** (v20.x or later)
3. Run the installer and follow the prompts
4. Verify installation by opening a terminal/command prompt:

```bash
node --version
# Should show: v20.x.x or higher

npm --version
# Should show: 10.x.x or higher
```

---

## STEP 2: Download/Copy the Desktop Application Files

### Option A: If you have the Replit project

1. Download the entire `nwjs-desktop` folder from Replit
2. Also download:
   - The `client` folder (frontend React application)
   - The `attached_assets` folder (images and assets)

### Option B: Manual file structure

Create this folder structure:

```
airavoto-gaming-desktop/
├── nwjs-desktop/          # This folder
├── client/                # Copy from main project
└── attached_assets/       # Copy from main project
```

---

## STEP 3: Copy Required Folders

From your main Replit project, copy these folders into `nwjs-desktop`:

```bash
# If using command line (from the main project folder):
cp -r client nwjs-desktop/
cp -r attached_assets nwjs-desktop/
```

Or manually copy using File Explorer/Finder.

---

## STEP 4: Install Dependencies

Open a terminal/command prompt in the `nwjs-desktop` folder:

```bash
cd nwjs-desktop
npm install
```

This will install all required packages (may take 2-5 minutes).

---

## STEP 5: Configure Environment (Optional but Recommended)

1. Copy the example environment file:

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

2. Edit `.env` to set your admin credentials:

```env
ADMIN_USERNAME=your_admin_name
ADMIN_PASSWORD=YourSecurePassword123
```

If you skip this, default credentials will be:
- Username: `admin`
- Password: `admin123`

---

## STEP 6: Build the Application

```bash
npm run build
```

This compiles:
- The TypeScript server code
- The React frontend

---

## STEP 7: Run the Application

### Option A: Run with NW.js (Desktop Window)

```bash
npm start
```

This opens the application in a dedicated desktop window.

### Option B: Run in Browser

```bash
node server/dist/index.js
```

Then open your browser to: `http://localhost:5000`

---

## STEP 8: First Time Login

1. The application will open in a window (or browser)
2. Login with your credentials:
   - Default: `admin` / `admin123`
   - Or your custom credentials from `.env`
3. **IMPORTANT**: Change the default password immediately!

---

## Creating a Standalone Executable (Optional)

To create a distributable application that doesn't require Node.js:

### For Windows:
```bash
npm run package:win
```

### For macOS:
```bash
npm run package:mac
```

### For Linux:
```bash
npm run package:linux
```

The executable will be created in the `dist/` folder.

---

## Troubleshooting

### "npm command not found"
- Node.js is not installed correctly
- Restart your terminal after installing Node.js

### "Port 5000 is already in use"
- Another application is using port 5000
- Edit `.env` and change `PORT=5001`

### "Cannot find module 'better-sqlite3'"
```bash
npm rebuild better-sqlite3
```

### "EACCES permission denied"
- Run the terminal as Administrator (Windows)
- Or use `sudo` on macOS/Linux

### Build errors
```bash
rm -rf node_modules
rm -rf dist
npm install
npm run build
```

---

## Data Backup

Your database is stored at:
```
nwjs-desktop/data/airavoto-gaming.db
```

To backup:
1. Stop the application
2. Copy the `.db` file to a safe location
3. Restart the application

To restore:
1. Stop the application
2. Replace the `.db` file with your backup
3. Restart the application

---

## Updating the Application

1. Stop the application
2. Backup your database (the `.db` file)
3. Download/copy the new version
4. Copy your old `.db` file to the new `data/` folder
5. Run `npm install` and `npm run build`
6. Start the application

---

## Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Look at the terminal/console for error messages
3. Contact support at support@airavotogaming.com

---

## Quick Command Reference

| Action | Command |
|--------|---------|
| Install dependencies | `npm install` |
| Build application | `npm run build` |
| Start (desktop window) | `npm start` |
| Start (development) | `npm run dev` |
| Package for Windows | `npm run package:win` |
| Package for macOS | `npm run package:mac` |
| Package for Linux | `npm run package:linux` |
