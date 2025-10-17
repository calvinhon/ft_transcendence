const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TournamentRankings Contract", function () {
  let tournament;
  let owner, player1, player2;

  beforeEach(async function () {
    // Get signers
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy the contract
    const Tournament = await ethers.getContractFactory("TournamentRankings");
    tournament = await Tournament.deploy();
    await tournament.waitForDeployment();
  });

  it("Owner can record ranks", async function () {
    // Owner records player1's rank as 1 in tournament 1
    await tournament.recordRank(1, player1.address, 1);

    // Retrieve the rank using the public mapping
    const rank = await tournament.tournamentRankings(1, player1.address);
    expect(rank).to.equal(1n);
  });

  it("Should retrieve rank using getRank function", async function () {
    // Record ranks for multiple players
    await tournament.recordRank(1, player1.address, 1);
    await tournament.recordRank(1, player2.address, 2);

    // Get ranks
    const rank1 = await tournament.getRank(1, player1.address);
    const rank2 = await tournament.getRank(1, player2.address);

    expect(rank1).to.equal(1n);
    expect(rank2).to.equal(2n);
  });

  it("Should emit RankRecorded event", async function () {
    await expect(tournament.recordRank(1, player1.address, 1))
      .to.emit(tournament, "RankRecorded")
      .withArgs(1, player1.address, 1);
  });

  it("Should revert if non-owner tries to record rank", async function () {
    await expect(
      tournament.connect(player1).recordRank(1, player2.address, 1)
    ).to.be.revertedWith("Not authorized");
  });

  it("Should return correct owner address", async function () {
    const contractOwner = await tournament.owner();
    expect(contractOwner).to.equal(owner.address);
  });
});