import { BigNumberish, BytesLike } from "ethers";

export type NftMetadataStruct = {
	name: string | undefined;
	symbol: string | undefined;
};

export type InstanceInfoStruct = {
	payingToken: string | undefined;
	feeNumerator: BigNumberish | undefined;
	transferable: boolean | undefined;
	maxTotalSupply: BigNumberish | undefined;
	mintPrice: BigNumberish | undefined;
	whitelistMintPrice: BigNumberish | undefined;
	collectionExpire: BigNumberish | undefined;
	metadata: NftMetadataStruct;
	contractURI: string | undefined;
	signature: BytesLike | undefined;
};

export type NftParametersStruct = {
	transferValidator: string | undefined;
	factory: string | undefined;
	creator: string | undefined;
	feeReceiver: string | undefined;
	referralCode: BytesLike | undefined;
	info: InstanceInfoStruct;
};