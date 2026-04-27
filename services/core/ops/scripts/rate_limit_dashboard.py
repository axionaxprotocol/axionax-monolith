#!/usr/bin/env python3
"""
Axionax Rate Limiting Dashboard
Monitor RPC rate limiting status and adjust limits dynamically
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List
import argparse

class RateLimitDashboard:
    def __init__(self, rpc_url: str = "http://127.0.0.1:8545"):
        self.rpc_url = rpc_url
        self.session = requests.Session()
        
    def get_metrics(self) -> Dict:
        """Get metrics from health endpoint"""
        try:
            response = requests.get(f"{self.rpc_url.replace(':8545', ':8080')}/metrics", timeout=5)
            if response.status_code == 200:
                return self.parse_metrics(response.text)
        except Exception as e:
            print(f"Error fetching metrics: {e}")
        return {}
    
    def parse_metrics(self, metrics_text: str) -> Dict:
        """Parse Prometheus metrics format"""
        metrics = {}
        for line in metrics_text.split('\n'):
            if line.startswith('axionax_') and not line.startswith('#'):
                parts = line.split()
                if len(parts) >= 2:
                    metrics[parts[0]] = float(parts[1])
        return metrics
    
    def get_version(self) -> Dict:
        """Get version info"""
        try:
            response = requests.get(f"{self.rpc_url.replace(':8545', ':8080')}/version", timeout=5)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Error fetching version: {e}")
        return {}
    
    def check_health(self) -> Dict:
        """Check health status"""
        try:
            response = requests.get(f"{self.rpc_url.replace(':8545', ':8080')}/health", timeout=5)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Error checking health: {e}")
        return {}
    
    def display_dashboard(self):
        """Display real-time dashboard"""
        while True:
            try:
                # Clear screen
                print("\033[2J\033[H")
                
                # Get data
                metrics = self.get_metrics()
                version = self.get_version()
                health = self.check_health()
                
                # Header
                print("=" * 60)
                print("🔒 Axionax Rate Limiting Dashboard")
                print("=" * 60)
                print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                
                # Version info
                if version:
                    print(f"Version: {version.get('version', 'unknown')}")
                    print(f"Chain ID: {version.get('chain_id', 'unknown')}")
                    print()
                
                # Health status
                if health:
                    status = health.get('status', 'unknown')
                    status_emoji = "✅" if status == "healthy" else "❌"
                    print(f"Health: {status_emoji} {status.upper()}")
                    print()
                
                # Metrics
                print("📊 Current Metrics:")
                print("-" * 30)
                for key, value in sorted(metrics.items()):
                    emoji = self.get_metric_emoji(key)
                    print(f"{emoji} {key}: {value}")
                
                print()
                print("Press Ctrl+C to exit")
                time.sleep(5)
                
            except KeyboardInterrupt:
                print("\n👋 Dashboard stopped")
                break
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(5)
    
    def get_metric_emoji(self, metric_name: str) -> str:
        """Get emoji for metric type"""
        if "peers" in metric_name:
            return "🔗"
        elif "block" in metric_name:
            return "🧱"
        elif "database" in metric_name:
            return "💾"
        elif "sync" in metric_name:
            return "🔄"
        else:
            return "📈"

def main():
    parser = argparse.ArgumentParser(description="Axionax Rate Limiting Dashboard")
    parser.add_argument("--rpc", default="http://127.0.0.1:8545", help="RPC URL")
    args = parser.parse_args()
    
    dashboard = RateLimitDashboard(args.rpc)
    dashboard.display_dashboard()

if __name__ == "__main__":
    main()
