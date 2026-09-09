import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Save from '@mui/icons-material/Save';
import Search from '@mui/icons-material/Search';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { isAxiosError } from 'axios';
import React, { type FormEvent, useState } from 'react';

import Loading from 'components/loading/LoadingComponent';
import globalize from 'lib/globalize';
import { type TmdbPersonAlias, type TmdbPersonCandidate, usePersonAliases, usePersonDetails, usePersonSearch } from '../api/usePersonAliases';
import { getAliasError } from '../validation';

interface Props {
    initialAlias?: TmdbPersonAlias;
    onClose: () => void;
    onSaved: () => void;
}

const errorMessage = (error: unknown) => {
    if (isAxiosError<{ detail?: string; Detail?: string }>(error)) {
        const detail = error.response?.data?.detail ?? error.response?.data?.Detail;
        if (typeof detail === 'string') return detail;
    }
    return globalize.translate('PersonAliasRequestError');
};

const PersonAliasDialog = ({ initialAlias, onClose, onSaved }: Props) => {
    const { query, mutation } = usePersonAliases();
    const [ search, setSearch ] = useState('');
    const [ submittedSearch, setSubmittedSearch ] = useState('');
    const [ page, setPage ] = useState(1);
    const [ selected, setSelected ] = useState<TmdbPersonCandidate[]>([]);
    const [ editing, setEditing ] = useState(!!initialAlias);
    const [ drafts, setDrafts ] = useState<TmdbPersonAlias[]>(initialAlias ? [ initialAlias ] : []);
    const [ completed, setCompleted ] = useState<number[]>([]);
    const [ saving, setSaving ] = useState(false);
    const [ saveError, setSaveError ] = useState<{ tmdbId: number; message: string }>();
    const results = usePersonSearch(editing ? '' : submittedSearch, page);
    const details = usePersonDetails(initialAlias?.TmdbId);
    const aliases = query.data ?? [];
    const candidates = initialAlias ? [ ...(details.data ? [ details.data ] : []) ] : selected;
    const errors = drafts.map(draft => getAliasError(
        draft,
        candidates.find(person => person.TmdbId === draft.TmdbId)?.Name ?? '',
        drafts,
        aliases
    ));
    const ready = !!query.data && !query.isError && (!initialAlias || (details.isSuccess && !details.isFetching));
    const canSave = ready && drafts.length > 0 && drafts.every((draft, index) => completed.includes(draft.TmdbId) || !errors[index]);

    const searchPeople = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!search.trim() || results.isFetching) return;
        setSelected([]);
        setPage(1);
        setSubmittedSearch(search.trim());
        if (submittedSearch === search.trim() && page === 1) void results.refetch();
    };

    const togglePerson = (person: TmdbPersonCandidate) => {
        setSelected(current => current.some(candidate => candidate.TmdbId === person.TmdbId)
            ? current.filter(candidate => candidate.TmdbId !== person.TmdbId)
            : [ ...current, person ]);
    };

    const editSelected = () => {
        setDrafts(selected.map(person => ({ TmdbId: person.TmdbId, Name: person.Name })));
        setEditing(true);
        setSaveError(undefined);
    };

    const saveSelected = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSave || saving) return;
        setSaving(true);
        setSaveError(undefined);
        try {
            for (const draft of drafts.filter(person => !completed.includes(person.TmdbId))) {
                try {
                    await mutation.mutateAsync({ type: 'save', alias: { ...draft, Name: draft.Name.trim().normalize('NFC') } });
                    setCompleted(current => [ ...current, draft.TmdbId ]);
                } catch (error) {
                    setSaveError({ tmdbId: draft.TmdbId, message: errorMessage(error) });
                    return;
                }
            }
            onSaved();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth='md'>
            <DialogTitle>{globalize.translate(editing ? 'PersonAliasEditSelected' : 'PersonAliasFindPeople')}</DialogTitle>
            {!editing && (
                <>
                    <DialogContent dividers>
                        <Stack spacing={3}>
                            <Box component='form' onSubmit={searchPeople}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <TextField
                                        autoFocus
                                        required
                                        fullWidth
                                        label={globalize.translate('PersonAliasFindName')}
                                        value={search}
                                        onChange={event => setSearch(event.target.value)}
                                        inputProps={{ maxLength: 200 }}
                                    />
                                    <Button type='submit' startIcon={<Search />} disabled={!search.trim() || results.isFetching} sx={{ flexShrink: 0 }}>
                                        {globalize.translate('Search')}
                                    </Button>
                                </Stack>
                            </Box>
                            {results.isFetching && <Loading />}
                            {results.isError && <Alert severity='error'>{errorMessage(results.error)}</Alert>}
                            {!results.isFetching && !results.isError && results.data?.Items.length === 0 && (
                                <Alert severity='info'>{globalize.translate('PersonAliasNoPeople')}</Alert>
                            )}
                            {!results.isFetching && !results.isError && results.data?.Items.map(person => {
                                const registered = aliases.some(alias => alias.TmdbId === person.TmdbId);
                                return (
                                    <Stack key={person.TmdbId} direction='row' spacing={{ xs: 1, sm: 2 }} sx={{ borderBottom: 1, borderColor: 'divider', pb: 2 }}>
                                        <Checkbox
                                            checked={selected.some(candidate => candidate.TmdbId === person.TmdbId)}
                                            disabled={registered || !ready}
                                            onChange={() => togglePerson(person)}
                                            inputProps={{ 'aria-label': `${person.Name} (${person.TmdbId})` }}
                                            sx={{ alignSelf: 'flex-start' }}
                                        />
                                        <Avatar src={person.ImageUrl ?? undefined} alt={person.Name} variant='rounded' sx={{ width: { xs: 48, sm: 72 }, height: { xs: 72, sm: 108 }, flexShrink: 0 }} />
                                        <Stack spacing={1} sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
                                            <Link href={`https://www.themoviedb.org/person/${person.TmdbId}`} target='_blank' rel='noopener noreferrer'>
                                                {person.Name} ({person.TmdbId})
                                            </Link>
                                            <Typography variant='body2'>
                                                {person.Birthday?.slice(0, 10) ?? globalize.translate('PersonAliasNoBirthday')}
                                                {person.PlaceOfBirth ? ` / ${person.PlaceOfBirth}` : ''}
                                            </Typography>
                                            <Typography variant='body2' sx={{ whiteSpace: 'pre-line', maxHeight: 180, overflowY: 'auto' }}>
                                                {person.Biography || globalize.translate('PersonAliasNoBiography')}
                                            </Typography>
                                            {registered && <Typography variant='body2' color='text.secondary'>{globalize.translate('PersonAliasRegistered')}</Typography>}
                                        </Stack>
                                    </Stack>
                                );
                            })}
                            {(results.data?.TotalPages ?? 0) > 1 && (
                                <Pagination count={results.data?.TotalPages ?? 1} page={page} onChange={(_event, value) => setPage(value)} disabled={results.isFetching} size='small' siblingCount={0} />
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Typography variant='body2' sx={{ mr: 'auto', pl: 2 }}>{globalize.translate('PersonAliasSelectedCount', selected.length)}</Typography>
                        <Button onClick={onClose}>{globalize.translate('ButtonCancel')}</Button>
                        <Button startIcon={<ArrowForward />} disabled={selected.length === 0 || !ready} onClick={editSelected}>
                            {globalize.translate('PersonAliasEditSelected')}
                        </Button>
                    </DialogActions>
                </>
            )}
            {editing && (
                <Box component='form' onSubmit={event => { void saveSelected(event); }} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <DialogContent dividers>
                        <Stack spacing={3} divider={<Divider />}>
                            {initialAlias && details.isPending && <Loading />}
                            {initialAlias && details.isError && <Alert severity='error' action={<Button onClick={() => { void details.refetch(); }}>{globalize.translate('Refresh')}</Button>}>{errorMessage(details.error)}</Alert>}
                            {query.isError && <Alert severity='error'>{errorMessage(query.error)}</Alert>}
                            {drafts.map((draft, index) => {
                                const person = candidates.find(candidate => candidate.TmdbId === draft.TmdbId);
                                const done = completed.includes(draft.TmdbId);
                                return (
                                    <Stack key={draft.TmdbId} spacing={2} sx={{ minWidth: 0 }}>
                                        <Typography sx={{ overflowWrap: 'anywhere' }}>{globalize.translate('PersonAliasOriginalName')}: {person?.Name ?? ''}</Typography>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                            <TextField label={globalize.translate('PersonAliasTmdbId')} value={draft.TmdbId} InputProps={{ readOnly: true }} sx={{ width: { xs: '100%', sm: 180 } }} />
                                            <TextField
                                                required
                                                fullWidth
                                                label={globalize.translate('PersonAliasName')}
                                                value={draft.Name}
                                                disabled={saving || done || !ready}
                                                inputProps={{ maxLength: 200 }}
                                                error={!done && !!errors[index]}
                                                helperText={!done && errors[index] ? globalize.translate(errors[index]) : undefined}
                                                onChange={event => {
                                                    const value = event.target.value;
                                                    setDrafts(current => current.map(alias => alias.TmdbId === draft.TmdbId ? { ...alias, Name: value } : alias));
                                                    setSaveError(undefined);
                                                }}
                                            />
                                        </Stack>
                                        {done && <Alert severity='success'>{globalize.translate('PersonAliasSaved')}</Alert>}
                                        {saveError?.tmdbId === draft.TmdbId && <Alert severity='error'>{saveError.message}</Alert>}
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        {!initialAlias && <Button startIcon={<ArrowBack />} disabled={saving || completed.length > 0} onClick={() => setEditing(false)}>{globalize.translate('ButtonBack')}</Button>}
                        <Button onClick={onClose} disabled={saving}>{globalize.translate('ButtonCancel')}</Button>
                        <Button type='submit' startIcon={<Save />} disabled={!canSave || saving}>{globalize.translate('Save')}</Button>
                    </DialogActions>
                </Box>
            )}
        </Dialog>
    );
};

export default PersonAliasDialog;
