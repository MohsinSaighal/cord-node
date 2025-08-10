import React, { useState, useEffect } from "react";
import {
  Award,
  Wallet,
  Loader,
  CheckCircle,
  AlertCircle,
  Star,
  Crown,
  Zap,
} from "lucide-react";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { GradientText } from "@/components/ui/GradientText";
import { SimpleButton } from "@/components/ui/SimpleButton";
import { Badge } from "@/components/ui/badge";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
// Note: Using console.log for notifications instead of toast hook
import { cn } from "@/lib/utils";
import type { UserData } from "../../types";
import {
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
interface BadgeOfHonorPurchaseProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

interface SolanaPrice {
  usd: number;
}

const BADGE_PRICE_SOL = 0.02;

export const BadgeOfHonorPurchase: React.FC<BadgeOfHonorPurchaseProps> = ({
  user,
  onUserUpdate,
}) => {
  const [isPaying, setIsPaying] = useState(false);
  const [solPrice, setSolPrice] = useState<number>(50); // Default fallback
  const [isConnectedToWallet, setIsConnectedToWallet] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  // Simple notification function
  const showNotification = (
    title: string,
    description: string,
    variant?: "destructive"
  ) => {
    console.log(`${title}: ${description}`);
    // In a full implementation, you'd integrate with your notification system
  };

  // Fetch SOL price
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data: { solana: SolanaPrice } = await response.json();
        setSolPrice(data.solana.usd);
      } catch (error) {
        console.error("Failed to fetch SOL price:", error);
        setSolPrice(50); // Fallback price
      }
    };

    fetchSolPrice();

    // Update price every 5 minutes
    const interval = setInterval(fetchSolPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Check wallet connection
  useEffect(() => {
    const checkWalletConnection = () => {
      if (typeof window !== "undefined" && "solana" in window) {
        const solanaWallet = (window as any).solana;
        setIsConnectedToWallet(solanaWallet?.isConnected || false);
      }
    };

    checkWalletConnection();

    // Listen for wallet connection changes
    if (typeof window !== "undefined" && "solana" in window) {
      const solanaWallet = (window as any).solana;
      solanaWallet?.on?.("connect", () => setIsConnectedToWallet(true));
      solanaWallet?.on?.("disconnect", () => setIsConnectedToWallet(false));
    }
  }, []);

  const connectWallet = async () => {
    try {
      if (typeof window !== "undefined" && "solana" in window) {
        const solanaWallet = (window as any).solana;
        if (solanaWallet?.isPhantom) {
          const response = await solanaWallet.connect();
          setIsConnectedToWallet(true);
          showNotification(
            "Wallet Connected",
            "Successfully connected to Phantom wallet"
          );
        } else {
          throw new Error("Phantom wallet not found");
        }
      } else {
        throw new Error("Solana wallet not detected");
      }
    } catch (error: any) {
      showNotification(
        "Connection Failed",
        error.message || "Failed to connect wallet",
        "destructive"
      );
    }
  };

  const handlePurchase = async () => {
    if (!isConnectedToWallet) {
      await connectWallet();
      return;
    }

    setIsPaying(true);
    setTransactionStatus("processing");
    if (!connection || !publicKey) {
      return;
    }
    setIsPaying(true);

    const SOLANA_RECIPIENT_ADDRESS =
      "6zcYb8ZpqvesFkY5rqgEvQDFM2H2vw3nREJmyR3obuQL";
    const recipientPubKey = new PublicKey(SOLANA_RECIPIENT_ADDRESS);
    const amountInLamports = LAMPORTS_PER_SOL * 0.02;

    const transferTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: recipientPubKey,
        lamports: amountInLamports,
      })
    );

    const signature = await sendTransaction(transferTransaction, connection);
    console.log("Transaction sent, signature:", signature);
    try {
      // Simulate Solana transaction processing
      // In a real implementation, this would interact with the Solana network

      const solanaWallet = (window as any).solana;
      if (!solanaWallet) {
        throw new Error("Wallet not available");
      }

      // Create a mock transaction hash for demonstration
      const mockTransactionHash = `badge_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Simulate transaction processing delay
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Call the badge purchase API
      const response = await fetch(
        "http://staging.printsup.org/api/badge-purchases",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            walletAddress: solanaWallet.publicKey?.toString() || "mock_address",
            transactionHash: mockTransactionHash,
            amountSol: BADGE_PRICE_SOL,
            amountUsd: BADGE_PRICE_SOL * solPrice,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create badge purchase record");
      }

      // Update purchase status to completed
      await fetch(
        `http://staging.printsup.org/api/badge-purchases/${mockTransactionHash}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "completed",
          }),
        }
      );

      // Update user with badge
      const updatedUser = {
        ...user,
        hasBadgeOfHonor: true,
      };

      onUserUpdate(updatedUser);
      setTransactionStatus("success");

      showNotification(
        "Purchase Successful!",
        "Badge of Honor has been added to your account"
      );
    } catch (error: any) {
      setIsPaying(false);

      setTransactionStatus("error");
      showNotification(
        "Purchase Failed",
        error.message || "Failed to complete badge purchase",
        "destructive"
      );
    } finally {
      setIsPaying(false);
      setTimeout(() => setTransactionStatus("idle"), 5000);
    }
  };

  if (user.hasBadgeOfHonor) {
    return null; // Don't show purchase option if user already has the badge
  }

  const usdPrice = BADGE_PRICE_SOL * solPrice;

  return (
    <AnimatedCard
      className="p-6 border relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)",
        borderColor: "var(--reward-gold)",
      }}
      delay={4}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <Crown
          className="w-full h-full"
          style={{ color: "var(--reward-gold)" }}
        />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: "rgba(255, 193, 7, 0.1)" }}
            >
              <Award
                className="w-8 h-8"
                style={{ color: "var(--reward-gold)" }}
              />
            </div>

            <div>
              <h3
                className="text-xl font-bold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Badge of Honor
              </h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Unlock premium benefits and stand out from the crowd
              </p>
            </div>
          </div>

          <Badge
            className="px-3 py-1 text-xs font-bold border"
            style={{
              borderColor: "var(--reward-gold)",
              color: "var(--reward-gold)",
              backgroundColor: "rgba(255, 193, 7, 0.1)",
            }}
          >
            PREMIUM
          </Badge>
        </div>

        {/* Benefits */}
        <div className="mb-6 space-y-3">
          {[
            { icon: <Star className="w-4 h-4" />, text: "5% Mining Bonus" },
            { icon: <Zap className="w-4 h-4" />, text: "Priority Support" },
            {
              icon: <Crown className="w-4 h-4" />,
              text: "Exclusive Badge Display",
            },
          ].map((benefit, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div style={{ color: "var(--brand-secondary)" }}>
                {benefit.icon}
              </div>
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {benefit.text}
              </span>
            </div>
          ))}
        </div>

        {/* Price and Purchase */}
       <div className="flex items-center justify-between gap-4">
  <div className="min-w-0">
    <div className="text-2xl font-bold mb-1 truncate" style={{ color: "var(--reward-gold)" }}>
      {BADGE_PRICE_SOL} SOL
    </div>
    <div className="text-sm truncate" style={{ color: "var(--text-tertiary)" }}>
      ≈ ${usdPrice.toFixed(2)} USD
    </div>
  </div>

  {!isConnectedToWallet ? (
    <div className="flex-shrink-0">
      <WalletMultiButton className="!bg-[var(--reward-gold)] !hover:bg-[#ff9800] !text-black !font-bold !px-6 !py-3" />
    </div>
  ) : (
    <SimpleButton
      onClick={handlePurchase}
      loading={isPaying}
      disabled={transactionStatus === "processing"}
      variant="primary"
      size="lg"
      className={cn(
        "px-6 py-3 font-bold transition-all duration-300 min-w-[150px]",
        transactionStatus === "success" && "!bg-green-500 hover:!bg-green-600",
        transactionStatus === "error" && "!bg-red-500 hover:!bg-red-600"
      )}
      style={{
        background:
          transactionStatus === "idle"
            ? "linear-gradient(135deg, var(--reward-gold) 0%, #ff9800 100%)"
            : undefined,
      }}
    >
      <div className="flex items-center justify-center space-x-2 w-full">
        {transactionStatus === "processing" && (
          <Loader className="w-5 h-5 animate-spin" />
        )}
        {transactionStatus === "success" && (
          <CheckCircle className="w-5 h-5" />
        )}
        {transactionStatus === "error" && (
          <AlertCircle className="w-5 h-5" />
        )}
        {transactionStatus === "idle" && (
          <Award className="w-5 h-5" />
        )}

        <span className="truncate">
          {transactionStatus === "processing" && "Processing..."}
          {transactionStatus === "success" && "Success!"}
          {transactionStatus === "error" && "Try Again"}
          {transactionStatus === "idle" && "Purchase Badge"}
        </span>
      </div>
    </SimpleButton>
  )}
</div>

        {/* Wallet status */}
        {isConnectedToWallet && (
          <div
            className="mt-4 p-3 rounded-lg"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle
                className="w-4 h-4"
                style={{ color: "var(--brand-secondary)" }}
              />
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Wallet connected and ready
              </span>
            </div>
          </div>
        )}
      </div>
    </AnimatedCard>
  );
};
