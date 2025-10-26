const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

class Database {
  constructor() {
    this.db = null;
    this.environment = process.env.NODE_ENV || 'production';
    this.dbPath = path.join(__dirname, '../../data', `${this.environment}-database.sqlite`);
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
          this.migrateDatabase();
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
        environment TEXT DEFAULT 'production',
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

    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        from_number TEXT,
        to_number TEXT,
        message_text TEXT,
        message_type TEXT DEFAULT 'text',
        timestamp DATETIME,
        is_incoming BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

    this.db.run(createMessagesTable, (err) => {
      if (err) {
        console.error('Error creating messages table:', err);
      } else {
        console.log('Messages table ready');
      }
    });
  }

  migrateDatabase() {
    // Check if environment column exists
    this.db.all("PRAGMA table_info(devices)", (err, columns) => {
      if (err) {
        console.error('Error checking table structure:', err);
        return;
      }
      
      const hasEnvironmentColumn = columns.some(col => col.name === 'environment');
      
      if (!hasEnvironmentColumn) {
        // Add environment column to devices table
        const addEnvironmentColumn = `
          ALTER TABLE devices ADD COLUMN environment TEXT DEFAULT 'production'
        `;
        
        this.db.run(addEnvironmentColumn, (err) => {
          if (err) {
            console.error('Error adding environment column:', err);
          } else {
            console.log('Added environment column to devices table');
            
            // Update existing devices to have the current environment
            const updateExistingDevices = `
              UPDATE devices SET environment = ? WHERE environment IS NULL OR environment = ''
            `;
            
            this.db.run(updateExistingDevices, [this.environment], (err) => {
              if (err) {
                console.error('Error updating existing devices:', err);
              } else {
                console.log('Updated existing devices with environment:', this.environment);
              }
            });
          }
        });
      } else {
        console.log('Environment column already exists');
        
        // Only update devices that don't have an environment set (NULL or empty)
        const updateExistingDevices = `
          UPDATE devices SET environment = ? WHERE environment IS NULL OR environment = ''
        `;
        
        this.db.run(updateExistingDevices, [this.environment], (err) => {
          if (err) {
            console.error('Error updating existing devices:', err);
          } else {
            console.log('Updated devices without environment to:', this.environment);
          }
        });
      }
    });
  }

  // Device operations
  async createDevice(deviceData) {
    return new Promise((resolve, reject) => {
      const { id, name, status = 'disconnected' } = deviceData;
      const sql = `
        INSERT INTO devices (id, name, status, environment, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(sql, [id, name, status, this.environment], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, name, status, environment: this.environment });
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
      const sql = 'SELECT * FROM devices WHERE environment = ? ORDER BY created_at DESC';
      
      this.db.all(sql, [this.environment], (err, rows) => {
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
      const sql = 'DELETE FROM devices WHERE id = ? AND environment = ?';
      
      this.db.run(sql, [id, this.environment], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Message operations
  async storeMessage(deviceId, message) {
    return new Promise((resolve, reject) => {
      const { v4: uuidv4 } = require('uuid');
      const sql = `
        INSERT INTO messages (id, device_id, from_number, to_number, message_text, message_type, timestamp, is_incoming)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        message.id || uuidv4(),
        deviceId,
        message.from,
        message.to,
        message.body,
        message.type || 'text',
        new Date(message.timestamp || Date.now()),
        message.isIncoming !== false
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }

  async getMessages(deviceId, limit = 100) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM messages 
        WHERE device_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      
      this.db.all(sql, [deviceId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getMessageHistory(deviceId, limit = 100) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT m.*, d.name as device_name 
        FROM messages m
        JOIN devices d ON m.device_id = d.id
        WHERE m.device_id = ? AND d.environment = ?
        ORDER BY m.timestamp DESC 
        LIMIT ?
      `;
      
      this.db.all(sql, [deviceId, this.environment, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
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
