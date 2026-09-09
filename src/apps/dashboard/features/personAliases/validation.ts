import type { TmdbPersonAlias } from './api/usePersonAliases';

export const normalizePersonName = (name: string) => name.trim().normalize('NFC').toUpperCase();

export const getAliasError = (
    draft: TmdbPersonAlias,
    originalName: string,
    drafts: TmdbPersonAlias[],
    aliases: TmdbPersonAlias[]
): string | undefined => {
    const name = draft.Name.trim().normalize('NFC');
    const containsControl = Array.from(name).some(character => {
        const code = character.charCodeAt(0);
        return code < 32 || (code >= 127 && code <= 159);
    });
    if (!name || name.length > 200 || containsControl || !name.replace(/\.+$/, '').trim()) {
        return 'PersonAliasInvalidName';
    }
    const normalized = normalizePersonName(name);
    if (!originalName || normalized === normalizePersonName(originalName)) {
        return 'PersonAliasMustRename';
    }
    if ([ ...drafts, ...aliases ].some(alias => alias.TmdbId !== draft.TmdbId
        && normalizePersonName(alias.Name) === normalized)) {
        return 'PersonAliasNameConflict';
    }
    return undefined;
};
