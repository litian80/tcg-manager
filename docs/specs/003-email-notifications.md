# Spec 003: Email Notification System

## Context
Players may forget to submit their deck lists before the tournament deadline. Organizers need an automated way to remind players, reducing day-of-event chaos and manual follow-ups.

## Requirements
- **Automated Reminders**: System sends an email to registered players who have *not* submitted a deck list, 2 hours prior to the deadline.
- **Confirmation Emails**: Sending a receipt/confirmation email when a deck list is successfully submitted (optional but good for UAT/peace of mind).
- **Service Integration**: Use an email provider like Resend, SendGrid, or AWS SES.

## Technical Implementation Notes
- **Cron Jobs / Scheduling**: Since Next.js is serverless, we need a reliable way to trigger time-based events. Options:
  - Supabase pg_cron (Database-level scheduling, highly reliable for this stack).
  - Vercel Cron Jobs (Triggers an API endpoint periodically to check for upcoming deadlines).
  - Upstash QStash or similar task queue.
- **Template System**: Use generic React Email templates for the notification payloads.
- **Database Trigger**: Alternatively, use Supabase Database Webhooks triggered on row insertion/updates for the immediate confirmation emails.

## Acceptance Criteria
- [ ] A background job successfully identifies tournaments with deadlines approaching in <= 2 hours.
- [ ] It fetches all `tournament_players` missing a `deck_lists` entry.
- [ ] An email is successfully dispatched to the missing players via the chosen provider.
