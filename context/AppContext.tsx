"use client";

import React, { createContext, useContext, useState } from "react";
import { ethers } from "ethers";
import EthereumProvider from "@walletconnect/ethereum-provider";
import { proofAnchorAbi } from "@/lib/proofAnchorAbi";

declare global {
    interface Window {
        ethereum?: any;
    }
}

const PROOF_ANCHOR_ADDRESS = ethers.getAddress("0x89e273A602B7853C76f092306F74D439e6a0044D".toLowerCase());

/* =======================
   Flare Coston2 Network
======================= */

const COSTON2_CHAIN_ID = 114;
const COSTON2_CHAIN_ID_HEX = "0x72";

const COSTON2_PARAMS = {
    chainId: COSTON2_CHAIN_ID_HEX,
    chainName: "Flare Coston2",
    rpcUrls: ["https://coston2-api.flare.network/ext/bc/C/rpc"],
    nativeCurrency: {
        name: "Coston2 Flare",
        symbol: "C2FLR",
        decimals: 18,
    },
    blockExplorerUrls: ["https://coston2-explorer.flare.network"],
};

/* =======================
   Types
======================= */

type AppContextType = {
    provider: ethers.BrowserProvider | null;
    signer: ethers.Signer | null;
    address: string | null;
    isConnected: boolean;
    connecting: boolean;
    hydrating: boolean;
    connectWallet: () => Promise<void>;
    sendFLR: (to: string, amount: string) => Promise<string>;
    anchorProof: (
        batchId: string,
        paymentId: string,
        proofReference: string
    ) => Promise<string>;
};

/* =======================
   Context
======================= */

const AppContext = createContext<AppContextType | undefined>(undefined);

/* =======================
   Provider
======================= */

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [provider, setProvider] =
        useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [wcProvider, setWcProvider] = useState<any>(null);
    const [connecting, setConnecting] = useState<boolean>(false);
    const [hydrating, setHydrating] = useState<boolean>(true);

    const isConnected = !!address;

    /* =======================
       Persistence & Listeners
    ======================= */
    React.useEffect(() => {
        const checkConnection = async () => {
            if (typeof window !== "undefined" && window.ethereum) {
                try {
                    const accounts = await window.ethereum.request({ method: "eth_accounts" });
                    if (accounts.length > 0) {
                        const provider = new ethers.BrowserProvider(window.ethereum);
                        const signer = await provider.getSigner();
                        const address = await signer.getAddress();

                        setProvider(provider);
                        setSigner(signer);
                        setAddress(address);
                    }
                } catch (err) {
                    console.error("Auto-connect error:", err);
                } finally {
                    setHydrating(false);
                }
            } else {
                setHydrating(false);
            }
        };

        checkConnection();

        // Listen for changes
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", (accounts: string[]) => {
                if (accounts.length > 0) {
                    setAddress(accounts[0]);
                } else {
                    setAddress(null);
                    setSigner(null);
                }
            });
            window.ethereum.on("chainChanged", () => {
                window.location.reload();
            });
        }
    }, []);

    /* =======================
       WalletConnect Init
    ======================= */

    const connectWallet = async () => {
        if (typeof window !== "undefined" && window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);

            await ensureCoston2Network(window.ethereum);

            const signer = await provider.getSigner();
            const address = await signer.getAddress();

            setProvider(provider);
            setSigner(signer);
            setAddress(address);

            return;
        }
        const wc = await EthereumProvider.init({
            projectId: "e903246864c7ab234cebfda736cae714",
            chains: [COSTON2_CHAIN_ID],
            optionalChains: [COSTON2_CHAIN_ID],
            showQrModal: true,
            methods: ["eth_sendTransaction", "eth_sign", "eth_signTypedData"],
            events: ["chainChanged", "accountsChanged"],
        });

        await wc.enable();

        const ethersProvider = new ethers.BrowserProvider(wc);
        const signer = await ethersProvider.getSigner();
        const address = await signer.getAddress();

        setWcProvider(wc);
        setProvider(ethersProvider);
        setSigner(signer);
        setAddress(address);

        await ensureCoston2Network(wc);
    };

    /* =======================
       Ensure Coston2 Network
    ======================= */

    const ensureCoston2Network = async (wc: any) => {
        try {
            await wc.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: COSTON2_CHAIN_ID_HEX }],
            });
        } catch (error: any) {
            if (error.code === 4902) {
                await wc.request({
                    method: "wallet_addEthereumChain",
                    params: [COSTON2_PARAMS],
                });
            } else {
                throw error;
            }
        }
    };

    /* =======================
       FLR Payout (Native)
    ======================= */

    const sendFLR = async (to: string, amount: string): Promise<string> => {
        if (!signer) throw new Error("Wallet not connected");

        const parsedAmount = ethers.parseEther(amount);

        const tx = await signer.sendTransaction({
            to,
            value: parsedAmount
        });

        await tx.wait();
        return tx.hash;
    };

    /* =======================
       Proof Anchoring
    ======================= */

    const anchorProof = async (
        batchId: string,
        paymentId: string,
        proofReference: string
    ): Promise<string> => {
        if (!signer) throw new Error("Wallet not connected");

        const contract = new ethers.Contract(
            PROOF_ANCHOR_ADDRESS,
            proofAnchorAbi,
            signer
        );

        if (!batchId || !paymentId || !proofReference) {
            console.error("Missing anchoring params:", { batchId, paymentId, proofReference });
            throw new Error("Cannot anchor proof: missing required identifiers");
        }

        const tx = await contract.anchorProof(
            batchId,
            paymentId,
            proofReference
        );

        await tx.wait();

        return tx.hash;
    };

    return (
        <AppContext.Provider
            value={{
                provider,
                signer,
                address,
                isConnected,
                connecting,
                hydrating,
                connectWallet,
                sendFLR,
                anchorProof,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

/* =======================
   Hook
======================= */

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useApp must be used inside AppProvider");
    return ctx;
}
