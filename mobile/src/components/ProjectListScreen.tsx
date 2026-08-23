import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProjectCard from '@/components/ProjectCard';
import { colors } from '@/constants/colors';
import { useProjectList } from '@/hooks/useProjectList';
import { ProjectType } from '@/api/types';

interface ProjectListScreenProps {
  type: ProjectType;
  title: string;
  searchPlaceholder: string;
  accentColor: string;
}

export default function ProjectListScreen({
  type,
  title,
  searchPlaceholder,
  accentColor,
}: ProjectListScreenProps) {
  const { searchInput, setSearchInput, result, loading, reload } = useProjectList(type);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          onPress={reload}
          style={[styles.reloadButton, { borderColor: accentColor }]}
          accessibilityRole="button"
        >
          <Text style={[styles.reloadButtonText, { color: accentColor }]}>
            {loading ? '更新中...' : '更新'}
          </Text>
        </Pressable>
      </View>

      <TextInput
        value={searchInput}
        onChangeText={setSearchInput}
        onSubmitEditing={reload}
        placeholder={searchPlaceholder}
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
        returnKeyType="search"
      />

      {result?.kind === 'http_error' && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>サーバーエラーが発生しました（HTTP {result.status}）。</Text>
          <Pressable onPress={reload} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>再読み込み</Text>
          </Pressable>
        </View>
      )}

      {result?.kind === 'network_error' && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>通信に失敗しました。接続先やネットワークを確認してください。</Text>
          <Pressable onPress={reload} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>再読み込み</Text>
          </Pressable>
        </View>
      )}

      {result?.kind === 'success' && result.data.length === 0 && !loading && (
        <View style={styles.messageBox}>
          <Text style={styles.emptyText}>案件がありません</Text>
        </View>
      )}

      {result?.kind === 'success' && (
        <FlatList
          data={result.data}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <ProjectCard project={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={accentColor} />}
        />
      )}

      {!result && loading && (
        <View style={styles.messageBox}>
          <Text style={styles.emptyText}>読み込み中...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reloadButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reloadButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  messageBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  retryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
