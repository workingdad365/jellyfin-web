import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';

export interface TmdbPersonAlias {
    TmdbId: number;
    Name: string;
}

export interface TmdbPersonCandidate extends TmdbPersonAlias {
    Biography?: string | null;
    Birthday?: string | null;
    PlaceOfBirth?: string | null;
    ImageUrl?: string | null;
}

interface PersonSearchResult {
    Items: TmdbPersonCandidate[];
    TotalPages: number;
}

export const usePersonSearch = (name: string, page: number) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'TmdbPersonSearch', api?.basePath, user?.Id, name, page ],
        enabled: !!api && user?.Policy?.IsAdministrator === true && !!name,
        retry: false,
        queryFn: async ({ signal }) => {
            if (!api) throw new Error('API unavailable');
            const response = await api.axiosInstance.get<PersonSearchResult>(
                api.getUri('/TmdbPersonAliases/Search'),
                { ...api.configuration.baseOptions, params: { name, page }, signal }
            );
            return response.data;
        }
    });
};

export const usePersonDetails = (tmdbId?: number) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'TmdbPersonDetails', api?.basePath, user?.Id, tmdbId ],
        enabled: !!api && user?.Policy?.IsAdministrator === true && !!tmdbId,
        retry: false,
        queryFn: async ({ signal }) => {
            if (!api) throw new Error('API unavailable');
            const response = await api.axiosInstance.get<TmdbPersonCandidate>(
                api.getUri(`/TmdbPersonAliases/People/${tmdbId}`),
                { ...api.configuration.baseOptions, signal }
            );
            return response.data;
        }
    });
};

type AliasChange = { type: 'save'; alias: TmdbPersonAlias }
    | { type: 'delete'; tmdbId: number };

export const usePersonAliases = () => {
    const { api, user } = useApi();
    const queryClient = useQueryClient();
    const queryKey = [ 'TmdbPersonAliases', api?.basePath, user?.Id ];
    const enabled = !!api && user?.Policy?.IsAdministrator === true;

    const query = useQuery({
        queryKey,
        enabled,
        queryFn: async ({ signal }) => {
            if (!api) throw new Error('API unavailable');
            const response = await api.axiosInstance.get<TmdbPersonAlias[]>(
                api.getUri('/TmdbPersonAliases'),
                { ...api.configuration.baseOptions, signal }
            );
            return response.data;
        }
    });

    const mutation = useMutation({
        mutationFn: async (change: AliasChange) => {
            if (!api || !enabled) throw new Error('Administrator authentication required');
            if (change.type === 'save') {
                await api.axiosInstance.put(
                    api.getUri('/TmdbPersonAliases'),
                    change.alias,
                    api.configuration.baseOptions
                );
            } else {
                await api.axiosInstance.delete(
                    api.getUri(`/TmdbPersonAliases/${change.tmdbId}`),
                    api.configuration.baseOptions
                );
            }
        },
        onSuccess: async (_data, change) => {
            queryClient.setQueryData<TmdbPersonAlias[]>(queryKey, current => {
                const changedId = change.type === 'save' ? change.alias.TmdbId : change.tmdbId;
                const updated = (current ?? []).filter(alias => alias.TmdbId !== changedId);
                if (change.type === 'save') updated.push(change.alias);
                return updated.sort((first, second) => first.TmdbId - second.TmdbId);
            });
            await queryClient.invalidateQueries({ queryKey });
        }
    });

    return { query, mutation };
};
