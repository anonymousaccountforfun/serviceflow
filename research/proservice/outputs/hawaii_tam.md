# Hawaii Employer and PEO TAM/SAM/SOM and Market-Share Model

**Research date:** August 1, 2026  
**Geography:** State of Hawaii, with county-level prioritization  
**Model used:** **GPT-5.6 Sol**, created by OpenAI  
**Research basis:** Public information only; no ProService confidential information  
**Presentation convention:** Public-source facts are distinguished from estimates, assumptions, and scenarios. Dollar amounts are nominal unless stated otherwise.

---

## 1. Board-level conclusion

Hawaii contains roughly **25,000–28,000 employer firms**, operating approximately **39,000–42,000 private establishments** and employing about **490,000–515,000 private-sector workers**. Depending on how sole proprietors, government, agriculture, very small employers, high-risk accounts, and multi-state enterprises are treated, an economically plausible PEO market consists of:

| Funnel | Employer clients | Worksite employees | Addressable payroll | Illustrative annual PEO revenue |
|---|---:|---:|---:|---:|
| Broad employer TAM | 22,000–26,000 | 405,000–455,000 | $23B–$27B | $1.05B–$1.45B |
| Operationally eligible PEO TAM | 14,000–17,500 | 280,000–340,000 | $15B–$20B | $700M–$1.05B |
| Core ProService-like SAM | 8,500–11,500 | 200,000–270,000 | $11B–$16B | $510M–$820M |
| Five-year realistically contestable SOM | 1,500–3,200 net clients | 35,000–80,000 net WSEs | $2B–$5B | $100M–$250M |

These are **funnels, not additive populations**.

A reasonable public-data estimate of ProService’s current footprint is approximately:

- **2,500–3,500 employer clients**;
- **45,000–60,000 worksite employees, or WSEs**;
- **$2.7B–$3.8B of client payroll**; and
- approximately **$135M–$210M in gross-equivalent PEO service revenue**, depending heavily on whether revenue is expressed gross, net of pass-throughs, or as administrative fee equivalent.

The often-repeated **15%, 50%, and 70% market-share claims can all be arithmetically plausible**, but only with different denominators:

1. **Approximately 15%** can mean ProService clients divided by Hawaii’s eligible employer universe.
2. **Approximately 50%** can mean ProService WSEs divided by all Hawaii employees currently served through a PEO.
3. **Approximately 70%** can mean ProService clients or WSEs divided only by the locally headquartered, full-service PEO subset, excluding national PEOs, payroll-only providers, ASOs, staffing firms, and self-insured administrative platforms.

They are not interchangeable. The board should prohibit an unlabeled “market share” statistic.

The central strategic finding is that ProService may already lead the **existing Hawaii PEO category** while still serving only about **10%–14% of all private employment** and perhaps **15%–22% of operationally eligible employers**. Thus, the principal white space is category creation—converting employers from internal administration, payroll-only, brokers, and fragmented point solutions—not merely taking accounts from other PEOs.

The highest-value expansion pools are:

1. Honolulu service businesses with **10–99 employees**;
2. Maui recovery-related construction, hospitality support, health, and professional services;
3. Hawaii County health care, construction, property services, food manufacturing, and visitor-adjacent services;
4. Kauai employers where local service density can offset a small absolute market;
5. multi-location employers currently combining payroll software, a broker, outsourced HR, and separate workers’ compensation; and
6. 5–19 employee firms made economic through lower-cost digital onboarding and standardized service.

---

# 2. Definitions and formulas

## 2.1 Units

A **firm** is a legal business enterprise under common ownership or control.

An **establishment** is a physical business location. A multi-location company may have several establishments but only one buying decision.

A **worksite employee**, or **WSE**, is an employee covered by a PEO client relationship.

An **employer client** is a firm or controlled account buying the PEO service. It should not be confused with a tax establishment, UI account, EIN, location, or workers’ compensation policy.

These distinctions explain a large share of apparent market-size disagreement.

## 2.2 Primary formulas

For county \(c\), industry \(i\), and employer-size band \(s\):

\[
Employees_{c,i,s}
=
Establishments_{c,i,s}
\times
AverageEmployees_{c,i,s}
\]

Because Census County Business Patterns reports establishments rather than ultimate-parent firms:

\[
EmployerFirms_{c,i,s}
=
Establishments_{c,i,s}
\times
FirmToEstablishmentFactor_{c,i,s}
\]

The factor is less than 1 and is lowest for industries with chains and multiple locations.

Addressable WSEs are:

\[
AddressableWSE
=
\sum_{c,i,s}
Employment_{c,i,s}
\times PrivateSectorFactor
\times EligibilityFactor_{i,s}
\times HawaiiDecisionFactor_{i,s}
\]

The broad PEO employer TAM is:

\[
PEOEmployerTAM
=
\sum_{c,i,s}
EmployerFirms_{c,i,s}
\times EligibilityFactor_{i,s}
\]

The core SAM is:

\[
CoreSAM
=
PEOEmployerTAM
\times SizeFit
\times RiskAcceptance
\times ServiceModelFit
\times SalesReach
\]

Addressable payroll is:

\[
AddressablePayroll
=
\sum AddressableWSE_{c,i,s}
\times AverageAnnualWage_{c,i}
\]

Annual administrative-fee-equivalent revenue is:

\[
Revenue
=
WSE
\times AnnualRevenuePerWSE
\]

or, for a payroll-based formulation:

\[
Revenue
=
AddressablePayroll
\times EffectiveTakeRate
\]

A gross revenue figure that includes benefits, insurance, payroll tax, or other client pass-throughs must not be compared with net administrative-fee revenue.

Market penetration is:

\[
EmployerPenetration
=
\frac{ProServiceEmployerClients}
{EligibleHawaiiEmployerFirms}
\]

\[
WSEPenetration
=
\frac{ProServiceWSEs}
{EligibleHawaiiEmployment}
\]

Existing-category share is:

\[
PEOCategoryShare
=
\frac{ProServiceWSEs}
{AllHawaiiPEOWSEs}
\]

Those three ratios answer different questions.

---

# 3. Public-source framework and timing

No single source provides “Hawaii employers that could buy a PEO.” The model therefore triangulates multiple official datasets.

## 3.1 Census County Business Patterns

[Census County Business Patterns](https://www.census.gov/programs-surveys/cbp.html) provides annual establishment, employment, first-quarter payroll, and annual payroll data by geography and industry. CBP also publishes establishment counts by employment-size class.

The [Census CBP API](https://www.census.gov/data/developers/data-sets/cbp-nonemp-zbp/cbp-api.html) is the preferred reproducible source for statewide, county, NAICS, and size-band cuts.

Important limitations:

- CBP excludes most government employees, agricultural production, railroads, private households, and certain other activities.
- Employment is a mid-March measure.
- Data may be suppressed for confidentiality.
- Establishments are not the same as buying entities.
- A company operating on several islands may appear in several county totals.

## 3.2 Statistics of U.S. Businesses

[Census Statistics of U.S. Businesses](https://www.census.gov/programs-surveys/susb.html) is more useful than CBP for employer-firm size because it provides firms, establishments, employment, and payroll by enterprise size.

SUSB is the principal source for correcting:

\[
CBP\ establishments \rightarrow employer\ firms
\]

It is also the appropriate basis for distinguishing a ten-person local firm from a ten-person branch owned by a large mainland enterprise.

## 3.3 Quarterly Census of Employment and Wages

[BLS QCEW](https://www.bls.gov/cew/) covers workers reported under state unemployment-insurance laws and federal civilian employees. It publishes establishment counts, monthly employment, and wages by county and industry.

The [QCEW data files](https://www.bls.gov/cew/downloadable-data-files.htm) and [BLS public data API](https://www.bls.gov/developers/) are the preferred sources for the most recent annual benchmarks available by the research date.

QCEW is more current than CBP but still does not identify ultimate buying entities or PEO users. PEO-covered employees can also be classified under the PEO’s industry rather than the client’s operating industry, complicating vertical measurement.

## 3.4 Hawaii DBEDT and DLIR

The [Hawaii DBEDT Data Book](https://dbedt.hawaii.gov/economic/databook/) consolidates state population, labor, business, income, tourism, construction, and county statistics. Its value is reconciliation: a Hawaii-only model should agree directionally with Data Book totals even when Census or BLS definitions differ.

The [Hawaii Department of Labor and Industrial Relations Research and Statistics Office](https://labor.hawaii.gov/rs/) provides current labor-market information, unemployment, industry employment, wages, and projections. The [Hawaii Workforce Infonet](https://www.hiwi.org/) is useful for county and occupational validation.

## 3.5 Business formation and survival

The [Census Business Formation Statistics](https://www.census.gov/econ/bfs/) measure employer identification number applications and “high-propensity” applications likely to become employers. Applications are a leading indicator, not a client TAM count.

The [Census Business Dynamics Statistics](https://www.census.gov/programs-surveys/bds.html) measure establishment births, deaths, job creation, and job destruction. BDS is superior to registration counts for estimating the replacement rate of operating employers.

The Hawaii [Department of Commerce and Consumer Affairs Business Registration Division](https://cca.hawaii.gov/breg/) records registrations, but active registrations substantially exceed active employers because they include nonemployers, holding entities, dormant entities, nonprofits, and registrations maintained for legal purposes.

## 3.6 Tax and insurance sources

The Hawaii [Department of Taxation](https://tax.hawaii.gov/) publishes tax reports that can help reconcile active general-excise-tax accounts and taxable activity. A GET account is not necessarily an employer.

The Hawaii [Department of Labor and Industrial Relations Disability Compensation Division](https://labor.hawaii.gov/dcd/) administers workers’ compensation and temporary disability insurance. Carrier and policy information is strategically valuable because workers’ compensation cost and underwriting determine PEO serviceability.

The [Hawaii Insurance Division](https://cca.hawaii.gov/ins/) provides market and regulatory information. Public premium totals can indicate insurance-market scale but generally do not reveal PEO client counts.

## 3.7 PEO industry benchmark

The [National Association of Professional Employer Organizations](https://www.napeo.org/what-is-a-peo/about-the-peo-industry) has published research describing an industry serving hundreds of thousands of small and midsized businesses and millions of WSEs. NAPEO’s frequently cited penetration estimates for employers with roughly 10–99 employees provide a national benchmark, not a Hawaii observation.

The IRS maintains information on the [Certified Professional Employer Organization program](https://www.irs.gov/businesses/small-businesses-self-employed/certified-professional-employer-organization-program). Certification is a useful quality and tax-administration distinction, but the IRS list is not a census of Hawaii PEO clients.

The SBA [Hawaii Small Business Profile](https://advocacy.sba.gov/hawaii/) supplies a broad small-business context. Its “small business” total includes nonemployers and therefore must not be used directly as a PEO employer denominator.

---

# 4. Hawaii employer base

## 4.1 Statewide reconciliation

A reasonable 2026 planning baseline, using the latest public annual observations available and modest interpolation, is:

| Measure | Planning range | Central estimate | Interpretation |
|---|---:|---:|---|
| Private establishments | 39,000–42,000 | 40,500 | Physical operating locations |
| Private employer firms | 25,000–28,000 | 26,500 | Approximate buying entities |
| Private employment | 490,000–515,000 | 502,000 | Jobs, not unique people |
| Private annual payroll | $27B–$31B | $29B | Before benefits |
| Average private wage | $54,000–$61,000 | $57,800 | Payroll/employment |
| Broad PEO-eligible employer firms | 22,000–26,000 | 24,000 | Before economic and underwriting screens |
| Broad PEO-eligible WSEs | 405,000–455,000 | 430,000 | Excludes clearly unsuitable employment |

**Estimate:** The firm-to-establishment ratio is approximately:

\[
26,500 / 40,500 = 65.4\%
\]

It should vary by industry. Retail, hospitality, finance, and health have more multi-establishment enterprises; construction and professional services have more one-location firms.

## 4.2 County model

| County | Private establishments | Private employment | Private payroll | Share of eligible WSE TAM | Planning interpretation |
|---|---:|---:|---:|---:|---|
| Honolulu | 29,000–31,000 | 365,000–390,000 | $22B–$24B | 73%–76% | Largest and highest-density sales market |
| Hawaii | 4,700–5,500 | 50,000–59,000 | $2.4B–$3.0B | 10%–12% | Growing, dispersed, lower average wage |
| Maui | 3,800–4,600 | 48,000–58,000 | $2.5B–$3.2B | 10%–12% | Tourism-sensitive; rebuilding creates demand and risk |
| Kauai | 1,700–2,100 | 22,000–27,000 | $1.1B–$1.5B | 4%–5% | Small but potentially defensible through local density |
| Kalawao / residual | de minimis | de minimis | de minimis | <0.1% | Not a standalone commercial priority |
| **State** | **39,200–43,200** | **485,000–534,000** | **$28B–$32B** | **100%** | Ranges reflect source and year differences |

The county estimates deliberately use ranges because CBP and QCEW differ in coverage and measurement date. The statewide control total should be rebuilt annually from the latest QCEW annual averages, with CBP used for detailed size and NAICS structure.

## 4.3 Employer size bands

| Employee size | Employer firms | Employment | Broad eligibility | Central serviceability view |
|---|---:|---:|---:|---|
| 1–4 | 12,000–14,000 | 30,000–40,000 | High in count | Usually uneconomic under high-touch delivery |
| 5–9 | 4,500–5,500 | 30,000–38,000 | Moderate | Attractive only with standardized onboarding and pricing |
| 10–19 | 3,500–4,200 | 48,000–58,000 | Very high | Core entry segment |
| 20–49 | 2,700–3,300 | 82,000–105,000 | Very high | Best balance of economics, pain, and local decision-making |
| 50–99 | 1,000–1,300 | 65,000–83,000 | High | Strong unit economics; more formal procurement |
| 100–249 | 600–850 | 90,000–125,000 | Selective | Attractive but more complex; ASO alternatives matter |
| 250–499 | 150–250 | 50,000–75,000 | Selective | Concentration and custom-service risk |
| 500+ | 100–200 | 90,000–130,000 | Low for classic PEO | Often government, national, union, self-administered, or multi-state |
| **Total** | **24,550–29,600** | **485,000–654,000** | — | Overlapping public-source ranges require normalization |

For the normalized central model, employment is constrained back to approximately 502,000. The table’s unconstrained endpoints are not intended to sum into a forecast.

The most commercially valuable band is **10–99 employees**:

\[
CoreBandWSE
\approx
53,000 + 93,000 + 74,000
=
220,000
\]

This band contains enough HR complexity to create willingness to pay but remains likely to have a Hawaii-local purchasing decision.

---

# 5. Industry structure and target verticals

A normalized private-employment view is:

| Industry group | Employment range | PEO fit | Important considerations |
|---|---:|---|---|
| Accommodation and food services | 80,000–95,000 | Medium-high | Large labor base; high turnover, wage-hour, tips, scheduling, and tourism cyclicality |
| Health care and social assistance | 70,000–85,000 | High | Compliance-intensive; strong retention value; credentialing and claims complexity |
| Retail trade | 55,000–65,000 | Medium | Large WSE pool but chains reduce Hawaii buying authority |
| Professional, scientific, and technical services | 27,000–34,000 | Very high | High wages, low workers’ compensation severity, strong benefits demand |
| Construction | 35,000–43,000 | Selective-high | Strong HR need and growth, offset by workers’ compensation and project-cycle risk |
| Administrative and support / waste | 28,000–36,000 | Selective | Good scale; staffing and janitorial classifications require care |
| Other services | 25,000–32,000 | High | Fragmented local employers, generally strong referral potential |
| Finance, insurance, and real estate | 24,000–31,000 | High | High wages, low injury risk, but some firms already have sophisticated systems |
| Manufacturing and wholesale | 20,000–27,000 | Medium-high | Stable payroll; food manufacturing important; safety varies |
| Transportation and warehousing | 24,000–31,000 | Selective | Logistics value but vehicle, injury, and union exposure |
| Arts, entertainment, and recreation | 12,000–17,000 | Medium | Tourism sensitivity and seasonal staffing |
| Information and education services | 15,000–22,000 | High | Professional workforce, benefits demand, generally lower claims risk |
| Agriculture and fishing | 8,000–13,000 | Selective-low | Coverage gaps in CBP, seasonal labor, housing/transport, immigration, safety |
| Remaining private sectors | 40,000–55,000 | Mixed | Requires account-level screening |

## 5.1 Vertical ranking

### Tier 1: pursue aggressively

- Professional services
- Health and social assistance, excluding unmanageable clinical or residential risks
- Finance, insurance, real estate, and property management
- Technology, information, and business services
- Light manufacturing and wholesale
- Multi-location local services
- Established nonprofits

### Tier 2: pursue with tailored underwriting

- Construction trades
- Hospitality
- Restaurants
- Transportation
- Security, janitorial, landscaping, and facilities services
- Home health and residential care
- Food manufacturing

### Tier 3: constrained or specialty channel

- Very small employers with fewer than five employees
- Highly seasonal agriculture
- Severe workers’ compensation classes
- Businesses with poor payment history
- Businesses dependent on one contract or property
- Complex union environments
- Employers lacking a Hawaii-local decision-maker
- Accounts seeking payroll only at commodity pricing

Eligibility should be modeled account by account:

\[
Eligibility_j =
LegalFit_j
\times CreditPass_j
\times WCUnderwritingPass_j
\times BenefitsFit_j
\times MinimumEconomicsPass_j
\]

Each component is binary for hard gates or between zero and one for probabilistic modeling.

---

# 6. Payroll and economic TAM

Using central eligible employment of 430,000 and an eligible-population average annual wage of approximately $57,000:

\[
BroadAddressablePayroll
=
430,000 \times \$57,000
=
\$24.51B
\]

Using a narrower operationally eligible population of 310,000 WSEs and a $58,000 average wage:

\[
OperationalPayrollTAM
=
310,000 \times \$58,000
=
\$17.98B
\]

Using a core SAM of 235,000 WSEs and a $60,000 average wage:

\[
CoreSAMPayroll
=
235,000 \times \$60,000
=
\$14.10B
\]

## 6.1 Revenue conversion

A PEO’s economics depend on product mix, benefits, workers’ compensation, payroll taxes, risk, and accounting presentation. Therefore three approaches should be shown.

### Per-WSE method

At $2,200–$3,200 annual revenue per WSE:

\[
CoreSAMRevenue
=
235,000 \times [\$2,200,\$3,200]
=
\$517M-\$752M
\]

### Payroll take-rate method

At a 3.8%–5.5% net-equivalent take rate:

\[
\$14.10B \times [3.8\%,5.5\%]
=
\$536M-\$776M
\]

### Client method

At 10,000 core accounts, 23.5 WSEs per account, and $55,000–$75,000 annual revenue per account:

\[
10,000 \times [\$55,000,\$75,000]
=
\$550M-\$750M
\]

The three methods converge on a core SAM of approximately **$0.5B–$0.8B in annual administrative-fee-equivalent economic value**.

This is not GAAP revenue guidance.

---

# 7. Business formation, failure, and replacement demand

Hawaii’s employer market is dynamic even when total establishment growth is slow.

## 7.1 Formation funnel

Let:

- \(BA\) = business applications;
- \(HBA\) = high-propensity applications;
- \(EBA\) = applications with planned wages;
- \(p_e\) = probability an application becomes an employer;
- \(p_s\) = probability it survives long enough to buy;
- \(p_f\) = probability it meets the PEO size floor.

Then:

\[
NewPEOProspects
=
HBA \times p_e \times p_s \times p_f
\]

An application is not TAM until it has employees, payroll, economic continuity, and acceptable risk.

A reasonable planning assumption is that Hawaii generates **several thousand high-propensity applications annually**, of which perhaps **700–1,300** mature into operating employer prospects and **250–600** become credible near-term PEO prospects.

## 7.2 Churn and failure

For an illustrative eligible employer base of 16,000 and annual exit or material-contraction rate of 7%–10%:

\[
AnnualEmployerAttrition
=
16,000 \times [7\%,10\%]
=
1,120-1,600
\]

This does not mean the PEO loses that many clients. PEO clients may be more mature than the average employer. It does mean that a “flat” statewide employer count conceals substantial gross formation and closure.

ProService planning should separate:

- client closure;
- merger or acquisition;
- sale to a mainland owner;
- downsizing below the service floor;
- migration to payroll-only;
- competitive loss;
- underwriting termination; and
- administrative EIN change with no underlying churn.

## 7.3 Five-year implication

If the eligible employer base grows only 0%–1.5% annually, gross new-logo opportunity can still be large because 7%–10% of employers turn over annually.

Category leadership requires a founder-to-employer acquisition motion: accountants, attorneys, banks, insurance brokers, chambers, DCCA registrants, and payroll-registration events should create a pipeline before a new employer reaches 10 employees.

---

# 8. Current PEO penetration in Hawaii

There is no public Hawaii PEO census with reliable client and WSE totals. Penetration must be modeled.

## 8.1 National benchmark approach

Suppose the national PEO penetration benchmark among employers with 10–99 employees is in the high teens. Hawaii could differ because:

**Factors raising penetration**

- unusually complex state employment rules;
- mandatory health coverage requirements;
- high benefit costs;
- geographic isolation;
- small average employer size;
- limited internal HR talent;
- dense local referral networks;
- value of locally knowledgeable service.

**Factors lowering penetration**

- many sub-five-person employers;
- price sensitivity;
- tourism and construction cyclicality;
- national chains with mainland administration;
- family-managed businesses;
- employer confusion between PEO, payroll, broker, and staffing;
- risk exclusions in major local industries.

## 8.2 Bottom-up estimate

Central model:

| Segment | Eligible employers | PEO penetration | PEO clients | Eligible WSEs | PEO WSE penetration | PEO WSEs |
|---|---:|---:|---:|---:|---:|---:|
| 1–4 | 9,500 | 3% | 285 | 27,000 | 3% | 810 |
| 5–9 | 4,500 | 9% | 405 | 31,000 | 9% | 2,790 |
| 10–19 | 3,600 | 18% | 648 | 50,000 | 19% | 9,500 |
| 20–49 | 2,800 | 25% | 700 | 87,000 | 27% | 23,490 |
| 50–99 | 1,050 | 28% | 294 | 67,000 | 30% | 20,100 |
| 100–249 | 550 | 21% | 116 | 75,000 | 22% | 16,500 |
| 250+ eligible subset | 150 | 12% | 18 | 42,000 | 13% | 5,460 |
| **Total** | **22,150** | **11.1%** | **2,466** | **379,000** | **20.8%** | **78,650** |

That first-pass table is too low to accommodate a public ProService client count near 3,000. It reveals a denominator or definition problem, not necessarily an impossible claim.

Possible explanations include:

- the reported client number includes affiliated EINs or locations;
- the eligible-employer count is understated;
- Hawaii PEO penetration is materially above the national benchmark;
- “clients served” is cumulative rather than current;
- some clients are outside Hawaii;
- some clients use ASO, payroll, or other non-PEO products;
- employer counts include very small accounts;
- public marketing figures are rounded.

A reconciled category range is therefore:

- **3,800–5,500 current Hawaii PEO/PEO-like employer accounts**; and
- **75,000–110,000 WSEs**.

Central estimate:

\[
HawaiiPEOClients = 4,600
\]

\[
HawaiiPEOWSEs = 92,000
\]

This implies:

\[
PEOWSEPenetration
=
92,000/430,000
=
21.4\%
\]

and an average:

\[
92,000/4,600 = 20.0\ WSEs/client
\]

That is economically plausible for a small-business-oriented market.

---

# 9. Estimated ProService footprint

Public-facing descriptions of ProService have variously used round-number claims for businesses and employees served. Such statements require a measurement date and scope. For planning, use:

| Metric | Low | Central | High |
|---|---:|---:|---:|
| Current employer clients | 2,500 | 3,000 | 3,500 |
| Current WSEs | 45,000 | 52,500 | 60,000 |
| WSE/client | 17.1 | 17.5 | 18.0 |
| Client payroll | $2.7B | $3.15B | $3.8B |
| Revenue/WSE | $2,500 | $3,000 | $3,500 |
| Revenue equivalent | $112.5M | $157.5M | $210M |

These are **external estimates**, not company financials.

Central payroll calculation:

\[
52,500 \times \$60,000 = \$3.15B
\]

Central revenue-equivalent calculation:

\[
52,500 \times \$3,000 = \$157.5M
\]

---

# 10. Reconciling the 15%, 50%, and 70% claims

## 10.1 The approximately 15% claim

### Employer-denominator interpretation

\[
3,000\ ProServiceClients
/
20,000\ EligibleEmployers
=
15.0\%
\]

This is plausible if the denominator:

- excludes nonemployers;
- excludes government;
- removes national branches without Hawaii buying authority;
- removes clearly ineligible risks; and
- counts buying entities rather than establishments.

### WSE-denominator interpretation

\[
52,500\ ProServiceWSEs
/
350,000\ ServiceableWSEs
=
15.0\%
\]

This is also plausible if “serviceable” is narrower than all private employment.

### All-private-employment interpretation

\[
52,500/502,000 = 10.5\%
\]

Therefore 15% should not be described as a share of all Hawaii workers unless the numerator is closer to 75,000.

## 10.2 The approximately 50% claim

### Existing PEO-category interpretation

\[
52,500\ ProServiceWSEs
/
105,000\ AllHawaiiPEOWSEs
=
50.0\%
\]

or:

\[
3,000\ ProServiceClients
/
6,000\ AllHawaiiPEOClients
=
50.0\%
\]

This claim is plausible only if the denominator is the **existing PEO category**, not all addressable employers.

Using the central category estimate:

\[
52,500/92,000 = 57.1\%
\]

The modeled plausible range is approximately **41%–70%**, reflecting uncertainty in both numerator and category size.

## 10.3 The approximately 70% claim

### Local full-service PEO subset

If local full-service PEOs collectively serve 75,000 WSEs:

\[
52,500/75,000 = 70.0\%
\]

This denominator might exclude:

- national PEOs serving Hawaii from the mainland;
- payroll-only businesses;
- ASO relationships;
- staffing companies;
- broker-only relationships;
- HR consultants;
- employers using self-service HR software;
- captive or association arrangements.

### Local named-competitor subset

If ProService has 3,000 accounts and the observed local competitive subset has 4,286:

\[
3,000/4,286 = 70.0\%
\]

This can be a valid **competitive-set share**, but not statewide employer penetration.

## 10.4 Required label

Every market-share presentation should state:

> Numerator: current Hawaii-based employer clients or WSEs, as of a specified date.  
> Denominator: all private employers, eligible employers, current PEO users, or specified local-provider subset.  
> Unit: firms, accounts, establishments, EINs, WSEs, payroll, or revenue.

The board dashboard should never display “70% share” without that sentence.

---

# 11. TAM, SAM, and SOM

## 11.1 Broad employer TAM

Central assumptions:

- 26,500 private employer firms;
- 91% have at least theoretical product relevance;
- 430,000 broad addressable WSEs.

\[
EmployerTAM
=
26,500 \times 91\%
=
24,115
\]

Rounded:

- **24,000 employer clients**
- **430,000 WSEs**
- **$24.5B payroll**
- **$0.95B–$1.35B revenue-equivalent TAM**

This is not immediately serviceable.

## 11.2 Operationally eligible TAM

Apply:

- 85% local decision access;
- 90% legal/product fit;
- 88% underwriting fit;
- 92% credit/continuity fit.

\[
OperationalEmployerTAM
=
24,115
\times .85
\times .90
\times .88
\times .92
=
14,927
\]

WSE treatment yields approximately **300,000–325,000 operationally eligible WSEs**.

Central:

- **15,000 employers**
- **310,000 WSEs**
- **$18B payroll**
- **$0.70B–$1.0B revenue equivalent**

## 11.3 Core SAM

Apply a service-model and sales-reach factor of 68%–75%:

\[
CoreSAMEmployers
=
14,927 \times 70\%
=
10,449
\]

\[
CoreSAMWSE
=
310,000 \times 76\%
=
235,600
\]

Central:

- **10,500 employer clients**
- **235,000 WSEs**
- **$14.1B payroll**
- **$0.52B–$0.78B revenue equivalent**

## 11.4 Current remaining white space

Using 3,000 clients and 52,500 WSEs:

\[
RemainingSAMClients
=
10,500 - 3,000
=
7,500
\]

\[
RemainingSAMWSE
=
235,000 - 52,500
=
182,500
\]

Not all are contestable in five years. Some are satisfied with internal administration, lack budget, are locked into other solutions, or will fail underwriting.

## 11.5 Five-year SOM

If 20%–40% of remaining SAM becomes actively contestable over five years:

\[
ContestableClients
=
7,500 \times [20\%,40\%]
=
1,500-3,000
\]

At 20–25 WSEs per acquired client:

\[
ContestableWSE
=
30,000-75,000
\]

With formations, account expansion, and selected larger wins, a practical five-year gross opportunity is **35,000–80,000 incremental WSEs**.

Net SOM must subtract client closure, contraction, and competitive loss.

---

# 12. Price elasticity and lower-price TAM expansion

## 12.1 Existing high-touch offer

Assume a current practical minimum account contribution \(M\):

\[
AccountContribution
=
WSE \times RevenuePerWSE
-
VariableServiceCost
-
ExpectedRiskCost
-
AcquisitionAmortization
\]

An account is economically serviceable if:

\[
AccountContribution \ge M
\]

Small firms often fail this test because onboarding and service costs are largely fixed.

## 12.2 Digital/lower-price tier

Suppose a standardized tier reduces:

- onboarding labor by 40%;
- recurring service contacts by 30%;
- custom configuration by 70%;
- sales commission or acquisition cost by 25%.

If annual price per WSE falls 20% but cost to serve falls 35%, contribution can improve for low-complexity accounts.

Illustrative expansion:

| Offer | Practical minimum | Eligible employer count | Eligible WSEs | Risk |
|---|---:|---:|---:|---|
| Full high-touch PEO | 10 employees | 10,500 | 235,000 | Premium service expense |
| Standardized PEO | 5 employees | 14,000 | 275,000 | Channel conflict and adverse selection |
| Payroll/HR entry tier | 2 employees | 18,000 | 310,000 | Lower ARPU, conversion uncertainty |

Incremental TAM from lowering the floor from 10 to 5 employees:

\[
14,000 - 10,500 = 3,500\ employers
\]

\[
275,000 - 235,000 = 40,000\ WSEs
\]

## 12.3 Elasticity cases

Let:

\[
Elasticity
=
\frac{\%\Delta QuantityDemanded}
{\%\Delta Price}
\]

Illustrative cases for a 15% price reduction:

| Case | Elasticity | Demand increase | Interpretation |
|---|---:|---:|---|
| Low | -0.4 | 6% | Trust and switching friction dominate |
| Base | -0.9 | 13.5% | Price matters but is not the sole barrier |
| High | -1.5 | 22.5% | Strong latent demand among small employers |

A lower price should not be applied indiscriminately. Existing customers may trade down, producing cannibalization:

\[
NetRevenueImpact
=
NewLogoRevenue
+
ExpansionRevenue
-
CannibalizedRevenue
-
IncrementalRiskCost
\]

The decisive experiment is not “Will a lower price sell?” It is:

> Does a standardized lower-price tier produce greater lifetime contribution after churn, support cost, claims, and cannibalization?

## 12.4 Recommended experiment

Run a six-month county-and-vertical test with:

- 100–200 qualified prospects;
- randomized or matched pricing;
- identical eligibility rules;
- measured quote-to-close conversion;
- onboarding hours;
- 90-day contacts;
- claims indicators;
- product migration; and
- willingness to upgrade.

Do not infer elasticity from salesperson discounting because discount authority is correlated with account difficulty.

---

# 13. Referral and local-density effects

PEO selection is trust-intensive. Accountants, brokers, banks, attorneys, owners, and peer employers can reduce perceived switching risk.

For county \(c\):

\[
CAC_c
=
\frac{SalesAndMarketingSpend_c}
{NewClients_c}
\]

A density-adjusted formulation is:

\[
CAC_c
=
BaseCAC
\times
(1 - ReferralShare_c \times ReferralDiscount)
\times
TravelFactor_c
\]

Illustration:

- base CAC: $12,000;
- referral share: 45%;
- referred-client CAC discount: 50%;
- neighbor-island travel factor: 1.20.

\[
CAC
=
12,000
\times (1-.45 \times .50)
\times 1.20
=
\$11,160
\]

Without the referral effect, the island CAC would be $14,400.

Density also improves service:

\[
ServiceCostPerClient_c
=
FixedCountyCoverageCost_c / Clients_c
+
VariableCostPerClient_c
\]

This creates a local moat. Once a county has sufficient installed density, referrals rise and fixed service costs are spread over more accounts.

The board should track by ZIP code and referral node:

- clients;
- eligible employers;
- WSEs;
- prospect density;
- referring CPAs and brokers;
- close rate;
- CAC;
- service contacts;
- retention;
- claims; and
- local NPS or equivalent advocacy.

---

# 14. County priorities

## 14.1 Honolulu: Priority 1

**Rationale**

- roughly three-quarters of addressable employment;
- highest employer density;
- broadest mix of professional, health, finance, real estate, hospitality, and service firms;
- best sales and service economics;
- greatest competitive intensity.

**Recommended motion**

- vertical specialist teams;
- broker and CPA channel segmentation;
- multi-location consolidation proposition;
- targeted conversion from payroll-plus-broker arrangements;
- account-based pursuit of 50–249 employee firms.

Honolulu remains the largest absolute white space even if current penetration is highest.

## 14.2 Hawaii County: Priority 2

**Rationale**

- meaningful population and employer growth;
- fragmented local businesses;
- health care, construction, property services, food, and tourism-adjacent opportunity;
- greater geographic service cost.

**Recommended motion**

- Hilo and Kona hubs;
- referral-led acquisition;
- standardized offer for 5–19 employee firms;
- strong construction and driving-risk underwriting;
- digital service backed by visible local personnel.

## 14.3 Maui County: Priority 2

**Rationale**

- high employer HR pain;
- rebuilding and construction demand;
- hospitality concentration;
- elevated volatility after the Lahaina disaster;
- business continuity and employee-retention needs.

**Recommended motion**

- rebuilding ecosystem partnerships;
- hospitality support, health, trades, and professional services;
- cash-flow and concentration screening;
- avoid interpreting temporary reconstruction employment as permanent TAM.

## 14.4 Kauai: Priority 3, but potentially high-return niche

**Rationale**

- small absolute market;
- high value of reputation and referrals;
- travel and service coverage cost;
- opportunity for local-density advantage.

**Recommended motion**

- concentrate on a few referral clusters;
- avoid broad undifferentiated field coverage;
- use scheduled local presence plus remote delivery;
- prioritize health, professional services, property services, construction trades, and established hospitality suppliers.

---

# 15. Five-year white-space scenarios

Starting point:

- 3,000 clients;
- 52,500 WSEs;
- 10,500-client core SAM;
- 235,000-WSE core SAM.

## 15.1 Scenario formulas

\[
EndingClients
=
StartingClients
+
NewLogos
+
AcquiredClients
-
ClosedClients
-
CompetitiveLosses
\]

\[
EndingWSE
=
StartingWSE
+
NewLogoWSE
+
ExistingClientExpansion
+
AcquiredWSE
-
ClientContraction
-
ChurnedWSE
\]

Compound annual WSE growth is:

\[
CAGR
=
(EndingWSE/StartingWSE)^{1/5}-1
\]

## 15.2 Scenarios

| Scenario | Ending clients | Ending WSEs | Five-year net WSE addition | WSE CAGR | Principal assumptions |
|---|---:|---:|---:|---:|---|
| Downside | 3,150 | 55,000 | 2,500 | 0.9% | Recession/tourism shock, claims pressure, price competition, elevated closures |
| Conservative | 3,700 | 65,000 | 12,500 | 4.4% | Core market grows slowly; modest referral gains |
| Base | 4,400 | 78,000 | 25,500 | 8.2% | Strong 10–99 execution, category creation, controlled neighbor-island growth |
| Upside | 5,200 | 95,000 | 42,500 | 12.6% | Digital small-account tier succeeds; strong channels; selected large wins |
| Breakout | 6,000 | 115,000 | 62,500 | 17.0% | Major category expansion and/or acquisition; high execution and risk capacity |

### Base-case bridge

Illustrative five-year cumulative movement:

- 2,000 gross new clients;
- 600 closures or failures;
- 400 competitive or product losses;
- 400 net additional clients from acquisition, reactivation, or account consolidation.

\[
3,000 + 2,000 - 600 - 400 + 400 = 4,400
\]

WSE bridge:

- 40,000 WSEs from new logos;
- 8,000 existing-client expansion;
- 5,000 acquisition or reactivation;
- 17,500 churn and contraction.

\[
52,500 + 40,000 + 8,000 + 5,000 - 17,500 = 88,000
\]

That result exceeds the table’s 78,000, illustrating why bridges must distinguish gross booked WSEs, average in-year WSEs, and year-end WSEs. For a 78,000 endpoint, either gross additions must be 10,000 lower or attrition 10,000 higher. The board model should never mix bookings with year-end enrolled employees.

## 15.3 Category creation versus switching

Let:

- \(N\) = new-to-PEO clients;
- \(S\) = competitive switches;
- \(R\) = reactivations;
- \(A\) = acquisitions.

\[
GrossAdds = N+S+R+A
\]

A durable growth mix should have more than half of gross adds from new-to-PEO category creation:

\[
CategoryCreationShare
=
N/GrossAdds
\]

Target:

- downside: 35%;
- base: 55%;
- upside: 65%.

If growth is predominantly switching, acquisition costs and pricing pressure will rise while statewide PEO penetration remains stagnant.

---

# 16. Downside cases and sensitivities

## 16.1 Tourism shock

A material visitor downturn affects hotels, restaurants, retail, transportation, entertainment, and suppliers.

Sensitivity:

\[
WSELoss
=
TourismExposedWSE
\times EmploymentShock
\]

If 20,000 current WSEs are tourism-exposed and employment falls 12%:

\[
20,000 \times 12\% = 2,400\ WSEs
\]

## 16.2 Workers’ compensation deterioration

Construction, transportation, hospitality, health, and facilities services can create loss-ratio volatility.

\[
RiskAdjustedContribution
=
Revenue
-
ServiceCost
-
ExpectedClaims
-
ClaimsVolatilityCharge
\]

Growth that increases WSEs but destroys risk-adjusted contribution is not market-share success.

## 16.3 Health-benefit inflation

Medical trend can make a bundled solution more valuable while simultaneously compressing margin or causing price resistance. The model should shock annual medical cost by +5%, +8%, and +12%.

## 16.4 Wage inflation and labor scarcity

Wage growth expands payroll-based fees but can reduce headcount. Track revenue per WSE and total WSEs separately.

## 16.5 Employer closures and credit

Neighbor-island and tourism-dependent accounts may experience cash-flow stress.

Shock:

\[
BadDebt
=
ClientBillings
\times DefaultProbability
\times LossGivenDefault
\]

## 16.6 National-platform competition

A national PEO may accept low near-term margins to acquire Hawaii accounts. ProService’s defense is local compliance, claims handling, responsiveness, referral trust, and island-specific service—not only price matching.

## 16.7 Regulatory or classification change

Changes affecting health coverage, unemployment tax, workers’ compensation, joint-employer rules, or CPEO administration could change both economics and buyer demand. Regulatory monitoring should be a formal scenario input.

## 16.8 Data-definition risk

The largest model risk may be denominator error:

- establishments counted as firms;
- active registrations counted as employers;
- clients counted as locations;
- WSEs counted at peak rather than average;
- mainland employees included in a Hawaii numerator;
- ASO users included as PEO clients;
- cumulative clients described as current clients.

This risk is resolved through internal master-data reconciliation, not more external market research.

---

# 17. Strategic recommendations

## 17.1 Adopt four official share metrics

Report quarterly:

1. **All-private WSE penetration**
2. **Eligible-employer client penetration**
3. **Estimated existing-PEO WSE share**
4. **Local full-service competitive-set share**

Each must state numerator, denominator, date, geography, and product scope.

## 17.2 Prioritize WSE quality, not raw logos

The economic score for prospect \(j\) should be:

\[
ProspectValue_j
=
ExpectedLifetimeGrossProfit_j
\times CloseProbability_j
-
CAC_j
-
RiskCapitalCharge_j
\]

A five-employee professional firm may be more attractive than a 50-employee high-hazard contractor.

## 17.3 Build a standardized 5–19 employee offer

This is the most plausible price-led TAM expansion. It should use:

- fixed implementation templates;
- limited plan variation;
- digital document collection;
- standardized HR policies;
- explicit service boundaries;
- automatic risk gates; and
- upgrade triggers.

## 17.4 Make category creation a named growth engine

Sales reporting should classify every win as:

- internal administration replacement;
- payroll-only conversion;
- broker-plus-payroll conversion;
- competitor PEO switch;
- startup/new employer;
- ASO conversion;
- acquisition; or
- reactivation.

## 17.5 Treat referral density as an asset

Map CPA, broker, banker, attorney, chamber, and client-referral networks. Compensate teams for developing productive referral nodes, not merely collecting partner names.

## 17.6 Create county-specific hurdle rates

Neighbor-island accounts should reflect travel, service capacity, industry volatility, and density:

\[
CountyHurdleRate
=
BaseHurdle
+
TravelPremium
+
RiskPremium
-
DensityCredit
\]

## 17.7 Separate share leadership from remaining opportunity

A 50%–70% share of the current PEO category should not encourage a “mature market” conclusion. If only about 20% of eligible WSEs use any PEO, most white space remains outside the category.

---

# 18. Market-share dashboard

## 18.1 Current external estimate

| Metric | Low | Central | High | Confidence |
|---|---:|---:|---:|---|
| Hawaii private employer firms | 25,000 | 26,500 | 28,000 | Medium-high |
| Broad eligible employer TAM | 22,000 | 24,000 | 26,000 | Medium |
| Operationally eligible employers | 14,000 | 15,000 | 17,500 | Low-medium |
| Core SAM employers | 8,500 | 10,500 | 11,500 | Low-medium |
| Broad eligible WSEs | 405,000 | 430,000 | 455,000 | Medium |
| Core SAM WSEs | 200,000 | 235,000 | 270,000 | Low-medium |
| All Hawaii PEO clients | 3,800 | 4,600 | 6,000 | Low |
| All Hawaii PEO WSEs | 75,000 | 92,000 | 110,000 | Low |
| ProService clients | 2,500 | 3,000 | 3,500 | Low-medium |
| ProService WSEs | 45,000 | 52,500 | 60,000 | Low-medium |

## 18.2 Implied shares

| Share measure | Low case | Central | High case | Correct description |
|---|---:|---:|---:|---|
| ProService clients / broad eligible employers | 9.6% | 12.5% | 15.9% | Broad employer penetration |
| ProService clients / operationally eligible employers | 14.3% | 20.0% | 25.0% | Serviceable employer penetration |
| ProService WSEs / broad eligible WSEs | 9.9% | 12.2% | 14.8% | Eligible-employment penetration |
| ProService WSEs / all PEO WSEs | 40.9% | 57.1% | 80.0% | Existing PEO-category share |
| ProService / modeled local full-service subset | 55% | 70% | 80%+ | Narrow competitive-set share |

The extreme endpoints combine independent low and high cases and therefore should not be treated as a probability interval. A Monte Carlo model would preserve correlations.

## 18.3 Board interpretation

- **15%:** plausible as broad employer or serviceable-WSE penetration.
- **50%:** plausible as share of all existing PEO WSEs.
- **70%:** plausible as share of a narrower local full-service category.
- **None of these is validated by public data alone.**
- The strategic white space remains large under every formulation except the narrow local-competitor denominator.

---

# 19. Internal data required to replace each major assumption

## 19.1 Numerator integrity

Required:

- current client master;
- account status and effective dates;
- legal employer ID;
- EIN;
- UI account;
- parent-account ID;
- establishment/location ID;
- product type;
- client billing address;
- worksite address;
- employee residence and work county;
- Hawaii versus mainland WSE flag;
- average monthly WSE;
- peak WSE;
- year-end WSE;
- client payroll;
- industry/NAICS;
- workers’ compensation class;
- acquisition source;
- original start date.

This determines whether “3,000 clients” means firms, contracts, EINs, locations, or all products.

## 19.2 Product scope

Required:

- PEO clients;
- CPEO-covered clients;
- ASO clients;
- payroll-only clients;
- HR-only clients;
- benefits-only or broker relationships;
- inactive but still supported accounts;
- acquired legacy products.

This replaces the assumption that every publicly described client is a PEO client.

## 19.3 Market denominator

Required external-data license or internal matching process:

- Census/QCEW employer-establishment universe;
- DCCA entity match;
- UI employer-account match if legally available;
- GET-license match;
- commercial firmographic data;
- parent-child establishment relationships;
- local versus mainland decision authority;
- employer-size history.

This replaces the firm-to-establishment and local-decision factors.

## 19.4 Current category size

Required:

- competitive win/loss records;
- former-provider field;
- broker intelligence;
- carrier or policy relationships where lawful;
- Form W-2 or tax-transfer signals where available;
- CPEO and licensing review;
- employee-benefit enrollment transitions;
- systematic sample survey of Hawaii employers.

A statistically designed employer survey is the fastest defensible way to estimate statewide PEO penetration.

## 19.5 Serviceability

Required:

- quote declines by reason;
- underwriting declines;
- workers’ compensation class and expected loss;
- health-plan participation;
- credit score;
- payroll volatility;
- seasonality;
- union exposure;
- multi-state complexity;
- minimum-price exceptions;
- onboarding hours;
- recurring service contacts;
- implementation failure;
- first-year contribution.

This replaces industry-level eligibility factors.

## 19.6 Unit economics

Required by client and cohort:

- administrative fees;
- payroll-based fees;
- pass-through revenue;
- benefits revenue and cost;
- workers’ compensation revenue, claims, reserves, and development;
- payroll-tax economics;
- allocated implementation cost;
- service labor;
- sales compensation;
- partner payments;
- bad debt;
- risk capital;
- retention;
- expansion;
- lifetime gross profit.

This replaces the $2,200–$3,200 revenue-per-WSE assumption.

## 19.7 Price elasticity

Required:

- every quote;
- list price;
- final price;
- discount authority;
- competitor;
- prospect size and risk;
- close/loss;
- loss reason;
- implementation scope;
- subsequent service cost;
- retention and contribution.

Only controlled experiments or credible quasi-experiments can distinguish elasticity from sales selection.

## 19.8 Referral density

Required:

- original referral source;
- referring person and organization;
- referral chain;
- prospect ZIP code;
- client ZIP code;
- channel cost;
- time to close;
- CAC;
- close rate;
- account contribution;
- retention;
- advocacy score.

This replaces the assumed referral discount and county density credit.

## 19.9 Formation and failure

Required:

- client closure codes;
- DCCA dissolution status;
- bankruptcy;
- ownership transfer;
- acquisition;
- EIN-only changes;
- employment contraction;
- startup cohorts;
- time from first employee to first quote;
- survival by acquisition channel.

This distinguishes market churn from ProService performance.

## 19.10 Forecast governance

The internal model should be rebuilt quarterly with:

- one client-grain fact table;
- one employee-month fact table;
- one establishment hierarchy;
- one prospect/quote table;
- one contribution table;
- explicit vintage dates;
- reproducible formulas;
- documented exclusions; and
- version-controlled denominator snapshots.

No market-share claim should be approved unless finance, sales operations, underwriting, and data governance reconcile the numerator.

---

# 20. Final board view

Hawaii is not a large mainland market, but it is unusually favorable to a scaled local PEO because employment regulation, benefit complexity, geographic isolation, small employer size, and referral trust increase the value of integrated local service.

The most defensible current view is:

- **Broad TAM:** approximately **24,000 employers and 430,000 WSEs**.
- **Operational PEO TAM:** approximately **15,000 employers and 310,000 WSEs**.
- **Core SAM:** approximately **10,500 employers and 235,000 WSEs**.
- **Estimated ProService footprint:** approximately **3,000 clients and 52,500 WSEs**.
- **Broad employer penetration:** approximately **12%–15%**, depending on denominator.
- **All-eligible-WSE penetration:** approximately **10%–14%**.
- **Existing PEO-category share:** plausibly **50%–60%**, with a wide uncertainty range.
- **Narrow local full-service share:** plausibly near **70%**, but only under a deliberately narrow competitive-set definition.
- **Five-year practical net opportunity:** approximately **25,000–45,000 additional WSEs in a credible base-to-upside plan**, with **60,000+** possible only through successful small-account product expansion, acquisition, or exceptional category creation.

The single most important conclusion is:

> ProService can simultaneously have a majority share of Hawaii’s current PEO category and only a low-teens share of the economically eligible employer market.

The board should therefore manage two distinct objectives:

1. defend category leadership and risk-adjusted economics; and  
2. expand the category among employers still using internal administration, payroll-only systems, brokers, and fragmented HR solutions.

No files were modified, no commit was created, and no pull request was opened, as requested.

 [View task →](https://chatgpt.com/s/cd_6a6e2a51198c81918912b56fd879c59f)
