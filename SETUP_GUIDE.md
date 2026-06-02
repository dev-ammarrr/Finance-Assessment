# Setup Guide - Finance Assistant

This guide will help you get the application running locally in under 10 minutes.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Choose a name, database password, and region
4. Wait for the project to be created (~2 minutes)

### 2.2 Run the Database Schema
1. In your Supabase dashboard, go to "SQL Editor"
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from this repo
4. Paste and click "Run"
5. You should see "Success. No rows returned"

### 2.3 Get Your API Keys
1. In Supabase, go to Settings > API
2. Copy your:
   - Project URL (looks like: `https://xxx.supabase.co`)
   - Anon/Public key (starts with `eyJ...`)

## Step 3: Get API Keys

### 3.1 Groq API Key (Required, Free)
1. Go to [console.groq.com](https://console.groq.com)
2. Create an account or sign in
3. Go to "API Keys"
4. Click "Create API Key"
5. Copy the key (starts with `gsk_...`)

### 3.2 OpenAI API Key (Optional)
Only needed if you plan to implement receipt OCR. You can skip this for now.

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account
3. Go to API Keys
4. Create a new key

## Step 4: Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-key-here
GROQ_API_KEY=gsk_...your-key-here
OPENAI_API_KEY=sk-...your-key-here (optional)
```

## Step 5: Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 6: Test the Application

1. **Create an account**
   - Click "Sign up"
   - Enter email and password
   - Click "Sign Up"

2. **Upload sample data**
   - Click "Upload CSV" button
   - Select `sample-transactions.csv` from the repo
   - Wait for confirmation

3. **Ask questions**
   ```
   "How much did I spend on groceries?"
   "Show me my recurring charges"
   "What was my biggest purchase?"
   ```

## Troubleshooting

### Error: "Unauthorized"
- Check that your Supabase keys are correct in `.env.local`
- Restart the dev server after changing `.env.local`

### Error: CSV upload fails
- Check that the schema was created correctly in Supabase
- Go to Supabase > Table Editor > Should see `transactions`, `budgets`, etc.

### Error: "GROQ_API_KEY not found"
- Make sure `.env.local` has your Groq key
- Restart dev server

### Database connection issues
- Check your Supabase project is running (not paused)
- Verify the URL and anon key are correct

## Next Steps

Once everything is working:

1. Try different queries
2. Set budgets: "Set a $300 budget for groceries"
3. Check budget status: "Am I over budget?"
4. Save preferences: "I get paid on the 15th"
5. Compare periods: "Did I spend more in March or April?"

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Need Help?

Check the main README.md for:
- Architecture details
- Feature list
- Implementation notes
- Known limitations
