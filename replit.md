# Airavoto Gaming Center POS Admin Panel

## Overview

This project is a local, full-stack TypeScript web application designed as an admin panel for Airavoto Gaming Center's Point-of-Sale (POS) system. It manages gaming sessions across various device types (PC, PS5, VR, car simulators), handles walk-in and advance bookings, and provides comprehensive reporting, including an expense tracker. The application aims to streamline operations, manage inventory, track expenses, and improve customer service. It features a gaming-themed dark mode UI inspired by Discord and Steam. Key capabilities include dynamic device and pricing configuration, real-time session management (pause/resume, seat changes), a simplified customer loyalty program, tournament management, and a robust notification system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18+ with TypeScript
- Vite for development and build
- Wouter for client-side routing
- TanStack React Query for server state management and caching

**UI/UX Decisions:**
- Radix UI primitives and shadcn/ui for accessible components.
- Tailwind CSS with a custom, gaming-themed dark mode color palette (cyan/teal accents).
- Theme toggle for light/dark mode persistence.
- Gaming aesthetic with neon accents and status-based color coding.
- **Card Design System**: All cards use a uniform `shape-diagonal-rounded` style for consistent aesthetics.
- Fully Responsive Design: Accessible on mobile, tablet, and desktop.

**State Management:**
- React Query for server state caching.
- Local component state with React hooks.

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript.
- RESTful API design with JSON communication.

**Database Layer:**
- PostgreSQL via Neon serverless provider (Free tier: 512 MB).
- Drizzle ORM for type-safe database interactions.
- Schema-first approach with Zod validation.
- **Data Retention Strategy:** ALL data kept permanently (100 years) - no automatic cleanup.
  - Owner requirement: Preserve all business records for tax, analytics, and compliance.
  - Current storage: ~103 MB/year at 70 customers/day.
  - Free tier sufficient for 6-7 years with no cleanup.
  - Future scaling option: 6 free Neon projects = 3 GB for 41+ years (see NEON_6_DATABASE_SETUP.md).

**Data Models:**
- `Bookings`: Manages active sessions, status, timing, and pricing. Includes unique booking codes (BK-XXXXX) and group codes (GRP-XXXXX) for tracking related sessions.
- `Booking History`: Archives completed/expired bookings with preserved booking and group codes.
- `Device Configs`: Stores dynamic device categories and seat configurations.
- `Pricing Configs`: Defines pricing rules per category and duration.
- `Food Items`: Stores available food and beverage options with inventory tracking.
- `Settings`: General admin configurations.
- `Expenses`: Tracks operational costs.
- `Happy Hours Configs`: Defines time slots and pricing for special rates.
- `Retention Config`: Stores data retention policy settings.
- `Tournaments`: Stores tournament information.
- `Tournament Participants`: Tracks participant registration.
- `Notifications`: Stores system notifications.
- `Customer Loyalty`: Tracks customer spending and points.
- `Loyalty Rewards`: Catalog of redeemable rewards.
- `Reward Redemptions`: History of customer reward redemptions.

### Key Architectural Decisions

**Monorepo Structure:**
- Shared TypeScript schema definitions between client and server for full-stack type safety.

**Real-time Features:**
- Client-side interval timers for session countdowns.
- Polling for updates.
- Audio/visual notifications for expired sessions and toast messages using Web Audio API.

**Styling Architecture:**
- CSS custom properties for theme tokens.
- Tailwind utility classes and `clsx`/`tailwind-merge` for styling.

**Form Handling:**
- React Hook Form for form state and validation.
- Zod schemas for robust input validation.

**Feature Specifications:**
- **Dynamic Management**: Device category, pricing, food items, happy hours, and tournament management.
- **Booking Flow**: Smart upcoming booking flow, pause/resume, seat change, manual adjustments (discounts, bonus hours).
- **Expense Tracker**: Comprehensive system with export.
- **Inventory Management**: Dual-page system for food item catalog and current stock, with automatic stock deduction and alerts.
- **Public Status Board**: Customer-facing real-time availability display at `/status`.
- **Data Retention Policies**: Automatic cleanup of old data with configurable retention periods.
- **Analytics Chart Export**: Save as Image functionality for all analytics charts.
- **Ankylo AI System**: Custom calculation-based predictive maintenance and traffic forecasting using deterministic algorithms.
- **Sound Alert System**: Comprehensive audio notification system for user feedback.
- **Unsaved Changes Protection**: Confirmation dialogs for preventing accidental data loss in settings.
- **Notification System**: Comprehensive notification center with real-time notifications for key events, bell icon, grouped notifications, and actions.
- **Categorized Sidebar**: Reorganized navigation with categories and count badges.
- **Enhanced Activity Logs**: Detailed logging across all operations with rich contextual information and consistent formatting.
- **Simplified Loyalty & Rewards System**: Automatic point earning (1 point per ₹1 spent) and reward redemption, focusing on a simplified Rewards Catalog and Customer Management.
- **Unified Payment Dialog**: Streamlined credit balance payment system supporting Cash, UPI/Online, and Split Payment with comprehensive validation and enhanced payment history.
- **Running Session Bug Fix**: Ensures running/paused sessions remain on the Dashboard after credit payment, preventing premature archiving.
- **Enhanced Credit Balances Display**: Credit Balances table now shows comprehensive booking details for better context.
- **Booking & Group Code System**: Unique booking codes (BK-XXXXX) for each booking and group codes (GRP-XXXXX) for linking multiple related bookings (e.g., PC 1, 2, 3 for the same table/session). Codes persist through booking creation to history archival.

## Desktop Mode (NW.js)

### Offline Desktop Application
The application supports running as a standalone offline desktop application using NW.js with SQLite database.

**Desktop Mode Features:**
- **Local SQLite Database**: All data stored locally in `data/gaming-pos.db`
- **Offline Operation**: No internet required after initial setup
- **Default Admin User**: Username: `admin`, Password: `admin123` (auto-created in desktop mode)
- **Session Persistence**: SQLite-based session store

**Building Desktop App:**
1. Navigate to `nwjs-desktop/` folder
2. Run `npm install` to install dependencies
3. Run `npm run build` to build both server and client
4. Run `npm start` to launch the NW.js application
5. Run `npm run package:win` / `package:mac` / `package:linux` for distribution builds

**Environment Variables for Desktop:**
- `DESKTOP=1` or `NWJS=1` - Enables desktop/SQLite mode
- `PORT=5000` - Server port (default)

### Dual-Mode Architecture
- **Web Mode**: Uses PostgreSQL (Neon) + PostgreSQL session store
- **Desktop Mode**: Uses SQLite + SQLite session store
- Mode automatically detected via environment variables

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database (web mode).
- **SQLite (better-sqlite3)**: Local database for desktop mode.

### UI Component Libraries
- **Radix UI**: Accessible React primitives.
- **shadcn/ui**: Component library built on Radix UI.
- **Lucide React**: Icon library.

### Development Tools
- **Drizzle Kit**: Database migration and schema management.
- **Vite**: Frontend build tool.
- **TypeScript**: Language.

### Validation & Schema
- **Zod**: Runtime type validation.
- **drizzle-zod**: Integration between Drizzle and Zod.

### Utility Libraries
- **date-fns**: Date manipulation.
- **clsx & tailwind-merge**: Conditional CSS class composition.
- **class-variance-authority**: Type-safe variant API for components.

### Communication
- **Twilio**: For WhatsApp bot integration.