const Database = require('../database/database');

class AuthMiddleware {
  constructor(db) {
    this.db = db || new Database();
  }

  async authenticateApiKey(req, res, next) {
    try {
      const authKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
      
      if (!authKey) {
        return res.status(401).json({ 
          success: false, 
          error: 'API key is required. Provide it in X-API-Key header or Authorization header.' 
        });
      }

      console.log('Auth middleware: Checking API key:', authKey);
      
      // Check if database is available
      if (!this.db) {
        console.error('Auth middleware: Database not available');
        return res.status(500).json({ 
          success: false, 
          error: 'Database not available' 
        });
      }
      
      // Wait for database to be ready
      await this.db.waitForReady();
      
      const apiKeyData = await this.db.getApiKeyByAuthKey(authKey);
      console.log('Auth middleware: API key data:', apiKeyData);
      
      if (!apiKeyData) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid API key' 
        });
      }

      if (!apiKeyData.is_active) {
        return res.status(401).json({ 
          success: false, 
          error: 'API key is deactivated' 
        });
      }

      // Update last used timestamp
      await this.db.updateApiKeyLastUsed(authKey);
      
      // Add device info to request
      req.deviceId = apiKeyData.device_id;
      req.apiKeyId = apiKeyData.id;
      req.apiKeyName = apiKeyData.key_name;
      
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Authentication error' 
      });
    }
  }
}

module.exports = AuthMiddleware;
