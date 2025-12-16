# Example: How to load secrets from Vault in Node.js services
# 
# Install: npm install dotenv node-vault
#
# In your server.ts or config.ts, add:
#
#   import axios from 'axios';
#
#   export async function loadSecretsFromVault() {
#     const vaultAddr = process.env.VAULT_ADDR || 'http://vault:8200';
#     const vaultToken = process.env.VAULT_TOKEN || 'dev-token';
#
#     try {
#       // Get database credentials
#       const dbResponse = await axios.get(
#         `${vaultAddr}/v1/secret/data/database`,
#         { headers: { 'X-Vault-Token': vaultToken } }
#       );
#       process.env.DB_HOST = dbResponse.data.data.data.host;
#       process.env.DB_USER = dbResponse.data.data.data.user;
#       process.env.DB_PASSWORD = dbResponse.data.data.data.password;
#
#       console.log('Secrets loaded from Vault');
#     } catch (err) {
#       console.error('Error loading secrets from Vault:', err);
#       // Fallback to environment variables
#     }
#   }
#
#   // Call this during server startup
#   await loadSecretsFromVault();
