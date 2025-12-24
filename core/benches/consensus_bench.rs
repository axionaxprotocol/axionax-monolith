//! Consensus Benchmarks
//!
//! Benchmarks for PoPC consensus operations

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use consensus::{ConsensusConfig, ConsensusEngine};

fn benchmark_generate_challenge(c: &mut Criterion) {
    let engine = ConsensusEngine::new(ConsensusConfig::default());
    let vrf_seed = [42u8; 32];

    c.bench_function("generate_challenge_1000", |b| {
        b.iter(|| {
            black_box(engine.generate_challenge(
                "job-benchmark-001".to_string(),
                10_000,
                vrf_seed,
            ));
        });
    });
}

fn benchmark_generate_challenge_large(c: &mut Criterion) {
    let engine = ConsensusEngine::new(ConsensusConfig::default());
    let vrf_seed = [42u8; 32];

    c.bench_function("generate_challenge_large_output", |b| {
        b.iter(|| {
            black_box(engine.generate_challenge(
                "job-benchmark-large".to_string(),
                1_000_000, // 1M output size
                vrf_seed,
            ));
        });
    });
}

fn benchmark_fraud_detection_probability(c: &mut Criterion) {
    c.bench_function("fraud_detection_probability", |b| {
        b.iter(|| {
            // Calculate detection probability for 1% fraud rate with 1000 samples
            black_box(ConsensusEngine::fraud_detection_probability(0.01, 1000));
        });
    });
}

fn benchmark_verify_proof(c: &mut Criterion) {
    let engine = ConsensusEngine::new(ConsensusConfig::default());
    let vrf_seed = [42u8; 32];
    let challenge = engine.generate_challenge("job-verify".to_string(), 10_000, vrf_seed);
    
    // Create mock proof data (32 bytes per sample)
    let proof_data: Vec<u8> = vec![0u8; challenge.sample_size * 32];

    c.bench_function("verify_proof", |b| {
        b.iter(|| {
            black_box(engine.verify_proof(&challenge, &proof_data));
        });
    });
}

criterion_group!(
    benches,
    benchmark_generate_challenge,
    benchmark_generate_challenge_large,
    benchmark_fraud_detection_probability,
    benchmark_verify_proof
);
criterion_main!(benches);
