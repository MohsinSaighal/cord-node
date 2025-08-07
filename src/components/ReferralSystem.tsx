import React, { useState } from 'react';
import { Copy, Users, Gift, Share2, Check, ExternalLink, Loader } from 'lucide-react';
import { UserData } from '../types';
import { getReferralStats, getEnhancedReferralStats, getReferralEarningsSummary } from '../utils/supabaseReferrals';
import ReferralDebug from './ReferralDebug';

interface ReferralSystemProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

interface ReferralRecord {
  id: string;
  bonus_amount: number;
  created_at: string;
  referred: {
    username: string;
    avatar: string;
    created_at: string;
  };
  lifetime_earnings_from_referral?: number;
}

interface EnhancedReferralStats {
  total_referrals: number;
  referral_earnings: number;
  lifetime_referral_earnings: number;
  last_referral_payout: string;
  referral_history: ReferralRecord[];
  earnings_breakdown: Record<string, number>;
  recent_earnings: any[];
}

const ReferralSystem: React.FC<ReferralSystemProps> = ({ user, onUserUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [referralHistory, setReferralHistory] = useState<ReferralRecord[]>([]);
  const [enhancedStats, setEnhancedStats] = useState<EnhancedReferralStats | null>(null);
  const [earningsSummary, setEarningsSummary] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const referralUrl = `${window.location.origin}?ref=${user.referralCode}`;

  React.useEffect(() => {
    loadReferralHistory();
    loadEnhancedStats();
  }, [user.id]);

  React.useEffect(() => {
    if (enhancedStats) {
      loadEarningsSummary();
    }
  }, [selectedPeriod, enhancedStats]);

  const loadReferralHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading referral history for user:', user.id);
      
      const history = await getReferralStats(user.id);
      console.log('Loaded referral history:', history);
      setReferralHistory(history);
      
      if (history.length === 0 && user.totalReferrals > 0) {
        console.warn('User has referrals but history is empty. This might indicate a data sync issue.');
        setError('Referral data found but history could not be loaded. Please try refreshing.');
      }
    } catch (error) {
      console.error('Error loading referral history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load referral history. Please check your connection.');
      setReferralHistory([]); // Clear any existing data
    } finally {
      setLoading(false);
    }
  };

  const loadEnhancedStats = async () => {
    try {
      const stats = await getEnhancedReferralStats(user.id);
      if (stats && stats.success) {
        setEnhancedStats(stats);
        if (stats.referral_history) {
          setReferralHistory(stats.referral_history);
        }
      }
    } catch (error) {
      console.error('Error loading enhanced referral stats:', error);
    }
  };

  const loadEarningsSummary = async () => {
    try {
      const summary = await getReferralEarningsSummary(user.id, selectedPeriod);
      setEarningsSummary(summary);
    } catch (error) {
      console.error('Error loading earnings summary:', error);
    }
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareToSocial = (platform: string) => {
    const text = `🚀 Join CordNode and earn rewards based on your Discord account age! The longer you've been on Discord, the more you earn! Use my referral link:`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(referralUrl);

    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'discord':
        // For Discord, we'll just copy the message
        navigator.clipboard.writeText(`${text} ${referralUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      case 'reddit':
        shareUrl = `https://reddit.com/submit?title=${encodeURIComponent('🚀 Join CordNode - Earn based on Discord account age!')}&url=${encodedUrl}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    setShowShareMenu(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Referral System</h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Invite friends and earn 10% of their welcome bonus when they join!
        </p>
      </div>

      {/* Referral Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600">
              <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white" id="total-referrals-count">
              {enhancedStats?.total_referrals || user.totalReferrals}
            </span>
          </div>
          <h3 className="text-gray-400 text-xs sm:text-sm font-medium">Total Referrals</h3>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-green-400 to-green-600">
              <Gift className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white">
              {Math.floor(enhancedStats?.lifetime_referral_earnings || user.referralEarnings).toLocaleString()}
            </span>
          </div>
          <h3 className="text-gray-400 text-xs sm:text-sm font-medium">Lifetime Earnings (CORD)</h3>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-purple-400 to-purple-600">
              <Share2 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white">
              50%
            </span>
          </div>
          <h3 className="text-gray-400 text-xs sm:text-sm font-medium">Ongoing Commission</h3>
        </div>
      </div>

      {/* Enhanced Earnings Summary */}
      {enhancedStats && (
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800 mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Earnings Summary</h3>
          
          {/* Period Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: 'day', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' }
            ].map(period => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id as any)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  selectedPeriod === period.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {earningsSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-400">
                  {Math.floor(earningsSummary.total_earnings).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">CORD Earned</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-400">
                  {earningsSummary.earnings_count}
                </div>
                <div className="text-xs text-gray-400">Transactions</div>
              </div>
              {earningsSummary.top_earner?.referred_username && (
                <div className="text-center">
                  <div className="text-sm font-bold text-purple-400">
                    {earningsSummary.top_earner.referred_username}
                  </div>
                  <div className="text-xs text-gray-400">Top Earner</div>
                </div>
              )}
            </div>
          )}

          {/* Earnings Breakdown */}
          {enhancedStats.earnings_breakdown && Object.keys(enhancedStats.earnings_breakdown).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h4 className="text-sm font-medium text-white mb-2">Earnings by Type</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(enhancedStats.earnings_breakdown).map(([type, amount]) => (
                  <div key={type} className="text-center p-2 bg-gray-800/50 rounded">
                    <div className="text-sm font-bold text-white">{Math.floor(amount as number)}</div>
                    <div className="text-xs text-gray-400 capitalize">{type.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Referral Link Section */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800 mb-6 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Your Referral Link</h3>
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:space-x-4">
          <div className="flex-1">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <code className="text-cyan-400 text-xs sm:text-sm break-all">{referralUrl}</code>
            </div>
          </div>
          <div className="flex gap-2 relative">
            <button
              onClick={copyReferralLink}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 text-sm ${
                copied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {copied ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Copy className="w-3 h-3 sm:w-4 sm:h-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <div className="relative z-50">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="px-3 sm:px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 text-sm"
              >
                <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Share</span>
              </button>
              
              {showShareMenu && (
                <div className="absolute top-full right-0 mt-2 bg-gray-900 rounded-lg border border-gray-600 shadow-2xl z-[100] min-w-[160px] backdrop-blur-md">
                  <button
                    onClick={() => shareToSocial('twitter')}
                    className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-2 text-sm rounded-t-lg first:rounded-t-lg"
                  >
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Twitter</span>
                  </button>
                  <button
                    onClick={() => shareToSocial('discord')}
                    className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-2 text-sm border-t border-gray-700"
                  >
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Discord</span>
                  </button>
                  <button
                    onClick={() => shareToSocial('telegram')}
                    className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-2 text-sm border-t border-gray-700"
                  >
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Telegram</span>
                  </button>
                  <button
                    onClick={() => shareToSocial('reddit')}
                    className="w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-2 text-sm border-t border-gray-700 rounded-b-lg last:rounded-b-lg"
                  >
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Reddit</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Referral History */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800 mb-6 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Referral History</h3>
        
        {error && (
          <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-red-400">❌</span>
              <div>
                <div className="text-white font-medium text-sm">Error Loading History</div>
                <div className="text-red-400 text-xs">{error}</div>
              </div>
            </div>
            <button
              onClick={loadReferralHistory}
              className="mt-2 text-red-300 hover:text-red-200 text-xs underline"
            >
              Try again
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="ml-2 text-gray-400">Loading referral history...</span>
          </div>
        ) : !error && referralHistory.length > 0 ? (
          <div className="space-y-3">
            {referralHistory.map((referral) => (
              <div 
                key={referral.id} 
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img 
                      src={referral.referred.avatar} 
                      alt={referral.referred.username} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">{referral.referred.username}</div>
                    <div className="text-gray-400 text-xs">
                      Joined {new Date(referral.created_at).toLocaleDateString()}
                    </div>
                    {referral.lifetime_earnings_from_referral && referral.lifetime_earnings_from_referral > 0 && (
                      <div className="text-green-400 text-xs">
                        Lifetime: +{Math.floor(referral.lifetime_earnings_from_referral)} CORD
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-green-400 font-semibold text-sm">
                  +{Math.floor(referral.bonus_amount)} CORD
                </div>
              </div>
            ))}
          </div>
        ) : !error && !loading ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No referrals yet. Start sharing your link!</p>
            <button
              onClick={loadReferralHistory}
              className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm underline"
            >
              Refresh
            </button>
          </div>
        ) : null}
        
      </div>

      {/* How It Works */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800 mb-6 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">How Referrals Work</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="text-white font-medium text-sm sm:text-base">Share Your Link</h4>
                <p className="text-gray-400 text-xs sm:text-sm">Send your referral link to friends who haven't joined CordNode yet.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="text-white font-medium text-sm sm:text-base">Friend Joins</h4>
                <p className="text-gray-400 text-xs sm:text-sm">When they connect their Discord account, they'll be marked as your referral.</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="text-white font-medium text-sm sm:text-base">Instant Rewards</h4>
                <p className="text-gray-400 text-xs sm:text-sm">You earn a welcome bonus immediately when they join.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="text-white font-medium text-sm sm:text-base">Ongoing 50% Commission</h4>
                <p className="text-gray-400 text-xs sm:text-sm">Earn 50% of ALL their future earnings - mining, tasks, bonuses!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Benefits */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-600/10 border border-cyan-500/20 rounded-xl p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Why Refer Friends?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 rounded-lg bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center">
              <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Ongoing Income</h4>
            <p className="text-gray-400 text-xs sm:text-sm">Earn 10% of everything they make, forever</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Build Community</h4>
            <p className="text-gray-400 text-xs sm:text-sm">Help grow the CordNode community</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 rounded-lg bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center">
              <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h4 className="text-white font-medium mb-2 text-sm sm:text-base">No Limits</h4>
            <p className="text-gray-400 text-xs sm:text-sm">Passive income that grows with your network</p>
          </div>
        </div>
      </div>

      {/* Debug Component - Only visible in development */}
      {import.meta.env.DEV && (
        <ReferralDebug userId={user.id} />
      )}

      {/* Referral Code Display */}
      <div className="mt-6 sm:mt-8 bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Your Referral Code</h3>
        <div className="text-center">
          <div className="inline-block bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 rounded-lg p-4 sm:p-6">
            <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
              {user.referralCode}
            </div>
            <p className="text-gray-400 text-xs sm:text-sm">
              Share this code with friends or use the link above
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;