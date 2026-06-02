# Personal Finance Assistant

An AI-driven, multi-user financial companion built for the Revonix Full Stack AI Engineer assessment.

## 🎯 Project Overview

This application allows users to interact with their financial data through natural language conversations. Users can upload transaction history, ask questions about spending patterns, set budgets, identify recurring charges, and receive personalized financial insights.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Groq API key (free)
- Optional: OpenAI API key (only for receipt OCR, very cheap)

### Setup Instructions

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd finance-assistant
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the contents of `supabase-schema.sql`
   - Get your project URL and anon key from Settings > API

4. **Configure environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key_optional
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open the app**
   - Navigate to http://localhost:3000
   - Create an account
   - Upload the sample CSV: `sample-transactions.csv`
   - Start asking questions!

## 📋 Features Implemented

### ✅ Core Features (Fully Implemented)

1. **Multi-user Authentication**
   - Email/password authentication via Supabase
   - Row-level security ensures data privacy
   - Session management with automatic refresh

2. **Transaction Management**
   - CSV upload with robust parsing
   - Handles various CSV formats
   - Batch inserts for performance
   - Validation and error handling

3. **Conversational AI Assistant**
   - Natural language interface
   - Multi-step reasoning with function calling
   - Context-aware responses
   - Remembers user preferences

4. **Financial Query Capabilities**
   - ✅ Spending by category and time period
   - ✅ Transaction search and filtering
   - ✅ Monthly spending summaries
   - ✅ Largest transactions
   - ✅ Recurring charge detection
   - ✅ Period-to-period comparisons
   - ✅ Budget management and tracking
   - ✅ Anomaly detection (unusual charges)
   - ✅ User preference storage

### 🔧 Partially Implemented / Stubbed

5. **Merchant Lookup**
   - Framework in place
   - Returns stub response
   - Would integrate search API in production

6. **Advanced Insights**
   - Tool defined
   - Would use separate LLM analysis in production

7. **Receipt OCR**
   - Not implemented in MVP due to time
   - Architecture supports it (OpenAI Vision integration ready)

## 🏗️ Architecture & Technical Decisions

### Tech Stack

**Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Chose Next.js for full-stack capabilities and fast development
- App Router for modern React patterns
- TypeScript for type safety

**Backend**: Next.js API Routes
- Simplified deployment (single codebase)
- Serverless-friendly

**Database**: Supabase (PostgreSQL)
- Managed PostgreSQL with built-in auth
- Row-level security for data isolation
- pgvector support for future embedding features
- Materialized views for query performance

**AI/LLM**:
- Primary: Groq (llama-3.3-70b-versatile) - Fast, free, excellent reasoning
- Vision: OpenAI GPT-4o-mini (not implemented, but ready for receipt OCR)
- Framework: Vercel AI SDK for unified interface

### Key Architectural Decisions

#### 1. **Intelligent Request Routing**
**Decision**: LLM-based function calling (Option B from requirements)

**Why**:
- Groq's llama-3.3 has excellent function calling capabilities
- More flexible than rule-based routing
- Handles ambiguous queries naturally
- Automatically selects the right tools

**How it works**:
```
User Query → LLM analyzes intent → Selects appropriate tool(s) → Executes → Formats response
```

#### 2. **Context Management Strategy**
**Decision**: Hybrid approach with SQL aggregation + prepared vector search

**Why**:
- Can't send years of transactions to LLM (token limits + cost)
- SQL handles structured queries efficiently (no LLM needed)
- Aggregated data reduces context size
- Materialized views pre-compute summaries

**Implementation**:
- Simple queries (spending by category) → Direct SQL, no LLM
- Complex queries (comparisons, insights) → SQL aggregates + LLM reasoning
- Future: Vector embeddings for semantic transaction search

#### 3. **Cost & Performance Optimization**

**Speed**:
- Direct SQL for simple queries (sub-100ms)
- Groq is extremely fast (~300ms for reasoning)
- Database indexes on common query patterns
- Materialized views for aggregates

**Cost**:
- Groq is free (no cost per query)
- No streaming = simpler implementation
- Batch inserts for uploads
- Only use OpenAI for receipt OCR (very rare, very cheap)

#### 4. **Scalability Considerations**

**Multi-user support**:
- Row-level security in database
- User-scoped queries throughout
- Separate conversation history per user

**Large datasets**:
- Pagination ready (limited to 100 transactions per query)
- Date range filtering
- Indexed queries
- Materialized view refresh strategy

**Concurrent users**:
- Stateless API design
- Serverless-friendly (Next.js API routes)
- Database connection pooling via Supabase

#### 5. **Build vs. Buy Decisions**

**Built**:
- Chat interface (custom UX)
- Tool routing logic (core differentiator)
- Transaction analysis (unique to our use case)

**Bought/Used**:
- Authentication (Supabase) - commodity feature
- Database (Supabase) - managed service
- LLM (Groq/OpenAI) - no point in training models
- AI Framework (Vercel AI SDK) - well-tested tool calling

## 📊 Database Schema

### Tables

1. **transactions**
   - User transaction history
   - Indexed on user_id, date, category
   - Supports vector embeddings (future)

2. **user_preferences**
   - Stores user context (payday, exclusions, etc.)
   - JSONB for flexible schema

3. **budgets**
   - User-defined spending limits
   - Supports multiple periods (monthly/weekly/yearly)

4. **conversations**
   - Chat history for context
   - Used for conversation continuity

5. **monthly_spending_summary** (Materialized View)
   - Pre-computed spending aggregates
   - Refreshed periodically
   - Significantly faster than real-time aggregation

## 🎨 User Experience

### Chat Interface
- Clean, modern design
- Example prompts to get started
- Real-time message updates
- Loading states with animations (no streaming)
- Error handling with user-friendly messages

### Features Demo

Try these queries after uploading the sample CSV:

```
"How much did I spend on groceries in January?"
"Show me my recurring subscriptions"
"What was my biggest purchase?"
"Compare my spending in March vs April"
"Set a $300 budget for dining"
"Am I over budget on anything?"
"Show me unusual charges"
"I get paid on the 15th" (saves preference)
```

## 🔒 Security & Privacy

- **Authentication**: Supabase Auth with secure session management
- **Authorization**: Row-level security policies
- **Data Isolation**: Each user can only access their own data
- **API Security**: Server-side user verification on all endpoints
- **Environment Variables**: Sensitive keys in .env (not committed)

## ⚠️ Known Limitations & Trade-offs

### Time Constraints (6 hours)

**What was skipped**:
1. **Receipt OCR** - Framework ready, not implemented
2. **Real merchant lookup** - Stubbed (would use search API)
3. **Advanced anomaly detection** - Simple 2x average threshold
4. **Data visualization** - Text-only responses
5. **Email confirmation** - Supabase supports it, but disabled for faster testing
6. **Comprehensive error handling** - Basic errors handled
7. **Unit tests** - No automated tests
8. **Mobile responsiveness** - Decent but not perfect
9. **Conversation pruning** - Keeps all messages (would truncate in production)
10. **Real-time updates** - Polling only

**What was simplified**:
1. **Recurring detection** - Pattern matching, not ML
2. **Insights** - Stubbed (would use deeper analysis)
3. **Budget tracking** - Simple percentage calculation
4. **Transaction categorization** - Uses CSV categories (would auto-categorize)

### Production Considerations

**Would add**:
- Rate limiting on API routes
- Caching layer (Redis) for frequent queries
- Better error logging (Sentry)
- Analytics (PostHog)
- Webhook for bank API integration
- Background jobs for materialized view refresh
- Embedding generation for semantic search
- More sophisticated anomaly detection (ML models)

## 🧪 Testing

### Manual Testing Checklist

- [x] Create account
- [x] Sign in
- [x] Upload CSV
- [x] Ask spending question
- [x] Check budget status
- [x] Set budget
- [x] Compare periods
- [x] Find recurring charges
- [x] Detect anomalies
- [x] Save preferences
- [x] Sign out

## 📈 Performance Benchmarks

**Query Response Times** (estimated):
- Simple spending query: ~500ms (SQL + LLM)
- Monthly summary: ~700ms (aggregation + formatting)
- Recurring detection: ~1.2s (pattern analysis)
- Anomaly detection: ~1s (statistics + filtering)

**Upload Performance**:
- 100 transactions: ~2 seconds
- 1000 transactions: ~10 seconds (batched)

## 🔮 Future Enhancements

If I had more time, I would add:

1. **Receipt OCR** - Full implementation with GPT-4 Vision
2. **Bank API Integration** - Plaid/Yodlee for live data
3. **Charts & Visualizations** - Spending graphs, trends
4. **Smart Categorization** - ML-based transaction categorization
5. **Bill Reminders** - Proactive notifications
6. **Export Reports** - PDF/Excel financial reports
7. **Shared Budgets** - Family/household budget tracking
8. **Investment Tracking** - Portfolio integration
9. **Tax Optimization** - Deduction suggestions
10. **Mobile App** - React Native version

## 📝 Development Notes

### Challenges Faced

1. **Groq doesn't have vision models** - Decided to keep OpenAI as fallback for OCR only
2. **Context window management** - Solved with hybrid SQL + LLM approach
3. **Transaction date parsing** - Handled multiple CSV formats
4. **Real-time vs simplicity** - Chose simplicity (loading animation vs streaming)

### What Went Well

1. **Function calling** - Groq's tool calling is excellent
2. **Supabase integration** - Very smooth setup
3. **Type safety** - TypeScript caught many bugs early
4. **Modular architecture** - Easy to extend with new tools

## 🙏 Assessment Reflection

**Time breakdown**:
- Architecture planning: 30 min
- Database schema & setup: 30 min
- Auth implementation: 45 min
- Chat API & tool routing: 90 min
- Tool handlers (financial queries): 90 min
- Frontend (auth + dashboard): 90 min
- CSV upload: 30 min
- Documentation: 45 min
- Testing & fixes: 30 min

**Total**: ~6 hours

**Prioritization strategy**:
1. Get auth + database working (foundation)
2. Build chat interface with one working query
3. Add more query types incrementally
4. Polish UX
5. Document thoroughly

**What I'm proud of**:
- Clean, maintainable code structure
- Smart routing that actually works
- Handles real-world messiness (CSV formats, date parsing)
- Scales to large datasets with current architecture
- Clear documentation of decisions and trade-offs

## 🤝 Contributing

This is an assessment project, but the architecture is production-ready with clear extension points.

## 📄 License

MIT License - Built for Revonix Full Stack AI Engineer Assessment
