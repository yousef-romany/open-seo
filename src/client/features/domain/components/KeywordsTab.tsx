import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, CircleHelp, Download, Save, Sheet } from "lucide-react";
import {
  TableBulkActionBar,
  TableBulkActionButton,
  TableBulkExportMenu,
} from "@/client/components/table/TableBulkActionBar";
import { QueryError } from "@/client/components/QueryState";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import { TablePagination } from "@/client/components/table/TablePagination";
import { DomainPageLink } from "@/client/features/domain/components/DomainPageLink";
import { DomainKeywordsTable } from "@/client/features/domain/components/DomainKeywordsTable";
import { DomainFilterPanel } from "@/client/features/domain/components/DomainFilterPanel";
import { DomainTableToolbar } from "@/client/features/domain/components/DomainTableToolbar";
import { saveSelectedKeywords } from "@/client/features/domain/domainActions";
import {
  KEYWORD_FILTER_FIELDS,
  buildKeywordsSearchUpdate,
  countKeywordFilterConditions,
} from "@/client/features/domain/domainFilterUtils";
import { useDomainKeywordsQuery } from "@/client/features/domain/hooks/useDomainKeywordsQuery";
import { useSaveKeywordsMutation } from "@/client/features/domain/mutations";
import { useDomainKeywordFilterPreferences } from "@/client/features/domain/useDomainFilterPreferences";
import {
  EMPTY_DOMAIN_FILTERS,
  type DomainSortMode,
  type KeywordRow,
  type KeywordsFilterValues,
} from "@/client/features/domain/types";
import { keywordsToTable } from "@/client/features/domain/utils";
import type { DomainOverviewRouteState } from "@/client/features/domain/domainRouteState";
import { exportRows, type ExportFormat } from "@/client/lib/exportRows";
import {
  DOMAIN_KEYWORDS_PAGE_SIZES,
  MAX_DATAFORSEO_FILTER_CONDITIONS,
  type DomainSearchParams,
} from "@/types/schemas/domain";
import {
  RESEARCH_SCOPE_FILTER_SLOTS,
  type ResearchScope,
} from "@/shared/researchScope";

type SearchUpdate = Partial<DomainSearchParams>;

const EMPTY_KEYWORDS: KeywordRow[] = [];
const KEYWORD_TEXT_FILTERS = [
  {
    key: "include",
    label: "Include Terms",
    placeholder: "audit, checker, template",
  },
  {
    key: "exclude",
    label: "Exclude Terms",
    placeholder: "jobs, salary, course",
  },
] as const;
const KEYWORD_RANGE_FILTERS = [
  { title: "Estimated visits", minKey: "minTraffic", maxKey: "maxTraffic" },
  { title: "Monthly searches", minKey: "minVol", maxKey: "maxVol" },
  { title: "CPC (USD)", minKey: "minCpc", maxKey: "maxCpc", step: "0.01" },
  { title: "Difficulty (0–100)", minKey: "minKd", maxKey: "maxKd" },
  { title: "Rank", minKey: "minRank", maxKey: "maxRank" },
] as const;

type Props = {
  projectId: string;
  /** Research target as displayed: hostname, plus the path for URL scopes. */
  target: string;
  /** Hostname only, for resolving relative result URLs. */
  hostname: string;
  scope: ResearchScope;
  routeState: DomainOverviewRouteState;
  /** The Top Keywords / Top Pages tabs, shown at the top of the table card. */
  tabs: ReactNode;
  canSaveKeywords: boolean;
  setSearchParams: (updates: SearchUpdate) => void;
  onSortClick: (sort: DomainSortMode) => void;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextSize: number) => void;
};

export function KeywordsTab({
  projectId,
  target,
  hostname,
  scope,
  routeState,
  tabs,
  canSaveKeywords,
  setSearchParams,
  onSortClick,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const queryClient = useQueryClient();
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(
    new Set(),
  );
  const [showFilters, setShowFilters] = useState(false);
  // Scope filters consume part of DataForSEO's fixed filter budget.
  const maxConditions =
    MAX_DATAFORSEO_FILTER_CONDITIONS -
    RESEARCH_SCOPE_FILTER_SLOTS.keywords[scope];
  const filterPreferences = useDomainKeywordFilterPreferences(
    `${projectId}:${target}`,
  );
  const {
    filters: preferredFilters,
    save: savePreferredFilters,
    clear: clearPreferredFilters,
  } = filterPreferences;
  const restoredFilters = routeState.hasAppliedKeywordFilters
    ? routeState.appliedFilters
    : preferredFilters;
  // Filters restored from the URL or saved preferences can exceed this
  // scope's tighter budget; sending them would make the server reject the
  // whole query, so hold them back and let the panel explain.
  const filtersOverBudget =
    countKeywordFilterConditions(restoredFilters) > maxConditions;
  const appliedFilters = filtersOverBudget
    ? EMPTY_DOMAIN_FILTERS
    : restoredFilters;

  const query = useDomainKeywordsQuery({
    projectId,
    domain: target,
    scope,
    locationCode: routeState.sentLocationCode,
    page: routeState.page,
    pageSize: routeState.pageSize,
    sortMode: routeState.sort,
    sortOrder: routeState.order,
    appliedFilters,
    enabled: Boolean(target),
  });

  const rows = query.data?.keywords ?? EMPTY_KEYWORDS;
  const totalCount = query.data?.totalCount ?? null;
  const hasNextPage = query.data?.hasMore ?? false;
  const isFetching = query.isFetching;

  const visibleKeywords = useMemo(() => rows.map((r) => r.keyword), [rows]);
  useEffect(() => {
    const visibleSet = new Set(visibleKeywords);
    setSelectedKeywords((prev) => {
      const next = new Set([...prev].filter((k) => visibleSet.has(k)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleKeywords]);

  const toggleKeywordSelection = useCallback((keyword: string) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  }, []);

  const saveMutation = useSaveKeywordsMutation({ projectId, queryClient });
  const handleSaveKeywords = useCallback(() => {
    saveSelectedKeywords({
      selectedKeywords,
      filteredKeywords: rows,
      save: saveMutation.mutate,
      projectId,
      locationCode: routeState.sentLocationCode,
    });
  }, [
    projectId,
    routeState.sentLocationCode,
    rows,
    saveMutation.mutate,
    selectedKeywords,
  ]);

  const applyFilters = useCallback(
    (values: KeywordsFilterValues) => {
      if (countKeywordFilterConditions(values) > maxConditions) return;
      savePreferredFilters(values);
      setSearchParams(buildKeywordsSearchUpdate(values));
    },
    [maxConditions, savePreferredFilters, setSearchParams],
  );

  const resetFilters = useCallback(() => {
    const update: SearchUpdate = { page: undefined };
    for (const key of KEYWORD_FILTER_FIELDS) update[key] = undefined;
    clearPreferredFilters();
    setSearchParams(update);
  }, [clearPreferredFilters, setSearchParams]);

  const activeFilterCount = useMemo(
    () =>
      KEYWORD_FILTER_FIELDS.filter((k) => restoredFilters[k].trim() !== "")
        .length,
    [restoredFilters],
  );

  const exportTable = useMemo(() => keywordsToTable(rows), [rows]);
  const fileNamePrefix = target.replaceAll("/", "-");
  const selectedExportTable = useMemo(
    () => keywordsToTable(rows.filter((r) => selectedKeywords.has(r.keyword))),
    [rows, selectedKeywords],
  );

  const exportAll = (format: ExportFormat) =>
    void exportRows({
      format,
      feature: "domain_overview",
      ...exportTable,
      filename: `${fileNamePrefix}-keywords`,
      records: rows,
    });
  const exportSelection = (format: ExportFormat) =>
    void exportRows({
      format,
      feature: "domain_overview",
      ...selectedExportTable,
      filename: `${fileNamePrefix}-selected-keywords`,
      scope: "selection",
    });

  return (
    <>
      <TableBulkActionBar
        selectedCount={selectedKeywords.size}
        onClear={() => setSelectedKeywords(new Set())}
        actions={
          <div className="flex items-center px-1.5">
            <TableBulkActionButton
              icon={<Save className="size-3.5" />}
              onClick={handleSaveKeywords}
              disabled={!canSaveKeywords}
            >
              Save Keywords
            </TableBulkActionButton>
            <TableBulkExportMenu
              actions={[
                {
                  label: "Export to Sheets",
                  icon: <Sheet className="size-4" />,
                  onClick: () => exportSelection("sheets"),
                },
                {
                  label: "Download CSV",
                  icon: <Download className="size-4" />,
                  onClick: () => exportSelection("csv"),
                },
              ]}
            />
          </div>
        }
      />

      <DomainKeywordsTable
        domain={hostname}
        rows={rows}
        selectedKeywords={selectedKeywords}
        visibleKeywords={visibleKeywords}
        sortMode={routeState.sort}
        currentSortOrder={routeState.order}
        onSortClick={onSortClick}
        onToggleKeyword={toggleKeywordSelection}
        isLoading={isFetching && (showFilters || rows.length === 0)}
        isFiltered={!filtersOverBudget && activeFilterCount > 0}
        onClearFilters={resetFilters}
        error={
          query.isError ? (
            <QueryError
              error={query.error}
              fallback="Failed to load keywords."
              onRetry={() => void query.refetch()}
              isRetrying={isFetching}
            />
          ) : null
        }
        toolbar={
          <>
            {tabs}
            <KeywordResultsGuide />
            <DomainTableToolbar
              overBudgetLimit={filtersOverBudget ? maxConditions : null}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters((prev) => !prev)}
              activeFilterCount={activeFilterCount}
              countLabel="keywords"
              totalCount={totalCount}
              fallbackCount={rows.length}
              onExport={exportAll}
              filterPanel={
                <DomainFilterPanel
                  activeFilterCount={activeFilterCount}
                  appliedFilters={restoredFilters}
                  fields={KEYWORD_FILTER_FIELDS}
                  textFields={KEYWORD_TEXT_FILTERS}
                  rangeFields={KEYWORD_RANGE_FILTERS}
                  countConditions={countKeywordFilterConditions}
                  maxConditions={maxConditions}
                  onApply={applyFilters}
                  onClear={resetFilters}
                />
              }
            >
              <span className="text-sm text-muted-foreground">
                ·{" "}
                {selectedKeywords.size > 0
                  ? `${selectedKeywords.size} selected`
                  : "Select keywords to save"}
              </span>
            </DomainTableToolbar>
          </>
        }
        footer={
          <TablePagination
            page={routeState.page}
            pageSize={routeState.pageSize}
            pageSizes={DOMAIN_KEYWORDS_PAGE_SIZES}
            totalCount={totalCount}
            hasNextPage={hasNextPage}
            isLoading={isFetching}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            renderPageButton={DomainPageLink}
          />
        }
      />
    </>
  );
}

const KEYWORD_COLUMN_HELP = [
  {
    label: "Rank",
    text: "This domain's Google position. 1–10 means this page already performs well.",
  },
  {
    label: "Searches/mo",
    text: "Estimated monthly searches. It shows demand, not guaranteed traffic.",
  },
  {
    label: "Est. visits",
    text: "Estimated visits this domain gets from the ranking. It is not analytics data.",
  },
  {
    label: "CPC",
    text: "What advertisers may pay per click. Higher values can suggest buying intent.",
  },
  {
    label: "Difficulty",
    text: "How hard the top 10 may be to reach. Lower is usually easier; relevance still comes first.",
  },
  {
    label: "Ranking page",
    text: "The page Google rewards. Open it to learn the expected format and depth.",
  },
] as const;

function KeywordResultsGuide() {
  return (
    <Collapsible className="border-b border-border bg-info/5">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left outline-none hover:bg-info/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset">
        <CircleHelp className="size-4 shrink-0 text-info" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            How to use these keyword results
          </span>
          <span className="block text-xs text-muted-foreground">
            Choose relevant terms, judge the opportunity, then study the page
            that already ranks.
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 px-4 pb-4">
          <ol className="grid gap-2 text-sm md:grid-cols-3">
            <li className="rounded-lg border border-border bg-card p-3">
              <span className="font-medium">1. Check relevance.</span> Ignore a
              keyword unless it matches something you sell or can answer well.
            </li>
            <li className="rounded-lg border border-border bg-card p-3">
              <span className="font-medium">2. Judge the opportunity.</span>{" "}
              Compare Difficulty with monthly searches and CPC. No single number
              decides whether a keyword is good.
            </li>
            <li className="rounded-lg border border-border bg-card p-3">
              <span className="font-medium">3. Study the result.</span> Open the
              ranking page to see the format and depth Google currently rewards,
              then select and save the best terms.
            </li>
          </ol>
          <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {KEYWORD_COLUMN_HELP.map((item) => (
              <div key={item.label}>
                <dt className="font-medium text-foreground">{item.label}</dt>
                <dd className="text-muted-foreground">{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
