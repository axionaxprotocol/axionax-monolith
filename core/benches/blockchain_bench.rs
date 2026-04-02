use blockchain::validation::BlockValidator;
use blockchain::{
    Block, Blockchain, BlockchainConfig, PoolConfig, Transaction, TransactionPool, ValidationConfig,
};
use criterion::{black_box, criterion_group, criterion_main, BatchSize, Criterion};

fn make_block(number: u64) -> Block {
    Block {
        number,
        hash: [number as u8; 32],
        parent_hash: [(number.saturating_sub(1)) as u8; 32],
        timestamp: 1700000000 + number,
        proposer: "validator-0".to_string(),
        transactions: vec![],
        state_root: [0u8; 32],
        gas_used: 0,
        gas_limit: 30_000_000,
    }
}

fn make_tx(nonce: u64) -> Transaction {
    Transaction {
        hash: [nonce as u8; 32],
        from: "0x1234567890123456789012345678901234567890".to_string(),
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd".to_string(),
        value: 1_000_000_000_000_000_000,
        gas_price: 1_000_000_000,
        gas_limit: 21_000,
        nonce,
        data: vec![],
        signature: vec![],
        signer_public_key: vec![],
    }
}

fn benchmark_block_validation(c: &mut Criterion) {
    let validator = BlockValidator::new(ValidationConfig::default());
    let parent = make_block(0);
    let block = make_block(1);

    c.bench_function("validate_block", |b| {
        b.iter(|| {
            let _ =
                black_box(validator.validate_block(black_box(&block), black_box(Some(&parent))));
        });
    });
}

fn benchmark_mempool_add(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();

    c.bench_function("mempool_add_transaction", |b| {
        b.iter_batched(
            || {
                let pool = TransactionPool::new(PoolConfig::default(), ValidationConfig::default());
                let tx = make_tx(0);
                (pool, tx)
            },
            |(pool, tx)| {
                rt.block_on(async { black_box(pool.add_transaction(tx).await.ok()) });
            },
            BatchSize::SmallInput,
        );
    });
}

fn benchmark_blockchain_add_block(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();

    c.bench_function("blockchain_add_block", |b| {
        b.iter_batched(
            || {
                let chain = Blockchain::new(BlockchainConfig::default());
                rt.block_on(async { chain.init_with_genesis().await.ok() });
                let block = make_block(1);
                (chain, block)
            },
            |(chain, block)| {
                rt.block_on(async { black_box(chain.add_block(block).await.ok()) });
            },
            BatchSize::SmallInput,
        );
    });
}

criterion_group!(
    benches,
    benchmark_block_validation,
    benchmark_mempool_add,
    benchmark_blockchain_add_block,
);
criterion_main!(benches);
