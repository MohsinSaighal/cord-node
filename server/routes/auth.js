const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Discord OAuth callback
router.post(
  "/discord/callback",
  [
    body("code").notEmpty().withMessage("Authorization code is required"),
    body("referralCode").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code, referralCode } = req.body;

      // Exchange code for access token
      const tokenResponse = await axios.post(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: process.env.DISCORD_REDIRECT_URI,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token } = tokenResponse.data;

      // Get user data from Discord
      const userResponse = await axios.get(
        "https://discord.com/api/users/@me",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      const discordUser = userResponse.data;

      // Calculate account age
      const discordEpoch = 1420070400000; // Discord epoch (January 1, 2015)
      const timestamp = (BigInt(discordUser.id) >> 22n) + BigInt(discordEpoch);
      const accountAge = Math.max(
        0,
        Math.floor(
          ((Date.now() - Number(timestamp)) / (1000 * 60 * 60 * 24 * 365.25)) *
            10
        ) / 10
      );

      // Calculate multiplier
      const multiplier = calculateMultiplier(accountAge);

      // Get avatar URL
      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${
            parseInt(discordUser.id) % 5
          }.png`;

      // Check if user exists
      let userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
        discordUser.id,
      ]);
      let user;
      let isNewUser = false;

      if (userResult.rows.length === 0) {
        // Create new user
        isNewUser = true;
        const initialBalance = Math.floor(
          (50 + accountAge * 25 + (multiplier - 1) * 100) * 2
        );
        const referralCode = generateReferralCode();

        const insertResult = await pool.query(
          `
        INSERT INTO users (
          id, username, discriminator, avatar, account_age, join_date, 
          multiplier, total_earned, current_balance, referral_code, rank
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
          [
            discordUser.id,
            discordUser.username,
            discordUser.discriminator || "0000",
            avatarUrl,
            accountAge,
            new Date(Number(timestamp)),
            multiplier,
            initialBalance,
            initialBalance,
            referralCode,
            Math.floor(Math.random() * 1000) + 1,
          ]
        );

        user = insertResult.rows[0];

        // Process referral if provided
        if (referralCode && referralCode.trim()) {
          await processReferral(user.id, referralCode.trim());
        }
      } else {
        // Update existing user
        user = userResult.rows[0];
        await pool.query(
          "UPDATE users SET last_login_time = NOW() WHERE id = $1",
          [user.id]
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        user: formatUserResponse(user),
        token,
        isNewUser,
      });
    } catch (error) {
      console.error("Discord OAuth error:", error);
      res.status(500).json({
        error: "Authentication failed",
        details:
          process.env.NODE_ENV !== "production" ? error.message : undefined,
      });
    }
  }
);

// Get current user
router.get("/me", authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: formatUserResponse(req.user),
  });
});

// Logout
router.post("/logout", authenticateToken, (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  res.json({ success: true, message: "Logged out successfully" });
});

// Helper functions
function calculateMultiplier(accountAge) {
  if (accountAge < 1) return 1.0;
  if (accountAge < 2) return 1.2;
  if (accountAge < 3) return 1.5;
  if (accountAge < 4) return 2.0;
  if (accountAge < 5) return 2.5;
  if (accountAge < 6) return 3.5;
  if (accountAge < 7) return 5.0;
  if (accountAge < 8) return 7.0;
  return 10.0;
}

function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function processReferral(userId, referralCode) {
  try {
    // Find referrer
    const referrerResult = await pool.query(
      "SELECT * FROM users WHERE referral_code = $1 AND id != $2",
      [referralCode, userId]
    );

    if (referrerResult.rows.length === 0) {
      console.log("Invalid referral code:", referralCode);
      return;
    }

    const referrer = referrerResult.rows[0];

    // Create referral relationship
    await pool.query(
      "INSERT INTO referrals (referrer_id, referred_id, bonus_amount) VALUES ($1, $2, $3)",
      [referrer.id, userId, 100] // 100 CORD bonus
    );

    // Update referrer's stats
    await pool.query(
      `
      UPDATE users 
      SET total_referrals = total_referrals + 1,
          referral_earnings = referral_earnings + 100,
          current_balance = current_balance + 100,
          total_earned = total_earned + 100
      WHERE id = $1
    `,
      [referrer.id]
    );

    // Update referred user
    await pool.query("UPDATE users SET referred_by = $1 WHERE id = $2", [
      referrer.id,
      userId,
    ]);

    console.log("Referral processed successfully:", {
      referrer: referrer.id,
      referred: userId,
    });
  } catch (error) {
    console.error("Error processing referral:", error);
  }
}

function formatUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    accountAge: user.account_age,
    joinDate: user.join_date,
    multiplier: user.multiplier,
    totalEarned: parseFloat(user.total_earned),
    currentBalance: parseFloat(user.current_balance),
    isNodeActive: user.is_node_active,
    nodeStartTime: user.node_start_time
      ? new Date(user.node_start_time).getTime()
      : undefined,
    tasksCompleted: user.tasks_completed,
    rank: user.rank,
    lastLoginTime: user.last_login_time
      ? new Date(user.last_login_time).getTime()
      : Date.now(),
    dailyCheckInClaimed: user.daily_checkin_claimed,
    weeklyEarnings: parseFloat(user.weekly_earnings || 0),
    monthlyEarnings: parseFloat(user.monthly_earnings || 0),
    referralCode: user.referral_code,
    referredBy: user.referred_by,
    referralEarnings: parseFloat(user.referral_earnings || 0),
    totalReferrals: user.total_referrals || 0,
    compensationClaimed: user.compensation_claimed || false,
    hasBadgeOfHonor: user.hasBadgeOfHonor || false,
  };
}

module.exports = router;
