
import { db } from './database/index';
import { UserService } from './services/userService';
import path from 'path';

console.log('Testing Database Join...');

// Allow some time for connection and attach to happen (simulating the race/queue)
setTimeout(async () => {
    try {
        console.log('Attempting to fetch profile for user 116...');
        const profile = await UserService.getOrCreateProfile(116);
        console.log('Success!', profile);
    } catch (err) {
        console.error('Failed:', err);
    }
}, 1000);

// Also log the calculated path to verify
const authDbPath = path.join(__dirname, '../../auth-service/database/auth.db');
console.log('Calculated Auth DB Path (from test script):', authDbPath);
