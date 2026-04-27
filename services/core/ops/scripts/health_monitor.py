#!/usr/bin/env python3
"""
Axionax Health Check Monitor
Automated monitoring with alerts for production environments
"""

import requests
import json
import time
import smtplib
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import argparse
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HealthMonitor:
    def __init__(self, rpc_url: str = "http://127.0.0.1:8545", check_interval: int = 30):
        self.rpc_url = rpc_url
        self.health_url = rpc_url.replace(':8545', ':8080')
        self.check_interval = check_interval
        self.last_alert_time = {}
        self.alert_cooldown = 300  # 5 minutes
        
    def check_endpoint(self, endpoint: str) -> Dict:
        """Check a specific health endpoint"""
        try:
            url = f"{self.health_url}{endpoint}"
            response = requests.get(url, timeout=10)
            return {
                'status': 'success',
                'status_code': response.status_code,
                'data': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                'response_time': response.elapsed.total_seconds()
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'response_time': 10.0  # timeout
            }
    
    def check_all_endpoints(self) -> Dict[str, Dict]:
        """Check all health endpoints"""
        endpoints = ['/health', '/ready', '/metrics', '/version']
        results = {}
        
        for endpoint in endpoints:
            results[endpoint] = self.check_endpoint(endpoint)
            
        return results
    
    def evaluate_health(self, results: Dict[str, Dict]) -> Dict:
        """Evaluate overall health status"""
        issues = []
        warnings = []
        
        # Check basic health
        health = results.get('/health', {})
        if health.get('status') != 'success' or health.get('data', {}).get('status') != 'healthy':
            issues.append("Basic health check failed")
        
        # Check readiness
        ready = results.get('/ready', {})
        if ready.get('status') != 'success' or not ready.get('data', {}).get('ready'):
            issues.append("Readiness check failed")
        
        # Check response times
        for endpoint, result in results.items():
            if result.get('response_time', 0) > 5.0:  # 5 second threshold
                warnings.append(f"Slow response from {endpoint}: {result.get('response_time', 0):.2f}s")
        
        # Check metrics availability
        metrics = results.get('/metrics', {})
        if metrics.get('status') != 'success':
            warnings.append("Metrics endpoint unavailable")
        
        return {
            'overall': 'healthy' if not issues else ('warning' if not issues else 'unhealthy'),
            'issues': issues,
            'warnings': warnings,
            'timestamp': datetime.now().isoformat()
        }
    
    def send_alert(self, message: str, severity: str = 'warning'):
        """Send alert (placeholder - integrate with your alert system)"""
        logger.warning(f"ALERT [{severity.upper()}]: {message}")
        
        # Here you can integrate with:
        # - Email (smtplib)
        # - Slack (webhook)
        # - PagerDuty
        # - Discord webhook
        # - etc.
    
    def should_alert(self, alert_key: str) -> bool:
        """Check if we should send alert (cooldown logic)"""
        now = datetime.now()
        last_time = self.last_alert_time.get(alert_key)
        
        if last_time is None or (now - last_time).total_seconds() > self.alert_cooldown:
            self.last_alert_time[alert_key] = now
            return True
        return False
    
    def monitor_once(self):
        """Run one monitoring cycle"""
        logger.info("Running health check cycle...")
        
        # Check all endpoints
        results = self.check_all_endpoints()
        
        # Evaluate health
        health_status = self.evaluate_health(results)
        
        # Log results
        logger.info(f"Overall status: {health_status['overall'].upper()}")
        
        if health_status['issues']:
            for issue in health_status['issues']:
                if self.should_alert(f"issue_{issue}"):
                    self.send_alert(f"ISSUE: {issue}", 'critical')
                logger.error(f"Issue: {issue}")
        
        if health_status['warnings']:
            for warning in health_status['warnings']:
                if self.should_alert(f"warning_{warning}"):
                    self.send_alert(f"WARNING: {warning}", 'warning')
                logger.warning(f"Warning: {warning}")
        
        # Print detailed status
        print("\n" + "="*50)
        print(f"Health Check - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*50)
        
        for endpoint, result in results.items():
            status_emoji = "✅" if result.get('status') == 'success' else "❌"
            response_time = result.get('response_time', 0)
            print(f"{status_emoji} {endpoint}: {result.get('status_code', 'N/A')} ({response_time:.2f}s)")
        
        print(f"\nOverall: {health_status['overall'].upper()}")
        
        return health_status
    
    def monitor_continuous(self):
        """Run continuous monitoring"""
        logger.info(f"Starting continuous monitoring (interval: {self.check_interval}s)")
        
        try:
            while True:
                self.monitor_once()
                time.sleep(self.check_interval)
        except KeyboardInterrupt:
            logger.info("Monitoring stopped by user")

def main():
    parser = argparse.ArgumentParser(description="Axionax Health Monitor")
    parser.add_argument("--rpc", default="http://127.0.0.1:8545", help="RPC URL")
    parser.add_argument("--interval", type=int, default=30, help="Check interval in seconds")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    args = parser.parse_args()
    
    monitor = HealthMonitor(args.rpc, args.interval)
    
    if args.once:
        monitor.monitor_once()
    else:
        monitor.monitor_continuous()

if __name__ == "__main__":
    main()
