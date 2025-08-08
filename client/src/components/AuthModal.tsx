import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  Clock,
  Gift,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { UserData } from "../types";
import { handleOAuthCallback, signInWithDiscord } from "../utils/supabaseAuth";
import { validateOAuthState, clearOAuthState } from "../utils/discord";

interface AuthModalProps {
  onClose: () => void;
  onLogin: (userData: UserData, isNewUser?: boolean) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [connectionStep, setConnectionStep] = useState<
    "idle" | "redirecting" | "processing" | "success"
  >("idle");
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);

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
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state) {
      console.log("Processing OAuth callback with code and state");

      // Validate state
      if (validateOAuthState(state)) {
        setConnectionStep("processing");
        handleOAuthReturn(code);
      } else {
        setError(
          "Invalid OAuth state. This could be due to an expired session or security issue. Please try connecting again."
        );
        setConnectionStep("idle");
      }

      // Clean up URL and state
      window.history.replaceState({}, document.title, window.location.pathname);
      clearOAuthState();
    }
  }, []);

  const handleOAuthReturn = async (code: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log("Processing OAuth return with code:", code);

      // Get pending referral code
      const pendingReferral =
        localStorage.getItem("pendingReferral") ||
        sessionStorage.getItem("pendingReferral");

      // Handle OAuth callback and create/update user
      const userData = await handleOAuthCallback(
        code,
        pendingReferral || undefined
      );

      // Clean up pending referral
      if (pendingReferral) {
        sessionStorage.removeItem("pendingReferral");
      }

      console.log("OAuth successful, user data:", userData);
      setConnectionStep("success");

      // Small delay to show success state
      setTimeout(() => {
        onLogin(userData, true);
      }, 1000);
    } catch (err) {
      console.error("Discord OAuth error:", err);
      setConnectionStep("idle");

      let errorMessage = "Unknown error occurred during Discord login";

      if (err instanceof Error) {
        errorMessage = err.message;

        // Provide more helpful error messages
        if (
          errorMessage.includes("400") ||
          errorMessage.includes("invalid_grant")
        ) {
          errorMessage =
            "Authorization code expired. Please try connecting again.";
        } else if (
          errorMessage.includes("401") ||
          errorMessage.includes("unauthorized")
        ) {
          errorMessage =
            "Authentication failed. Please check your Discord permissions.";
        } else if (
          errorMessage.includes("403") ||
          errorMessage.includes("forbidden")
        ) {
          errorMessage =
            "Access denied. Please ensure you have the necessary permissions.";
        } else if (errorMessage.includes("redirect_uri_mismatch")) {
          errorMessage = "Configuration error. Please contact support.";
        } else if (errorMessage.includes("invalid_client")) {
          errorMessage =
            "Discord application configuration error. Please contact support.";
        } else if (errorMessage.includes("unsupported_grant_type")) {
          errorMessage = "OAuth configuration error. Please try again.";
        } else if (errorMessage.includes("CORS")) {
          errorMessage =
            "Network error. Please check your internet connection and try again.";
        } else if (errorMessage.includes("Failed to fetch")) {
          errorMessage =
            "Network connection failed. Please check your internet and try again.";
        } else if (errorMessage.includes("Database error")) {
          errorMessage =
            "Database connection issue. Please try again in a moment.";
        }

        // Collect diagnostic information
        try {
          const diagInfo = {
            timestamp: new Date().toISOString(),
            browser: navigator.userAgent,
            error: errorMessage,
            url: window.location.href.replace(/code=[^&]+/, "code=REDACTED"),
            hasLocalStorage: typeof localStorage !== "undefined",
            hasSessionStorage: typeof sessionStorage !== "undefined",
            cookiesEnabled: navigator.cookieEnabled,
          };
          setDiagnosticInfo(diagInfo);
          console.log("Diagnostic info collected:", diagInfo);
        } catch (diagError) {
          console.error("Error collecting diagnostic info:", diagError);
        }
      }

      setError(`Failed to connect to Discord: ${errorMessage}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDiscordLogin = async () => {
    try {
      setError(null);
      setIsConnecting(true);
      setConnectionStep("redirecting");

      console.log("Initiating Discord login...");

      // Clear any existing OAuth state
      clearOAuthState();

      const authUrl = await signInWithDiscord();
      console.log("Redirecting to:", authUrl);

      // Small delay to show the redirecting state
      setTimeout(() => {
        window.location.href = authUrl;
      }, 1000);
    } catch (err) {
      console.error("Discord login error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Failed to initiate Discord login: ${errorMessage}`);
      setIsConnecting(false);
      setConnectionStep("idle");
    }
  };

  const retryConnection = () => {
    setError(null);
    setConnectionStep("idle");
    clearOAuthState(); // Clear any stale state
    handleDiscordLogin();
  };

  const openDiscordManually = () => {
    // Generate a fresh state for manual opening
    const state = Math.random().toString(36).substring(2, 15);
    const authUrl = `https://discord.com/oauth2/authorize?client_id=1392762186908176454&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5173&scope=identify+guilds+email
state=${state}`;
    // Store the state
    sessionStorage.setItem("discord_oauth_state", state);
    localStorage.setItem("discord_oauth_state", state);
    localStorage.setItem("discord_oauth_timestamp", Date.now().toString());

    window.open(authUrl, "_blank");
  };

  const getStepMessage = () => {
    switch (connectionStep) {
      case "redirecting":
        return "Redirecting to Discord...";
      case "processing":
        return "Processing your Discord account...";
      case "success":
        return "Successfully connected!";
      default:
        return "Connect with Discord";
    }
  };

  const getStepIcon = () => {
    switch (connectionStep) {
      case "success":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37.07.07 0 0 0 3.608 4.4a20.085 20.085 0 0 0-3.056 12.248.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.027 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054 20.06 20.06 0 0 0-3.056-12.248.059.059 0 0 0-.071-.031z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#1E1E2D] rounded-2xl p-8 max-w-md w-full border border-[#6A5ACD]/30 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#FFFFFF]">Connect Discord</h2>
          <button
            onClick={onClose}
            className="p-2 text-[#A0A0C0] hover:text-[#FFFFFF] hover:bg-[#6A5ACD]/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4">
            <img
              src="https://i.ibb.co/5gZ6p5Vf/CordNode.png"
              alt="CordNode"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-[#CCCCCC] mb-6">
            Connect your Discord account to start earning rewards based on your
            account age!
          </p>
        </div>

        {error && (
          <div className="bg-[#FF355E]/10 border border-[#FF355E]/30 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-[#FF6B6B] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[#FF6B6B] text-sm font-medium">
                  Connection Failed
                </p>
                <p className="text-[#CCCCCC] text-xs mt-1">{error}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={retryConnection}
                    className="flex items-center space-x-1 text-red-300 hover:text-red-200 text-xs underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Try again</span>
                  </button>
                  <button
                    onClick={openDiscordManually}
                    className="flex items-center space-x-1 text-red-300 hover:text-red-200 text-xs underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open manually</span>
                  </button>
                  <button
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                    className="text-red-300 hover:text-red-200 text-xs underline"
                  >
                    Debug info
                  </button>
                </div>
                {showDebugInfo && (
                  <div className="mt-3 p-2 bg-gray-800 rounded text-xs text-gray-300">
                    <p>Current URL: {window.location.href}</p>
                    <p>User Agent: {navigator.userAgent.substring(0, 30)}...</p>
                    <p>
                      Cookies enabled: {navigator.cookieEnabled ? "Yes" : "No"}
                    </p>
                    <p>Connection step: {connectionStep}</p>
                    <p>
                      Local storage available:{" "}
                      {typeof Storage !== "undefined" ? "Yes" : "No"}
                    </p>
                    {diagnosticInfo && (
                      <>
                        <p className="mt-2 text-yellow-400">
                          Diagnostic Information:
                        </p>
                        <p>Timestamp: {diagnosticInfo.timestamp}</p>
                        <p>Error: {diagnosticInfo.error}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connection Progress */}
        {connectionStep !== "idle" && !error && (
          <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              <div>
                <p className="text-blue-400 text-sm font-medium">
                  {connectionStep === "redirecting" &&
                    "Redirecting to Discord..."}
                  {connectionStep === "processing" &&
                    "Processing your account..."}
                  {connectionStep === "success" && "Connection successful!"}
                </p>
                <p className="text-blue-300 text-xs mt-1">
                  {connectionStep === "redirecting" &&
                    "You will be redirected to Discord in a moment"}
                  {connectionStep === "processing" &&
                    "Calculating your rewards and setting up your account"}
                  {connectionStep === "success" && "Welcome to CordNode!"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-600">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-medium">Account Age Rewards</div>
              <div className="text-gray-400 text-sm">
                Longer Discord accounts earn more
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-400 to-purple-600">
              <Gift className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-medium">Instant Multiplier</div>
              <div className="text-gray-400 text-sm">
                Get up to 10x earning multiplier
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-400 to-green-600">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-medium">Secure & Private</div>
              <div className="text-gray-400 text-sm">
                We only access basic profile info
              </div>
            </div>
          </div>
        </div>

        {/* Discord Login Button */}
        <button
          onClick={handleDiscordLogin}
          disabled={isConnecting || connectionStep !== "idle"}
          className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
            isConnecting || connectionStep !== "idle"
              ? "bg-[#4A4A6A] cursor-not-allowed text-[#A0A0C0]"
              : "bg-[#5865F2] hover:bg-[#4752C4] text-[#FFFFFF]"
          } ${connectionStep === "success" ? "bg-[#00D1B2]" : ""}`}
        >
          {isConnecting || connectionStep !== "idle" ? (
            <>
              {connectionStep === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              )}
              <span>{getStepMessage()}</span>
            </>
          ) : (
            <>
              {getStepIcon()}
              <span>{getStepMessage()}</span>
            </>
          )}
        </button>

        <p className="text-[#8A8A9E] text-xs text-center mt-4">
          By connecting, you agree to our Terms of Service and Privacy Policy
        </p>

        {/* Alternative connection method */}
        {error && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-2">
              Having trouble? Try these steps:
            </p>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal pl-4">
              <li>1. Disable ad blockers or privacy extensions</li>
              <li>2. Clear browser cache and cookies</li>
              <li>3. Try a different browser or incognito mode</li>
              <li>4. Check your internet connection</li>
              <li>5. Make sure you're logged into Discord</li>
              <li>6. Try the "Open manually" option above</li>
              <li>7. If using a VPN or proxy, try disabling it</li>
              <li>8. Ensure your browser is up to date</li>
            </ol>
            <p className="text-xs text-gray-400 mt-2">
              If you continue to experience issues, please contact support with
              the error details shown above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
