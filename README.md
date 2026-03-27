# AussieProspect AI

AussieProspect AI is a Next.js 15 application for exploring Australian government geoscience web services for gold, precious metals and gemstones. It combines live WMS/WFS discovery, interactive map overlays, drawn search areas, AI-assisted prospecting suggestions and export tools.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS 4
- Leaflet + react-leaflet + leaflet-draw
- Next.js Route Handlers as the backend proxy/cache layer
- Optional OpenAI integration for narrative refinement

## Features

- National interactive map centered on Australia
- OpenStreetMap and satellite basemaps
- Live GetCapabilities discovery for official WMS/WFS services
- WFS proxy to avoid browser CORS issues
- Layer toggles for mines, occurrences, deposits, reserves and tenements
- Commodity, time-period and tenement-status filtering
- Polygon, rectangle and circle drawing tools
- AI prospecting assistant with map overlay output
- GeoJSON, KML and PDF export
- Legal warnings and beginner-focused usage guidance
- Responsive layout with dark mode

## Official Data Sources Wired In

Confirmed capability endpoints in this starter:

- Geoscience Australia WFS: `https://services.ga.gov.au/gis/earthresource/wfs`
- Geoscience Australia WMS: `https://services.ga.gov.au/gis/earthresource/wms`
- NSW GeoScience WFS: `https://gs.geoscience.nsw.gov.au/geoserver/wfs`
- NSW GeoScience WMS: `https://gs.geoscience.nsw.gov.au/geoserver/wms`
- Queensland Geology WFS/WMS: `https://geology.information.qld.gov.au/geoserver/ows`

The catalog also includes Victoria, WA, SA, TAS and NT placeholder entries with official source portals and fallback endpoint candidates. If any of those agencies move or rename their public OGC services, update the candidate URLs in [lib/data-sources.ts](/Users/Sysop/Documents/GitHub/GoldFeverAustralia/lib/data-sources.ts).

## AI Workflow

The AI route uses a RAG-style sequence:

1. Receive a prompt and optional map-drawn search area.
2. Query selected official WFS layers inside the area.
3. Score mine, occurrence and tenement features heuristically for commodity relevance and low recent activity.
4. Optionally pass the draft analysis to OpenAI for clearer summaries and safety-aware reasoning.
5. Return both text recommendations and a GeoJSON overlay for the main map.

If `OPENAI_API_KEY` is not set, the app still works using the heuristic engine only.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
NEXT_PUBLIC_APP_URL=http://localhost:3000
CACHE_TTL_SECONDS=1800
```

## Deployment

Vercel works well for this app:

1. Push the repository to GitHub.
2. Import it into Vercel.
3. Set the environment variables in the Vercel project settings.
4. Deploy.

## Licensing And Compliance

- The application surfaces data directly from official Australian government services and keeps source URLs visible in layer metadata and feature popups.
- Each provider may apply dataset-specific attribution and reuse terms. Review the provider metadata and retain attribution before redistributing derived outputs.
- The UI includes clear notices that prospecting requires current legal checks, permissions and on-ground safety judgement.

## Production Hardening Ideas

- Persist bookmark/search history in Supabase or PlanetScale.
- Add server-side vector tile caching for large national layers.
- Add stricter spatial filtering with `INTERSECTS` or provider-specific CQL filters.
- Expand the source registry with confirmed VIC/WA/SA/TAS/NT OGC endpoints as they are validated.
- Add automated tests for capability parsing and provider endpoint health checks.
