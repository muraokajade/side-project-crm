import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getApiBaseUrl } from '@/api/client';
import { colors } from '@/constants/colors';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>設定</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>ローカル開発版</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>接続先</Text>
          <InfoRow label="API接続先" value={getApiBaseUrl()} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>このアプリについて</Text>
          <Text style={styles.body}>
            転職・副業案件を一元管理するside-project-crmのスマホ版です。同じLaravel
            APIをPCブラウザ版と共用しており、現時点では案件の閲覧のみに対応しています。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>今後対応予定</Text>
          <Text style={styles.body}>・ゴミ箱（論理削除・復元）: 今後対応</Text>
          <Text style={styles.body}>・Googleカレンダー連携: 今後対応</Text>
          <Text style={styles.body}>・ログイン認証: 今後対応</Text>
        </View>
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
    gap: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  infoRow: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
