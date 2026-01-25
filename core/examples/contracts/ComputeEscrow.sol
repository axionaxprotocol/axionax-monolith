// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ComputeEscrow
 * @dev Secure escrow contract for DeAI compute job payments
 * @author Axionax Protocol
 * 
 * This contract holds funds in escrow during job execution and handles:
 * - Deposits from job submitters
 * - Release to workers upon successful completion
 * - Refunds for cancelled or failed jobs
 * - Slashing for misbehaving workers
 */
contract ComputeEscrow is ReentrancyGuard, Ownable {
    // ==========================================================================
    // Types
    // ==========================================================================
    
    enum EscrowStatus {
        Empty,
        Funded,
        Released,
        Refunded,
        Slashed
    }
    
    struct Escrow {
        uint256 jobId;
        address depositor;
        address beneficiary;
        uint256 amount;
        uint256 slashableAmount;
        EscrowStatus status;
        uint256 createdAt;
        uint256 releaseTime;     // Time when release becomes possible
        uint256 expirationTime;  // Time when refund becomes possible
    }
    
    // ==========================================================================
    // State
    // ==========================================================================
    
    IERC20 public immutable token;
    address public jobMarketplace;
    
    mapping(uint256 => Escrow) public escrows;
    
    uint256 public totalLocked;
    uint256 public totalReleased;
    uint256 public totalRefunded;
    uint256 public totalSlashed;
    
    // ==========================================================================
    // Events
    // ==========================================================================
    
    event Deposited(
        uint256 indexed jobId,
        address indexed depositor,
        address indexed beneficiary,
        uint256 amount
    );
    
    event Released(
        uint256 indexed jobId,
        address indexed beneficiary,
        uint256 amount
    );
    
    event Refunded(
        uint256 indexed jobId,
        address indexed depositor,
        uint256 amount
    );
    
    event Slashed(
        uint256 indexed jobId,
        address indexed worker,
        uint256 amount
    );
    
    event BeneficiaryUpdated(uint256 indexed jobId, address newBeneficiary);
    
    // ==========================================================================
    // Modifiers
    // ==========================================================================
    
    modifier onlyMarketplace() {
        require(msg.sender == jobMarketplace, "Only marketplace");
        _;
    }
    
    // ==========================================================================
    // Constructor
    // ==========================================================================
    
    constructor(address _token) {
        token = IERC20(_token);
    }
    
    // ==========================================================================
    // Configuration
    // ==========================================================================
    
    function setJobMarketplace(address _marketplace) external onlyOwner {
        jobMarketplace = _marketplace;
    }
    
    // ==========================================================================
    // Core Functions
    // ==========================================================================
    
    /**
     * @dev Deposit funds into escrow for a job
     * @param jobId Unique job identifier
     * @param amount Amount to deposit
     * @param releaseDelay Time in seconds before release is allowed
     * @param expirationDelay Time in seconds before expiration (refund allowed)
     */
    function deposit(
        uint256 jobId,
        uint256 amount,
        uint256 releaseDelay,
        uint256 expirationDelay
    ) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(escrows[jobId].status == EscrowStatus.Empty, "Escrow exists");
        require(expirationDelay > releaseDelay, "Invalid delays");
        
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        escrows[jobId] = Escrow({
            jobId: jobId,
            depositor: msg.sender,
            beneficiary: address(0),
            amount: amount,
            slashableAmount: amount / 10, // 10% slashable
            status: EscrowStatus.Funded,
            createdAt: block.timestamp,
            releaseTime: block.timestamp + releaseDelay,
            expirationTime: block.timestamp + expirationDelay
        });
        
        totalLocked += amount;
        
        emit Deposited(jobId, msg.sender, address(0), amount);
    }
    
    /**
     * @dev Deposit with a specific beneficiary (worker) already known
     */
    function depositWithBeneficiary(
        uint256 jobId,
        address beneficiary,
        uint256 amount,
        uint256 releaseDelay,
        uint256 expirationDelay
    ) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(escrows[jobId].status == EscrowStatus.Empty, "Escrow exists");
        
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        escrows[jobId] = Escrow({
            jobId: jobId,
            depositor: msg.sender,
            beneficiary: beneficiary,
            amount: amount,
            slashableAmount: amount / 10,
            status: EscrowStatus.Funded,
            createdAt: block.timestamp,
            releaseTime: block.timestamp + releaseDelay,
            expirationTime: block.timestamp + expirationDelay
        });
        
        totalLocked += amount;
        
        emit Deposited(jobId, msg.sender, beneficiary, amount);
    }
    
    /**
     * @dev Set the beneficiary for an escrow (used when worker is assigned)
     * @param jobId Job ID
     * @param beneficiary Worker address
     */
    function setBeneficiary(uint256 jobId, address beneficiary) external {
        Escrow storage escrow = escrows[jobId];
        
        require(escrow.status == EscrowStatus.Funded, "Not funded");
        require(
            msg.sender == escrow.depositor || msg.sender == jobMarketplace,
            "Not authorized"
        );
        require(beneficiary != address(0), "Invalid beneficiary");
        
        escrow.beneficiary = beneficiary;
        
        emit BeneficiaryUpdated(jobId, beneficiary);
    }
    
    /**
     * @dev Release funds to the beneficiary (worker)
     * @param jobId Job ID
     */
    function release(uint256 jobId) external nonReentrant {
        Escrow storage escrow = escrows[jobId];
        
        require(escrow.status == EscrowStatus.Funded, "Not funded");
        require(escrow.beneficiary != address(0), "No beneficiary");
        require(
            msg.sender == escrow.depositor || msg.sender == jobMarketplace,
            "Not authorized"
        );
        require(block.timestamp >= escrow.releaseTime, "Too early");
        
        escrow.status = EscrowStatus.Released;
        uint256 amount = escrow.amount;
        
        totalLocked -= amount;
        totalReleased += amount;
        
        require(token.transfer(escrow.beneficiary, amount), "Transfer failed");
        
        emit Released(jobId, escrow.beneficiary, amount);
    }
    
    /**
     * @dev Refund to depositor (after expiration or cancellation)
     * @param jobId Job ID
     */
    function refund(uint256 jobId) external nonReentrant {
        Escrow storage escrow = escrows[jobId];
        
        require(escrow.status == EscrowStatus.Funded, "Not funded");
        require(
            msg.sender == escrow.depositor || 
            msg.sender == jobMarketplace ||
            block.timestamp >= escrow.expirationTime,
            "Not authorized or too early"
        );
        
        escrow.status = EscrowStatus.Refunded;
        uint256 amount = escrow.amount;
        
        totalLocked -= amount;
        totalRefunded += amount;
        
        require(token.transfer(escrow.depositor, amount), "Transfer failed");
        
        emit Refunded(jobId, escrow.depositor, amount);
    }
    
    /**
     * @dev Slash worker's portion for misbehavior
     * @param jobId Job ID
     * @param slashAmount Amount to slash (up to slashableAmount)
     */
    function slash(uint256 jobId, uint256 slashAmount) external onlyMarketplace nonReentrant {
        Escrow storage escrow = escrows[jobId];
        
        require(escrow.status == EscrowStatus.Funded, "Not funded");
        require(slashAmount <= escrow.slashableAmount, "Slash too high");
        require(escrow.beneficiary != address(0), "No beneficiary to slash");
        
        escrow.status = EscrowStatus.Slashed;
        
        uint256 toSlash = slashAmount;
        uint256 toRefund = escrow.amount - toSlash;
        
        totalLocked -= escrow.amount;
        totalSlashed += toSlash;
        totalRefunded += toRefund;
        
        // Refund most to depositor
        if (toRefund > 0) {
            require(token.transfer(escrow.depositor, toRefund), "Refund failed");
        }
        
        // Slashed amount goes to treasury (owner)
        if (toSlash > 0) {
            require(token.transfer(owner(), toSlash), "Slash transfer failed");
        }
        
        emit Slashed(jobId, escrow.beneficiary, toSlash);
    }
    
    /**
     * @dev Partial release - release to worker and refund remainder
     * @param jobId Job ID
     * @param releaseAmount Amount to release to worker
     */
    function partialRelease(uint256 jobId, uint256 releaseAmount) external onlyMarketplace nonReentrant {
        Escrow storage escrow = escrows[jobId];
        
        require(escrow.status == EscrowStatus.Funded, "Not funded");
        require(escrow.beneficiary != address(0), "No beneficiary");
        require(releaseAmount <= escrow.amount, "Amount too high");
        
        escrow.status = EscrowStatus.Released;
        
        uint256 refundAmount = escrow.amount - releaseAmount;
        
        totalLocked -= escrow.amount;
        totalReleased += releaseAmount;
        totalRefunded += refundAmount;
        
        if (releaseAmount > 0) {
            require(token.transfer(escrow.beneficiary, releaseAmount), "Release failed");
        }
        if (refundAmount > 0) {
            require(token.transfer(escrow.depositor, refundAmount), "Refund failed");
        }
        
        emit Released(jobId, escrow.beneficiary, releaseAmount);
    }
    
    // ==========================================================================
    // View Functions
    // ==========================================================================
    
    function getEscrow(uint256 jobId) external view returns (Escrow memory) {
        return escrows[jobId];
    }
    
    function getEscrowStatus(uint256 jobId) external view returns (EscrowStatus) {
        return escrows[jobId].status;
    }
    
    function getEscrowAmount(uint256 jobId) external view returns (uint256) {
        return escrows[jobId].amount;
    }
    
    function isReleasable(uint256 jobId) external view returns (bool) {
        Escrow storage escrow = escrows[jobId];
        return escrow.status == EscrowStatus.Funded && 
               block.timestamp >= escrow.releaseTime;
    }
    
    function isExpired(uint256 jobId) external view returns (bool) {
        Escrow storage escrow = escrows[jobId];
        return escrow.status == EscrowStatus.Funded && 
               block.timestamp >= escrow.expirationTime;
    }
    
    function getStats() external view returns (
        uint256 _totalLocked,
        uint256 _totalReleased,
        uint256 _totalRefunded,
        uint256 _totalSlashed
    ) {
        return (totalLocked, totalReleased, totalRefunded, totalSlashed);
    }
}
