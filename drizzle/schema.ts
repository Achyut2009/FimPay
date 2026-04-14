import { pgTable, integer, varchar, text, boolean, timestamp, numeric, uuid, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const accountType = pgEnum("account_type", ['personal', 'joint_family'])
export const transactionType = pgEnum("transaction_type", ['deposit', 'withdrawal', 'transfer'])
export const userRole = pgEnum("user_role", ['parent', 'child'])


export const users = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: varchar({ length: 255 }).notNull(),
	age: integer().notNull(),
	email: varchar({ length: 255 }).notNull(),
	firstName: varchar("first_name", { length: 225 }),
	lastName: varchar("last_name", { length: 225 }),
});

export const paymentMethods = pgTable("payment_methods", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	type: text().notNull(),
	last4: text(),
	brand: text(),
	expiryMonth: integer("expiry_month"),
	expiryYear: integer("expiry_year"),
	isDefault: boolean("is_default").default(false),
	stripePaymentMethodId: text("stripe_payment_method_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	familyAccountId: text("family_account_id"),
	type: text().notNull(),
	amount: numeric({ precision: 19, scale:  2 }).notNull(),
	balanceAfter: numeric("balance_after", { precision: 19, scale:  2 }).notNull(),
	description: text(),
	paymentMethodId: text("payment_method_id"),
	stripeTransactionId: text("stripe_transaction_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const aiChats = pgTable("ai_chats", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	message: text().notNull(),
	response: text().notNull(),
	messageType: text("message_type").default('user').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	accountType: accountType("account_type").default('personal').notNull(),
	accountName: text("account_name").notNull(),
	balance: numeric({ precision: 10, scale:  2 }).default('0.00').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	category: text().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	spent: numeric({ precision: 10, scale:  2 }).default('0.00').notNull(),
	period: text().default('monthly').notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const familyRequests = pgTable("family_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	childId: uuid("child_id").notNull(),
	parentId: uuid("parent_id").notNull(),
	status: text().default('pending').notNull(),
	message: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});
