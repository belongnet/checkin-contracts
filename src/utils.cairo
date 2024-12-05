use starknet::{ContractAddress, contract_address_const, class_hash::class_hash_const, ClassHash};

pub fn NAME() -> ByteArray {
    "NAME"
}

pub fn SYMBOL() -> ByteArray {
    "SYMBOL"
}

pub fn BASE_URI() -> ByteArray {
    "https://api.example.com/v1/"
}

pub fn ZERO_ADDRESS() -> ContractAddress {
    contract_address_const::<0>()
}

pub fn OWNER() -> ContractAddress {
    contract_address_const::<'OWNER'>()
}

pub fn PLATFORM() -> ContractAddress {
    contract_address_const::<'PLATFORM'>()
}

pub fn CREATOR() -> ContractAddress {
    contract_address_const::<'CREATOR'>()
}

pub fn SIGNER() -> ContractAddress {
    contract_address_const::<'SIGNER'>()
}

pub fn FACTORY() -> ContractAddress {
    contract_address_const::<'FACTORY'>()
}

pub fn NFT() -> ContractAddress {
    contract_address_const::<'NFT'>()
}

pub fn RECEIVER() -> ContractAddress {
    contract_address_const::<'RECEIVER'>()
}

pub fn CURRENCY() -> ContractAddress {
    contract_address_const::<'CURRENCY'>()
}

pub fn NFT_CLASS_HASH() -> ClassHash {
    class_hash_const::<'NFT_CLASS_HASH'>()
}

pub fn RECEIVER_CLASS_HASH() -> ClassHash {
    class_hash_const::<'RECEIVER_CLASS_HASH'>()
}

pub fn FRACTION() -> u128 {
    600
}