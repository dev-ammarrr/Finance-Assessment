import { createClient } from '@/lib/supabase/server'
import { createGroq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { tools } from '@/lib/ai/tools'
import {
  handleGetSpendingByCategory,
  handleGetTransactions,
  handleGetMonthlySummary,
  handleGetLargestTransactions,
  handleGetRecurringCharges,
  handleCompareSpending,
  handleManageBudget,
  handleCheckBudgetStatus,
  handleDetectAnomalies,
  handleGetUserPreferences,
  handleSaveUserPreference,
} from '@/lib/ai/tool-handlers'
import { NextResponse } from 'next/server'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
})

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user preferences for context
    const userPreferences = await handleGetUserPreferences(user.id)

    // Build system prompt with user context
    const systemPrompt = `You are a helpful personal finance assistant. You help users understand and manage their finances through natural conversation.

User Context:
${Object.keys(userPreferences).length > 0 ? JSON.stringify(userPreferences, null, 2) : 'No saved preferences yet.'}

Your capabilities:
- Answer questions about spending, transactions, and budgets
- Identify recurring subscriptions and unusual charges
- Compare spending across different time periods
- Help set and track budgets
- Provide personalized financial insights and suggestions
- Remember user preferences and context

When answering:
- Be conversational and helpful
- Provide specific numbers and data when available
- Suggest actions the user can take
- Remember user context (like payday, budget exclusions)
- If you need to look up a merchant, use the searchMerchant tool
- Format currency properly with $ signs

Current date: ${new Date().toISOString().split('T')[0]}`

    // Execute tool calls
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      tools: {
        getSpendingByCategory: {
          ...tools.getSpendingByCategory,
          execute: async (params) => handleGetSpendingByCategory(user.id, params),
        },
        getTransactions: {
          ...tools.getTransactions,
          execute: async (params) => handleGetTransactions(user.id, params),
        },
        getMonthlySummary: {
          ...tools.getMonthlySummary,
          execute: async (params) => handleGetMonthlySummary(user.id, params),
        },
        getLargestTransactions: {
          ...tools.getLargestTransactions,
          execute: async (params) => handleGetLargestTransactions(user.id, params),
        },
        getRecurringCharges: {
          ...tools.getRecurringCharges,
          execute: async () => handleGetRecurringCharges(user.id),
        },
        compareSpending: {
          ...tools.compareSpending,
          execute: async (params) => handleCompareSpending(user.id, params),
        },
        manageBudget: {
          ...tools.manageBudget,
          execute: async (params) => handleManageBudget(user.id, params),
        },
        checkBudgetStatus: {
          ...tools.checkBudgetStatus,
          execute: async (params) => handleCheckBudgetStatus(user.id, params),
        },
        detectAnomalies: {
          ...tools.detectAnomalies,
          execute: async (params) => handleDetectAnomalies(user.id, params),
        },
        getUserPreferences: {
          ...tools.getUserPreferences,
          execute: async () => handleGetUserPreferences(user.id),
        },
        saveUserPreference: {
          ...tools.saveUserPreference,
          execute: async (params) => handleSaveUserPreference(user.id, params),
        },
        searchMerchant: {
          ...tools.searchMerchant,
          execute: async (params) => {
            // Stub: In production, would use search API
            return {
              merchant: params.merchantName,
              info: `This appears to be a charge from ${params.merchantName}. For more details, you can search online or check your email for receipts.`,
              stub: true,
            }
          },
        },
        getSpendingInsights: {
          ...tools.getSpendingInsights,
          execute: async (params) => {
            // This would use a separate LLM call to analyze data and generate insights
            // For now, return a stub
            return {
              insights: 'Insights feature is being processed...',
              stub: true,
            }
          },
        },
      },
      maxSteps: 5, // Allow multi-step reasoning
    })

    // Save conversation to database
    await supabase.from('conversations').insert([
      {
        user_id: user.id,
        role: 'user',
        content: messages[messages.length - 1].content,
      },
      {
        user_id: user.id,
        role: 'assistant',
        content: result.text,
      },
    ])

    return NextResponse.json({
      message: result.text,
      usage: result.usage,
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
