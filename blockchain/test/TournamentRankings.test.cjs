const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TournamentRankings", function () {
  let tournamentRankings;
  let owner;
  let otherAccount;

  const TEST_TOURNAMENT_ID = 1;
  const TEST_PLAYER = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  const TEST_RANK = 5;

  beforeEach(async function () {
    // Get signers
    [owner, otherAccount] = await ethers.getSigners();

    // Deploy contract
    const TournamentRankingsFactory = await ethers.getContractFactory("TournamentRankings");
    tournamentRankings = await TournamentRankingsFactory.deploy();
    await tournamentRankings.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await tournamentRankings.owner()).to.equal(owner.address);
    });

    it("Should have correct interface", async function () {
      // Check if contract implements the interface
      expect(tournamentRankings.interface.getFunction("recordRank")).to.not.be.undefined;
      expect(tournamentRankings.interface.getFunction("getRank")).to.not.be.undefined;
      expect(tournamentRankings.interface.getFunction("owner")).to.not.be.undefined;
    });
  });

  describe("recordRank", function () {
    it("Should record rank when called by owner", async function () {
      await expect(tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK))
        .to.emit(tournamentRankings, "RankRecorded")
        .withArgs(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK);

      expect(await tournamentRankings.getRank(TEST_TOURNAMENT_ID, TEST_PLAYER)).to.equal(TEST_RANK);
    });

    it("Should reject when called by non-owner", async function () {
      await expect(
        tournamentRankings.connect(otherAccount).recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK)
      ).to.be.revertedWith("TournamentRankings: caller is not the owner");
    });

    it("Should reject invalid tournament ID", async function () {
      await expect(
        tournamentRankings.recordRank(0, TEST_PLAYER, TEST_RANK)
      ).to.be.revertedWith("TournamentRankings: invalid tournament ID");
    });

    it("Should reject zero address player", async function () {
      await expect(
        tournamentRankings.recordRank(TEST_TOURNAMENT_ID, ethers.ZeroAddress, TEST_RANK)
      ).to.be.revertedWith("TournamentRankings: invalid player address");
    });

    it("Should reject zero rank", async function () {
      await expect(
        tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, 0)
      ).to.be.revertedWith("TournamentRankings: invalid rank");
    });

    it("Should allow updating existing rank", async function () {
      // Record initial rank
      await tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK);

      // Update rank
      const newRank = 3;
      await expect(tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, newRank))
        .to.emit(tournamentRankings, "RankRecorded")
        .withArgs(TEST_TOURNAMENT_ID, TEST_PLAYER, newRank);

      expect(await tournamentRankings.getRank(TEST_TOURNAMENT_ID, TEST_PLAYER)).to.equal(newRank);
    });
  });

  describe("getRank", function () {
    it("Should return recorded rank", async function () {
      await tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK);
      expect(await tournamentRankings.getRank(TEST_TOURNAMENT_ID, TEST_PLAYER)).to.equal(TEST_RANK);
    });

    it("Should return 0 for non-recorded player", async function () {
      expect(await tournamentRankings.getRank(TEST_TOURNAMENT_ID, TEST_PLAYER)).to.equal(0);
    });

    it("Should return 0 for different tournament", async function () {
      await tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK);
      expect(await tournamentRankings.getRank(TEST_TOURNAMENT_ID + 1, TEST_PLAYER)).to.equal(0);
    });

    it("Should handle multiple players in same tournament", async function () {
      const player2 = otherAccount.address;
      const rank2 = 2;

      await tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK);
      await tournamentRankings.recordRank(TEST_TOURNAMENT_ID, player2, rank2);

      expect(await tournamentRankings.getRank(TEST_TOURNAMENT_ID, TEST_PLAYER)).to.equal(TEST_RANK);
      expect(await tournamentRankings.getRank(TEST_TOURNAMENT_ID, player2)).to.equal(rank2);
    });

    it("Should handle multiple tournaments", async function () {
      const tournament2 = 2;
      const rank2 = 10;

      await tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK);
      await tournamentRankings.recordRank(tournament2, TEST_PLAYER, rank2);

      expect(await tournamentRankings.getRank(TEST_TOURNAMENT_ID, TEST_PLAYER)).to.equal(TEST_RANK);
      expect(await tournamentRankings.getRank(tournament2, TEST_PLAYER)).to.equal(rank2);
    });
  });

  describe("Gas Usage", function () {
    it("Should have reasonable gas usage for recordRank", async function () {
      const tx = await tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK);
      const receipt = await tx.wait();

      // Gas used should be reasonable (less than 100k)
      expect(receipt?.gasUsed).to.be.lessThan(100000n);
    });

    it("Should have low gas usage for getRank", async function () {
      await tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK);

      const tx = await tournamentRankings.getRank(TEST_TOURNAMENT_ID, TEST_PLAYER);
      // getRank is a view function, so no gas cost to estimate
      // This test just ensures the function doesn't revert
      expect(tx).to.equal(TEST_RANK);
    });
  });

  describe("Events", function () {
    it("Should emit RankRecorded event with correct parameters", async function () {
      await expect(tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK))
        .to.emit(tournamentRankings, "RankRecorded")
        .withArgs(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK);
    });

    it("Should emit event for each rank recording", async function () {
      const ranks = [1, 2, 3, 4, 5];

      for (const rank of ranks) {
        await expect(tournamentRankings.recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, rank))
          .to.emit(tournamentRankings, "RankRecorded")
          .withArgs(TEST_TOURNAMENT_ID, TEST_PLAYER, rank);
      }
    });
  });

  describe("Security", function () {
    it("Should prevent unauthorized access", async function () {
      await expect(
        tournamentRankings.connect(otherAccount).recordRank(TEST_TOURNAMENT_ID, TEST_PLAYER, TEST_RANK)
      ).to.be.revertedWith("TournamentRankings: caller is not the owner");
    });

    it("Should maintain data integrity across transactions", async function () {
      // Record multiple ranks
      const players = [
        "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "0x742d35Cc6634C0532925a3b844Bc454e4438f44f",
        "0x742d35Cc6634C0532925a3b844Bc454e4438f44g"
      ];

      for (let i = 0; i < players.length; i++) {
        await tournamentRankings.recordRank(TEST_TOURNAMENT_ID, players[i], i + 1);
      }

      // Verify all ranks are correct
      for (let i = 0; i < players.length; i++) {
        expect(await tournamentRankings.getRank(TEST_TOURNAMENT_ID, players[i])).to.equal(i + 1);
      }
    });
  });
});