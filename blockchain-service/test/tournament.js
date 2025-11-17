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

  it("Owner should whitelist players", async function () {
    await tournament.whitelistPlayer(1, player1.address);
    await tournament.whitelistPlayer(1, player2.address);

    expect(await tournament.whitelistedPlayers(1, player1.address)).to.be.true;
    expect(await tournament.whitelistedPlayers(1, player2.address)).to.be.true;
  });

  it("Players can register after being whitelisted", async function () {
    await tournament.whitelistPlayer(1, player1.address);

    await tournament.connect(player1).registerPlayer(1, "Alice");

    const playerData = await tournament.tournaments(1, player1.address);
    expect(playerData.name).to.equal("Alice");
    expect(playerData.rank).to.equal(0n);
  });

  it("Owner can record ranks", async function () {
    await tournament.whitelistPlayer(1, player1.address);
    await tournament.connect(player1).registerPlayer(1, "Alice");

    await tournament.recordRank(1, player1.address, 1);

    const playerData = await tournament.tournaments(1, player1.address);
    expect(playerData.rank).to.equal(1n);
  });

  it("Should revert if unwhitelisted player tries to register", async function () {
    await expect(
      tournament.connect(player2).registerPlayer(1, "Bob")
    ).to.be.revertedWith("Not whitelisted");
  });
});
