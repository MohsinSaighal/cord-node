import { UserData } from '../types';

export const generateReferralCode = (userId: string): string => {
  // Generate a unique referral code based on user ID
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const userHash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    code += chars[(userHash + i) % chars.length];
  }
  
  return code;
};

export const getReferralCodeFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ref');
};

export const clearReferralFromUrl = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete('ref');
  window.history.replaceState({}, document.title, url.toString());
};

// Validate referral code format
export const isValidReferralCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code);
};

// Store referral code temporarily
export const storeReferralCode = (code: string): void => {
  if (isValidReferralCode(code)) {
    sessionStorage.setItem('pendingReferral', code);
    localStorage.setItem('pendingReferral', code);
    localStorage.setItem('referralTimestamp', Date.now().toString());
    console.log('Stored referral code:', code);
  }
};

// Get stored referral code
export const getStoredReferralCode = (): string | null => {
  // Check if referral is expired (older than 24 hours)
  const timestamp = localStorage.getItem('referralTimestamp');
  if (timestamp) {
    const age = Date.now() - parseInt(timestamp);
    if (age > 24 * 60 * 60 * 1000) { // 24 hours
      clearStoredReferralCode();
      return null;
    }
  }

  const code = sessionStorage.getItem('pendingReferral') || localStorage.getItem('pendingReferral');
  console.log('Retrieved stored referral code:', code);
  return code;
};

// Clear stored referral code
export const clearStoredReferralCode = (): void => {
  console.log('Clearing stored referral code');
  sessionStorage.removeItem('pendingReferral');
  localStorage.removeItem('pendingReferral');
  localStorage.removeItem('referralTimestamp');
};