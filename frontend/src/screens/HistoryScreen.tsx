import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@apollo/client/react';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/spacing';
import { SearchBar } from '../components/SearchBar';
import { FilterChips } from '../components/FilterChips';
import { DayHeader } from '../components/DayHeader';
import { HistorySessionCard } from '../components/HistorySessionCard';
import { CompactCurrentSessionCard } from '../components/CompactCurrentSessionCard';
import {
  groupSessionsByDay,
  computeDaySummary,
  filterByActivityType,
  searchActivities,
  FilterType,
  SessionLike,
} from '../utils/historyGrouping';
import {
  GetCareSessionHistoryDocument,
  GetCurrentSessionDocument,
  CareSessionStatus,
} from '../types/__generated__/graphql';
import type { HistoryStackParamList } from '../navigation/MainTabNavigator';
import type { MainTabParamList, HomeStackParamList } from '../navigation/MainTabNavigator';

type HistoryScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<HistoryStackParamList, 'HistoryHome'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// Types for the flattened FlatList items
type ListItem =
  | { type: 'dayHeader'; key: string; dayKey: string; label: string; sessions: SessionLike[] }
  | { type: 'compactCurrent'; key: string }
  | { type: 'session'; key: string; session: SessionLike }
  | { type: 'searchResult'; key: string; activity: any; caregiverName: string; sessionId: string }
  | { type: 'searchCount'; key: string; count: number };

const PAGE_SIZE = 20;

export function HistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const navigation = useNavigation<HistoryScreenNavigationProp>();

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(text), 300);
  }, []);

  // Queries
  const {
    data: historyData,
    loading: historyLoading,
    error: historyError,
    fetchMore,
    refetch,
  } = useQuery(GetCareSessionHistoryDocument, {
    variables: { first: PAGE_SIZE },
  });

  const { data: currentSessionData } = useQuery(GetCurrentSessionDocument);

  const isSearchMode = debouncedSearch.trim().length > 0;

  // Extract sessions from paginated response
  const allSessions: SessionLike[] = useMemo(() => {
    if (!historyData?.getCareSessionHistory?.edges) return [];
    return historyData.getCareSessionHistory.edges.map((edge) => edge.node);
  }, [historyData]);

  // Apply activity type filter
  const filteredSessions = useMemo(
    () => filterByActivityType(allSessions, activeFilter),
    [allSessions, activeFilter]
  );

  // Build list items for browse mode
  const browseListItems = useMemo((): ListItem[] => {
    if (isSearchMode) return [];

    const dayGroups = groupSessionsByDay(filteredSessions);
    const items: ListItem[] = [];
    const currentSession = currentSessionData?.getCurrentSession;

    for (const group of dayGroups) {
      const summary = computeDaySummary(group.sessions);
      items.push({
        type: 'dayHeader',
        key: `day-${group.dayKey}`,
        dayKey: group.dayKey,
        label: group.label,
        sessions: group.sessions,
      });

      // Show compact current session card under "Today"
      if (group.label === 'Today' && currentSession?.status === CareSessionStatus.InProgress) {
        items.push({
          type: 'compactCurrent',
          key: 'compact-current',
        });
      }

      // Add completed sessions
      for (const session of group.sessions) {
        if (session.status === CareSessionStatus.Completed) {
          items.push({
            type: 'session',
            key: `session-${session.id}`,
            session,
          });
        }
      }
    }

    // If there's a current session but no "Today" group yet, add it
    if (
      currentSession?.status === CareSessionStatus.InProgress &&
      !dayGroups.some((g) => g.label === 'Today')
    ) {
      items.unshift(
        {
          type: 'dayHeader',
          key: 'day-today-current',
          dayKey: 'today',
          label: 'Today',
          sessions: [],
        },
        {
          type: 'compactCurrent',
          key: 'compact-current',
        }
      );
    }

    return items;
  }, [filteredSessions, currentSessionData, isSearchMode]);

  // Build list items for search mode
  const searchListItems = useMemo((): ListItem[] => {
    if (!isSearchMode) return [];

    const searchResults = searchActivities(allSessions, debouncedSearch);
    const items: ListItem[] = [];
    let totalResults = 0;

    for (const group of searchResults) {
      items.push({
        type: 'dayHeader',
        key: `search-day-${group.dayKey}`,
        dayKey: group.dayKey,
        label: group.label,
        sessions: [],
      });

      for (const result of group.results) {
        totalResults++;
        items.push({
          type: 'searchResult',
          key: `search-${result.sessionId}-${result.activity.id}`,
          activity: result.activity,
          caregiverName: result.caregiverName,
          sessionId: result.sessionId,
        });
      }
    }

    if (totalResults > 0) {
      items.push({
        type: 'searchCount',
        key: 'search-count',
        count: totalResults,
      });
    }

    return items;
  }, [allSessions, debouncedSearch, isSearchMode]);

  const listItems = isSearchMode ? searchListItems : browseListItems;

  // Pagination
  const pageInfo = historyData?.getCareSessionHistory?.pageInfo;
  const handleEndReached = useCallback(() => {
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      fetchMore({
        variables: { first: PAGE_SIZE, after: pageInfo.endCursor },
      });
    }
  }, [fetchMore, pageInfo]);

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Navigation handlers
  const handleSessionPress = useCallback(
    (sessionId: string) => {
      navigation.navigate('SessionDetail', { sessionId });
    },
    [navigation]
  );

  const handleCurrentSessionPress = useCallback(() => {
    navigation.navigate('HomeTab', { screen: 'Dashboard' } as any);
  }, [navigation]);

  // Render functions
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      switch (item.type) {
        case 'dayHeader': {
          const summary = computeDaySummary(item.sessions);
          return (
            <DayHeader
              label={item.label}
              feedCount={summary.feedCount}
              totalMl={summary.totalMl}
              diaperPoop={summary.diaperPoop}
              diaperPee={summary.diaperPee}
              totalSleepMinutes={summary.totalSleepMinutes}
            />
          );
        }
        case 'compactCurrent': {
          const currentSession = currentSessionData?.getCurrentSession;
          if (!currentSession) return null;
          return (
            <View style={styles.cardContainer}>
              <CompactCurrentSessionCard
                caregiverName={currentSession.caregiver.name}
                caregiverId={currentSession.caregiver.id}
                startedAt={currentSession.startedAt}
                activityCount={currentSession.activities.length}
                onPress={handleCurrentSessionPress}
              />
            </View>
          );
        }
        case 'session':
          return (
            <View style={styles.cardContainer}>
              <HistorySessionCard
                session={item.session}
                onPress={() => handleSessionPress(item.session.id)}
              />
            </View>
          );
        case 'searchResult':
          return (
            <View style={styles.searchResultRow}>
              <View style={styles.searchResultContent}>
                <Text style={styles.searchResultText}>
                  {getActivityEmoji(item.activity)} {getActivityLabel(item.activity)}
                </Text>
                <Text style={styles.searchResultCaregiver}>{item.caregiverName}</Text>
              </View>
            </View>
          );
        case 'searchCount':
          return (
            <Text style={styles.searchCountText}>
              {item.count} {item.count === 1 ? 'result' : 'results'}
            </Text>
          );
      }
    },
    [currentSessionData, handleSessionPress, handleCurrentSessionPress]
  );

  // Loading state
  if (historyLoading && !historyData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  // Error state
  if (historyError && !historyData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load history</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  const hasData = allSessions.length > 0 || currentSessionData?.getCurrentSession;

  return (
    <View style={styles.container}>
      <View style={styles.controlsContainer}>
        <SearchBar value={searchQuery} onChangeText={handleSearchChange} />
        {!isSearchMode && (
          <FilterChips selected={activeFilter} onSelect={setActiveFilter} />
        )}
      </View>

      {!hasData ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No sessions yet</Text>
        </View>
      ) : (
        <FlatList
          data={listItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListFooterComponent={
            pageInfo?.hasNextPage && !isSearchMode ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={colors.primary}
                testID="pagination-loader"
              />
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function getActivityEmoji(activity: any): string {
  switch (activity.__typename) {
    case 'FeedActivity':
      return '\uD83C\uDF7C';
    case 'DiaperActivity':
      return activity.diaperDetails?.hadPoop ? '\uD83D\uDCA9' : '\uD83D\uDCA7';
    case 'SleepActivity':
      return '\uD83D\uDE34';
    default:
      return '';
  }
}

function getActivityLabel(activity: any): string {
  switch (activity.__typename) {
    case 'FeedActivity': {
      const ml = activity.feedDetails?.amountMl;
      return ml ? `${ml}ml feed` : 'feed';
    }
    case 'DiaperActivity':
      return activity.diaperDetails?.hadPoop ? 'poop' : 'pee';
    case 'SleepActivity': {
      const mins = activity.sleepDetails?.durationMinutes;
      if (mins) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m sleep` : `${m}m sleep`;
      }
      return 'sleep';
    }
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  controlsContainer: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  cardContainer: {
    paddingHorizontal: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.base,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: typography.base,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: typography.lg,
    color: colors.textSecondary,
  },
  searchResultRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchResultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultText: {
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  searchResultCaregiver: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  searchCountText: {
    textAlign: 'center',
    fontSize: typography.sm,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  footerLoader: {
    paddingVertical: spacing.md,
  },
});
