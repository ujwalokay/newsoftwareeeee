import { 
  type Booking, 
  type InsertBooking, 
  type DeviceConfig,
  type InsertDeviceConfig,
  type PricingConfig,
  type InsertPricingConfig,
  type HappyHoursConfig,
  type InsertHappyHoursConfig,
  type HappyHoursPricing,
  type InsertHappyHoursPricing,
  type FoodItem,
  type InsertFoodItem,
  type StockBatch,
  type InsertStockBatch,
  type BookingHistory,
  type InsertBookingHistory,
  type User,
  type InsertUser,
  type UpsertUser,
  type Expense,
  type InsertExpense,
  type ActivityLog,
  type InsertActivityLog,
  type Notification,
  type InsertNotification,
  type GamingCenterInfo,
  type InsertGamingCenterInfo,
  type GalleryImage,
  type InsertGalleryImage,
  type Facility,
  type InsertFacility,
  type Game,
  type InsertGame,
  type LoadMetric,
  type InsertLoadMetric,
  type LoadPrediction,
  type InsertLoadPrediction,
  type RetentionConfig,
  type InsertRetentionConfig,
  type DeviceMaintenance,
  type InsertDeviceMaintenance,
  type PaymentLog,
  type InsertPaymentLog,
  bookings,
  deviceConfigs,
  pricingConfigs,
  happyHoursConfigs,
  happyHoursPricing,
  foodItems,
  stockBatches,
  bookingHistory,
  users,
  expenses,
  activityLogs,
  notifications,
  gamingCenterInfo,
  galleryImages,
  facilities,
  games,
  loadMetrics,
  loadPredictions,
  retentionConfig,
  deviceMaintenance,
  paymentLogs
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, lt, desc, inArray, isNotNull } from "drizzle-orm";
import bcrypt from "bcrypt";
import { SecurityConfig, validatePasswordStrength } from "./security";

export interface BookingStats {
  totalRevenue: number;
  totalFoodRevenue: number;
  totalSessions: number;
  avgSessionMinutes: number;
  cashRevenue: number;
  upiRevenue: number;
}

export interface BookingHistoryItem {
  id: string;
  date: string;
  seatName: string;
  customerName: string;
  duration: string;
  durationMinutes: number;
  price: string;
  foodAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  paymentStatus?: string;
  cashAmount: string | null;
  upiAmount: string | null;
  discount?: string | null;
  bonus?: string | null;
  discountApplied?: string | null;
  bonusHoursApplied?: string | null;
}

export interface CustomerPromotionSummary {
  discountCount: number;
  bonusCount: number;
  totalSavings: number;
  totalBonusHours: number;
}

export interface PromotionHistoryItem {
  bookingId: string;
  seatName: string;
  date: string;
  promotionType: 'discount' | 'bonus';
  discountPercentage?: number;
  discountAmount?: string;
  bonusHours?: string;
  originalPrice?: string;
  finalPrice: string;
}

export interface RetentionMetrics {
  summary: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    retentionRate: number;
    churnRate: number;
    avgVisitFrequency: number;
    avgLifetimeValue: number;
  };
  series: {
    period: string;
    newCustomers: number;
    returningCustomers: number;
    totalVisits: number;
    retentionRate: number;
    revenue: number;
  }[];
}

export interface IStorage {
  getAllBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByIds(ids: string[]): Promise<Booking[]>;
  getActiveBookings(): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
  
  getBookingStats(startDate: Date, endDate: Date): Promise<BookingStats>;
  getBookingHistory(startDate: Date, endDate: Date): Promise<BookingHistoryItem[]>;
  getCustomerPromotionSummary(whatsappNumber: string): Promise<CustomerPromotionSummary>;
  getPromotionHistoryByCustomer(whatsappNumber: string): Promise<PromotionHistoryItem[]>;
  getRetentionMetrics(startDate: Date, endDate: Date, period: 'daily' | 'weekly' | 'monthly'): Promise<RetentionMetrics>;
  
  moveBookingsToHistory(): Promise<number>;
  getAllBookingHistory(): Promise<BookingHistory[]>;
  
  getAllDeviceConfigs(): Promise<DeviceConfig[]>;
  getDeviceConfig(category: string): Promise<DeviceConfig | undefined>;
  upsertDeviceConfig(config: InsertDeviceConfig): Promise<DeviceConfig>;
  deleteDeviceConfig(category: string): Promise<boolean>;
  
  getAllPricingConfigs(): Promise<PricingConfig[]>;
  getPricingConfigsByCategory(category: string): Promise<PricingConfig[]>;
  upsertPricingConfigs(category: string, configs: InsertPricingConfig[]): Promise<PricingConfig[]>;
  deletePricingConfig(category: string): Promise<boolean>;
  
  getAllHappyHoursConfigs(): Promise<HappyHoursConfig[]>;
  getHappyHoursConfigsByCategory(category: string): Promise<HappyHoursConfig[]>;
  upsertHappyHoursConfigs(category: string, configs: InsertHappyHoursConfig[]): Promise<HappyHoursConfig[]>;
  deleteHappyHoursConfig(category: string): Promise<boolean>;
  isHappyHoursActive(category: string): Promise<boolean>;
  
  getAllHappyHoursPricing(): Promise<HappyHoursPricing[]>;
  getHappyHoursPricingByCategory(category: string): Promise<HappyHoursPricing[]>;
  upsertHappyHoursPricing(category: string, configs: InsertHappyHoursPricing[]): Promise<HappyHoursPricing[]>;
  deleteHappyHoursPricing(category: string): Promise<boolean>;
  
  getAllFoodItems(): Promise<FoodItem[]>;
  getFoodItem(id: string): Promise<FoodItem | undefined>;
  createFoodItem(item: InsertFoodItem): Promise<FoodItem>;
  updateFoodItem(id: string, item: InsertFoodItem): Promise<FoodItem | undefined>;
  deleteFoodItem(id: string): Promise<boolean>;
  adjustStock(foodId: string, quantity: number, type: 'add' | 'remove', batchData?: Partial<InsertStockBatch>): Promise<FoodItem | undefined>;
  getLowStockItems(): Promise<FoodItem[]>;
  getInventoryItems(): Promise<FoodItem[]>;
  addToInventory(id: string): Promise<FoodItem | undefined>;
  removeFromInventory(id: string): Promise<FoodItem | undefined>;
  getExpiringItems(daysAhead: number): Promise<FoodItem[]>;
  getReorderList(): Promise<FoodItem[]>;
  
  createStockBatch(batch: InsertStockBatch): Promise<StockBatch>;
  getStockBatchesByFoodItem(foodItemId: string): Promise<StockBatch[]>;
  getAllStockBatches(): Promise<StockBatch[]>;
  
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  validatePassword(username: string, password: string): Promise<User | null>;
  updateUserOnboarding(userId: string, completed: boolean): Promise<boolean>;
  
  getAllExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: InsertExpense): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
  getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;
  
  getAllActivityLogs(): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogsByDateRange(startDate: Date, endDate: Date): Promise<ActivityLog[]>;
  
  getGamingCenterInfo(): Promise<GamingCenterInfo | undefined>;
  upsertGamingCenterInfo(info: InsertGamingCenterInfo): Promise<GamingCenterInfo>;
  
  getAllGalleryImages(): Promise<GalleryImage[]>;
  getGalleryImage(id: string): Promise<GalleryImage | undefined>;
  createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage>;
  updateGalleryImage(id: string, image: InsertGalleryImage): Promise<GalleryImage | undefined>;
  deleteGalleryImage(id: string): Promise<boolean>;
  
  getAllFacilities(): Promise<Facility[]>;
  getFacility(id: string): Promise<Facility | undefined>;
  createFacility(facility: InsertFacility): Promise<Facility>;
  updateFacility(id: string, facility: InsertFacility): Promise<Facility | undefined>;
  deleteFacility(id: string): Promise<boolean>;
  
  getAllGames(): Promise<Game[]>;
  getGamesByCategory(category: string): Promise<Game[]>;
  getGame(id: string): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: string, game: InsertGame): Promise<Game | undefined>;
  deleteGame(id: string): Promise<boolean>;
  
  getAllLoadMetrics(): Promise<LoadMetric[]>;
  getRecentLoadMetrics(limit: number): Promise<LoadMetric[]>;
  createLoadMetric(metric: InsertLoadMetric): Promise<LoadMetric>;
  getCurrentLoad(): Promise<LoadMetric | undefined>;
  
  getAllLoadPredictions(): Promise<LoadPrediction[]>;
  getRecentLoadPredictions(limit: number): Promise<LoadPrediction[]>;
  createLoadPrediction(prediction: InsertLoadPrediction): Promise<LoadPrediction>;
  
  deleteOldBookingHistory(olderThanDays: number): Promise<number>;
  deleteOldActivityLogs(olderThanDays: number): Promise<number>;
  deleteOldLoadMetrics(olderThanDays: number): Promise<number>;
  deleteOldLoadPredictions(olderThanDays: number): Promise<number>;
  deleteOldExpenses(olderThanDays: number): Promise<number>;
  
  getRetentionConfig(): Promise<RetentionConfig>;
  updateRetentionConfig(config: Partial<InsertRetentionConfig>): Promise<RetentionConfig>;
  
  getAllDeviceMaintenance(): Promise<DeviceMaintenance[]>;
  getDeviceMaintenance(category: string, seatName: string): Promise<DeviceMaintenance | undefined>;
  upsertDeviceMaintenance(data: InsertDeviceMaintenance): Promise<DeviceMaintenance>;
  updateDeviceMaintenanceStatus(category: string, seatName: string, status: string, notes?: string): Promise<DeviceMaintenance | undefined>;
  
  getAllNotifications(): Promise<Notification[]>;
  getUnreadNotifications(): Promise<Notification[]>;
  getNotificationById(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(): Promise<void>;
  deleteNotification(id: string): Promise<boolean>;
  getUnreadCount(): Promise<number>;
  
  createPaymentLog(log: InsertPaymentLog): Promise<PaymentLog>;
  getPaymentLogs(date?: string): Promise<PaymentLog[]>;
  
  updatePaymentStatus(bookingIds: string[], paymentStatus: string, paymentMethod: string | null, userId: string): Promise<{ bookings: Booking[], count: number }>;
  
  initializeDefaults(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async initializeDefaults(): Promise<void> {
    // Check if defaults already exist
    const existingDevices = await db.select().from(deviceConfigs);
    const existingUsers = await db.select().from(users);
    
    // Initialize default device configs if not exist
    if (existingDevices.length === 0) {
      await db.insert(deviceConfigs).values([
        {
          category: "PC",
          count: 5,
          seats: ["PC-1", "PC-2", "PC-3", "PC-4", "PC-5"]
        },
        {
          category: "PS5",
          count: 3,
          seats: ["PS5-1", "PS5-2", "PS5-3"]
        }
      ]);

      // Initialize default pricing configs
      await db.insert(pricingConfigs).values([
        { category: "PC", duration: "30 mins", price: "10" },
        { category: "PC", duration: "1 hour", price: "18" },
        { category: "PC", duration: "2 hours", price: "30" },
        { category: "PS5", duration: "30 mins", price: "15" },
        { category: "PS5", duration: "1 hour", price: "25" },
        { category: "PS5", duration: "2 hours", price: "45" }
      ]);

      // Initialize default food items
      await db.insert(foodItems).values([
        { name: "Pizza", price: "8" },
        { name: "Burger", price: "6" },
        { name: "Fries", price: "3" },
        { name: "Soda", price: "2" },
        { name: "Water", price: "1" },
        { name: "Sandwich", price: "5" },
        { name: "Hot Dog", price: "4" },
        { name: "Coffee", price: "3" },
        { name: "Energy Drink", price: "4" },
        { name: "Nachos", price: "5" },
      ]);
    }

    // Initialize default users if no users exist
    if (existingUsers.length === 0) {
      const isDesktopMode = process.env.DESKTOP === '1' || process.env.NWJS === '1';
      const adminUsername = process.env.ADMIN_USERNAME || (isDesktopMode ? 'admin' : undefined);
      const adminPassword = process.env.ADMIN_PASSWORD || (isDesktopMode ? 'admin123' : undefined);
      const staffUsername = process.env.STAFF_USERNAME;
      const staffPassword = process.env.STAFF_PASSWORD;
      
      if (!adminUsername || !adminPassword) {
        console.error('❌ ERROR: No admin user exists and ADMIN_USERNAME/ADMIN_PASSWORD environment variables are not set!');
        console.error('❌ Please set ADMIN_USERNAME and ADMIN_PASSWORD to create an admin user.');
        console.error('❌ The application will continue without users.');
        return;
      }
      
      if (isDesktopMode) {
        console.log('📱 Desktop mode detected - creating default admin user');
      }
      
      if (adminPassword.length < 8) {
        console.error('❌ WARNING: ADMIN_PASSWORD must be at least 8 characters long. Admin user not created.');
      } else {
        // Create admin user with email if provided (skip strict validation for initial setup)
        const adminEmail = process.env.ADMIN_EMAIL;
        await this.createUser({
          username: adminUsername,
          password: adminPassword,
          email: adminEmail,
          role: "admin"
        }, true);
        console.log(`✅ Admin user created with username: ${adminUsername}`);
        if (adminEmail) {
          console.log(`✅ Admin email set to: ${adminEmail}`);
        }
      }
      
      // Create staff user if credentials provided
      if (staffUsername && staffPassword) {
        if (staffPassword.length < 8) {
          console.error('❌ WARNING: STAFF_PASSWORD must be at least 8 characters long. Staff user not created.');
        } else {
          await this.createUser({
            username: staffUsername,
            password: staffPassword,
            role: "staff"
          }, true);
          console.log(`✅ Staff user created with username: ${staffUsername}`);
        }
      } else {
        console.log('ℹ️  No staff user created. Set STAFF_USERNAME and STAFF_PASSWORD to create a staff user.');
      }
    } else {
      // Check if staff user needs to be created (even if admin exists)
      const staffUsername = process.env.STAFF_USERNAME;
      const staffPassword = process.env.STAFF_PASSWORD;
      
      if (staffUsername && staffPassword) {
        const staffUserExists = existingUsers.some(u => u.username === staffUsername);
        
        if (!staffUserExists) {
          if (staffPassword.length < 8) {
            console.error('❌ WARNING: STAFF_PASSWORD must be at least 8 characters long. Staff user not created.');
          } else {
            await this.createUser({
              username: staffUsername,
              password: staffPassword,
              role: "staff"
            }, true);
            console.log(`✅ Staff user created with username: ${staffUsername}`);
          }
        }
      }
    }

    console.log('Database initialized with default data');
  }

  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings);
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingsByIds(ids: string[]): Promise<Booking[]> {
    if (ids.length === 0) return [];
    return await db.select().from(bookings).where(inArray(bookings.id, ids));
  }

  async getActiveBookings(): Promise<Booking[]> {
    return await db.select().from(bookings);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values({ 
      ...booking, 
      bookingCode: booking.bookingCode ?? null,
      groupId: booking.groupId ?? null,
      groupCode: booking.groupCode ?? null
    } as any).returning();
    return newBooking;
  }

  async updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const updateData: any = { ...data };
    if (data.foodOrders !== undefined) {
      updateData.foodOrders = data.foodOrders;
    }
    // Convert date strings to Date objects
    if (data.startTime && typeof data.startTime === 'string') {
      updateData.startTime = new Date(data.startTime);
    }
    if (data.endTime && typeof data.endTime === 'string') {
      updateData.endTime = new Date(data.endTime);
    }
    const [updated] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBooking(id: string): Promise<boolean> {
    const result = await db.delete(bookings).where(eq(bookings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getBookingStats(startDate: Date, endDate: Date): Promise<BookingStats> {
    const completedBookings = await db
      .select()
      .from(bookingHistory)
      .where(
        and(
          gte(bookingHistory.startTime, startDate),
          lte(bookingHistory.startTime, endDate)
        )
      );

    const cashRevenue = completedBookings
      .reduce((sum, booking) => {
        if (booking.paymentMethod === "cash") {
          const sessionPrice = parseFloat(booking.price);
          const foodPrice = booking.foodOrders && booking.foodOrders.length > 0
            ? booking.foodOrders.reduce((foodSum, order) => 
                foodSum + parseFloat(order.price) * order.quantity, 0)
            : 0;
          return sum + sessionPrice + foodPrice;
        } else if (booking.paymentMethod === "split" && booking.cashAmount) {
          return sum + parseFloat(booking.cashAmount);
        }
        return sum;
      }, 0);

    const upiRevenue = completedBookings
      .reduce((sum, booking) => {
        if (booking.paymentMethod === "upi_online") {
          const sessionPrice = parseFloat(booking.price);
          const foodPrice = booking.foodOrders && booking.foodOrders.length > 0
            ? booking.foodOrders.reduce((foodSum, order) => 
                foodSum + parseFloat(order.price) * order.quantity, 0)
            : 0;
          return sum + sessionPrice + foodPrice;
        } else if (booking.paymentMethod === "split" && booking.upiAmount) {
          return sum + parseFloat(booking.upiAmount);
        }
        return sum;
      }, 0);

    const paidBookings = completedBookings.filter(b => 
      b.paymentMethod === "cash" || b.paymentMethod === "upi_online" || b.paymentMethod === "split"
    );

    const totalRevenue = paidBookings.reduce((sum, booking) => {
      return sum + parseFloat(booking.price);
    }, 0);

    const totalFoodRevenue = paidBookings.reduce((sum, booking) => {
      if (booking.foodOrders && booking.foodOrders.length > 0) {
        return sum + booking.foodOrders.reduce((foodSum, order) => 
          foodSum + parseFloat(order.price) * order.quantity, 0
        );
      }
      return sum;
    }, 0);

    const totalSessions = completedBookings.length;

    const totalMinutes = completedBookings.reduce((sum, booking) => {
      const duration = booking.endTime.getTime() - booking.startTime.getTime();
      return sum + (duration / 1000 / 60);
    }, 0);

    const avgSessionMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

    return {
      totalRevenue,
      totalFoodRevenue,
      totalSessions,
      avgSessionMinutes,
      cashRevenue,
      upiRevenue
    };
  }

  async getBookingHistory(startDate: Date, endDate: Date): Promise<BookingHistoryItem[]> {
    const completedBookings = await db
      .select()
      .from(bookingHistory)
      .where(
        and(
          gte(bookingHistory.startTime, startDate),
          lte(bookingHistory.startTime, endDate)
        )
      );

    const bookingItems: BookingHistoryItem[] = completedBookings.map(booking => {
      const durationMs = booking.endTime.getTime() - booking.startTime.getTime();
      const durationMinutes = Math.round(durationMs / 1000 / 60);
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      
      let duration: string;
      if (hours > 0 && mins > 0) {
        duration = `${hours} hour${hours > 1 ? 's' : ''} ${mins} mins`;
      } else if (hours > 0) {
        duration = `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        duration = `${mins} mins`;
      }

      const foodAmount = booking.foodOrders && booking.foodOrders.length > 0
        ? booking.foodOrders.reduce((sum, order) => sum + parseFloat(order.price) * order.quantity, 0)
        : 0;

      const sessionPrice = parseFloat(booking.price);
      const totalAmount = sessionPrice + foodAmount;

      const dateObj = new Date(booking.startTime);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      return {
        id: booking.id,
        date: formattedDate,
        seatName: booking.seatName,
        customerName: booking.customerName,
        duration,
        durationMinutes,
        price: booking.price,
        foodAmount,
        totalAmount,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        cashAmount: booking.cashAmount,
        upiAmount: booking.upiAmount,
        discount: booking.discount,
        bonus: booking.bonus,
        discountApplied: booking.discountApplied,
        bonusHoursApplied: booking.bonusHoursApplied
      };
    });

    return bookingItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getRetentionMetrics(startDate: Date, endDate: Date, period: 'daily' | 'weekly' | 'monthly'): Promise<RetentionMetrics> {
    const allBookings = await db
      .select()
      .from(bookingHistory)
      .where(
        and(
          gte(bookingHistory.startTime, startDate),
          lte(bookingHistory.startTime, endDate)
        )
      );

    const customerVisits = new Map<string, { firstVisit: Date; visits: Array<{ date: Date; revenue: number }>; totalRevenue: number }>();
    
    allBookings.forEach(booking => {
      let customerId: string | null = null;
      
      if (booking.whatsappNumber && booking.whatsappNumber.trim()) {
        customerId = booking.whatsappNumber.trim();
      } else if (booking.customerName && booking.customerName.trim()) {
        customerId = `name:${booking.customerName.trim().toLowerCase()}`;
      }
      
      if (!customerId) {
        return;
      }
      const foodRevenue = booking.foodOrders && booking.foodOrders.length > 0
        ? booking.foodOrders.reduce((sum, order) => sum + parseFloat(order.price) * order.quantity, 0)
        : 0;
      const totalRevenue = parseFloat(booking.price) + foodRevenue;
      
      if (!customerVisits.has(customerId)) {
        customerVisits.set(customerId, {
          firstVisit: booking.startTime,
          visits: [],
          totalRevenue: 0
        });
      }
      
      const customer = customerVisits.get(customerId)!;
      customer.visits.push({ date: booking.startTime, revenue: totalRevenue });
      customer.totalRevenue += totalRevenue;
      
      if (booking.startTime < customer.firstVisit) {
        customer.firstVisit = booking.startTime;
      }
    });

    const periodBuckets = new Map<string, { newCustomers: Set<string>; returningCustomers: Set<string>; totalVisits: number; revenue: number }>();
    
    const getPeriodKey = (date: Date): string => {
      if (period === 'daily') {
        return date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const year = date.getFullYear();
        const week = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        return `${year}-W${week}`;
      } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    customerVisits.forEach((customerData, customerId) => {
      customerData.visits.forEach(visit => {
        const periodKey = getPeriodKey(visit.date);
        
        if (!periodBuckets.has(periodKey)) {
          periodBuckets.set(periodKey, {
            newCustomers: new Set(),
            returningCustomers: new Set(),
            totalVisits: 0,
            revenue: 0
          });
        }
        
        const bucket = periodBuckets.get(periodKey)!;
        bucket.totalVisits++;
        bucket.revenue += visit.revenue;
        
        const isFirstVisitInPeriod = getPeriodKey(customerData.firstVisit) === periodKey;
        if (isFirstVisitInPeriod) {
          bucket.newCustomers.add(customerId);
        } else {
          bucket.returningCustomers.add(customerId);
        }
      });
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeCustomers = Array.from(customerVisits.values()).filter(customer => {
      const lastVisit = customer.visits[customer.visits.length - 1].date;
      return lastVisit >= thirtyDaysAgo;
    });
    const churnedCustomers = customerVisits.size - activeCustomers.length;

    const series = Array.from(periodBuckets.entries())
      .map(([periodKey, data]) => ({
        period: periodKey,
        newCustomers: data.newCustomers.size,
        returningCustomers: data.returningCustomers.size,
        totalVisits: data.totalVisits,
        retentionRate: data.newCustomers.size + data.returningCustomers.size > 0 
          ? (data.returningCustomers.size / (data.newCustomers.size + data.returningCustomers.size)) * 100
          : 0,
        revenue: data.revenue
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const totalNewCustomers = customerVisits.size;
    const totalReturningCustomers = Array.from(customerVisits.values()).filter(c => c.visits.length > 1).length;
    const totalRevenue = Array.from(customerVisits.values()).reduce((sum, c) => sum + c.totalRevenue, 0);
    const totalVisits = allBookings.length;

    return {
      summary: {
        totalCustomers: customerVisits.size,
        newCustomers: totalNewCustomers,
        returningCustomers: totalReturningCustomers,
        retentionRate: totalNewCustomers > 0 ? (totalReturningCustomers / totalNewCustomers) * 100 : 0,
        churnRate: customerVisits.size > 0 ? (churnedCustomers / customerVisits.size) * 100 : 0,
        avgVisitFrequency: customerVisits.size > 0 ? totalVisits / customerVisits.size : 0,
        avgLifetimeValue: customerVisits.size > 0 ? totalRevenue / customerVisits.size : 0
      },
      series
    };
  }

  async getAllDeviceConfigs(): Promise<DeviceConfig[]> {
    return await db.select().from(deviceConfigs);
  }

  async getDeviceConfig(category: string): Promise<DeviceConfig | undefined> {
    const [config] = await db
      .select()
      .from(deviceConfigs)
      .where(eq(deviceConfigs.category, category));
    return config || undefined;
  }

  async upsertDeviceConfig(config: InsertDeviceConfig): Promise<DeviceConfig> {
    const existing = await this.getDeviceConfig(config.category);
    
    if (existing) {
      const [updated] = await db
        .update(deviceConfigs)
        .set(config)
        .where(eq(deviceConfigs.category, config.category))
        .returning();
      return updated;
    } else {
      const [newConfig] = await db.insert(deviceConfigs).values(config).returning();
      return newConfig;
    }
  }

  async deleteDeviceConfig(category: string): Promise<boolean> {
    const result = await db.delete(deviceConfigs).where(eq(deviceConfigs.category, category));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllPricingConfigs(): Promise<PricingConfig[]> {
    return await db.select().from(pricingConfigs);
  }

  async getPricingConfigsByCategory(category: string): Promise<PricingConfig[]> {
    return await db
      .select()
      .from(pricingConfigs)
      .where(eq(pricingConfigs.category, category));
  }

  async upsertPricingConfigs(category: string, configs: InsertPricingConfig[]): Promise<PricingConfig[]> {
    // Delete existing configs for this category
    await db.delete(pricingConfigs).where(eq(pricingConfigs.category, category));
    
    if (configs.length === 0) {
      return [];
    }
    
    // Insert new configs
    const result = await db.insert(pricingConfigs).values(configs).returning();
    return result;
  }

  async deletePricingConfig(category: string): Promise<boolean> {
    const result = await db.delete(pricingConfigs).where(eq(pricingConfigs.category, category));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllHappyHoursConfigs(): Promise<HappyHoursConfig[]> {
    return await db.select().from(happyHoursConfigs);
  }

  async getHappyHoursConfigsByCategory(category: string): Promise<HappyHoursConfig[]> {
    return await db.select().from(happyHoursConfigs).where(eq(happyHoursConfigs.category, category));
  }

  async upsertHappyHoursConfigs(category: string, configs: InsertHappyHoursConfig[]): Promise<HappyHoursConfig[]> {
    // Delete existing configs for this category
    await db.delete(happyHoursConfigs).where(eq(happyHoursConfigs.category, category));
    
    if (configs.length === 0) {
      return [];
    }
    
    // Insert new configs
    const result = await db.insert(happyHoursConfigs).values(configs).returning();
    return result;
  }

  async deleteHappyHoursConfig(category: string): Promise<boolean> {
    const result = await db.delete(happyHoursConfigs).where(eq(happyHoursConfigs.category, category));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async isHappyHoursActive(category: string): Promise<boolean> {
    const configs = await this.getHappyHoursConfigsByCategory(category);
    if (configs.length === 0) {
      return false;
    }

    // Filter only enabled configs
    const enabledConfigs = configs.filter(c => c.enabled === 1);
    if (enabledConfigs.length === 0) {
      return false;
    }

    // Get the configured timezone from gamingCenterInfo
    const centerInfo = await this.getGamingCenterInfo();
    const timezone = centerInfo?.timezone || 'Asia/Kolkata';

    // Convert current UTC time to the configured timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    const currentTime = `${hour}:${minute}`;
    
    for (const config of enabledConfigs) {
      // Handle time slots that cross midnight (e.g., 22:00 to 02:00)
      if (config.startTime <= config.endTime) {
        // Normal case: start < end (e.g., 10:00 to 18:00)
        if (currentTime >= config.startTime && currentTime < config.endTime) {
          return true;
        }
      } else {
        // Overnight case: start > end (e.g., 22:00 to 02:00)
        // Current time is either >= start (e.g., 23:00) OR < end (e.g., 01:00)
        if (currentTime >= config.startTime || currentTime < config.endTime) {
          return true;
        }
      }
    }
    
    return false;
  }

  async isHappyHoursActiveForTime(category: string, timeSlot: string): Promise<boolean> {
    const configs = await this.getHappyHoursConfigsByCategory(category);
    if (configs.length === 0) {
      return false;
    }

    // Filter only enabled configs
    const enabledConfigs = configs.filter(c => c.enabled === 1);
    if (enabledConfigs.length === 0) {
      return false;
    }

    // timeSlot is in format "HH:MM" (e.g., "14:30")
    const slotTime = timeSlot;
    
    for (const config of enabledConfigs) {
      // Handle time slots that cross midnight (e.g., 22:00 to 02:00)
      if (config.startTime <= config.endTime) {
        // Normal case: start < end (e.g., 10:00 to 18:00)
        if (slotTime >= config.startTime && slotTime < config.endTime) {
          return true;
        }
      } else {
        // Overnight case: start > end (e.g., 22:00 to 02:00)
        // Slot time is either >= start (e.g., 23:00) OR < end (e.g., 01:00)
        if (slotTime >= config.startTime || slotTime < config.endTime) {
          return true;
        }
      }
    }
    
    return false;
  }

  async getAllHappyHoursPricing(): Promise<HappyHoursPricing[]> {
    return await db.select().from(happyHoursPricing);
  }

  async getHappyHoursPricingByCategory(category: string): Promise<HappyHoursPricing[]> {
    return await db
      .select()
      .from(happyHoursPricing)
      .where(eq(happyHoursPricing.category, category));
  }

  async upsertHappyHoursPricing(category: string, configs: InsertHappyHoursPricing[]): Promise<HappyHoursPricing[]> {
    // Delete existing configs for this category
    await db.delete(happyHoursPricing).where(eq(happyHoursPricing.category, category));
    
    if (configs.length === 0) {
      return [];
    }
    
    // Insert new configs
    const result = await db.insert(happyHoursPricing).values(configs).returning();
    return result;
  }

  async deleteHappyHoursPricing(category: string): Promise<boolean> {
    const result = await db.delete(happyHoursPricing).where(eq(happyHoursPricing.category, category));
    return result.rowCount ? result.rowCount > 0 : false;
  }


  async getAllFoodItems(): Promise<FoodItem[]> {
    return await db.select().from(foodItems);
  }

  async getFoodItem(id: string): Promise<FoodItem | undefined> {
    const [item] = await db.select().from(foodItems).where(eq(foodItems.id, id));
    return item || undefined;
  }

  async createFoodItem(item: InsertFoodItem): Promise<FoodItem> {
    const [newItem] = await db.insert(foodItems).values(item).returning();
    return newItem;
  }

  async updateFoodItem(id: string, item: InsertFoodItem): Promise<FoodItem | undefined> {
    const [updated] = await db
      .update(foodItems)
      .set(item)
      .where(eq(foodItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFoodItem(id: string): Promise<boolean> {
    const result = await db.delete(foodItems).where(eq(foodItems.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async adjustStock(foodId: string, quantity: number, type: 'add' | 'remove', batchData?: Partial<InsertStockBatch>): Promise<FoodItem | undefined> {
    const item = await this.getFoodItem(foodId);
    if (!item) {
      return undefined;
    }

    const newStock = type === 'add' 
      ? item.currentStock + quantity 
      : Math.max(0, item.currentStock - quantity);

    const [updated] = await db
      .update(foodItems)
      .set({ currentStock: newStock })
      .where(eq(foodItems.id, foodId))
      .returning();
    
    if (updated && type === 'add' && batchData) {
      await this.createStockBatch({
        foodItemId: foodId,
        quantity,
        costPrice: batchData.costPrice || item.costPrice || '0',
        supplier: batchData.supplier || item.supplier,
        expiryDate: batchData.expiryDate,
        notes: batchData.notes,
      });
    }
    
    return updated || undefined;
  }

  async getLowStockItems(): Promise<FoodItem[]> {
    const items = await db
      .select()
      .from(foodItems)
      .where(lt(foodItems.currentStock, foodItems.minStockLevel));
    return items;
  }

  async getInventoryItems(): Promise<FoodItem[]> {
    return await db
      .select()
      .from(foodItems)
      .where(eq(foodItems.inInventory, 1));
  }

  async addToInventory(id: string): Promise<FoodItem | undefined> {
    const [updated] = await db
      .update(foodItems)
      .set({ inInventory: 1 })
      .where(eq(foodItems.id, id))
      .returning();
    return updated || undefined;
  }

  async removeFromInventory(id: string): Promise<FoodItem | undefined> {
    const [updated] = await db
      .update(foodItems)
      .set({ inInventory: 0 })
      .where(eq(foodItems.id, id))
      .returning();
    return updated || undefined;
  }

  async getExpiringItems(daysAhead: number): Promise<FoodItem[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    futureDate.setHours(23, 59, 59, 999);
    
    const items = await db
      .select()
      .from(foodItems)
      .where(
        and(
          eq(foodItems.inInventory, 1),
          isNotNull(foodItems.expiryDate),
          gte(foodItems.expiryDate, today),
          lte(foodItems.expiryDate, futureDate)
        )
      );
    return items;
  }

  async getReorderList(): Promise<FoodItem[]> {
    const items = await db
      .select()
      .from(foodItems)
      .where(
        and(
          eq(foodItems.inInventory, 1),
          eq(foodItems.category, 'trackable'),
          lt(foodItems.currentStock, foodItems.minStockLevel)
        )
      );
    return items;
  }

  async createStockBatch(batch: InsertStockBatch): Promise<StockBatch> {
    const [newBatch] = await db.insert(stockBatches).values(batch).returning();
    return newBatch;
  }

  async getStockBatchesByFoodItem(foodItemId: string): Promise<StockBatch[]> {
    return await db
      .select()
      .from(stockBatches)
      .where(eq(stockBatches.foodItemId, foodItemId))
      .orderBy(desc(stockBatches.purchaseDate));
  }

  async getAllStockBatches(): Promise<StockBatch[]> {
    return await db
      .select()
      .from(stockBatches)
      .orderBy(desc(stockBatches.purchaseDate));
  }

  async updatePaymentMethod(bookingIds: string[], paymentMethod: string): Promise<number> {
    const result = await db
      .update(bookings)
      .set({ paymentMethod })
      .where(inArray(bookings.id, bookingIds));
    
    return result.rowCount || 0;
  }

  async updatePaymentStatus(
    bookingIds: string[], 
    paymentStatus: string, 
    paymentMethod: string | null,
    userId: string
  ): Promise<{ bookings: any[], count: number }> {
    const existingBookings = await db
      .select()
      .from(bookings)
      .where(inArray(bookings.id, bookingIds));
    
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    const username = user.length > 0 ? (user[0].username || user[0].email || 'Unknown') : 'Unknown';
    
    const updatedBookings = [];
    for (const booking of existingBookings) {
      const lastPaymentAction = {
        previousStatus: booking.paymentStatus,
        previousMethod: booking.paymentMethod,
        timestamp: new Date().toISOString(),
        userId
      };

      const result = await db
        .update(bookings)
        .set({ 
          paymentStatus, 
          paymentMethod,
          lastPaymentAction
        })
        .where(eq(bookings.id, booking.id))
        .returning();
      
      if (result.length > 0) {
        updatedBookings.push(result[0]);
        
        const totalAmount = parseFloat(booking.price) + 
          (booking.foodOrders || []).reduce((sum: number, order: any) => 
            sum + (parseFloat(order.price) * order.quantity), 0);
        
        await this.createPaymentLog({
          bookingId: booking.id,
          seatName: booking.seatName,
          customerName: booking.customerName,
          amount: totalAmount.toFixed(2),
          paymentMethod: paymentMethod || 'unknown',
          paymentStatus,
          userId,
          username,
          previousStatus: booking.paymentStatus,
          previousMethod: booking.paymentMethod
        });
      }
    }
    
    return { bookings: updatedBookings, count: updatedBookings.length };
  }

  async createPaymentLog(log: InsertPaymentLog): Promise<PaymentLog> {
    const [newLog] = await db.insert(paymentLogs).values(log).returning();
    return newLog;
  }

  async getPaymentLogs(date?: string): Promise<PaymentLog[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return await db
        .select()
        .from(paymentLogs)
        .where(
          and(
            gte(paymentLogs.createdAt, startOfDay),
            lte(paymentLogs.createdAt, endOfDay)
          )
        )
        .orderBy(desc(paymentLogs.createdAt));
    }
    
    return await db
      .select()
      .from(paymentLogs)
      .orderBy(desc(paymentLogs.createdAt))
      .limit(100);
  }

  async moveBookingsToHistory(): Promise<number> {
    const expiredBookings = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.status, "expired"),
        eq(bookings.paymentStatus, "paid")
      ));

    const completedBookings = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.status, "completed"),
        eq(bookings.paymentStatus, "paid")
      ));

    const bookingsToArchive = [...expiredBookings, ...completedBookings];

    if (bookingsToArchive.length === 0) {
      return 0;
    }

    const historyRecords = bookingsToArchive.map(booking => ({
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      groupId: booking.groupId,
      groupCode: booking.groupCode,
      category: booking.category,
      seatNumber: booking.seatNumber,
      seatName: booking.seatName,
      customerName: booking.customerName,
      whatsappNumber: booking.whatsappNumber,
      startTime: booking.startTime,
      endTime: booking.endTime,
      price: booking.price,
      status: booking.status,
      bookingType: booking.bookingType,
      pausedRemainingTime: booking.pausedRemainingTime,
      personCount: booking.personCount,
      paymentMethod: booking.paymentMethod,
      cashAmount: booking.cashAmount,
      upiAmount: booking.upiAmount,
      paymentStatus: booking.paymentStatus,
      lastPaymentAction: booking.lastPaymentAction,
      foodOrders: booking.foodOrders,
      originalPrice: booking.originalPrice,
      discountApplied: booking.discountApplied,
      bonusHoursApplied: booking.bonusHoursApplied,
      promotionDetails: booking.promotionDetails,
      isPromotionalDiscount: booking.isPromotionalDiscount,
      isPromotionalBonus: booking.isPromotionalBonus,
      manualDiscountPercentage: booking.manualDiscountPercentage,
      manualFreeHours: booking.manualFreeHours,
      createdAt: booking.createdAt,
    }));

    await db.insert(bookingHistory).values(historyRecords as any);

    const bookingIds = bookingsToArchive.map(b => b.id);
    if (bookingIds.length > 0) {
      await db.delete(bookings).where(inArray(bookings.id, bookingIds));
    }

    return bookingsToArchive.length;
  }

  async getAllBookingHistory(): Promise<BookingHistory[]> {
    return await db.select().from(bookingHistory);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async updateUserOnboarding(userId: string, completed: boolean): Promise<boolean> {
    const result = await db.update(users)
      .set({ onboardingCompleted: completed ? 1 : 0 })
      .where(eq(users.id, userId));
    return true;
  }

  async createUser(user: InsertUser, skipValidation: boolean = false): Promise<User> {
    // Validate password strength (unless skipValidation is true for system initialization)
    if (!skipValidation) {
      const passwordValidation = validatePasswordStrength(user.password);
      if (!passwordValidation.valid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }
    }
    
    const saltRounds = SecurityConfig.password.saltRounds;
    const passwordHash = await bcrypt.hash(user.password, saltRounds);
    
    const [newUser] = await db.insert(users).values({
      username: user.username,
      passwordHash,
      email: user.email,
      role: user.role || "admin",
    }).returning();
    
    return newUser;
  }

  async validatePassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    
    if (!user || !user.passwordHash) {
      // Use constant-time comparison to prevent timing attacks
      // Even if user doesn't exist, still perform a hash comparison
      await bcrypt.compare(password, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRu3WjJhvCu');
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      return null;
    }
    
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense as any).returning();
    return newExpense;
  }

  async updateExpense(id: string, expense: InsertExpense): Promise<Expense | undefined> {
    const updateData: any = { ...expense };
    if (expense.date && typeof expense.date === 'string') {
      updateData.date = new Date(expense.date);
    }
    const [updated] = await db
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(
        and(
          gte(expenses.date, startDate),
          lte(expenses.date, endDate)
        )
      );
  }

  async getAllActivityLogs(): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs).orderBy(activityLogs.createdAt);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getActivityLogsByDateRange(startDate: Date, endDate: Date): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(
        and(
          gte(activityLogs.createdAt, startDate),
          lte(activityLogs.createdAt, endDate)
        )
      )
      .orderBy(activityLogs.createdAt);
  }

  async getGamingCenterInfo(): Promise<GamingCenterInfo | undefined> {
    const [info] = await db.select().from(gamingCenterInfo).limit(1);
    return info || undefined;
  }

  async upsertGamingCenterInfo(info: InsertGamingCenterInfo): Promise<GamingCenterInfo> {
    const existing = await this.getGamingCenterInfo();
    
    if (existing) {
      const [updated] = await db
        .update(gamingCenterInfo)
        .set({ ...info, updatedAt: new Date() })
        .where(eq(gamingCenterInfo.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newInfo] = await db.insert(gamingCenterInfo).values(info).returning();
      return newInfo;
    }
  }

  async getAllGalleryImages(): Promise<GalleryImage[]> {
    return await db.select().from(galleryImages);
  }

  async getGalleryImage(id: string): Promise<GalleryImage | undefined> {
    const [image] = await db.select().from(galleryImages).where(eq(galleryImages.id, id));
    return image || undefined;
  }

  async createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage> {
    const [newImage] = await db.insert(galleryImages).values(image).returning();
    return newImage;
  }

  async updateGalleryImage(id: string, image: InsertGalleryImage): Promise<GalleryImage | undefined> {
    const [updated] = await db
      .update(galleryImages)
      .set(image)
      .where(eq(galleryImages.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteGalleryImage(id: string): Promise<boolean> {
    const result = await db.delete(galleryImages).where(eq(galleryImages.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllFacilities(): Promise<Facility[]> {
    return await db.select().from(facilities);
  }

  async getFacility(id: string): Promise<Facility | undefined> {
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, id));
    return facility || undefined;
  }

  async createFacility(facility: InsertFacility): Promise<Facility> {
    const [newFacility] = await db.insert(facilities).values(facility).returning();
    return newFacility;
  }

  async updateFacility(id: string, facility: InsertFacility): Promise<Facility | undefined> {
    const [updated] = await db
      .update(facilities)
      .set(facility)
      .where(eq(facilities.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFacility(id: string): Promise<boolean> {
    const result = await db.delete(facilities).where(eq(facilities.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllGames(): Promise<Game[]> {
    return await db.select().from(games);
  }

  async getGamesByCategory(category: string): Promise<Game[]> {
    return await db.select().from(games).where(eq(games.category, category));
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  async updateGame(id: string, game: InsertGame): Promise<Game | undefined> {
    const [updated] = await db
      .update(games)
      .set(game)
      .where(eq(games.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteGame(id: string): Promise<boolean> {
    const result = await db.delete(games).where(eq(games.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllLoadMetrics(): Promise<LoadMetric[]> {
    return await db.select().from(loadMetrics);
  }

  async getRecentLoadMetrics(limit: number): Promise<LoadMetric[]> {
    return await db.select()
      .from(loadMetrics)
      .orderBy(desc(loadMetrics.timestamp))
      .limit(limit);
  }

  async createLoadMetric(metric: InsertLoadMetric): Promise<LoadMetric> {
    const [created] = await db.insert(loadMetrics).values(metric).returning();
    return created;
  }

  async getCurrentLoad(): Promise<LoadMetric | undefined> {
    const [metric] = await db.select()
      .from(loadMetrics)
      .orderBy(desc(loadMetrics.timestamp))
      .limit(1);
    return metric;
  }

  async getAllLoadPredictions(): Promise<LoadPrediction[]> {
    return await db.select().from(loadPredictions);
  }

  async getRecentLoadPredictions(limit: number): Promise<LoadPrediction[]> {
    return await db.select()
      .from(loadPredictions)
      .orderBy(desc(loadPredictions.timestamp))
      .limit(limit);
  }

  async createLoadPrediction(prediction: InsertLoadPrediction): Promise<LoadPrediction> {
    const [created] = await db.insert(loadPredictions).values(prediction).returning();
    return created;
  }

  async deleteOldBookingHistory(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await db
      .delete(bookingHistory)
      .where(lt(bookingHistory.archivedAt, cutoffDate));
    
    return result.rowCount || 0;
  }

  async deleteOldActivityLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await db
      .delete(activityLogs)
      .where(lt(activityLogs.createdAt, cutoffDate));
    
    return result.rowCount || 0;
  }

  async deleteOldLoadMetrics(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await db
      .delete(loadMetrics)
      .where(lt(loadMetrics.timestamp, cutoffDate));
    
    return result.rowCount || 0;
  }

  async deleteOldLoadPredictions(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await db
      .delete(loadPredictions)
      .where(lt(loadPredictions.timestamp, cutoffDate));
    
    return result.rowCount || 0;
  }

  async deleteOldExpenses(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await db
      .delete(expenses)
      .where(lt(expenses.date, cutoffDate));
    
    return result.rowCount || 0;
  }

  async getRetentionConfig(): Promise<RetentionConfig> {
    const configs = await db.select().from(retentionConfig).limit(1);
    
    if (configs.length === 0) {
      const [newConfig] = await db.insert(retentionConfig).values({
        bookingHistoryDays: 730,
        activityLogsDays: 180,
        loadMetricsDays: 90,
        loadPredictionsDays: 90,
        expensesDays: 2555,
      }).returning();
      return newConfig;
    }
    
    return configs[0];
  }

  async updateRetentionConfig(config: Partial<InsertRetentionConfig>): Promise<RetentionConfig> {
    const current = await this.getRetentionConfig();
    
    const [updated] = await db
      .update(retentionConfig)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(retentionConfig.id, current.id))
      .returning();
    
    return updated;
  }

  async getAllDeviceMaintenance(): Promise<DeviceMaintenance[]> {
    return await db.select().from(deviceMaintenance);
  }

  async getDeviceMaintenance(category: string, seatName: string): Promise<DeviceMaintenance | undefined> {
    const records = await db
      .select()
      .from(deviceMaintenance)
      .where(and(
        eq(deviceMaintenance.category, category),
        eq(deviceMaintenance.seatName, seatName)
      ))
      .limit(1);
    
    return records[0];
  }

  async upsertDeviceMaintenance(data: InsertDeviceMaintenance): Promise<DeviceMaintenance> {
    const existing = await this.getDeviceMaintenance(data.category, data.seatName);
    
    if (existing) {
      const [updated] = await db
        .update(deviceMaintenance)
        .set({ ...data, updatedAt: new Date() })
        .where(and(
          eq(deviceMaintenance.category, data.category),
          eq(deviceMaintenance.seatName, data.seatName)
        ))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(deviceMaintenance).values(data).returning();
    return created;
  }

  async updateDeviceMaintenanceStatus(category: string, seatName: string, status: string, notes?: string): Promise<DeviceMaintenance | undefined> {
    const existing = await this.getDeviceMaintenance(category, seatName);
    
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (notes !== undefined) {
      updateData.maintenanceNotes = notes;
    }
    
    if (status === "healthy") {
      updateData.lastMaintenanceDate = new Date();
    }
    
    if (existing) {
      const [updated] = await db
        .update(deviceMaintenance)
        .set(updateData)
        .where(and(
          eq(deviceMaintenance.category, category),
          eq(deviceMaintenance.seatName, seatName)
        ))
        .returning();
      
      return updated;
    } else {
      const newRecord = {
        category,
        seatName,
        status,
        maintenanceNotes: notes,
        totalUsageHours: 0,
        totalSessions: 0,
        issuesReported: 0,
        lastMaintenanceDate: status === "healthy" ? new Date() : null,
      };
      
      const [created] = await db.insert(deviceMaintenance).values(newRecord).returning();
      return created;
    }
  }

  async getAllNotifications(): Promise<Notification[]> {
    const result = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    return result.filter(n => n.type !== "booking" && n.type !== "payment");
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.isRead, 0))
      .orderBy(desc(notifications.createdAt));
    return result.filter(n => n.type !== "booking" && n.type !== "payment");
  }

  async getNotificationById(id: string): Promise<Notification | undefined> {
    const result = await db.select().from(notifications).where(eq(notifications.id, id));
    return result[0];
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const result = await db
      .update(notifications)
      .set({ isRead: 1 })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await db.update(notifications).set({ isRead: 1 });
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }

  async getUnreadCount(): Promise<number> {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.isRead, 0));
    return result.filter(n => n.type !== "booking" && n.type !== "payment").length;
  }

  async getCustomerPromotionSummary(whatsappNumber: string): Promise<CustomerPromotionSummary> {
    const activeBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.whatsappNumber, whatsappNumber));
    
    const historyBookings = await db
      .select()
      .from(bookingHistory)
      .where(eq(bookingHistory.whatsappNumber, whatsappNumber));
    
    const allBookings = [...activeBookings, ...historyBookings];
    
    let discountCount = 0;
    let bonusCount = 0;
    let totalSavings = 0;
    let totalBonusHours = 0;
    
    allBookings.forEach(booking => {
      if (booking.discountApplied && booking.promotionDetails?.discountAmount) {
        discountCount++;
        totalSavings += parseFloat(booking.promotionDetails.discountAmount);
      }
      if (booking.bonusHoursApplied && booking.promotionDetails?.bonusHours) {
        bonusCount++;
        totalBonusHours += parseFloat(booking.promotionDetails.bonusHours);
      }
    });
    
    return {
      discountCount,
      bonusCount,
      totalSavings,
      totalBonusHours
    };
  }

  async getPromotionHistoryByCustomer(whatsappNumber: string): Promise<PromotionHistoryItem[]> {
    const activeBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.whatsappNumber, whatsappNumber));
    
    const historyBookings = await db
      .select()
      .from(bookingHistory)
      .where(eq(bookingHistory.whatsappNumber, whatsappNumber));
    
    const allBookings = [...activeBookings, ...historyBookings];
    
    const promotionHistory: PromotionHistoryItem[] = [];
    
    allBookings.forEach(booking => {
      if (booking.discountApplied && booking.promotionDetails?.discountAmount) {
        promotionHistory.push({
          bookingId: booking.id,
          seatName: booking.seatName,
          date: new Date(booking.startTime).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          promotionType: 'discount',
          discountPercentage: booking.promotionDetails.discountPercentage,
          discountAmount: booking.promotionDetails.discountAmount,
          originalPrice: booking.originalPrice || booking.price,
          finalPrice: booking.price
        });
      }
      
      if (booking.bonusHoursApplied && booking.promotionDetails?.bonusHours) {
        promotionHistory.push({
          bookingId: booking.id,
          seatName: booking.seatName,
          date: new Date(booking.startTime).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          promotionType: 'bonus',
          bonusHours: booking.promotionDetails.bonusHours,
          finalPrice: booking.price
        });
      }
    });
    
    return promotionHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

}

export const storage = new DatabaseStorage();
