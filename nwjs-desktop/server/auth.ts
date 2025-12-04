import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { sqlite } from "./db-sqlite";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    username?: string;
    role?: string;
    isAuthenticated?: boolean;
  }
}

export function registerAuthRoutes(app: express.Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = sqlite.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      req.session.isAuthenticated = true;
      
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        onboardingCompleted: user.onboarding_completed
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });
  
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.session.isAuthenticated || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId) as any;
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      onboardingCompleted: user.onboarding_completed
    });
  });
  
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, email, role } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      const existingUser = sqlite.prepare('SELECT id FROM users WHERE username = ?').get(username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      const now = Date.now();
      const userId = crypto.randomUUID();
      
      sqlite.prepare(`
        INSERT INTO users (id, username, password_hash, email, role, onboarding_completed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `).run(userId, username, passwordHash, email || null, role || 'staff', now, now);
      
      res.status(201).json({
        id: userId,
        username,
        role: role || 'staff',
        email
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "An error occurred during registration" });
    }
  });
  
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.isAuthenticated || !req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.isAuthenticated || !req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}
