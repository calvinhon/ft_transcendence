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
#       // Get JWT secret
#       const jwtResponse = await axios.get(
#         `${vaultAddr}/v1/secret/data/jwt-secret`,
#         { headers: { 'X-Vault-Token': vaultToken } }
#       );
#       process.env.JWT_SECRET = jwtResponse.data.data.data.value;
#
#       // Get OAuth credentials
#       const googleResponse = await axios.get(
#         `${vaultAddr}/v1/secret/data/google-oauth`,
#         { headers: { 'X-Vault-Token': vaultToken } }
#       );
#       process.env.GOOGLE_CLIENT_ID = googleResponse.data.data.data.client_id;
#       process.env.GOOGLE_CLIENT_SECRET = googleResponse.data.data.data.client_secret;
#
#       // Get GitHub credentials
#       const githubResponse = await axios.get(
#         `${vaultAddr}/v1/secret/data/github-oauth`,
#         { headers: { 'X-Vault-Token': vaultToken } }
#       );
#       process.env.GITHUB_CLIENT_ID = githubResponse.data.data.data.client_id;
#       process.env.GITHUB_CLIENT_SECRET = githubResponse.data.data.data.client_secret;
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
