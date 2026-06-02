import { createClient } from '@/lib/supabase/server'
import { Transaction } from '@/types/database'

export async function handleGetSpendingByCategory(
  userId: string,
  params: { category: string; startDate: string; endDate: string }
) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('transaction_type', 'debit')
    .ilike('category', `%${params.category}%`)
    .gte('date', params.startDate)
    .lte('date', params.endDate)

  if (error) throw error

  const total = data.reduce((sum, t) => sum + Number(t.amount), 0)
  return {
    category: params.category,
    total: total.toFixed(2),
    transactionCount: data.length,
    startDate: params.startDate,
    endDate: params.endDate,
  }
}

export async function handleGetTransactions(
  userId: string,
  params: { startDate: string; endDate: string; category?: string }
) {
  const supabase = await createClient()
  
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', params.startDate)
    .lte('date', params.endDate)
    .order('date', { ascending: false })

  if (params.category) {
    query = query.ilike('category', `%${params.category}%`)
  }

  const { data, error } = await query.limit(100)

  if (error) throw error

  return {
    transactions: data,
    count: data.length,
  }
}

export async function handleGetMonthlySummary(
  userId: string,
  params: { month: string }
) {
  const supabase = await createClient()
  
  const startDate = `${params.month}-01`
  const endDate = new Date(params.month + '-01')
  endDate.setMonth(endDate.getMonth() + 1)
  const endDateStr = endDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('transactions')
    .select('category, amount, transaction_type')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lt('date', endDateStr)

  if (error) throw error

  // Group by category
  const summary: { [key: string]: { spent: number; earned: number; count: number } } = {}
  
  data.forEach(t => {
    const category = t.category || 'Uncategorized'
    if (!summary[category]) {
      summary[category] = { spent: 0, earned: 0, count: 0 }
    }
    
    if (t.transaction_type === 'debit') {
      summary[category].spent += Number(t.amount)
    } else {
      summary[category].earned += Number(t.amount)
    }
    summary[category].count++
  })

  return {
    month: params.month,
    summary: Object.entries(summary).map(([category, data]) => ({
      category,
      spent: data.spent.toFixed(2),
      earned: data.earned.toFixed(2),
      transactionCount: data.count,
    })),
    totalSpent: Object.values(summary).reduce((sum, s) => sum + s.spent, 0).toFixed(2),
  }
}

export async function handleGetLargestTransactions(
  userId: string,
  params: { startDate: string; endDate: string; limit: number }
) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', params.startDate)
    .lte('date', params.endDate)
    .order('amount', { ascending: false })
    .limit(params.limit)

  if (error) throw error

  return {
    transactions: data,
    count: data.length,
  }
}

export async function handleGetRecurringCharges(userId: string) {
  const supabase = await createClient()
  
  // Get transactions from last 3 months
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_type', 'debit')
    .gte('date', threeMonthsAgo.toISOString())
    .order('date', { ascending: false })

  if (error) throw error

  // Simple pattern matching: find merchants with similar amounts appearing monthly
  const merchantPatterns: { [key: string]: Transaction[] } = {}
  
  data.forEach(t => {
    const key = `${t.merchant || t.description}-${Math.round(Number(t.amount))}`
    if (!merchantPatterns[key]) {
      merchantPatterns[key] = []
    }
    merchantPatterns[key].push(t)
  })

  // Filter for recurring (appears 2+ times)
  const recurring = Object.entries(merchantPatterns)
    .filter(([_, transactions]) => transactions.length >= 2)
    .map(([key, transactions]) => ({
      merchant: transactions[0].merchant || transactions[0].description,
      amount: transactions[0].amount,
      frequency: transactions.length,
      lastCharge: transactions[0].date,
      category: transactions[0].category,
    }))

  return {
    recurringCharges: recurring,
    count: recurring.length,
  }
}

export async function handleCompareSpending(
  userId: string,
  params: {
    period1Start: string
    period1End: string
    period2Start: string
    period2End: string
  }
) {
  const supabase = await createClient()
  
  // Get period 1 data
  const { data: period1Data, error: error1 } = await supabase
    .from('transactions')
    .select('amount, category')
    .eq('user_id', userId)
    .eq('transaction_type', 'debit')
    .gte('date', params.period1Start)
    .lte('date', params.period1End)

  if (error1) throw error1

  // Get period 2 data
  const { data: period2Data, error: error2 } = await supabase
    .from('transactions')
    .select('amount, category')
    .eq('user_id', userId)
    .eq('transaction_type', 'debit')
    .gte('date', params.period2Start)
    .lte('date', params.period2End)

  if (error2) throw error2

  const period1Total = period1Data.reduce((sum, t) => sum + Number(t.amount), 0)
  const period2Total = period2Data.reduce((sum, t) => sum + Number(t.amount), 0)
  const difference = period2Total - period1Total
  const percentChange = period1Total > 0 ? ((difference / period1Total) * 100).toFixed(1) : 'N/A'

  return {
    period1: {
      start: params.period1Start,
      end: params.period1End,
      total: period1Total.toFixed(2),
      transactionCount: period1Data.length,
    },
    period2: {
      start: params.period2Start,
      end: params.period2End,
      total: period2Total.toFixed(2),
      transactionCount: period2Data.length,
    },
    difference: difference.toFixed(2),
    percentChange,
    comparison: difference > 0 ? 'spending increased' : difference < 0 ? 'spending decreased' : 'spending stayed the same',
  }
}

export async function handleManageBudget(
  userId: string,
  params: {
    action: 'get' | 'set'
    category?: string
    amount?: number
    period?: 'monthly' | 'weekly' | 'yearly'
  }
) {
  const supabase = await createClient()
  
  if (params.action === 'get') {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    return { budgets: data }
  } else {
    // Set budget
    if (!params.category || !params.amount || !params.period) {
      throw new Error('Category, amount, and period are required to set a budget')
    }

    const { data, error } = await supabase
      .from('budgets')
      .upsert({
        user_id: userId,
        category: params.category,
        amount: params.amount,
        period: params.period,
      })
      .select()

    if (error) throw error

    return {
      success: true,
      budget: data[0],
    }
  }
}

export async function handleCheckBudgetStatus(
  userId: string,
  params: { category?: string }
) {
  const supabase = await createClient()
  
  // Get budgets
  let budgetQuery = supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)

  if (params.category) {
    budgetQuery = budgetQuery.eq('category', params.category)
  }

  const { data: budgets, error: budgetError } = await budgetQuery

  if (budgetError) throw budgetError

  // Calculate spending for each budget
  const results = await Promise.all(
    budgets.map(async (budget) => {
      // Calculate date range based on period
      const now = new Date()
      let startDate: Date
      
      if (budget.period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      } else if (budget.period === 'weekly') {
        startDate = new Date(now)
        startDate.setDate(now.getDate() - now.getDay())
      } else {
        startDate = new Date(now.getFullYear(), 0, 1)
      }

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('transaction_type', 'debit')
        .ilike('category', `%${budget.category}%`)
        .gte('date', startDate.toISOString())

      if (error) throw error

      const spent = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
      const remaining = Number(budget.amount) - spent
      const percentUsed = (spent / Number(budget.amount)) * 100

      return {
        category: budget.category,
        budget: Number(budget.amount),
        spent: spent.toFixed(2),
        remaining: remaining.toFixed(2),
        percentUsed: percentUsed.toFixed(1),
        period: budget.period,
        status: percentUsed >= 90 ? 'warning' : percentUsed >= 100 ? 'exceeded' : 'ok',
      }
    })
  )

  return { budgetStatus: results }
}

export async function handleDetectAnomalies(
  userId: string,
  params: { daysToAnalyze: number }
) {
  const supabase = await createClient()
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - params.daysToAnalyze)

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_type', 'debit')
    .gte('date', startDate.toISOString())
    .order('amount', { ascending: false })

  if (error) throw error

  // Simple anomaly detection: flag transactions > 2x average
  const amounts = data.map(t => Number(t.amount))
  const average = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
  const anomalies = data.filter(t => Number(t.amount) > average * 2)

  return {
    anomalies: anomalies.slice(0, 10),
    count: anomalies.length,
    averageTransaction: average.toFixed(2),
  }
}

export async function handleGetUserPreferences(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

  return data?.preferences || {}
}

export async function handleSaveUserPreference(
  userId: string,
  params: { key: string; value: any }
) {
  const supabase = await createClient()
  
  // Get existing preferences
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('preferences')
    .eq('user_id', userId)
    .single()

  const updatedPreferences = {
    ...(existing?.preferences || {}),
    [params.key]: params.value,
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      preferences: updatedPreferences,
      updated_at: new Date().toISOString(),
    })

  if (error) throw error

  return {
    success: true,
    preferences: updatedPreferences,
  }
}
