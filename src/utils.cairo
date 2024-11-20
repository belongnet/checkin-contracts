use starknet::{ContractAddress, contract_address_const};

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

pub fn CREATOR() -> ContractAddress {
    contract_address_const::<'CREATOR'>()
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

pub fn FRACTION() -> u128 {
    600
}