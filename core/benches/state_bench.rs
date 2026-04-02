//! State Database Benchmarks
//!
//! Benchmarks for RocksDB state storage operations

use blockchain::{Block, Transaction};
use criterion::{black_box, criterion_group, criterion_main, BatchSize, Criterion};
use state::StateDB;
use tempfile::TempDir;

fn create_test_block(number: u64) -> Block {
    let mut hash = [0u8; 32];
    hash[0..8].copy_from_slice(&number.to_le_bytes());

    Block {
        number,
        hash,
        parent_hash: [0u8; 32],
        timestamp: 1700000000 + number,
        proposer: format!("validator-{}", number % 10),
        transactions: vec![],
        state_root: [0u8; 32],
        gas_used: 0,
        gas_limit: 30_000_000,
    }
}

fn create_test_tx(id: u8) -> Transaction {
    let mut hash = [0u8; 32];
    hash[0] = id;

    Transaction {
        hash,
        from: "0x1234567890123456789012345678901234567890".to_string(),
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd".to_string(),
        value: 1000,
        gas_price: 20_000_000_000,
        gas_limit: 21_000,
        nonce: id as u64,
        data: vec![],
        signature: vec![],
        signer_public_key: vec![],
    }
}

fn benchmark_store_block(c: &mut Criterion) {
    c.bench_function("store_block", |b| {
        b.iter_batched(
            || {
                let temp_dir = TempDir::new().unwrap();
                let db = StateDB::open(temp_dir.path()).unwrap();
                let block = create_test_block(1);
                (temp_dir, db, block)
            },
            |(_temp_dir, db, block)| {
                db.store_block(&block).unwrap();
                black_box(());
            },
            BatchSize::SmallInput,
        );
    });
}

fn benchmark_get_block_by_number(c: &mut Criterion) {
    let temp_dir = TempDir::new().unwrap();
    let db = StateDB::open(temp_dir.path()).unwrap();

    // Pre-populate with blocks
    for i in 0..100 {
        db.store_block(&create_test_block(i)).unwrap();
    }

    c.bench_function("get_block_by_number", |b| {
        b.iter(|| {
            black_box(db.get_block_by_number(50).unwrap());
        });
    });
}

fn benchmark_store_transaction(c: &mut Criterion) {
    c.bench_function("store_transaction", |b| {
        b.iter_batched(
            || {
                let temp_dir = TempDir::new().unwrap();
                let db = StateDB::open(temp_dir.path()).unwrap();
                let tx = create_test_tx(1);
                let block_hash = [1u8; 32];
                (temp_dir, db, tx, block_hash)
            },
            |(_temp_dir, db, tx, block_hash)| {
                db.store_transaction(&tx, &block_hash).unwrap();
                black_box(());
            },
            BatchSize::SmallInput,
        );
    });
}

fn benchmark_get_transaction(c: &mut Criterion) {
    let temp_dir = TempDir::new().unwrap();
    let db = StateDB::open(temp_dir.path()).unwrap();

    // Pre-populate with transactions
    let block_hash = [1u8; 32];
    for i in 0..100 {
        db.store_transaction(&create_test_tx(i), &block_hash)
            .unwrap();
    }

    let tx_hash = {
        let mut h = [0u8; 32];
        h[0] = 50;
        h
    };

    c.bench_function("get_transaction", |b| {
        b.iter(|| {
            black_box(db.get_transaction(&tx_hash).unwrap());
        });
    });
}

fn benchmark_batch_store_blocks(c: &mut Criterion) {
    c.bench_function("batch_store_10_blocks", |b| {
        b.iter_batched(
            || {
                let temp_dir = TempDir::new().unwrap();
                let db = StateDB::open(temp_dir.path()).unwrap();
                let blocks: Vec<Block> = (0..10).map(create_test_block).collect();
                (temp_dir, db, blocks)
            },
            |(_temp_dir, db, blocks)| {
                for block in blocks {
                    db.store_block(&block).unwrap();
                    black_box(());
                }
            },
            BatchSize::SmallInput,
        );
    });
}

criterion_group!(
    benches,
    benchmark_store_block,
    benchmark_get_block_by_number,
    benchmark_store_transaction,
    benchmark_get_transaction,
    benchmark_batch_store_blocks
);
criterion_main!(benches);
