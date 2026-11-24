const { HDNodeWallet } = require("ethers");

const phrase = "test test test test test test test test test test test junk";
const path = "m/44'/60'/0'/0/0";

const wallet = HDNodeWallet.fromPhrase(phrase, undefined, path);

console.log("Wallet address:", wallet.address);
console.log("Private key:", wallet.privateKey);
