import express, { Request, Response } from "express";
import { sqlite } from "./db-sqlite";
import { requireAuth, requireAdmin } from "./auth";

export function registerRoutes(app: express.Express) {
  
  app.get("/api/bookings", requireAuth, (req: Request, res: Response) => {
    try {
      const bookings = sqlite.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
      const parsed = bookings.map(parseBooking);
      res.json(parsed);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });
  
  app.post("/api/bookings", requireAuth, (req: Request, res: Response) => {
    try {
      const data = req.body;
      const id = crypto.randomUUID();
      const now = Date.now();
      
      sqlite.prepare(`
        INSERT INTO bookings (
          id, booking_code, group_id, group_code, category, seat_number, seat_name,
          customer_name, whatsapp_number, start_time, end_time, price, status,
          booking_type, paused_remaining_time, person_count, payment_method,
          cash_amount, upi_amount, payment_status, last_payment_action, food_orders,
          original_price, discount_applied, bonus_hours_applied, promotion_details,
          is_promotional_discount, is_promotional_bonus, manual_discount_percentage,
          manual_free_hours, discount, bonus, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.bookingCode || null,
        data.groupId || null,
        data.groupCode || null,
        data.category,
        data.seatNumber,
        data.seatName,
        data.customerName,
        data.whatsappNumber || null,
        new Date(data.startTime).getTime(),
        new Date(data.endTime).getTime(),
        data.price,
        data.status,
        JSON.stringify(data.bookingType || []),
        data.pausedRemainingTime || null,
        data.personCount || 1,
        data.paymentMethod || null,
        data.cashAmount || null,
        data.upiAmount || null,
        data.paymentStatus || 'unpaid',
        data.lastPaymentAction ? JSON.stringify(data.lastPaymentAction) : null,
        JSON.stringify(data.foodOrders || []),
        data.originalPrice || null,
        data.discountApplied || null,
        data.bonusHoursApplied || null,
        data.promotionDetails ? JSON.stringify(data.promotionDetails) : null,
        data.isPromotionalDiscount || 0,
        data.isPromotionalBonus || 0,
        data.manualDiscountPercentage || null,
        data.manualFreeHours || null,
        data.discount || null,
        data.bonus || null,
        now
      );
      
      const booking = sqlite.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
      res.status(201).json(parseBooking(booking));
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });
  
  app.patch("/api/bookings/:id", requireAuth, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const existing = sqlite.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const updates: string[] = [];
      const values: any[] = [];
      
      Object.entries(data).forEach(([key, value]) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        if (key === 'startTime' || key === 'endTime') {
          updates.push(`${snakeKey} = ?`);
          values.push(new Date(value as string).getTime());
        } else if (key === 'foodOrders' || key === 'bookingType' || key === 'lastPaymentAction' || key === 'promotionDetails') {
          updates.push(`${snakeKey} = ?`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${snakeKey} = ?`);
          values.push(value);
        }
      });
      
      if (updates.length > 0) {
        values.push(id);
        sqlite.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }
      
      const booking = sqlite.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
      res.json(parseBooking(booking));
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });
  
  app.delete("/api/bookings/:id", requireAuth, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      sqlite.prepare('DELETE FROM bookings WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });
  
  app.get("/api/food-items", requireAuth, (req: Request, res: Response) => {
    try {
      const items = sqlite.prepare('SELECT * FROM food_items ORDER BY name').all();
      res.json(items);
    } catch (error) {
      console.error("Error fetching food items:", error);
      res.status(500).json({ message: "Failed to fetch food items" });
    }
  });
  
  app.post("/api/food-items", requireAuth, (req: Request, res: Response) => {
    try {
      const data = req.body;
      const id = crypto.randomUUID();
      
      sqlite.prepare(`
        INSERT INTO food_items (id, name, price, cost_price, current_stock, min_stock_level, in_inventory, category, supplier, expiry_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.name,
        data.price,
        data.costPrice || null,
        data.currentStock || 0,
        data.minStockLevel || 10,
        data.inInventory || 0,
        data.category || 'trackable',
        data.supplier || null,
        data.expiryDate ? new Date(data.expiryDate).getTime() : null
      );
      
      const item = sqlite.prepare('SELECT * FROM food_items WHERE id = ?').get(id);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating food item:", error);
      res.status(500).json({ message: "Failed to create food item" });
    }
  });
  
  app.patch("/api/food-items/:id", requireAuth, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const updates: string[] = [];
      const values: any[] = [];
      
      Object.entries(data).forEach(([key, value]) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (key === 'expiryDate') {
          updates.push(`${snakeKey} = ?`);
          values.push(value ? new Date(value as string).getTime() : null);
        } else {
          updates.push(`${snakeKey} = ?`);
          values.push(value);
        }
      });
      
      if (updates.length > 0) {
        values.push(id);
        sqlite.prepare(`UPDATE food_items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }
      
      const item = sqlite.prepare('SELECT * FROM food_items WHERE id = ?').get(id);
      res.json(item);
    } catch (error) {
      console.error("Error updating food item:", error);
      res.status(500).json({ message: "Failed to update food item" });
    }
  });
  
  app.delete("/api/food-items/:id", requireAuth, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      sqlite.prepare('DELETE FROM food_items WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting food item:", error);
      res.status(500).json({ message: "Failed to delete food item" });
    }
  });
  
  app.get("/api/device-configs", requireAuth, (req: Request, res: Response) => {
    try {
      const configs = sqlite.prepare('SELECT * FROM device_configs').all();
      const parsed = configs.map((c: any) => ({
        ...c,
        seats: JSON.parse(c.seats || '[]')
      }));
      res.json(parsed);
    } catch (error) {
      console.error("Error fetching device configs:", error);
      res.status(500).json({ message: "Failed to fetch device configs" });
    }
  });
  
  app.post("/api/device-configs", requireAdmin, (req: Request, res: Response) => {
    try {
      const data = req.body;
      const id = crypto.randomUUID();
      
      sqlite.prepare(`
        INSERT OR REPLACE INTO device_configs (id, category, count, seats)
        VALUES (?, ?, ?, ?)
      `).run(id, data.category, data.count, JSON.stringify(data.seats || []));
      
      const config = sqlite.prepare('SELECT * FROM device_configs WHERE category = ?').get(data.category) as any;
      res.status(201).json({
        ...config,
        seats: JSON.parse(config.seats || '[]')
      });
    } catch (error) {
      console.error("Error creating device config:", error);
      res.status(500).json({ message: "Failed to create device config" });
    }
  });
  
  app.get("/api/pricing-configs", requireAuth, (req: Request, res: Response) => {
    try {
      const configs = sqlite.prepare('SELECT * FROM pricing_configs').all();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching pricing configs:", error);
      res.status(500).json({ message: "Failed to fetch pricing configs" });
    }
  });
  
  app.post("/api/pricing-configs", requireAdmin, (req: Request, res: Response) => {
    try {
      const { category, configs } = req.body;
      
      sqlite.prepare('DELETE FROM pricing_configs WHERE category = ?').run(category);
      
      for (const config of configs) {
        const id = crypto.randomUUID();
        sqlite.prepare(`
          INSERT INTO pricing_configs (id, category, duration, price, person_count)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, category, config.duration, config.price, config.personCount || 1);
      }
      
      const updatedConfigs = sqlite.prepare('SELECT * FROM pricing_configs WHERE category = ?').all(category);
      res.json(updatedConfigs);
    } catch (error) {
      console.error("Error updating pricing configs:", error);
      res.status(500).json({ message: "Failed to update pricing configs" });
    }
  });
  
  app.get("/api/happy-hours-configs", requireAuth, (req: Request, res: Response) => {
    try {
      const configs = sqlite.prepare('SELECT * FROM happy_hours_configs').all();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching happy hours configs:", error);
      res.status(500).json({ message: "Failed to fetch happy hours configs" });
    }
  });
  
  app.get("/api/happy-hours-pricing", requireAuth, (req: Request, res: Response) => {
    try {
      const pricing = sqlite.prepare('SELECT * FROM happy_hours_pricing').all();
      res.json(pricing);
    } catch (error) {
      console.error("Error fetching happy hours pricing:", error);
      res.status(500).json({ message: "Failed to fetch happy hours pricing" });
    }
  });
  
  app.get("/api/expenses", requireAuth, (req: Request, res: Response) => {
    try {
      const expenses = sqlite.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
      const parsed = expenses.map((e: any) => ({
        ...e,
        date: new Date(e.date),
        createdAt: new Date(e.created_at)
      }));
      res.json(parsed);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });
  
  app.post("/api/expenses", requireAuth, (req: Request, res: Response) => {
    try {
      const data = req.body;
      const id = crypto.randomUUID();
      const now = Date.now();
      
      sqlite.prepare(`
        INSERT INTO expenses (id, category, description, amount, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, data.category, data.description, data.amount, new Date(data.date).getTime(), now);
      
      const expense = sqlite.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });
  
  app.get("/api/booking-history", requireAuth, (req: Request, res: Response) => {
    try {
      const history = sqlite.prepare('SELECT * FROM booking_history ORDER BY archived_at DESC').all();
      const parsed = history.map(parseBookingHistory);
      res.json(parsed);
    } catch (error) {
      console.error("Error fetching booking history:", error);
      res.status(500).json({ message: "Failed to fetch booking history" });
    }
  });
  
  app.get("/api/notifications", requireAuth, (req: Request, res: Response) => {
    try {
      const notifications = sqlite.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100').all();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  
  app.get("/api/activity-logs", requireAuth, (req: Request, res: Response) => {
    try {
      const logs = sqlite.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 500').all();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });
  
  app.get("/api/gaming-center-info", (req: Request, res: Response) => {
    try {
      const info = sqlite.prepare('SELECT * FROM gaming_center_info LIMIT 1').get();
      res.json(info || null);
    } catch (error) {
      console.error("Error fetching gaming center info:", error);
      res.status(500).json({ message: "Failed to fetch gaming center info" });
    }
  });
  
  app.get("/api/users", requireAdmin, (req: Request, res: Response) => {
    try {
      const users = sqlite.prepare('SELECT id, username, email, first_name, last_name, role, onboarding_completed, created_at FROM users').all();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
}

function parseBooking(row: any) {
  if (!row) return null;
  return {
    ...row,
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    createdAt: new Date(row.created_at),
    seatNumber: row.seat_number,
    seatName: row.seat_name,
    customerName: row.customer_name,
    whatsappNumber: row.whatsapp_number,
    bookingCode: row.booking_code,
    groupId: row.group_id,
    groupCode: row.group_code,
    bookingType: JSON.parse(row.booking_type || '[]'),
    pausedRemainingTime: row.paused_remaining_time,
    personCount: row.person_count,
    paymentMethod: row.payment_method,
    cashAmount: row.cash_amount,
    upiAmount: row.upi_amount,
    paymentStatus: row.payment_status,
    lastPaymentAction: row.last_payment_action ? JSON.parse(row.last_payment_action) : null,
    foodOrders: JSON.parse(row.food_orders || '[]'),
    originalPrice: row.original_price,
    discountApplied: row.discount_applied,
    bonusHoursApplied: row.bonus_hours_applied,
    promotionDetails: row.promotion_details ? JSON.parse(row.promotion_details) : null,
    isPromotionalDiscount: row.is_promotional_discount,
    isPromotionalBonus: row.is_promotional_bonus,
    manualDiscountPercentage: row.manual_discount_percentage,
    manualFreeHours: row.manual_free_hours,
  };
}

function parseBookingHistory(row: any) {
  if (!row) return null;
  return {
    ...parseBooking(row),
    bookingId: row.booking_id,
    archivedAt: new Date(row.archived_at),
  };
}
