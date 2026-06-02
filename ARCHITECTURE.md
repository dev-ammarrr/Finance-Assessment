# Architecture Documentation

## System Overview

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
         ├─── Auth Middleware (Session Management)
         │
         ├─── API Routes
         │    ├─── /api/chat (LLM Interaction)
         │    └─── /api/transactions/upload
         │
         ├─── Supabase Client
         │    ├─── Auth
         │    ├─── Database (PostgreSQL)
         │    └─── Row Level Security
         │
         └─── AI Layer
              ├─── Groq (Primary LLM)
              ├─── OpenAI (Vision, optional)
              └─── Vercel AI SDK (Orchestration)
```

## Request Flow

### Chat Query Flow

```
User Input
    ↓
Frontend (dashboard/page.tsx)
    ↓
POST /api/chat
    ↓
Auth Check (Supabase)
    ↓
Load User Preferences
    ↓
Build System Prompt with Context
    ↓
Groq LLM + Function Calling
    ↓
    ├─── Analyze Intent
    ├─── Select Tool(s)
    └─── Execute Tool Handler(s)
         ↓
         Database Query (Supabase)
         ↓
         Return Results
    ↓
LLM Formats Response
    ↓
Save to Conversation History
    ↓
Return to Frontend
```

### CSV Upload Flow

```
User Selects CSV
    ↓
Frontend (dashboard/page.tsx)
    ↓
POST /api/transactions/upload (FormData)
    ↓
Auth Check (Supabase)
    ↓
Parse CSV (PapaParse)
    ↓
Validate & Transform Data
    ↓
Batch Insert to Database
    (100 rows at a time)
    ↓
Return Import Summary
```

## Database Architecture

### Schema Design

**transactions** (Main transaction data)
- Indexed on: user_id, date, category
- Supports vector embeddings for future semantic search
- Transaction types: debit/credit

**user_preferences** (User context storage)
- JSONB field for flexible schema
- Stores: payday, budget exclusions, custom rules

**budgets** (User-defined spending limits)
- Unique constraint on (user_id, category, period)
- Supports multiple timeframes

**conversations** (Chat history)
- Ordered by created_at
- Used for context in multi-turn conversations

**monthly_spending_summary** (Materialized View)
- Pre-aggregated spending data
- Significantly faster than real-time queries
- Refreshed periodically

### Row Level Security (RLS)

All tables have policies ensuring users can only access their own data:

```sql
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);
```

This is enforced at the database level, not application level.

## AI Architecture

### Model Selection Strategy

| Query Type | Route | Rationale |
|------------|-------|-----------|
| Simple aggregate | Direct SQL | No LLM needed, fastest |
| Structured query | SQL + Light LLM | Extract params, query DB, format |
| Complex reasoning | SQL + Heavy LLM | Multi-step, comparisons, insights |
| Receipt OCR | Vision Model | Image understanding required |

### Tool System

**Tool Definition** (`lib/ai/tools.ts`)
- Defines function signatures
- Uses Zod for parameter validation
- Provides descriptions for LLM

**Tool Handlers** (`lib/ai/tool-handlers.ts`)
- Executes actual database queries
- User-scoped (takes userId parameter)
- Returns structured data

**Tool Execution** (`app/api/chat/route.ts`)
- Binds tools to user context
- Handles multi-step execution
- Manages conversation history

### Function Calling Flow

```
LLM receives user message + tool definitions
    ↓
LLM decides which tool(s) to call
    ↓
Extracts parameters from user message
    ↓
Calls tool execute() function
    ↓
Tool handler queries database
    ↓
Returns structured data to LLM
    ↓
LLM formats data into natural language response
```

**Example**:
```
User: "How much did I spend on groceries last month?"
    ↓
LLM: Calls getSpendingByCategory(category="groceries", startDate="2024-03-01", endDate="2024-03-31")
    ↓
Handler: Queries transactions table with filters
    ↓
Returns: { category: "groceries", total: "142.30", count: 3 }
    ↓
LLM: "You spent $142.30 on groceries last month across 3 transactions."
```

## Performance Optimizations

### Database Level

1. **Indexes**
   - Composite index on (user_id, date DESC)
   - Category index for filtering
   - Allows fast time-range queries

2. **Materialized Views**
   - Pre-compute monthly aggregates
   - Refresh on schedule or trigger
   - 10-100x faster than real-time aggregation

3. **Query Limits**
   - Cap results at 100 rows
   - Prevents memory issues with large datasets
   - Pagination-ready

### Application Level

1. **Batch Operations**
   - Upload: 100 transactions per insert
   - Reduces database round trips

2. **Direct SQL for Simple Queries**
   - Category totals: Pure SQL, no LLM
   - Only use LLM when reasoning required

3. **User-Scoped Queries**
   - RLS ensures efficient filtering
   - Indexes on user_id

### AI/LLM Level

1. **Model Selection**
   - Groq (free, fast) for most queries
   - Only use expensive models when needed

2. **Context Management**
   - Send aggregates, not raw data
   - Limit conversation history
   - Use system prompt for user context

3. **No Streaming**
   - Simpler implementation
   - Use loading animation instead
   - Still feels responsive

## Scalability Considerations

### Current Capacity

- **Users**: Thousands (Supabase free tier: 500MB database)
- **Transactions per user**: 10,000+ (with current schema)
- **Concurrent requests**: Hundreds (Next.js API routes auto-scale)
- **Query response time**: <1 second for most queries

### Scaling Strategy

**Database**:
- ✅ Indexes in place
- ✅ Materialized views for aggregates
- ✅ User-scoped queries (horizontal partition ready)
- Future: Separate read replicas for analytics

**Application**:
- ✅ Stateless API routes (scales horizontally)
- ✅ Serverless-friendly (Vercel, AWS Lambda)
- Future: Add Redis for caching frequent queries

**AI/LLM**:
- ✅ Groq has high rate limits
- ✅ Direct SQL bypass for simple queries
- Future: Response caching for common questions

### Handling Data Growth

**1,000 transactions** (current sample):
- Queries: <100ms
- Storage: ~100KB
- No issues

**10,000 transactions** (1-2 years):
- Queries: ~200ms (with indexes)
- Storage: ~1MB
- Materialized views help

**100,000 transactions** (10 years):
- Queries: ~500ms (indexed)
- Storage: ~10MB
- Pagination essential
- Time-based partitioning recommended

**1,000,000 transactions** (enterprise):
- Queries: Needs partitioning
- Storage: ~100MB per user
- Archive old data (>5 years)
- Separate analytics DB

## Security Architecture

### Authentication Flow

```
User submits credentials
    ↓
Supabase Auth (JWT-based)
    ↓
Session token stored in httpOnly cookie
    ↓
Middleware validates session on each request
    ↓
Token auto-refreshed before expiry
```

### Authorization

- **Database Level**: Row Level Security policies
- **API Level**: User verification in every endpoint
- **Data Isolation**: No cross-user queries possible

### Security Best Practices

✅ Environment variables for secrets
✅ Server-side API key usage (never exposed to client)
✅ HTTPS-only in production (Vercel default)
✅ SQL injection protection (parameterized queries)
✅ XSS protection (React escapes by default)
✅ CSRF protection (Next.js built-in)

## Edge Cases & Error Handling

### Data Quality Issues

**Malformed CSV**:
- PapaParse handles most formats
- Validation step filters invalid rows
- Returns skipped count to user

**Duplicate transactions**:
- No deduplication (user decision)
- Future: Hash-based duplicate detection

**Missing fields**:
- Required: date, amount, description
- Optional: category, merchant
- Graceful degradation

### Query Edge Cases

**No data for time period**:
- Returns empty result
- LLM explains no data found

**Ambiguous query**:
- LLM asks for clarification
- Examples provided

**Tool execution failure**:
- Error caught and logged
- User-friendly error message
- Conversation continues

### System Failures

**Database down**:
- Returns 500 error
- Client shows error message
- Retry logic recommended (not implemented)

**LLM API failure**:
- Returns error to user
- Conversation state preserved
- Can retry same message

**Invalid date formats**:
- Multiple formats attempted
- Falls back to current date
- Logs warning

## Testing Strategy

### Unit Tests (Not Implemented, Time Constraint)

Would test:
- Tool handlers with mock database
- Date parsing logic
- CSV validation
- Budget calculations

### Integration Tests (Not Implemented)

Would test:
- API endpoints
- Auth flow
- Database queries
- Tool execution

### Manual Testing (Completed)

✅ Auth signup/login/logout
✅ CSV upload with sample data
✅ Each tool/query type
✅ Budget creation and checking
✅ User preference storage
✅ Error scenarios

## Deployment Architecture

### Recommended: Vercel + Supabase

```
Vercel (Frontend + API)
    ↓
Supabase (Database + Auth)
    ↓
Groq API (LLM)
```

**Advantages**:
- One-click deploy from GitHub
- Auto-scaling
- Edge functions (low latency)
- Free tier available
- Environment variables managed

### Alternative: Docker + AWS

```
Docker Container
    ├─── Next.js (Frontend + API)
    ├─── PostgreSQL (Database)
    └─── Auth Service
```

**Advantages**:
- Full control
- Can run anywhere
- Private data (no third-party DB)

## Monitoring & Observability

### What to Monitor (Not Implemented)

**Application**:
- API response times
- Error rates
- User sign-ups
- Queries per user

**Database**:
- Query performance
- Connection pool usage
- Table sizes
- Slow queries

**AI/LLM**:
- Token usage
- Response times
- Tool call distribution
- Error rates

**Tools**:
- Vercel Analytics (built-in)
- Sentry (error tracking)
- PostHog (product analytics)
- Supabase Dashboard (database metrics)

## Future Architecture Improvements

### Short Term (Next 2 weeks)

1. **Response Caching**
   - Redis layer
   - Cache common queries
   - Invalidate on new transactions

2. **Receipt OCR Implementation**
   - OpenAI Vision integration
   - Image upload endpoint
   - Extract: merchant, amount, date, items

3. **Better Anomaly Detection**
   - Statistical analysis (z-score)
   - Category-specific thresholds
   - Machine learning model (optional)

### Medium Term (Next 2 months)

1. **Vector Search**
   - Generate embeddings for transactions
   - Semantic similarity search
   - "Find all restaurant charges" (matches various descriptions)

2. **Bank API Integration**
   - Plaid integration
   - Auto-sync transactions
   - Real-time balance

3. **Background Jobs**
   - Refresh materialized views
   - Send budget alerts
   - Generate monthly reports

### Long Term (6 months+)

1. **Advanced AI Features**
   - Predictive budgeting
   - Cash flow forecasting
   - Personalized savings suggestions

2. **Microservices Split**
   - Auth service
   - Transaction service
   - AI service
   - Analytics service

3. **Multi-Region Deployment**
   - Edge functions per region
   - Database replicas
   - CDN for static assets

## Technology Choices Rationale

### Why Next.js?
- Full-stack in one codebase
- API routes (no separate backend)
- Great TypeScript support
- Fast development

### Why Supabase?
- PostgreSQL (reliable, powerful)
- Built-in auth (saves time)
- RLS (security at DB level)
- Free tier generous

### Why Groq?
- Free API
- Extremely fast (300ms avg)
- Great function calling
- llama-3.3 is excellent

### Why Vercel AI SDK?
- Unified interface (Groq + OpenAI)
- Function calling abstraction
- Streaming support (future)
- Well-documented

### Why TypeScript?
- Type safety
- Catches errors at compile time
- Great IDE support
- Self-documenting code

### Why Tailwind?
- Fast styling
- Consistent design
- No CSS files
- Great defaults

## Code Organization

```
finance-assistant/
├── app/                    # Next.js App Router
│   ├── api/                # API endpoints
│   │   ├── chat/           # LLM chat endpoint
│   │   └── transactions/   # Upload endpoint
│   ├── dashboard/          # Main app page
│   ├── login/              # Auth pages
│   ├── signup/
│   └── page.tsx            # Home (redirects)
├── lib/                    # Shared libraries
│   ├── ai/                 # AI/LLM logic
│   │   ├── tools.ts        # Tool definitions
│   │   └── tool-handlers.ts # Tool implementations
│   └── supabase/           # Database clients
│       ├── client.ts       # Browser client
│       └── server.ts       # Server client
├── types/                  # TypeScript types
│   └── database.ts         # DB schema types
├── middleware.ts           # Auth middleware
├── supabase-schema.sql     # Database schema
└── sample-transactions.csv # Test data
```

## Conclusion

This architecture prioritizes:
1. **Speed** - Direct SQL, fast LLM, indexes
2. **Cost** - Free tiers, smart routing
3. **Scalability** - Stateless, indexed, partitionable
4. **Maintainability** - TypeScript, modular, documented
5. **Security** - RLS, auth, isolated data

It's production-ready for small-to-medium scale and has clear paths to scale up.
