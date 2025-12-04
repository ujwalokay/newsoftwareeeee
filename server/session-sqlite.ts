import session from 'express-session';
import { getSqliteDb } from './db';

interface SessionRow {
  sid: string;
  sess: string;
  expire: number;
}

export class SQLiteSessionStore extends session.Store {
  private getDb() {
    const db = getSqliteDb();
    if (!db) {
      throw new Error('SQLite database not initialized');
    }
    return db;
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    try {
      const db = this.getDb();
      const now = Date.now();
      
      const row = db.prepare(
        'SELECT sess FROM sessions WHERE sid = ? AND expire > ?'
      ).get(sid, now) as SessionRow | undefined;
      
      if (row) {
        callback(null, JSON.parse(row.sess));
      } else {
        callback(null, null);
      }
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, session: session.SessionData, callback?: (err?: any) => void): void {
    try {
      const db = this.getDb();
      const maxAge = session.cookie?.maxAge || 86400000;
      const expire = Date.now() + maxAge;
      const sess = JSON.stringify(session);
      
      db.prepare(`
        INSERT OR REPLACE INTO sessions (sid, sess, expire)
        VALUES (?, ?, ?)
      `).run(sid, sess, expire);
      
      if (callback) callback();
    } catch (err) {
      if (callback) callback(err);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    try {
      const db = this.getDb();
      db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      if (callback) callback();
    } catch (err) {
      if (callback) callback(err);
    }
  }

  touch(sid: string, session: session.SessionData, callback?: (err?: any) => void): void {
    try {
      const db = this.getDb();
      const maxAge = session.cookie?.maxAge || 86400000;
      const expire = Date.now() + maxAge;
      
      db.prepare('UPDATE sessions SET expire = ? WHERE sid = ?').run(expire, sid);
      if (callback) callback();
    } catch (err) {
      if (callback) callback(err);
    }
  }

  all(callback: (err: any, obj?: { [sid: string]: session.SessionData } | null) => void): void {
    try {
      const db = this.getDb();
      const now = Date.now();
      
      const rows = db.prepare(
        'SELECT sid, sess FROM sessions WHERE expire > ?'
      ).all(now) as SessionRow[];
      
      const sessions: { [sid: string]: session.SessionData } = {};
      for (const row of rows) {
        sessions[row.sid] = JSON.parse(row.sess);
      }
      
      callback(null, sessions);
    } catch (err) {
      callback(err);
    }
  }

  length(callback: (err: any, length?: number) => void): void {
    try {
      const db = this.getDb();
      const now = Date.now();
      
      const result = db.prepare(
        'SELECT COUNT(*) as count FROM sessions WHERE expire > ?'
      ).get(now) as { count: number };
      
      callback(null, result.count);
    } catch (err) {
      callback(err);
    }
  }

  clear(callback?: (err?: any) => void): void {
    try {
      const db = this.getDb();
      db.prepare('DELETE FROM sessions').run();
      if (callback) callback();
    } catch (err) {
      if (callback) callback(err);
    }
  }

  prune(): void {
    try {
      const db = this.getDb();
      const now = Date.now();
      db.prepare('DELETE FROM sessions WHERE expire < ?').run(now);
    } catch (err) {
      console.error('Session prune error:', err);
    }
  }
}

export function createSQLiteSessionStore(): SQLiteSessionStore {
  const store = new SQLiteSessionStore();
  
  setInterval(() => {
    store.prune();
  }, 60 * 60 * 1000);
  
  return store;
}
