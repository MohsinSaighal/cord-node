import React, { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Users, 
  Gift, 
  TrendingUp,
  ExternalLink,
  Check,
  Sparkles,
  DollarSign,
  Calendar,
  UserPlus
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { GradientText } from '@/components/ui/GradientText';
import { StatsCard } from '@/components/ui/StatsCard';
import { SimpleButton } from '@/components/ui/SimpleButton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UserData } from '../../types';

interface ModernReferralSystemProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

const ShareButton: React.FC<{
  platform: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}> = ({ platform, icon, color, onClick }) => (
  <SimpleButton
    onClick={onClick}
    variant="secondary"
    size="md"
    className={cn(
      "flex items-center space-x-2 transition-all duration-300 hover-lift",
      `hover:${color} hover:text-white border-slate-600/50 hover:border-transparent`
    )}
  >
    {icon}
    <span>{platform}</span>
  </SimpleButton>
);

const ReferralCodeCard: React.FC<{
  referralCode: string;
  onCopy: () => void;
  copied: boolean;
}> = ({ referralCode, onCopy, copied }) => {
  const referralUrl = `${window.location.origin}?ref=${referralCode}`;

  return (
    <AnimatedCard className="p-8 border backdrop-blur-xl" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--brand-primary)' }}>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Your Referral Code</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Share this code and earn 10% of all your referrals' earnings forever</p>
      </div>

      <div className="rounded-2xl p-6 border mb-6" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--brand-primary)' }}>
        <div className="text-center mb-4">
          <div className="text-4xl font-mono font-bold mb-2" style={{ color: 'var(--brand-accent)' }}>
            {referralCode}
          </div>
          <div className="text-sm break-all" style={{ color: 'var(--text-tertiary)' }}>{referralUrl}</div>
        </div>
        
        <button
          onClick={onCopy}
          className="w-full font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center space-x-2"
          style={{ background: 'var(--gradient-brand)', color: 'var(--text-primary)' }}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ShareButton
          platform="Twitter"
          icon={<Share2 className="w-4 h-4" />}
          color="bg-blue-500"
          onClick={() => {
            const text = `Join me on CordNode and start mining CORD tokens! Use my referral code: ${referralCode}`;
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralUrl)}`;
            window.open(url, '_blank');
          }}
        />
        
        <ShareButton
          platform="Discord"
          icon={<ExternalLink className="w-4 h-4" />}
          color="bg-indigo-500"
          onClick={() => navigator.clipboard.writeText(`Join me on CordNode! Use my referral code: ${referralCode} - ${referralUrl}`)}
        />
        
        <ShareButton
          platform="Telegram"
          icon={<Share2 className="w-4 h-4" />}
          color="bg-cyan-500"
          onClick={() => {
            const text = `Join me on CordNode and start mining CORD tokens! ${referralUrl}`;
            window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`, '_blank');
          }}
        />
        
        <ShareButton
          platform="WhatsApp"
          icon={<Share2 className="w-4 h-4" />}
          color="bg-green-500"
          onClick={() => {
            const text = `Join me on CordNode and start mining CORD tokens! Use my referral code: ${referralCode} - ${referralUrl}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
          }}
        />
      </div>
    </AnimatedCard>
  );
};

const ReferralHistory: React.FC<{
  referrals: any[];
}> = ({ referrals }) => {
  if (referrals.length === 0) {
    return (
      <AnimatedCard className="p-8 text-center bg-gradient-to-br from-slate-800/30 to-slate-900/50 border-slate-700/30">
        <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-300 mb-2">No referrals yet</h3>
        <p className="text-slate-500">Share your referral code to start earning commissions!</p>
      </AnimatedCard>
    );
  }

  return (
    <AnimatedCard className="p-6 bg-gradient-to-br from-slate-800/30 to-slate-900/50 border-slate-700/30" delay={2}>
      <div className="flex items-center mb-6">
        <UserPlus className="w-6 h-6 text-green-400 mr-3" />
        <h3 className="text-2xl font-bold text-white">Referral History</h3>
      </div>

      <div className="space-y-4">
        {referrals.map((referral, index) => (
          <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-slate-700/30 border border-slate-600/20 hover-lift">
            <div className="flex items-center space-x-4">
              {referral.referred?.avatar && (
                <img
                  src={referral.referred.avatar}
                  alt={referral.referred.username}
                  className="w-10 h-10 rounded-full border-2 border-slate-600/50"
                />
              )}
              
              <div>
                <div className="font-bold text-white">{referral.referred?.username || 'Unknown User'}</div>
                <div className="text-sm text-slate-400">
                  Joined {new Date(referral.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-bold text-green-400">
                +{referral.bonus_amount} CORD
              </div>
              <div className="text-xs text-slate-500">Welcome bonus</div>
            </div>
          </div>
        ))}
      </div>
    </AnimatedCard>
  );
};

export const ModernReferralSystem: React.FC<ModernReferralSystemProps> = ({ user, onUserUpdate }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const referralUrl = `${window.location.origin}?ref=${user.referralCode}`;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 pt-20">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/5 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute top-2/3 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-3/4 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-6xl font-bold text-white mb-4">
            <GradientText className="bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-600">
              Referral Program
            </GradientText>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Invite friends and earn 10% of their mining rewards forever. The more you refer, the more you earn.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatsCard
            title="Total Referrals"
            value={user.totalReferrals || 0}
            subtitle="Friends referred"
            icon={<Users className="w-6 h-6" />}
            gradient="from-purple-400 to-pink-600"
            delay={0}
          />
          
          <StatsCard
            title="Referral Earnings"
            value={`${(user.referralEarnings || 0).toFixed(2)} CORD`}
            subtitle="Total commissions"
            icon={<DollarSign className="w-6 h-6" />}
            gradient="from-green-400 to-emerald-600"
            delay={1}
            trend={user.referralEarnings > 0 ? 25 : undefined}
          />
          
          <StatsCard
            title="Commission Rate"
            value="10%"
            subtitle="Lifetime earnings"
            icon={<TrendingUp className="w-6 h-6" />}
            gradient="from-cyan-400 to-blue-600"
            delay={2}
          />
          
          <StatsCard
            title="Welcome Bonus"
            value="86 CORD"
            subtitle="Per new referral"
            icon={<Gift className="w-6 h-6" />}
            gradient="from-orange-400 to-yellow-600"
            delay={3}
          />
        </div>

        {/* Referral Code Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ReferralCodeCard
              referralCode={user.referralCode}
              onCopy={handleCopy}
              copied={copied}
            />
          </div>

          {/* Benefits Card */}
          <AnimatedCard className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/20" delay={1}>
            <div className="flex items-center mb-6">
              <Sparkles className="w-6 h-6 text-cyan-400 mr-3" />
              <h3 className="text-2xl font-bold text-white">Benefits</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="font-medium text-white">10% Commission</div>
                  <div className="text-sm text-slate-400">Earn from all referral mining forever</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="font-medium text-white">86 CORD Welcome Bonus</div>
                  <div className="text-sm text-slate-400">New users get bonus when they join</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="font-medium text-white">No Limits</div>
                  <div className="text-sm text-slate-400">Refer as many friends as you want</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="font-medium text-white">Real-time Tracking</div>
                  <div className="text-sm text-slate-400">See your earnings grow instantly</div>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Referral History */}
        <div className="mt-12">
          <ReferralHistory referrals={[]} />
        </div>
      </div>
    </div>
  );
};