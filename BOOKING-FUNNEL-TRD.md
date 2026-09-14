# Technical Requirements Document: Manufacturing Discovery-Call Funnel

## 1. Purpose

Implement a two-step discovery-call funnel on the Cimulink Manufacturing VSL site.

The funnel must:

1. collect prospect details in a popup using a **Frappe CRM Form**;
2. create a Frappe CRM Lead immediately after form submission;
3. take the prospect to a contextual booking page that explains the call;
4. display the existing Cal.com event inline on that page;
5. track each meaningful interaction in PostHog; and
6. update the same CRM Lead when the Cal.com booking is created, changed, or cancelled.

The solution must work with the intended Frappe Cloud Tiny plan. It must not depend on a custom Frappe app, Frappe Server Scripts, or hosting Frappe on Vercel.

## 2. Scope

### In scope

- The static website in this repository, `cimulink-vsl-manufacturing`.
- All existing “Book” / “strategy session” / “operational visibility assessment” CTAs.
- A popup CRM lead-capture form.
- A new booking page.
- A Cal.com embed for the existing event:

  `https://cal.com/ajay-kaaran-gupta/manufacturing-strategy`

- PostHog website analytics and conversion events.
- A Vercel webhook endpoint that receives Cal.com booking events and uses Frappe’s REST API to update CRM Leads.
- Frappe CRM configuration necessary for the lead form and Lead custom fields.

### Out of scope for the first release

- A custom Frappe application (`agency_os` or equivalent).
- Automated proposals, quotations, ERPNext project creation, email sequences, or WhatsApp messages.
- Lead scoring beyond basic lead status and source fields.
- Team routing / round-robin scheduling.
- Self-hosted Cal.com or self-hosted PostHog.
- Collecting sensitive information such as financial statements or operational documents through this public form.

## 3. User journey

```text
Visitor reads Manufacturing VSL
        |
        v
Clicks any “Book” CTA
        |
        v
Popup: Frappe CRM Form
        |
        |  Submit: email and phone required
        v
Frappe CRM creates or records the lead
        |
        |  Form redirect URL
        v
/book-operational-visibility-call.html
        |
        |  Prospect reads call context
        v
Embedded Cal.com event
        |
        +--> booking success → PostHog conversion event
        |
        +--> Cal.com webhook → Vercel endpoint → Frappe CRM Lead updated
```

The CRM Lead is the system of record for the prospect. PostHog is the behavioural and attribution analytics system; it must not become a copy of the CRM.

## 4. Functional requirements

### 4.1 CTA behaviour

**FR-01.** Replace the behaviour of every booking CTA on `index.html`. Clicking one must open the lead-capture popup, not scroll to a calendar and not leave the site.

**FR-02.** CTA examples that must use the shared popup:

- `Book a strategy session`
- `Book your operational visibility assessment`
- `Book your free strategy session`
- `Book your free operational visibility assessment`

**FR-03.** Each CTA must have a stable identifier through a `data-booking-cta` attribute, for example:

```html
<button type="button" class="button" data-booking-cta="hero_assessment">
  Book your operational visibility assessment <span>→</span>
</button>
```

The identifier is sent to PostHog as `cta_location`.

**FR-04.** The popup must be accessible: keyboard focus moves into it, Escape closes it, clicking the close button closes it, focus returns to the triggering CTA, and background page content is not interactive while it is open.

### 4.2 Popup lead-capture form

**FR-05.** The popup title is:

> Tell us where operations are getting stuck

Supporting text:

> Share a few details before choosing a time. This helps us make the operational visibility call relevant to your manufacturing business.

**FR-06.** The actual form must be a published **Frappe CRM Form** mapped to `CRM Lead`, displayed in an iframe in the popup. This makes Frappe CRM—not browser local storage, PostHog, or a Vercel database—the authoritative first store for the submitted details.

**FR-07.** Configure the form with exactly these visitor-facing fields for v1:

| Website label | Frappe CRM Lead field | Required | Notes |
| --- | --- | --- | --- |
| Full name | `lead_name` | No | Optional as requested. Encourage entry with a helpful placeholder. |
| Email address | `email` | Yes | Validate as an email address. |
| Phone number | `mobile_no` | Yes | Accept international format; display an example such as `+91 98765 43210`. |
| Company | `organization` | No | Company / manufacturing business name. |
| Designation | `job_title` | No | Founder, Owner, Operations Head, Plant Manager, etc. |

The current native CRM Form requires `first_name`. For the first native-form release, label this visitor-facing field `Full name` and keep it required. If the business requirement remains that only email and phone have asterisks, use a validated website/API form or a server-side/custom-app endpoint instead of claiming the native CRM Form can provide that behaviour.

**FR-07a. Phone validation limitation and follow-up.** The current native Frappe CRM public form stores the phone value in `CRM Lead.mobile_no`, but its built-in Phone/Data validation does not enforce a minimum number of digits. Short numeric values can therefore be accepted. The first implementation must not claim that native CRM validation enforces a 10-digit minimum. Strict validation must be implemented in the website booking-popup/API flow before production launch, or through a server-side validation endpoint/custom app if the hosting plan later permits it. Until then, retain the native format validation and flag invalid test records for cleanup.

**FR-08.** Add these CRM Lead custom fields before publishing the form:

| Label | Suggested fieldname | Type | Purpose |
| --- | --- | --- | --- |
| Website funnel | `custom_website_funnel` | Data | Fixed value: `manufacturing_vsl`. |
| First CTA location | `custom_first_cta_location` | Data | First CTA that opened the form. |
| Landing page URL | `custom_landing_page_url` | Small Text | Full page URL on form open. |
| UTM source | `custom_utm_source` | Data | Attribution. |
| UTM medium | `custom_utm_medium` | Data | Attribution. |
| UTM campaign | `custom_utm_campaign` | Data | Attribution. |
| UTM content | `custom_utm_content` | Data | Attribution. |
| Booking status | `custom_booking_status` | Select | `Not booked`, `Booked`, `Cancelled`, `Rescheduled`. |
| Cal.com booking UID | `custom_cal_booking_uid` | Data | Idempotency and reconciliation key. |
| Call start time | `custom_call_start_at` | Datetime | Scheduled time in UTC. |
| Call end time | `custom_call_end_at` | Datetime | Scheduled end time in UTC. |
| Call meeting URL | `custom_call_meeting_url` | Data | Returned meeting / video URL, if supplied. |
| Cal.com event type | `custom_cal_event_type` | Data | Fixed event identifier / title. |

**FR-09.** Configure the CRM Form’s hidden fields and defaults:

| Field | Value / source |
| --- | --- |
| `status` | `New` |
| `source` | Create/select CRM Lead Source: `Website – Manufacturing VSL` |
| `custom_website_funnel` | `manufacturing_vsl` |
| `custom_booking_status` | `Not booked` |

The implementation must pass dynamic attribution fields to the CRM form only by a supported and tested mechanism. If CRM Form cannot safely receive query-string prefill values in the chosen version, record attribution in the Vercel layer after submission or retain it in PostHog; do not expose any write-capable Frappe API key in browser JavaScript.

**FR-10.** On successful submit, the CRM Form must redirect to:

```text
https://<website-domain>/book-operational-visibility-call.html
```

Use a production domain in production and the appropriate Vercel preview domain only while testing.

**FR-11.** If the form fails to load, display a visible fallback link to the published CRM form in a new tab. Never place API credentials in the static site as a workaround.

### 4.3 Booking page

**FR-12.** Create `book-operational-visibility-call.html`. It must use the existing brand styles and be responsive on mobile and desktop.

**FR-13.** The booking page must show this contextual content before the calendar, adapted to the manufacturing offer:

> ## Schedule Your Manufacturing Operations Discovery Call
>
> ### Get a clearer view of the operational gaps affecting control, delivery, and profitability.
>
> This is a focused working conversation for manufacturing founders and operations leaders. We will use your current situation to identify the first practical improvement—not prescribe a large ERP programme before it is justified.
>
> #### In the call, we will explore
>
> - how sales, inventory, production, procurement, and reporting work today;
> - operational leakages, duplicated effort, and delays that affect profitability;
> - where teams and customers depend on the founder for answers or approvals;
> - gaps in stock, production, order, and delivery visibility;
> - your current ERP readiness and digital maturity; and
> - whether ERPNext, Odoo, targeted AI automation, or a staged combination is the right next step.
>
> #### What you will leave with
>
> - a clearer view of the operational issue worth solving first;
> - an initial view of the systems, process changes, and information needed; and
> - a practical next-step roadmap using the DRIVE Framework.
>
> #### Choose a convenient time
>
> Select a time below. The discussion is exploratory; it is not a commitment to a project.

Avoid unsubstantiated numerical promises or guarantees on this page.

**FR-14.** Embed the Cal.com event inline at the bottom of the booking page. Use the Cal.com-generated embed snippet for:

```text
ajay-kaaran-gupta/manufacturing-strategy
```

Use the popup-via-element-click or inline embed only if it preserves an on-page, visually integrated calendar. The preferred user experience is an inline calendar after the contextual content.

**FR-15.** The booking page must have a fallback link below the embed:

> Having trouble with the calendar? Open the booking page in a new tab.

The link must target the original Cal.com event URL.

**FR-16.** Show a brief privacy notice immediately before the calendar:

> By scheduling, you agree that Cimulink may use the details you provide to arrange and follow up on this conversation. See our Privacy Policy.

Link the policy when it exists. Until a policy URL exists, the page must not link to a placeholder or claim compliance it cannot demonstrate.

### 4.4 Cal.com to CRM synchronization

**FR-17.** Configure Cal.com webhooks for new bookings and cancellations/reschedules supported by the selected Cal.com plan. The destination is a Vercel endpoint, for example:

```text
POST /api/calcom/webhook
```

**FR-18.** The Vercel endpoint must:

1. verify the Cal.com webhook signature or secret before processing;
2. reject invalid requests with a non-2xx response;
3. parse the event type and booking payload;
4. find a matching CRM Lead by the attendee email address;
5. if no Lead exists, create one through the Frappe REST API with the event’s available attendee details and source `Cal.com – Manufacturing VSL`;
6. update the matching lead’s Cal.com fields and booking status;
7. avoid duplicate updates by using the Cal.com booking UID;
8. log only non-sensitive diagnostic metadata; and
9. return a success response quickly enough for Cal.com webhook delivery.

**FR-19.** Booking status mapping:

| Incoming Cal.com result | CRM value |
| --- | --- |
| Booking created | `Booked` |
| Booking cancelled | `Cancelled` |
| Rescheduled / new replacement booking | `Rescheduled`, then `Booked` for the active booking |

**FR-20.** Do not rely on the Cal.com browser embed event to update CRM. It is useful for PostHog conversion tracking but is not reliable enough to be the CRM source of truth. The webhook is authoritative.

### 4.5 PostHog analytics

**FR-21.** Use PostHog Cloud for the initial implementation. Install its browser SDK once on both `index.html` and `book-operational-visibility-call.html` using the PostHog project key stored in a public website configuration value. A PostHog project key is intentionally browser-visible; Frappe API credentials and Cal.com webhook secrets are not.

**FR-22.** Capture the following custom events:

| Event | Trigger | Required properties |
| --- | --- | --- |
| `manufacturing_book_call_cta_clicked` | Booking CTA click | `cta_location`, `page_url`, `utm_source`, `utm_medium`, `utm_campaign` |
| `manufacturing_lead_form_opened` | Popup shown | `cta_location`, `page_url` |
| `manufacturing_lead_form_submitted` | CRM form success / redirect confirmation where technically observable | `cta_location`, `form_name`, attribution properties |
| `manufacturing_booking_page_viewed` | Booking page load | attribution properties |
| `manufacturing_calendar_viewed` | Cal.com embed emits `bookerViewed` / ready event | `event_slug` |
| `manufacturing_booking_completed` | Cal.com embed emits `bookingSuccessfulV2` | `booking_uid`, `event_slug`, `start_time` when available |
| `manufacturing_booking_cancelled` | Server-side webhook mirrors a cancellation to PostHog only if a secure server-side PostHog key is configured | `booking_uid`, `event_slug` |

**FR-23.** Capture only minimal technical booking metadata in PostHog. Do **not** send phone numbers, enquiry text, full name, email, or meeting description as event properties.

**FR-24.** Preserve UTM parameters from the original VSL URL through the redirect to the booking page. Store them in PostHog event properties and, once a supported mechanism is confirmed, in the CRM Lead custom fields.

**FR-25.** Create these PostHog insights after deployment:

- VSL page view → CTA click → popup opened → booking page viewed → booking completed funnel.
- CTA conversion by `cta_location`.
- Booking conversion by `utm_source` and `utm_campaign`.
- Drop-off between CRM form opening and booking page view.

Session recording may be enabled only after masking form inputs and confirming the consent/privacy approach. It is not required for v1.

## 5. Technical design

### 5.1 Website files

| File | Change |
| --- | --- |
| `index.html` | Replace external booking links with popup trigger buttons; add modal markup, shared booking JavaScript, PostHog bootstrap, and form iframe configuration. |
| `book-operational-visibility-call.html` | New page containing the contextual call copy, Cal.com embed, fallback link, PostHog bootstrap, and Cal.com event listeners. |
| `api/calcom/webhook.ts` or equivalent Vercel function location | New server-side webhook receiver; exact location depends on whether this remains a static Vercel project or is converted to a framework project. |
| `README.md` | Add deployment configuration, environment variables, and test instructions after implementation. |

The current repository is static HTML. A Vercel Function can be added under the platform-supported API route layout, but its exact file layout must be validated against the chosen Vercel project setup before implementation.

### 5.2 Frappe CRM configuration

1. Create a CRM Lead Source: `Website – Manufacturing VSL`.
2. Add the Lead custom fields in FR-08.
3. Create and publish a CRM Form named `Manufacturing Discovery Call Lead` mapped to `CRM Lead`.
4. Configure only email and mobile number as visible required fields.
5. Set safe defaults for all Frappe-required hidden fields, especially `status` and the underlying mandatory `first_name`.
6. Restrict embed allowed domains to the production site and Vercel preview domain(s) used for testing.
7. Configure the form redirect URL to the booking page.
8. Create a limited-permission Frappe integration user for the Vercel webhook. Its API token must only have the access necessary to read/create/update `CRM Lead` records and related approved fields.

### 5.3 Secret and environment-variable contract

The repository must not contain any secrets. Configure these values in Vercel Project Settings:

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `FRAPPE_BASE_URL` | Server only | Frappe Cloud site base URL. |
| `FRAPPE_API_KEY` | Server only | Integration user API key. |
| `FRAPPE_API_SECRET` | Server only | Integration user API secret. |
| `CALCOM_WEBHOOK_SECRET` | Server only | Verify incoming Cal.com webhooks. |
| `POSTHOG_PROJECT_API_KEY` | Browser/public configuration | Browser event capture. |
| `POSTHOG_HOST` | Browser/public configuration | PostHog Cloud host / regional endpoint. |
| `POSTHOG_PERSONAL_API_KEY` | Optional, server only | Required only if webhook events are mirrored server-side to PostHog. |

Never use the Frappe Administrator API key. Never expose a Frappe API token, Cal.com webhook secret, or server-side PostHog personal API key in `index.html`, the booking page, client-side JavaScript, Git history, or screenshots.

### 5.4 CRM identity matching

The lead form asks for both email and phone, but use a conservative reconciliation policy:

1. First match a Lead by exact normalized email.
2. If no email match exists, match by normalized phone only when it produces exactly one Lead.
3. If no unique match exists, create a new Lead.
4. If email and phone point to different existing Leads, do not merge automatically; log a conflict for manual review.

This prevents one prospect’s booking from overwriting another lead.

## 6. Data and privacy requirements

### Data retained in CRM

Store lead contact details, company, job title, attribution, booking status, booking identifier, and meeting metadata needed for sales follow-up.

### Data sent to PostHog

Store pseudonymous browsing and conversion behaviour plus non-personal campaign/CTA metadata. Avoid direct personal identifiers and free-text form content in browser events.

### Consent and notices

- Add or update a Privacy Policy before driving significant paid traffic.
- Add a privacy notice beside the CRM form and calendar.
- If consent is legally required for analytics in the target jurisdictions, delay PostHog capture until consent is granted.
- Mask or disable session recording for forms and the Cal.com booking area unless explicitly reviewed.

## 7. Failure handling

| Failure | Required behaviour |
| --- | --- |
| CRM form iframe fails | Show fallback link to hosted CRM Form; keep the visitor on the site. |
| CRM Form submission fails | Display Frappe’s form error; do not navigate to booking page as if the lead was recorded. |
| Cal.com embed fails | Display the direct Cal.com fallback link. |
| Cal.com webhook temporarily fails | Return an appropriate retryable response where supported; log event ID / booking UID, not raw PII. |
| Frappe API fails after a valid webhook | Do not mark the webhook as permanently processed; enable retry/idempotent processing. |
| PostHog fails or is blocked | Booking and CRM capture must continue normally. Analytics must never block the visitor flow. |

## 8. Acceptance criteria

### Website and form

- [ ] Every booking CTA opens the same accessible popup.
- [ ] The popup shows the published Frappe CRM Form, not a duplicate browser-only form.
- [ ] Email and phone are visibly required; full name is required by the current native CRM Form unless the later website/API alternative is implemented.
- [ ] Phone values are validated for the agreed country/format and minimum digit rule in the final website/API flow; native CRM Form validation alone is insufficient for this requirement.
- [ ] Successful form submission produces exactly one CRM Lead and redirects to the booking page.
- [ ] A submission with the native form’s required Full name, phone, and email succeeds; phone minimum-length validation is covered by the final website/API flow.
- [ ] The popup has a keyboard-accessible close control and Escape behaviour.
- [ ] The booking page renders correctly at 320 px, tablet, and desktop widths.
- [ ] The page provides both the contextual explanation and an embedded Cal.com calendar.
- [ ] A direct Cal.com fallback link works.

### CRM and scheduling

- [ ] A booking updates the correct Lead based on email or uniquely matched phone.
- [ ] Replaying the same Cal.com webhook does not create duplicate Leads or duplicate booking updates.
- [ ] A cancellation changes the Lead booking status to `Cancelled`.
- [ ] A booking without a prior website form still creates a usable CRM Lead through the webhook.
- [ ] Frappe integration credentials are absent from all client-visible code.

### Analytics

- [ ] PostHog receives one CTA-click event with the correct CTA location.
- [ ] PostHog receives the booking-page and calendar-view events.
- [ ] A successful embedded booking emits one `manufacturing_booking_completed` event.
- [ ] UTM properties appear in PostHog funnel breakdowns.
- [ ] PostHog events contain no name, email, phone, form message, or other free-text PII.
- [ ] Blocking PostHog does not stop form submission or booking.

## 9. Implementation sequence

1. **Provision services:** create PostHog project, configure the Cal.com event, provision Frappe Cloud Tiny site with CRM, and identify production domain.
2. **Configure CRM:** create Lead Source, custom fields, CRM Form, defaults, allowed domains, and redirect URL; test hosted form independently.
3. **Build website UX:** add booking popup and new booking page; update all CTAs.
4. **Install analytics:** add PostHog, CTA/modal events, UTM preservation, and Cal.com embed event listeners.
5. **Build server integration:** add Vercel webhook endpoint, secret verification, Frappe API upsert, idempotency, and safe logging.
6. **Configure Cal.com webhook:** point it to production endpoint; use its test/replay facility if available.
7. **End-to-end test:** execute every acceptance test above on a production-like environment.
8. **Release:** deploy, verify live events and a test Lead, then monitor the first real bookings.

## 10. Decisions still required before coding

- Production website domain and final booking-page URL.
- Frappe Cloud site URL after it is created.
- PostHog Cloud region (EU or US) based on desired data residency.
- Cal.com webhook capabilities on the exact selected free/paid plan. If its plan cannot send required webhooks, retain the embed and CRM form but defer reliable booking-to-CRM automation until a supported plan or alternative is selected.
- Privacy Policy URL and analytics consent requirements for target visitors.

## 11. References

- Frappe CRM Forms: https://docs.frappe.io/crm/capturing-leads/web-form
- Frappe REST API: https://docs.frappe.io/framework/user/en/guides/integration/rest_api
- Cal.com embeds: https://cal.com/embed
- Cal.com embed events: https://cal.com/help/embedding/embed-events
- Cal.com webhooks: https://cal.com/docs/developing/guides/automation/webhooks

## 12. Current implementation decision and next phase

The current native Frappe CRM Form is useful for learning and as a fallback, but it cannot satisfy all final funnel requirements by itself:

- its current Lead form requires `first_name` / Full name;
- its native Phone/Data validation does not enforce a minimum number of digits; and
- a public native CRM Form does not provide the required website-side validation and attribution control.

Therefore, the production funnel will use a **website-owned popup form with Frappe CRM as the system of record**.

```text
Cimulink VSL index.html
  → accessible booking popup
  → same-site Vercel Function: /api/create-lead
  → server-side validation and normalization
  → Frappe CRM REST API
  → CRM Lead created
  → booking-page redirect
  → embedded Cal.com event
  → Cal.com webhook
  → Vercel webhook Function
  → same CRM Lead updated
```

This does not mean creating a second CRM or storing leads in Vercel. Vercel is only the secure API bridge. Frappe CRM remains the authoritative lead database.

### Next implementation order

1. Create the Vercel serverless endpoint `/api/create-lead`.
2. Add Frappe credentials only as Vercel server-side environment variables.
3. Validate email and phone in the endpoint; enforce the agreed minimum digit/country rule.
4. Add the popup form to `index.html`.
5. POST the popup data to `/api/create-lead`; never call Frappe with credentials from browser JavaScript.
6. On successful CRM creation, redirect to `book-operational-visibility-call.html`.
7. Add the contextual copy and embedded Cal.com event to that page.
8. Add PostHog events to the VSL, popup, booking page, and Cal.com embed.
9. Add the Cal.com webhook endpoint and update CRM by normalized email plus Cal.com booking UID.
10. Run the end-to-end acceptance tests before publishing paid traffic.

### Hosting and validation decision

The website form will accept international numbers using an E.164-style rule: a leading `+`, country code, and 8–15 digits after normalization. Spaces, parentheses, dots, and hyphens are accepted for readability and removed before storage. Browser validation gives immediate feedback; the Vercel Function repeats the validation server-side before calling Frappe.

Vercel Functions are technically available within Hobby limits, but Vercel restricts Hobby usage to personal/non-commercial projects. Cimulink’s production business website should therefore use Vercel Pro or a serverless provider whose commercial free tier is explicitly suitable. This choice affects hosting cost, not the Frappe CRM data model.

The published native CRM Form should remain available as a temporary fallback until the website-owned form is tested successfully. Once the new flow is stable, it may be unpublished to avoid two competing capture paths.
