import { verifyContract } from "../helpers/verify";
import { checkAddress, checkBytesLike, checkNumber, checkString } from "../helpers/checkers";
import { InstanceInfoStruct, NftMetadataStruct, NftParametersStruct } from "../helpers/structs";
import { ethers } from "hardhat";

const Platform_address = process.env.PLATFORM_ADDRESS;
const NFTFactory_Address = process.env.NFT_FACTORY_ADDRESS;

const NFT_address = process.env.NFT_ADDRESS;
const NFTcreator_address = process.env.NFT_CREATOR_ADDRESS;
const Receiver_address = process.env.RECEIVER_ADDRESS;

const nft_metadata: NftMetadataStruct = {
	name: process.env.NFT_NAME,
	symbol: process.env.NFT_SYMBOL,
}
const info: InstanceInfoStruct = {
	metadata: nft_metadata,
	payingToken: process.env.PAYING_TOKEN_ADDRESS,
	feeNumerator: process.env.FEE_NUMERATOR,
	transferable: process.env.TRANSFERRABLE?.toLowerCase() === 'true' ? true : false,
	maxTotalSupply: process.env.MAX_TOTAL_SUPPLY,
	mintPrice: process.env.MINT_PRICE,
	whitelistMintPrice: process.env.WHITELIST_MINT_PRICE,
	collectionExpire: process.env.COLLECTION_EXPIRE,
	contractURI: process.env.CONTRACT_URI,
	signature: process.env.SIGNATURE
}

const referral_code = process.env.REFERRAL_CODE;

async function verify() {
	console.log("Verification: ");

	const NFTFactory = ethers.getContractAt('NFTFactoryV2', NFTFactory_Address!);

	checkAddress(NFTFactory_Address);
	checkAddress(NFT_address);
	checkAddress(NFTcreator_address);
	checkAddress(Receiver_address);

	checkString(nft_metadata.name);
	checkString(nft_metadata.symbol);
	checkAddress(info.payingToken);
	checkNumber(info.feeNumerator);
	checkNumber(info.maxTotalSupply);
	checkNumber(info.mintPrice);
	checkNumber(info.whitelistMintPrice);
	checkNumber(info.collectionExpire);
	checkString(info.contractURI);
	checkString(info.signature as string);
	checkBytesLike(info.signature);

	const params: NftParametersStruct = {
		transferValidator: ((await (await NFTFactory).nftFactoryParameters()).transferValidator),
		factory: NFTFactory_Address,
		creator: NFTcreator_address,
		feeReceiver: Receiver_address,
		referralCode: process.env.REFERRAL_CODE,
		info,
	}

	console.log(params);
	try {
		await verifyContract(NFT_address!, [params]);
		console.log("NFT verification successful.");
	} catch (error) {
		console.error("NFT verification failed:", error);
	}

	let referral_address: string = ethers.constants.AddressZero;
	if (referral_code !== undefined && referral_code.length > 0) {
		referral_address = await (await NFTFactory).getReferralCreator(referral_code);
	}

	try {
		await verifyContract(Receiver_address!, [referral_code, [NFTcreator_address, Platform_address, referral_address]]);
		console.log("Receiver verification successful.");
	} catch (error) {
		console.error("Receiververification failed:", error);
	}

	console.log("Done.");
}

verify();
