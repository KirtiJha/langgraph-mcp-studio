import React, { useMemo, useCallback } from "react";
import { FixedSizeGrid as Grid } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import { PublicAPISpec } from "../../shared/publicApiTypes";
import PublicAPICard from "./PublicAPICard";

interface VirtualizedAPIGridProps {
  apis: PublicAPISpec[];
  favorites: Set<string>;
  onToggleFavorite: (apiId: string) => void;
  onSelect: (api: PublicAPISpec) => void;
  onTest: (api: PublicAPISpec) => void;
  onConvertToMCP: (api: PublicAPISpec) => void;
  containerWidth: number;
  containerHeight: number;
  hasMore?: boolean;
  onLoadMore?: () => Promise<void>;
  loading?: boolean;
}

interface GridItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    apis: PublicAPISpec[];
    favorites: Set<string>;
    onToggleFavorite: (apiId: string) => void;
    onSelect: (api: PublicAPISpec) => void;
    onTest: (api: PublicAPISpec) => void;
    onConvertToMCP: (api: PublicAPISpec) => void;
    columnsPerRow: number;
    cardWidth: number;
    cardHeight: number;
    gap: number;
  };
}

const GridItem: React.FC<GridItemProps> = ({
  columnIndex,
  rowIndex,
  style,
  data,
}) => {
  const {
    apis,
    favorites,
    onToggleFavorite,
    onSelect,
    onTest,
    onConvertToMCP,
    columnsPerRow,
    cardWidth,
    cardHeight,
    gap,
  } = data;

  const apiIndex = rowIndex * columnsPerRow + columnIndex;
  const api = apis[apiIndex];

  if (!api) {
    // Show loading placeholder if we're at the end and loading more
    if (apiIndex >= apis.length && apiIndex < apis.length + columnsPerRow) {
      return (
        <div
          style={{
            ...style,
            padding: `${gap / 2}px`,
            left: (style.left as number) + gap / 2,
            top: (style.top as number) + gap / 2,
            width: cardWidth,
            height: cardHeight,
          }}
        >
          <div className="h-full bg-slate-800/30 rounded-lg border border-slate-700/50 animate-pulse flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
          </div>
        </div>
      );
    }
    return <div style={style} />;
  }

  return (
    <div
      style={{
        ...style,
        padding: `${gap / 2}px`,
        left: (style.left as number) + gap / 2,
        top: (style.top as number) + gap / 2,
        width: cardWidth,
        height: cardHeight,
      }}
    >
      <PublicAPICard
        api={api}
        isFavorite={favorites.has(api.id)}
        onToggleFavorite={() => onToggleFavorite(api.id)}
        onSelect={() => onSelect(api)}
        onTest={() => onTest(api)}
        onConvertToMCP={() => onConvertToMCP(api)}
      />
    </div>
  );
};

const VirtualizedAPIGrid: React.FC<VirtualizedAPIGridProps> = ({
  apis,
  favorites,
  onToggleFavorite,
  onSelect,
  onTest,
  onConvertToMCP,
  containerWidth,
  containerHeight,
  hasMore = false,
  onLoadMore,
  loading = false,
}) => {
  // Calculate grid dimensions
  const cardWidth = 384; // w-96 equivalent
  const cardHeight = 280; // Approximate height of PublicAPICard
  const gap = 24; // gap-6 equivalent
  const minCardWidth = cardWidth + gap;

  const columnsPerRow = Math.max(1, Math.floor(containerWidth / minCardWidth));
  const rowCount = Math.ceil(apis.length / columnsPerRow);
  const totalItemCount = hasMore ? apis.length + columnsPerRow : apis.length; // Add placeholder row for loading

  const itemData = useMemo(
    () => ({
      apis,
      favorites,
      onToggleFavorite,
      onSelect,
      onTest,
      onConvertToMCP,
      columnsPerRow,
      cardWidth,
      cardHeight,
      gap,
    }),
    [
      apis,
      favorites,
      onToggleFavorite,
      onSelect,
      onTest,
      onConvertToMCP,
      columnsPerRow,
      cardWidth,
      cardHeight,
      gap,
    ]
  );

  const isItemLoaded = useCallback(
    (index: number) => {
      const apiIndex =
        Math.floor(index / columnsPerRow) * columnsPerRow +
        (index % columnsPerRow);
      return !!apis[apiIndex];
    },
    [apis, columnsPerRow]
  );

  const loadMoreItems = useCallback(
    async (startIndex: number, stopIndex: number) => {
      if (onLoadMore && hasMore && !loading) {
        await onLoadMore();
      }
    },
    [onLoadMore, hasMore, loading]
  );

  if (!hasMore || !onLoadMore) {
    // Simple grid without infinite loading
    return (
      <Grid
        columnCount={columnsPerRow}
        columnWidth={cardWidth + gap}
        height={containerHeight}
        rowCount={rowCount}
        rowHeight={cardHeight + gap}
        width={containerWidth}
        itemData={itemData}
      >
        {GridItem}
      </Grid>
    );
  }

  // Grid with infinite loading
  return (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={totalItemCount}
      loadMoreItems={loadMoreItems}
    >
      {({ onItemsRendered, ref }) => (
        <Grid
          ref={ref}
          columnCount={columnsPerRow}
          columnWidth={cardWidth + gap}
          height={containerHeight}
          rowCount={Math.ceil(totalItemCount / columnsPerRow)}
          rowHeight={cardHeight + gap}
          width={containerWidth}
          itemData={itemData}
          onItemsRendered={({
            visibleColumnStartIndex,
            visibleColumnStopIndex,
            visibleRowStartIndex,
            visibleRowStopIndex,
          }) => {
            const startIndex =
              visibleRowStartIndex * columnsPerRow + visibleColumnStartIndex;
            const stopIndex =
              visibleRowStopIndex * columnsPerRow + visibleColumnStopIndex;
            onItemsRendered({
              overscanStartIndex: startIndex,
              overscanStopIndex: stopIndex,
              visibleStartIndex: startIndex,
              visibleStopIndex: stopIndex,
            });
          }}
        >
          {GridItem}
        </Grid>
      )}
    </InfiniteLoader>
  );
};

export default VirtualizedAPIGrid;
