const { HDNodeWallet } = require("ethers");
const phrase = "test test test test test test test test test test test junk";
const wallet = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/60'/0'/0/1");
console.log("Address:", wallet.address);
console.log("Private key:", wallet.privateKey);
