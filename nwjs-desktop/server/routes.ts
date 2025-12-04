import express, { Request, Response } from "express";
import { sqlite } from "./db-sqlite";
import { requireAuth, requireAdmin } from "./auth";

export function registerRoutes(app: express.Express) {
  
  // Health check
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Server time
  app.get("/api/server-time", (req: Request, res: Response) => {
    res.json({ serverTime: new Date().toISOString() });
  });

  // ==================== BOOKINGS ====================
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

  app.get("/api/bookings/active", requireAuth, (req: Request, res: Response) => {
    try {
      const bookings = sqlite.prepare("SELECT * FROM bookings WHERE status IN ('running', 'paused', 'upcoming') ORDER BY created_at DESC").all();
      const parsed = bookings.map(parseBooking);
      res.json(parsed);
    } catch (error) {
      console.error("Error fetching active bookings:", error);
      res.status(500).json({ message: "Failed to fetch active bookings" });
    }
  });

  app.get("/api/bookings/available-seats", requireAuth, (req: Request, res: Response) => {
    try {
      const { date, timeSlot, durationMinutes } = req.query;
      
      if (!date || !timeSlot || !durationMinutes) {
        return res.status(400).json({ message: "Missing required parameters: date, timeSlot, durationMinutes" });
      }

      const bookingDate = new Date(date as string);
      const [startTimeStr] = (timeSlot as string).split('-');
      const [startHour, startMin] = startTimeStr.split(':').map(Number);
      
      const requestStart = new Date(bookingDate);
      requestStart.setHours(startHour, startMin, 0, 0);
      const requestEnd = new Date(requestStart.getTime() + parseInt(durationMinutes as string) * 60 * 1000);

      const allBookings = sqlite.prepare('SELECT * FROM bookings').all().map(parseBooking);
      const deviceConfigs = sqlite.prepare('SELECT * FROM device_configs').all().map((c: any) => ({
        ...c,
        seats: JSON.parse(c.seats || '[]')
      }));
      
      const availableSeats = deviceConfigs.map((config: any) => {
        const occupiedSeats = allBookings
          .filter((booking: any) => {
            if (booking.category !== config.category) return false;
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(booking.endTime);
            const hasOverlap = requestStart < bookingEnd && requestEnd > bookingStart;
            return hasOverlap && (booking.status === "running" || booking.status === "paused" || booking.status === "upcoming");
          })
          .map((b: any) => b.seatNumber);

        const allSeatNumbers = config.seats.length > 0 
          ? config.seats.map((seatName: string) => {
              const match = seatName.match(/\d+$/);
              return match ? parseInt(match[0]) : 0;
            }).filter((n: number) => n > 0)
          : Array.from({ length: config.count }, (_, i) => i + 1);

        const available = allSeatNumbers.filter((n: number) => !occupiedSeats.includes(n));

        return {
          category: config.category,
          seats: available,
        };
      });

      res.json(availableSeats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/bookings", requireAuth, (req: Request, res: Response) => {
    try {
      const data = req.body;
      const id = crypto.randomUUID();
      const now = Date.now();
      const bookingCode = `BK-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`;
      
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
        data.bookingCode || bookingCode,
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
      
      // Log activity
      const session = req.session as any;
      if (session?.userId) {
        createActivityLog(session.userId, session.username || 'unknown', session.role || 'staff', 'create', 'booking', id, `Created booking for ${data.customerName} at ${data.seatName}`);
      }
      
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

  app.patch("/api/bookings/:id/change-seat", requireAuth, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { newSeatName } = req.body;

      if (!newSeatName) {
        return res.status(400).json({ message: "New seat name is required" });
      }

      const booking = sqlite.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const parsed = parseBooking(booking);
      const oldSeatName = parsed.seatName;
      const newSeatNumber = parseInt(newSeatName.split('-')[1]);

      sqlite.prepare('UPDATE bookings SET seat_name = ?, seat_number = ? WHERE id = ?').run(newSeatName, newSeatNumber, id);

      const session = req.session as any;
      if (session?.userId) {
        createActivityLog(session.userId, session.username, session.role, 'update', 'booking', id, `Changed seat from ${oldSeatName} to ${newSeatName}`);
      }

      const updated = sqlite.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
      res.json(parseBooking(updated));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.delete("/api/bookings/:id", requireAuth, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const booking = sqlite.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      sqlite.prepare('DELETE FROM bookings WHERE id = ?').run(id);
      
      const session = req.session as any;
      const parsed = parseBooking(booking);
      if (session?.userId) {
        createActivityLog(session.userId, session.username, session.role, 'delete', 'booking', id, `Deleted booking for ${parsed.customerName} at ${parsed.seatName}`);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  // Archive bookings to history
  app.post("/api/bookings/archive", requireAuth, (req: Request, res: Response) => {
    try {
      const completedBookings = sqlite.prepare("SELECT * FROM bookings WHERE status IN ('completed', 'expired')").all();
      let count = 0;
      
      for (const booking of completedBookings) {
        const parsed = parseBooking(booking);
        const historyId = crypto.randomUUID();
        const now = Date.now();
        
        sqlite.prepare(`
          INSERT INTO booking_history (
            id, booking_id, booking_code, group_id, group_code, category, seat_number, seat_name,
            customer_name, whatsapp_number, start_time, end_time, price, status,
            booking_type, paused_remaining_time, person_count, payment_method,
            cash_amount, upi_amount, payment_status, last_payment_action, food_orders,
            original_price, discount_applied, bonus_hours_applied, promotion_details,
            is_promotional_discount, is_promotional_bonus, manual_discount_percentage,
            manual_free_hours, discount, bonus, created_at, archived_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          historyId,
          (booking as any).id,
          (booking as any).booking_code,
          (booking as any).group_id,
          (booking as any).group_code,
          (booking as any).category,
          (booking as any).seat_number,
          (booking as any).seat_name,
          (booking as any).customer_name,
          (booking as any).whatsapp_number,
          (booking as any).start_time,
          (booking as any).end_time,
          (booking as any).price,
          (booking as any).status,
          (booking as any).booking_type,
          (booking as any).paused_remaining_time,
          (booking as any).person_count,
          (booking as any).payment_method,
          (booking as any).cash_amount,
          (booking as any).upi_amount,
          (booking as any).payment_status,
          (booking as any).last_payment_action,
          (booking as any).food_orders,
          (booking as any).original_price,
          (booking as any).discount_applied,
          (booking as any).bonus_hours_applied,
          (booking as any).promotion_details,
          (booking as any).is_promotional_discount,
          (booking as any).is_promotional_bonus,
          (booking as any).manual_discount_percentage,
          (booking as any).manual_free_hours,
          (booking as any).discount,
          (booking as any).bonus,
          (booking as any).created_at,
          now
        );
        
        sqlite.prepare('DELETE FROM bookings WHERE id = ?').run((booking as any).id);
        count++;
      }
      
      res.json({ success: true, count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment endpoints
  app.post("/api/bookings/payment-method", requireAuth, (req: Request, res: Response) => {
    try {
      const { bookingIds, paymentMethod } = req.body;
      
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ message: "Booking IDs are required" });
      }
      
      if (!paymentMethod || !["cash", "upi_online"].includes(paymentMethod)) {
        return res.status(400).json({ message: "Valid payment method is required (cash or upi_online)" });
      }
      
      for (const id of bookingIds) {
        sqlite.prepare('UPDATE bookings SET payment_method = ? WHERE id = ?').run(paymentMethod, id);
      }
      
      res.json({ success: true, count: bookingIds.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings/payment-status", requireAuth, (req: Request, res: Response) => {
    try {
      const { bookingIds, paymentStatus, paymentMethod } = req.body;
      
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ message: "Booking IDs are required" });
      }
      
      if (!paymentStatus || !["unpaid", "pending", "paid"].includes(paymentStatus)) {
        return res.status(400).json({ message: "Valid payment status is required" });
      }

      const updatedBookings: any[] = [];
      for (const id of bookingIds) {
        if (paymentMethod) {
          sqlite.prepare('UPDATE bookings SET payment_status = ?, payment_method = ? WHERE id = ?').run(paymentStatus, paymentMethod, id);
        } else {
          sqlite.prepare('UPDATE bookings SET payment_status = ? WHERE id = ?').run(paymentStatus, id);
        }
        const booking = sqlite.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
        if (booking) {
          updatedBookings.push(parseBooking(booking));
        }
      }
      
      res.json({ success: true, count: updatedBookings.length, bookings: updatedBookings });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings/split-payment", requireAuth, (req: Request, res: Response) => {
    try {
      const { bookingIds, cashAmount, upiAmount } = req.body;
      
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ message: "Booking IDs are required" });
      }
      
      const totalCash = parseFloat(cashAmount) || 0;
      const totalUpi = parseFloat(upiAmount) || 0;
      
      if (totalCash === 0 && totalUpi === 0) {
        return res.status(400).json({ message: "At least one payment amount must be greater than zero" });
      }
      
      const updatedBookings: any[] = [];
      for (const id of bookingIds) {
        sqlite.prepare('UPDATE bookings SET payment_method = ?, cash_amount = ?, upi_amount = ?, payment_status = ? WHERE id = ?')
          .run("split", totalCash.toFixed(2), totalUpi.toFixed(2), "paid", id);
        const booking = sqlite.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
        if (booking) {
          updatedBookings.push(parseBooking(booking));
        }
      }
      
      res.json({ success: true, count: updatedBookings.length, bookings: updatedBookings });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== BOOKING HISTORY ====================
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

  // ==================== REPORTS & ANALYTICS ====================
  app.get("/api/reports/stats", requireAuth, (req: Request, res: Response) => {
    try {
      const period = req.query.period as string || "daily";
      const customStartDate = req.query.startDate as string;
      const customEndDate = req.query.endDate as string;
      
      let startDate: Date;
      let endDate: Date;
      const now = new Date();

      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        switch (period) {
          case "daily":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            break;
          case "weekly":
            const dayOfWeek = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            break;
          case "monthly":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        }
      }

      const startMs = startDate.getTime();
      const endMs = endDate.getTime();

      // Get bookings in date range from both current and history
      const currentBookings = sqlite.prepare('SELECT * FROM bookings WHERE start_time >= ? AND start_time <= ?').all(startMs, endMs).map(parseBooking);
      const historyBookings = sqlite.prepare('SELECT * FROM booking_history WHERE start_time >= ? AND start_time <= ?').all(startMs, endMs).map(parseBookingHistory);
      
      const allBookings = [...currentBookings, ...historyBookings];
      const completedBookings = allBookings.filter(b => b.status === 'completed' || b.status === 'expired');

      // Calculate stats
      const totalBookings = allBookings.length;
      const totalRevenue = completedBookings.reduce((sum, b) => sum + parseFloat(b.price || '0'), 0);
      const uniqueCustomers = new Set(allBookings.map(b => b.customerName?.toLowerCase().trim())).size;
      
      const avgSessionDuration = completedBookings.length > 0
        ? completedBookings.reduce((sum, b) => {
            const start = new Date(b.startTime).getTime();
            const end = new Date(b.endTime).getTime();
            return sum + (end - start) / (1000 * 60);
          }, 0) / completedBookings.length
        : 0;

      const foodRevenue = allBookings.reduce((sum, b) => {
        const orders = b.foodOrders || [];
        return sum + orders.reduce((orderSum: number, item: any) => 
          orderSum + (parseFloat(item.price) * item.quantity), 0);
      }, 0);

      res.json({
        totalBookings,
        totalRevenue: totalRevenue.toFixed(2),
        uniqueCustomers,
        avgSessionDuration: Math.round(avgSessionDuration),
        foodRevenue: foodRevenue.toFixed(2),
        completedBookings: completedBookings.length,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/history", requireAuth, (req: Request, res: Response) => {
    try {
      const period = req.query.period as string || "daily";
      const customStartDate = req.query.startDate as string;
      const customEndDate = req.query.endDate as string;
      
      let startDate: Date;
      let endDate: Date;
      const now = new Date();

      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        switch (period) {
          case "daily":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            break;
          case "weekly":
            const dayOfWeek = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            break;
          case "monthly":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        }
      }

      const startMs = startDate.getTime();
      const endMs = endDate.getTime();
      
      const history = sqlite.prepare('SELECT * FROM booking_history WHERE start_time >= ? AND start_time <= ? ORDER BY archived_at DESC').all(startMs, endMs);
      res.json(history.map(parseBookingHistory));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/retention-metrics", requireAuth, (req: Request, res: Response) => {
    try {
      const months = parseInt(req.query.months as string) || 6;
      const now = new Date();
      const startDate = new Date(now);
      startDate.setMonth(now.getMonth() - months);
      
      const startMs = startDate.getTime();
      const endMs = now.getTime();
      
      const history = sqlite.prepare('SELECT * FROM booking_history WHERE start_time >= ? AND start_time <= ?').all(startMs, endMs).map(parseBookingHistory);
      
      // Calculate retention metrics
      const customerVisits: Record<string, number> = {};
      history.forEach(b => {
        const key = b.customerName?.toLowerCase().trim() || '';
        customerVisits[key] = (customerVisits[key] || 0) + 1;
      });
      
      const totalCustomers = Object.keys(customerVisits).length;
      const returningCustomers = Object.values(customerVisits).filter(v => v > 1).length;
      const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
      
      res.json({
        totalCustomers,
        returningCustomers,
        retentionRate: Math.round(retentionRate * 100) / 100,
        period: `${months} months`
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/usage", requireAuth, (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange as string || "today";
      const now = new Date();
      
      let rangeStart: Date;
      let rangeEnd: Date = new Date(now);
      
      switch (timeRange) {
        case "today":
          rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case "week":
          const dayOfWeek = now.getDay();
          rangeStart = new Date(now);
          rangeStart.setDate(now.getDate() - dayOfWeek);
          rangeStart.setHours(0, 0, 0, 0);
          break;
        case "month":
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          break;
        case "all":
          rangeStart = new Date(0);
          break;
        default:
          rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      }

      const startMs = rangeStart.getTime();
      const endMs = rangeEnd.getTime();

      const allBookings = sqlite.prepare('SELECT * FROM bookings').all().map(parseBooking);
      const deviceConfigs = sqlite.prepare('SELECT * FROM device_configs').all().map((c: any) => ({
        ...c,
        seats: JSON.parse(c.seats || '[]')
      }));
      
      const activeBookings = allBookings.filter(b => b.status === "running" || b.status === "paused");
      const currentOccupancy = activeBookings.length;
      const totalCapacity = deviceConfigs.reduce((sum: number, config: any) => sum + config.count, 0);
      const occupancyRate = totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0;
      
      const categoryUsage = deviceConfigs.map((config: any) => {
        const occupied = activeBookings.filter(b => b.category === config.category).length;
        return {
          category: config.category,
          occupied,
          total: config.count,
          percentage: config.count > 0 ? Math.round((occupied / config.count) * 100) : 0
        };
      });

      const rangeBookings = allBookings.filter(b => {
        const start = new Date(b.startTime).getTime();
        return start >= startMs && start <= endMs;
      });
      
      const historyBookings = sqlite.prepare('SELECT * FROM booking_history WHERE start_time >= ? AND start_time <= ?').all(startMs, endMs).map(parseBookingHistory);
      const allRangeBookings = [...rangeBookings, ...historyBookings];

      const hourlyUsage = Array.from({ length: 24 }, (_, hour) => {
        const hourBookings = allRangeBookings.filter(b => {
          const start = new Date(b.startTime);
          return start.getHours() === hour;
        });
        const revenue = hourBookings.reduce((sum, b) => sum + parseFloat(b.price || '0'), 0);
        return {
          hour: `${hour.toString().padStart(2, '0')}:00`,
          bookings: hourBookings.length,
          revenue
        };
      }).filter(h => h.bookings > 0 || now.getHours() >= parseInt(h.hour));

      const uniqueCustomers = new Set(allRangeBookings.map(b => b.customerName?.toLowerCase().trim())).size;
      
      const completedBookings = allRangeBookings.filter(b => b.status === "completed" || b.status === "expired");
      const avgSessionDuration = completedBookings.length > 0
        ? completedBookings.reduce((sum, b) => {
            const start = new Date(b.startTime).getTime();
            const end = new Date(b.endTime).getTime();
            return sum + (end - start) / (1000 * 60);
          }, 0) / completedBookings.length
        : 0;

      const totalFoodOrders = allRangeBookings.reduce((sum, b) => sum + (b.foodOrders?.length || 0), 0);
      const foodRevenue = allRangeBookings.reduce((sum, b) => {
        return sum + (b.foodOrders || []).reduce((orderSum: number, item: any) => 
          orderSum + (parseFloat(item.price) * item.quantity), 0);
      }, 0);

      const realtimeData = Array.from({ length: 10 }, (_, i) => {
        const timestamp = new Date(now.getTime() - (9 - i) * 5000);
        return {
          timestamp: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          occupancy: currentOccupancy,
          capacity: totalCapacity
        };
      });

      res.json({
        currentOccupancy,
        totalCapacity,
        occupancyRate,
        activeBookings: activeBookings.length,
        categoryUsage,
        hourlyUsage,
        realtimeData,
        uniqueCustomers,
        avgSessionDuration: Math.round(avgSessionDuration),
        totalFoodOrders,
        foodRevenue
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== FOOD ITEMS ====================
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

  app.post("/api/food-items/:id/adjust-stock", requireAuth, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { quantity, type } = req.body;
      
      const item = sqlite.prepare('SELECT * FROM food_items WHERE id = ?').get(id) as any;
      if (!item) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      const currentStock = item.current_stock || 0;
      const newStock = type === 'add' ? currentStock + quantity : Math.max(0, currentStock - quantity);
      
      sqlite.prepare('UPDATE food_items SET current_stock = ? WHERE id = ?').run(newStock, id);
      
      const updated = sqlite.prepare('SELECT * FROM food_items WHERE id = ?').get(id);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== DEVICE CONFIG ====================
  app.get("/api/device-config", requireAuth, (req: Request, res: Response) => {
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
  
  app.post("/api/device-config", requireAdmin, (req: Request, res: Response) => {
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

  app.delete("/api/device-config/:category", requireAdmin, (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      sqlite.prepare('DELETE FROM device_configs WHERE category = ?').run(category);
      res.json({ success: true, message: `Deleted device config for ${category}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== PRICING CONFIG ====================
  app.get("/api/pricing-config", requireAuth, (req: Request, res: Response) => {
    try {
      const configs = sqlite.prepare('SELECT * FROM pricing_configs').all() as any[];
      // Map snake_case to camelCase for frontend compatibility
      const mapped = configs.map(c => ({
        id: c.id,
        category: c.category,
        duration: c.duration,
        price: c.price,
        personCount: c.person_count
      }));
      res.json(mapped);
    } catch (error) {
      console.error("Error fetching pricing configs:", error);
      res.status(500).json({ message: "Failed to fetch pricing configs" });
    }
  });
  
  app.post("/api/pricing-config", requireAdmin, (req: Request, res: Response) => {
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
      
      const updatedConfigs = sqlite.prepare('SELECT * FROM pricing_configs WHERE category = ?').all(category) as any[];
      // Map snake_case to camelCase for frontend compatibility
      const mapped = updatedConfigs.map(c => ({
        id: c.id,
        category: c.category,
        duration: c.duration,
        price: c.price,
        personCount: c.person_count
      }));
      res.json(mapped);
    } catch (error) {
      console.error("Error updating pricing configs:", error);
      res.status(500).json({ message: "Failed to update pricing configs" });
    }
  });

  app.delete("/api/pricing-config/:category", requireAdmin, (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      sqlite.prepare('DELETE FROM pricing_configs WHERE category = ?').run(category);
      res.json({ success: true, message: `Deleted pricing config for ${category}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== HAPPY HOURS ====================
  app.get("/api/happy-hours-config", requireAuth, (req: Request, res: Response) => {
    try {
      const configs = sqlite.prepare('SELECT * FROM happy_hours_configs').all() as any[];
      // Map snake_case to camelCase for frontend compatibility
      const mapped = configs.map(c => ({
        id: c.id,
        category: c.category,
        startTime: c.start_time,
        endTime: c.end_time,
        enabled: Boolean(c.enabled)
      }));
      res.json(mapped);
    } catch (error) {
      console.error("Error fetching happy hours configs:", error);
      res.status(500).json({ message: "Failed to fetch happy hours configs" });
    }
  });

  app.post("/api/happy-hours-config", requireAdmin, (req: Request, res: Response) => {
    try {
      const { category, configs } = req.body;
      if (!category || !Array.isArray(configs)) {
        return res.status(400).json({ message: "Invalid request format" });
      }
      
      // Delete existing configs for this category
      sqlite.prepare('DELETE FROM happy_hours_configs WHERE category = ?').run(category);
      
      // Insert new configs
      for (const config of configs) {
        const id = crypto.randomUUID();
        sqlite.prepare(`
          INSERT INTO happy_hours_configs (id, category, start_time, end_time, enabled)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, category, config.startTime, config.endTime, config.enabled ? 1 : 0);
      }
      
      const updatedConfigs = sqlite.prepare('SELECT * FROM happy_hours_configs WHERE category = ?').all(category) as any[];
      // Map snake_case to camelCase for frontend compatibility
      const mapped = updatedConfigs.map(c => ({
        id: c.id,
        category: c.category,
        startTime: c.start_time,
        endTime: c.end_time,
        enabled: Boolean(c.enabled)
      }));
      res.json(mapped);
    } catch (error) {
      console.error("Error updating happy hours configs:", error);
      res.status(500).json({ message: "Failed to update happy hours configs" });
    }
  });

  app.delete("/api/happy-hours-config/:category", requireAdmin, (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      sqlite.prepare('DELETE FROM happy_hours_configs WHERE category = ?').run(category);
      res.json({ success: true, message: `Deleted happy hours config for ${category}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/happy-hours-pricing", requireAuth, (req: Request, res: Response) => {
    try {
      const pricing = sqlite.prepare('SELECT * FROM happy_hours_pricing').all() as any[];
      // Map snake_case to camelCase for frontend compatibility
      const mapped = pricing.map(p => ({
        id: p.id,
        category: p.category,
        duration: p.duration,
        price: p.price,
        personCount: p.person_count
      }));
      res.json(mapped);
    } catch (error) {
      console.error("Error fetching happy hours pricing:", error);
      res.status(500).json({ message: "Failed to fetch happy hours pricing" });
    }
  });

  app.post("/api/happy-hours-pricing", requireAdmin, (req: Request, res: Response) => {
    try {
      const { category, configs } = req.body;
      if (!category || !Array.isArray(configs)) {
        return res.status(400).json({ message: "Invalid request format" });
      }
      
      // Delete existing pricing for this category
      sqlite.prepare('DELETE FROM happy_hours_pricing WHERE category = ?').run(category);
      
      // Insert new pricing
      for (const config of configs) {
        const id = crypto.randomUUID();
        sqlite.prepare(`
          INSERT INTO happy_hours_pricing (id, category, duration, price, person_count)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, category, config.duration, config.price, config.personCount || 1);
      }
      
      const updatedPricing = sqlite.prepare('SELECT * FROM happy_hours_pricing WHERE category = ?').all(category) as any[];
      // Map snake_case to camelCase for frontend compatibility
      const mapped = updatedPricing.map(p => ({
        id: p.id,
        category: p.category,
        duration: p.duration,
        price: p.price,
        personCount: p.person_count
      }));
      res.json(mapped);
    } catch (error) {
      console.error("Error updating happy hours pricing:", error);
      res.status(500).json({ message: "Failed to update happy hours pricing" });
    }
  });

  app.delete("/api/happy-hours-pricing/:category", requireAdmin, (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      sqlite.prepare('DELETE FROM happy_hours_pricing WHERE category = ?').run(category);
      res.json({ success: true, message: `Deleted happy hours pricing for ${category}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/happy-hours-active/:category", (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const config = sqlite.prepare('SELECT * FROM happy_hours_configs WHERE category = ? AND enabled = 1').get(category) as any;
      
      if (!config) {
        return res.json({ active: false });
      }
      
      const isActive = currentTime >= config.start_time && currentTime <= config.end_time;
      res.json({ active: isActive });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== EXPENSES ====================
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

  app.patch("/api/expenses/:id", requireAuth, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const updates: string[] = [];
      const values: any[] = [];
      
      Object.entries(data).forEach(([key, value]) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (key === 'date') {
          updates.push(`${snakeKey} = ?`);
          values.push(new Date(value as string).getTime());
        } else {
          updates.push(`${snakeKey} = ?`);
          values.push(value);
        }
      });
      
      if (updates.length > 0) {
        values.push(id);
        sqlite.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }
      
      const expense = sqlite.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
      res.json(expense);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      sqlite.prepare('DELETE FROM expenses WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== ACTIVITY LOGS ====================
  app.get("/api/activity-logs", requireAuth, (req: Request, res: Response) => {
    try {
      const logs = sqlite.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 500').all();
      const parsed = logs.map((l: any) => ({
        ...l,
        userId: l.user_id,
        userRole: l.user_role,
        entityType: l.entity_type,
        entityId: l.entity_id,
        createdAt: new Date(l.created_at)
      }));
      res.json(parsed);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // ==================== NOTIFICATIONS ====================
  app.get("/api/notifications", requireAuth, (req: Request, res: Response) => {
    try {
      const notifications = sqlite.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100').all();
      const parsed = notifications.map((n: any) => ({
        ...n,
        entityType: n.entity_type,
        entityId: n.entity_id,
        activityLogId: n.activity_log_id,
        isRead: n.is_read === 1,
        createdAt: new Date(n.created_at)
      }));
      res.json(parsed);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      sqlite.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
      const notification = sqlite.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/mark-all-read", requireAuth, (req: Request, res: Response) => {
    try {
      sqlite.prepare('UPDATE notifications SET is_read = 1').run();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== GAMING CENTER INFO ====================
  app.get("/api/gaming-center-info", (req: Request, res: Response) => {
    try {
      const info = sqlite.prepare('SELECT * FROM gaming_center_info LIMIT 1').get();
      res.json(info || null);
    } catch (error) {
      console.error("Error fetching gaming center info:", error);
      res.status(500).json({ message: "Failed to fetch gaming center info" });
    }
  });

  app.post("/api/gaming-center-info", requireAdmin, (req: Request, res: Response) => {
    try {
      const data = req.body;
      const existing = sqlite.prepare('SELECT * FROM gaming_center_info LIMIT 1').get() as any;
      
      if (existing) {
        sqlite.prepare(`
          UPDATE gaming_center_info SET 
            name = ?, description = ?, address = ?, phone = ?, email = ?, hours = ?, timezone = ?, updated_at = ?
          WHERE id = ?
        `).run(data.name, data.description, data.address, data.phone, data.email, data.hours, data.timezone || 'Asia/Kolkata', Date.now(), existing.id);
      } else {
        const id = crypto.randomUUID();
        sqlite.prepare(`
          INSERT INTO gaming_center_info (id, name, description, address, phone, email, hours, timezone, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, data.name, data.description, data.address, data.phone, data.email, data.hours, data.timezone || 'Asia/Kolkata', Date.now());
      }
      
      const info = sqlite.prepare('SELECT * FROM gaming_center_info LIMIT 1').get();
      res.json(info);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== USERS ====================
  app.get("/api/users", requireAdmin, (req: Request, res: Response) => {
    try {
      const users = sqlite.prepare('SELECT id, username, email, first_name, last_name, role, onboarding_completed, created_at FROM users').all();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // ==================== PAYMENT LOGS ====================
  app.get("/api/payment-logs", requireAuth, (req: Request, res: Response) => {
    try {
      const logs = sqlite.prepare('SELECT * FROM payment_logs ORDER BY created_at DESC LIMIT 500').all();
      const parsed = logs.map((l: any) => ({
        ...l,
        bookingId: l.booking_id,
        seatName: l.seat_name,
        customerName: l.customer_name,
        paymentMethod: l.payment_method,
        paymentStatus: l.payment_status,
        userId: l.user_id,
        previousStatus: l.previous_status,
        previousMethod: l.previous_method,
        createdAt: new Date(l.created_at)
      }));
      res.json(parsed);
    } catch (error) {
      console.error("Error fetching payment logs:", error);
      res.status(500).json({ message: "Failed to fetch payment logs" });
    }
  });

  // ==================== DEVICE MAINTENANCE ====================
  app.get("/api/device-maintenance", requireAuth, (req: Request, res: Response) => {
    try {
      const maintenance = sqlite.prepare('SELECT * FROM device_maintenance ORDER BY updated_at DESC').all();
      const parsed = maintenance.map((m: any) => ({
        ...m,
        seatName: m.seat_name,
        lastMaintenanceDate: m.last_maintenance_date ? new Date(m.last_maintenance_date) : null,
        totalUsageHours: m.total_usage_hours,
        totalSessions: m.total_sessions,
        issuesReported: m.issues_reported,
        maintenanceNotes: m.maintenance_notes,
        createdAt: new Date(m.created_at),
        updatedAt: new Date(m.updated_at)
      }));
      res.json(parsed);
    } catch (error) {
      console.error("Error fetching device maintenance:", error);
      res.status(500).json({ message: "Failed to fetch device maintenance" });
    }
  });

  app.get("/api/ai/maintenance/predictions", requireAuth, (req: Request, res: Response) => {
    try {
      // Get device maintenance data and predict issues
      const maintenance = sqlite.prepare('SELECT * FROM device_maintenance').all() as any[];
      const deviceConfigs = sqlite.prepare('SELECT * FROM device_configs').all().map((c: any) => ({
        ...c,
        seats: JSON.parse(c.seats || '[]')
      }));

      const predictions: any[] = [];
      let highRiskCount = 0;
      let mediumRiskCount = 0;
      let lowRiskCount = 0;
      const recommendedActions: string[] = [];

      for (const config of deviceConfigs) {
        for (const seatName of config.seats) {
          const device = maintenance.find(m => m.seat_name === seatName) || {
            category: config.category,
            seat_name: seatName,
            total_usage_hours: 0,
            total_sessions: 0,
            issues_reported: 0,
            status: 'healthy',
            last_maintenance_date: null
          };

          // Simple prediction based on usage
          const usageHours = device.total_usage_hours || 0;
          const totalSessions = device.total_sessions || 0;
          const issuesReported = device.issues_reported || 0;
          const daysSinceLastMaintenance = device.last_maintenance_date 
            ? Math.floor((Date.now() - device.last_maintenance_date) / (1000 * 60 * 60 * 24))
            : null;
          
          // Calculate risk level
          let riskLevel: "low" | "medium" | "high" = "low";
          let recommendedAction = "No action needed";
          let estimatedDaysUntilMaintenance = 90;
          let reasoning = "Device is operating normally with low usage.";

          if (usageHours > 1000 || issuesReported > 5) {
            riskLevel = "high";
            highRiskCount++;
            recommendedAction = "Schedule immediate maintenance check";
            estimatedDaysUntilMaintenance = 7;
            reasoning = `High usage (${usageHours}h) and/or multiple issues reported (${issuesReported}). Immediate attention recommended.`;
            if (!recommendedActions.includes(recommendedAction)) recommendedActions.push(recommendedAction);
          } else if (usageHours > 500 || issuesReported > 2) {
            riskLevel = "medium";
            mediumRiskCount++;
            recommendedAction = "Plan maintenance within 2 weeks";
            estimatedDaysUntilMaintenance = 14;
            reasoning = `Moderate usage (${usageHours}h) with some issues. Preventive maintenance recommended.`;
            if (!recommendedActions.includes(recommendedAction)) recommendedActions.push(recommendedAction);
          } else {
            lowRiskCount++;
          }

          predictions.push({
            category: config.category,
            seatName,
            riskLevel,
            recommendedAction,
            estimatedDaysUntilMaintenance,
            reasoning,
            metrics: {
              usageHours,
              totalSessions,
              issuesReported,
              daysSinceLastMaintenance
            }
          });
        }
      }

      res.json({ 
        predictions,
        summary: {
          highRiskDevices: highRiskCount,
          mediumRiskDevices: mediumRiskCount,
          lowRiskDevices: lowRiskCount,
          totalDevices: predictions.length,
          recommendedActions
        },
        generatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ai/traffic/predictions", requireAuth, (req: Request, res: Response) => {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();

      // Simple traffic predictions based on time
      const predictions: any[] = [];
      let peakHour = "18:00";
      let peakVisitors = 0;
      let totalPredictedVisitors = 0;
      const insights: string[] = [];

      for (let i = 0; i < 24; i++) {
        let predictedVisitors = 5; // Base visitors
        
        // Peak hours (evening gaming time)
        if (i >= 16 && i <= 22) predictedVisitors = 15 + Math.floor(Math.random() * 5);
        else if (i >= 10 && i <= 15) predictedVisitors = 8 + Math.floor(Math.random() * 3);
        else if (i >= 23 || i <= 6) predictedVisitors = 2;
        
        // Weekend boost
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          predictedVisitors = Math.round(predictedVisitors * 1.3);
        }

        // Determine confidence level
        let confidence: "low" | "medium" | "high" = "medium";
        if (i >= 16 && i <= 20) confidence = "high";
        else if (i >= 23 || i <= 8) confidence = "low";

        if (predictedVisitors > peakVisitors) {
          peakVisitors = predictedVisitors;
          peakHour = `${i.toString().padStart(2, '0')}:00`;
        }
        totalPredictedVisitors += predictedVisitors;

        predictions.push({
          hour: `${i.toString().padStart(2, '0')}:00`,
          predictedVisitors,
          confidence
        });
      }

      // Generate insights
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        insights.push("Weekend traffic expected to be 30% higher than weekdays");
      }
      insights.push(`Peak traffic expected around ${peakHour} with approximately ${peakVisitors} visitors`);
      insights.push("Consider additional staffing during evening hours (4 PM - 10 PM)");

      res.json({ 
        predictions,
        summary: {
          peakHour,
          peakVisitors,
          totalPredictedVisitors,
          averageVisitors: Math.round(totalPredictedVisitors / 24),
          insights
        },
        generatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== PUBLIC STATUS ====================
  app.get("/api/public/status", (req: Request, res: Response) => {
    try {
      const deviceConfigs = sqlite.prepare('SELECT * FROM device_configs').all().map((c: any) => ({
        ...c,
        seats: JSON.parse(c.seats || '[]')
      }));
      
      const activeBookings = sqlite.prepare("SELECT * FROM bookings WHERE status IN ('running', 'paused')").all().map(parseBooking);
      
      const status = deviceConfigs.map((config: any) => {
        const occupiedSeats = activeBookings
          .filter(b => b.category === config.category)
          .map(b => b.seatName);
        
        return {
          category: config.category,
          total: config.count,
          available: config.count - occupiedSeats.length,
          occupied: occupiedSeats.length,
          seats: config.seats.map((seatName: string) => ({
            name: seatName,
            status: occupiedSeats.includes(seatName) ? 'occupied' : 'available'
          }))
        };
      });
      
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== RETENTION CONFIG ====================
  app.get("/api/retention/config", requireAdmin, (req: Request, res: Response) => {
    try {
      let config = sqlite.prepare('SELECT * FROM retention_config LIMIT 1').get();
      if (!config) {
        const id = crypto.randomUUID();
        sqlite.prepare(`
          INSERT INTO retention_config (id, booking_history_days, activity_logs_days, load_metrics_days, load_predictions_days, expenses_days, updated_at)
          VALUES (?, 36500, 36500, 36500, 36500, 36500, ?)
        `).run(id, Date.now());
        config = sqlite.prepare('SELECT * FROM retention_config LIMIT 1').get();
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}

// Helper function to create activity log
function createActivityLog(userId: string, username: string, userRole: string, action: string, entityType: string, entityId: string, details: string) {
  const id = crypto.randomUUID();
  const now = Date.now();
  sqlite.prepare(`
    INSERT INTO activity_logs (id, user_id, username, user_role, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, username, userRole, action, entityType, entityId, details, now);
}

function parseBooking(row: any) {
  if (!row) return null;
  return {
    ...row,
    id: row.id,
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
