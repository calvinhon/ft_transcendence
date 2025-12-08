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

    function recordRank(uint256 tournamentId, uint256 player, uint256 rank) public onlyOwner {
        tournamentRankings[tournamentId][player] = rank;
        emit RankRecorded(tournamentId, player, rank);
    }

    function getRank(uint256 tournamentId, uint256 player) public view returns (uint256) {
        return tournamentRankings[tournamentId][player];
    }
}
