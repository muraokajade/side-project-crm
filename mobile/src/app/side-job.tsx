import ProjectListScreen from '@/components/ProjectListScreen';
import { colors } from '@/constants/colors';

export default function SideJobScreen() {
  return (
    <ProjectListScreen
      type="side_job"
      title="副業"
      searchPlaceholder="案件名・クライアント・概要で検索"
      accentColor={colors.sideJob.accent}
    />
  );
}
