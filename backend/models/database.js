const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database.sqlite');

let db;

// 데이터베이스 연결
function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
}

// 데이터베이스 초기화 및 테이블 생성
async function initDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    
    // 사용자 테이블 (멘토와 멘티 공용)
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('mentor', 'mentee')),
        name TEXT,
        bio TEXT,
        skillsets TEXT, -- JSON 문자열로 저장
        profile_image BLOB, -- 이미지 데이터
        profile_image_type TEXT, -- 이미지 MIME 타입
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 매칭 요청 테이블
    const createMatchingRequestsTable = `
      CREATE TABLE IF NOT EXISTS matching_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mentee_id INTEGER NOT NULL,
        mentor_id INTEGER NOT NULL,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mentee_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(mentee_id, mentor_id) -- 같은 멘토에게 중복 요청 방지
      )
    `;
    
    // 트리거: updated_at 자동 업데이트
    const createUpdateTriggerUsers = `
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
      AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `;
    
    const createUpdateTriggerRequests = `
      CREATE TRIGGER IF NOT EXISTS update_requests_timestamp 
      AFTER UPDATE ON matching_requests
      BEGIN
        UPDATE matching_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `;
    
    // 인덱스 생성
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
      `CREATE INDEX IF NOT EXISTS idx_requests_mentee ON matching_requests(mentee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_requests_mentor ON matching_requests(mentor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_requests_status ON matching_requests(status)`
    ];
    
    // 순차적으로 테이블 생성
    database.serialize(() => {
      database.run(createUsersTable, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          return reject(err);
        }
        console.log('✅ Users table created/verified');
      });
      
      database.run(createMatchingRequestsTable, (err) => {
        if (err) {
          console.error('Error creating matching_requests table:', err);
          return reject(err);
        }
        console.log('✅ Matching requests table created/verified');
      });
      
      database.run(createUpdateTriggerUsers, (err) => {
        if (err) console.error('Error creating users trigger:', err);
        else console.log('✅ Users update trigger created/verified');
      });
      
      database.run(createUpdateTriggerRequests, (err) => {
        if (err) console.error('Error creating requests trigger:', err);
        else console.log('✅ Requests update trigger created/verified');
      });
      
      // 인덱스 생성
      createIndexes.forEach((indexQuery, i) => {
        database.run(indexQuery, (err) => {
          if (err) console.error(`Error creating index ${i + 1}:`, err);
          else console.log(`✅ Index ${i + 1} created/verified`);
          
          // 마지막 인덱스 생성 후 resolve
          if (i === createIndexes.length - 1) {
            console.log('🎉 Database initialization completed');
            resolve();
          }
        });
      });
    });
  });
}

// 데이터베이스 연결 종료
function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = {
  getDatabase,
  initDatabase,
  closeDatabase
};
