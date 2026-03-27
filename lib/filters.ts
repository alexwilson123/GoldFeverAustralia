import type { Feature } from "geojson";
import type { AppFilters } from "@/lib/types";

function joinValues(properties: Record<string, unknown>) {
  return Object.values(properties)
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).toLowerCase())
    .join(" | ");
}

export function filterFeature(feature: Feature, filters: AppFilters) {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const haystack = joinValues(props);

  if (filters.state !== "All" && !haystack.includes(filters.state.toLowerCase())) {
    return false;
  }

  if (filters.commodity !== "all") {
    const matchesCommodity =
      filters.commodity === "gems"
        ? /(opal|sapphire|ruby|emerald|diamond|gem)/.test(haystack)
        : haystack.includes(filters.commodity);

    if (!matchesCommodity) return false;
  }

  if (filters.tenementStatus !== "all") {
    const active = /(granted|active|current|live)/.test(haystack);
    const expired = /(expired|closed|relinquished|historic)/.test(haystack);
    const pending = /(pending|application|proposed)/.test(haystack);

    if (
      (filters.tenementStatus === "active" && !active) ||
      (filters.tenementStatus === "expired" && !expired) ||
      (filters.tenementStatus === "pending" && !pending)
    ) {
      return false;
    }
  }

  if (filters.timePeriod !== "all") {
    const historical = /(historic|historical|closed|abandoned)/.test(haystack);
    const current = /(current|active|granted|operating)/.test(haystack);
    if (
      (filters.timePeriod === "historical" && !historical) ||
      (filters.timePeriod === "current" && !current)
    ) {
      return false;
    }
  }

  return true;
}
