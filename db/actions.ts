import { db } from './index';
import { users, accounts, paymentMethods, transactions, familyRequests, budgets, aiChats } from './schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// User actions
export const createUser = async (userData: {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
}) => {
  const result = await db.insert(users).values(userData).returning();
  const user = Array.isArray(result) ? result[0] : result;

  // Create a default personal account for the user
  if (user) {
    await createAccount({
      userId: user.id,
      accountName: 'Main Account',
    });
  }

  return user;
};

export const getUserByClerkId = async (clerkId: string) => {
  let [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));

  // If user doesn't exist, we can't create them here because we don't have their data
  // The user should be created when they sign up or when we have their Clerk data

  return user;
};

export const getUserByEmail = async (email: string) => {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
};

export const updateUser = async (userId: string, updates: Partial<typeof users.$inferInsert>) => {
  const [user] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
  return user;
};

// Account actions
export const createAccount = async (accountData: {
  userId: string;
  accountType?: 'personal' | 'joint_family';
  accountName: string;
  balance?: string;
}) => {
  const [account] = await db.insert(accounts).values(accountData).returning();
  return account;
};

export const getUserAccounts = async (userId: string) => {
  return await db.select().from(accounts).where(eq(accounts.userId, userId));
};

export const getAccountBalance = async (accountId: string) => {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  return account?.balance || '0.00';
};

export const updateAccountBalance = async (accountId: string, newBalance: string) => {
  const [account] = await db.update(accounts)
    .set({ balance: newBalance, updatedAt: new Date() })
    .where(eq(accounts.id, accountId))
    .returning();
  return account;
};

// Payment method actions
export const createPaymentMethod = async (paymentData: {
  userId: string;
  type: string;
  provider?: string;
  lastFour?: string;
  accountNumber?: string;
  isDefault?: boolean;
}) => {
  // If this is set as default, unset other defaults
  if (paymentData.isDefault) {
    await db.update(paymentMethods)
      .set({ isDefault: false })
      .where(eq(paymentMethods.userId, paymentData.userId));
  }

  const [paymentMethod] = await db.insert(paymentMethods).values(paymentData).returning();
  return paymentMethod;
};

export const getUserPaymentMethods = async (userId: string) => {
  return await db.select().from(paymentMethods)
    .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.isActive, true)));
};

// Transaction actions
export const createTransaction = async (transactionData: {
  userId: string;
  accountId: string;
  paymentMethodId?: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: string;
  description?: string;
  category?: string;
  recipient?: string;
  requiresApproval?: boolean;
}) => {
  const [transaction] = await db.insert(transactions).values(transactionData).returning();

  // Update account balance
  const currentBalance = await getAccountBalance(transactionData.accountId);
  let newBalance = parseFloat(currentBalance);

  if (transactionData.type === 'deposit') {
    newBalance += parseFloat(transactionData.amount);
  } else if (transactionData.type === 'withdrawal') {
    newBalance -= parseFloat(transactionData.amount);
  }

  await updateAccountBalance(transactionData.accountId, newBalance.toFixed(2));

  return transaction;
};

export const getUserTransactions = async (userId: string, limit = 50) => {
  return await db.select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
};

export const getPendingTransactions = async (userId: string) => {
  return await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.status, 'pending')
    ));
};

export const approveTransaction = async (transactionId: string, approverId: string) => {
  const [transaction] = await db.update(transactions)
    .set({
      status: 'completed',
      approvedBy: approverId,
      approvedAt: new Date()
    })
    .where(eq(transactions.id, transactionId))
    .returning();
  return transaction;
};

// Family account actions
export const createFamilyRequest = async (requestData: {
  childId: string;
  parentId: string;
  message?: string;
}) => {
  const [request] = await db.insert(familyRequests).values(requestData).returning();
  return request;
};

export const getFamilyRequests = async (userId: string) => {
  return await db.select()
    .from(familyRequests)
    .where(eq(familyRequests.parentId, userId))
    .orderBy(desc(familyRequests.createdAt));
};

export const approveFamilyRequest = async (requestId: string) => {
  const [request] = await db.update(familyRequests)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(eq(familyRequests.id, requestId))
    .returning();

  // Link child to parent
  if (request) {
    await db.update(users)
      .set({ parentId: request.parentId, role: 'child' })
      .where(eq(users.id, request.childId));
  }

  return request;
};

export const getUserChildren = async (parentId: string) => {
  return await db.select()
    .from(users)
    .where(eq(users.parentId, parentId));
};

// Budget actions
export const createBudget = async (budgetData: {
  userId: string;
  category: string;
  amount: string;
  period?: string;
  startDate: Date;
  endDate: Date;
}) => {
  const [budget] = await db.insert(budgets).values(budgetData).returning();
  return budget;
};

export const getUserBudgets = async (userId: string) => {
  return await db.select().from(budgets).where(eq(budgets.userId, userId));
};

export const updateBudgetSpent = async (budgetId: string, spentAmount: string) => {
  const [budget] = await db.update(budgets)
    .set({ spent: spentAmount })
    .where(eq(budgets.id, budgetId))
    .returning();
  return budget;
};

// AI Chat actions
export const saveAIChat = async (chatData: {
  userId: string;
  message: string;
  response: string;
}) => {
  const [chat] = await db.insert(aiChats).values({
    ...chatData,
    messageType: 'user'
  }).returning();

  // Also save AI response
  await db.insert(aiChats).values({
    userId: chatData.userId,
    message: chatData.response,
    response: '',
    messageType: 'ai'
  });

  return chat;
};

export const getUserAIChats = async (userId: string, limit = 100) => {
  return await db.select()
    .from(aiChats)
    .where(eq(aiChats.userId, userId))
    .orderBy(desc(aiChats.createdAt))
    .limit(limit);
};

// Analytics/Dashboard data
export const getUserDashboardData = async (userId: string) => {
  // Get total balance
  const userAccounts = await getUserAccounts(userId);
  const totalBalance = userAccounts.reduce((sum, account) => sum + parseFloat(account.balance), 0);

  // Get recent transactions
  const recentTransactions = await getUserTransactions(userId, 10);

  // Get pending approvals (for parents)
  const children = await getUserChildren(userId);
  const childIds = children.map(child => child.id);
  let pendingApprovals: any[] = [];
  if (childIds.length > 0) {
    pendingApprovals = await db.select({
      transaction: transactions,
      child: users
    })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(and(
        sql`${transactions.userId} IN ${childIds}`,
        eq(transactions.requiresApproval, true),
        eq(transactions.status, 'pending')
      ));
  }

  return {
    totalBalance: totalBalance.toFixed(2),
    recentTransactions,
    pendingApprovals,
    accounts: userAccounts
  };
};