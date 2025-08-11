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
import BadgeImage from  "../../assets/Badge.gif"; // Adjust the path as necessary
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
  const [solPrice, setSolPrice] = useState<number>(50);
  const [isConnectedToWallet, setIsConnectedToWallet] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const showNotification = (
    title: string,
    description: string,
    variant?: "destructive"
  ) => {
    console.log(`${title}: ${description}`);
  };

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
        setSolPrice(50);
      }
    };

    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkWalletConnection = () => {
      if (typeof window !== "undefined" && "solana" in window) {
        const solanaWallet = (window as any).solana;
        setIsConnectedToWallet(solanaWallet?.isConnected || false);
      }
    };

    checkWalletConnection();

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
      const solanaWallet = (window as any).solana;
      if (!solanaWallet) {
        throw new Error("Wallet not available");
      }

      const response = await fetch(
        "https://staging.printsup.org/api/badge-purchases",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            walletAddress: solanaWallet.publicKey?.toString() || "mock_address",
            transactionHash: signature,
            amountSol: BADGE_PRICE_SOL,
            amountUsd: BADGE_PRICE_SOL * solPrice,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create badge purchase record");
      }

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

  const usdPrice = BADGE_PRICE_SOL * solPrice;
  console.log("user",user)

  if (user.hasBadgeOfHonor) {
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
        <div className="flex flex-col items-center justify-center text-center">
          <img
            src={BadgeImage} 
            alt="Badge of Honor" 
            className="w-32 h-32 mb-4"
          />
          <h3 className="text-xl font-bold mb-2" style={{ color: "var(--reward-gold)" }}>
            You Own the Badge of Honor!
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Thank you for supporting our community. Enjoy your premium benefits!
          </p>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Active Badge Holder
            </span>
          </div>
        </div>
      </AnimatedCard>
    );
  }

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

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div
              className="text-2xl font-bold mb-1 truncate"
              style={{ color: "var(--reward-gold)" }}
            >
              {BADGE_PRICE_SOL} SOL
            </div>
            <div
              className="text-sm truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
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
                transactionStatus === "success" &&
                  "!bg-green-500 hover:!bg-green-600",
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
                {transactionStatus === "idle" && <Award className="w-5 h-5" />}

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