# Smart Contract Examples 📜

**Protocol Version**: v1.8.0-testnet  
**Last Updated**: December 5, 2025  
**Target**: Smart Contract Developers

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [ERC-20 Token](#erc-20-token)
3. [ERC-721 NFT](#erc-721-nft)
4. [ERC-1155 Multi-Token](#erc-1155-multi-token)
5. [DeFi Examples](#defi-examples)
6. [Governance Contracts](#governance-contracts)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Verification](#verification)

---

## 🚀 Getting Started

### Prerequisites

```bash
# Install Node.js 18+
node --version

# Install pnpm
npm install -g pnpm

# Install Hardhat
pnpm add -D hardhat

# Install Foundry (alternative)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Network Configuration

**Hardhat config** (`hardhat.config.ts`):

```typescript
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    axionaxTestnet: {
      url: 'https://testnet-rpc.axionax.org',
      chainId: 86137,
      accounts: [process.env.PRIVATE_KEY!],
      gasPrice: 20000000000, // 20 gwei
    },
  },
  etherscan: {
    apiKey: {
      axionaxTestnet: 'your-api-key', // For verification
    },
    customChains: [
      {
        network: 'axionaxTestnet',
        chainId: 86137,
        urls: {
          apiURL: 'https://explorer-api.axionax.org/api',
          browserURL: 'https://explorer.axionax.org',
        },
      },
    ],
  },
};

export default config;
```

**Foundry config** (`foundry.toml`):

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
axionax_testnet = "https://testnet-rpc.axionax.org"

[etherscan]
axionax_testnet = { key = "${ETHERSCAN_API_KEY}", chain = 86137, url = "https://explorer-api.axionax.org/api" }
```

---

## 🪙 ERC-20 Token

### Basic ERC-20 Implementation

**File**: `contracts/MyToken.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyToken
 * @dev ERC-20 token with burn functionality and owner-controlled minting
 */
contract MyToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens

    event Mint(address indexed to, uint256 amount);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds max");
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Mint new tokens (only owner)
     * @param to Address to receive tokens
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit Mint(to, amount);
    }
}
```

### Advanced ERC-20 with Snapshots

**File**: `contracts/SnapshotToken.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SnapshotToken
 * @dev ERC-20 token with snapshot functionality for governance/dividends
 */
contract SnapshotToken is ERC20, ERC20Snapshot, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Create a snapshot (only owner)
     * @return Snapshot ID
     */
    function snapshot() external onlyOwner returns (uint256) {
        return _snapshot();
    }

    // Override required by Solidity
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Snapshot) {
        super._update(from, to, value);
    }
}
```

### Deployment Script (Hardhat)

**File**: `scripts/deploy-token.ts`

```typescript
import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying MyToken with account:', deployer.address);
  console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy token
  const MyToken = await ethers.getContractFactory('MyToken');
  const token = await MyToken.deploy(
    'My Token', // Name
    'MTK', // Symbol
    ethers.parseEther('1000000'), // Initial supply: 1M tokens
  );

  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log('MyToken deployed to:', tokenAddress);
  console.log('Total supply:', ethers.formatEther(await token.totalSupply()));

  // Verify on explorer
  console.log('\nVerify with:');
  console.log(
    `npx hardhat verify --network axionaxTestnet ${tokenAddress} "My Token" "MTK" "1000000000000000000000000"`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Deploy**:

```bash
npx hardhat run scripts/deploy-token.ts --network axionaxTestnet
```

---

## 🎨 ERC-721 NFT

### Basic NFT Implementation

**File**: `contracts/MyNFT.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MyNFT
 * @dev ERC-721 NFT with metadata URI storage
 */
contract MyNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public mintPrice = 0.01 ether;

    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor() ERC721("My NFT Collection", "MNFT") Ownable(msg.sender) {}

    /**
     * @dev Mint a new NFT
     * @param to Address to receive NFT
     * @param uri Metadata URI
     */
    function mint(address to, string memory uri) external payable returns (uint256) {
        require(_tokenIds.current() < MAX_SUPPLY, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, uri);

        emit NFTMinted(to, newTokenId, uri);
        return newTokenId;
    }

    /**
     * @dev Update mint price (only owner)
     */
    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
    }

    /**
     * @dev Withdraw contract balance (only owner)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }

    // Overrides required by Solidity
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

### NFT with Enumerable Extension

**File**: `contracts/EnumerableNFT.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EnumerableNFT
 * @dev NFT with enumeration support for querying all tokens
 */
contract EnumerableNFT is ERC721, ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURI;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    function mint(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    // Overrides required
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

### Metadata Example

**File**: `metadata/1.json`

```json
{
  "name": "My NFT #1",
  "description": "A unique digital collectible on axionax",
  "image": "ipfs://QmXxx.../1.png",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Power",
      "value": 95
    },
    {
      "trait_type": "Element",
      "value": "Fire"
    }
  ]
}
```

---

## 🎮 ERC-1155 Multi-Token

### Basic ERC-1155 Implementation

**File**: `contracts/MyMultiToken.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title MyMultiToken
 * @dev ERC-1155 multi-token standard (fungible + non-fungible)
 */
contract MyMultiToken is ERC1155, Ownable {
    string public name = "My Multi Token";
    string public symbol = "MMT";

    uint256 public constant GOLD = 0;
    uint256 public constant SILVER = 1;
    uint256 public constant BRONZE = 2;
    uint256 public constant SWORD = 100;
    uint256 public constant SHIELD = 101;

    constructor() ERC1155("https://api.axionax.org/metadata/{id}.json") Ownable(msg.sender) {
        // Mint initial supply of fungible tokens
        _mint(msg.sender, GOLD, 1000, "");
        _mint(msg.sender, SILVER, 5000, "");
        _mint(msg.sender, BRONZE, 10000, "");
    }

    /**
     * @dev Mint tokens (only owner)
     */
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external onlyOwner {
        _mint(to, id, amount, data);
    }

    /**
     * @dev Batch mint (only owner)
     */
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    /**
     * @dev Update URI (only owner)
     */
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}
```

---

## 💰 DeFi Examples

### Simple Staking Contract

**File**: `contracts/SimpleStaking.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleStaking
 * @dev Stake tokens and earn rewards
 */
contract SimpleStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    uint256 public rewardRate = 100; // 100 tokens per day per staked token
    uint256 public constant RATE_DENOMINATOR = 10000;

    struct Stake {
        uint256 amount;
        uint256 timestamp;
        uint256 rewardDebt;
    }

    mapping(address => Stake) public stakes;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);

    constructor(
        address _stakingToken,
        address _rewardToken
    ) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    /**
     * @dev Stake tokens
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");

        // Claim pending rewards first
        if (stakes[msg.sender].amount > 0) {
            _claimReward(msg.sender);
        }

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        stakes[msg.sender].amount += amount;
        stakes[msg.sender].timestamp = block.timestamp;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    /**
     * @dev Unstake tokens
     */
    function unstake(uint256 amount) external nonReentrant {
        require(stakes[msg.sender].amount >= amount, "Insufficient stake");

        _claimReward(msg.sender);

        stakes[msg.sender].amount -= amount;
        totalStaked -= amount;

        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Claim rewards
     */
    function claimReward() external nonReentrant {
        _claimReward(msg.sender);
    }

    /**
     * @dev Calculate pending rewards
     */
    function pendingReward(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (userStake.amount == 0) return 0;

        uint256 timeElapsed = block.timestamp - userStake.timestamp;
        uint256 reward = (userStake.amount * rewardRate * timeElapsed) /
                        (RATE_DENOMINATOR * 1 days);

        return reward - userStake.rewardDebt;
    }

    /**
     * @dev Internal reward claim
     */
    function _claimReward(address user) private {
        uint256 reward = pendingReward(user);
        if (reward > 0) {
            stakes[user].rewardDebt += reward;
            stakes[user].timestamp = block.timestamp;
            rewardToken.safeTransfer(user, reward);
            emit RewardClaimed(user, reward);
        }
    }

    /**
     * @dev Update reward rate (only owner)
     */
    function setRewardRate(uint256 newRate) external onlyOwner {
        rewardRate = newRate;
    }
}
```

### Simple DEX (Automated Market Maker)

**File**: `contracts/SimpleDEX.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleDEX
 * @dev Simple constant product AMM (x * y = k)
 */
contract SimpleDEX is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token0;
    IERC20 public immutable token1;

    uint256 public reserve0;
    uint256 public reserve1;

    uint256 public totalShares;
    mapping(address => uint256) public shares;

    uint256 public constant FEE_PERCENT = 3; // 0.3%
    uint256 public constant FEE_DENOMINATOR = 1000;

    event Swap(
        address indexed user,
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut
    );
    event AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 shares);
    event RemoveLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 shares);

    constructor(address _token0, address _token1) {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }

    /**
     * @dev Add liquidity to the pool
     */
    function addLiquidity(
        uint256 amount0,
        uint256 amount1
    ) external nonReentrant returns (uint256 liquidityShares) {
        require(amount0 > 0 && amount1 > 0, "Invalid amounts");

        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        if (totalShares == 0) {
            liquidityShares = sqrt(amount0 * amount1);
        } else {
            liquidityShares = min(
                (amount0 * totalShares) / reserve0,
                (amount1 * totalShares) / reserve1
            );
        }

        require(liquidityShares > 0, "Insufficient liquidity minted");

        shares[msg.sender] += liquidityShares;
        totalShares += liquidityShares;

        _update(reserve0 + amount0, reserve1 + amount1);

        emit AddLiquidity(msg.sender, amount0, amount1, liquidityShares);
    }

    /**
     * @dev Remove liquidity from the pool
     */
    function removeLiquidity(
        uint256 liquidityShares
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(shares[msg.sender] >= liquidityShares, "Insufficient shares");

        amount0 = (liquidityShares * reserve0) / totalShares;
        amount1 = (liquidityShares * reserve1) / totalShares;

        require(amount0 > 0 && amount1 > 0, "Insufficient liquidity burned");

        shares[msg.sender] -= liquidityShares;
        totalShares -= liquidityShares;

        _update(reserve0 - amount0, reserve1 - amount1);

        token0.safeTransfer(msg.sender, amount0);
        token1.safeTransfer(msg.sender, amount1);

        emit RemoveLiquidity(msg.sender, amount0, amount1, liquidityShares);
    }

    /**
     * @dev Swap token0 for token1
     */
    function swap0to1(uint256 amountIn) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid amount");

        uint256 amountInWithFee = (amountIn * (FEE_DENOMINATOR - FEE_PERCENT)) / FEE_DENOMINATOR;
        amountOut = (amountInWithFee * reserve1) / (reserve0 + amountInWithFee);

        require(amountOut > 0, "Insufficient output");

        token0.safeTransferFrom(msg.sender, address(this), amountIn);
        token1.safeTransfer(msg.sender, amountOut);

        _update(reserve0 + amountIn, reserve1 - amountOut);

        emit Swap(msg.sender, address(token0), amountIn, amountOut);
    }

    /**
     * @dev Swap token1 for token0
     */
    function swap1to0(uint256 amountIn) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid amount");

        uint256 amountInWithFee = (amountIn * (FEE_DENOMINATOR - FEE_PERCENT)) / FEE_DENOMINATOR;
        amountOut = (amountInWithFee * reserve0) / (reserve1 + amountInWithFee);

        require(amountOut > 0, "Insufficient output");

        token1.safeTransferFrom(msg.sender, address(this), amountIn);
        token0.safeTransfer(msg.sender, amountOut);

        _update(reserve0 - amountOut, reserve1 + amountIn);

        emit Swap(msg.sender, address(token1), amountIn, amountOut);
    }

    /**
     * @dev Update reserves
     */
    function _update(uint256 _reserve0, uint256 _reserve1) private {
        reserve0 = _reserve0;
        reserve1 = _reserve1;
    }

    // Helper functions
    function sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint256 x, uint256 y) private pure returns (uint256) {
        return x < y ? x : y;
    }
}
```

---

## 🏛️ Governance Contracts

### Simple DAO

**File**: `contracts/SimpleDAO.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleDAO
 * @dev Simple governance with token-weighted voting
 */
contract SimpleDAO is Ownable {
    IERC20 public immutable governanceToken;

    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant EXECUTION_DELAY = 1 days;
    uint256 public constant QUORUM_PERCENT = 10; // 10% of total supply

    enum ProposalState { Pending, Active, Defeated, Succeeded, Executed }

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        address target;
        bytes callData;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    mapping(uint256 => Proposal) public proposals;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _governanceToken) Ownable(msg.sender) {
        governanceToken = IERC20(_governanceToken);
    }

    /**
     * @dev Create a new proposal
     */
    function propose(
        string memory description,
        address target,
        bytes memory callData
    ) external returns (uint256) {
        require(
            governanceToken.balanceOf(msg.sender) >= getProposalThreshold(),
            "Below proposal threshold"
        );

        uint256 proposalId = proposalCount++;
        Proposal storage newProposal = proposals[proposalId];

        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.description = description;
        newProposal.target = target;
        newProposal.callData = callData;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + VOTING_PERIOD;

        emit ProposalCreated(proposalId, msg.sender, description);
        return proposalId;
    }

    /**
     * @dev Cast a vote
     */
    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];

        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        proposal.hasVoted[msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /**
     * @dev Execute a passed proposal
     */
    function execute(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];

        require(block.timestamp > proposal.endTime + EXECUTION_DELAY, "Still in delay");
        require(!proposal.executed, "Already executed");
        require(getProposalState(proposalId) == ProposalState.Succeeded, "Proposal not succeeded");

        proposal.executed = true;

        (bool success, ) = proposal.target.call(proposal.callData);
        require(success, "Execution failed");

        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Get proposal state
     */
    function getProposalState(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.executed) return ProposalState.Executed;
        if (block.timestamp <= proposal.endTime) return ProposalState.Active;

        uint256 totalSupply = governanceToken.totalSupply();
        uint256 quorum = (totalSupply * QUORUM_PERCENT) / 100;

        if (proposal.forVotes + proposal.againstVotes < quorum) {
            return ProposalState.Defeated;
        }

        if (proposal.forVotes > proposal.againstVotes) {
            return ProposalState.Succeeded;
        }

        return ProposalState.Defeated;
    }

    /**
     * @dev Get minimum tokens needed to propose
     */
    function getProposalThreshold() public view returns (uint256) {
        return (governanceToken.totalSupply() * 1) / 100; // 1% of total supply
    }
}
```

---

## 🧪 Testing

### Test Example (Hardhat)

**File**: `test/MyToken.test.ts`

```typescript
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { MyToken } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('MyToken', function () {
  let token: MyToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MyToken = await ethers.getContractFactory('MyToken');
    token = await MyToken.deploy('Test Token', 'TST', ethers.parseEther('1000000'));
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it('Should assign the total supply to the owner', async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });

    it('Should have correct name and symbol', async function () {
      expect(await token.name()).to.equal('Test Token');
      expect(await token.symbol()).to.equal('TST');
    });
  });

  describe('Transfers', function () {
    it('Should transfer tokens between accounts', async function () {
      await token.transfer(addr1.address, ethers.parseEther('50'));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther('50'));

      await token.connect(addr1).transfer(addr2.address, ethers.parseEther('25'));
      expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther('25'));
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      await expect(
        token.connect(addr1).transfer(owner.address, ethers.parseEther('1')),
      ).to.be.revertedWithCustomError(token, 'ERC20InsufficientBalance');

      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });

  describe('Minting', function () {
    it('Should allow owner to mint', async function () {
      await token.mint(addr1.address, ethers.parseEther('100'));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther('100'));
    });

    it('Should not allow non-owner to mint', async function () {
      await expect(
        token.connect(addr1).mint(addr2.address, ethers.parseEther('100')),
      ).to.be.revertedWithCustomError(token, 'OwnableUnauthorizedAccount');
    });

    it('Should not exceed max supply', async function () {
      const maxSupply = await token.MAX_SUPPLY();
      const currentSupply = await token.totalSupply();
      const remaining = maxSupply - currentSupply;

      await expect(token.mint(addr1.address, remaining + 1n)).to.be.revertedWith(
        'Exceeds max supply',
      );
    });
  });

  describe('Burning', function () {
    it('Should allow token holders to burn their tokens', async function () {
      await token.transfer(addr1.address, ethers.parseEther('100'));
      await token.connect(addr1).burn(ethers.parseEther('50'));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther('50'));
    });
  });
});
```

### Run Tests

```bash
# Run all tests
npx hardhat test

# Run specific test
npx hardhat test test/MyToken.test.ts

# With gas reporting
REPORT_GAS=true npx hardhat test

# With coverage
npx hardhat coverage
```

---

## 🚀 Deployment

### Deploy with Hardhat

**Script**: `scripts/deploy.ts`

```typescript
import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying to axionax Testnet...');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy MyToken
  const MyToken = await ethers.getContractFactory('MyToken');
  const token = await MyToken.deploy('My Token', 'MTK', ethers.parseEther('1000000'));
  await token.waitForDeployment();
  console.log('MyToken deployed to:', await token.getAddress());

  // Deploy MyNFT
  const MyNFT = await ethers.getContractFactory('MyNFT');
  const nft = await MyNFT.deploy();
  await nft.waitForDeployment();
  console.log('MyNFT deployed to:', await nft.getAddress());

  // Save addresses
  const addresses = {
    MyToken: await token.getAddress(),
    MyNFT: await nft.getAddress(),
    network: 'axionax-testnet',
    chainId: 86137,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log('\nDeployment complete!');
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Deploy**:

```bash
npx hardhat run scripts/deploy.ts --network axionaxTestnet
```

### Deploy with Foundry

**Script**: `script/Deploy.s.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MyToken.sol";
import "../src/MyNFT.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy MyToken
        MyToken token = new MyToken("My Token", "MTK", 1_000_000 ether);
        console.log("MyToken deployed to:", address(token));

        // Deploy MyNFT
        MyNFT nft = new MyNFT();
        console.log("MyNFT deployed to:", address(nft));

        vm.stopBroadcast();
    }
}
```

**Deploy**:

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $AXIONAX_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

---

## ✅ Verification

### Verify on Explorer (Hardhat)

```bash
npx hardhat verify --network axionaxTestnet \
  DEPLOYED_CONTRACT_ADDRESS \
  "Constructor" "Arguments" "Here"
```

**Example**:

```bash
npx hardhat verify --network axionaxTestnet \
  0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "My Token" "MTK" "1000000000000000000000000"
```

### Verify on Explorer (Foundry)

```bash
forge verify-contract \
  --chain-id 86137 \
  --num-of-optimizations 200 \
  --watch \
  --constructor-args $(cast abi-encode "constructor(string,string,uint256)" "My Token" "MTK" "1000000000000000000000000") \
  --etherscan-api-key YOUR_API_KEY \
  --compiler-version v0.8.20+commit.a1b79de6 \
  DEPLOYED_CONTRACT_ADDRESS \
  src/MyToken.sol:MyToken
```

---

## 📚 Additional Resources

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Foundry Book](https://book.getfoundry.sh/)
- [Solidity by Example](https://solidity-by-example.org/)
- [axionax Testnet Documentation](./JOIN_TESTNET.md)

---

**Last Updated**: December 5, 2025 | v1.8.0-testnet
