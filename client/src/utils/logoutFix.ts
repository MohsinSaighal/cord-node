import { UserData } from '../types';
import { signOut } from './nodeAuth';

/**
 * Enhanced logout function that saves mining progress before signing out
 */
export const logoutWithSave = async (
  currentUser: UserData, 
  forceSaveMiningProgress?: () => Promise<void>
): Promise<void> => {
  try {
    console.log('Starting logout with balance save...');
    
    // Save any pending mining progress if user is actively mining
    if (forceSaveMiningProgress && currentUser.isNodeActive) {
      console.log('Saving mining progress before logout...');
      await forceSaveMiningProgress();
      
      // Wait a bit to ensure save completes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Call the enhanced signOut with current user data
    await signOut(currentUser);
    
    console.log('Logout completed successfully with balance preserved');
  } catch (error) {
    console.error('Error during logout:', error);
    // Fallback to regular logout
    await signOut();
  }
};