
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { shortAddr } from "../lib/format";

export default function Navbar() {
  const {
    account,
    connect,
    onRightChain,
    switchChain,
    isAdmin,
  } = useWallet();

  const [open, setOpen] = useState(false);

  const link = ({ isActive }) =>
    `block rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
      isActive
        ? "bg-purple-100 text-purple-800"
        : "text-slate-600 hover:bg-purple-50 hover:text-purple-800"
    }`;

  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">

        {/* Logo */}
        <Link
          to="/"
          onClick={closeMenu}
          className="shrink-0 text-xl font-extrabold tracking-tight text-[#392584] sm:text-2xl"
        >
          E-Voting <span className="text-slate-800">System</span>
        </Link>

        {/* Mobile menu button */}
        <button
          type="button"
          className="rounded-xl border border-rule px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-purple-50 sm:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle navigation menu"
        >
          {open ? "Close ✕" : "☰ Menu"}
        </button>

        {/* Navigation */}
        <nav
          className={`${
            open ? "flex" : "hidden"
          } order-3 w-full flex-col gap-2 border-t border-rule pt-3 sm:order-none sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-1 sm:border-0 sm:pt-0`}
        >
          <NavLink to="/elections" className={link} onClick={closeMenu}>
            Elections
          </NavLink>

          <NavLink to="/verify" className={link} onClick={closeMenu}>
            Verify a transaction
          </NavLink>

          {isAdmin && (
            <NavLink to="/admin" className={link} onClick={closeMenu}>
              Admin Dashboard
            </NavLink>
          )}

          {/* Wallet */}
          <div className="pt-2 sm:ml-2 sm:pt-0">
            {!account ? (
              <button
                type="button"
                className="btn btn-primary w-full whitespace-nowrap sm:w-auto"
                onClick={() => {
                  connect();
                  closeMenu();
                }}
              >
                Connect Wallet
              </button>
            ) : !onRightChain ? (
              <button
                type="button"
                className="btn btn-danger w-full whitespace-nowrap sm:w-auto"
                onClick={() => {
                  switchChain();
                  closeMenu();
                }}
              >
                Switch Network
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 sm:justify-start">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />

                <span className="font-mono text-xs font-semibold text-slate-700">
                  {shortAddr(account)}
                </span>

                {isAdmin && (
                  <span className="rounded-full bg-purple-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-purple-900">
                    Admin
                  </span>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
