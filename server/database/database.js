const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../data/database.sqlite');
    this.init();
  }

  async init() {
    try {
      // Ensure data directory exists
      await fs.ensureDir(path.dirname(this.dbPath));
      
      // Create database connection
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables();
        }
      });
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  // Wait for database to be ready
  async waitForReady() {
    return new Promise((resolve) => {
      if (this.db) {
        resolve();
      } else {
        const checkReady = () => {
          if (this.db) {
            resolve();
          } else {
            setTimeout(checkReady, 10);
          }
        };
        checkReady();
      }
    });
  }

  createTables() {
    const createDevicesTable = `
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'disconnected',
        last_seen DATETIME,
        auth_key TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createApiKeysTable = `
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        key_name TEXT NOT NULL,
        auth_key TEXT UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE
      )
    `;

    this.db.run(createDevicesTable, (err) => {
      if (err) {
        console.error('Error creating devices table:', err);
      } else {
        console.log('Devices table ready');
      }
    });

    this.db.run(createApiKeysTable, (err) => {
      if (err) {
        console.error('Error creating api_keys table:', err);
      } else {
        console.log('API keys table ready');
      }
    });
  }

  // Device operations
  async createDevice(deviceData) {
    return new Promise((resolve, reject) => {
      const { id, name, status = 'disconnected' } = deviceData;
      const sql = `
        INSERT INTO devices (id, name, status, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(sql, [id, name, status], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, name, status });
        }
      });
    });
  }

  async updateDevice(id, updates) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.lastSeen !== undefined) {
        fields.push('last_seen = ?');
        values.push(updates.lastSeen);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const sql = `UPDATE devices SET ${fields.join(', ')} WHERE id = ?`;
      
      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async getDevice(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM devices WHERE id = ?';
      
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getAllDevices() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM devices ORDER BY created_at DESC';
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async deleteDevice(id) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM devices WHERE id = ?';
      
      this.db.run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // API Key operations
  async createApiKey(deviceId, keyName) {
    return new Promise((resolve, reject) => {
      const { v4: uuidv4 } = require('uuid');
      const apiKeyId = uuidv4();
      const authKey = `wa_${uuidv4().replace(/-/g, '')}`;
      
      const sql = `
        INSERT INTO api_keys (id, device_id, key_name, auth_key, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(sql, [apiKeyId, deviceId, keyName, authKey], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: apiKeyId, deviceId, keyName, authKey });
        }
      });
    });
  }

  async getApiKeysByDevice(deviceId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM api_keys WHERE device_id = ? ORDER BY created_at DESC';
      
      this.db.all(sql, [deviceId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getApiKeyByAuthKey(authKey) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM api_keys WHERE auth_key = ? AND is_active = 1';
      
      this.db.get(sql, [authKey], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async updateApiKeyLastUsed(authKey) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE auth_key = ?';
      
      this.db.run(sql, [authKey], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async deleteApiKey(apiKeyId) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM api_keys WHERE id = ?';
      
      this.db.run(sql, [apiKeyId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async deactivateApiKey(apiKeyId) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE api_keys SET is_active = 0 WHERE id = ?';
      
      this.db.run(sql, [apiKeyId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = Database;
