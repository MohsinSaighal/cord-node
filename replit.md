# Overview

CordNode is a Discord-based mining simulation platform built as a full-stack web application. The platform gamifies account age and activity by allowing users to connect their Discord accounts and mine virtual "CORD" tokens based on their account's characteristics. It features real-time mining mechanics, task completion systems, referral programs, leaderboards, epoch-based competitions, and Badge of Honor purchases. The application integrates Solana wallet connectivity for blockchain functionality and includes comprehensive anti-cheat systems to maintain platform integrity.

## Recent Updates (August 2025)
- ✅ **Fixed Critical Mining Stop Bug**: Mining node stop now correctly adds final earnings to user balance
- ✅ **Fixed Database Schema Issues**: Migrated all decimal fields to numeric(15,2) with proper transformers
- ✅ **Added Badge Purchase System**: Complete API for SOL-based Badge of Honor purchases with transaction tracking
- ✅ **Corrected Mining Rates**: Base rate set to 0.5 CORD/min with proper multiplier calculations
- ✅ **Enhanced Balance Updates**: All mining rewards now properly update user balances in real-time

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system using CSS variables
- **State Management**: React hooks with custom hooks for business logic separation
- **Wallet Integration**: Solana wallet adapter with support for Phantom and Solflare wallets via Reown AppKit
- **Real-time Updates**: Client-side intervals for mining calculations and UI updates
- **Responsive Design**: Mobile-first approach with desktop optimizations

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Structure**: RESTful API with `/api` prefix routing
- **Development**: Vite middleware integration for hot reloading
- **Storage Interface**: Abstracted storage layer with in-memory fallback implementation
- **Build System**: ESBuild for production bundling

## Database Design
- **Primary Database**: PostgreSQL via Neon serverless platform
- **ORM**: TypeORM with entity-based schema definitions and automatic migrations
- **Connection**: PostgreSQL connection with proper TypeORM configuration
- **Schema Management**: Entity-based schema with automatic synchronization
- **Decimal Handling**: Proper numeric(15,2) precision for balance and earnings with transformers
- **Relations**: Full entity relationships for users, tasks, mining sessions, and settings

## Authentication System
- **Provider**: Supabase Auth with Discord OAuth integration
- **Session Management**: JWT-based authentication with persistent sessions
- **User Data**: Discord profile integration for username, avatar, and account age calculation
- **Security**: CSRF protection via OAuth state parameters and session validation

## Key Features Implementation

### Mining System
- **Real-time Mining**: Client-side calculations with periodic database synchronization
- **Session Tracking**: Database-persisted mining sessions with start/end times
- **Rate Calculation**: Account age-based multipliers affecting mining rates
- **Anti-cheat Protection**: IP tracking and behavioral analysis to prevent abuse

### Task System
- **Dynamic Tasks**: Database-driven task definitions with progress tracking
- **Completion Logic**: Server-side validation with user progress persistence
- **Reward Distribution**: Automatic balance updates with referral bonus distribution
- **Task Types**: Daily, weekly, social, and achievement-based task categories

### Referral Program
- **Code Generation**: Unique referral codes per user with validation
- **Reward Structure**: 10% ongoing earnings for referrers, welcome bonuses for referred users
- **Tracking**: Complete referral history with earnings breakdowns
- **Anti-abuse**: IP-based duplicate account detection

### Leaderboard System
- **Multiple Periods**: Daily, weekly, monthly, and all-time rankings
- **Real-time Updates**: Cached leaderboard data with periodic refresh
- **Statistics**: Total miners, active miners, and position tracking
- **Performance**: Optimized queries with database functions for ranking calculations

## External Dependencies

- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Supabase**: Authentication, real-time subscriptions, and database functions
- **Discord OAuth**: User authentication and profile data access
- **Solana Web3.js**: Blockchain wallet connectivity and transaction support
- **Reown AppKit**: Wallet adapter framework for Solana integration
- **IP Geolocation Services**: Multiple fallback services for anti-cheat IP detection
- **Radix UI**: Accessible component primitives for UI construction
- **Tailwind CSS**: Utility-first styling framework with custom theme
- **Drizzle ORM**: Type-safe database operations and schema management
- **Vite**: Development server and build tooling with plugin ecosystem