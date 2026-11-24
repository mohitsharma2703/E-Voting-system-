# E-Voting System - Secure and Transparent Blockchain-Based Voting System (academic prototype)

NOT production-ready and NOT suitable for real public or government elections.

## Status
| Part | State |
|---|---|
| blockchain/ (Hardhat, Voting.sol, 28 tests, deploy + seed scripts) | Done and tested |
| frontend/ (React + Vite + Tailwind + ethers.js + MetaMask): landing, elections, vote flow, tx status, results chart, verify-transaction, admin dashboard | Done (Phase 6) |
| backend/ (Express + MongoDB, JWT, bcrypt, roles, voter verification, candidate applications, on-chain admin actions) | Written (Phase 7), see backend/README.md. Not yet run on a real machine |
| Frontend login/registration pages, voter profile, candidate dashboard, admin verification screens | NOT built yet (Phase 8): the API exists, the screens do not |

Until the backend exists, the admin is "whoever holds the contract owner wallet" and voters are "wallets the admin authorized". Passwords and logins arrive in Phase 7.

## Run everything (Windows PowerShell, Node.js 20 LTS)
Window 1 - local blockchain (keep open):
```powershell
cd evoting-blockchain\blockchain
npm install
npx hardhat test
npx hardhat node
```
Window 2 - deploy and load demo data:
```powershell
cd evoting-blockchain\blockchain
npm run deploy:local
npm run seed:local
```
Window 3 - website:
```powershell
cd evoting-blockchain\frontend
npm install
npm run dev
```
Open http://localhost:5173

The local chain forgets everything when `hardhat node` stops. After every restart: run `deploy:local` then `seed:local` again, and in MetaMask use Settings > Advanced > Clear activity tab data for each account.

## MetaMask setup
1. Add network: name `Hardhat Local`, RPC `http://127.0.0.1:8545`, chain ID `31337`, symbol `ETH` (the site's "Switch network" button can also add it).
2. `npx hardhat node` prints 20 public TEST accounts with private keys. Import them in MetaMask via Import account. Use test keys on the local chain only, never with real funds.
3. Account #0 = admin (contract owner). Accounts #1 to #5 = voters, already authorized in the demo elections.

## Demo data created by `seed:local`
- Election 1 "Class Representative 2025": ended, 4 votes, so the Results page has a chart.
- Election 2 "Student Council 2026": active, voters #1-#5 can vote now.
- Election 3 "Sports Committee 2026": upcoming.

## Suggested 25 November demo flow
1. Landing page, then explain the limitations panel.
2. Elections list, then Results of election 1.
3. Connect MetaMask as account #1, vote in election 2, show the pending to confirmed status and the hash.
4. Try voting again to show the duplicate-vote rejection.
5. Click Verify on chain: show block hash and previous block hash (tamper-evidence).
6. Switch to account #0, open Admin: create an election, add and approve a candidate, authorize a wallet.

## Known limitations (say these in the viva)
- Wallet-based duplicate prevention is not real-world identity verification (one person can own many wallets).
- Votes are pseudonymous, not secret: the VoteCast event links a wallet to a candidate. Not coercion-resistant.
- The contract hides vote counts until the election ends through its view functions only; raw chain data is still readable by anyone.
- Candidate notes are short on-chain text. Rich profiles and manifestos move off-chain (MongoDB) in Phase 7.
- Future work: zero-knowledge proofs, blind signatures, receipt-free voting, KYC-linked wallet issuance.
