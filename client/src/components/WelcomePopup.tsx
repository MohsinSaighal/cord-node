import React from 'react';
import { X, Gift, Clock, Star, Users } from 'lucide-react';
import { UserData } from '../types';

interface WelcomePopupProps {
  user: UserData | null;
  onClose: () => void;
  isNewUser?: boolean;
}

const WelcomePopup: React.FC<WelcomePopupProps> = ({ user, onClose, isNewUser = false }) => {
  if (!user) {
    return null;
  }

  // Double the welcome bonus calculation
  const bonusAmount = Math.floor((user.account_age || 0) * 25 * (user.multiplier || 1) * 2);
  const referralBonus = user.referredBy ? Math.floor(bonusAmount * 0.1) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] border border-gray-800 relative overflow-hidden flex flex-col">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-600/10"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-400/20 to-purple-600/20 rounded-full -translate-y-16 translate-x-16"></div>
        
        {/* Scrollable content */}
        <div className="relative flex-1 overflow-y-auto">
          <div className="p-6 sm:p-8">
            {/* Header with close button */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {isNewUser ? 'Welcome to CordNode!' : 'Welcome Back!'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User info section */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full overflow-hidden border-4 border-gradient-to-br from-cyan-400 to-purple-600">
                <img 
                  src={user.avatar} 
                  alt={user.username || 'User'} 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2 break-words">
                {user.username}#{user.discriminator || '0000'}
              </h3>
              <p className="text-gray-300 text-sm sm:text-base">
                Discord account connected successfully!
              </p>
            </div>

            {/* Account Stats */}
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                    <span className="text-white font-medium text-sm sm:text-base">Account Age</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-cyan-400" title={`Account created ${user.join_date || 'unknown'}`}>
                    {user.account_age || 0} years
                  </span>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Your Discord account was created {user.account_age || 0} years ago
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                    <span className="text-white font-medium text-sm sm:text-base">Earning Multiplier</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-purple-400">
                    {user.multiplier || 1}x
                  </span>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Bonus multiplier based on your account age
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-600/20 to-green-400/20 border border-green-500/30 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                    <span className="text-white font-medium text-sm sm:text-base">Welcome Bonus</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-green-400">
                    +{bonusAmount.toLocaleString()} CP
                  </span>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Starting bonus based on your account age and multiplier
                </p>
              </div>

              {referralBonus > 0 && (
                <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 border border-yellow-500/30 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                      <span className="text-white font-medium text-sm sm:text-base">Referral Bonus</span>
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-yellow-400">
                      +{referralBonus.toLocaleString()} CP
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    10% bonus for being referred by another user
                  </p>
                </div>
              )}
            </div>

            {/* Total Earnings */}
            <div className="bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="text-center">
                <div className="text-sm text-gray-300 mb-1">Total Starting Balance</div>
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent break-words">
                  {(bonusAmount + referralBonus).toLocaleString()} CP
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed bottom button */}
        <div className="p-4 sm:p-6 pt-0 relative">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 text-sm sm:text-base"
          >
            Start Mining!
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup;