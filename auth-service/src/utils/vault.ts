// auth-service/src/utils/vault.ts

import axios from 'axios';

interface APICredentials {
	clientID: string;
	clientSecret: string;
	clientCallbackURL: string;
}

export async function getAPISecrets(api: number) : Promise<APICredentials | Error> {

	let result: any;

	switch (api) {
		case 0:
			result = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/42API`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN} });
			break;
		case 1:
			result = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/GitHub_API`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN} });
			break;
		case 2:
			result = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Google_API`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN} });
			break;
	}

	const secrets = result.data.data.data;

	if (!secrets || !secrets.Client_ID || !secrets.Client_Secret)
		return new Error('Vault response missing Client_ID or Client_Secret');

	return {
		clientID: secrets.Client_ID as string,
		clientSecret: secrets.Client_Secret as string,
		clientCallbackURL: secrets.Callback_URL as string
	};
}
