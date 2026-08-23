import { useCallback, useEffect, useState } from 'react';

import { fetchProjects } from '@/api/projects';
import { ProjectsResult, ProjectType } from '@/api/types';

export function useProjectList(type: ProjectType) {
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState<ProjectsResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (search?: string) => {
      setLoading(true);
      const r = await fetchProjects({ type, search });
      setResult(r);
      setLoading(false);
    },
    [type]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return {
    searchInput,
    setSearchInput,
    result,
    loading,
    reload: () => load(searchInput || undefined),
  };
}
