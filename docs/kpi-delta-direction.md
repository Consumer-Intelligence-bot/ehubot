# KPI Delta Direction

Context-dependent logic for green/red arrows on KPI cards. "Up" and "Down" refer to the delta; "Green" and "Red" indicate favourable vs unfavourable.

---

## Market View (brand = null)

| Metric | Up (↑) | Down (↓) |
|--------|--------|----------|
| Shopping Rate | Red (more shopping = more churn risk) | Green |
| Switching Rate | Red (more switching = more volatility) | Green |
| Shop & Stay Rate | Amber (mixed signal) | Amber |
| PCW Usage | Red (more comparison = more churn) | Green |
| Retention Rate | Green | Red |
| Auto-renewed Rate | Green | Red |
| Price Increase Rate | Red | Green |
| Price Decrease Rate | Green | Red |

---

## Insurer View (brand selected)

| Metric | Up (↑) | Down (↓) |
|--------|--------|----------|
| Shopping Rate (my customers) | Red (my customers shopping more) | Green |
| Switching Rate (my losses) | Red (losing more customers) | Green |
| Retention Rate | Green | Red |
| Win Rate (gains) | Green | Red |
| NPS | Green | Red |
| Net Flow | Green (gaining customers) | Red |

---

## Implementation Note

When rendering the delta indicator:
- Resolve `direction` from API (`"up"` or `"down"`).
- Look up this table by `metric` + `context` (market vs insurer).
- Apply `COLORS.green` or `COLORS.red` accordingly.
