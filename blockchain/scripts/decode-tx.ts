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

  // Get transaction and receipt
  const tx = await ethers.provider.getTransaction(txHash);
  const receipt = await ethers.provider.getTransactionReceipt(txHash);

  if (!tx) {
    console.log('❌ Transaction not found!');
    return;
  }

  // Basic transaction info
  console.log('\n📋 BASIC INFO:');
  console.log('  From:', tx.from);
  console.log('  To:', tx.to || '(Contract Creation)');
  console.log('  Value:', ethers.formatEther(tx.value), 'ETH');
  console.log('  Gas Used:', receipt?.gasUsed.toString());
  console.log('  Status:', receipt?.status ? '✅ Success' : '❌ Failed');
  console.log('  Block:', receipt?.blockNumber);

  // Try to decode if it's a contract call
  if (tx.to && tx.data !== '0x') {
    try {
      const ContractFactory = await ethers.getContractFactory('TournamentRankings');
      const iface = ContractFactory.interface;

      const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });
      
      if (decoded) {
        console.log('\n📝 FUNCTION CALLED:');
        console.log('  Function:', decoded.name);
        console.log('\n  Parameters:');
        
        decoded.args.forEach((arg, index) => {
          const param = decoded.fragment.inputs[index];
          let value = arg.toString();
          
          // Format based on type
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

      if (receipt?.logs && receipt.logs.length > 0) {
        console.log('\n📢 EVENTS EMITTED:');
        
        receipt.logs.forEach((log, logIndex) => {
          try {
            const parsedLog = iface.parseLog({
              topics: log.topics,
              data: log.data
            });
            
            if (parsedLog) {
              console.log(`\n  Event #${logIndex + 1}: ${parsedLog.name}`);
              
              parsedLog.args.forEach((arg, argIndex) => {
                const eventParam = parsedLog.eventFragment.inputs[argIndex];
                let value = arg.toString();
                
                if (eventParam.type === 'address') {
                  value = arg;
                }
                
                console.log(`    ${eventParam.name}: ${value}`);
              });
            }
          } catch (e) {
            console.log(`  Event #${logIndex + 1}: (Unable to decode)`);
          }
        });
      }

    } catch (error) {
      console.log('\n⚠️  Could not decode function call');
      console.log('  Raw input data:', tx.data.substring(0, 66) + '...');
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