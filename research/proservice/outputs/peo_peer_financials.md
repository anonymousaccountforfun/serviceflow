# Public-Company PEO Financial Benchmark

**Model used:** GPT-5.6 Sol, created by OpenAI.  
**Requested research date:** August 1, 2026.

## Research-status exception

I cannot truthfully present the requested report as a **current, source-validated August 1, 2026 benchmark** because both available routes to the underlying primary sources failed during this run:

- The integrated web-research service returned **HTTP 401 Unauthorized** for every search.
- Direct retrieval from the SEC’s EDGAR API returned **HTTP 403 Forbidden at the environment’s network proxy**.

This prevents me from retrieving and validating the latest 10-Ks, 10-Qs, earnings releases, investor presentations, transcripts, market prices, and analyst estimates. Those documents are indispensable because the requested cutoff is in the future relative to the latest information reliably contained in my pretrained knowledge, and because several companies may have published fiscal 2026 results by the requested date.

Producing five-year tables, “current” outlooks, or valuation multiples from memory would risk:

1. mixing fiscal periods;
2. confusing PEO segment results with consolidated results;
3. treating average WSEs as period-end WSEs;
4. confusing gross billings with GAAP revenue;
5. using stale share prices or enterprise values;
6. inventing unavailable segment costs, cash flow, or client counts; and
7. violating the explicit instruction **“Do not fabricate missing data.”**

Accordingly, the report below provides the complete normalization architecture, diligence framework, peer conclusions supportable without invented figures, risk thresholds, and ProService implications. It deliberately marks every unverified quantitative observation as `NA` rather than manufacturing a seemingly complete dataset.

---

# 1. Executive conclusions

## 1.1 The central benchmarking issue

Public PEO companies do not report an economically uniform “revenue” line:

- **TriNet** and **Insperity** generally recognize substantial health-benefit and workers’ compensation pass-through amounts in revenue.
- **BBSI** historically emphasizes gross billings while reporting GAAP revenue on a different basis, and its workers’ compensation structure is not identical to the large national health-benefit PEOs.
- **ADP TotalSource** is disclosed inside ADP’s PEO Services segment, but many balance-sheet, cash-flow, float-income, and corporate-cost items remain consolidated.
- **Paychex PEO and Insurance Solutions** is embedded in a broader Management Solutions reporting structure, limiting clean extraction of PEO-only profitability.
- Smaller or adjacent public HCM companies are generally not full-risk PEO comparables.

Therefore:

> **Gross reported revenue is not the preferred peer-ranking metric.**

The most decision-useful hierarchy is:

1. worksite employees;
2. client count and WSEs per client;
3. professional-service or administrative revenue;
4. insurance spread or gross profit;
5. total gross profit/net service revenue;
6. recurring operating expense excluding insurance claims;
7. EBITDA or segment operating income;
8. free cash flow after capitalized software;
9. net debt excluding fiduciary/client funds;
10. enterprise value divided by gross profit, EBITDA, and free cash flow.

## 1.2 What boards should infer from the public peers

Across the peer group, the durable value drivers are:

- WSE growth rather than gross payroll growth;
- client retention and WSE retention;
- pricing per WSE;
- attach rates for benefits, retirement, HR, and insurance products;
- underwriting discipline;
- sales-representative productivity;
- service labor per client or WSE;
- scalable technology and back-office operations;
- working-capital and fiduciary-fund discipline; and
- low capital intensity apart from software investment.

A PEO can report strong revenue growth while weakening economically if the growth comes from:

- medical-cost inflation passed through to customers;
- higher client payroll;
- temporary employment growth;
- unfavorable client mix;
- acquisition accounting; or
- insurance premium increases that merely offset worsening claims.

Conversely, flat gross revenue can coexist with improving economics when the company:

- sheds poor-risk clients;
- raises administrative pricing;
- automates service work;
- improves sales productivity;
- increases WSEs per service employee; or
- reduces benefit and workers’ compensation volatility.

## 1.3 The cleanest public reference sets

The peers serve different purposes:

| Peer | Best use | Principal limitation |
|---|---|---|
| TriNet | National SMB PEO, benefit-risk economics, pricing, WSE trends | Large insurance component and periodic disclosure-definition changes |
| Insperity | Full-service PEO unit economics, sales capacity, service intensity | Substantial benefit pass-throughs and company-specific co-employment model |
| ADP TotalSource | Large-scale PEO growth, retention, national distribution | Segment cash flow, capital, and many costs are not separately disclosed |
| Paychex PEO | Cross-sell through payroll distribution; scaled SMB channel | PEO is combined with insurance and broader corporate infrastructure |
| BBSI | Regional branch economics, workers’ compensation discipline, local sales | Different benefit mix and accounting presentation; less national-health-plan comparability |
| Justworks/other private PEOs | Product positioning and technology experience | No complete public financial history |
| Paycor/Paylocity/Dayforce/UKG-type HCM vendors | Software productivity and valuation context | Not co-employment, benefit-risk, or workers’ compensation PEO comparables |

---

# 2. Evidence hierarchy and source protocol

For every quantitative value, the correct evidence priority is:

1. audited 10-K financial statements and footnotes;
2. latest 10-Q;
3. filed 8-K earnings release;
4. official investor presentation;
5. official earnings-call transcript;
6. company website or statutory filing;
7. consensus estimates from a named market-data provider;
8. secondary research only as corroboration.

Each extracted observation should carry:

- company;
- metric;
- value;
- units;
- fiscal period;
- whether average or period-end;
- GAAP/non-GAAP status;
- segment or consolidated scope;
- exact document;
- filing/publication date;
- page or section;
- stable URL; and
- any normalization adjustment.

Primary-source starting points:

- [TriNet SEC filings](https://www.sec.gov/edgar/browse/?CIK=937098&owner=exclude)
- [TriNet investor relations](https://investor.trinet.com/)
- [Insperity SEC filings](https://www.sec.gov/edgar/browse/?CIK=1000753&owner=exclude)
- [Insperity investor relations](https://ir.insperity.com/)
- [Automatic Data Processing SEC filings](https://www.sec.gov/edgar/browse/?CIK=8670&owner=exclude)
- [ADP investor relations](https://investors.adp.com/)
- [Paychex SEC filings](https://www.sec.gov/edgar/browse/?CIK=723531&owner=exclude)
- [Paychex investor relations](https://investor.paychex.com/)
- [Barrett Business Services SEC filings](https://www.sec.gov/edgar/browse/?CIK=902791&owner=exclude)
- [BBSI investor relations](https://investor.bbsi.com/)

These links identify the authoritative repositories, but I was unable to open their current contents in this run and therefore do not characterize any 2026 filing as reviewed.

---

# 3. Normalized metric dictionary

## 3.1 Scale and customer metrics

### Worksite employees

Employees of PEO clients covered by the co-employment arrangement.

Store separately:

- average paid WSEs;
- average benefit-eligible WSEs;
- period-end WSEs;
- total enrolled WSEs; and
- client employees served under non-PEO products.

Do not combine these measures without a disclosed bridge.

### Client count

The number of customer organizations receiving PEO services. A “client,” “customer,” “business client,” and “worksite employer” may not be defined identically.

### WSEs per client

\[
\text{WSE/client} =
\frac{\text{period-end WSEs}}{\text{period-end clients}}
\]

or, preferably:

\[
\text{average WSE/client} =
\frac{\text{average WSEs}}{\text{average clients}}
\]

Never divide average WSEs by period-end clients without labeling the mismatch.

### WSE growth

\[
g_{\text{WSE}} =
\frac{\text{WSE}_{t}}{\text{WSE}_{t-1}}-1
\]

Decompose into:

\[
\text{beginning WSEs}
+ \text{new-client WSEs}
+ \text{same-client hiring}
- \text{client losses}
- \text{same-client attrition}
+ \text{acquired WSEs}
\]

---

## 3.2 Billing and revenue metrics

### Gross billings

Total invoiced client payroll, payroll taxes, benefits, workers’ compensation, administrative fees, and other charges before GAAP presentation adjustments.

Gross billings should never be treated as economic revenue.

### Client payroll

Gross wages paid to WSEs. This is a useful exposure denominator but generally not PEO revenue.

### Administrative or professional-service revenue

Fees earned for HR, payroll, compliance, risk, and related service delivery, excluding benefit premiums and claims wherever disclosure permits.

### Insurance revenue

Amounts attributed to health benefits, workers’ compensation, employment practices coverage, and related insurance programs.

### Total reported revenue

The company’s GAAP top line. Depending on company accounting, this may include substantial pass-through benefit costs.

### Net service revenue

Preferred normalized measure:

\[
\text{Net service revenue}
=
\text{reported revenue}
-
\text{insurance costs}
-
\text{other identified pass-throughs}
\]

For a peer that separately reports professional-service revenue and insurance spread:

\[
\text{Net service revenue}
=
\text{professional-service revenue}
+
(\text{insurance revenue}-\text{insurance cost})
\]

This is not necessarily identical to GAAP gross profit because other service-delivery costs may be classified in cost of revenue.

---

## 3.3 Insurance and risk metrics

### Insurance cost

The sum of benefit premiums, self-insured medical and pharmacy claims, workers’ compensation claims, insurance administration, stop-loss/reinsurance, and reserve changes, to the extent disclosed.

### Insurance spread

\[
\text{Insurance spread}
=
\text{insurance revenue}
-
\text{insurance cost}
\]

### Benefit-cost ratio

\[
\text{Benefit-cost ratio}
=
\frac{\text{benefit insurance costs}}
{\text{benefit insurance revenue}}
\]

### Workers’ compensation loss ratio

\[
\text{WC loss ratio}
=
\frac{\text{incurred WC losses and loss-adjustment expense}}
{\text{WC premium-equivalent revenue}}
\]

Company-reported ratios should be retained because reconstructed denominators may differ.

### Reserve development

Changes to prior-period claim estimates. Favorable development increases current profit; adverse development reduces it.

A board-quality analysis separates:

- current accident-year economics;
- prior-year reserve development;
- changes in discount rates;
- changes in claims frequency;
- medical severity;
- wage inflation; and
- reinsurance recoveries.

---

## 3.4 Profit and expense metrics

### Gross profit

\[
\text{Gross profit} = \text{revenue} - \text{cost of revenue}
\]

Its meaning differs by peer because expense classification differs.

### Adjusted EBITDA

Use the company’s definition first, then create a standardized bridge:

\[
\begin{aligned}
\text{Standardized EBITDA}
=&\ \text{operating income}\\
&+ \text{depreciation and amortization}\\
&+ \text{permitted recurring comparability adjustments}
\end{aligned}
\]

Present stock compensation, acquisition costs, restructuring, litigation, and transformation costs separately. Repeated “one-time” adjustments should be treated as recurring in valuation.

### Operating expense

Preferred normalized recurring expense:

\[
\text{Recurring OpEx}
=
\text{total operating costs}
-
\text{insurance claims/pass-throughs}
-
\text{D\&A}
-
\text{identified nonrecurring items}
\]

Subcategories should include:

- sales and marketing;
- service delivery;
- technology and development;
- insurance/risk operations;
- general and administrative expense; and
- corporate overhead.

### EBITDA margin

Use more than one denominator:

\[
\text{EBITDA / reported revenue}
\]

\[
\text{EBITDA / net service revenue}
\]

\[
\text{EBITDA / gross profit}
\]

For PEO comparisons, EBITDA/net service revenue and EBITDA/gross profit are generally more meaningful than EBITDA/reported revenue.

---

## 3.5 Cash-flow and capital metrics

### Operating cash flow

GAAP cash from operating activities must be analyzed for:

- client-fund flows;
- payroll-tax timing;
- insurance reserve movements;
- prefunding;
- restricted cash;
- benefit-payment timing; and
- acquisition-related working capital.

### Capital expenditure

\[
\text{Capex}
=
\text{purchases of property and equipment}
+
\text{capitalized internal-use software}
\]

where separately disclosed.

### Free cash flow

\[
\text{FCF}
=
\text{operating cash flow}
-
\text{capex}
\]

A stricter owner-earnings measure should deduct capitalized software and recurring implementation investment even if classified differently.

### Cash conversion

\[
\text{FCF conversion}
=
\frac{\text{FCF}}
{\text{adjusted net income or adjusted EBITDA}}
\]

The selected denominator must be explicit.

### Float income

Interest earned on client funds, payroll-tax funds, insurance reserves, and corporate cash.

Separate:

- client-fund interest;
- insurance-reserve interest;
- corporate interest income; and
- interest expense.

Do not capitalize cyclical interest income at a software-like multiple.

### Net leverage

\[
\text{Net debt}
=
\text{debt}
-
\text{unrestricted corporate cash}
\]

Exclude client or fiduciary cash from corporate liquidity unless it is legally available to repay corporate debt.

\[
\text{Net leverage}
=
\frac{\text{net debt}}{\text{standardized EBITDA}}
\]

---

## 3.6 Unit-economics metrics

### Revenue per WSE

\[
\text{Reported revenue/WSE}
=
\frac{\text{reported revenue}}
{\text{average WSEs}}
\]

### Administrative revenue per WSE

\[
\text{Admin revenue/WSE}
=
\frac{\text{administrative revenue}}
{\text{average WSEs}}
\]

### Insurance spread per WSE

\[
\text{Insurance spread/WSE}
=
\frac{\text{insurance revenue}-\text{insurance cost}}
{\text{average benefit-enrolled WSEs}}
\]

If enrolled WSEs are unavailable, average total WSEs may be used only with an explicit limitation.

### Gross profit per WSE

\[
\text{GP/WSE}
=
\frac{\text{gross profit}}
{\text{average WSEs}}
\]

### EBITDA per WSE

\[
\text{EBITDA/WSE}
=
\frac{\text{standardized EBITDA}}
{\text{average WSEs}}
\]

### Recurring OpEx per WSE

\[
\text{OpEx/WSE}
=
\frac{\text{recurring operating expense}}
{\text{average WSEs}}
\]

### Service labor productivity

\[
\text{WSEs/service FTE}
=
\frac{\text{average WSEs}}
{\text{average service-delivery FTEs}}
\]

### Sales productivity

\[
\text{New WSEs per mature sales representative}
=
\frac{\text{new WSEs sold by mature representatives}}
{\text{average mature sales representatives}}
\]

Also track:

- bookings per representative;
- first-year gross profit per representative;
- customer-acquisition cost;
- CAC payback;
- representative ramp period;
- representative turnover; and
- percentage of representatives at quota.

---

# 4. Machine-readable five-year table

`NA` means the value was not retrievable and validated in this run. It does **not** mean zero.

| company | fiscal_year | fiscal_year_end | avg_WSE | ending_WSE | clients | WSE_per_client | gross_billings_USDm | client_payroll_USDm | reported_revenue_USDm | admin_or_professional_revenue_USDm | insurance_revenue_USDm | insurance_cost_USDm | gross_profit_or_net_service_revenue_USDm | adjusted_EBITDA_USDm | operating_expense_USDm | operating_cash_flow_USDm | capex_including_capitalized_software_USDm | float_income_USDm | debt_USDm | unrestricted_corporate_cash_USDm | acquisitions | source_status |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| TriNet | 2021 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| TriNet | 2022 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| TriNet | 2023 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| TriNet | 2024 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| TriNet | 2025 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| Insperity | 2021 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| Insperity | 2022 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| Insperity | 2023 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| Insperity | 2024 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| Insperity | 2025 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| ADP TotalSource | FY2022 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| ADP TotalSource | FY2023 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| ADP TotalSource | FY2024 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| ADP TotalSource | FY2025 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| ADP TotalSource | FY2026 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| Paychex PEO & Insurance Solutions | FY2022 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| Paychex PEO & Insurance Solutions | FY2023 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| Paychex PEO & Insurance Solutions | FY2024 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| Paychex PEO & Insurance Solutions | FY2025 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| Paychex PEO & Insurance Solutions | FY2026 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| BBSI | 2021 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| BBSI | 2022 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| BBSI | 2023 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| BBSI | 2024 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |
| BBSI | 2025 | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA | Current filing unavailable |

This table is machine-readable Markdown but intentionally not numerically populated because the figures could not be validated against current primary sources.

---

# 5. Peer-by-peer analytical framework

## 5.1 TriNet

### Strategic relevance

TriNet is one of the most direct national comparisons for:

- SMB and mid-market co-employment;
- benefit procurement;
- administrative fee pricing;
- health-insurance spread;
- workers’ compensation exposure;
- vertical-market specialization; and
- technology-enabled service delivery.

### Metrics requiring extraction

A proper TriNet series should capture:

- average WSEs;
- period-end WSEs;
- total revenue;
- professional-service revenue;
- insurance-service revenue;
- insurance costs;
- net service revenue;
- operating income;
- adjusted EBITDA;
- net income;
- operating cash flow;
- capitalized software;
- unrestricted corporate cash;
- debt;
- share repurchases;
- client retention;
- WSE retention;
- annual contract pricing;
- benefits utilization;
- large-claim incidence;
- stop-loss protection;
- reserve changes; and
- interest income.

### Interpretation

For TriNet, the economically critical bridge is:

\[
\text{professional-service revenue}
+
\text{insurance-service revenue}
-
\text{insurance-service costs}
=
\text{normalized service value}
\]

A medical premium increase can raise both insurance revenue and insurance cost without creating equivalent economic value. Accordingly:

- administrative revenue per WSE indicates fee realization;
- insurance spread per enrolled WSE indicates underwriting economics;
- net service revenue per WSE indicates combined monetization;
- EBITDA per WSE indicates operating productivity.

### Risks

Key TriNet warning signals include:

- declining WSEs despite a stable labor market;
- falling retention;
- price increases that fail to offset benefit-cost inflation;
- adverse medical claims;
- unfavorable workers’ compensation development;
- rising service expense per WSE;
- acquisition-related customer losses;
- material platform-conversion disruption; and
- repurchases masking weak organic growth.

---

## 5.2 Insperity

### Strategic relevance

Insperity is particularly valuable for benchmarking:

- service-intensive full-service PEO delivery;
- direct-sales economics;
- sales-representative hiring and maturation;
- benefit-plan utilization;
- client retention;
- WSE growth; and
- administrative gross profit per WSE.

### Required decomposition

The correct bridge is:

\[
\text{gross profit}
=
\text{PEO service fees and insurance revenue}
-
\text{benefit, workers’ compensation, payroll-tax, and other direct costs}
\]

Then:

\[
\text{adjusted EBITDA}
=
\text{gross profit}
-
\text{recurring operating expense}
+ \text{permitted adjustments}
\]

### Sales productivity

Insperity’s disclosure should be used to evaluate:

- number of business-performance advisers or equivalent sellers;
- average tenure;
- mature versus ramping representatives;
- bookings growth;
- client size;
- WSEs sold;
- sales expense;
- cancellation rate; and
- time to productivity.

A headcount increase is not itself a positive indicator. A board should require:

\[
\text{incremental annualized GP from new sales capacity}
>
\text{fully loaded sales cost}
\]

within an acceptable payback period.

### Risks

The primary risks are:

- benefit-cost volatility;
- health-plan utilization;
- large claims;
- salesforce productivity shortfalls;
- elevated seller turnover;
- wage pressure in service operations;
- customer losses after pricing changes; and
- weaker hiring within the installed client base.

---

## 5.3 ADP TotalSource

### Strategic relevance

ADP TotalSource demonstrates the strategic advantage of:

- a very large payroll installed base;
- brand trust;
- national sales coverage;
- bundled HCM capabilities;
- cross-selling;
- scalable compliance infrastructure; and
- shared corporate technology.

### Comparability limitations

ADP’s PEO Services segment is not a standalone public company. Consequently, PEO-only disclosure may omit:

- allocated corporate technology;
- treasury and float income;
- debt;
- cash;
- capital expenditure;
- stock compensation;
- shared sales costs;
- shared facilities; and
- taxes.

Segment margin may therefore not equal standalone-company EBITDA margin.

### Useful measures

Extract:

- PEO Services revenue;
- segment earnings;
- segment margin;
- average WSEs;
- retention;
- new-business bookings;
- client-employment growth;
- price realization; and
- benefit-cost trends.

Then calculate:

\[
\text{segment revenue/WSE}
\]

\[
\text{segment earnings/WSE}
\]

\[
\text{incremental segment margin}
=
\frac{\Delta \text{segment earnings}}
{\Delta \text{segment revenue}}
\]

### Strategic inference

ADP is the strongest peer for testing whether payroll distribution creates:

- lower customer-acquisition cost;
- higher trust-based conversion;
- better data integration;
- lower onboarding friction; and
- higher attach rates.

For ProService, the analogous question is whether local payroll relationships, reputation, and compliance expertise can create a defensible distribution advantage.

---

## 5.4 Paychex PEO and Insurance Solutions

### Strategic relevance

Paychex offers another distribution-led model in which PEO services can be cross-sold from a large SMB payroll and HR base.

### Comparability limitations

PEO and insurance disclosures may be combined with broader service categories, while expenses and assets may remain shared. A board should not infer PEO EBITDA by multiplying combined revenue by Paychex’s consolidated margin.

### Required analytical bridge

Extract separately where possible:

- PEO WSEs;
- PEO revenue;
- insurance-agency revenue;
- retirement revenue;
- benefit-insurance revenue;
- client-fund interest;
- Management Solutions revenue;
- segment/consolidated operating margin; and
- acquisitions.

If only combined PEO and insurance growth is reported, label it as combined and do not attribute all growth to PEO.

### Strategic inference

Paychex helps measure the value of:

- installed-base cross-sell;
- bundling;
- automated payroll-to-PEO migration;
- retirement and insurance attach;
- and broad SMB distribution.

The chief limitation is that shared infrastructure may make its apparent economics unattainable for a standalone regional PEO.

---

## 5.5 BBSI

### Strategic relevance

BBSI is especially useful for ProService because it emphasizes:

- regional density;
- branch-level relationships;
- local-market selling;
- operational consulting;
- workers’ compensation management; and
- disciplined client selection.

### Reporting issue

BBSI’s gross billings are an exposure and scale metric, not GAAP revenue. Analysis should distinguish:

\[
\text{gross billings}
\]

from:

\[
\text{GAAP revenue}
\]

and:

\[
\text{gross margin}
\]

### Required metrics

Extract:

- gross billings;
- PEO revenue;
- staffing revenue, if any;
- client count;
- WSEs;
- branches/business units;
- gross margin;
- workers’ compensation expense;
- favorable/adverse reserve development;
- operating income;
- adjusted EBITDA;
- operating cash flow;
- restricted investments;
- debt;
- dividends and repurchases; and
- new-market openings.

### Strategic inference

BBSI is likely the most relevant public reference for evaluating whether local density produces:

- better retention;
- referral-led growth;
- lower acquisition cost;
- improved risk selection;
- faster claims intervention; and
- efficient service staffing.

Its workers’ compensation exposure also makes reserve discipline central to earnings quality.

---

# 6. Retention, growth, pricing, and sales analysis

## 6.1 Retention

Separate:

- client retention;
- WSE retention;
- revenue retention;
- gross-profit retention; and
- benefit-plan retention.

Client retention can remain high while a large client loss produces poor WSE retention. Revenue retention can appear strong because medical inflation raises pricing.

Recommended formulas:

\[
\text{client retention}
=
1-\frac{\text{clients lost during period}}
{\text{beginning clients}}
\]

\[
\text{WSE retention}
=
1-\frac{\text{WSEs lost with departing clients}}
{\text{beginning WSEs}}
\]

\[
\text{GP retention}
=
\frac{\text{beginning-cohort current GP}}
{\text{beginning-cohort prior GP}}
\]

Gross-profit retention is the best economic measure because it captures losses, downsizing, price, and mix.

## 6.2 WSE growth

Decompose growth into:

1. new logos;
2. WSEs per new logo;
3. same-client hiring;
4. same-client reductions;
5. cancellations;
6. acquisitions;
7. product migrations; and
8. reporting-definition changes.

A strong peer should generally generate positive organic WSE growth across a cycle without relaxing underwriting.

## 6.3 Pricing

Track:

\[
\text{Admin price realization}
=
\frac{\Delta \text{admin revenue/WSE}}
{\text{prior admin revenue/WSE}}
\]

and:

\[
\text{insurance price adequacy}
=
\text{insurance revenue growth/WSE}
-
\text{insurance cost growth/WSE}
\]

Pricing quality is high when:

- administration fees rise without retention deterioration;
- insurance pricing matches expected claims;
- discounts decline;
- implementation fees recover onboarding cost; and
- cross-sell increases gross profit per WSE.

## 6.4 Sales productivity

The correct sales dashboard includes:

- sales FTEs;
- mature sales FTEs;
- sales turnover;
- quota attainment;
- qualified pipeline;
- close rate;
- average client WSEs;
- new WSEs sold;
- gross profit booked;
- acquisition cost;
- ramp time;
- first-year retention; and
- loss ratio of newly sold cohorts.

Sales quality must be risk-adjusted. A seller who books high-risk workers’ compensation clients at inadequate pricing may appear productive before later claims emerge.

---

# 7. Insurance and benefit-risk trends

## 7.1 Health benefits

Monitor:

- medical and pharmacy cost trend;
- inpatient and outpatient utilization;
- specialty-drug cost;
- large claims;
- stop-loss attachment points;
- provider-network pricing;
- geographic mix;
- employee contribution changes;
- plan migration;
- demographic mix; and
- reserve adequacy.

The key prospective measure is expected insurance spread per enrolled WSE after stop-loss cost.

## 7.2 Workers’ compensation

Monitor:

- claim frequency;
- claim severity;
- payroll exposure;
- industry code;
- geographic mix;
- open claims;
- average claim duration;
- litigation;
- medical inflation;
- indemnity inflation;
- reserve development;
- discount rates;
- carrier/reinsurance structure; and
- collateral requirements.

## 7.3 Earnings-quality adjustment

Reported insurance spread should be normalized:

\[
\begin{aligned}
\text{Normalized insurance spread}
=&\ \text{reported spread}\\
&- \text{favorable prior-year reserve development}\\
&+ \text{adverse prior-year reserve development}\\
&- \text{unusually favorable frequency}\\
&+ \text{normalized large-claim allowance}
\end{aligned}
\]

This is essential when valuing a PEO on EBITDA.

---

# 8. Peer risk thresholds and warning indicators

These are proposed board thresholds, not asserted historical peer averages.

| Metric | Green | Watch | Red |
|---|---:|---:|---:|
| Organic WSE growth | >5% | 0–5% | <0% |
| Client retention | >90% | 85–90% | <85% |
| WSE retention | >88% | 82–88% | <82% |
| Gross-profit retention | >95% | 90–95% | <90% |
| Admin revenue/WSE growth | ≥ wage inflation | 0 to wage inflation | negative |
| Insurance spread variance to plan | within ±5% | ±5–10% | worse than −10% |
| Adverse reserve development / EBITDA | <3% | 3–7% | >7% |
| Recurring OpEx/WSE growth | below GP/WSE growth | approximately equal | materially above |
| Mature-sales-rep productivity | stable or rising | down <10% | down >10% |
| Sales-rep annual turnover | <20% | 20–30% | >30% |
| CAC payback | <18 months | 18–30 months | >30 months |
| FCF/adjusted EBITDA | >70% | 50–70% | <50% |
| Net leverage | <1.5× | 1.5–2.5× | >2.5× |
| Capitalized software / EBITDA | <10% | 10–20% | >20% |
| Largest client / GP | <5% | 5–10% | >10% |
| Top industry / WSEs | <20% | 20–30% | >30% |

Additional red flags:

- unexplained metric-definition changes;
- heavy reliance on “adjusted” earnings;
- recurring restructuring exclusions;
- rising restricted cash or insurance collateral;
- EBITDA growth without operating cash-flow growth;
- growth driven by medical inflation;
- declining gross profit per WSE;
- strong bookings paired with deteriorating retention;
- client-fund cash presented as corporate liquidity;
- elevated software capitalization;
- reserve releases supporting earnings targets;
- acquisitions without organic-growth disclosure; and
- share repurchases financed by rising leverage.

---

# 9. Outlook and valuation methodology

## 9.1 Current outlook

A current August 1, 2026 outlook cannot be responsibly supplied without the latest earnings releases and guidance. The required table should include:

| company | guidance publication date | revenue growth | WSE growth | gross profit growth | adjusted EBITDA | EPS | insurance-cost assumption | interest-income assumption | capex | key caveat |
|---|---|---:|---:|---:|---:|---:|---|---|---:|---|
| TriNet | NA | NA | NA | NA | NA | NA | NA | NA | NA | Source unavailable |
| Insperity | NA | NA | NA | NA | NA | NA | NA | NA | NA | Source unavailable |
| ADP TotalSource | NA | NA | NA | NA | NA | NA | NA | NA | NA | Source unavailable |
| Paychex PEO | NA | NA | NA | NA | NA | NA | NA | NA | NA | Source unavailable |
| BBSI | NA | NA | NA | NA | NA | NA | NA | NA | NA | Source unavailable |

## 9.2 Valuation

Current multiples require same-day market data and the most recent balance sheet. They should be calculated as:

\[
\text{Equity value}
=
\text{undiluted shares}
\times
\text{share price}
+
\text{dilutive instruments}
\]

\[
\text{Enterprise value}
=
\text{equity value}
+
\text{debt}
+
\text{preferred stock}
+
\text{minority interest}
-
\text{unrestricted corporate cash}
\]

Exclude fiduciary client funds from cash.

Recommended multiples:

- EV / normalized net service revenue;
- EV / gross profit;
- EV / standardized EBITDA;
- EV / EBITA;
- price / normalized earnings;
- EV / unlevered free cash flow; and
- free-cash-flow yield.

Avoid EV/reported revenue as the primary PEO multiple because gross-versus-net accounting differs.

## 9.3 Valuation quality adjustments

Apply a premium for:

- sustained organic WSE growth;
- high gross-profit retention;
- stable insurance outcomes;
- strong cash conversion;
- low leverage;
- diversified clients;
- recurring administration revenue;
- scalable technology; and
- credible organic disclosure.

Apply a discount for:

- reserve volatility;
- customer concentration;
- cyclical industry exposure;
- low sales productivity;
- persistent WSE contraction;
- weak cash conversion;
- material client-fund complexity;
- aggressive capitalization;
- acquisition dependence; and
- limited segment disclosure.

---

# 10. Explicit comparability limitations

1. **Gross versus net presentation:** Reported revenue may include insurance pass-throughs for one company but not another.

2. **Fiscal calendars:** ADP and Paychex use fiscal years that do not align with calendar-year peers.

3. **Average versus ending WSEs:** Per-WSE calculations can be distorted if denominator timing differs.

4. **WSE definition:** Paid, enrolled, benefit-eligible, and period-end WSEs are not interchangeable.

5. **Client definition:** One legal entity, location, payroll account, or contract may be counted differently.

6. **Segment allocation:** ADP and Paychex PEO disclosures share corporate infrastructure.

7. **Insurance design:** Fully insured, self-insured, minimum-premium, deductible, captive, and carrier structures create different risk.

8. **Workers’ compensation:** BBSI’s workers’ compensation exposure is not directly comparable with a health-benefit-heavy national PEO.

9. **Float income:** Companies classify client-fund and corporate interest differently.

10. **Cash flow:** Payroll timing can create large period-end working-capital movements.

11. **Restricted cash:** Insurance collateral and client funds are not freely distributable.

12. **Capitalized software:** Capitalization policies can inflate current EBITDA and operating cash flow.

13. **Non-GAAP measures:** Adjusted EBITDA exclusions differ and may change over time.

14. **Acquisitions:** Acquired WSEs, revenue, and expenses can obscure organic trends.

15. **Reserve development:** Favorable prior-year development is not equivalent to recurring current-year margin.

16. **Pricing:** Higher insurance revenue per WSE may merely recover medical inflation.

17. **Business mix:** PEO, ASO, payroll, insurance agency, retirement, and staffing revenue have different economics.

18. **Standalone costs:** Segment margins may exclude costs a standalone company must bear.

19. **Market multiples:** Share prices and net debt must be measured on a common date.

20. **Geography:** Hawaii-specific regulation, labor dynamics, health-plan structure, and market concentration may make national peers directionally useful but not directly transferable to ProService.

---

# 11. Implications for ProService

## 11.1 Estimating the P&L

Build ProService’s model in economic layers rather than starting with reported revenue:

### Layer 1: WSE engine

\[
\text{Average WSEs}
=
\text{beginning WSEs}
+
\text{new sales}
-
\text{attrition}
+
\text{same-client employment change}
\]

Segment by:

- client size;
- industry;
- island/geography;
- tenure;
- benefit enrollment;
- workers’ compensation class; and
- sales channel.

### Layer 2: Administrative economics

\[
\text{Admin revenue}
=
\text{average WSEs}
\times
\text{admin revenue/WSE}
\]

Model price, discount, product attach, and client mix separately.

### Layer 3: Benefit and insurance economics

\[
\text{Insurance revenue}
=
\text{enrolled WSEs}
\times
\text{premium-equivalent revenue/enrolled WSE}
\]

\[
\text{Insurance cost}
=
\text{enrolled WSEs}
\times
\text{expected cost/enrolled WSE}
\]

\[
\text{insurance spread}
=
\text{insurance revenue}
-
\text{insurance cost}
\]

Use base, favorable, and adverse claim scenarios.

### Layer 4: Service-delivery cost

Model:

- account management;
- payroll operations;
- HR consulting;
- benefits administration;
- implementation;
- compliance;
- claims and safety;
- technology;
- finance;
- and corporate overhead.

Separate fixed, semi-variable, and WSE-variable costs.

### Layer 5: Cash flow

Adjust EBITDA for:

- software capitalization;
- capex;
- reserve funding;
- collateral;
- payroll working capital;
- taxes;
- interest;
- and acquisitions.

---

## 11.2 Unit economics

The minimum board dashboard should show:

- admin revenue/WSE;
- insurance spread/enrolled WSE;
- gross profit/WSE;
- recurring OpEx/WSE;
- EBITDA/WSE;
- cash flow/WSE;
- WSEs/client;
- WSEs/service FTE;
- gross profit/service FTE;
- new WSEs/mature seller;
- CAC/new WSE;
- CAC payback;
- client retention;
- WSE retention;
- GP retention; and
- claims variance/WSE.

Cohort reporting should compare each vintage’s:

- starting WSEs;
- retention;
- price;
- attach;
- claims;
- service demand;
- gross profit;
- CAC;
- and lifetime value.

This prevents aggregate growth from hiding poor new-business quality.

---

## 11.3 Margin quality

High-quality margin is generated by:

- recurring administrative fees;
- durable retention;
- stable attach rates;
- sustainable insurance pricing;
- service productivity;
- disciplined overhead;
- and cash conversion.

Lower-quality margin comes from:

- reserve releases;
- temporarily low claims;
- client-fund interest;
- software capitalization;
- delayed hiring;
- underinvestment in service;
- or aggressive non-GAAP exclusions.

ProService should disclose an internal “core EBITDA” bridge:

\[
\begin{aligned}
\text{Core EBITDA}
=&\ \text{reported EBITDA}\\
&- \text{favorable reserve development}\\
&- \text{above-normal float income}\\
&- \text{capitalized recurring labor}\\
&+ \text{clearly nonrecurring costs}
\end{aligned}
\]

The board should value core EBITDA, not peak insurance or interest-rate earnings.

---

## 11.4 AI productivity opportunity

The most credible AI opportunity is not indiscriminate headcount reduction. It is higher-quality throughput in repetitive, document-heavy workflows.

Priority use cases:

1. employee and manager self-service;
2. benefits-question retrieval;
3. handbook and policy drafting;
4. case classification and routing;
5. payroll anomaly detection;
6. onboarding-document extraction;
7. compliance-calendar management;
8. workers’ compensation intake;
9. claim summarization;
10. safety recommendation drafting;
11. renewal preparation;
12. client health scoring;
13. sales-call preparation;
14. proposal generation;
15. implementation-plan generation;
16. knowledge search;
17. quality assurance; and
18. service-demand forecasting.

Measure AI using:

\[
\text{WSEs/service FTE}
\]

\[
\text{cases resolved/FTE}
\]

\[
\text{first-contact resolution}
\]

\[
\text{average handling time}
\]

\[
\text{payroll corrections/1,000 WSEs}
\]

\[
\text{implementation hours/new WSE}
\]

\[
\text{gross profit/service FTE}
\]

AI benefits should enter valuation only after they appear in:

- lower recurring cost per WSE;
- greater WSE capacity without service degradation;
- faster implementation;
- improved retention;
- or higher sales conversion.

Control requirements include:

- human review of legal and HR advice;
- protection of payroll and health data;
- role-based access;
- prompt/output logging;
- source citations;
- hallucination monitoring;
- model-risk governance;
- and contractual controls over third-party models.

---

## 11.5 Exit valuation

ProService should be valued through a scenario matrix rather than a single public-company multiple.

### Bear case

Characteristics:

- low or negative organic WSE growth;
- retention pressure;
- volatile insurance results;
- high customer concentration;
- weak sales productivity;
- substantial owner dependence;
- and limited systems scalability.

Use a discount to public PEO EBITDA multiples and capitalize normalized—not peak—earnings.

### Base case

Characteristics:

- stable mid-single-digit WSE growth;
- strong retention;
- adequate insurance pricing;
- credible service productivity;
- clean cash conversion;
- and modest leverage.

Use peer EV/EBITDA and EV/gross-profit ranges, adjusted for private-company size and illiquidity.

### Premium case

Characteristics:

- durable high-single-digit organic WSE growth;
- superior retention;
- differentiated Hawaii density;
- low CAC;
- strong local brand;
- stable insurance economics;
- demonstrated AI-enabled productivity;
- diversified clients;
- and management depth.

A premium requires proof that geographic concentration is a moat rather than merely a risk.

### Recommended valuation bridge

\[
\text{Normalized EBITDA}
=
\text{LTM EBITDA}
-
\text{reserve releases}
-
\text{excess float income}
-
\text{nonrecurring favorable claims}
+
\text{documented cost normalization}
\]

Then:

\[
\text{Enterprise value}
=
\text{normalized EBITDA}
\times
\text{selected multiple}
\]

\[
\text{Equity value}
=
\text{enterprise value}
-
\text{debt}
+
\text{unrestricted corporate cash}
-
\text{insurance/collateral deficit}
\]

Cross-check with:

- EV/gross profit;
- EV/free cash flow;
- discounted cash flow;
- and precedent PEO transactions.

---

# 12. Board recommendations

1. Do not benchmark ProService on gross reported revenue margins.
2. Establish a single internal WSE definition and reconcile it monthly.
3. Report average and ending WSEs separately.
4. Build an administrative-revenue and insurance-spread bridge.
5. Separate current-year insurance performance from reserve development.
6. Calculate gross profit, EBITDA, and free cash flow per WSE.
7. Track gross-profit retention by client cohort.
8. Measure mature-seller productivity and risk-adjusted booking quality.
9. Treat client and insurance cash separately from corporate liquidity.
10. Include capitalized software in capital intensity.
11. Normalize float income before valuation.
12. Stress-test medical and workers’ compensation costs.
13. Tie AI investment to operating metrics rather than anecdotal time savings.
14. Compare BBSI for regional density and risk operations.
15. Compare TriNet and Insperity for benefit-risk and service economics.
16. Compare ADP and Paychex for distribution and cross-sell advantages.
17. Apply a standalone-cost adjustment when using ADP or Paychex margins.
18. Use a multi-metric valuation framework.
19. Discount recurring “one-time” adjustments.
20. Refresh the benchmark after obtaining the unavailable 2025–2026 primary documents.

## Checks performed

- ⚠️ `web search for current TriNet, Insperity, BBSI, Paychex, and ADP primary sources` — the integrated web-research service returned HTTP 401 Unauthorized.
- ⚠️ `Python retrieval of https://data.sec.gov/submissions/CIK##########.json` — the environment’s network proxy rejected SEC access with HTTP 403 Forbidden.
- ✅ No repository files were modified.
- ✅ No commit was created.
- ✅ No pull request was created or closed.
- ✅ No subagent was spawned or delegated work.

 [View task →](https://chatgpt.com/s/cd_6a6e2a24a1d48191bfa73410b5c3850e)
