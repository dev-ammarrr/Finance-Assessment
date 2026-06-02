export interface Transaction {
  id: string
  user_id: string
  date: string
  description: string
  amount: number
  category: string | null
  merchant: string | null
  transaction_type: 'debit' | 'credit'
  is_recurring: boolean
  created_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  preferences: {
    payday?: string
    excludeFromBudget?: string[]
    customCategories?: { [key: string]: string[] }
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  amount: number
  period: 'monthly' | 'weekly' | 'yearly'
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface MonthlySpendingSummary {
  user_id: string
  month: string
  category: string | null
  total_spent: number
  transaction_count: number
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}
