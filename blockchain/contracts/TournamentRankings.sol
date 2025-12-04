// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./ITournamentRankings.sol";

/**
 * @title TournamentRankings
 * @dev Smart contract for recording and retrieving tournament rankings
 * Implements immutable, decentralized tournament result storage
 */
contract TournamentRankings is ITournamentRankings {
    /// @dev Mapping of tournament ID to player address to rank
    mapping(uint256 tournamentId => mapping(address player => uint256 rank)) private _tournamentRankings;

    /// @dev Contract owner with exclusive modification rights
    address public immutable override owner;

    /**
     * @dev Constructor sets the contract deployer as owner
     */
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Modifier to restrict access to owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "TournamentRankings: caller is not the owner");
        _;
    }

    /**
     * @dev Record a player's rank in a tournament
     * @param tournamentId The unique tournament identifier
     * @param player The player's Ethereum address
     * @param rank The player's ranking position (must be > 0)
     *
     * Requirements:
     * - Only callable by contract owner
     * - tournamentId must be valid (non-zero)
     * - player address must be valid (non-zero)
     * - rank must be valid (non-zero)
     *
     * Emits a {RankRecorded} event
     */
    function recordRank(uint256 tournamentId, address player, uint256 rank) external override onlyOwner {
        require(tournamentId != 0, "TournamentRankings: invalid tournament ID");
        require(player != address(0), "TournamentRankings: invalid player address");
        require(rank != 0, "TournamentRankings: invalid rank");

        _tournamentRankings[tournamentId][player] = rank;
        emit RankRecorded(tournamentId, player, rank);
    }

    /**
     * @dev Retrieve a player's rank in a tournament
     * @param tournamentId The tournament identifier
     * @param player The player's Ethereum address
     * @return The player's rank (returns 0 if player has no rank in the tournament)
     */
    function getRank(uint256 tournamentId, address player) external view override returns (uint256) {
        return _tournamentRankings[tournamentId][player];
    }
}
