require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // Started with: npx hardhat node  (chain id 31337, RPC http://127.0.0.1:8545)
    localhost: { url: process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545" },
  },
};
