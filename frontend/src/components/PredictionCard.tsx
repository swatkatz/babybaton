import { ChevronRight } from 'lucide-react-native';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { spacing, layout, typography } from '../theme/spacing';
import { GetPredictionQuery } from '../types/__generated__/graphql';

/**
 * Props for PredictionCard component
 * TODO: Replace with generated NextFeedPrediction type from GraphQL codegen
 * Matches the NextFeedPrediction type from GraphQL schema
 */
interface PredictionCardProps {
  prediction: GetPredictionQuery['predictNextFeed'];
  onPress: () => void;
}

export function PredictionCard({ prediction, onPress }: PredictionCardProps) {
  // Format time as "5:15 PM"
  const formattedTime = new Date(prediction.predictedTime).toLocaleTimeString(
    'en-US',
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  );

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.contentRow}>
          <View style={styles.textContainer}>
            <Text style={styles.subtitle}>🔮 Next Feed Prediction</Text>
            <Text style={styles.title}>Upcoming Feed</Text>
            <Text style={styles.timeText}>Scheduled for {formattedTime}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                📊 {prediction.confidence} confidence
              </Text>
            </View>
          </View>
          <ChevronRight size={24} color="#fff" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
  },
  gradient: {
    borderRadius: layout.radiusLarge,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5, // Android shadow
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.surface,
    opacity: 0.9,
    fontWeight: '500',
  },
  title: {
    fontSize: typography.xl,
    color: colors.surface,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: typography.base,
    color: colors.surface,
    opacity: 0.95,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: layout.radiusMedium,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  badgeText: {
    fontSize: typography.xs,
    color: colors.surface,
    fontWeight: '600',
  },
});
