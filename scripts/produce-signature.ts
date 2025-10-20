import { WeierstrassSignatureType, Account, RpcProvider } from 'starknet';
import dotenv from "dotenv";
import { ProduceHash, getTypedData, getTypedDataHash } from './produce-message';
import { sepolia_chainId } from './helpers/constants';
dotenv.config();

const provider = new RpcProvider({ nodeUrl: process.env.PROVIDER });
const account = new Account(provider, process.env.ADDRESS!, process.env.PK!);

console.log("myAccount.address ", account.address);
console.log("myAccount.signer.getPubKey ", await account.signer.getPubKey());

const produceHash: ProduceHash = {
	name_hash: "StarknetGE",
	symbol_hash: "starknet-belong-ge",
	contract_uri: "https://api.example.com/v1/",
	royalty_fraction: "600"
};

const msg = getTypedData(produceHash, sepolia_chainId);
const msgHash = getTypedDataHash(produceHash, sepolia_chainId, account.address);

console.log("getChainId ", await provider.getChainId());
console.log("msg ", JSON.stringify(msg, null, 2));
console.log("msgHash ", JSON.stringify(msgHash, null, 2));

const signature: WeierstrassSignatureType = (await account.signMessage(msg)) as WeierstrassSignatureType;

console.log("signature ", signature);