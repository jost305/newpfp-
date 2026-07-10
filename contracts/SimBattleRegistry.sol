// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SimBattleRegistry
 * @notice Anchors Bantah simulated battle receipts onchain.
 *
 * Gameplay and ENS resolution can remain offchain. This registry records the Bantah-signed
 * final receipt: who owned the ENS at match close, who won, event/reward Merkle roots,
 * and the metadata hash for the offchain match payload.
 */
contract SimBattleRegistry {
    struct BattleReceipt {
        uint64 recordedAt;
        bytes32 ensNamehash;
        address ensOwner;
        address winner;
        bytes32 eventRoot;
        bytes32 rewardRoot;
        bytes32 metadataHash;
        uint256 totalBantCredits;
    }

    address public owner;
    mapping(address => bool) public isRecorder;
    mapping(bytes32 => BattleReceipt) public receipts;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RecorderUpdated(address indexed recorder, bool enabled);
    event SimulatedBattleRecorded(
        bytes32 indexed battleId,
        bytes32 indexed ensNamehash,
        address indexed ensOwner,
        address winner,
        bytes32 eventRoot,
        bytes32 rewardRoot,
        bytes32 metadataHash,
        uint256 totalBantCredits
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyRecorder() {
        require(isRecorder[msg.sender] || msg.sender == owner, "Only recorder");
        _;
    }

    constructor(address initialOwner) {
        require(initialOwner != address(0), "Invalid owner");
        owner = initialOwner;
        isRecorder[initialOwner] = true;
        emit OwnershipTransferred(address(0), initialOwner);
        emit RecorderUpdated(initialOwner, true);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setRecorder(address recorder, bool enabled) external onlyOwner {
        require(recorder != address(0), "Invalid recorder");
        isRecorder[recorder] = enabled;
        emit RecorderUpdated(recorder, enabled);
    }

    function recordSimulatedBattle(
        bytes32 battleId,
        bytes32 ensNamehash,
        address ensOwner,
        address winner,
        bytes32 eventRoot,
        bytes32 rewardRoot,
        bytes32 metadataHash,
        uint256 totalBantCredits
    ) external onlyRecorder returns (bool) {
        require(battleId != bytes32(0), "Invalid battle");
        require(receipts[battleId].recordedAt == 0, "Already recorded");
        require(ensOwner != address(0), "Invalid ENS owner");

        receipts[battleId] = BattleReceipt({
            recordedAt: uint64(block.timestamp),
            ensNamehash: ensNamehash,
            ensOwner: ensOwner,
            winner: winner,
            eventRoot: eventRoot,
            rewardRoot: rewardRoot,
            metadataHash: metadataHash,
            totalBantCredits: totalBantCredits
        });

        emit SimulatedBattleRecorded(
            battleId,
            ensNamehash,
            ensOwner,
            winner,
            eventRoot,
            rewardRoot,
            metadataHash,
            totalBantCredits
        );
        return true;
    }
}
