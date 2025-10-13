const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TournamentRankings Contract", function () {
  let Tournament, tournament;
  let owner, player1, player2;

  beforeEach(async function () {
    // Get signers
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy the contract
    Tournament = await ethers.getContractFactory("TournamentRankings");
    tournament = await Tournament.deploy();
    await tournament.waitForDeployment(); // Updated method name for ethers v6
  });

  it("Owner can record ranks", async function () {
    await tournament.whitelistPlayer(1, player1.address);
    await tournament.connect(player1).registerPlayer(1, "Alice");

    await tournament.recordRank(1, player1.address, 1);

    const playerData = await tournament.tournaments(1, player1.address);
    expect(playerData.rank).to.equal(1n);
  });
});
