# United Benefits Retirement Calculator — Full Rebuild Spec (v3)

## Context

The existing calculator lives at https://ub-retirement-calculator.vercel.app/ and is a 5-step Next.js/React app deployed on Vercel. We need a significant feature upgrade that transforms it from a simple estimator into a comprehensive, interactive federal retirement planning tool with AI-powered projections, a gap/risk analysis engine, advisor assignment, Salesforce CRM sync (Phase 2), and a polished final report. The tone is professional, plain-English, and advisor-friendly.

## Project Goal

Rebuild the United Benefits Retirement Calculator as a full-featured federal employee retirement planning tool with:

- A guided, multi-step input flow with interactive sliders
- AI-powered retirement projections (FERS pension, FERS supplement, Social Security estimate, TSP drawdown)
- A 70–80% income replacement gap analysis with actionable recommendations
- Risk analysis module (FEGLI cost comparison, disability insurance gap, income protection)
- An interactive final report page
- Advisor selection dropdown on Step 1
- Login/auth page (magic link or SSO — placeholder OK for now)

## Tech Stack (preserve existing)

- Next.js (App Router) deployed on Vercel
- React with Tailwind CSS
- Vercel serverless functions for API routes
- Environment variables in Vercel for secrets (Salesforce, Anthropic, etc.)

## Step-by-Step Input Flow

### Step 0: Login / Auth Page (NEW)

Add a login screen before the calculator loads.

- Options: email magic link OR "Continue as guest"
- If logged in, pre-fill known fields from Salesforce if a matching record exists
- Returning advisor users see their client list (stretch goal — placeholder OK for MVP)

### Step 1: About You (UPDATED)

**Advisor Selection Dropdown (NEW — top of page)**
- "Who is your United Benefits advisor?" — dropdown populated from a static JSON list of advisor names (editable array in code). Default: "Not sure / Assign me one"
- Store selected advisor name with the Salesforce record

**Fields:**
- Date of Birth (date picker — replace "current age"; calculate age dynamically)
- Service Computation Date / SCD (date picker — used to calculate years of creditable service)
- Marital Status: Single / Married
- Dependents (NEW): Number of dependents (0, 1, 2, 3, 4+)
- Union Affiliation (NEW): dropdown — AFGE / NTEU / NFFE / AFSCME / None / Other
- Are you a current federal employee? Yes / No / Retired Military
- Military Service Time (NEW): "Do you have prior military service?" Yes / No — if Yes: "How many years?" (number input). Note: Military time can be credited toward FERS if a deposit is made.
- Current Annual Salary (base pay) — number input with $ formatting

### Step 2: Your Federal Benefits (UPDATED)

**FERS Coverage**
- Are you under FERS, CSRS, or FERS-RAE? (dropdown) — default FERS
- Note: CSRS employees do not receive Social Security or the FERS supplement

**TSP (Thrift Savings Plan)**
- Current TSP Balance — number input with $ formatting and slider (NEW)
- TSP Contribution: % of salary OR flat dollar amount (toggle)
- Is your TSP ROTH, Traditional, or Split? (dropdown)
- "Are you contributing at least 5% to get the full agency match?" Yes / No — if No, show inline callout: "You may be leaving free money on the table. Agency matches up to 5% automatically (1% automatic + 4% matching). Not matching = we'll add the missing match to your gap analysis."
- TSP Investment allocation: G / F / C / S / I / Lifecycle (L) funds — checkboxes (optional, used for risk note)

**FEGLI (Federal Employees Group Life Insurance)**
- Current FEGLI enrollment: Basic Only / Basic + Option A / Basic + Option B / Basic + Option C / None
- Option B multiples (if selected): 1x / 2x / 3x / 4x / 5x salary
- Show estimated current annual premium (calculated from age + salary using standard FEGLI rate tables)
- "Would you like to see a cost comparison with private term life?" Yes / No

**Health Insurance**
- FEHB enrolled? Yes / No
- HSA eligible plan? Yes / No (keep, not required)

**Leave & Earnings Statement Upload (NEW)**
- "Upload your most recent Leave & Earnings Statement (optional but improves accuracy)"
- Accept PDF or image — send to Claude via Anthropic API to extract: gross pay, YTD earnings, TSP contribution amount, FEGLI deduction, pay period
- Pre-fill relevant fields from extracted data; show "Auto-filled from your LES" label on populated fields

### Step 3: Retirement Goals (UPDATED)

- Target Retirement Age — slider from 50 to 72, show MRA (Minimum Retirement Age) callout dynamically based on birth year
- "What percentage of your current salary do you want in retirement?" — slider 50% to 100%, default 75%, with label: "Most financial planners recommend 70–80% to maintain your standard of living."
- Retirement lifestyle: "How do you see your retirement?" — Conservative (70%) / Comfortable (80%) / Active (90%) — quick-select buttons that set the slider
- Expected annual expense growth (inflation): default 2.5%, slider 1–5%
- Social Security: "Do you plan to collect Social Security?" Yes / No / CSRS (not eligible) — if Yes: estimated start age (slider: 62 / FRA / 70)

### Step 4: Your Accounts (UPDATED)

- Additional savings / investments outside TSP (optional): number input
- Monthly savings rate outside federal benefits: number input
- Spouse income in retirement (if married): number input
- Any pension from prior employment? Yes / No — if Yes: estimated monthly amount
- "Are you currently contributing to a Roth IRA or other retirement account outside TSP?" Yes / No

### Step 5: Results — Interactive Final Report (FULL REDESIGN)

This is the most important page. Replace the current static results with a full interactive dashboard.

#### Section A: Your Retirement Eligibility (calculated)

Based on DOB and SCD, calculate and display:

- **MRA (Minimum Retirement Age):** Based on birth year (use standard FERS MRA table: born 1970+ = age 57)
- **First eligible retirement date:** MRA + 30 years service, OR age 60 + 20 years, OR age 62 + 5 years — show all three scenarios that apply, highlight earliest
- **Years until eligible:** Countdown in years and months
- **Projected age at each eligibility date**

Use a visual timeline (horizontal bar or milestone cards) to show the path from today to each retirement scenario.

#### Section B: Projected Retirement Income Breakdown

Show as a stacked bar chart AND an income breakdown card:

**FERS Basic Pension**
- Formula: High-3 Average Salary × Years of Service × 1% (or 1.1% if retiring at 62+ with 20+ years)
- Projected High-3: use current salary + assumed annual raises (2% default, adjustable)
- Show monthly and annual pension amount
- Show COLA adjustment projections (1.5% / 2% / 3% scenarios toggle)

**FERS Supplement (if applicable)**
- Available from MRA until age 62 (bridge to Social Security)
- Estimated using: (Years of FERS service ÷ 40) × Estimated Social Security benefit at 62
- AI estimates projected SS benefit from salary history (use current salary as proxy with standard SS formula approximation)
- Label clearly: "The FERS Supplement ends at age 62 when Social Security begins."

**Social Security (AI-estimated)**
- Use current salary and years of service to approximate SS benefit at 62, FRA, and 70
- Call Anthropic API: pass age, salary, SCD, and ask Claude to estimate SS benefit using standard bend point formula
- Show three scenarios: Claim at 62 / Full Retirement Age / Age 70
- Note if CSRS: "CSRS employees are not eligible for the FERS Supplement or Social Security through federal service."

**TSP Drawdown**
- Assumed 4% annual withdrawal rate (industry standard safe withdrawal)
- Monthly income from TSP = (Current Balance × projected growth to retirement) × 4% ÷ 12
- Projected TSP balance at retirement: compound growth using current balance + ongoing contributions + employer match + assumed 6% annual return (adjustable slider)
- Show ROTH vs Traditional tax treatment note

#### Section C: Gap Analysis (NEW — Core Feature)

**Income Replacement Target**
- Show: "Your target retirement income: $X,XXX/month (75% of $XX,XXX salary)"
- Show: "Your projected retirement income: $X,XXX/month"
- Show: GAP = Target minus Projected (positive or negative)

**Gap Resolution Options (interactive — sliders adjust projections in real time)**

If there is a gap, show three levers with sliders:

1. **Work Longer** — slider adjusts retirement age; show how gap closes
2. **Save More** — slider increases TSP contribution %; show projected TSP balance change and income impact
3. **Lower Target** — slider adjusts income replacement % target

Each lever shows updated numbers as slider moves. Highlight the recommended combination.

**TSP Match Alert (if not maximizing match)**
- "By not contributing 5%, you are missing $X,XXX/year in free agency match. Over 20 years at 6% growth, that's $XXX,XXX."

#### Section D: Risk Analysis (NEW)

**Life Insurance: FEGLI vs. Private**
- Show current FEGLI annual cost (from age + salary calculation)
- Show estimated 20-year total cost of FEGLI vs. comparable private term policy
- Show how FEGLI premiums increase dramatically at ages 45, 50, 55, 60, 65
- Recommendation callout: "At your age, a private [X]-year term policy may be significantly cheaper. A United Benefits advisor can run a side-by-side comparison."
- Link to FEGLI calculator at opm.gov and GRB Platform

**Disability Insurance Gap (NEW)**
- "Your income is your biggest asset. Federal employees do NOT receive disability insurance through their benefits package."
- Show: Estimated career earnings remaining = current salary × years until MRA
- Show: "If you became disabled tomorrow, your family could lose up to $X,XXX,XXX in income."
- Show: FERS disability retirement estimate (if applicable) — note it is typically 60% of High-3 in year 1, 40% thereafter
- CTA: "Ask your advisor about private disability insurance options."

**Underinsured Check**
- Quick calculation: Is total death benefit (FEGLI + other) ≥ 10× income? Flag if not.

#### Section E: At Age 57 — What Your Income Could Look Like (NEW)

This section specifically addresses the pain point of showing younger employees a future snapshot.

- Show a retirement income projection card for age 57 (MRA for most born 1970+)
- Show projected salary at 57 (current salary + 2% annual raises)
- Show projected pension, supplement, TSP income at 57
- Show whether that combination hits 70–80% replacement
- If under 57 now: "You have X years until you're first eligible. Here's what your retirement could look like if you retire at your earliest opportunity."
- If over 57: "You're already eligible or approaching eligibility. Here's what retiring now vs. waiting looks like."

#### Section F: Final Report Actions

- **Download PDF Report** — generate a branded PDF summary of all sections
- **Email to advisor** — sends results to selected advisor's email (via Vercel serverless function / mailto fallback)
- **Save to my account** — if logged in, saves to user profile (local or simple DB)
- **Schedule a call** — CTA button linking to advisor calendar (Calendly or similar)

## AI Integration (Anthropic API)

Use `claude-sonnet-4-6` via the Anthropic API (`/v1/messages`) for:

1. **LES Document Parsing** — extract pay, TSP contribution, FEGLI deduction from uploaded LES PDF/image
2. **Social Security Estimation** — given age, salary, and years of service, estimate SS benefit at 62, FRA, and 70 using bend point formula logic
3. **Gap Narrative** — generate a plain-English 3-4 sentence summary of the gap analysis and top recommendations
4. **Risk Narrative** — generate a plain-English paragraph for the risk section based on age, FEGLI enrollment, and income

Store `ANTHROPIC_API_KEY` in Vercel environment variables. Call from serverless API routes (never client-side).

## Interactive Sliders — UX Requirements

Every key output variable should have a corresponding slider that updates results in real time (no page reload):

- Retirement age (50–72)
- Income replacement target (50–100%)
- TSP contribution % (0–15%)
- Expected investment return (4–10%)
- Inflation / COLA assumption (1–4%)
- Social Security start age (62 / FRA / 70 — step slider)

All sliders use React state. Charts and numbers re-render on slider change using `useMemo` for performance.

## Charts & Visualizations

Use Recharts (already available in the project):

- **Stacked bar chart**: Projected monthly income by source (Pension / Supplement / SS / TSP)
- **Line chart**: TSP balance growth over time to retirement
- **Bar chart**: FEGLI cost vs. private term over 20 years
- **Gap indicator**: Simple colored meter (red = gap, green = surplus)
- **Timeline**: Retirement eligibility milestones (SVG or CSS-based)

## Design & Branding

- Maintain existing UB logo, color palette (navy #21205f / mulberry #9c221f / gold #c9a227 / white), Playfair Display + Open Sans, and Tailwind styles
- Results page should feel like a polished client report — not a calculator output
- Use card-based layout with clear section headers
- Each section should be collapsible (accordion) so advisors can walk through it step by step with clients
- Print/PDF styles: clean single-column layout, UB branding, no interactive elements

## Environment Variables Needed (add to Vercel)

```
ANTHROPIC_API_KEY=
ADVISOR_LIST=JSON array of {name, email} objects
```

## FERS Calculation Reference (hardcode these)

**MRA Table by Birth Year:**
| Born | MRA |
|------|-----|
| Before 1948 | 55 |
| 1948 | 55 + 2 mo |
| 1949 | 55 + 4 mo |
| 1950 | 55 + 6 mo |
| 1951 | 55 + 8 mo |
| 1952 | 55 + 10 mo |
| 1953–1964 | 56 |
| 1965 | 56 + 2 mo |
| 1966 | 56 + 4 mo |
| 1967 | 56 + 6 mo |
| 1968 | 56 + 8 mo |
| 1969 | 56 + 10 mo |
| 1970+ | 57 |

**FERS Pension Formula:**
- High-3 × Years of Service × 1.0% (standard)
- High-3 × Years of Service × 1.1% (if age 62+ with 20+ years)
- High-3 = average of highest 3 consecutive years of base pay

**FERS Supplement:**
- (Years of FERS service ÷ 40) × estimated SS benefit at 62
- Paid from MRA until age 62
- Subject to earnings test ($1 reduction per $2 earned over ~$22,000/year)

**TSP Agency Match:**
- 1% automatic contribution (regardless of employee contribution)
- Dollar-for-dollar match on first 3% of salary
- 50 cents per dollar match on next 2% of salary
- Full match = 5% employee contribution → 5% agency match (4% matching + 1% auto)

## Out of Scope for This Build (flag for Phase 2)

- Salesforce CRM integration (Phase 2 — build the data model now so fields map cleanly when ready)
- Actual SSA API integration (AI estimation is the MVP approach)
- Full advisor portal / client list view (login placeholder is sufficient)
- GRB Platform API integration (link out for now)
- Mobile app version
