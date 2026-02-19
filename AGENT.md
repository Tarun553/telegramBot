# AI Khata Bot — Agent Specification

## 1. Product Overview

AI-powered bookkeeping assistant for **small shop owners** usable via:

* Telegram bot
* WhatsApp bot
* Web dashboard

Users can send **Hindi / Hinglish / English** messages like:

* “aaj 12 maggie biki 20 rupay ki”
* “Ramesh ko 250 udhar”
* “aaj ki sale kitni hui”
* “Ramesh ka udhar kitna hai”

The system must:

1. Understand natural language
2. Convert to structured intent + data
3. Save or query database
4. Reply in human-friendly Hindi

---

## 2. Core Architecture

### Layers

**Messaging Layer**

* Telegram Bot API (MVP)
* WhatsApp Cloud API (later)

**AI Layer**

* Gemini LLM for:

  * intent detection
  * entity extraction
  * Hindi/Hinglish understanding

**Backend Layer**

* Next.js 16 route handlers
* Handles:

  * webhooks
  * Gemini calls
  * DB read/write
  * reply generation

**Database**

* PostgreSQL + Prisma ORM

**Auth**

* Clerk (dashboard login only)

**Frontend Dashboard**

* Next.js
* Shows:

  * today sales
  * udhar list
  * summaries
  * charts

---

## 3. Message Processing Flow

1. User sends message to bot
2. Webhook hits **Next.js API**
3. Backend calls **Gemini** with strict prompt
4. Gemini returns **intent JSON**
5. Backend branches:

### WRITE intent

→ Save transaction in DB

### READ intent

→ Query DB → generate summary

6. Send reply back to user via bot API

---

## 4. Supported Intents

### WRITE

* `create_sale`
* `create_credit`
* `create_payment`

### READ

* `get_today_sales`
* `get_total_sales_by_date`
* `get_person_credit`
* `get_week_summary`

Agent must **always return one valid intent**.

---

## 5. Intent JSON Formats

### Sale

```json
{
  "intent": "create_sale",
  "item": "maggie",
  "qty": 12,
  "price": 20,
  "total": 240,
  "date": "today"
}
```

### Credit

```json
{
  "intent": "create_credit",
  "person": "Ramesh",
  "amount": 250
}
```

### Query person credit

```json
{
  "intent": "get_person_credit",
  "person": "Ramesh"
}
```

---

## 6. Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  clerkId   String   @unique
  shopName  String?
  createdAt DateTime @default(now())

  transactions Transaction[]
}

model Transaction {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  type        TransactionType
  item        String?
  qty         Int?
  amount      Float
  personName  String?

  createdAt   DateTime @default(now())
}

enum TransactionType {
  SALE
  CREDIT
  PAYMENT
}
```

---

## 7. Backend Decision Logic

### If WRITE

* Validate fields
* Insert into `Transaction`
* Respond with confirmation message

### If READ

**Today sales**

```
SUM(amount WHERE type=SALE AND date=today)
```

**Person credit**

```
SUM(CREDIT) - SUM(PAYMENT) for person
```

Return formatted Hindi reply.

---

## 8. Gemini Prompt Rules

The LLM must:

* Understand Hindi, Hinglish, English
* Return **ONLY valid JSON**
* Choose **one intent**
* Never include explanation text
* Use today’s date when unspecified

---

## 9. Folder Structure

```
app/
  api/
    telegram/webhook
    whatsapp/webhook
    transactions
    summary

lib/
  gemini.ts
  prisma.ts
  intent-parser.ts

prisma/
  schema.prisma
```

---

## 10. MVP Feature Scope

### Phase 1

* Telegram bot input
* Gemini intent parsing
* Save + query transactions
* Simple dashboard

### Phase 2

* WhatsApp integration
* Voice message support
* Daily summary cron
* Udhar reminders

### Phase 3

* Inventory tracking
* GST reports
* Multi-shop analytics
* Paid subscription

---

## 11. Success Criteria

Product is successful when:

* Shopkeeper can run business **only via WhatsApp**
* No manual typing UI needed
* Hindi replies feel like **real accountant**
* Daily usage becomes habit

---

## 12. Future AI Upgrades

* Voice → text → intent
* Auto daily profit summary at night
* Smart suggestions:

  * “Aaj sale kam hai”
  * “Ramesh ka udhar zyada ho raha hai”

---

**End of Agent Spec**
