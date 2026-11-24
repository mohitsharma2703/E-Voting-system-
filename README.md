# 🗳️ E-Voting System
### Secure and Transparent Blockchain-Based Electronic Voting System

A decentralized electronic voting application built using **Blockchain Technology** to make the voting process more transparent, reliable and tamper-resistant.

## 📌 Project Overview

The E-Voting System is a web-based application that allows administrators to create and manage elections while enabling authorized voters to cast their votes through a blockchain-powered voting mechanism.

The project uses Ethereum smart contracts to record votes and maintain election data on a blockchain network.

## 🎯 Objectives

- Provide a digital platform for conducting elections.
- Improve transparency in the voting process.
- Restrict voting to authorized wallet addresses.
- Prevent a wallet from voting more than once in an election.
- Maintain verifiable election records using blockchain technology.
- Allow users to view election results.

## ✨ Key Features

- **Admin Dashboard:** Create and manage elections.
- **Candidate Management:** Add and manage election candidates.
- **Voter Authorization:** Authorize wallet addresses to participate in elections.
- **Blockchain Voting:** Cast votes through MetaMask transactions.
- **One Wallet, One Vote:** Prevent duplicate voting by the same wallet in an election.
- **Election Results:** Display candidate vote counts and election results.
- **Transaction Verification:** Inspect blockchain transaction details.
- **Wallet Integration:** Connect MetaMask to interact with smart contracts.

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Blockchain | Solidity, Ethereum |
| Development Environment | Hardhat |
| Blockchain Interaction | Ethers.js |
| Wallet | MetaMask |
| Database | MongoDB |
| Authentication | JWT |

## 🏗️ Project Architecture

The application consists of three major components:

1. **Frontend:** Provides the user interface for administrators and voters.
2. **Backend:** Handles API requests, database operations and supporting application services.
3. **Blockchain:** Executes smart contracts and records voting transactions.

## 📂 Project Structure

```text
E-Voting-System/
│
├── backend/
│   ├── src/
│   │   ├── contracts/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scripts/
│   │   └── services/
│   ├── package.json
│   └── .env.example
│
├── blockchain/
│   ├── contracts/
│   │   └── Voting.sol
│   ├── scripts/
│   ├── test/
│   ├── hardhat.config.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── contracts/
│   │   ├── lib/
│   │   └── pages/
│   └── package.json
│
├── .gitignore
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites

Install the following before running the application:

- Node.js and npm
- MetaMask browser extension
- MongoDB
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/mohitsharma2703/E-Voting-system-.git
cd E-Voting-system-
```

### 2. Install Blockchain Dependencies

```bash
cd blockchain
npm install
```

Configure the required environment variables using the provided `.env.example` file, if required by the project configuration.

### 3. Start the Local Blockchain

Open a terminal inside the `blockchain` directory:

```bash
npm run node
```

Keep this terminal running.

### 4. Deploy the Smart Contract

Open another terminal:

```bash
cd blockchain
npm run deploy:local
```

### 5. Seed Demo Elections

```bash
npm run seed:local
```

### 6. Start the Backend

Open another terminal:

```bash
cd backend
npm install
```

Configure the backend environment variables using `backend/.env.example`, then run:

```bash
npm run dev
```

### 7. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually:

```text
http://localhost:5173
```

## 🔄 How the System Works

1. The administrator connects their MetaMask wallet.
2. The administrator creates an election and manages candidates.
3. Eligible voter wallet addresses are authorized.
4. Voters connect their authorized wallets.
5. Voters select a candidate and confirm the transaction through MetaMask.
6. The smart contract records the vote and prevents repeat voting by the same wallet.
7. Election results can be retrieved and displayed.
8. Blockchain transactions can be inspected for verification.

## 🔐 Security Considerations

- Smart contract access controls restrict administrative operations.
- Authorized wallet checks restrict voting participation.
- Duplicate voting is prevented at the smart contract level.
- Blockchain transactions provide publicly verifiable records.
- Environment variables and private credentials should never be committed to GitHub.

**Note:** Wallet authorization alone does not establish a voter's real-world identity. A production deployment would require an additional student identity-verification process and an independent security audit.

## 🚀 Future Enhancements

- Student identity verification.
- Improved voter eligibility management.
- Enhanced election analytics and reporting.
- Deployment to a public Ethereum-compatible test network.
- Additional security and smart contract testing.
- Improved accessibility and user experience.

## 👨‍💻 Project Information

**Project Name:** E-Voting System

**Domain:** Blockchain Technology and Web Development

**Project Type:** Academic Major Project

**Repository:** [E-Voting System on GitHub](https://github.com/mohitsharma2703/E-Voting-system-)

---

*Developed as an academic project to explore blockchain-based electronic voting and transparent election management.*
