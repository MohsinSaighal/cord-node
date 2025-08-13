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
import { SimpleButton } from "@/components/ui/SimpleButton";
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
import BadgeImage from "../../assets/Badge.gif";

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

  if (user.hasBadgeOfHonor) {
    return (
      <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
        <div className="flex flex-col items-center justify-center text-center">
          <img
            src={BadgeImage}
            alt="Badge of Honor"
            className="w-32 h-32 mb-4 rounded-full"
          />
          <h3 className="text-xl font-bold text-white mb-2">
            You Own the Badge of Honor!
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Thank you for supporting our community. Enjoy your premium benefits!
          </p>
          <div className="flex items-center space-x-2 bg-slate-700/30 px-4 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-slate-300">Active Badge Holder</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-lg text-white">Badge Of Honor</div>
            <div className="text-sm text-slate-400">
              Unlock premium benefits and stand out from the crowd.
            </div>
          </div>
        </div>
        <div className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm font-medium rounded-full border border-purple-500/30">
          Premium
        </div>
      </div>

      <div className="bg-slate-700/20 rounded-xl p-4 border border-slate-600/30 mb-6">
        <div className="space-y-4">
          <div className="text-lg font-semibold mb-3 text-white">Advantages</div>
          <div className="space-y-3">
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
              <div className="flex items-center space-x-3">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-slate-300">5% Mining Bonus</span>
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
              <div className="flex items-center space-x-3">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-slate-300">Priority Support</span>
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
              <div className="flex items-center space-x-3">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-slate-300">Exclusive Badge Display</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-2xl font-bold mb-1 text-white">{BADGE_PRICE_SOL} SOL</div>
          <div className="text-sm text-slate-400">≈ ${usdPrice.toFixed(2)} USD</div>
        </div>
        
        {!isConnectedToWallet ? (
          <WalletMultiButton className="!bg-gradient-to-r !from-cyan-500 !to-blue-600 hover:!from-cyan-600 hover:!to-blue-700 !text-white !font-semibold !rounded-xl" />
        ) : (
          <button
            onClick={handlePurchase}
            disabled={isPaying || transactionStatus === "processing"}
            className={cn(
              "px-6 py-2 font-semibold rounded-xl transition-all duration-300",
              transactionStatus === "success" && "!bg-emerald-500 hover:!bg-emerald-600",
              transactionStatus === "error" && "!bg-red-500 hover:!bg-red-600",
              transactionStatus === "idle" && "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
            )}
          >
            <div className="flex items-center justify-center space-x-2">
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
              <span>
                {transactionStatus === "processing" && "Processing..."}
                {transactionStatus === "success" && "Success!"}
                {transactionStatus === "error" && "Try Again"}
                {transactionStatus === "idle" && "Purchase Badge"}
              </span>
            </div>
          </button>
        )}
      </div>

      {isConnectedToWallet && (
        <div className="mt-4 p-3 rounded-lg bg-slate-700/30 border border-slate-600/50">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-300">
              Wallet connected and ready
            </span>
          </div>
        </div>
      )}
    </div>
  );
};