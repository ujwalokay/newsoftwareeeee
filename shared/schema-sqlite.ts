import { z } from "zod";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";

export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: integer("expire", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const sessionGroups = sqliteTable("session_groups", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupCode: text("group_code").unique(),
  groupName: text("group_name").notNull(),
  category: text("category").notNull(),
  bookingType: text("booking_type", { mode: "json" }).$type<string[]>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertSessionGroupSchema = createInsertSchema(sessionGroups).omit({ id: true, createdAt: true });
export type InsertSessionGroup = z.infer<typeof insertSessionGroupSchema>;
export type SessionGroup = typeof sessionGroups.$inferSelect;

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookingCode: text("booking_code").unique(),
  groupId: text("group_id"),
  groupCode: text("group_code"),
  category: text("category").notNull(),
  seatNumber: integer("seat_number").notNull(),
  seatName: text("seat_name").notNull(),
  customerName: text("customer_name").notNull(),
  whatsappNumber: text("whatsapp_number"),
  startTime: integer("start_time", { mode: "timestamp" }).notNull(),
  endTime: integer("end_time", { mode: "timestamp" }).notNull(),
  price: text("price").notNull(),
  status: text("status").notNull(),
  bookingType: text("booking_type", { mode: "json" }).$type<string[]>().notNull(),
  pausedRemainingTime: integer("paused_remaining_time"),
  personCount: integer("person_count").notNull().default(1),
  paymentMethod: text("payment_method"),
  cashAmount: text("cash_amount"),
  upiAmount: text("upi_amount"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  lastPaymentAction: text("last_payment_action", { mode: "json" }).$type<{
    previousStatus?: string;
    previousMethod?: string | null;
    timestamp?: string;
    userId?: string;
  } | null>(),
  foodOrders: text("food_orders", { mode: "json" }).$type<Array<{
    foodId: string;
    foodName: string;
    price: string;
    quantity: number;
  }>>().default([]),
  originalPrice: text("original_price"),
  discountApplied: text("discount_applied"),
  bonusHoursApplied: text("bonus_hours_applied"),
  promotionDetails: text("promotion_details", { mode: "json" }).$type<{
    discountPercentage?: number;
    discountAmount?: string;
    bonusHours?: string;
  }>(),
  isPromotionalDiscount: integer("is_promotional_discount").default(0),
  isPromotionalBonus: integer("is_promotional_bonus").default(0),
  manualDiscountPercentage: integer("manual_discount_percentage"),
  manualFreeHours: text("manual_free_hours"),
  discount: text("discount"),
  bonus: text("bonus"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true }).extend({
  bookingCode: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  groupCode: z.string().optional().nullable(),
  startTime: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  endTime: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  pausedRemainingTime: z.number().nullable().optional(),
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export const foodItems = sqliteTable("food_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  price: text("price").notNull(),
  costPrice: text("cost_price"),
  currentStock: integer("current_stock").notNull().default(0),
  minStockLevel: integer("min_stock_level").notNull().default(10),
  inInventory: integer("in_inventory").notNull().default(0),
  category: text("category").notNull().default("trackable"),
  supplier: text("supplier"),
  expiryDate: integer("expiry_date", { mode: "timestamp" }),
});

export const insertFoodItemSchema = createInsertSchema(foodItems).omit({ id: true }).extend({
  expiryDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => {
    if (!val) return undefined;
    return typeof val === 'string' ? new Date(val) : val;
  }).optional(),
});
export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;
export type FoodItem = typeof foodItems.$inferSelect;

export const stockBatches = sqliteTable("stock_batches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  foodItemId: text("food_item_id").notNull(),
  quantity: integer("quantity").notNull(),
  costPrice: text("cost_price").notNull(),
  supplier: text("supplier"),
  purchaseDate: integer("purchase_date", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  expiryDate: integer("expiry_date", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertStockBatchSchema = createInsertSchema(stockBatches).omit({ id: true, createdAt: true }).extend({
  purchaseDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val).optional(),
  expiryDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => {
    if (!val) return undefined;
    return typeof val === 'string' ? new Date(val) : val;
  }).optional(),
});
export type InsertStockBatch = z.infer<typeof insertStockBatchSchema>;
export type StockBatch = typeof stockBatches.$inferSelect;

export const stockAdjustmentSchema = z.object({
  foodId: z.string(),
  quantity: z.number().int(),
  type: z.enum(["add", "remove"]),
  costPrice: z.string().optional(),
  supplier: z.string().optional(),
  expiryDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => {
    if (!val) return undefined;
    return typeof val === 'string' ? new Date(val) : val;
  }).optional(),
  notes: z.string().optional(),
});

export const deviceConfigs = sqliteTable("device_configs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull().unique(),
  count: integer("count").notNull().default(0),
  seats: text("seats", { mode: "json" }).$type<string[]>().notNull().default([]),
});

export const insertDeviceConfigSchema = createInsertSchema(deviceConfigs).omit({ id: true });
export type InsertDeviceConfig = z.infer<typeof insertDeviceConfigSchema>;
export type DeviceConfig = typeof deviceConfigs.$inferSelect;

export const pricingConfigs = sqliteTable("pricing_configs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull(),
  duration: text("duration").notNull(),
  price: text("price").notNull(),
  personCount: integer("person_count").notNull().default(1),
});

export const insertPricingConfigSchema = createInsertSchema(pricingConfigs).omit({ id: true }).refine(
  (data) => {
    if (data.category !== "PS5" && data.personCount && data.personCount > 1) {
      return false;
    }
    return true;
  },
  {
    message: "Only PS5 category can have person count greater than 1",
    path: ["personCount"],
  }
);
export type InsertPricingConfig = z.infer<typeof insertPricingConfigSchema>;
export type PricingConfig = typeof pricingConfigs.$inferSelect;

export const happyHoursConfigs = sqliteTable("happy_hours_configs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  enabled: integer("enabled").notNull().default(1),
});

export const insertHappyHoursConfigSchema = createInsertSchema(happyHoursConfigs).omit({ id: true });
export type InsertHappyHoursConfig = z.infer<typeof insertHappyHoursConfigSchema>;
export type HappyHoursConfig = typeof happyHoursConfigs.$inferSelect;

export const happyHoursPricing = sqliteTable("happy_hours_pricing", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull(),
  duration: text("duration").notNull(),
  price: text("price").notNull(),
  personCount: integer("person_count").notNull().default(1),
});

export const insertHappyHoursPricingSchema = createInsertSchema(happyHoursPricing).omit({ id: true }).refine(
  (data) => {
    if (data.category !== "PS5" && data.personCount && data.personCount > 1) {
      return false;
    }
    return true;
  },
  {
    message: "Only PS5 category can have person count greater than 1",
    path: ["personCount"],
  }
);
export type InsertHappyHoursPricing = z.infer<typeof insertHappyHoursPricingSchema>;
export type HappyHoursPricing = typeof happyHoursPricing.$inferSelect;

export const bookingHistory = sqliteTable("booking_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookingId: text("booking_id").notNull(),
  bookingCode: text("booking_code"),
  groupId: text("group_id"),
  groupCode: text("group_code"),
  category: text("category").notNull(),
  seatNumber: integer("seat_number").notNull(),
  seatName: text("seat_name").notNull(),
  customerName: text("customer_name").notNull(),
  whatsappNumber: text("whatsapp_number"),
  startTime: integer("start_time", { mode: "timestamp" }).notNull(),
  endTime: integer("end_time", { mode: "timestamp" }).notNull(),
  price: text("price").notNull(),
  status: text("status").notNull(),
  bookingType: text("booking_type", { mode: "json" }).$type<string[]>().notNull(),
  pausedRemainingTime: integer("paused_remaining_time"),
  personCount: integer("person_count").notNull().default(1),
  paymentMethod: text("payment_method"),
  cashAmount: text("cash_amount"),
  upiAmount: text("upi_amount"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  lastPaymentAction: text("last_payment_action", { mode: "json" }).$type<{
    previousStatus?: string;
    previousMethod?: string | null;
    timestamp?: string;
    userId?: string;
  } | null>(),
  foodOrders: text("food_orders", { mode: "json" }).$type<Array<{
    foodId: string;
    foodName: string;
    price: string;
    quantity: number;
  }>>().default([]),
  originalPrice: text("original_price"),
  discountApplied: text("discount_applied"),
  bonusHoursApplied: text("bonus_hours_applied"),
  promotionDetails: text("promotion_details", { mode: "json" }).$type<{
    discountPercentage?: number;
    discountAmount?: string;
    bonusHours?: string;
  }>(),
  isPromotionalDiscount: integer("is_promotional_discount").default(0),
  isPromotionalBonus: integer("is_promotional_bonus").default(0),
  manualDiscountPercentage: integer("manual_discount_percentage"),
  manualFreeHours: text("manual_free_hours"),
  discount: text("discount"),
  bonus: text("bonus"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  archivedAt: integer("archived_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertBookingHistorySchema = createInsertSchema(bookingHistory).omit({ id: true, archivedAt: true });
export type InsertBookingHistory = z.infer<typeof insertBookingHistorySchema>;
export type BookingHistory = typeof bookingHistory.$inferSelect;

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  role: text("role"),
  onboardingCompleted: integer("onboarding_completed").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, passwordHash: true }).extend({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  email: z.string().email("Invalid email address").optional(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type UpsertUser = typeof users.$inferInsert;

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true }).extend({
  date: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a valid positive number"
  }),
});
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  activityLogId: text("activity_log_id"),
  isRead: integer("is_read").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const gamingCenterInfo = sqliteTable("gaming_center_info", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  hours: text("hours").notNull(),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertGamingCenterInfoSchema = createInsertSchema(gamingCenterInfo).omit({ id: true, updatedAt: true });
export type InsertGamingCenterInfo = z.infer<typeof insertGamingCenterInfoSchema>;
export type GamingCenterInfo = typeof gamingCenterInfo.$inferSelect;

export const galleryImages = sqliteTable("gallery_images", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertGalleryImageSchema = createInsertSchema(galleryImages).omit({ id: true, createdAt: true });
export type InsertGalleryImage = z.infer<typeof insertGalleryImageSchema>;
export type GalleryImage = typeof galleryImages.$inferSelect;

export const facilities = sqliteTable("facilities", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
});

export const insertFacilitySchema = createInsertSchema(facilities).omit({ id: true });
export type InsertFacility = z.infer<typeof insertFacilitySchema>;
export type Facility = typeof facilities.$inferSelect;

export const games = sqliteTable("games", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
});

export const insertGameSchema = createInsertSchema(games).omit({ id: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export const loadMetrics = sqliteTable("load_metrics", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  activeSessions: integer("active_sessions").notNull().default(0),
  avgSessionLength: integer("avg_session_length").notNull().default(0),
  foodOrders: integer("food_orders").notNull().default(0),
  capacityUtilization: integer("capacity_utilization").notNull().default(0),
});

export const insertLoadMetricSchema = createInsertSchema(loadMetrics).omit({ id: true, timestamp: true });
export type InsertLoadMetric = z.infer<typeof insertLoadMetricSchema>;
export type LoadMetric = typeof loadMetrics.$inferSelect;

export const loadPredictions = sqliteTable("load_predictions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  horizon: text("horizon").notNull(),
  predictedLoad: integer("predicted_load").notNull(),
  modelVersion: text("model_version").notNull(),
  features: text("features", { mode: "json" }).$type<Record<string, any>>().default({}),
});

export const insertLoadPredictionSchema = createInsertSchema(loadPredictions).omit({ id: true, timestamp: true });
export type InsertLoadPrediction = z.infer<typeof insertLoadPredictionSchema>;
export type LoadPrediction = typeof loadPredictions.$inferSelect;

export const retentionConfig = sqliteTable("retention_config", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookingHistoryDays: integer("booking_history_days").notNull().default(36500),
  activityLogsDays: integer("activity_logs_days").notNull().default(36500),
  loadMetricsDays: integer("load_metrics_days").notNull().default(36500),
  loadPredictionsDays: integer("load_predictions_days").notNull().default(36500),
  expensesDays: integer("expenses_days").notNull().default(36500),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertRetentionConfigSchema = createInsertSchema(retentionConfig).omit({ id: true, updatedAt: true });
export type InsertRetentionConfig = z.infer<typeof insertRetentionConfigSchema>;
export type RetentionConfig = typeof retentionConfig.$inferSelect;

export const deviceMaintenance = sqliteTable("device_maintenance", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull(),
  seatName: text("seat_name").notNull(),
  lastMaintenanceDate: integer("last_maintenance_date", { mode: "timestamp" }),
  totalUsageHours: real("total_usage_hours").notNull().default(0),
  totalSessions: integer("total_sessions").notNull().default(0),
  issuesReported: integer("issues_reported").notNull().default(0),
  maintenanceNotes: text("maintenance_notes"),
  status: text("status").notNull().default("healthy"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertDeviceMaintenanceSchema = createInsertSchema(deviceMaintenance).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeviceMaintenance = z.infer<typeof insertDeviceMaintenanceSchema>;
export type DeviceMaintenance = typeof deviceMaintenance.$inferSelect;

export const paymentLogs = sqliteTable("payment_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookingId: text("booking_id").notNull(),
  seatName: text("seat_name").notNull(),
  customerName: text("customer_name").notNull(),
  amount: text("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  previousStatus: text("previous_status"),
  previousMethod: text("previous_method"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertPaymentLogSchema = createInsertSchema(paymentLogs).omit({ id: true, createdAt: true });
export type InsertPaymentLog = z.infer<typeof insertPaymentLogSchema>;
export type PaymentLog = typeof paymentLogs.$inferSelect;
