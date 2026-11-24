// Deploys Voting.sol and exports { address, chainId, abi } for the frontend and backend.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners(); // Hardhat account #0 = contract owner (admin)
  console.log("Deploying with owner/admin account:", deployer.address);

  const voting = await hre.ethers.deployContract("Voting", [deployer.address]);
  await voting.waitForDeployment();
  const address = await voting.getAddress();
  const { chainId } = await hre.ethers.provider.getNetwork();
  console.log("Voting deployed to:", address, "(chainId", chainId.toString() + ")");

  const artifact = await hre.artifacts.readArtifact("Voting");
  const output = JSON.stringify(
    { address, chainId: Number(chainId), owner: deployer.address, abi: artifact.abi },
    null,
    2
  );

  // Same file is copied to both consumers. Folders are created if missing.
  // Local record used by seed-demo.js (not committed)
  fs.mkdirSync(path.join(__dirname, "..", "deployments"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "..", "deployments", "localhost.json"), output);

  const targets = [
    path.join(__dirname, "..", "..", "frontend", "src", "contracts"),
    path.join(__dirname, "..", "..", "backend", "src", "contracts"),
  ];
  for (const dir of targets) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "Voting.json"), output);
    console.log("Wrote ABI + address to", dir);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
