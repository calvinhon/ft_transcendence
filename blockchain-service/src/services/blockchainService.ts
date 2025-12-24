import { ethers } from 'ethers';
import fs from 'fs';

export class BlockchainService {
	private provider!: ethers.JsonRpcProvider;
	private signer!: ethers.Wallet;
	private contract!: ethers.Contract;

	constructor (
		private rpc: string,
		private pk: string,
		private contractAddress: string,
		private abiPath: string
	) {}

	async init(): Promise<void> {
		this.provider = new ethers.JsonRpcProvider(this.rpc);
		this.signer = new ethers.Wallet(this.pk, this.provider);

		if (!fs.existsSync(this.abiPath)) {
      		throw new Error('ABI not found at ' + this.abiPath);
		}
		const abi = JSON.parse(fs.readFileSync(this.abiPath, 'utf8')).abi;
		this.contract = new ethers.Contract(this.contractAddress, abi, this.signer);
	}

	async recordRanks(tournamentId: number, userIds: number[], ranks: number[]): Promise<string | null> {
		try {
			console.log(`[blockchain-service] recordRanks called for tournament=${tournamentId} players=${userIds.length} ranks=${ranks.length}`);
			console.log('[blockchain-service] players preview:', userIds.slice());
			console.log('[blockchain-service] ranks preview:  ', ranks.slice());

			const tx = await this.contract.recordRanks(BigInt(tournamentId), userIds.map(p => BigInt(p)), ranks.map(r => BigInt(r)));
			const receipt = await tx.wait();
			console.log(`[blockchain-service] recordRanks tx mined for tournament=${tournamentId} txHash=${receipt.hash}`);
			return receipt.hash;
		} catch (e) {
			console.error('[blockchain-service] unexpected error in recordRanks job', e);
			return null;
		}
	}
}