import { useCallback, useState } from "react";
import { useToast } from "../components/Toast";
import { errorMessage } from "./format";

// Runs one blockchain write and tracks its state for <TxStatus/>.
// send: async () => ethers TransactionResponse
export function useTx() {
  const toast = useToast();
  const [tx, setTx] = useState({ phase: "idle" });

  const run = useCallback(async (label, send, onSuccess) => {
    setTx({ phase: "wallet", label });
    let hash;
    try {
      const resp = await send();
      hash = resp.hash;
      setTx({ phase: "pending", label, hash });
      const receipt = await resp.wait(); // throws if the transaction reverts
      if (receipt.status !== 1) throw new Error("Transaction failed on chain.");
      setTx({ phase: "success", label, hash });
      toast.success(`${label}: confirmed.`);
      if (onSuccess) await onSuccess();
      return true;
    } catch (e) {
      const msg = errorMessage(e);
      setTx({ phase: "failed", label, hash, error: msg });
      toast.error(msg);
      return false;
    }
  }, [toast]);

  return { tx, run, reset: () => setTx({ phase: "idle" }) };
}
