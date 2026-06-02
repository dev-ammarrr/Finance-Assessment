import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Papa from 'papaparse'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read CSV file
    const text = await file.text()

    // Parse CSV
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing error', details: parsed.errors },
        { status: 400 }
      )
    }

    // Map CSV data to transaction format
    // Expected CSV columns: date, description, amount, category, merchant, type
    const transactions = parsed.data.map((row: any) => {
      // Handle different CSV formats
      const amount = Math.abs(parseFloat(row.amount || row.Amount || '0'))
      const transactionType = 
        row.type?.toLowerCase() || 
        row.Type?.toLowerCase() || 
        (parseFloat(row.amount || row.Amount || '0') < 0 ? 'debit' : 'credit')

      return {
        user_id: user.id,
        date: row.date || row.Date || new Date().toISOString(),
        description: row.description || row.Description || 'Unknown',
        amount: amount,
        category: row.category || row.Category || null,
        merchant: row.merchant || row.Merchant || null,
        transaction_type: transactionType.includes('debit') || transactionType.includes('payment') ? 'debit' : 'credit',
        is_recurring: false,
      }
    })

    // Filter out invalid transactions
    const validTransactions = transactions.filter(
      (t) => t.amount > 0 && t.date && t.description
    )

    if (validTransactions.length === 0) {
      return NextResponse.json(
        { error: 'No valid transactions found in CSV' },
        { status: 400 }
      )
    }

    // Insert transactions in batches
    const batchSize = 100
    let inserted = 0

    for (let i = 0; i < validTransactions.length; i += batchSize) {
      const batch = validTransactions.slice(i, i + batchSize)
      const { error } = await supabase.from('transactions').insert(batch)

      if (error) {
        console.error('Batch insert error:', error)
        throw error
      }

      inserted += batch.length
    }

    return NextResponse.json({
      success: true,
      imported: inserted,
      total: parsed.data.length,
      skipped: parsed.data.length - inserted,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
