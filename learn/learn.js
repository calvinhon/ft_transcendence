const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('mydatabase.db');
db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
db.close();
