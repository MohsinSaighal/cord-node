import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  Clock,
  Gift,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { UserData } from "../../types";
import { handleOAuthCallback, signInWithDiscord } from "../../utils/supabaseAuth";
import { validateOAuthState, clearOAuthState } from "../../utils/discord";

interface CleanAuthModalProps {
  onClose: () => void;
  onLogin: (userData: UserData, isNewUser?: boolean) => void;
}

export const CleanAuthModal: React.FC<CleanAuthModalProps> = ({ onClose, onLogin }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStep, setConnectionStep] = useState<
    "idle" | "redirecting" | "processing" | "success"
  >("idle");

  useEffect(() => {
    // Check if we're returning from Discord OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const error_param = urlParams.get("error");
    const error_description = urlParams.get("error_description");

    if (error_param) {
      const errorMsg = error_description || error_param;
      setError(`Discord authorization failed: ${errorMsg}`);
      setConnectionStep("idle");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state) {
      if (validateOAuthState(state)) {
        setConnectionStep("processing");
        handleOAuthReturn(code);
      } else {
        setError("Invalid OAuth state. Please try connecting again.");
        setConnectionStep("idle");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      clearOAuthState();
    }
  }, []);

  const handleOAuthReturn = async (code: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      const pendingReferral = localStorage.getItem("pendingReferralCode");
      const result = await handleOAuthCallback(code, pendingReferral);
      
      if (result.success && result.user) {
        setConnectionStep("success");
        localStorage.removeItem("pendingReferralCode");
        setTimeout(() => {
          onLogin(result.user!, result.isNewUser);
          onClose();
        }, 1500);
      } else {
        throw new Error(result.error || "Authentication failed");
      }
    } catch (error: any) {
      setError(error.message || "Connection failed. Please try again.");
      setConnectionStep("idle");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    setConnectionStep("redirecting");

    try {
      await signInWithDiscord();
    } catch (error: any) {
      setError(error.message || "Failed to connect to Discord");
      setConnectionStep("idle");
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg">
        {/* Main Modal Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-sky-500 to-teal-500 p-8 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-sky-500">C</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">Connect to CordNode</h2>
              <p className="text-sky-100">Transform your Discord legacy into valuable rewards</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Status Messages */}
            {connectionStep === "processing" && (
              <div className="text-center mb-6">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-700 font-medium">Processing your connection...</p>
              </div>
            )}

            {connectionStep === "success" && (
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-teal-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Successfully Connected!</h3>
                <p className="text-slate-600">Welcome to CordNode. Redirecting to your dashboard...</p>
              </div>
            )}

            {(connectionStep === "idle" || connectionStep === "redirecting") && (
              <>
                {/* Features Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-sky-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm">Mine CORD</h4>
                    <p className="text-xs text-slate-600">Earn based on account age</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm">Daily Tasks</h4>
                    <p className="text-xs text-slate-600">Complete challenges</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm">Secure</h4>
                    <p className="text-xs text-slate-600">OAuth protected</p>
                  </div>
                </div>

                {/* Benefits */}
                <div className="bg-gradient-to-r from-sky-50 to-teal-50 rounded-2xl p-6 mb-8 border border-sky-100">
                  <h3 className="font-bold text-slate-800 mb-4 text-center">Transform your Discord legacy into valuable rewards</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-teal-500 flex-shrink-0" />
                      <span className="text-slate-700 text-sm">Account age determines your mining multiplier</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Gift className="w-5 h-5 text-sky-500 flex-shrink-0" />
                      <span className="text-slate-700 text-sm">Earn CORD tokens 24/7 while mining</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-700 text-sm">Secure OAuth - no passwords required</span>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}

                {/* Connect Button */}
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full bg-gradient-to-r from-sky-500 to-teal-500 text-white font-semibold py-4 rounded-2xl hover:from-sky-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-center space-x-2">
                    {isConnecting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <ExternalLink className="w-5 h-5" />
                    )}
                    <span>{isConnecting ? "Connecting..." : "Connect Discord & Start Mining"}</span>
                  </div>
                </button>
                
                <p className="text-center text-slate-500 text-xs mt-4">
                  Secure OAuth connection • No password required • Start earning instantly
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};