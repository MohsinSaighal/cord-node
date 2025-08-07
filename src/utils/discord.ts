interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  created_timestamp: number;
}

interface DiscordOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

// Get the correct redirect URI based on environment
const getRedirectUri = (): string => {
  // Check if we're in development or production
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname.includes('stackblitz') || hostname.includes('127.0.0.1')) {
    // Use the current origin for development
    return window.location.origin;
  } else if (hostname.includes('netlify.app')) {
    // For Netlify preview deployments
    return window.location.origin;
  } else {
    // Use the custom domain for production
    return 'https://cordnode.xyz';
  }
};

// Discord OAuth configuration
const DISCORD_CONFIG: DiscordOAuthConfig = {
  clientId: '1390136966552748072',
  clientSecret: 'Cj8eKMI5iIigS8Tl34tWKtz5giiIfvF1',
  redirectUri: 'https://cordnode.xyz', // Default, but we'll use getRedirectUri() when needed
  scope: 'identify email'
};

export const getDiscordAuthUrl = (): string => {
  const state = generateRandomState();
  const redirectUri = getRedirectUri();
  
  // Store state in both sessionStorage and localStorage for redundancy
  sessionStorage.setItem('discord_oauth_state', state);
  localStorage.setItem('discord_oauth_state', state);
  localStorage.setItem('discord_oauth_timestamp', Date.now().toString());
  
  const params = new URLSearchParams({
    client_id: DISCORD_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DISCORD_CONFIG.scope,
    state,
    prompt: 'consent' // Force consent screen to ensure fresh tokens
  });

  const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  console.log('Generated auth URL with redirect URI:', redirectUri);
  console.log('Generated state:', state);
  return authUrl;
};

export const exchangeCodeForToken = async (code: string): Promise<string> => {
  try {
    console.log('Exchanging code for token...');
    const redirectUri = getRedirectUri();
    console.log('Using redirect URI:', redirectUri);
    
    const requestBody = new URLSearchParams({
      client_id: DISCORD_CONFIG.clientId,
      client_secret: DISCORD_CONFIG.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    console.log('Request body params:', Object.fromEntries(requestBody.entries()));

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestBody.toString(),
    });

    console.log('Token exchange response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange error response:', errorText);
      
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error_description) {
          errorMessage = errorData.error_description;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Token exchange successful');
    
    if (!data.access_token) {
      throw new Error('No access token received from Discord');
    }
    
    return data.access_token;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

export const getDiscordUser = async (accessToken: string): Promise<DiscordUser> => {
  try {
    console.log('Fetching Discord user data...');
    
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
    });

    console.log('Discord user response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord user error response:', errorText);
      throw new Error(`Failed to fetch Discord user: ${response.status} ${response.statusText}`);
    }

    const userData = await response.json();
    console.log('Discord user data received:', { 
      id: userData.id, 
      username: userData.username,
      discriminator: userData.discriminator 
    });
    
    if (!userData.id || !userData.username) {
      throw new Error('Invalid user data received from Discord');
    }
    
    // Calculate account creation timestamp from Discord snowflake ID
    const discordEpoch = 1420070400000; // Discord epoch (January 1, 2015)
    const timestamp = (BigInt(userData.id) >> 22n) + BigInt(discordEpoch);
    
    return {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator || '0000',
      avatar: userData.avatar,
      created_timestamp: Number(timestamp)
    };
  } catch (error) {
    console.error('Get Discord user error:', error);
    throw error;
  }
};

export const getAvatarUrl = (userId: string, avatarHash: string | null): string => {
  if (!avatarHash) {
    // Default Discord avatar
    const defaultAvatarNumber = parseInt(userId) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
  }
  
  const format = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${format}?size=128`;
};

export const calculateAccountAge = (createdTimestamp: number): number => {
  const now = Date.now();
  const ageInMs = now - createdTimestamp;
  const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, Math.floor(ageInYears * 10) / 10); // Round to 1 decimal place
};

const generateRandomState = (): string => {
  // Generate a more secure random state
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Store state for OAuth verification with improved validation
export const setOAuthState = (state: string): void => {
  sessionStorage.setItem('discord_oauth_state', state);
  localStorage.setItem('discord_oauth_state', state);
  localStorage.setItem('discord_oauth_timestamp', Date.now().toString());
};

export const getOAuthState = (): string | null => {
  // Try sessionStorage first, then localStorage
  let state = sessionStorage.getItem('discord_oauth_state');
  if (!state) {
    state = localStorage.getItem('discord_oauth_state');
  }
  
  // Check if state is expired (older than 10 minutes)
  const timestamp = localStorage.getItem('discord_oauth_timestamp');
  if (timestamp) {
    const age = Date.now() - parseInt(timestamp);
    if (age > 10 * 60 * 1000) { // 10 minutes
      console.log('OAuth state expired, clearing...');
      clearOAuthState();
      return null;
    }
  }
  
  return state;
};

export const clearOAuthState = (): void => {
  sessionStorage.removeItem('discord_oauth_state');
  localStorage.removeItem('discord_oauth_state');
  localStorage.removeItem('discord_oauth_timestamp');
};

// Validate OAuth state with better error handling
export const validateOAuthState = (receivedState: string): boolean => {
  const storedState = getOAuthState();
  console.log('Validating OAuth state:', { receivedState, storedState });
  
  if (!storedState) {
    console.error('No stored OAuth state found');
    return false;
  }
  
  if (receivedState !== storedState) {
    console.error('OAuth state mismatch');
    return false;
  }
  
  return true;
};
