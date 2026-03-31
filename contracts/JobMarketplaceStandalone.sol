// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title JobMarketplace (Standalone — Axionax Testnet)
 * @dev Standalone version with no external imports.
 *      Matches the ABI in core/deai/job_marketplace.json exactly.
 *      Uses an inline IERC20 interface and a mutex-based reentrancy guard.
 * @author Axionax Protocol
 */

// ---------------------------------------------------------------------------
// Minimal IERC20 interface
// ---------------------------------------------------------------------------
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

// ---------------------------------------------------------------------------
// JobMarketplace
// ---------------------------------------------------------------------------
contract JobMarketplace {

    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    struct Worker {
        address addr;
        uint256 stake;
        uint256 reputation;
        uint256 jobsCompleted;
        uint256 jobsFailed;
        bool    active;
        uint256 registeredAt;
    }

    struct Job {
        uint256 id;
        address submitter;
        address worker;
        uint8   jobType;   // 0=Inference 1=Training 2=DataProcessing 3=Custom
        uint8   status;    // 0=Pending 1=Assigned 2=Completed 3=Disputed 4=Cancelled 5=Resolved
        uint256 reward;
        uint256 deposit;
        uint256 timeout;
        uint256 createdAt;
        uint256 assignedAt;
        uint256 completedAt;
        bytes32 inputHash;
        bytes32 resultHash;
        bytes32 proofHash;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    IERC20  public axxToken;
    uint256 public minStake;
    uint256 public platformFeeRate;  // basis points (100 = 1 %)
    uint256 public disputePeriod;    // seconds
    uint256 public nextJobId;
    address public owner;

    mapping(address => Worker)    private _workers;
    mapping(uint256 => Job)       private _jobs;
    mapping(address => uint256[]) private _submitterJobs;
    mapping(address => uint256[]) private _workerJobs;
    address[] private _workerList;

    // Pending-job index for O(1) removal
    uint256[] private _pendingJobIds;
    mapping(uint256 => uint256) private _pendingIdx;

    // Simple reentrancy guard
    bool private _locked;

    // -----------------------------------------------------------------------
    // Events  (must match job_marketplace.json ABI exactly)
    // -----------------------------------------------------------------------

    event WorkerRegistered(address indexed worker, uint256 stake);
    event WorkerUpdated   (address indexed worker, uint256 newStake);
    event WorkerDeactivated(address indexed worker);

    event JobCreated   (uint256 indexed jobId, address indexed submitter, uint8 jobType, uint256 reward, bytes32 inputHash);
    event JobAssigned  (uint256 indexed jobId, address indexed worker,    uint256 assignedAt);
    event JobCompleted (uint256 indexed jobId, address indexed worker,    bytes32 resultHash, bytes32 proofHash);
    event JobDisputed  (uint256 indexed jobId, address indexed disputer);
    event JobCancelled (uint256 indexed jobId);
    event JobRefunded  (uint256 indexed jobId);
    event RewardClaimed(uint256 indexed jobId, address indexed worker, uint256 amount);
    event SlashApplied (address indexed worker, uint256 amount);

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlyActiveWorker() {
        require(_workers[msg.sender].active, "not a registered active worker");
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(
        address _axxToken,
        uint256 _minStake,
        uint256 _platformFeeRate,
        uint256 _disputePeriod
    ) {
        require(_platformFeeRate <= 10_000, "fee rate > 100%");
        axxToken        = IERC20(_axxToken);
        minStake        = _minStake;
        platformFeeRate = _platformFeeRate;
        disputePeriod   = _disputePeriod;
        owner           = msg.sender;
        nextJobId       = 1;
    }

    // -----------------------------------------------------------------------
    // Worker management
    // -----------------------------------------------------------------------

    function registerWorker(uint256 stakeAmount) external nonReentrant {
        require(!_workers[msg.sender].active, "already registered");
        require(stakeAmount >= minStake,       "stake below minimum");
        require(
            axxToken.transferFrom(msg.sender, address(this), stakeAmount),
            "stake transfer failed"
        );
        _workers[msg.sender] = Worker({
            addr:          msg.sender,
            stake:         stakeAmount,
            reputation:    100,
            jobsCompleted: 0,
            jobsFailed:    0,
            active:        true,
            registeredAt:  block.timestamp
        });
        _workerList.push(msg.sender);
        emit WorkerRegistered(msg.sender, stakeAmount);
    }

    function addStake(uint256 amount) external nonReentrant onlyActiveWorker {
        require(amount > 0, "amount must be > 0");
        require(axxToken.transferFrom(msg.sender, address(this), amount), "transfer failed");
        _workers[msg.sender].stake += amount;
        emit WorkerUpdated(msg.sender, _workers[msg.sender].stake);
    }

    function deactivateWorker() external nonReentrant onlyActiveWorker {
        Worker storage w = _workers[msg.sender];
        w.active = false;
        uint256 stake = w.stake;
        w.stake = 0;
        require(axxToken.transfer(msg.sender, stake), "stake return failed");
        emit WorkerDeactivated(msg.sender);
    }

    // -----------------------------------------------------------------------
    // Job lifecycle
    // -----------------------------------------------------------------------

    function createJob(
        uint8   jobType,
        uint256 reward,
        uint256 timeout,
        bytes32 inputHash
    ) external nonReentrant returns (uint256 jobId) {
        require(reward  > 0,  "reward must be > 0");
        require(timeout >= 60, "timeout too short (min 60s)");
        uint256 deposit      = reward / 10;   // 10 % deposit
        uint256 totalAmount  = reward + deposit;
        require(
            axxToken.transferFrom(msg.sender, address(this), totalAmount),
            "payment transfer failed"
        );
        jobId = nextJobId++;
        _jobs[jobId] = Job({
            id:          jobId,
            submitter:   msg.sender,
            worker:      address(0),
            jobType:     jobType,
            status:      0,          // Pending
            reward:      reward,
            deposit:     deposit,
            timeout:     timeout,
            createdAt:   block.timestamp,
            assignedAt:  0,
            completedAt: 0,
            inputHash:   inputHash,
            resultHash:  bytes32(0),
            proofHash:   bytes32(0)
        });
        _pendingIdx[jobId]    = _pendingJobIds.length;
        _pendingJobIds.push(jobId);
        _submitterJobs[msg.sender].push(jobId);
        emit JobCreated(jobId, msg.sender, jobType, reward, inputHash);
    }

    function assignJob(uint256 jobId) external nonReentrant onlyActiveWorker {
        Job storage job = _jobs[jobId];
        require(job.id     != 0,             "job does not exist");
        require(job.status == 0,             "job not pending");
        require(job.worker == address(0),    "already assigned");
        job.worker     = msg.sender;
        job.status     = 1;   // Assigned
        job.assignedAt = block.timestamp;
        _removePending(jobId);
        _workerJobs[msg.sender].push(jobId);
        emit JobAssigned(jobId, msg.sender, block.timestamp);
    }

    function submitResult(
        uint256 jobId,
        bytes32 resultHash,
        bytes32 proofHash
    ) external nonReentrant {
        Job storage job = _jobs[jobId];
        require(job.id      != 0,           "job does not exist");
        require(job.worker  == msg.sender,  "not the assigned worker");
        require(job.status  == 1,           "job not assigned");
        require(block.timestamp <= job.assignedAt + job.timeout, "job timed out");
        job.resultHash  = resultHash;
        job.proofHash   = proofHash;
        job.status      = 2;   // Completed
        job.completedAt = block.timestamp;
        _workers[msg.sender].jobsCompleted += 1;
        if (_workers[msg.sender].reputation < 200) {
            _workers[msg.sender].reputation += 1;
        }
        emit JobCompleted(jobId, msg.sender, resultHash, proofHash);
    }

    function claimReward(uint256 jobId) external nonReentrant {
        Job storage job = _jobs[jobId];
        require(job.id     != 0,          "job does not exist");
        require(job.worker == msg.sender, "not the assigned worker");
        require(job.status == 2,          "job not completed");
        require(
            block.timestamp >= job.completedAt + disputePeriod,
            "dispute period not over"
        );
        uint256 fee          = (job.reward * platformFeeRate) / 10_000;
        uint256 workerReward = job.reward - fee;
        job.status  = 5;   // Resolved
        require(axxToken.transfer(msg.sender, workerReward), "reward transfer failed");
        require(axxToken.transfer(job.submitter, job.deposit), "deposit return failed");
        if (fee > 0) {
            require(axxToken.transfer(owner, fee), "fee transfer failed");
        }
        emit RewardClaimed(jobId, msg.sender, workerReward);
    }

    function disputeJob(uint256 jobId) external {
        Job storage job = _jobs[jobId];
        require(job.id        != 0,            "job does not exist");
        require(job.submitter == msg.sender,   "only submitter can dispute");
        require(job.status    == 2,            "job not completed");
        require(
            block.timestamp < job.completedAt + disputePeriod,
            "dispute period over"
        );
        job.status = 3;   // Disputed
        emit JobDisputed(jobId, msg.sender);
    }

    function cancelJob(uint256 jobId) external nonReentrant {
        Job storage job = _jobs[jobId];
        require(job.id        != 0,          "job does not exist");
        require(job.submitter == msg.sender, "not the submitter");
        require(job.status    == 0,          "can only cancel pending jobs");
        job.status = 4;   // Cancelled
        _removePending(jobId);
        uint256 refund = job.reward + job.deposit;
        job.deposit = 0;
        require(axxToken.transfer(msg.sender, refund), "refund failed");
        emit JobCancelled(jobId);
        emit JobRefunded(jobId);
    }

    // -----------------------------------------------------------------------
    // Owner: resolve disputed jobs
    // -----------------------------------------------------------------------

    function resolveDisputeAgainstWorker(uint256 jobId) external onlyOwner nonReentrant {
        Job storage job = _jobs[jobId];
        require(job.status == 3, "job not disputed");
        Worker storage w       = _workers[job.worker];
        uint256 slash          = job.deposit / 2;
        if (w.stake < slash) slash = w.stake;
        w.stake   -= slash;
        w.jobsFailed += 1;
        if (w.reputation > 10) w.reputation -= 10;
        job.status = 4;
        uint256 refund = job.deposit;
        job.deposit = 0;
        require(axxToken.transfer(job.submitter, refund), "refund failed");
        emit SlashApplied(job.worker, slash);
    }

    // -----------------------------------------------------------------------
    // Owner: config updates
    // -----------------------------------------------------------------------

    function setMinStake(uint256 _minStake) external onlyOwner {
        minStake = _minStake;
    }

    function setPlatformFeeRate(uint256 _rate) external onlyOwner {
        require(_rate <= 1_000, "max 10%");
        platformFeeRate = _rate;
    }

    function setDisputePeriod(uint256 _period) external onlyOwner {
        disputePeriod = _period;
    }

    function withdrawFees(address to, uint256 amount) external onlyOwner {
        require(axxToken.transfer(to, amount), "transfer failed");
    }

    // -----------------------------------------------------------------------
    // View functions  (match ABI exactly)
    // -----------------------------------------------------------------------

    function getJob(uint256 jobId) external view returns (Job memory) {
        require(_jobs[jobId].id != 0, "job does not exist");
        return _jobs[jobId];
    }

    function getWorker(address addr) external view returns (Worker memory) {
        return _workers[addr];
    }

    function getActiveWorkers() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _workerList.length; i++) {
            if (_workers[_workerList[i]].active) count++;
        }
        address[] memory active = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _workerList.length; i++) {
            if (_workers[_workerList[i]].active) active[idx++] = _workerList[i];
        }
        return active;
    }

    function getPendingJobs() external view returns (uint256[] memory) {
        return _pendingJobIds;
    }

    function getSubmitterJobs(address submitter) external view returns (uint256[] memory) {
        return _submitterJobs[submitter];
    }

    function getWorkerJobs(address worker) external view returns (uint256[] memory) {
        return _workerJobs[worker];
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    function _removePending(uint256 jobId) internal {
        uint256 idx     = _pendingIdx[jobId];
        uint256 lastId  = _pendingJobIds[_pendingJobIds.length - 1];
        _pendingJobIds[idx]  = lastId;
        _pendingIdx[lastId]  = idx;
        _pendingJobIds.pop();
        delete _pendingIdx[jobId];
    }
}
