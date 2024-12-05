mod nft {
    pub mod nft;
    pub mod interface;
}
mod receiver {
    pub mod receiver;
    pub mod interface;
}
mod nftfactory {
    pub mod nftfactory;
    pub mod interface;
}

mod snip12 {
    pub mod snip12;
    pub mod u256_hash;
    pub mod produce_hash;
    pub mod static_price_hash;
    pub mod dynamic_price_hash;
    pub mod interfaces;
}

mod utils;

#[cfg(test)]
mod tests;