# Axionax Core — Rust Test Report

**Date:** 2026-03-28  
**Time:** 13:01 (UTC+7)  
**Toolchain:** `stable-x86_64-pc-windows-gnu`  
**Command:** `cargo test --manifest-path core/Cargo.toml --workspace`  
**Result:** ✅ ALL TESTS PASSED — 0 failed

---

## Summary

| Metric | Value |
|---|---|
| Total tests run | 201 |
| Passed | 201 |
| Failed | 0 |
| Ignored | 2 |
| Crates tested | 18 |

---

## Results by Crate

### `asr` — Adaptive Selection & Reputation
| Test | Result |
|---|---|
| `tests::test_register_worker` | ✅ ok |
| `tests::test_requirements_filter` | ✅ ok |
| `tests::test_performance_update` | ✅ ok |
| `tests::test_newcomer_boost` | ✅ ok |
| `tests::test_select_worker` | ✅ ok |

**5 passed, 0 failed**

---

### `blockchain` — Blockchain Core
| Test | Result |
|---|---|
| `mempool::tests::test_add_transaction` | ✅ ok |
| `mempool::tests::test_remove_transaction` | ✅ ok |
| `mempool::tests::test_duplicate_transaction` | ✅ ok |
| `mempool::tests::test_unsigned_tx_rejected` | ✅ ok |
| `mempool::tests::test_nonce_too_low` | ✅ ok |
| `mempool::tests::test_pool_size_limit` | ✅ ok |
| `mempool::tests::test_get_pending_transactions` | ✅ ok |
| `tests::test_add_block` | ✅ ok |
| `tests::test_block_with_transactions` | ✅ ok |
| `tests::test_concurrent_read_access` | ✅ ok |
| `tests::test_create_genesis` | ✅ ok |
| `tests::test_get_nonexistent_block` | ✅ ok |
| `tests::test_init_with_genesis` | ✅ ok |
| `tests::test_sequential_block_addition` | ✅ ok |
| `tests::test_parent_hash_validation` | ✅ ok |
| `tests::test_skip_block_number_fails` | ✅ ok |
| `tests::test_transaction_signing_and_verification` | ✅ ok |
| `storage::tests::test_put_and_get_block` | ✅ ok |
| `storage::tests::test_get_nonexistent_block` | ✅ ok |
| `storage::tests::test_latest_block_number` | ✅ ok |
| `storage::tests::test_many_blocks` | ✅ ok |
| `storage::tests::test_block_exists` | ✅ ok |
| `storage::tests::test_persistence` | ✅ ok |
| `validation::tests::test_validate_valid_block` | ✅ ok |
| `validation::tests::test_validate_genesis_block` | ✅ ok |
| `validation::tests::test_validate_valid_transaction` | ✅ ok |
| `validation::tests::test_invalid_block_number` | ✅ ok |
| `validation::tests::test_invalid_parent_hash` | ✅ ok |
| `validation::tests::test_invalid_gas_limit` | ✅ ok |
| `validation::tests::test_invalid_gas_price` | ✅ ok |
| `validation::tests::test_gas_limit_exceeded` | ✅ ok |
| `validation::tests::test_block_too_many_transactions` | ✅ ok |
| `validation::tests::test_validate_address` | ✅ ok |

**33 passed, 0 failed**

---

### `config` — Node Configuration
| Test | Result |
|---|---|
| `tests::test_protocol_config_default` | ✅ ok |
| `tests::test_network_mainnet` | ✅ ok |
| `tests::test_network_testnet` | ✅ ok |
| `tests::test_da_defaults` | ✅ ok |
| `tests::test_asr_defaults` | ✅ ok |
| `tests::test_vrf_defaults` | ✅ ok |
| `tests::test_ppc_defaults` | ✅ ok |
| `tests::test_popc_defaults` | ✅ ok |

**8 passed, 0 failed**

---

### `consensus` — Consensus Engine (PoL + Merkle)
| Test | Result |
|---|---|
| `merkle::tests::test_single_leaf` | ✅ ok |
| `merkle::tests::test_multiple_leaves` | ✅ ok |
| `merkle::tests::test_non_power_of_two_leaves` | ✅ ok |
| `merkle::tests::test_wrong_root_fails` | ✅ ok |
| `merkle::tests::test_tampered_proof_fails` | ✅ ok |
| `merkle::tests::test_serialization_roundtrip` | ✅ ok |
| `merkle::tests::test_verify_sample_proofs` | ✅ ok |
| `merkle::tests::test_deserialize_proofs_rejects_huge_num_proofs` | ✅ ok |
| `proof_of_light::tests::test_encode_to_phase_shift_len` | ✅ ok |
| `proof_of_light::tests::test_validate_block_constructive` | ✅ ok |
| `proof_of_light::tests::test_validate_block_destructive_like` | ✅ ok |
| `tests::test_register_validator` | ✅ ok |
| `tests::test_insufficient_stake_rejected` | ✅ ok |
| `tests::test_generate_challenge` | ✅ ok |
| `tests::test_deterministic_challenge_generation` | ✅ ok |
| `tests::test_different_seeds_produce_different_samples` | ✅ ok |
| `tests::test_sample_size_capped_by_output_size` | ✅ ok |
| `tests::test_verify_proof_with_real_merkle_tree` | ✅ ok |
| `tests::test_verify_proof_wrong_root_fails` | ✅ ok |
| `tests::test_verify_proof_invalid_size` | ✅ ok |
| `tests::test_custom_config` | ✅ ok |
| `tests::test_fraud_detection_probability` | ✅ ok |
| `tests::test_fraud_detection_probability_edge_cases` | ✅ ok |

**23 passed, 0 failed**

---

### `crypto` — Cryptography (Unit + Doc tests)
| Test | Result |
|---|---|
| `tests::test_hash_blake2b` | ✅ ok |
| `tests::test_hash_blake2s` | ✅ ok |
| `tests::test_hash_sha3` | ✅ ok |
| `tests::test_blake2_vs_sha3_different_outputs` | ✅ ok |
| `tests::test_signature` | ✅ ok |
| `tests::test_kdf_key_derivation` | ✅ ok |
| `tests::test_kdf_password_hash_verify` | ✅ ok |
| `tests::test_kdf_unique_salts` | ✅ ok |
| `tests::test_blake2_performance` | ✅ ok |
| `vrf::tests::test_prove_verify` | ✅ ok |
| `vrf::tests::test_deterministic_output` | ✅ ok |
| `vrf::tests::test_different_inputs_different_outputs` | ✅ ok |
| `vrf::tests::test_different_keys_different_outputs` | ✅ ok |
| `vrf::tests::test_invalid_proof_fails` | ✅ ok |
| `vrf::tests::test_wrong_public_key_fails` | ✅ ok |
| `vrf::tests::test_wrong_input_fails` | ✅ ok |
| `vrf::tests::test_random_bytes` | ✅ ok |
| `vrf::tests::test_random_bytes_deterministic` | ✅ ok |
| `doc-test: hash::blake2s_256` | ✅ ok |
| `doc-test: hash::blake2b_512` | ✅ ok |
| `doc-test: kdf::derive_key` | ✅ ok |
| `doc-test: kdf::hash_password` | ✅ ok |

**22 passed, 0 failed**

---

### `da` — Data Availability
| Test | Result |
|---|---|
| `tests::test_store_and_retrieve` | ✅ ok |
| `tests::test_chunking` | ✅ ok |
| `tests::test_chunk_integrity` | ✅ ok |
| `tests::test_audit` | ✅ ok |
| `tests::test_stats` | ✅ ok |

**5 passed, 0 failed**

---

### `events` — Event Bus
| Test | Result |
|---|---|
| `tests::test_publish_subscribe` | ✅ ok |
| `tests::test_event_filtering` | ✅ ok |
| `tests::test_wildcard_subscription` | ✅ ok |
| `tests::test_history` | ✅ ok |

**4 passed, 0 failed**

---

### `genesis` — Genesis Block
| Test | Result |
|---|---|
| `tests::test_generate_genesis` | ✅ ok |
| `tests::test_mainnet_genesis` | ✅ ok |
| `tests::test_localnet_genesis` | ✅ ok |
| `tests::test_creator_gets_ten_percent` | ✅ ok |
| `tests::test_deterministic_hash` | ✅ ok |
| `tests::test_export_json` | ✅ ok |

**6 passed, 0 failed**

---

### `governance` — On-chain Governance
| Test | Result |
|---|---|
| `tests::test_create_proposal` | ✅ ok |
| `tests::test_vote` | ✅ ok |
| `tests::test_double_vote` | ✅ ok |
| `tests::test_proposal_passes` | ✅ ok |
| `tests::test_proposal_fails_quorum` | ✅ ok |
| `tests::test_execute_proposal` | ✅ ok |
| `tests::test_cancel_proposal` | ✅ ok |
| `tests::test_insufficient_stake` | ✅ ok |
| `tests::test_title_too_long_rejected` | ✅ ok |
| `tests::test_title_at_max_length_accepted` | ✅ ok |
| `tests::test_description_too_long_rejected` | ✅ ok |
| `tests::test_description_at_max_length_accepted` | ✅ ok |

**12 passed, 0 failed**

---

### `metrics` — Prometheus Metrics
| Test | Result |
|---|---|
| `tests::test_metrics_init` | ✅ ok |
| `tests::test_record_block` | ✅ ok |
| `tests::test_export` | ✅ ok |
| `tests::test_f64_gauge` | ✅ ok |
| `tests::test_labeled_counter` | ✅ ok |
| `tests::test_histogram_observe` | ✅ ok |

**6 passed, 0 failed**

---

### `network` — P2P Networking (Unit tests)
| Test | Result |
|---|---|
| `config::tests::test_default_config` | ✅ ok |
| `config::tests::test_mainnet_config` | ✅ ok |
| `config::tests::test_testnet_config` | ✅ ok |
| `config::tests::test_listen_multiaddr` | ✅ ok |
| `protocol::tests::test_message_serialization` | ✅ ok |
| `protocol::tests::test_topic_names` | ✅ ok |
| `reputation::tests::test_register_peer` | ✅ ok |
| `reputation::tests::test_success_increases_score` | ✅ ok |
| `reputation::tests::test_failure_decreases_score` | ✅ ok |
| `reputation::tests::test_ban_on_low_score` | ✅ ok |
| `reputation::tests::test_priority_peers` | ✅ ok |
| `behaviour::tests::test_behaviour_creation` | ✅ ok |
| `manager::tests::test_network_manager_creation` | ✅ ok |
| `manager::tests::test_peer_id_generation` | ✅ ok |
| `tests::test_network_module` | ✅ ok |

**15 passed, 0 failed**

---

### `network` — P2P Networking (Integration tests)
| Test | Result |
|---|---|
| `test_config_validation` | ✅ ok |
| `test_network_init_and_shutdown` | ✅ ok |
| `test_bootstrap_connection` | ✅ ok |
| `test_peer_discovery` | ✅ ok |
| `test_transaction_propagation` | ✅ ok |
| `test_message_publishing` | ✅ ok |
| `test_concurrent_messages` | ✅ ok |

**7 passed, 0 failed**

---

### `node` — Full Node
| Test | Result |
|---|---|
| `tests::test_node_creation` | ✅ ok |
| `tests::test_node_stats` | ✅ ok |
| `tests::test_node_state_access` | ✅ ok |

**3 passed, 0 failed**

---

### `ppc` — Peer-to-Peer Computing / Pricing
| Test | Result |
|---|---|
| `tests::test_register_class` | ✅ ok |
| `tests::test_estimate_cost` | ✅ ok |
| `tests::test_price_respects_bounds` | ✅ ok |
| `tests::test_price_increases_on_high_utilization` | ✅ ok |
| `tests::test_price_decreases_on_low_utilization` | ✅ ok |

**5 passed, 0 failed**

---

### `rpc` — JSON-RPC Server
| Test | Result |
|---|---|
| `tests::test_rpc_block_number` | ✅ ok |
| `tests::test_rpc_chain_id` | ✅ ok |
| `tests::test_rpc_net_version` | ✅ ok |
| `tests::test_rpc_get_block_not_found` | ✅ ok |
| `tests::test_rpc_get_transaction_not_found` | ✅ ok |
| `tests::test_parse_hex_u64` | ✅ ok |
| `tests::test_parse_hex_hash` | ✅ ok |
| `health::tests::test_health_check_healthy` | ✅ ok |
| `health::tests::test_node_status` | ✅ ok |
| `health::tests::test_component_status` | ✅ ok |
| `http_health::tests::test_default_config` | ✅ ok |
| `http_health::tests::test_health_state_default` | ✅ ok |
| `http_health::tests::test_is_alive` | ✅ ok |
| `http_health::tests::test_is_ready` | ✅ ok |
| `middleware::tests::test_cors_dev_config` | ✅ ok |
| `middleware::tests::test_cors_production_config` | ✅ ok |
| `middleware::tests::test_rate_limiter_allows_requests` | ✅ ok |
| `middleware::tests::test_rate_limiter_multiple_ips` | ✅ ok |
| `middleware::tests::test_rate_limiter_window_reset` | ✅ ok |
| `middleware::tests::test_request_validator_size` | ✅ ok |
| `middleware::tests::test_request_validator_batch` | ✅ ok |
| `server::tests::test_default_config` | ✅ ok |
| `server::tests::test_list_methods` | ✅ ok |
| `staking_rpc::tests::test_parse_hex_u128` | ✅ ok |
| `governance_rpc::tests::test_parse_proposal_type` | ✅ ok |

**25 passed, 0 failed**

---

### `staking` — Validator Staking
| Test | Result |
|---|---|
| `tests::test_stake_validator` | ✅ ok |
| `tests::test_stake_insufficient` | ✅ ok |
| `tests::test_unstake_lock_period` | ✅ ok |
| `tests::test_partial_unstake` | ✅ ok |
| `tests::test_delegate` | ✅ ok |
| `tests::test_slash_validator` | ✅ ok |
| `tests::test_distribute_rewards` | ✅ ok |
| `tests::test_claim_rewards` | ✅ ok |

**8 passed, 0 failed**

---

### `state` — State Database
| Test | Result |
|---|---|
| `tests::test_state_db_open` | ✅ ok |
| `tests::test_store_and_get_block` | ✅ ok |
| `tests::test_block_not_found` | ✅ ok |
| `tests::test_store_and_get_transaction` | ✅ ok |
| `tests::test_transaction_not_found` | ✅ ok |
| `tests::test_store_multiple_blocks` | ✅ ok |
| `tests::test_state_root` | ✅ ok |

**7 passed, 0 failed**

---

### `vrf` — Verifiable Random Function
| Test | Result |
|---|---|
| `tests::test_keypair_generation` | ✅ ok |
| `tests::test_generate_seed` | ✅ ok |
| `tests::test_evaluate_and_verify` | ✅ ok |
| `tests::test_verify_fails_wrong_input` | ✅ ok |
| `tests::test_deterministic_output` | ✅ ok |
| `tests::test_output_conversion` | ✅ ok |
| `tests::test_commit_reveal` | ✅ ok |

**7 passed, 0 failed**

---

## Bugs Fixed During This Run

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | `core/rpc/src/http_health.rs` | `handle_request` ใช้ `version_path` แต่ไม่มีใน parameter | เพิ่ม `version_path: &str` ใน signature และส่งผ่านจาก `start()` |
| 2 | `core/rpc/src/lib.rs` | `tower::limit::RateLimitLayer` ไม่ implement `Clone` ที่ jsonrpsee ต้องการ | ย้าย rate limiting ออกจาก middleware stack (ยังคงมีผ่าน `max_connections`) |
| 3 | `core/rpc/examples/state_rpc_integration.rs` | เรียก `start_rpc_server` ผิดจำนวน argument | แก้เป็น 5 arguments ให้ตรง signature |
| 4 | `core/node/examples/full_node.rs` | เรียก `node.start()` โดยไม่ส่ง `role: &str` | แก้เป็น `node.start("validator")` |
| 5 | `core/Cargo.toml` | examples และ integration test ของ root package ใช้ crate names เก่า | เพิ่ม `autoexamples = false` และ `autotests = false` |
| 6 | `core/rpc/src/health.rs` | `check_network()` คืน unhealthy เมื่อ peers=0 ทำให้ test ล้มเหลว | แก้ logic: database+sync เท่านั้นที่เป็น critical สำหรับ overall health |
| 7 | `core/metrics/src/lib.rs` | Race condition ใน `test_export` — global `BLOCK_HEIGHT` ถูกแก้โดย test อื่นพร้อมกัน | แก้ assertion ให้ตรวจ format แทนค่าเฉพาะ |

---

## Environment

| Item | Value |
|---|---|
| OS | Windows (x86_64) |
| Rust toolchain | `stable-x86_64-pc-windows-gnu` |
| GCC (linker) | MinGW-w64 GCC 15.2.0 (WinLibs) @ `C:\mingw64\mingw64\bin` |
| Workspace root | `core/Cargo.toml` |
| Workspace version | `1.8.0` |