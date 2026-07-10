// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BantCredits
 * @notice Non-transferable onchain points for Bantah simulated battles and spectator rewards.
 *
 * The token keeps an ERC20-like read surface so wallets and dashboards can display balances,
 * but user-to-user transfers are disabled. Authorized minters, such as BantCreditRewards,
 * can mint points after offchain rewards are anchored or claimed onchain.
 */
contract BantCredits {
    string public constant name = "BantCredits";
    string public constant symbol = "BANTC";
    uint8 public constant decimals = 0;

    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public isMinter;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MinterUpdated(address indexed minter, bool enabled);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyMinter() {
        require(isMinter[msg.sender] || msg.sender == owner, "Only minter");
        _;
    }

    constructor(address initialOwner) {
        require(initialOwner != address(0), "Invalid owner");
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setMinter(address minter, bool enabled) external onlyOwner {
        require(minter != address(0), "Invalid minter");
        isMinter[minter] = enabled;
        emit MinterUpdated(minter, enabled);
    }

    function mint(address to, uint256 amount) external onlyMinter returns (bool) {
        _mint(to, amount);
        return true;
    }

    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyMinter returns (bool) {
        require(recipients.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < recipients.length; i += 1) {
            _mint(recipients[i], amounts[i]);
        }
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address, uint256) external pure returns (bool) {
        revert("BantCredits are non-transferable");
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        revert("BantCredits are non-transferable");
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}
