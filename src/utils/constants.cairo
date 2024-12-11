use starknet::{
    ContractAddress, ClassHash, contract_address_const, class_hash::class_hash_const
};

pub type EthPublicKey = starknet::secp256k1::Secp256k1Point;

pub fn NAME() -> ByteArray {
    "NAME"
}

pub fn NAME_2() -> ByteArray {
    "NAME_2"
}

pub fn NAME_3() -> ByteArray {
    "NAME_3"
}

pub fn SYMBOL() -> ByteArray {
    "SYMBOL"
}

pub fn SYMBOL_2() -> ByteArray {
    "SYMBOL_2"
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

pub fn RECEIVER() -> ContractAddress {
    contract_address_const::<'RECEIVER'>()
}

pub fn REFERRAL() -> ContractAddress {
    contract_address_const::<'REFERRAL'>()
}

pub fn FACTORY() -> ContractAddress {
    contract_address_const::<'FACTORY'>()
}

pub fn NFT() -> ContractAddress {
    contract_address_const::<'NFT'>()
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

pub fn CONTRACT_URI() -> ByteArray {
    "https://api.example.com/v1/"
}

pub fn FRACTION() -> u128 {
    600
}

pub fn MAX_TOTAL_SUPPLY() -> u256 {
    100
}

pub fn MINT_PRICE() -> u256 {
    100
}

pub fn WL_MINT_PRICE() -> u256 {
    50
}

pub fn EXPIRES() -> u256 {
    10000000000000
}

pub fn REFERRAL_CODE() -> felt252 {
    'REFERRAL CODE'
}

//
// Signing keys
//

pub mod stark {
    use crate::utils::signing::{
        StarkKeyPair, get_stark_keys_from
    };

    pub fn KEY_PAIR() -> StarkKeyPair {
        get_stark_keys_from('PRIVATE_KEY')
    }

    pub fn KEY_PAIR_2() -> StarkKeyPair {
        get_stark_keys_from('PRIVATE_KEY_2')
    }
}

pub mod secp256k1 {
    use crate::utils::signing::{
        Secp256k1KeyPair, get_secp256k1_keys_from
    };

    pub fn KEY_PAIR() -> Secp256k1KeyPair {
        let private_key = u256 { low: 'PRIVATE_LOW', high: 'PRIVATE_HIGH' };
        get_secp256k1_keys_from(private_key)
    }

    pub fn KEY_PAIR_2() -> Secp256k1KeyPair {
        let private_key = u256 { low: 'PRIVATE_LOW_2', high: 'PRIVATE_HIGH_2' };
        get_secp256k1_keys_from(private_key)
    }
}

pub mod secp256r1 {
    use crate::utils::signing::{
        Secp256r1KeyPair, get_secp256r1_keys_from
    };

    pub fn KEY_PAIR() -> Secp256r1KeyPair {
        let private_key = u256 { low: 'PRIVATE_LOW', high: 'PRIVATE_HIGH' };
        get_secp256r1_keys_from(private_key)
    }

    pub fn KEY_PAIR_2() -> Secp256r1KeyPair {
        let private_key = u256 { low: 'PRIVATE_LOW_2', high: 'PRIVATE_HIGH_2' };
        get_secp256r1_keys_from(private_key)
    }
}