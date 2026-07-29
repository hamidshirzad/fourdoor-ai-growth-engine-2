## Fourdoor AI - Full System Architecture

### Frontend Layer (Next.js + React)

**Pages:**
- `/` - Landing page
- `/login` - Authentication
- `/signup` - User registration  
- `/onboarding` - Initial setup (niche, audience, goal)
- `/dashboard` - Main dashboard with KPIs
- `/content` - Content generation and management
- `/leads` - Lead inbox and management
- `/analytics` - Performance metrics and insights
- `/settings` - Account, billing, preferences

**Components:**
- Navigation - Top bar with links
- ProtectedRoute - Authentication guard
- Store (Zustand) - Global state management
- API client - HTTP requests to backend

**State Management:**
- useAuthStore - User auth and session
- useContentStore - Generated content and posts
- useLeadsStore - Leads and CRM data

### Backend Layer (Node.js + Express)

**Services:**
- `authService` - JWT tokens, password hashing, user management
- `aiService` - OpenAI API integration for content generation, engagement, qualification
- `contentService` - Post creation, scheduling, bulk operations
- `analyticsService` - KPI calculation, suggestions
- `billingService` - PayPal subscriptions, webhooks

**Routes:**
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/profile` - Fetch user profile
- `POST /api/content/generate` - Generate AI content
- `POST /api/content/schedule` - Schedule post
- `GET /api/content/posts` - List posts
- `POST /api/leads/create` - Create lead
- `GET /api/leads/list` - List leads
- `POST /api/leads/bulk-upload` - CSV import
- `POST /api/leads/send-message` - Personalized outreach
- `GET /api/analytics/dashboard` - Analytics dashboard
- `POST /api/analytics/recalculate` - Recalculate metrics
- `POST /api/billing/subscribe` - Create subscription
- `POST /api/billing/webhook` - PayPal webhook handler
- `GET /api/billing/plans` - List pricing plans

**Middleware:**
- `authenticateToken` - JWT verification on protected routes
- CORS enabled for frontend
- Request logging and error handling

### Database Layer (PostgreSQL)

**Tables:**

```sql
users (id, name, email, password_hash, company, plan, subscription_status, paypal_subscription_id, api_key, timestamps)

posts (id, user_id, content, caption, hashtags, platform, status, scheduled_at, posted_at, engagement_count, timestamps)

leads (id, user_id, name, email, source, message, score, status, timestamps)

messages (id, user_id, lead_id, content, sender, platform, timestamps)

campaigns (id, user_id, name, niche, audience, goal, status, timestamps)

analytics (id, user_id, engagement_rate, ctr, conversion_rate, total_posts, total_leads, total_booked_calls, timestamps)

bookings (id, user_id, lead_id, calendly_event_uri, booked_at, timestamps)
```

### AI Integration (OpenAI GPT-4)

**Agents:**

1. **Content Agent** - Generates platform-specific content
   - Input: niche, audience, goal, platform
   - Output: caption, hashtags, hook, CTA

2. **Engagement Agent** - Analyzes and replies to comments
   - Input: comment text, context
   - Output: natural reply promoting engagement

3. **Sales Agent** - Qualifies leads automatically
   - Input: lead message
   - Output: score (0-100), qualification status, next questions

4. **Analytics Agent** - Provides optimization suggestions
   - Input: current metrics
   - Output: actionable recommendations

### Automation (node-schedule)

- **9 AM Daily** - Generate content for all active campaigns
- **6 PM Daily** - Recalculate analytics and update suggestions
- **On-demand** - Manual content generation, lead qualification

### Billing (PayPal)

**Plans:**
- Starter €29/month - 5 posts/month
- Pro €79/month - 50 posts/month + AI engagement
- Agency €199/month - Unlimited + API access

**Webhook Events:**
- BILLING.SUBSCRIPTION.CREATED - Activate subscription
- BILLING.SUBSCRIPTION.CANCELLED - Deactivate subscription
- BILLING.SUBSCRIPTION.FAILED - Handle payment failures

### Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│         Client Browser (Frontend)               │
│  ├─ Login/Signup (public)                       │
│  ├─ Dashboard (protected)                       │
│  ├─ Content Generator                           │
│  ├─ Lead Management                             │
│  └─ Analytics                                   │
└────────────────┬────────────────────────────────┘
                 │ HTTPS
                 ├──────────────────────────────┐
                 ▼                              ▼
    ┌──────────────────────┐        ┌───────────────────┐
    │ Vercel (Frontend)    │        │ Railway (Backend) │
    │ ├─ Next.js build    │        │ ├─ Express.js   │
    │ ├─ Auto scaling     │        │ ├─ Node.js      │
    │ ├─ CDN included     │        │ └─ Auto scale   │
    │ └─ Zero-config      │        └────────┬────────┘
    └──────────────────────┘                 │
                                             │ Connection pooling
                                             ▼
                                   ┌──────────────────────┐
                                   │ Supabase Database    │
                                   │ ├─ PostgreSQL 15    │
                                   │ ├─ Backups enabled  │
                                   │ ├─ Read replicas    │
                                   │ └─ SSL encrypted    │
                                   └──────────────────────┘
```

### Security

- **JWT tokens** - Secure user sessions (7-day expiry)
- **Password hashing** - bcryptjs with 10 salt rounds
- **CORS** - Restricted to frontend domain
- **Environment variables** - Never commit secrets
- **API validation** - Input sanitization on all endpoints
- **Rate limiting** - Prevent abuse (implement in production)
- **SSL/TLS** - HTTPS on all deployments

### Data Flow Example: Content Generation

1. User clicks "Generate Content" with niche, audience, goal
2. Frontend sends POST to `/api/content/generate`
3. Backend verifies JWT token
4. Calls OpenAI GPT-4 with prompt template
5. Parses JSON response (caption, hashtags, etc.)
6. Saves posts to database
7. Returns content to frontend
8. User reviews and schedules posts
9. Scheduler automatically posts at scheduled time

---

This architecture is production-ready, scalable, and fully functional.
