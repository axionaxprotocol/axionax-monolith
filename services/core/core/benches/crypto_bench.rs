use criterion::{black_box, criterion_group, criterion_main, Criterion};
use crypto::signature;

fn benchmark_keygen(c: &mut Criterion) {
    c.bench_function("ed25519_keygen", |b| {
        b.iter(|| {
            black_box(signature::generate_keypair());
        });
    });
}

fn benchmark_sign(c: &mut Criterion) {
    let signing_key = signature::generate_keypair();
    let message = b"Hello, Axionax!";

    c.bench_function("ed25519_sign", |b| {
        b.iter(|| {
            black_box(signature::sign(&signing_key, message));
        });
    });
}

fn benchmark_verify(c: &mut Criterion) {
    let signing_key = signature::generate_keypair();
    let verifying_key = signing_key.verifying_key();
    let message = b"Hello, Axionax!";
    let sig = signature::sign(&signing_key, message);

    c.bench_function("ed25519_verify", |b| {
        b.iter(|| {
            black_box(signature::verify(&verifying_key, message, &sig));
        });
    });
}

fn benchmark_sha3(c: &mut Criterion) {
    let data = b"benchmark data for hashing";

    c.bench_function("sha3_256", |b| {
        b.iter(|| {
            black_box(crypto::hash::sha3_256(black_box(data)));
        });
    });
}

fn benchmark_blake2s(c: &mut Criterion) {
    let data = b"benchmark data for hashing";

    c.bench_function("blake2s_256", |b| {
        b.iter(|| {
            black_box(crypto::hash::blake2s_256(black_box(data)));
        });
    });
}

criterion_group!(
    benches,
    benchmark_keygen,
    benchmark_sign,
    benchmark_verify,
    benchmark_sha3,
    benchmark_blake2s
);
criterion_main!(benches);
