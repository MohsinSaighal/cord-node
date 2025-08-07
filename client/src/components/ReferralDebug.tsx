import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, RefreshCw, Database } from 'lucide-react';

interface ReferralDebugProps {
  userId: string;
}

const ReferralDebug: React.FC<ReferralDebugProps> = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [action, setAction] = useState<string | null>(null);

  const runVerification = async () => {
    setLoading(true);
    setAction('verify');
    try {
      const { data, error } = await supabase.rpc('verify_user_referral_count', {
        p_user_id: userId
      });
      
      if (error) throw error;
      setResults(data);
    } catch (error) {
      console.error('Error verifying referral count:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const runTriggerTest = async () => {
    setLoading(true);
    setAction('trigger');
    try {
      const { data, error } = await supabase.rpc('check_referral_trigger_functionality');
      
      if (error) throw error;
      setResults(data);
    } catch (error) {
      console.error('Error testing referral trigger:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fixReferralCount = async () => {
    setLoading(true);
    setAction('fix');
    try {
      const { data, error } = await supabase.rpc('fix_user_referral_count', {
        p_user_id: userId
      });
      
      if (error) throw error;
      setResults(data);
    } catch (error) {
      console.error('Error fixing referral count:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const simulateReferralEarning = async () => {
    setLoading(true);
    setAction('simulate');
    try {
      // First get a referred user
      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('referred_id')
        .eq('referrer_id', userId)
        .limit(1);
      
      if (referralsError) throw referralsError;
      
      if (!referrals || referrals.length === 0) {
        setResults({ error: 'No referred users found for simulation' });
        setLoading(false);
        return;
      }
      
      const referredId = referrals[0].referred_id;
      
      // Simulate an earning
      const { data, error } = await supabase.rpc('simulate_referral_earnings', {
        p_referrer_id: userId,
        p_referred_id: referredId,
        p_amount: 100,
        p_type: 'test_earning'
      });
      
      if (error) throw error;
      setResults(data);
    } catch (error) {
      console.error('Error simulating referral earning:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Database className="w-4 h-4 mr-2 text-cyan-400" />
          Referral System Diagnostics
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={runVerification}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Verify Count
          </button>
          <button
            onClick={runTriggerTest}
            disabled={loading}
            className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            Test Trigger
          </button>
          <button
            onClick={fixReferralCount}
            disabled={loading}
            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Fix Count
          </button>
          <button
            onClick={simulateReferralEarning}
            disabled={loading}
            className="px-3 py-1 bg-yellow-600 text-white rounded-lg text-xs hover:bg-yellow-700 transition-colors disabled:opacity-50"
          >
            Simulate Earning
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-4">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mr-2" />
          <span className="text-blue-400">
            {action === 'verify' && 'Verifying referral count...'}
            {action === 'trigger' && 'Testing referral trigger...'}
            {action === 'fix' && 'Fixing referral count...'}
            {action === 'simulate' && 'Simulating referral earning...'}
          </span>
        </div>
      )}

      {results && !loading && (
        <div className="bg-gray-800 rounded-lg p-4 overflow-auto max-h-64">
          {results.error ? (
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-red-400 font-medium">Error</div>
                <div className="text-gray-300 text-sm">{results.error}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-green-400 font-medium">Success</div>
                  {action === 'verify' && (
                    <div className="text-gray-300 text-sm">
                      Stored count: {results.stored_count}, 
                      Actual count: {results.actual_count}, 
                      Accurate: {results.is_accurate ? 'Yes' : 'No'}
                    </div>
                  )}
                  {action === 'trigger' && (
                    <div className="text-gray-300 text-sm">
                      Trigger functionality: {results.trigger_functionality}
                    </div>
                  )}
                  {action === 'fix' && (
                    <div className="text-gray-300 text-sm">
                      Old count: {results.old_count}, 
                      New count: {results.new_count}, 
                      Difference: {results.difference}
                    </div>
                  )}
                  {action === 'simulate' && (
                    <div className="text-gray-300 text-sm">
                      Referral reward distributed: {results.distribution_result?.success ? 'Yes' : 'No'}
                      {results.earnings_increased && (
                        <span className="text-green-400 ml-2">Earnings increased!</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <pre className="text-xs text-gray-400 overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        This component is for testing and debugging the referral system. It allows you to verify if referral counts are accurate and test the functionality of the referral trigger.
      </div>
    </div>
  );
};

export default ReferralDebug;