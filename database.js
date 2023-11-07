const sqlite3 = require('sqlite3').verbose();

class Database {
  constructor() {
    this.db = new sqlite3.Database('./conversation.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log('Connected to the conversation database.');
        this.initializeDatabase();
      }
    });
  }

  initializeDatabase() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS Questions (
        MessageID INTEGER PRIMARY KEY,
        UserID INTEGER,
        QuestionContent TEXT,
        Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  this.db.run(`
    CREATE TABLE IF NOT EXISTS History (
      UserID INTEGER,
      MessageID INTEGER,
      QuestionContent TEXT,
      ResponseContent TEXT,
      Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (UserID, MessageID)
    );
  `);
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS Responses (
        ResponseID INTEGER PRIMARY KEY AUTOINCREMENT,
        MessageID INTEGER,
        ResponseContent TEXT,
        Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (MessageID) REFERENCES Questions(MessageID)
      );
    `);
  }

  saveQuestion(messageId, userId, questionContent) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO Questions (MessageID, UserID, QuestionContent) VALUES (?, ?, ?)', [messageId, userId, questionContent], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  saveResponse(messageId, responseContent) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO Responses (MessageID, ResponseContent) VALUES (?, ?)', [messageId, responseContent], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  getConversationHistory(userId) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT q.QuestionContent, r.ResponseContent FROM Questions q LEFT JOIN Responses r ON q.MessageID = r.MessageID WHERE q.UserID = ? ORDER BY q.Timestamp', [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  archiveHistory(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO History (UserID, MessageID, QuestionContent, ResponseContent, Timestamp)
        SELECT q.UserID, q.MessageID, q.QuestionContent, r.ResponseContent, q.Timestamp
        FROM Questions q
        LEFT JOIN Responses r ON q.MessageID = r.MessageID
        WHERE q.UserID = ?;
      `;
      this.db.run(query, [userId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  clearHistory(userId) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('DELETE FROM Questions WHERE UserID = ?', [userId], (err) => {
          if (err) {
            return reject(err);
          }
        });
        this.db.run('DELETE FROM Responses WHERE MessageID IN (SELECT MessageID FROM Questions WHERE UserID = ?)', [userId], (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }
}



module.exports = { Database };
