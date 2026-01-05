import axios from 'axios';

let cachedSecret: string | null = null;
let inFlight: Promise<string> | null = null;

export async function getMicroserviceSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const response = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Server_Session`, {
      headers: { 'X-Vault-Token': process.env.VAULT_TOKEN }
    });

    const secret = response?.data?.data?.data?.Secret;
    if (!secret) throw new Error('Vault response missing Server_Session.Secret');

    cachedSecret = secret;
    return secret;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
