// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

contract TournamentRankings {
    mapping(uint256 tournamentId => mapping(uint256 player => uint256 rank)) public tournamentRankings;

    address public immutable owner;

    event RankRecorded(uint256 indexed tournamentId, uint256 indexed player, uint256 rank);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    /**
     * Record multiple ranks for a tournament in a single transaction.
     * @param tournamentId the tournament identifier
     * @param players array of player ids
     * @param ranks array of ranks corresponding to players
     */
    function recordRanks(uint256 tournamentId, uint256[] calldata players, uint256[] calldata ranks) external onlyOwner {
        require(players.length == ranks.length, "Players and ranks length mismatch");
        for (uint256 i = 0; i < players.length; i++) {
            uint256 player = players[i];
            uint256 rank = ranks[i];
            tournamentRankings[tournamentId][player] = rank;
            emit RankRecorded(tournamentId, player, rank);
        }
    }
}
