// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

contract TournamentRankings {
    struct Player {
        string name;
        uint256 rank;
    }

    mapping(uint256 tournId => mapping(address playerId => Player)) public tournaments;
    mapping(uint256 tournId => mapping(address playerId => bool)) public whitelistedPlayers;

    address public immutable owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    event PlayerWhitelisted(uint256 indexed tournamentId, address indexed player);
    event PlayerRegistered(uint256 indexed tournamentId, address indexed player, string name);
    event RankRecorded(uint256 indexed tournamentId, address indexed player, uint256 rank);

    function whitelistPlayer(uint256 tournamentId, address player) public onlyOwner {
        require(!whitelistedPlayers[tournamentId][player], "Already whitelisted");
        whitelistedPlayers[tournamentId][player] = true;
        emit PlayerWhitelisted(tournamentId, player);
    }

    function registerPlayer(uint256 tournamentId, string memory name) public {
        require(whitelistedPlayers[tournamentId][msg.sender], "Not whitelisted");
        require(bytes(tournaments[tournamentId][msg.sender].name).length == 0, "Already registered");

        tournaments[tournamentId][msg.sender] = Player(name, 0);

        emit PlayerRegistered(tournamentId, msg.sender, name);
    }

    function recordRank(uint256 tournamentId, address player, uint256 rank) public onlyOwner {
        require(bytes(tournaments[tournamentId][player].name).length != 0, "Player not registered");
        tournaments[tournamentId][player].rank = rank;
        emit RankRecorded(tournamentId, player, rank);
    }
}
