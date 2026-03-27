#!/usr/bin/env python3
"""
Axionax RPC Performance Benchmark
Test RPC performance under load and measure rate limiting effectiveness
"""

import requests
import json
import time
import threading
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict
import argparse

class RPCBenchmark:
    def __init__(self, rpc_url: str = "http://127.0.0.1:8545"):
        self.rpc_url = rpc_url
        self.session = requests.Session()
        
    def make_rpc_call(self, method: str, params: List = None) -> Dict:
        """Make a single RPC call"""
        if params is None:
            params = []
            
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": 1
        }
        
        try:
            start_time = time.time()
            response = self.session.post(
                self.rpc_url,
                json=payload,
                timeout=10
            )
            end_time = time.time()
            
            return {
                'success': response.status_code == 200,
                'response_time': end_time - start_time,
                'status_code': response.status_code,
                'data': response.json() if response.status_code == 200 else None
            }
        except Exception as e:
            return {
                'success': False,
                'response_time': 10.0,  # timeout
                'error': str(e)
            }
    
    def benchmark_method(self, method: str, params: List = None, 
                        concurrent_requests: int = 10, total_requests: int = 100) -> Dict:
        """Benchmark a specific RPC method"""
        print(f"Benchmarking {method} with {concurrent_requests} concurrent requests...")
        
        results = []
        
        def make_request():
            return self.make_rpc_call(method, params)
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            futures = [executor.submit(make_request) for _ in range(total_requests)]
            
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                
        end_time = time.time()
        total_time = end_time - start_time
        
        # Calculate statistics
        successful_results = [r for r in results if r['success']]
        failed_results = [r for r in results if not r['success']]
        
        response_times = [r['response_time'] for r in successful_results]
        
        stats = {
            'method': method,
            'total_requests': total_requests,
            'concurrent_requests': concurrent_requests,
            'total_time': total_time,
            'successful_requests': len(successful_results),
            'failed_requests': len(failed_results),
            'success_rate': len(successful_results) / total_requests * 100,
            'requests_per_second': len(successful_results) / total_time if total_time > 0 else 0,
        }
        
        if response_times:
            stats.update({
                'avg_response_time': statistics.mean(response_times),
                'min_response_time': min(response_times),
                'max_response_time': max(response_times),
                'median_response_time': statistics.median(response_times),
                'p95_response_time': response_times[int(len(response_times) * 0.95)] if len(response_times) > 20 else max(response_times),
                'p99_response_time': response_times[int(len(response_times) * 0.99)] if len(response_times) > 100 else max(response_times),
            })
        else:
            stats.update({
                'avg_response_time': 0,
                'min_response_time': 0,
                'max_response_time': 0,
                'median_response_time': 0,
                'p95_response_time': 0,
                'p99_response_time': 0,
            })
        
        return stats
    
    def run_comprehensive_benchmark(self) -> Dict[str, Dict]:
        """Run benchmark on multiple RPC methods"""
        test_cases = [
            # (method, params, description)
            ("eth_blockNumber", [], "Get block number"),
            ("eth_getBalance", ["0x0000000000000000000000000000000000000001", "latest"], "Get balance"),
            ("eth_chainId", [], "Get chain ID"),
            ("net_version", [], "Get network version"),
            ("web3_clientVersion", [], "Get client version"),
        ]
        
        results = {}
        
        for method, params, description in test_cases:
            print(f"\n{'='*50}")
            print(f"Testing: {description}")
            print(f"Method: {method}")
            print('='*50)
            
            # Test with different concurrency levels
            for concurrency in [1, 5, 10, 20]:
                stats = self.benchmark_method(
                    method, params, 
                    concurrent_requests=concurrency,
                    total_requests=50
                )
                
                key = f"{method}_{concurrency}concurrent"
                results[key] = stats
                
                # Print results
                print(f"\nConcurrency: {concurrency}")
                print(f"  Success Rate: {stats['success_rate']:.1f}%")
                print(f"  Requests/sec: {stats['requests_per_second']:.1f}")
                print(f"  Avg Response: {stats['avg_response_time']:.3f}s")
                print(f"  P95 Response: {stats['p95_response_time']:.3f}s")
                
                if stats['failed_requests'] > 0:
                    print(f"  Failed Requests: {stats['failed_requests']}")
        
        return results
    
    def test_rate_limiting(self) -> Dict:
        """Test rate limiting effectiveness"""
        print("\n" + "="*50)
        print("Testing Rate Limiting")
        print("="*50)
        
        # Send burst of requests
        burst_size = 100
        print(f"Sending {burst_size} requests in rapid succession...")
        
        results = []
        start_time = time.time()
        
        for i in range(burst_size):
            result = self.make_rpc_call("eth_blockNumber")
            results.append(result)
            
        end_time = time.time()
        
        # Analyze results
        successful = [r for r in results if r['success']]
        rate_limited = [r for r in results if r.get('status_code') == 429]
        
        print(f"\nBurst Test Results:")
        print(f"  Total Requests: {burst_size}")
        print(f"  Successful: {len(successful)}")
        print(f"  Rate Limited (429): {len(rate_limited)}")
        print(f"  Other Errors: {burst_size - len(successful) - len(rate_limited)}")
        print(f"  Time Taken: {end_time - start_time:.2f}s")
        
        if rate_limited:
            print(f"  ⚠️  Rate limiting is active ({len(rate_limited)} requests blocked)")
        else:
            print(f"  ℹ️  No rate limiting detected")
        
        return {
            'burst_size': burst_size,
            'successful': len(successful),
            'rate_limited': len(rate_limited),
            'other_errors': burst_size - len(successful) - len(rate_limited),
            'total_time': end_time - start_time
        }

def main():
    parser = argparse.ArgumentParser(description="Axionax RPC Performance Benchmark")
    parser.add_argument("--rpc", default="http://127.0.0.1:8545", help="RPC URL")
    parser.add_argument("--method", help="Specific method to test")
    parser.add_argument("--concurrency", type=int, default=10, help="Concurrent requests")
    parser.add_argument("--requests", type=int, default=100, help="Total requests")
    args = parser.parse_args()
    
    benchmark = RPCBenchmark(args.rpc)
    
    if args.method:
        # Test specific method
        stats = benchmark.benchmark_method(
            args.method, 
            concurrent_requests=args.concurrency,
            total_requests=args.requests
        )
        
        print(f"\nBenchmark Results for {args.method}:")
        print(f"  Success Rate: {stats['success_rate']:.1f}%")
        print(f"  Requests/sec: {stats['requests_per_second']:.1f}")
        print(f"  Avg Response: {stats['avg_response_time']:.3f}s")
        print(f"  P95 Response: {stats['p95_response_time']:.3f}s")
    else:
        # Run comprehensive benchmark
        results = benchmark.run_comprehensive_benchmark()
        
        # Test rate limiting
        rate_limit_results = benchmark.test_rate_limiting()
        
        # Summary
        print(f"\n" + "="*50)
        print("Benchmark Summary")
        print("="*50)
        
        all_methods = set(key.split('_')[0] for key in results.keys())
        for method in sorted(all_methods):
            method_results = [r for k, r in results.items() if k.startswith(method)]
            best_rps = max(r['requests_per_second'] for r in method_results)
            best_latency = min(r['p95_response_time'] for r in method_results)
            print(f"{method}: {best_rps:.1f} req/s, {best_latency:.3f}s p95")

if __name__ == "__main__":
    main()
