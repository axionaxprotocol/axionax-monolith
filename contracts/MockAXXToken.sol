// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockAXXToken
 * @dev Minimal ERC-20 used on testnet to simulate AXX stake/reward flows.
 *      Anyone can mint (testnet only — NOT for production).
 */
contract MockAXXToken {
    string public constant name     = "Axionax Token (Testnet)";
    string public constant symbol   = "tAXX";
    uint8  public constant decimals = 18;

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 initialSupply) {
        _mint(msg.sender, initialSupply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(to != address(0), "zero address");
        require(balanceOf[msg.sender] >= value, "insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to]         += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        require(spender != address(0), "zero address");
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(to != address(0), "zero address");
        require(balanceOf[from] >= value, "insufficient balance");
        require(allowance[from][msg.sender] >= value, "allowance exceeded");
        allowance[from][msg.sender] -= value;
        balanceOf[from]             -= value;
        balanceOf[to]               += value;
        emit Transfer(from, to, value);
        return true;
    }

    function mint(address to, uint256 value) external returns (bool) {
        require(to != address(0), "zero address");
        _mint(to, value);
        return true;
    }

    function _mint(address to, uint256 value) internal {
        totalSupply    += value;
        balanceOf[to]  += value;
        emit Transfer(address(0), to, value);
    }
}
