import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONTRACT_ABI_PATH = path.join(
  __dirname, '../blockchain-artifacts/contracts/TournamentRankings.sol/TournamentRankings.json'
);

let CONTRACT_ABI;
try {
  const contractJSON = JSON.parse(fs.readFileSync(CONTRACT_ABI_PATH, 'utf8'));
  CONTRACT_ABI = contractJSON.abi;
  console.log('✅ Contract ABI loaded successfully');
} catch (error) {
  console.error('❌ Failed to load contract ABI:', error.message);
  console.error('   Path:', CONTRACT_ABI_PATH);
}

// Configuration
const PROVIDER_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Initialize provider and signer
let provider, signer, contract;

try {
  provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  
  if (PRIVATE_KEY && CONTRACT_ABI && CONTRACT_ADDRESS) {
    signer = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    console.log('✅ Blockchain connection initialized');
    console.log(`   Provider: ${PROVIDER_URL}`);
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  } else {
    console.warn('⚠️  Missing configuration for write operations');
    if (!PRIVATE_KEY) console.warn('   - PRIVATE_KEY not set');
    if (!CONTRACT_ABI) console.warn('   - CONTRACT_ABI not loaded');
    if (!CONTRACT_ADDRESS) console.warn('   - CONTRACT_ADDRESS not set');
  }
} catch (error) {
  console.error('❌ Failed to initialize blockchain connection:', error);
}

async function routes(fastify, options) {
  
  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      if (!provider) {
        return reply.status(503).send({
          status: 'unhealthy',
          error: 'Provider not initialized'
        });
      }

      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      
      return reply.send({
        status: 'healthy',
        network: {
          name: network.name,
          chainId: network.chainId.toString()
        },
        blockNumber,
        contractAddress: CONTRACT_ADDRESS || 'not set',
        hasWriteAccess: !!signer,
        hasContractABI: !!CONTRACT_ABI
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        error: error.message
      });
    }
  });

  // Record player rank for tournament
  fastify.post('/record-rank', async (request, reply) => {
    const { tournamentId, playerAddress, rank } = request.body;
    
    // Validation
    if (!tournamentId) {
      return reply.status(400).send({ 
        error: 'Tournament ID required' 
      });
    }

    if (!playerAddress) {
      return reply.status(400).send({ 
        error: 'Player address required' 
      });
    }

    if (!ethers.isAddress(playerAddress)) {
      return reply.status(400).send({ 
        error: 'Invalid Ethereum address format' 
      });
    }

    if (typeof rank !== 'number' || rank < 0) {
      return reply.status(400).send({ 
        error: 'Rank must be a non-negative number' 
      });
    }

    try {
      if (!contract) {
        return reply.status(503).send({ 
          error: 'Blockchain service not configured',
          hint: 'Contract address or ABI not loaded'
        });
      }

      // Call smart contract
      const tx = await contract.recordRank(tournamentId, playerAddress, rank);
      console.log(`⏳ Recording rank for tournament ${tournamentId}, tx: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Rank recorded in block ${receipt.blockNumber}`);
      
      return reply.send({
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tournamentId,
        playerAddress,
        rank
      });
    } catch (error) {
      console.error('❌ Record rank error:', error);
      
      // Handle specific errors
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ 
          error: 'Not authorized to record ranks',
          hint: 'Only contract owner can record ranks'
        });
      }
      
      return reply.status(500).send({ 
        error: 'Failed to record rank',
        message: error.message 
      });
    }
  });

  // Get player rank for tournament
  fastify.get('/get-rank/:tournamentId/:playerAddress', async (request, reply) => {
    const { tournamentId, playerAddress } = request.params;

    // Validation
    if (!ethers.isAddress(playerAddress)) {
      return reply.status(400).send({ 
        error: 'Invalid Ethereum address format' 
      });
    }

    try {
      if (!contract) {
        return reply.status(503).send({ 
          error: 'Blockchain service not configured' 
        });
      }

      const rank = await contract.getRank(tournamentId, playerAddress);
      
      return reply.send({
        tournamentId: parseInt(tournamentId),
        playerAddress,
        rank: rank.toString(),
        formattedRank: rank == 0 ? 'Not ranked' : `#${rank}`
      });
    } catch (error) {
      console.error('❌ Get rank error:', error);
      return reply.status(500).send({ 
        error: 'Failed to fetch rank',
        message: error.message 
      });
    }
  });

  // Get tournament rankings (batch query)
  fastify.post('/get-rankings', async (request, reply) => {
    const { tournamentId, playerAddresses } = request.body;

    // Validation
    if (!tournamentId) {
      return reply.status(400).send({ error: 'Tournament ID required' });
    }

    if (!Array.isArray(playerAddresses) || playerAddresses.length === 0) {
      return reply.status(400).send({ 
        error: 'Player addresses array required' 
      });
    }

    // Validate all addresses
    const invalidAddresses = playerAddresses.filter(addr => !ethers.isAddress(addr));
    if (invalidAddresses.length > 0) {
      return reply.status(400).send({ 
        error: 'Invalid addresses found',
        invalidAddresses 
      });
    }

    try {
      if (!contract) {
        return reply.status(503).send({ 
          error: 'Blockchain service not configured' 
        });
      }

      // Fetch all ranks in parallel
      const rankings = await Promise.all(
        playerAddresses.map(async (address) => {
          const rank = await contract.getRank(tournamentId, address);
          return {
            address,
            rank: rank.toString()
          };
        })
      );

      // Sort by rank (exclude unranked players)
      const sortedRankings = rankings
        .filter(r => r.rank !== '0')
        .sort((a, b) => parseInt(a.rank) - parseInt(b.rank));

      return reply.send({
        tournamentId: parseInt(tournamentId),
        totalPlayers: playerAddresses.length,
        rankedPlayers: sortedRankings.length,
        rankings: sortedRankings
      });
    } catch (error) {
      console.error('❌ Get rankings error:', error);
      return reply.status(500).send({ 
        error: 'Failed to fetch rankings',
        message: error.message 
      });
    }
  });

  // Get contract owner
  fastify.get('/owner', async (request, reply) => {
    try {
      if (!contract) {
        return reply.status(503).send({ 
          error: 'Blockchain service not configured' 
        });
      }

      const owner = await contract.owner();
      
      return reply.send({
        owner,
        isCurrentSigner: signer ? (await signer.getAddress()) === owner : false
      });
    } catch (error) {
      console.error('❌ Get owner error:', error);
      return reply.status(500).send({ 
        error: 'Failed to fetch owner',
        message: error.message 
      });
    }
  });
}

export default routes;