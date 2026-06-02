import { z } from 'zod'
import { tool } from 'ai'

export const tools = {
  // Simple query: Get spending by category
  getSpendingByCategory: tool({
    description: 'Get total spending for a specific category within a date range',
    parameters: z.object({
      category: z.string().describe('The spending category (e.g., groceries, restaurants, utilities)'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
    }),
  }),

  // Get all transactions in a time range
  getTransactions: tool({
    description: 'Get all transactions within a specific date range',
    parameters: z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
      category: z.string().optional().describe('Optional: filter by category'),
    }),
  }),

  // Get monthly spending summary
  getMonthlySummary: tool({
    description: 'Get spending summary for a specific month, grouped by category',
    parameters: z.object({
      month: z.string().describe('Month in YYYY-MM format'),
    }),
  }),

  // Find largest transactions
  getLargestTransactions: tool({
    description: 'Find the largest transactions within a date range',
    parameters: z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
      limit: z.number().default(10).describe('Number of transactions to return'),
    }),
  }),

  // Identify recurring charges
  getRecurringCharges: tool({
    description: 'Identify recurring/subscription charges based on transaction patterns',
    parameters: z.object({}),
  }),

  // Compare spending across periods
  compareSpending: tool({
    description: 'Compare spending between two time periods',
    parameters: z.object({
      period1Start: z.string().describe('Period 1 start date in YYYY-MM-DD format'),
      period1End: z.string().describe('Period 1 end date in YYYY-MM-DD format'),
      period2Start: z.string().describe('Period 2 start date in YYYY-MM-DD format'),
      period2End: z.string().describe('Period 2 end date in YYYY-MM-DD format'),
    }),
  }),

  // Get or set budget
  manageBudget: tool({
    description: 'Get current budgets or set a new budget for a category',
    parameters: z.object({
      action: z.enum(['get', 'set']).describe('Whether to get existing budgets or set a new one'),
      category: z.string().optional().describe('Category for the budget (required for set action)'),
      amount: z.number().optional().describe('Budget amount (required for set action)'),
      period: z.enum(['monthly', 'weekly', 'yearly']).optional().describe('Budget period (required for set action)'),
    }),
  }),

  // Check budget status
  checkBudgetStatus: tool({
    description: 'Check how much of the budget has been used for each category in the current period',
    parameters: z.object({
      category: z.string().optional().describe('Optional: check specific category only'),
    }),
  }),

  // Detect unusual activity
  detectAnomalies: tool({
    description: 'Detect unusual transactions based on spending patterns',
    parameters: z.object({
      daysToAnalyze: z.number().default(30).describe('Number of recent days to analyze'),
    }),
  }),

  // Search for merchant information
  searchMerchant: tool({
    description: 'Search online for information about an unfamiliar merchant or charge',
    parameters: z.object({
      merchantName: z.string().describe('Name of the merchant to search for'),
    }),
  }),

  // Get user preferences
  getUserPreferences: tool({
    description: 'Get stored user preferences and context (like payday, budget exclusions, etc.)',
    parameters: z.object({}),
  }),

  // Save user preferences
  saveUserPreference: tool({
    description: 'Save a user preference or context for future reference',
    parameters: z.object({
      key: z.string().describe('Preference key (e.g., "payday", "excludeFromBudget")'),
      value: z.any().describe('Preference value to store'),
    }),
  }),

  // Get spending insights
  getSpendingInsights: tool({
    description: 'Get AI-generated insights about spending patterns and suggestions',
    parameters: z.object({
      timeframe: z.string().default('last-3-months').describe('Timeframe to analyze (e.g., "last-month", "last-3-months", "year-to-date")'),
    }),
  }),
}

export type ToolName = keyof typeof tools
