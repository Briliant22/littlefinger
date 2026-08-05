# Littlefinger Financial Dashboard — Build Specification

## 1. Purpose

Build the **Financial Dashboard** page for Littlefinger using the same visual language as the existing Expense List and IOUs pages.

The dashboard should help the user answer these questions quickly:

1. How much did I spend during the selected period?
2. How much of that spending is actually my share after bill splitting?
3. Which categories and merchants account for most of my spending?
4. Is my spending increasing or decreasing compared with the previous period?
5. How much money do other people still owe me?
6. Which days or weeks had unusually high spending?

Do **not** add the following features or metrics:

- Income
- Payment-method breakdown
- Money the user owes other people

---

## 2. Route and Navigation

Create the dashboard at:

```text
/financial-dashboard
```

Keep the existing sidebar navigation:

- Expense List
- IOUs
- Financial Dashboard

The **Financial Dashboard** navigation item must use the active state already used elsewhere in the app:

- Pale green background
- Green icon and label
- Rounded container

---

## 3. Visual and Interaction Principles

Match the existing Littlefinger interface:

- White page background with a very subtle green radial glow near the top-center.
- Fixed left sidebar.
- Black page titles with muted gray subtitles.
- White cards with thin light-gray borders.
- Rounded corners approximately `16px`.
- Very soft card shadows.
- Green as the primary accent color.
- Red only for negative spending changes or unusually high spending.
- Monospaced or tabular numerals for currency values where practical.
- Indonesian Rupiah formatting, for example `Rp 2.456.890`.
- Generous spacing; avoid making the page feel like a dense accounting application.

Use the same typography, button size, icon style, borders, and spacing as the provided Expense List and IOUs screens.

---

## 4. Page Header

### Content

```text
Financial Dashboard
Overview of your spending, trends, and outstanding balances
```

### Header controls

Place controls on the right side of the header:

1. Period selector
   - Week
   - Month
   - Year
   - Custom
2. Previous-period button
3. Next-period button
4. Current date-range display
5. Filter button

Example:

```text
‹   Jul 1 – Jul 31, 2026   ›   [Filter]
```

### Default behavior

- Default period: `Month`
- Default range: current calendar month
- Previous and next buttons move by the selected period.
- Disable the next button when navigating beyond the current date, unless future-dated expenses are supported.

### Filter popover

The Filter button opens a popover containing:

- Custom date range
- Category multi-select
- Merchant search
- Include/exclude split expenses
- Currency selector when more than one currency exists
- Reset filters
- Apply filters

---

## 5. Dashboard Layout

Desktop layout:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Header and period controls                                          │
├───────────────┬───────────────┬───────────────┬─────────────────────┤
│ Total spent   │ My share      │ Owed to you   │ Daily average       │
├───────────────────────────────────────────────┬─────────────────────┤
│ Spending insight                              │ IOU overview        │
├───────────────────────────────────────────────┼─────────────────────┤
│ Spending trend                                │ Category breakdown  │
├───────────────────────────────────────────────┼─────────────────────┤
│ Spending calendar                             │ Top merchants       │
├───────────────────────────────────────────────┴─────────────────────┤
│ Transactions                                                           │
└─────────────────────────────────────────────────────────────────────┘
```

Recommended grid:

- Main content container: full available width with `24px–32px` page padding.
- Use a 12-column grid.
- Trend chart: 7 or 8 columns.
- Category chart: 4 or 5 columns.
- Maintain a minimum card height so rows align cleanly.

Tablet and mobile layouts must stack cards vertically.

---

## 6. Top Summary Cards

Create four summary cards.

### 6.1 Total Spent

Display the full value of all expenses in the selected period.

Example:

```text
Total spent
Rp 2.456.890
↑ 12% vs previous month
```

Calculation:

```text
totalSpent = SUM(expense.amount)
```

This value represents total transaction value, including the portions assigned to other participants in split bills.

### 6.2 My Share

Display the amount that belongs to the user after applying bill splits.

Example:

```text
My share
Rp 2.025.337
82.4% of total spending
```

Calculation rules:

- Non-split expense: include the full expense amount.
- Split expense: include only the current user's participant amount.
- Do not subtract repayments from this metric; it represents spending responsibility, not current cash movement.

Suggested formula:

```text
myShare = SUM(
  expense.isSplit
    ? currentUserParticipant.amountOwed
    : expense.amount
)
```

### 6.3 Owed to You

Display unpaid amounts assigned to other people across split bills.

Example:

```text
Owed to you
Rp 431.553
4 outstanding debts
```

Calculation:

```text
owedToYou = SUM(unpaid participant amounts excluding the current user)
```

Interaction:

- Clicking the card navigates to `/ious`.
- Preserve the current dashboard period as an optional IOU date filter.

### 6.4 Daily Average

Display average personal spending per elapsed day in the selected range.

Example:

```text
Daily average
Rp 79.255
↓ 5% vs previous month
```

Calculation:

```text
dailyAverage = myShare / numberOfElapsedDaysInSelectedRange
```

For a past completed period, use all days in the range.
For the current month, use elapsed days only.

### Summary-card comparison states

- Increase in spending: red upward indicator.
- Decrease in spending: green downward indicator.
- No meaningful change: neutral gray.
- Use absolute comparison percentages but avoid division errors when the previous period total is zero.

---

## 7. Spending Insight Card

Create a prominent card below the summary cards.

### Content

- Sparkle or insight icon
- Short headline
- Two or three sentences maximum
- Optional action link

Example:

```text
Dining increased this month
You spent 24% more on dining than last month. Most of the increase
came from three restaurant expenses during the first week.

View related expenses →
```

### Insight data

Generate insights from aggregated values only:

- Current period total
- Previous period total
- Category totals
- Category differences
- Highest-spending day
- Top merchants
- Number of transactions
- Average transaction size
- Outstanding amount owed to the user

Do not send receipt images or raw OCR data to the insight generator.

### Initial implementation

For the first version, generate deterministic rule-based insights before adding an LLM.

Possible rules:

1. Largest category increase compared with the previous period.
2. Largest category decrease.
3. Highest-spending day.
4. One merchant responsible for a large share of spending.
5. Total spending changed by more than a configured threshold.
6. Unpaid split amounts increased significantly.

### Empty state

```text
Not enough data for an insight yet
Add more expenses or choose a longer period.
```

---

## 8. Spending Trend Chart

### Visualization

Use a line chart with a very light area fill.

Display:

- Solid green line: selected period
- Dashed gray line: equivalent previous period

### Granularity

- Week view: group by day
- Month view: group by day
- Year view: group by month
- Custom range:
  - `<= 45 days`: group by day
  - `46–180 days`: group by week
  - `> 180 days`: group by month

### Controls

Add a metric selector in the chart header:

- My share
- Total bill value

Default: `My share`

### Tooltip

Example:

```text
Jul 15
My share: Rp 185.000
Previous period: Rp 120.000
3 expenses
```

### Interactions

- Hover to inspect values.
- Clicking a point or time bucket filters the Transactions section.
- Show a visible active-filter chip after clicking.
- Allow clearing the filter.

### Empty state

Render axes or a lightweight placeholder with:

```text
No spending recorded for this period
```

---

## 9. Spending by Category

### Visualization

Use a horizontal bar chart as the primary visualization.

Do not make a donut chart the only category visualization because category labels and exact comparisons are easier to read in horizontal bars.

### Each row should show

- Category icon
- Category name
- Amount
- Percentage of total personal spending
- Difference from the previous period
- Horizontal proportional bar

Example:

```text
Dining        Rp 860.911   35%   ↑ 24%
Transport     Rp 491.378   20%   ↓ 8%
Groceries     Rp 368.534   15%   —
Shopping      Rp 245.689   10%   ↑ 3%
Other         Rp 490.378   20%
```

### Sorting

Default: largest amount first.

Optional sort controls:

- Amount
- Change
- Category name

### Interactions

- Clicking a category filters the Transactions section.
- Show a selected-state border or pale green background.
- Add `View all categories` when the chart initially shows only the top five.

### Category aggregation

Use the fixed category taxonomy already present in the app:

- Groceries
- Dining
- Transport
- Utilities
- Entertainment
- Shopping
- Health
- Housing
- Travel
- Subscriptions
- Other

---

## 10. IOU Overview

Create a card titled:

```text
Outstanding by person
```

Show the people who owe the user the most money.

### Row content

- Avatar or person icon
- Person name
- Outstanding amount
- Number of unpaid bills
- Horizontal progress bar relative to the highest outstanding amount

Example:

```text
Kayzaa Nuur Azuraa    Rp 165.178    1 bill
Mishel                Rp 105.125    1 bill
Dad                   Rp 80.625     1 bill
Mom                   Rp 80.625     1 bill
```

### Interactions

- Clicking a person opens or navigates to their IOU details.
- Add `View all IOUs` at the bottom.
- Only unpaid participant amounts should be included.

### Empty state

```text
No outstanding debts
Everyone has paid you back.
```

---

## 11. Spending Calendar

Create a monthly calendar heatmap card titled:

```text
Spending calendar
```

### Visualization

- Each day is a small rounded square or calendar cell.
- Cell intensity is based on `myShare` for that date.
- No-spend days remain white or very light gray.
- High-spending days use a stronger green tone.
- The currently selected day uses an outline.

### Tooltip

```text
Jul 8
8 expenses
My share: Rp 156.000
```

### Interactions

- Clicking a day filters the Transactions section.
- Provide a small legend: Low → High.

### Alternative on narrow mobile screens

Use a compact list of days with miniature bars instead of shrinking the calendar excessively.

---

## 12. Top Merchants

Create a card titled:

```text
Top merchants
```

Show up to five merchants ordered by total personal spending.

Each row:

- Merchant name
- Category
- Number of expenses
- Amount
- Small proportional bar

Example:

```text
Daring Deli                  3 expenses   Rp 310.000
Five Monkeys Burgers         2 expenses   Rp 240.000
Grab                         8 expenses   Rp 156.000
```

Interactions:

- Clicking a merchant filters the Transactions section.
- Add `View all merchants` when more than five exist.

---

## 13. Transactions Section

Use the visual style of the existing Expense List cards.

### Header

```text
Transactions
```

Tabs:

- Recent
- Largest
- Unusual
- Split bills

### Transaction row/card

Show:

- Category icon
- Merchant
- Category
- Date
- Optional notes
- Total bill amount
- My share
- Split participant count where relevant
- Paid/unpaid split state where relevant
- Overflow menu

For split expenses, use labels similar to:

```text
Total Rp 438.900
Your share Rp 136.967
3 people still owe Rp 301.933
```

### Tab behavior

#### Recent

Sort by date descending, then creation time descending.

#### Largest

Sort by `myShare` descending.

#### Unusual

Initial non-ML rule:

```text
An expense is unusual when its amount is at least:
max(category average × 2, category average + fixed threshold)
```

Also require a minimum history count before labeling an expense unusual.

#### Split bills

Show only expenses that have an attached bill split.

### Pagination

- Desktop: pagination or `Load more` after 10 rows.
- Mobile: use `Load more`.

### Interaction

- Clicking a transaction opens the existing expense details/edit flow.
- Preserve active dashboard filters when returning to the dashboard.

---

## 14. Data Definitions

### Total bill value

The full amount paid to the merchant.

```text
totalBillValue = SUM(expense.amount)
```

### My share

The amount that is ultimately the user's responsibility.

```text
myShareForExpense =
  expense has no split
    ? expense.amount
    : current user's participant amount
```

### Outstanding owed to user

```text
outstandingOwedToUser = SUM(
  participant.amountOwed
  where participant is not current user
  and participant.paid = false
)
```

### Repaid amount

This may be used internally or in IOU detail views, but it does not need a top-level dashboard card.

```text
repaidAmount = SUM(
  participant.amountOwed
  where participant is not current user
  and participant.paid = true
)
```

### Previous-period comparison

Use an immediately preceding range with the same duration.

Examples:

- Current week → previous week
- Current calendar month → previous calendar month
- Current year → previous year
- Custom 20-day range → preceding 20-day range

### Percentage change

```text
percentageChange = ((current - previous) / previous) * 100
```

Edge cases:

- If current and previous are zero, show `No change`.
- If previous is zero and current is positive, show `New spending` rather than an infinite percentage.

---

## 15. Multi-Currency Handling

Do not combine different currencies into one total unless exchange-rate conversion is implemented.

For the first version:

- If only one currency is present, show the dashboard normally.
- If multiple currencies are present, require a currency filter or display separate totals per currency.
- Never add values such as IDR and USD directly.

Possible display:

```text
IDR  Rp 2.456.890
USD  $42.50
```

---

## 16. Recommended API Endpoints

### Dashboard summary

```http
GET /api/dashboard/summary
```

Query parameters:

```text
startDate
endDate
currency
categories[]
merchant
includeSplitExpenses
```

Response example:

```json
{
  "period": {
    "start": "2026-07-01",
    "end": "2026-07-31",
    "comparisonStart": "2026-06-01",
    "comparisonEnd": "2026-06-30"
  },
  "currency": "IDR",
  "summary": {
    "totalSpent": 2456890,
    "myShare": 2025337,
    "owedToUser": 431553,
    "outstandingDebtCount": 4,
    "dailyAverage": 79255,
    "transactionCount": 19
  },
  "comparison": {
    "totalSpentPercent": 12,
    "mySharePercent": 9,
    "owedToUserPercent": 5,
    "dailyAveragePercent": -5
  }
}
```

### Spending trend

```http
GET /api/dashboard/trends
```

Response example:

```json
{
  "granularity": "day",
  "current": [
    {
      "date": "2026-07-01",
      "totalSpent": 120000,
      "myShare": 85000,
      "transactionCount": 2
    }
  ],
  "previous": [
    {
      "date": "2026-06-01",
      "totalSpent": 90000,
      "myShare": 70000,
      "transactionCount": 1
    }
  ]
}
```

### Category breakdown

```http
GET /api/dashboard/categories
```

Response example:

```json
{
  "categories": [
    {
      "categoryId": "dining",
      "name": "Dining",
      "amount": 860911,
      "percentage": 35,
      "previousAmount": 694283,
      "changePercent": 24,
      "transactionCount": 7
    }
  ]
}
```

### Outstanding IOUs

```http
GET /api/dashboard/ious
```

Response example:

```json
{
  "totalOutstanding": 431553,
  "people": [
    {
      "personId": "person_1",
      "name": "Kayzaa Nuur Azuraa",
      "amount": 165178,
      "unpaidBillCount": 1
    }
  ]
}
```

### Top merchants

```http
GET /api/dashboard/merchants
```

### Calendar aggregation

```http
GET /api/dashboard/calendar
```

### Dashboard transactions

```http
GET /api/expenses
```

Reuse the existing expense-list endpoint with dashboard filters and sort modes.

---

## 17. Suggested Frontend Components

```text
app/
└── financial-dashboard/
    └── page.tsx

components/dashboard/
├── DashboardHeader.tsx
├── DashboardPeriodSelector.tsx
├── DashboardFilterPopover.tsx
├── SummaryCard.tsx
├── SpendingInsightCard.tsx
├── SpendingTrendChart.tsx
├── CategoryBreakdownChart.tsx
├── OutstandingByPersonCard.tsx
├── SpendingCalendar.tsx
├── TopMerchantsCard.tsx
├── DashboardTransactions.tsx
├── DashboardTransactionCard.tsx
├── DashboardEmptyState.tsx
└── DashboardSkeleton.tsx
```

Suggested chart library:

- Recharts, or the chart wrapper already used by shadcn/ui.

Reuse existing components where possible:

- Sidebar
- Date picker
- Button
- Tabs
- Card
- Avatar/person icon
- Currency formatter
- Expense card or expense row
- Category icon mapping
- Loading skeleton

---

## 18. Dashboard State

Recommended URL query state:

```text
/financial-dashboard?
period=month&
start=2026-07-01&
end=2026-07-31&
currency=IDR&
category=Dining&
merchant=Grab&
transactionTab=recent
```

Store filters in the URL so that:

- Refreshing preserves the dashboard state.
- Browser back/forward navigation works.
- Filtered dashboard links can be shared later.

Client state should be limited to UI-only state such as open popovers and hovered chart points.

---

## 19. Loading, Empty, and Error States

### Loading

- Render skeletons with the same dimensions as final cards.
- Avoid replacing the entire page with one centered spinner.
- Load independent dashboard sections separately where possible.

### No expenses

```text
No expenses recorded yet
Add your first expense to start seeing spending trends.

[Add Expense]
```

### No data for selected filters

```text
No expenses match these filters
Try changing the date range, category, or merchant.

[Reset filters]
```

### Section-level API failure

Show an inline state inside the affected card:

```text
Could not load spending trend
[Try again]
```

Do not hide the rest of the dashboard when one widget fails.

---

## 20. Accessibility Requirements

- All charts must have text summaries or accessible labels.
- Do not communicate positive or negative changes using color alone.
- Buttons and chart elements must have visible focus states.
- Maintain sufficient contrast for muted text.
- Tooltips must be keyboard-accessible where the chart library allows it.
- Currency values should be announced with meaningful labels.
- Category bars and calendar cells should expose accessible names.

Example calendar-cell label:

```text
July 8, 8 expenses, total personal spending Rp 156.000
```

---

## 21. Responsive Behavior

### Desktop

- Four summary cards in one row.
- Two-column chart sections.
- Sidebar remains visible.

### Tablet

- Two summary cards per row.
- Charts may remain two-column when space allows.
- Transaction content should not overflow.

### Mobile

Order sections as follows:

1. Header and period selector
2. Total spent
3. My share
4. Owed to you
5. Daily average
6. Spending insight
7. Spending trend
8. Category breakdown
9. Outstanding by person
10. Spending calendar
11. Top merchants
12. Transactions

- Stack all cards.
- Use horizontally scrollable tabs where needed.
- Replace dense chart labels with tooltips and compact legends.
- Keep minimum touch target size of approximately `44px`.

---

## 22. Acceptance Criteria

The implementation is complete when:

1. The dashboard matches the existing Littlefinger sidebar, typography, card, button, border, spacing, and green-accent styles.
2. The user can switch between week, month, year, and custom date ranges.
3. The four summary cards display Total Spent, My Share, Owed to You, and Daily Average.
4. No income metric is displayed anywhere.
5. No payment-method visualization is displayed anywhere.
6. No metric showing money owed by the user to other people is displayed anywhere.
7. The trend chart compares the selected period with the previous equivalent period.
8. Category spending is shown as readable horizontal bars.
9. The IOU card lists outstanding amounts by person.
10. The spending calendar filters transactions when a day is selected.
11. Merchant and category selections filter the transaction section.
12. Split expenses clearly distinguish total bill value from the user's share.
13. Multiple currencies are never added together without conversion.
14. Loading, empty, and section-level error states are implemented.
15. The layout works on desktop, tablet, and mobile.
16. Charts include accessible labels or summaries.

---

## 23. Recommended Build Order

### Phase 1 — Data and basic layout

- Create dashboard route.
- Reuse sidebar and page shell.
- Implement period state and filters.
- Add dashboard summary endpoint.
- Render the four summary cards.

### Phase 2 — Core visualizations

- Implement spending trend.
- Implement category breakdown.
- Add previous-period comparison calculations.

### Phase 3 — Split-bill integration

- Implement My Share calculations.
- Implement Owed to You calculations.
- Add outstanding-by-person card.
- Link to the IOUs page.

### Phase 4 — Exploration tools

- Implement spending calendar.
- Implement top merchants.
- Add cross-filtering into Transactions.

### Phase 5 — Insights and polish

- Add deterministic insight generation.
- Add skeletons, empty states, and error states.
- Improve mobile layout and accessibility.
- Add LLM-generated summaries only after aggregate calculations are reliable.

---

## 24. Explicit Non-Goals

Do not build these as part of this dashboard task:

- Income tracking or income-versus-expense charts
- Payment-method tracking or payment-method charts
- “You owe others” cards or debt views
- Bank account balances
- Investment or asset tracking
- Budget creation
- Savings goals
- Subscription detection
- Foreign-exchange conversion
- Predictive cash-flow forecasting

These can be planned separately after the expense, split-bill, and IOU dashboard is stable.