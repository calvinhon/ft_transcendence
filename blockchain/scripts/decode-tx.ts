import hardhat from 'hardhat';
const { ethers } = hardhat;

async function main() {
	const txHash = process.env.TX_HASH;
	if (!txHash) {
		console.log('Usage: TX_HASH=<hash> npx hardhat run scripts/decode-tx.ts --network docker');
		return;
	}

	console.log('\n🔍 Decoding Transaction:', txHash);
	console.log('='.repeat(60));

	const tx = await ethers.provider.getTransaction(txHash);
	const receipt = await ethers.provider.getTransactionReceipt(txHash);

	if (!tx) {
		console.log('❌ Transaction not found!');
		return;
	}

	console.log('\n📋 BASIC INFO:');
	console.log('  From:', tx.from);
	console.log('  To:', tx.to || '(Contract Creation)');
	console.log('  Value:', ethers.formatEther(tx.value), 'ETH');
	console.log('  Gas Used:', receipt?.gasUsed.toString());
	console.log('  Status:', receipt?.status ? '✅ Success' : '❌ Failed');
	console.log('  Block:', receipt?.blockNumber);

	if (tx.to && tx.data !== '0x') {
		const ContractFactory = await ethers.getContractFactory('TournamentRankings');
		const iface = ContractFactory.interface;

	  	try {
			const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });
		
			if (decoded) {
				console.log('\n📝 FUNCTION CALLED:');
				console.log('  Function:', decoded.name);
				console.log('\n  Parameters:');
				
				decoded.args.forEach((arg, index) => {
				const param = decoded.fragment.inputs[index];
				let value = arg.toString();
				
				if (param.type === 'address') {
					value = arg;
				} else if (param.type.startsWith('uint')) {
					value = arg.toString();
				} else if (param.type === 'string') {
					value = `"${arg}"`;
				}
				
				console.log(`    ${param.name}: ${value}`);
				});
			}
		} catch (error) {
				console.log('\n⚠️  Could not decode function call');
				console.log('  Raw input data:', tx.data.substring(0, 66) + '...');
		}

		if (receipt?.logs && receipt.logs.length > 0) {
			console.log('\n📢 EVENTS EMITTED:');

			const contractAddress = (receipt.contractAddress || tx.to)?.toLowerCase();
			const myLogs = receipt.logs.filter(log => log.address.toLowerCase() === contractAddress);
			
			myLogs.forEach((log, index) => {
				try {
					const parsedLog = iface.parseLog({
					topics: log.topics,
					data: log.data
					});
					
					if (parsedLog) {
						console.log(`\n  Event #${index + 1}: ${parsedLog.name}`);
						
						parsedLog.args.forEach((arg, argIndex) => {
							const eventParam = parsedLog.eventFragment.inputs[argIndex];
							console.log(`    ${eventParam.name}: ${arg.toString()}`);
						});
					}
				} catch (e) {
					console.log(`  Event #${index + 1}: (Unable to decode)`);
				}
			});
		}
	}
  console.log('\n' + '='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });