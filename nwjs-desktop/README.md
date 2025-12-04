# Airavoto Gaming POS - Desktop Application

A complete offline desktop application for managing your gaming lounge/cafe. This version runs entirely on your local PC with SQLite database storage - no internet required.

## System Requirements

- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for application, additional space for database
- **Node.js**: v18.0.0 or higher (v20 recommended)

## Quick Start (Development)

### Step 1: Install Node.js

Download and install Node.js from: https://nodejs.org/
Choose the LTS version (v20.x recommended).

Verify installation:
```bash
node --version
npm --version
```

### Step 2: Install Dependencies

Navigate to the nwjs-desktop folder and install dependencies:

```bash
cd nwjs-desktop
npm install
```

### Step 3: Build the Application

Build both server and client:

```bash
npm run build
```

### Step 4: Run the Application

```bash
npm start
```

The application will:
1. Start a local Express server on port 5000
2. Open an NW.js window with the application
3. Create/use a SQLite database in the data folder

## Manual Setup (Without NW.js)

If you prefer to run without NW.js (browser-based):

### Step 1: Install Dependencies

```bash
cd nwjs-desktop
npm install
```

### Step 2: Build the Application

```bash
npm run build:server
npm run build:client
```

### Step 3: Start the Server

```bash
node server/dist/index.js
```

### Step 4: Open in Browser

Open your browser and go to: `http://localhost:5000`

## Default Login Credentials

- **Username**: admin
- **Password**: admin123

**IMPORTANT**: Change the password after first login!

## Environment Variables (Optional)

Create a `.env` file in the nwjs-desktop folder:

```env
# Server Configuration
PORT=5000
SESSION_SECRET=your-secret-key-here

# Default Admin Credentials (used on first run only)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Data Storage Location (optional)
DATA_DIR=./data
```

## Database Location

The SQLite database is stored at:
- **Default**: `./data/airavoto-gaming.db`
- **NW.js**: `<User Data Path>/airavoto-gaming.db`

### Backup Your Database

To backup your data, simply copy the `.db` file:

```bash
# Windows
copy data\airavoto-gaming.db data\backup-2024-01-15.db

# macOS/Linux
cp data/airavoto-gaming.db data/backup-2024-01-15.db
```

### Restore Database

To restore from backup:

```bash
# Stop the application first, then:
# Windows
copy data\backup-2024-01-15.db data\airavoto-gaming.db

# macOS/Linux
cp data/backup-2024-01-15.db data/airavoto-gaming.db
```

## Building Standalone Executable

### For Windows:

```bash
npm run package:win
```

Output will be in: `./dist/airavoto-gaming-pos-win64/`

### For macOS:

```bash
npm run package:mac
```

Output will be in: `./dist/airavoto-gaming-pos-osx64/`

### For Linux:

```bash
npm run package:linux
```

Output will be in: `./dist/airavoto-gaming-pos-linux64/`

## Troubleshooting

### Port Already in Use

If port 5000 is in use, either:
1. Close the application using that port
2. Or set a different port in `.env`:
   ```env
   PORT=5001
   ```

### Database Errors

If you encounter database errors:

1. Stop the application
2. Delete `data/airavoto-gaming.db`
3. Restart the application (creates fresh database)

**Warning**: This will delete all your data. Backup first!

### NW.js Not Starting

1. Make sure Node.js is installed correctly
2. Try reinstalling dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```
3. Check if another instance is running

### Build Errors

1. Clear build cache:
   ```bash
   rm -rf dist
   rm -rf server/dist
   npm run build
   ```

2. Make sure TypeScript is installed:
   ```bash
   npm install -g typescript
   ```

## Project Structure

```
nwjs-desktop/
├── index.html          # NW.js entry point
├── package.json        # NW.js configuration + dependencies
├── tsconfig.server.json # TypeScript config for server
├── data/               # SQLite database storage
│   └── airavoto-gaming.db
├── server/             # Backend Express server
│   ├── index.ts        # Server entry point
│   ├── auth.ts         # Authentication routes
│   ├── routes.ts       # API routes
│   └── db-sqlite.ts    # SQLite database connection
├── shared/             # Shared types and schemas
│   └── schema-sqlite.ts # Drizzle ORM schema for SQLite
└── dist/               # Built files
    └── public/         # Built frontend files
```

## Features

- **Offline First**: Works completely offline with local SQLite database
- **Booking Management**: Create, edit, pause, and complete gaming sessions
- **Food & Beverage**: Track food orders for each booking
- **Payment Tracking**: Cash, UPI, and split payment support
- **Reports**: View daily/weekly/monthly revenue reports
- **Multi-User**: Admin and staff roles with different permissions
- **Device Management**: Configure PC, PS5, and other gaming devices
- **Pricing Configuration**: Set different prices for different durations

## Migrating from Online Version

If you have data from the online PostgreSQL version:

1. Export your data from the online database
2. Use the import script (coming soon) to load data into SQLite

## Support

For issues or feature requests, please contact:
- Email: support@airavotogaming.com

## License

MIT License - Free to use and modify for your gaming lounge.
