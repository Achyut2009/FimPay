import { pgTable, text, integer, decimal, timestamp, boolean, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const transactionTypeEnum = pgEnum('transaction_type', ['deposit', 'withdrawal', 'transfer']);
export const accountTypeEnum = pgEnum('account_type', ['personal', 'joint_family']);
export const userRoleEnum = pgEnum('user_role', ['parent', 'child']);

// Users table (linked with Clerk)
export const users: any = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phoneNumber: text('phone_number'),
  profileImageUrl: text('profile_image_url'),
  role: userRoleEnum('role').default('child'),
  parentId: uuid('parent_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Accounts table
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  accountType: accountTypeEnum('account_type').default('personal').notNull(),
  accountName: text('account_name').notNull(),
  balance: decimal('balance', { precision: 10, scale: 2 }).default('0.00').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Payment methods table
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'card', 'bank_account', 'upi', etc.
  provider: text('provider'), // 'visa', 'mastercard', 'sbi', etc.
  lastFour: text('last_four'), // Last 4 digits for cards
  accountNumber: text('account_number'), // For bank accounts
  isDefault: boolean('is_default').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Transactions table
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  accountId: uuid('account_id').references(() => accounts.id).notNull(),
  paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id),
  type: transactionTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  category: text('category'), // 'food', 'transport', 'entertainment', etc.
  recipient: text('recipient'), // For transfers
  status: text('status').default('completed').notNull(), // 'pending', 'completed', 'failed'
  requiresApproval: boolean('requires_approval').default(false).notNull(),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Joint Family Account requests
export const familyRequests = pgTable('family_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  childId: uuid('child_id').references(() => users.id).notNull(),
  parentId: uuid('parent_id').references(() => users.id).notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'approved', 'rejected'
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Budget planning table
export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  category: text('category').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  spent: decimal('spent', { precision: 10, scale: 2 }).default('0.00').notNull(),
  period: text('period').default('monthly').notNull(), // 'weekly', 'monthly', 'yearly'
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// AI Chat history
export const aiChats = pgTable('ai_chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  response: text('response').notNull(),
  messageType: text('message_type').default('user').notNull(), // 'user', 'ai'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  paymentMethods: many(paymentMethods),
  transactions: many(transactions),
  budgets: many(budgets),
  aiChats: many(aiChats),
  parent: one(users, {
    fields: [users.parentId],
    references: [users.id],
  }),
  children: many(users),
  sentRequests: many(familyRequests, { relationName: 'childRequests' }),
  receivedRequests: many(familyRequests, { relationName: 'parentRequests' }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one, many }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [transactions.paymentMethodId],
    references: [paymentMethods.id],
  }),
  approver: one(users, {
    fields: [transactions.approvedBy],
    references: [users.id],
  }),
}));

export const familyRequestsRelations = relations(familyRequests, ({ one }) => ({
  child: one(users, {
    fields: [familyRequests.childId],
    references: [users.id],
    relationName: 'childRequests',
  }),
  parent: one(users, {
    fields: [familyRequests.parentId],
    references: [users.id],
    relationName: 'parentRequests',
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
}));

export const aiChatsRelations = relations(aiChats, ({ one }) => ({
  user: one(users, {
    fields: [aiChats.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type FamilyRequest = typeof familyRequests.$inferSelect;
export type NewFamilyRequest = typeof familyRequests.$inferInsert;

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

export type AIChat = typeof aiChats.$inferSelect;
export type NewAIChat = typeof aiChats.$inferInsert;