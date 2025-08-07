# CordNode - Discord Account Age Rewards (Node.js + PostgreSQL)

A full-stack web application that rewards users based on their Discord account age. Built with React frontend and Node.js/PostgreSQL backend.

## Features

- **Full-Stack Architecture**: React frontend with Node.js/Express backend
- **PostgreSQL Database**: Robust data persistence with proper relationships
- **Real Discord OAuth Integration**: Secure Discord authentication
- **Account Age Calculation**: Automatically calculates your Discord account age from your user ID
- **Progressive Multipliers**: Earn up to 10x multiplier based on account age
- **Node Mining System**: Start/stop mining nodes to earn CordPoints (CP)
- **Task System**: Complete daily, weekly, and achievement tasks
- **Referral System**: Earn ongoing commissions from referred users
- **Leaderboard**: Compete with other users
- **Real-time Mining**: Database-persisted mining sessions

## Account Age Multipliers

- 0-1 year: 1.0x
- 1-2 years: 1.2x
- 2-3 years: 1.5x
- 3-4 years: 2.0x
- 4-5 years: 2.5x
- 5-6 years: 3.5x
- 6-7 years: 5.0x
- 7-8 years: 7.0x
- 8+ years: 10.0x

## Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Vite
- Solana Wallet Adapter

### Backend
- Node.js + Express
- PostgreSQL
- JWT Authentication
- Discord OAuth2
- Rate Limiting & Security

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- Discord Application (for OAuth)

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm run server:install
```

### 2. Database Setup

Create a PostgreSQL database:
```sql
CREATE DATABASE cordnode;
CREATE USER cordnode_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cordnode TO cordnode_user;
```

### 3. Environment Configuration

**Frontend (.env):**
```env
VITE_DISCORD_CLIENT_ID=your_discord_client_id
VITE_DISCORD_CLIENT_SECRET=your_discord_client_secret
VITE_DISCORD_REDIRECT_URI=http://localhost:5173
VITE_API_URL=http://localhost:3001/api
```

**Backend (server/.env):**
```env
DATABASE_URL=postgresql://cordnode_user:your_password@localhost:5432/cordnode
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

### 4. Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 settings
4. Add redirect URI: `http://localhost:5173` (for development)
5. Copy your Client ID and Client Secret to your .env files

### 5. Database Migration

```bash
npm run server:migrate
```

### 6. Start Development Servers

```

## Development

```bash
# Start both frontend and backend
npm run dev:full

# Or start them separately:
npm run dev          # Frontend only
npm run dev:server   # Backend only
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:3001`.

## How It Works

### Account Age Detection

1. Discord OAuth provides user ID (snowflake)
2. Extract timestamp from snowflake to calculate account creation date
3. Calculate account age and determine multiplier
4. Store user data in PostgreSQL database

### Mining System

- Database-persisted mining sessions
- Real-time earnings calculation
- Anti-cheat system with IP tracking
- Automatic referral reward distribution

### Task System

- Daily, weekly, social, and achievement tasks
- Progress tracking in database
- Automatic reward calculation with multipliers
- Referral commission distribution

### Referral System

- Unique referral codes for each user
- 10% ongoing commission from referred users
- Complete referral history and earnings tracking
- Real-time reward distribution

## API Endpoints

### Authentication
- `POST /api/auth/discord/callback` - Discord OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Users
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/stats` - Get user statistics

### Tasks
- `GET /api/tasks` - Get all tasks with user progress
- `POST /api/tasks/:taskId/complete` - Complete a task

### Mining
- `POST /api/mining/start` - Start mining session
- `POST /api/mining/stop` - Stop mining session
- `POST /api/mining/update` - Update mining progress
- `GET /api/mining/stats` - Get mining statistics

### Referrals
- `GET /api/referrals/stats` - Get referral statistics
- `GET /api/referrals/history` - Get referral history
- `GET /api/referrals/earnings` - Get referral earnings

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard
- `GET /api/leaderboard/stats` - Get leaderboard statistics

## Security

- JWT-based authentication
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection protection
- CORS configuration
- Helmet.js security headers
- Environment-based configuration

## Production Deployment

### Frontend
```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

### Backend
```bash
cd server
npm start
# Use PM2 or similar for production process management
```

### Database
- Use managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
- Run migrations: `npm run server:migrate`
- Set up database backups

### Environment Variables
- Update Discord OAuth redirect URIs for production domain
- Use strong JWT secrets
- Configure proper CORS origins
- Set NODE_ENV=production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue on GitHub or contact the development team.