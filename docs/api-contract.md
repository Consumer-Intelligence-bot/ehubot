# Shopping & Switching Dashboard: API Contract

**Version:** 0.1 DRAFT | **Date:** February 2026 | **Status:** For review

---

## Base URL

```
/api/v1/ss
```

All endpoints return JSON. All accept `Content-Type: application/json`.

---

## 1. Shared Filter Parameters

Every data endpoint accepts these query parameters.

| Param | Type | Required | Values | Default |
|-------|------|----------|--------|---------|
| `product` | string | Yes | `motor`, `home` | — |
| `timeRange` | string | Yes | `latest`, `rolling12`, `custom` | `latest` |
| `startDate` | string | If custom | `YYYY-MM` | — |
| `endDate` | string | If custom | `YYYY-MM` | — |
| `brand` | string | No | Insurer slug, e.g. `aviva`, `direct-line` | `null` (market view) |
| `region` | string | No | `uk`, `england`, `scotland`, `wales`, `ni` | `uk` |
| `ageGroup` | string | No | `17-24`, `25-34`, `35-44`, `45-54`, `55-64`, `65+` | `all` |
| `premiumBand` | string | No | Maps to Q43a codes `1-9` | `all` |

**Notes:**
- When `brand` is null, the response contains market-level aggregates only. No insurer names leak.
- When `brand` is set, the response includes both market and insurer values for benchmarking.
- `timeRange=latest` returns the most recent survey wave.
- `region` and `ageGroup` may be extended later. The frontend should treat these as open enums.

---

## 2. Endpoints and Response Shapes

### 2.1 KPIs — `/kpis`

Returns headline metrics for any screen. The `screen` param controls which KPIs are returned.

**Request:** `GET /api/v1/ss/kpis?product=motor&timeRange=latest&brand=aviva&screen=switch-or-stay`

| Param | Type | Values |
|-------|------|--------|
| `screen` | string | `renewal`, `shop-or-stay`, `how-they-shopped`, `switch-or-stay`, `where-they-went`, `comparison` |

**Response:** See spec for full JSON shape. Key fields: `kpis[]` with `id`, `label`, `market`, `insurer`, `confidence`, `format`, `trend`.

**Confidence values:** `publishable` (n >= 50), `indicative` (n >= 30), `suppressed` (n < 30).

### 2.2 Reason Breakdowns — `/reasons`

Returns ranked reason percentages for bar charts.

**Request:** `GET /api/v1/ss/reasons?product=motor&brand=aviva&questionGroup=reasons-for-shopping`

| Param | Type | Values |
|-------|------|--------|
| `questionGroup` | string | `reasons-for-shopping` (Q8), `reasons-for-staying` (Q18), `reasons-for-not-shopping` (Q19), `reasons-for-switching` (Q31), `reasons-for-choosing` (Q33) |

### 2.3 Trend Data — `/trends`

Returns time series for line/area charts.

**Request:** `GET /api/v1/ss/trends?product=motor&brand=aviva&metric=retention_rate`

### 2.4 Flow Data (Sankey / Matrix) — `/flows`

Returns switching flows for Screen 5: Where They Went / Brand Lens.

**Request:** `GET /api/v1/ss/flows?product=motor&timeRange=latest&brand=aviva`

### 2.5 Channel and PCW Detail — `/channels`

Returns shopping channel and PCW usage for Screen 3.

**Request:** `GET /api/v1/ss/channels?product=motor&brand=aviva`

### 2.6 Comparison Table — `/comparison`

Returns all insurers side by side for the Comparison View.

**Request:** `GET /api/v1/ss/comparison?product=motor&timeRange=latest`

### 2.7 Export — `/export`

Generates a downloadable file. `POST /api/v1/ss/export` with body `{ format, screens, filters }`.

---

## 3. Governance Rules (Server-Enforced)

| Rule | Threshold | Behaviour |
|------|-----------|-----------|
| Publishable insurer metric | n >= 50 | Return value, `confidence: "publishable"` |
| Indicative insurer metric | 30 <= n < 50 | Return value, `confidence: "indicative"` |
| Below minimum | n < 30 | Return `value: null`, `confidence: "suppressed"` |
| Flow cell | n >= 10 | Return count |
| Flow cell below minimum | n < 10 | Return `suppressed: true`, no count |

---

## 4. Mock Strategy

Until the backend is built, the frontend uses `mockApi.js` which mirrors each endpoint's response shape. Switch via `VITE_USE_MOCKS=true`.
