//! Genesis Export — prints the canonical mainnet genesis JSON to stdout.
//!
//! Usage:
//!   cargo run -p genesis --bin genesis-export
//!   cargo run -p genesis --bin genesis-export > core/tools/genesis_canonical.json
//!
//! The output is derived entirely from the constants in genesis/src/lib.rs,
//! so genesis.json is always reproducible from the source code.

use genesis::GenesisGenerator;

fn main() {
    let genesis = GenesisGenerator::mainnet();
    let json = GenesisGenerator::export_json(&genesis);
    println!("{}", json);
}
