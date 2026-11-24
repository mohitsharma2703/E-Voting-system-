const { HDNodeWallet } = require("ethers");

const phrase = "test test test test test test test test test test test junk";
const path = "m/44'/60'/0'/0/0";

const wallet = HDNodeWallet.fromPhrase(phrase, undefined, path);

console.log("Address:", wallet.address);
console.log("Key length:", wallet.privateKey.length);
console.log("Valid format:", /^0x[0-9a-fA-F]{64}$/.test(wallet.privateKey));
