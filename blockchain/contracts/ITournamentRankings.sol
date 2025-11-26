// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title ITournamentRankings
 * @dev Interface for tournament ranking functionality
 */
interface ITournamentRankings {
    /**
     * @dev Emitted when a rank is recorded
     */
    event RankRecorded(uint256 indexed tournamentId, address indexed player, uint256 rank);

    /**
     * @dev Record a player's rank in a tournament
     * @param tournamentId The tournament identifier
     * @param player The player's address
     * @param rank The player's rank
     */
    function recordRank(uint256 tournamentId, address player, uint256 rank) external;

    /**
     * @dev Get a player's rank in a tournament
     * @param tournamentId The tournament identifier
     * @param player The player's address
     * @return The player's rank (0 if not ranked)
     */
    function getRank(uint256 tournamentId, address player) external view returns (uint256);

    /**
     * @dev Get the contract owner
     * @return The owner address
     */
    function owner() external view returns (address);
}