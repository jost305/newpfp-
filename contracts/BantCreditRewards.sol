// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBantCreditsMintable {
    function mint(address to, uint256 amount) external returns (bool);
}

/**
 * @title BantCreditRewards
 * @notice Merkle-claim distributor for onchain BantCredits.
 *
 * Each leaf is keccak256(abi.encode(batchId, account, amount, role, matchId)).
 * role can be ENS_OWNER, SPECTATOR, FIGHTER_OWNER, BONUS, etc.
 */
contract BantCreditRewards {
    struct RewardBatch {
        bytes32 merkleRoot;
        bytes32 metadataHash;
        uint64 activatedAt;
        uint256 totalBantCredits;
        bool active;
    }

    address public owner;
    IBantCreditsMintable public immutable bantCredits;

    mapping(bytes32 => RewardBatch) public rewardBatches;
    mapping(bytes32 => bool) public claimedLeaf;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RewardBatchUpdated(
        bytes32 indexed batchId,
        bytes32 merkleRoot,
        bytes32 metadataHash,
        uint256 totalBantCredits,
        bool active
    );
    event BantCreditsClaimed(
        bytes32 indexed batchId,
        bytes32 indexed matchId,
        address indexed account,
        bytes32 role,
        uint256 amount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address initialOwner, address bantCreditsAddress) {
        require(initialOwner != address(0), "Invalid owner");
        require(bantCreditsAddress != address(0), "Invalid BantCredits");
        owner = initialOwner;
        bantCredits = IBantCreditsMintable(bantCreditsAddress);
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setRewardBatch(
        bytes32 batchId,
        bytes32 merkleRoot,
        bytes32 metadataHash,
        uint256 totalBantCredits,
        bool active
    ) external onlyOwner {
        require(batchId != bytes32(0), "Invalid batch");
        require(merkleRoot != bytes32(0), "Invalid root");

        rewardBatches[batchId] = RewardBatch({
            merkleRoot: merkleRoot,
            metadataHash: metadataHash,
            activatedAt: uint64(block.timestamp),
            totalBantCredits: totalBantCredits,
            active: active
        });

        emit RewardBatchUpdated(batchId, merkleRoot, metadataHash, totalBantCredits, active);
    }

    function claim(
        bytes32 batchId,
        address account,
        uint256 amount,
        bytes32 role,
        bytes32 matchId,
        bytes32[] calldata proof
    ) external returns (bool) {
        require(account == msg.sender, "Claim your own rewards");
        require(amount > 0, "Invalid amount");

        RewardBatch memory batch = rewardBatches[batchId];
        require(batch.active, "Batch inactive");

        bytes32 leaf = rewardLeaf(batchId, account, amount, role, matchId);
        require(!claimedLeaf[leaf], "Already claimed");
        require(_verify(proof, batch.merkleRoot, leaf), "Invalid proof");

        claimedLeaf[leaf] = true;
        require(bantCredits.mint(account, amount), "Mint failed");

        emit BantCreditsClaimed(batchId, matchId, account, role, amount);
        return true;
    }

    function rewardLeaf(
        bytes32 batchId,
        address account,
        uint256 amount,
        bytes32 role,
        bytes32 matchId
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(batchId, account, amount, role, matchId));
    }

    function _verify(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; i += 1) {
            bytes32 sibling = proof[i];
            computed = computed <= sibling
                ? keccak256(abi.encodePacked(computed, sibling))
                : keccak256(abi.encodePacked(sibling, computed));
        }
        return computed == root;
    }
}
