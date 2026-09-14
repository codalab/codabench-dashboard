export interface Competition {
  id: number;
  title: string;
  organizer: string;
  description: string;
  url: string;
  domains: string[];
  sectors: string[];
  conferences: string[];
  countries: string[];
}

export interface FacetCounts {
  domains: Record<string, number>;
  sectors: Record<string, number>;
  conferences: Record<string, number>;
  countries: Record<string, number>;
}

export interface StatsResponse {
  total: number;
  taggedWithDomain: number;
  linkedToConference: number;
  organizerCount: number;
  byDomain: { label: string; count: number }[];
  bySector: { label: string; count: number }[];
  byConference: { label: string; count: number }[];
  byCountry: { label: string; count: number }[];
  topOrganizers: { label: string; count: number }[];
}
