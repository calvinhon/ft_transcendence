import { Router } from 'fastify';
import { ethers } from 'ethers';
import contractAbi from '../artifacts/contracts/TournamentScores.sol/TournamentScores.json' assert { type: 'json' };

export default async function scoresRoutes(fastify, opts) {
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractAbi.abi, wallet);

  // Route: Record a score
  fastify.post('/record-score', async (request, reply) => {
    try {
      const { tournamentId, playerAddress, score } = request.body;

      // Basic validation
      if (!ethers.isAddress(playerAddress)) {
        return reply.code(400).send({ error: 'Invalid player address' });
      }

      if (typeof score !== 'number' || score < 0) {
        return reply.code(400).send({ error: 'Invalid score' });
      }

      // Send transaction
      const tx = await contract.recordScore(tournamentId, playerAddress, score);
      await tx.wait();

      reply.send({ status: 'Score recorded', txHash: tx.hash });
    } catch (err) {
      reply.code(500).send({ error: err.message });
    }
  });

  // Route: Get a player's score
  fastify.get('/get-score/:tournamentId/:playerAddress', async (request, reply) => {
    try {
      const { tournamentId, playerAddress } = request.params;

      if (!ethers.isAddress(playerAddress)) {
        return reply.code(400).send({ error: 'Invalid player address' });
      }

      const score = await contract.getScore(tournamentId, playerAddress);
      reply.send({ tournamentId, playerAddress, score: score.toString() });
    } catch (err) {
      reply.code(500).send({ error: err.message });
    }
  });
}
