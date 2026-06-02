import { z } from 'zod'

// Tool schemas for AI function calling
export const toolSchemas = {
  getSpendingByCategory: {
    description: 'Get total spending for a specific category within a date range',
    inputSchema: z.object({
      category: z.string().describe('The spending category (e.g., groceries, restaurants, utilities)'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
    }),
  },

  getTransactions: {
    description: 'Get all transactions within a specific date range',
    inputSchema: z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
      category: z.string().optional().describe('Optional: filter by category'),
    }),
  },

  getMonthlySummary: {
    description: 'Get spending summary for a specific month, grouped by category',
    inputSchema: z.object({
      month: z.string().describe('Month in YYYY-MM format'),
    }),
  },

  getLargestTransactions: {
    description: 'Find the largest transactions within a date range',
    inputSchema: z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
      limit: z.number().default(10).describe('Number of transactions to return'),
    }),
  },

  getRecurringCharges: {
    description: 'Identify recurring/subscription charges based on transaction patterns',
    inputSchema: z.object({}),
  },

  compareSpending: {
    description: 'Compare spending between two time periods',
    inputSchema: z.object({
      period1Start: z.string().describe('Period 1 start date in YYYY-MM-DD format'),
      period1End: z.string().describe('Period 1 end date in YYYY-MM-DD format'),
      period2Start: z.string().describe('Period 2 start date in YYYY-MM-DD format'),
      period2End: z.string().describe('Period 2 end date in YYYY-MM-DD format'),
    }),
  },

  manageBudget: {
    description: 'Get current budgets or set a new budget for a category',
    inputSchema: z.object({
      action: z.enum(['get', 'set']).describe('Whether to get existing budgets or set a new one'),
      category: z.string().optional().describe('Category for the budget (required for set action)'),
      amount: z.number().optional().describe('Budget amount (required for set action)'),
      period: z.enum(['monthly', 'weekly', 'yearly']).optional().describe('Budget period (required for set action)'),
    }),
  },

  checkBudgetStatus: {
    description: 'Check how much of the budget has been used for each category in the current period',
    inputSchema: z.object({
      category: z.string().optional().describe('Optional: check specific category only'),
    }),
  },

  detectAnomalies: {
    description: 'Detect unusual transactions based on spending patterns',
    inputSchema: z.object({
      daysToAnalyze: z.number().default(30).describe('Number of recent days to analyze'),
    }),
  },

  searchMerchant: {
    description: 'Search online for information about an unfamiliar merchant or charge',
    inputSchema: z.object({
      merchantName: z.string().describe('Name of the merchant to search for'),
    }),
  },

  getUserPreferences: {
    description: 'Get stored user preferences and context (like payday, budget exclusions, etc.)',
    inputSchema: z.object({}),
  },

  saveUserPreference: {
    description: 'Save a user preference or context for future reference',
    inputSchema: z.object({
      key: z.string().describe('Preference key (e.g., "payday", "excludeFromBudget")'),
      value: z.any().describe('Preference value to store'),
    }),
  },

  getSpendingInsights: {
    description: 'Get AI-generated insights about spending patterns and suggestions',
    inputSchema: z.object({
      timeframe: z.string().default('last-3-months').describe('Timeframe to analyze (e.g., "last-month", "last-3-months", "year-to-date")'),
    }),
  },
}

export type ToolName = keyof typeof toolSchemas
