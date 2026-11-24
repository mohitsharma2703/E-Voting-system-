# E-Voting System - Backend API
Secure and Transparent Blockchain-Based Voting System

Express + MongoDB + JWT + ethers.js. It holds what must NOT be on a public chain (passwords, identity,
manifestos) and performs admin actions on the smart contract.

## Setup (Windows PowerShell, Node.js 20 LTS, MongoDB running locally)
```powershell
cd evoting-blockchain\backend
npm install
copy .env.example .env
# open .env and set JWT_SECRET (generate one):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run seed      # demo accounts
npm run dev       # http://localhost:4000
```
The blockchain must be running first (`npx hardhat node`, `deploy:local`, `seed:local`), because deploy writes
the contract address into `src/contracts/Voting.json`. Re-run deploy and restart the backend after every
Hardhat restart.

## Demo accounts (from `npm run seed`)
| Role | Email | Password |
|---|---|---|
| admin | admin@evoting.local | Admin@12345 |
| candidate (verified) | candidate@evoting.local | Candidate@12345 |
| voter (not verified) | pending@evoting.local | Voter@12345 |
| voters 1-5 (verified, wallets = Hardhat #1-#5) | voter1@evoting.local ... voter5@evoting.local | Voter@12345 |

## API
All bodies are JSON. Protected routes need `Authorization: Bearer <token>`.

| Method and path | Who | What |
|---|---|---|
| GET /api/health | public | liveness |
| POST /api/auth/register | public | create voter or candidate (`name,email,password,role,studentId,walletAddress`) |
| POST /api/auth/login | public | returns `{token,user}` |
| GET /api/auth/me | any | current user |
| PATCH /api/auth/me | any | update `name`, `walletAddress` |
| POST /api/auth/change-password | any | `currentPassword,newPassword` |
| POST /api/candidate/applications | candidate | `{electionId, manifesto}` (verified, election Upcoming) |
| GET /api/candidate/applications/mine | candidate | own applications |
| PATCH /api/candidate/applications/:id | candidate | edit pending manifesto |
| GET /api/admin/stats | admin | counts |
| GET /api/admin/users?role=&status= | admin | list users |
| PATCH /api/admin/users/:id/verification | admin | `{status: verified/rejected/pending}` |
| POST /api/admin/users/:id/authorize | admin | `{electionId}`: authorizeVoter on chain |
| POST /api/admin/elections/:id/authorize-verified | admin | authorize all verified voters (batched) |
| GET /api/admin/applications?status= | admin | candidate applications |
| POST /api/admin/applications/:id/approve | admin | addCandidate + approveCandidate on chain |
| POST /api/admin/applications/:id/reject | admin | reject (also on chain if registered) |
| GET /api/admin/audit-logs | admin | activity log |
| GET /api/chain/status | public | chain id, block, owner, signer |
| GET /api/chain/tx/:hash | public | verify a transaction and decode its events |
| GET /api/chain/elections/:id/candidate-profiles | public | approved candidates + manifestos |
| GET /api/chain/elections/:id/eligibility | logged in | can my wallet vote, and if not, why |

## How it fits together
- Admin verifies a voter (off-chain identity), then authorizes the voter's wallet (on-chain).
- The voter still casts the vote directly from MetaMask. The backend never holds voter keys and never votes.
- The backend signs admin transactions with `ADMIN_PRIVATE_KEY` (Hardhat account #0, the contract owner).

## Security notes (say these in the viva)
- Passwords hashed with bcrypt (cost 12); JWT expires in 2h; roles checked on the server from the database.
- Login and registration are rate-limited; request size limited; helmet and CORS enabled.
- Login errors do not reveal whether an email exists.
- Public sign-up can never create an admin.
- Limitation: the server holds the contract owner key. Fine for a local demo with a public test key. In
  production use a hardware wallet or multisig, never a key in `.env`.
- Limitation: tokens are not revocable before expiry (no refresh/blacklist).
