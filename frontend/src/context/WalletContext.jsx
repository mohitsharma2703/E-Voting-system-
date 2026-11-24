
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CHAIN_ID,
  getReadContract,
  hasWallet,
  switchToLocalChain,
} from "../lib/contract";

import { errorMessage } from "../lib/format";
import { useToast } from "../components/Toast";

const WalletContext = createContext(null);

export const useWallet = () => useContext(WalletContext);

export function WalletProvider({ children }) {
  const toast = useToast();

  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [owner, setOwner] = useState(null);

  // Read the smart contract owner.
  useEffect(() => {
    let active = true;

    async function loadOwner() {
      try {
        const contract = getReadContract();
        const address = await contract.owner();

        if (active) setOwner(address);
      } catch (error) {
        console.error("Unable to read contract owner:", error);
        if (active) setOwner(null);
      }
    }

    loadOwner();

    return () => {
      active = false;
    };
  }, []);

  // Restore wallet and listen for MetaMask changes.
  useEffect(() => {
    if (!hasWallet()) return;

    const eth = window.ethereum;
    let active = true;

    const handleAccountsChanged = (accounts) => {
      if (active) {
        setAccount(accounts?.[0] ?? null);
      }
    };

    const handleChainChanged = (chain) => {
      if (active) {
        setChainId(parseInt(chain, 16));
      }
    };

    const handleDisconnect = () => {
      if (active) {
        setAccount(null);
        setChainId(null);
      }
    };

    // Register listeners before restoring wallet state.
    eth.on("accountsChanged", handleAccountsChanged);
    eth.on("chainChanged", handleChainChanged);
    eth.on("disconnect", handleDisconnect);

    async function restoreWallet() {
      try {
        const [accounts, chain] = await Promise.all([
          eth.request({ method: "eth_accounts" }),
          eth.request({ method: "eth_chainId" }),
        ]);

        if (!active) return;

        setAccount(accounts?.[0] ?? null);
        setChainId(parseInt(chain, 16));
      } catch (error) {
        console.error("Wallet restoration failed:", error);
      }
    }

    restoreWallet();

    return () => {
      active = false;
      eth.removeListener("accountsChanged", handleAccountsChanged);
      eth.removeListener("chainChanged", handleChainChanged);
      eth.removeListener("disconnect", handleDisconnect);
    };
  }, []);

  // Connect wallet.
  const connect = useCallback(async () => {
    if (!hasWallet()) {
      toast.error("MetaMask is not installed. Please install it and reload.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setAccount(accounts?.[0] ?? null);

      const chain = await window.ethereum.request({
        method: "eth_chainId",
      });

      setChainId(parseInt(chain, 16));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, [toast]);

  // Switch to local Hardhat network.
  const switchChain = useCallback(async () => {
    try {
      await switchToLocalChain();

      const chain = await window.ethereum.request({
        method: "eth_chainId",
      });

      setChainId(parseInt(chain, 16));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, [toast]);

  const isAdmin = Boolean(
    account &&
    owner &&
    account.toLowerCase() === owner.toLowerCase()
  );

  const value = useMemo(
    () => ({
      account,
      chainId,
      owner,
      connect,
      switchChain,
      onRightChain: chainId === CHAIN_ID,
      isAdmin,
    }),
    [account, chainId, owner, connect, switchChain, isAdmin]
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
