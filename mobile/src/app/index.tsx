import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchProjects } from '@/api/projects';
import { Project } from '@/api/types';
import { colors } from '@/constants/colors';

interface HomeSummary {
  careerCount: number | null;
  sideJobCount: number | null;
  upcoming: Project[];
  hasError: boolean;
}

function pickUpcoming(projects: Project[]): Project[] {
  return projects
    .filter(p => p.next_action_date || p.deadline)
    .sort((a, b) => {
      const da = (a.next_action_date || a.deadline || '').slice(0, 10);
      const db = (b.next_action_date || b.deadline || '').slice(0, 10);
      return da.localeCompare(db);
    })
    .slice(0, 5);
}

export default function HomeScreen() {
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [careerResult, sideJobResult] = await Promise.all([
      fetchProjects({ type: 'career' }),
      fetchProjects({ type: 'side_job' }),
    ]);

    const careerOk = careerResult.kind === 'success';
    const sideJobOk = sideJobResult.kind === 'success';
    const allProjects = [
      ...(careerOk ? careerResult.data : []),
      ...(sideJobOk ? sideJobResult.data : []),
    ];

    setSummary({
      careerCount: careerOk ? careerResult.data.length : null,
      sideJobCount: sideJobOk ? sideJobResult.data.length : null,
      upcoming: pickUpcoming(allProjects),
      hasError: !careerOk || !sideJobOk,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>ホーム</Text>
          <Pressable onPress={load} style={styles.reloadButton} accessibilityRole="button">
            <Text style={styles.reloadButtonText}>{loading ? '更新中...' : '更新'}</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderTopColor: colors.career.accent }]}>
            <Text style={styles.summaryLabel}>転職案件数</Text>
            <Text style={styles.summaryValue}>{summary?.careerCount ?? '-'}</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: colors.sideJob.accent }]}>
            <Text style={styles.summaryLabel}>副業案件数</Text>
            <Text style={styles.summaryValue}>{summary?.sideJobCount ?? '-'}</Text>
          </View>
        </View>

        {summary?.hasError && (
          <Text style={styles.errorText}>
            一部の案件数を取得できませんでした。API接続先を「設定」で確認してください。
          </Text>
        )}

        <Text style={styles.sectionTitle}>直近の期限・次アクション</Text>

        {!loading && summary && summary.upcoming.length === 0 && (
          <Text style={styles.emptyText}>直近の期限・次アクションはありません</Text>
        )}

        {summary?.upcoming.map(p => (
          <View key={`${p.type}-${p.id}`} style={styles.upcomingRow}>
            <View
              style={[
                styles.typeDot,
                { backgroundColor: p.type === 'career' ? colors.career.accent : colors.sideJob.accent },
              ]}
            />
            <View style={styles.upcomingTextWrap}>
              <Text style={styles.upcomingName} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.upcomingDate}>
                {(p.next_action_date || p.deadline || '').slice(0, 10)}
                {p.next_action_date ? '（次アクション）' : '（期限）'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reloadButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reloadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  upcomingTextWrap: {
    flex: 1,
    gap: 2,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  upcomingDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
