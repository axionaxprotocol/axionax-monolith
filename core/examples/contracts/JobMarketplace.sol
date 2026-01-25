// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title JobMarketplace
 * @dev Decentralized marketplace for DeAI compute jobs
 * @author Axionax Protocol
 */
contract JobMarketplace is ReentrancyGuard, Ownable {
    // ==========================================================================
    // Types
    // ==========================================================================
    
    enum JobStatus {
        Pending,
        Assigned,
        Completed,
        Disputed,
        Cancelled,
        Refunded
    }
    
    enum JobType {
        Inference,
        Training,
        DataProcessing,
        Custom
    }
    
    struct Job {
        uint256 id;
        address submitter;
        address worker;
        JobType jobType;
        JobStatus status;
        uint256 reward;
        uint256 deposit;
        uint256 timeout;
        uint256 createdAt;
        uint256 assignedAt;
        uint256 completedAt;
        bytes32 inputHash;      // IPFS hash of job input
        bytes32 resultHash;     // IPFS hash of result
        bytes32 proofHash;      // Merkle proof hash
    }
    
    struct Worker {
        address addr;
        uint256 stake;
        uint256 reputation;
        uint256 jobsCompleted;
        uint256 jobsFailed;
        bool active;
        uint256 registeredAt;
    }
    
    // ==========================================================================
    // State
    // ==========================================================================
    
    IERC20 public immutable axxToken;
    
    uint256 public nextJobId;
    uint256 public minStake;
    uint256 public platformFeeRate; // In basis points (100 = 1%)
    uint256 public disputePeriod;
    
    mapping(uint256 => Job) public jobs;
    mapping(address => Worker) public workers;
    mapping(address => uint256[]) public submitterJobs;
    mapping(address => uint256[]) public workerJobs;
    
    address[] public registeredWorkers;
    
    // ==========================================================================
    // Events
    // ==========================================================================
    
    event WorkerRegistered(address indexed worker, uint256 stake);
    event WorkerUpdated(address indexed worker, uint256 newStake);
    event WorkerDeactivated(address indexed worker);
    
    event JobCreated(
        uint256 indexed jobId,
        address indexed submitter,
        JobType jobType,
        uint256 reward,
        bytes32 inputHash
    );
    
    event JobAssigned(
        uint256 indexed jobId,
        address indexed worker,
        uint256 assignedAt
    );
    
    event JobCompleted(
        uint256 indexed jobId,
        address indexed worker,
        bytes32 resultHash,
        bytes32 proofHash
    );
    
    event JobDisputed(uint256 indexed jobId, address indexed disputer);
    event JobCancelled(uint256 indexed jobId);
    event JobRefunded(uint256 indexed jobId);
    
    event RewardClaimed(uint256 indexed jobId, address indexed worker, uint256 amount);
    event SlashApplied(address indexed worker, uint256 amount);
    
    // ==========================================================================
    // Constructor
    // ==========================================================================
    
    constructor(
        address _axxToken,
        uint256 _minStake,
        uint256 _platformFeeRate,
        uint256 _disputePeriod
    ) {
        axxToken = IERC20(_axxToken);
        minStake = _minStake;
        platformFeeRate = _platformFeeRate;
        disputePeriod = _disputePeriod;
        nextJobId = 1;
    }
    
    // ==========================================================================
    // Worker Management
    // ==========================================================================
    
    /**
     * @dev Register as a worker by staking AXX tokens
     * @param stakeAmount Amount of AXX to stake
     */
    function registerWorker(uint256 stakeAmount) external nonReentrant {
        require(stakeAmount >= minStake, "Stake too low");
        require(!workers[msg.sender].active, "Already registered");
        
        require(
            axxToken.transferFrom(msg.sender, address(this), stakeAmount),
            "Stake transfer failed"
        );
        
        workers[msg.sender] = Worker({
            addr: msg.sender,
            stake: stakeAmount,
            reputation: 100, // Start with 100 reputation
            jobsCompleted: 0,
            jobsFailed: 0,
            active: true,
            registeredAt: block.timestamp
        });
        
        registeredWorkers.push(msg.sender);
        
        emit WorkerRegistered(msg.sender, stakeAmount);
    }
    
    /**
     * @dev Add more stake to increase worker capacity
     * @param amount Additional stake amount
     */
    function addStake(uint256 amount) external nonReentrant {
        require(workers[msg.sender].active, "Not registered");
        
        require(
            axxToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        workers[msg.sender].stake += amount;
        
        emit WorkerUpdated(msg.sender, workers[msg.sender].stake);
    }
    
    /**
     * @dev Deactivate worker and withdraw stake
     */
    function deactivateWorker() external nonReentrant {
        Worker storage worker = workers[msg.sender];
        require(worker.active, "Not active");
        
        worker.active = false;
        uint256 stakeReturn = worker.stake;
        worker.stake = 0;
        
        require(axxToken.transfer(msg.sender, stakeReturn), "Transfer failed");
        
        emit WorkerDeactivated(msg.sender);
    }
    
    // ==========================================================================
    // Job Management
    // ==========================================================================
    
    /**
     * @dev Create a new compute job
     * @param jobType Type of job (Inference, Training, etc.)
     * @param reward Reward amount in AXX tokens
     * @param timeout Maximum time for job completion (seconds)
     * @param inputHash IPFS hash of job input data
     */
    function createJob(
        JobType jobType,
        uint256 reward,
        uint256 timeout,
        bytes32 inputHash
    ) external nonReentrant returns (uint256 jobId) {
        require(reward > 0, "Reward must be positive");
        require(timeout >= 60, "Timeout too short");
        
        // Transfer reward + deposit to contract
        uint256 deposit = reward / 10; // 10% deposit
        uint256 totalAmount = reward + deposit;
        
        require(
            axxToken.transferFrom(msg.sender, address(this), totalAmount),
            "Payment transfer failed"
        );
        
        jobId = nextJobId++;
        
        jobs[jobId] = Job({
            id: jobId,
            submitter: msg.sender,
            worker: address(0),
            jobType: jobType,
            status: JobStatus.Pending,
            reward: reward,
            deposit: deposit,
            timeout: timeout,
            createdAt: block.timestamp,
            assignedAt: 0,
            completedAt: 0,
            inputHash: inputHash,
            resultHash: bytes32(0),
            proofHash: bytes32(0)
        });
        
        submitterJobs[msg.sender].push(jobId);
        
        emit JobCreated(jobId, msg.sender, jobType, reward, inputHash);
    }
    
    /**
     * @dev Assign a job to yourself (as a worker)
     * @param jobId Job ID to claim
     */
    function assignJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        Worker storage worker = workers[msg.sender];
        
        require(job.status == JobStatus.Pending, "Job not available");
        require(worker.active, "Worker not active");
        require(worker.stake >= minStake, "Insufficient stake");
        
        job.worker = msg.sender;
        job.status = JobStatus.Assigned;
        job.assignedAt = block.timestamp;
        
        workerJobs[msg.sender].push(jobId);
        
        emit JobAssigned(jobId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Submit job result
     * @param jobId Job ID
     * @param resultHash IPFS hash of result data
     * @param proofHash Merkle proof hash for verification
     */
    function submitResult(
        uint256 jobId,
        bytes32 resultHash,
        bytes32 proofHash
    ) external nonReentrant {
        Job storage job = jobs[jobId];
        
        require(job.status == JobStatus.Assigned, "Job not assigned");
        require(job.worker == msg.sender, "Not assigned worker");
        require(block.timestamp <= job.assignedAt + job.timeout, "Job timed out");
        
        job.resultHash = resultHash;
        job.proofHash = proofHash;
        job.status = JobStatus.Completed;
        job.completedAt = block.timestamp;
        
        // Update worker stats
        workers[msg.sender].jobsCompleted++;
        workers[msg.sender].reputation = 
            (workers[msg.sender].reputation * 99 + 100) / 100; // Slight increase
        
        emit JobCompleted(jobId, msg.sender, resultHash, proofHash);
    }
    
    /**
     * @dev Claim reward after dispute period
     * @param jobId Job ID
     */
    function claimReward(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        
        require(job.status == JobStatus.Completed, "Job not completed");
        require(job.worker == msg.sender, "Not the worker");
        require(
            block.timestamp >= job.completedAt + disputePeriod,
            "Dispute period not over"
        );
        
        uint256 platformFee = (job.reward * platformFeeRate) / 10000;
        uint256 workerReward = job.reward - platformFee;
        
        // Transfer reward to worker
        require(axxToken.transfer(msg.sender, workerReward), "Reward transfer failed");
        
        // Return deposit to submitter
        require(axxToken.transfer(job.submitter, job.deposit), "Deposit return failed");
        
        // Platform fee stays in contract (can be withdrawn by owner)
        
        emit RewardClaimed(jobId, msg.sender, workerReward);
    }
    
    /**
     * @dev Dispute a completed job (within dispute period)
     * @param jobId Job ID
     */
    function disputeJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        
        require(job.status == JobStatus.Completed, "Job not completed");
        require(job.submitter == msg.sender, "Not the submitter");
        require(
            block.timestamp < job.completedAt + disputePeriod,
            "Dispute period over"
        );
        
        job.status = JobStatus.Disputed;
        
        emit JobDisputed(jobId, msg.sender);
    }
    
    /**
     * @dev Cancel a pending job
     * @param jobId Job ID
     */
    function cancelJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        
        require(job.status == JobStatus.Pending, "Job not pending");
        require(job.submitter == msg.sender, "Not the submitter");
        
        job.status = JobStatus.Cancelled;
        
        // Return full amount to submitter
        uint256 refundAmount = job.reward + job.deposit;
        require(axxToken.transfer(msg.sender, refundAmount), "Refund failed");
        
        emit JobCancelled(jobId);
    }
    
    // ==========================================================================
    // Admin Functions
    // ==========================================================================
    
    function setMinStake(uint256 _minStake) external onlyOwner {
        minStake = _minStake;
    }
    
    function setPlatformFeeRate(uint256 _rate) external onlyOwner {
        require(_rate <= 1000, "Fee too high"); // Max 10%
        platformFeeRate = _rate;
    }
    
    function setDisputePeriod(uint256 _period) external onlyOwner {
        disputePeriod = _period;
    }
    
    function withdrawFees(address to, uint256 amount) external onlyOwner {
        require(axxToken.transfer(to, amount), "Transfer failed");
    }
    
    // ==========================================================================
    // View Functions
    // ==========================================================================
    
    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }
    
    function getWorker(address addr) external view returns (Worker memory) {
        return workers[addr];
    }
    
    function getSubmitterJobs(address submitter) external view returns (uint256[] memory) {
        return submitterJobs[submitter];
    }
    
    function getWorkerJobs(address worker) external view returns (uint256[] memory) {
        return workerJobs[worker];
    }
    
    function getActiveWorkers() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < registeredWorkers.length; i++) {
            if (workers[registeredWorkers[i]].active) count++;
        }
        
        address[] memory active = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < registeredWorkers.length; i++) {
            if (workers[registeredWorkers[i]].active) {
                active[idx++] = registeredWorkers[i];
            }
        }
        
        return active;
    }
    
    function getPendingJobs() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextJobId; i++) {
            if (jobs[i].status == JobStatus.Pending) count++;
        }
        
        uint256[] memory pending = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i < nextJobId; i++) {
            if (jobs[i].status == JobStatus.Pending) {
                pending[idx++] = i;
            }
        }
        
        return pending;
    }
}
