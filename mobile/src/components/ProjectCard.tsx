import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { Project } from '@/api/types';

interface ProjectCardProps {
  project: Project;
}

/** http/https以外のスキームは開かない(安全な表示のための最小限のガード)。 */
function isSafeExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ProjectCard({ project: p }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isCareer = p.type === 'career';
  const accent = isCareer ? colors.career : colors.sideJob;
  const dueLabel = p.next_action_date ? '次アクション日' : p.deadline ? '期限' : null;
  const dueValue = (p.next_action_date || p.deadline)?.slice(0, 10) ?? null;

  return (
    <View style={[styles.card, { borderLeftColor: accent.accent }]}>
      <Pressable
        onPress={() => setExpanded(v => !v)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerTop}>
          <Text style={styles.title} numberOfLines={expanded ? undefined : 1}>
            {p.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: accent.badgeBg }]}>
            <Text style={[styles.statusBadgeText, { color: accent.badgeText }]}>{p.status}</Text>
          </View>
        </View>
        {p.client_name && <Text style={styles.subtitle}>{p.client_name}</Text>}
        {dueLabel && dueValue && (
          <Text style={styles.due}>
            {dueLabel}: {dueValue}
          </Text>
        )}
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <Row label={isCareer ? '企業名' : 'クライアント'} value={p.client_name} />
          {!isCareer && <Row label="媒体" value={p.media} />}
          {!isCareer && p.reward !== null && (
            <Row label="報酬" value={`¥${p.reward.toLocaleString()}`} />
          )}
          <Row label="期限" value={p.deadline?.slice(0, 10)} />
          <Row label="概要" value={p.description} />
          {p.project_url && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>URL</Text>
              {isSafeExternalUrl(p.project_url) ? (
                <Pressable onPress={() => Linking.openURL(p.project_url!)}>
                  <Text style={[styles.rowValue, styles.link]}>{p.project_url}</Text>
                </Pressable>
              ) : (
                <Text style={styles.rowValue}>{p.project_url}</Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  header: {
    padding: 14,
    gap: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  due: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    padding: 14,
    paddingTop: 0,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  row: {
    gap: 2,
  },
  rowLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rowValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  link: {
    color: colors.career.accent,
    textDecorationLine: 'underline',
  },
});
