import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { db, initializeDatabase, sqlite } from "./db-sqlite";
import bcrypt from "bcrypt";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

const SQLiteStore = createSQLiteSessionStore(session);

function createSQLiteSessionStore(session: any) {
  const Store = session.Store;
  
  class SQLiteSessionStore extends Store {
    constructor(options: any = {}) {
      super(options);
    }
    
    get(sid: string, callback: (err: any, session?: any) => void) {
      try {
        const stmt = sqlite.prepare('SELECT sess FROM sessions WHERE sid = ? AND expire > ?');
        const row = stmt.get(sid, Date.now()) as { sess: string } | undefined;
        if (row) {
          callback(null, JSON.parse(row.sess));
        } else {
          callback(null, null);
        }
      } catch (err) {
        callback(err);
      }
    }
    
    set(sid: string, session: any, callback: (err?: any) => void) {
      try {
        const maxAge = session.cookie?.maxAge || 86400000;
        const expire = Date.now() + maxAge;
        const sess = JSON.stringify(session);
        
        const stmt = sqlite.prepare(`
          INSERT OR REPLACE INTO sessions (sid, sess, expire) VALUES (?, ?, ?)
        `);
        stmt.run(sid, sess, expire);
        callback();
      } catch (err) {
        callback(err);
      }
    }
    
    destroy(sid: string, callback: (err?: any) => void) {
      try {
        const stmt = sqlite.prepare('DELETE FROM sessions WHERE sid = ?');
        stmt.run(sid);
        callback();
      } catch (err) {
        callback(err);
      }
    }
    
    touch(sid: string, session: any, callback: (err?: any) => void) {
      try {
        const maxAge = session.cookie?.maxAge || 86400000;
        const expire = Date.now() + maxAge;
        
        const stmt = sqlite.prepare('UPDATE sessions SET expire = ? WHERE sid = ?');
        stmt.run(expire, sid);
        callback();
      } catch (err) {
        callback(err);
      }
    }
    
    clear(callback: (err?: any) => void) {
      try {
        sqlite.prepare('DELETE FROM sessions').run();
        callback();
      } catch (err) {
        callback(err);
      }
    }
    
    length(callback: (err: any, length?: number) => void) {
      try {
        const stmt = sqlite.prepare('SELECT COUNT(*) as count FROM sessions WHERE expire > ?');
        const row = stmt.get(Date.now()) as { count: number };
        callback(null, row.count);
      } catch (err) {
        callback(err);
      }
    }
  }
  
  return SQLiteSessionStore;
}

app.use(session({
  store: new SQLiteStore(),
  secret: process.env.SESSION_SECRET || 'airavoto-gaming-local-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

function log(message: string) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`${time} [server] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

initializeDatabase();
initializeDefaultData();

async function initializeDefaultData() {
  try {
    const existingDevices = sqlite.prepare('SELECT COUNT(*) as count FROM device_configs').get() as { count: number };
    
    if (existingDevices.count === 0) {
      sqlite.prepare(`
        INSERT INTO device_configs (id, category, count, seats) VALUES
        (?, 'PC', 5, '["PC-1","PC-2","PC-3","PC-4","PC-5"]'),
        (?, 'PS5', 3, '["PS5-1","PS5-2","PS5-3"]')
      `).run(crypto.randomUUID(), crypto.randomUUID());
      
      const pricingId1 = crypto.randomUUID();
      const pricingId2 = crypto.randomUUID();
      const pricingId3 = crypto.randomUUID();
      const pricingId4 = crypto.randomUUID();
      const pricingId5 = crypto.randomUUID();
      const pricingId6 = crypto.randomUUID();
      
      sqlite.prepare(`
        INSERT INTO pricing_configs (id, category, duration, price, person_count) VALUES
        (?, 'PC', '30 mins', '10', 1),
        (?, 'PC', '1 hour', '18', 1),
        (?, 'PC', '2 hours', '30', 1),
        (?, 'PS5', '30 mins', '15', 1),
        (?, 'PS5', '1 hour', '25', 1),
        (?, 'PS5', '2 hours', '45', 1)
      `).run(pricingId1, pricingId2, pricingId3, pricingId4, pricingId5, pricingId6);
      
      log('Default device and pricing configs created');
    }
    
    const existingUsers = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (existingUsers.count === 0) {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const now = Date.now();
      
      sqlite.prepare(`
        INSERT INTO users (id, username, password_hash, role, onboarding_completed, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', 1, ?, ?)
      `).run(crypto.randomUUID(), adminUsername, passwordHash, now, now);
      
      log(`Admin user created: ${adminUsername}`);
    }
    
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
}

import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";

registerAuthRoutes(app);
registerRoutes(app);

app.use(express.static(path.join(__dirname, '../dist/public')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/public/index.html'));
  }
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  console.error('Error:', err.message);
  
  res.status(status).json({ 
    message: status === 500 ? "An internal error occurred." : err.message
  });
});

const PORT = parseInt(process.env.PORT || '5000', 10);

app.listen(PORT, '127.0.0.1', () => {
  log(`Server running at http://localhost:${PORT}`);
});
