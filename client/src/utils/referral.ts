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
export const getStoredReferralCode = () => {
  return localStorage.getItem('pendingReferral');
};
// Clear stored referral code
export const clearStoredReferralCode = () => {
  localStorage.removeItem('pendingReferral');
};