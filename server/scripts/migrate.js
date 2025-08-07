const fs = require("fs");
const path = require("path");
const pool = require("../config/database");

async function runMigrations() {
  try {
    console.log("Starting database migrations...");

    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Read migration files
    const migrationsDir = path.join(__dirname, "../migrations");

    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log("Created migrations directory");
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (migrationFiles.length === 0) {
      console.log("No migration files found. Creating initial schema...");
      await createInitialSchema();
      return;
    }

    // Get executed migrations
    const executedResult = await pool.query("SELECT filename FROM migrations");
    const executedMigrations = executedResult.rows.map((row) => row.filename);

    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        console.log(`Running migration: ${file}`);

        const migrationPath = path.join(migrationsDir, file);
        const migrationSQL = fs.readFileSync(migrationPath, "utf8");

        await pool.query(migrationSQL);
        await pool.query("INSERT INTO migrations (filename) VALUES ($1)", [
          file,
        ]);

        console.log(`✓ Migration ${file} completed`);
      }
    }

    console.log("All migrations completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

async function createInitialSchema() {
  const initialSchema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      discriminator VARCHAR(10) NOT NULL,
      avatar TEXT NOT NULL,
      account_age DECIMAL(3,1) DEFAULT 0,
      join_date TIMESTAMP NOT NULL,
      multiplier DECIMAL(4,2) DEFAULT 1,
      total_earned DECIMAL(15,6) DEFAULT 0,
      current_balance DECIMAL(15,6) DEFAULT 0,
      is_node_active BOOLEAN DEFAULT false,
      node_start_time TIMESTAMP NULL,
      tasks_completed INTEGER DEFAULT 0,
      rank INTEGER DEFAULT 0,
      last_login_time TIMESTAMP DEFAULT NOW(),
      daily_checkin_claimed BOOLEAN DEFAULT false,
      weekly_earnings DECIMAL(15,6) DEFAULT 0,
      monthly_earnings DECIMAL(15,6) DEFAULT 0,
      referral_code VARCHAR(20) UNIQUE,
      referred_by VARCHAR(255) NULL,
      referral_earnings DECIMAL(15,6) DEFAULT 0,
      total_referrals INTEGER DEFAULT 0,
      compensation_claimed BOOLEAN DEFAULT false,
      hasBadgeOfHonor BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Tasks table
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      reward DECIMAL(10,2) DEFAULT 0,
      type VARCHAR(50) NOT NULL CHECK (type IN ('daily', 'weekly', 'social', 'achievement')),
      max_progress INTEGER DEFAULT 1,
      expires_at TIMESTAMP NULL,
      social_url TEXT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- User tasks table
    CREATE TABLE IF NOT EXISTS user_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      completed BOOLEAN DEFAULT false,
      progress INTEGER DEFAULT 0,
      claimed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, task_id)
    );

    -- Mining sessions table
    CREATE TABLE IF NOT EXISTS mining_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NULL,
      earnings DECIMAL(15,6) DEFAULT 0,
      hash_rate DECIMAL(10,2) DEFAULT 0,
      efficiency DECIMAL(5,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Referrals table
    CREATE TABLE IF NOT EXISTS referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bonus_amount DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(referrer_id, referred_id)
    );

    -- Referral earnings log table
    CREATE TABLE IF NOT EXISTS referral_earnings_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      earning_type VARCHAR(50) NOT NULL,
      base_amount DECIMAL(15,6) NOT NULL,
      referral_amount DECIMAL(15,6) NOT NULL,
      transaction_id VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Insert default tasks
    INSERT INTO tasks (id, title, description, reward, type, max_progress, social_url) VALUES
    ('daily-checkin', 'Daily Check-in', 'Log in to CordNode and claim your daily bonus', 10, 'daily', 1, NULL),
    ('mine-1-hour', 'Mine for 1 Hour', 'Keep your node active for at least 1 hour', 25, 'daily', 3600, NULL),
    ('twitter-follow', 'Follow on Twitter', 'Follow @CordNode on Twitter for updates', 50, 'social', 1, 'https://twitter.com/intent/follow?screen_name=cordnode'),
    ('twitter-retweet', 'Retweet Announcement', 'Retweet our latest announcement', 30, 'social', 1, 'https://twitter.com/intent/retweet?tweet_id=1234567890'),
    ('telegram-join', 'Join Telegram Channel', 'Join our official Telegram channel', 40, 'social', 1, 'https://t.me/cordnode_official'),
    ('discord-join', 'Join Discord Server', 'Join our community Discord server', 60, 'social', 1, 'https://discord.gg/Y5RMZPcNSy'),
    ('invite-friends', 'Invite Friends', 'Invite 3 friends to join CordNode', 100, 'weekly', 3, NULL),
    ('efficiency-master', 'Node Efficiency Master', 'Maintain 90%+ efficiency for 24 hours', 200, 'achievement', 86400, NULL),
    ('early-adopter', 'Early Adopter', 'Join CordNode community (Discord account 5+ years)', 500, 'achievement', 1, NULL),
    ('weekly-mining', 'Weekly Mining Goal', 'Earn 1000 CORD from mining this week', 150, 'weekly', 1000, NULL),
    ('social-media-master', 'Social Media Master', 'Complete all social media tasks', 300, 'achievement', 4, NULL)
    ON CONFLICT (id) DO NOTHING;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_users_total_earned ON users(total_earned DESC);
    CREATE INDEX IF NOT EXISTS idx_users_weekly_earnings ON users(weekly_earnings DESC);
    CREATE INDEX IF NOT EXISTS idx_users_monthly_earnings ON users(monthly_earnings DESC);
    CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
    CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_tasks_task_id ON user_tasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_mining_sessions_user_id ON mining_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_mining_sessions_active ON mining_sessions(user_id) WHERE end_time IS NULL;
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_referral_earnings_log_referrer ON referral_earnings_log(referrer_id);
  `;

  await pool.query(initialSchema);
  await pool.query("INSERT INTO migrations (filename) VALUES ($1)", [
    "001_initial_schema.sql",
  ]);
  console.log("✓ Initial schema created");
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
