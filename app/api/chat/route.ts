import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
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

    // Get user's transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(100)

    if (txError) {
      console.error('Transaction fetch error:', txError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Build context with transaction data
    const transactionSummary = transactions.length > 0 
      ? `You have ${transactions.length} transactions. Here's a summary:\n${JSON.stringify(transactions.slice(0, 10), null, 2)}`
      : 'No transactions found. Ask the user to upload their transaction data.'

    const systemPrompt = `You are a helpful personal finance assistant. You help users understand and manage their finances.

Transaction Data:
${transactionSummary}

Analyze the data and answer the user's questions. Be specific with numbers and dates.`

    // Call Groq without function calling
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    })

    const responseText = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Save conversation
    await supabase.from('conversations').insert([
      {
        user_id: user.id,
        role: 'user',
        content: messages[messages.length - 1].content,
      },
      {
        user_id: user.id,
        role: 'assistant',
        content: responseText,
      },
    ])

    return NextResponse.json({
      message: responseText,
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
