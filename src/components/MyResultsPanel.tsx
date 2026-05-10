import ResultsView from "@/components/ResultsView";

/**
 * Mijn Peloton → Uitslagen tab.
 * Gebruikt exact dezelfde view als de hoofdpagina /uitslagen,
 * zodat ranking, data, filters, styling en componenten identiek zijn.
 */
export default function MyResultsPanel() {
  return <ResultsView showHeader={false} />;
}
