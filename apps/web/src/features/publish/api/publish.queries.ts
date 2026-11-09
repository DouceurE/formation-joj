import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tripKeys } from '@/features/trips/api/trips.queries';
import { publishApi } from './publish.api';

export function usePublishTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishApi.publish,
    // Les départs sont relus : le nouveau trajet y apparaît.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripKeys.all }),
  });
}

/** Lire une annonce ne change aucune donnée : rien à relire dans le cache. */
export const useProposeTrip = () => useMutation({ mutationFn: publishApi.propose });
