import { ethers } from 'ethers';
import fs from 'fs';

export class BlockchainService {
  private provider!: ethers.JsonRpcProvider;
  private signer!: ethers.Wallet;
  private contract!: ethers.Contract;
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  constructor(
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

  /**
   * Enqueue a recordRank transaction and wait for the receipt hash.
   * Serializes sends to avoid nonce concurrency issues in automining environments.
   */
  recordRank(tournamentId: number | bigint | string, userId: number | bigint | string, rank: number | bigint | string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const tx = await this.contract.recordRank(BigInt(tournamentId as any), BigInt(userId as any), BigInt(rank as any));
          const receipt = await tx.wait();
          resolve(receipt.hash);
        } catch (e: any) {
          reject(e);
        }
      });

      if (!this.processing) {
        void this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) continue;
      try {
        await job();
      } catch (e) {
        // job-specific errors are propagated to the promise returned from recordRank
        // log to keep visibility but continue processing remaining jobs
        // eslint-disable-next-line no-console
        console.error('[blockchain-service] queue job error', e);
      }
    }
    this.processing = false;
  }
}

export type BlockchainServiceOptions = { rpc: string; pk: string; contractAddress: string; abiPath: string };
