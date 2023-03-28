const sqlite3 = require('sqlite3').verbose();

class Database {
  constructor() {
    this.db = new sqlite3.Database('./questions.db', (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log('Connected to the questions database.');
      }
    });

    this.db.run(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY,
        user_id TEXT,
        question TEXT
      );
    `);
  }

  saveQuestion(userId, question) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO questions (user_id, question) VALUES (?, ?)', [userId, question], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  getLastQuestion(userId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT question FROM questions WHERE user_id = ? ORDER BY id DESC LIMIT 1';
      this.db.get(query, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.question : '');
        }
      });
    });
  }
}

module.exports = { Database };