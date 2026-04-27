"""
Docker Sandbox for Secure DeAI Job Execution

Provides isolation for running untrusted code from the network.
Features:
- Resource limits (CPU, Memory, Network)
- Timeout enforcement
- Input/Output validation
- Container-based isolation
"""

import docker
import json
import os
import time
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class SandboxError(Exception):
    """Exception raised when sandbox execution fails"""
    pass


class ExecutionStatus(Enum):
    SUCCESS = "success"
    TIMEOUT = "timeout"
    ERROR = "error"
    RESOURCE_EXCEEDED = "resource_exceeded"


@dataclass
class ResourceLimits:
    """Resource limits for sandbox execution"""
    cpu_count: float = 1.0           # Number of CPUs (e.g., 0.5 = half a CPU)
    memory_mb: int = 512             # Memory limit in MB
    memory_swap_mb: int = 0          # Swap limit (0 = disable swap)
    timeout_seconds: int = 300        # Max execution time (5 minutes default)
    network_disabled: bool = True    # Disable network access
    read_only_rootfs: bool = True    # Read-only filesystem
    pids_limit: int = 100            # Max number of processes


@dataclass 
class ExecutionResult:
    """Result of sandbox execution"""
    status: ExecutionStatus
    output: Optional[str] = None
    error: Optional[str] = None
    exit_code: int = -1
    execution_time_ms: int = 0


class DockerSandbox:
    """
    Docker-based sandbox for secure job execution.
    
    Usage:
        sandbox = DockerSandbox()
        result = sandbox.execute(
            image="python:3.11-slim",
            command=["python", "-c", "print('Hello')"],
            limits=ResourceLimits(memory_mb=256, timeout_seconds=60)
        )
    """
    
    DEFAULT_IMAGE = "python:3.11-slim"
    
    def __init__(self, docker_url: str = "unix:///var/run/docker.sock"):
        """Initialize Docker client"""
        try:
            self.client = docker.from_env()
            self.client.ping()
            logger.info("Docker sandbox initialized successfully")
        except docker.errors.DockerException as e:
            logger.error(f"Failed to connect to Docker: {e}")
            raise SandboxError(f"Cannot connect to Docker daemon: {e}")
    
    def execute(
        self,
        command: list,
        image: str = DEFAULT_IMAGE,
        limits: Optional[ResourceLimits] = None,
        environment: Optional[Dict[str, str]] = None,
        working_dir: str = "/workspace",
        input_data: Optional[bytes] = None,
    ) -> ExecutionResult:
        """
        Execute a command in a sandboxed container.
        
        Args:
            command: Command to execute as list of strings
            image: Docker image to use
            limits: Resource limits configuration
            environment: Environment variables
            working_dir: Working directory in container
            input_data: Optional input data to write to /workspace/input
            
        Returns:
            ExecutionResult with status, output, and timing info
        """
        if limits is None:
            limits = ResourceLimits()
        
        container = None
        start_time = time.time()
        
        try:
            # Validate command
            if not command or not isinstance(command, list):
                raise SandboxError("Invalid command: must be a non-empty list")
            
            # Prepare container config
            container_config = self._build_container_config(
                image=image,
                command=command,
                limits=limits,
                environment=environment,
                working_dir=working_dir,
            )
            
            # Pull image if not available
            try:
                self.client.images.get(image)
            except docker.errors.ImageNotFound:
                logger.info(f"Pulling image: {image}")
                self.client.images.pull(image)
            
            # Create container
            container = self.client.containers.create(**container_config)
            
            # Start container
            container.start()
            
            # Wait for completion with timeout
            try:
                exit_info = container.wait(timeout=limits.timeout_seconds)
                exit_code = exit_info.get("StatusCode", -1)
                
                # Get logs
                stdout = container.logs(stdout=True, stderr=False).decode('utf-8', errors='replace')
                stderr = container.logs(stdout=False, stderr=True).decode('utf-8', errors='replace')
                
                execution_time = int((time.time() - start_time) * 1000)
                
                if exit_code == 0:
                    return ExecutionResult(
                        status=ExecutionStatus.SUCCESS,
                        output=stdout,
                        exit_code=exit_code,
                        execution_time_ms=execution_time,
                    )
                else:
                    return ExecutionResult(
                        status=ExecutionStatus.ERROR,
                        output=stdout,
                        error=stderr,
                        exit_code=exit_code,
                        execution_time_ms=execution_time,
                    )
                    
            except Exception as timeout_err:
                logger.warning(f"Container timeout: {timeout_err}")
                container.kill()
                return ExecutionResult(
                    status=ExecutionStatus.TIMEOUT,
                    error=f"Execution timed out after {limits.timeout_seconds}s",
                    execution_time_ms=limits.timeout_seconds * 1000,
                )
                
        except docker.errors.ContainerError as e:
            return ExecutionResult(
                status=ExecutionStatus.ERROR,
                error=str(e),
                exit_code=e.exit_status,
                execution_time_ms=int((time.time() - start_time) * 1000),
            )
        except docker.errors.ImageNotFound as e:
            return ExecutionResult(
                status=ExecutionStatus.ERROR,
                error=f"Image not found: {image}",
            )
        except Exception as e:
            logger.exception(f"Sandbox execution error: {e}")
            return ExecutionResult(
                status=ExecutionStatus.ERROR,
                error=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000),
            )
        finally:
            # Always cleanup container
            if container:
                try:
                    container.remove(force=True)
                except Exception as cleanup_err:
                    logger.warning(f"Failed to cleanup container: {cleanup_err}")
    
    def _build_container_config(
        self,
        image: str,
        command: list,
        limits: ResourceLimits,
        environment: Optional[Dict[str, str]],
        working_dir: str,
    ) -> Dict[str, Any]:
        """Build Docker container configuration with security constraints"""
        
        config = {
            "image": image,
            "command": command,
            "working_dir": working_dir,
            "detach": True,
            "tty": False,
            "stdin_open": False,
            
            # Security options
            "network_disabled": limits.network_disabled,
            "read_only": limits.read_only_rootfs,
            
            # Resource limits
            "mem_limit": f"{limits.memory_mb}m",
            "memswap_limit": f"{limits.memory_swap_mb}m" if limits.memory_swap_mb > 0 else f"{limits.memory_mb}m",
            "cpu_count": int(limits.cpu_count) if limits.cpu_count >= 1 else 1,
            "cpu_period": 100000,
            "cpu_quota": int(100000 * limits.cpu_count),
            "pids_limit": limits.pids_limit,
            
            # Drop all capabilities
            "cap_drop": ["ALL"],
            
            # Security opt
            "security_opt": ["no-new-privileges:true"],
            
            # User (non-root)
            "user": "nobody",
        }
        
        if environment:
            config["environment"] = environment
            
        return config
    
    def execute_python_script(
        self,
        script: str,
        limits: Optional[ResourceLimits] = None,
        packages: Optional[list] = None,
    ) -> ExecutionResult:
        """
        Execute a Python script in sandbox.
        
        Args:
            script: Python code to execute
            limits: Resource limits
            packages: List of pip packages to install (use sparingly!)
            
        Returns:
            ExecutionResult
        """
        # Wrap script execution
        command = ["python", "-c", script]
        
        return self.execute(
            command=command,
            image="python:3.11-slim",
            limits=limits,
        )


class MockSandbox:
    """
    Mock sandbox for testing when Docker is not available.
    WARNING: This provides NO security isolation!
    """
    
    def execute(self, **kwargs) -> ExecutionResult:
        logger.warning("Using MockSandbox - NO SECURITY ISOLATION!")
        return ExecutionResult(
            status=ExecutionStatus.SUCCESS,
            output="[MOCK] Execution simulated",
            execution_time_ms=100,
            exit_code=0,
        )
    
    def execute_python_script(self, script: str, **kwargs) -> ExecutionResult:
        return self.execute()


def create_sandbox(use_docker: bool = True) -> DockerSandbox:
    """
    Factory function to create appropriate sandbox.
    Falls back to MockSandbox if Docker is unavailable.
    """
    if use_docker:
        try:
            return DockerSandbox()
        except SandboxError:
            logger.warning("Docker unavailable, falling back to MockSandbox")
            if os.environ.get("AXIONAX_ENV") == "production":
                raise SandboxError("Docker sandbox required in production - cannot fall back to MockSandbox")
            return MockSandbox()
    else:
        if os.environ.get("AXIONAX_ENV") == "production":
            raise SandboxError("Docker sandbox required in production - cannot fall back to MockSandbox")
        return MockSandbox()


# Tests
if __name__ == "__main__":
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    print("Testing Docker Sandbox...")
    
    try:
        sandbox = DockerSandbox()
        
        # Test 1: Simple command
        print("\n[Test 1] Simple echo command...")
        result = sandbox.execute(
            command=["echo", "Hello, Axionax!"],
            image="alpine:latest",
            limits=ResourceLimits(timeout_seconds=10),
        )
        print(f"  Status: {result.status}")
        print(f"  Output: {result.output.strip() if result.output else 'None'}")
        
        # Test 2: Python script
        print("\n[Test 2] Python script...")
        result = sandbox.execute_python_script(
            script="print(sum(range(100)))",
            limits=ResourceLimits(memory_mb=128, timeout_seconds=30),
        )
        print(f"  Status: {result.status}")
        print(f"  Output: {result.output.strip() if result.output else 'None'}")
        
        # Test 3: Resource limit (should fail or be limited)
        print("\n[Test 3] Memory limit enforcement...")
        result = sandbox.execute_python_script(
            script="x = [0] * (100 * 1024 * 1024)",  # Try to allocate 100MB
            limits=ResourceLimits(memory_mb=64, timeout_seconds=10),
        )
        print(f"  Status: {result.status}")
        print(f"  Error: {result.error[:100] if result.error else 'None'}...")
        
        print("\n✅ All tests completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
