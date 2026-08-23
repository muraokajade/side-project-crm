import ProjectListScreen from '@/components/ProjectListScreen';
import { colors } from '@/constants/colors';

export default function CareerScreen() {
  return (
    <ProjectListScreen
      type="career"
      title="転職"
      searchPlaceholder="企業名・職種・概要で検索"
      accentColor={colors.career.accent}
    />
  );
}
