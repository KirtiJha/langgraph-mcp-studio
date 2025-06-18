import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  TagIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
  PlayIcon,
  PlusIcon,
  XMarkIcon,
  BeakerIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import {
  StarIcon as StarIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
} from "@heroicons/react/24/solid";

import PublicAPIService from "../services/PublicAPIService";
import {
  PublicAPISpec,
  PublicAPICategory,
  PublicAPISearchFilters,
} from "../../shared/publicApiTypes";
import PublicAPICard from "./PublicAPICard";
import PublicAPIDetails from "./PublicAPIDetails";
import PublicAPITester from "./PublicAPITester";
import LoadingScreen from "./LoadingScreen";
import VirtualizedAPIGrid from "./VirtualizedAPIGrid";
import { useContainerDimensions } from "../hooks/useContainerDimensions";

interface PublicAPIExplorerProps {
  onConvertToMCP?: (api: PublicAPISpec) => void;
}

const PublicAPIExplorer: React.FC<PublicAPIExplorerProps> = ({
  onConvertToMCP,
}) => {
  const [apis, setApis] = useState<PublicAPISpec[]>([]);
  const [categories, setCategories] = useState<PublicAPICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPricing, setSelectedPricing] = useState<string>("");
  const [selectedAuth, setSelectedAuth] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAPI, setSelectedAPI] = useState<PublicAPISpec | null>(null);
  const [viewMode, setViewMode] = useState<"browse" | "details" | "test">(
    "browse"
  );
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [useVirtualization, setUseVirtualization] = useState(false);

  // Container dimensions for virtualization
  const [containerRef, containerDimensions] = useContainerDimensions();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 24; // Optimized for grid layout

  useEffect(() => {
    loadData();
    loadFavorites();
  }, []);

  // Debounced search with pagination reset
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setCurrentPage(0);
          performSearch(true);
        }, 500); // Increased debounce time for better performance
      };
    })(),
    [searchTerm, selectedCategory, selectedPricing, selectedAuth]
  );

  useEffect(() => {
    debouncedSearch();
  }, [
    searchTerm,
    selectedCategory,
    selectedPricing,
    selectedAuth,
    debouncedSearch,
  ]);

  // Memoized search filters
  const searchFilters = useMemo(
    (): PublicAPISearchFilters => ({
      search: searchTerm || undefined,
      category: selectedCategory || undefined,
      pricing: (selectedPricing as any) || undefined,
      authentication: selectedAuth || undefined,
    }),
    [searchTerm, selectedCategory, selectedPricing, selectedAuth]
  );

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const [apisData, categoriesData] = await Promise.all([
        PublicAPIService.fetchAllAPIs(forceRefresh, 100), // Load more initially
        PublicAPIService.getCategories(),
      ]);

      setCategories(categoriesData);

      // Perform initial search with pagination
      const searchResult = await PublicAPIService.searchAPIs(
        searchFilters,
        0,
        PAGE_SIZE
      );
      setApis(searchResult.apis);
      setTotalResults(searchResult.total);
      setHasMore(searchResult.hasMore);
      setCurrentPage(0);

      // Enable virtualization for large datasets
      setUseVirtualization(searchResult.total > 100);
    } catch (error) {
      console.error("Failed to load public APIs:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem("mcp_studio_api_favorites");
      if (saved) {
        setFavorites(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  };

  const saveFavorites = (newFavorites: Set<string>) => {
    try {
      localStorage.setItem(
        "mcp_studio_api_favorites",
        JSON.stringify([...newFavorites])
      );
      setFavorites(newFavorites);
    } catch (error) {
      console.error("Failed to save favorites:", error);
    }
  };

  const performSearch = async (resetPage = false) => {
    try {
      const page = resetPage ? 0 : currentPage;
      const offset = page * PAGE_SIZE;

      if (resetPage) {
        setSearching(true);
      }

      const searchResult = await PublicAPIService.searchAPIs(
        searchFilters,
        offset,
        PAGE_SIZE
      );

      if (resetPage) {
        setApis(searchResult.apis);
        setCurrentPage(0);
      } else {
        setApis((prev) => [...prev, ...searchResult.apis]);
        setCurrentPage(page);
      }

      setTotalResults(searchResult.total);
      setHasMore(searchResult.hasMore);

      // Update virtualization based on result size
      setUseVirtualization(searchResult.total > 100);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      if (resetPage) {
        setSearching(false);
      }
    }
  };

  const loadMoreAPIs = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const offset = nextPage * PAGE_SIZE;

      const searchResult = await PublicAPIService.searchAPIs(
        searchFilters,
        offset,
        PAGE_SIZE
      );

      setApis((prev) => [...prev, ...searchResult.apis]);
      setCurrentPage(nextPage);
      setHasMore(searchResult.hasMore);
    } catch (error) {
      console.error("Failed to load more APIs:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const toggleFavorite = (apiId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(apiId)) {
      newFavorites.delete(apiId);
    } else {
      newFavorites.add(apiId);
    }
    saveFavorites(newFavorites);
  };

  const handleAPISelect = async (api: PublicAPISpec) => {
    try {
      setLoading(true);
      // Load full details if needed
      const fullAPI = await PublicAPIService.getAPIById(api.id);
      setSelectedAPI(fullAPI);
      setViewMode("details");
    } catch (error) {
      console.error("Failed to load API details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAPI = async (api: PublicAPISpec) => {
    try {
      setLoading(true);
      // Load full details for testing (same as handleAPISelect)
      const fullAPI = await PublicAPIService.getAPIById(api.id);
      setSelectedAPI(fullAPI);
      setViewMode("test");
    } catch (error) {
      console.error("Failed to load API details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToMCP = (api: PublicAPISpec) => {
    if (onConvertToMCP) {
      onConvertToMCP(api);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedPricing("");
    setSelectedAuth("");
  };

  const activeFiltersCount = [
    selectedCategory,
    selectedPricing,
    selectedAuth,
  ].filter(Boolean).length;

  if (loading) {
    return <LoadingScreen message="Loading public APIs..." />;
  }

  if (viewMode === "details" && selectedAPI) {
    return (
      <PublicAPIDetails
        api={selectedAPI}
        onBack={() => setViewMode("browse")}
        onTest={() => setViewMode("test")}
        onConvertToMCP={() => handleConvertToMCP(selectedAPI)}
        isFavorite={favorites.has(selectedAPI.id)}
        onToggleFavorite={() => toggleFavorite(selectedAPI.id)}
      />
    );
  }

  const handleViewDetailsFromTest = async () => {
    if (selectedAPI) {
      // Load full details if needed (same as handleAPISelect)
      const fullAPI = await PublicAPIService.getAPIById(selectedAPI.id);
      setSelectedAPI(fullAPI);
      setViewMode("details");
    }
  };

  // ...existing code...

  if (viewMode === "test" && selectedAPI) {
    return (
      <PublicAPITester
        api={selectedAPI}
        onBack={() => setViewMode("browse")}
        onViewDetails={handleViewDetailsFromTest}
        onConvertToMCP={() => handleConvertToMCP(selectedAPI)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="flex-none bg-slate-800/50 border-b border-slate-700/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <GlobeAltIcon className="w-8 h-8 text-indigo-400" />
                Public API Explorer
              </h1>
              <p className="text-slate-400 mt-1">
                Discover, test, and integrate public APIs into your MCP
                workflows
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search APIs by name, description, or provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-400"></div>
                </div>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                showFilters || activeFiltersCount > 0
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="bg-white text-indigo-600 text-xs rounded-full px-2 py-0.5 font-medium">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name} ({category.count})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pricing Filter */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Pricing
                    </label>
                    <select
                      value={selectedPricing}
                      onChange={(e) => setSelectedPricing(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Pricing</option>
                      <option value="free">Free</option>
                      <option value="freemium">Freemium</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  {/* Authentication Filter */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Authentication
                    </label>
                    <select
                      value={selectedAuth}
                      onChange={(e) => setSelectedAuth(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Types</option>
                      <option value="none">No Auth</option>
                      <option value="apiKey">API Key</option>
                      <option value="oauth2">OAuth 2.0</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Clear
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex-none bg-slate-800/30 border-b border-slate-700/50 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !selectedCategory
                ? "bg-indigo-600 text-white"
                : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
            }`}
          >
            All ({apis.length})
          </button>
          {categories.slice(0, 12).map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.name
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden p-6">
        {apis.length === 0 ? (
          <div className="text-center py-12">
            <GlobeAltIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              No APIs Found
            </h3>
            <p className="text-slate-400 mb-4">
              Try adjusting your search criteria or filters
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Performance indicator */}
            {useVirtualization && (
              <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Virtual scrolling enabled for {totalResults} APIs
              </div>
            )}

            {/* API Grid Container */}
            <div ref={containerRef} className="flex-1 min-h-0">
              {useVirtualization &&
              containerDimensions.width > 0 &&
              containerDimensions.height > 0 ? (
                <VirtualizedAPIGrid
                  apis={apis}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onSelect={handleAPISelect}
                  onTest={handleTestAPI}
                  onConvertToMCP={handleConvertToMCP}
                  containerWidth={containerDimensions.width}
                  containerHeight={containerDimensions.height}
                  hasMore={hasMore}
                  onLoadMore={loadMoreAPIs}
                  loading={loadingMore}
                />
              ) : (
                <div className="overflow-auto h-full">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
                    {apis.map((api) => (
                      <PublicAPICard
                        key={api.id}
                        api={api}
                        isFavorite={favorites.has(api.id)}
                        onToggleFavorite={() => toggleFavorite(api.id)}
                        onSelect={() => handleAPISelect(api)}
                        onTest={() => handleTestAPI(api)}
                        onConvertToMCP={() => handleConvertToMCP(api)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Load More */}
            {hasMore && !useVirtualization && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMoreAPIs}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="w-4 h-4" />
                      Load More APIs
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Results Summary */}
            <div className="text-center mt-4 text-sm text-slate-400">
              Showing {apis.length} of {totalResults} APIs
              {!hasMore && totalResults > apis.length && (
                <span className="block mt-1">
                  Use search or filters to refine results
                </span>
              )}
              {useVirtualization && (
                <span className="block mt-1 text-green-400">
                  ⚡ Virtual scrolling active for optimal performance
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicAPIExplorer;
