import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((kind, text) => {
    const id = crypto.randomUUID();
    setItems((l) => [...l, { id, kind, text }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 6000);
  }, []);
  const api = useMemo(() => ({ success: (t) => push("ok", t), error: (t) => push("bad", t), info: (t) => push("info", t) }), [push]);
  const tone = { ok: "border-ok bg-ok-soft text-ok", bad: "border-bad bg-bad-soft text-bad", info: "border-indelible bg-indelible-soft text-indelible" };
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`rounded-md border-l-4 px-4 py-3 text-sm font-medium shadow-lg ${tone[t.kind]}`}>{t.text}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
