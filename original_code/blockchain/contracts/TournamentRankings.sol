// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

contract TournamentRankings {
    struct Rank {
        string name;
        uint256 value;
    }

    mapping(uint256 tournamentId => mapping(address player => uint256 rank)) public tournamentRankings;

    address public immutable owner;

    event RankRecorded(uint256 indexed tournamentId, address indexed player, uint256 rank);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    function recordRank(uint256 tournamentId, address player, uint256 rank) public onlyOwner {
        tournamentRankings[tournamentId][player] = rank;
        emit RankRecorded(tournamentId, player, rank);
    }

    function getRank(uint256 tournamentId, address player) public view returns (uint256) {
        return tournamentRankings[tournamentId][player];
    }
}
