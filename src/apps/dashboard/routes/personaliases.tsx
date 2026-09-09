import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Refresh from '@mui/icons-material/Refresh';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { isAxiosError } from 'axios';
import React, { useState } from 'react';

import { type TmdbPersonAlias, usePersonAliases } from 'apps/dashboard/features/personAliases/api/usePersonAliases';
import PersonAliasDialog from 'apps/dashboard/features/personAliases/components/PersonAliasDialog';
import Page from 'components/Page';
import Loading from 'components/loading/LoadingComponent';
import globalize from 'lib/globalize';

const getErrorMessage = (error: unknown) => {
    if (isAxiosError<{ detail?: string; Detail?: string }>(error)) {
        const detail = error.response?.data?.detail ?? error.response?.data?.Detail;
        if (typeof detail === 'string') return detail;
        if (error.response?.status === 409) return globalize.translate('PersonAliasNameConflict');
    }
    return globalize.translate('PersonAliasRequestError');
};

export const Component = () => {
    const { query, mutation } = usePersonAliases();
    const [ search, setSearch ] = useState('');
    const [ formOpen, setFormOpen ] = useState(false);
    const [ editingAlias, setEditingAlias ] = useState<TmdbPersonAlias>();
    const [ deleting, setDeleting ] = useState<TmdbPersonAlias>();
    const [ saved, setSaved ] = useState(false);
    const aliases = query.data ?? [];
    const searchTerm = search.trim().toLocaleLowerCase();
    const filtered = aliases.filter(alias => alias.Name.toLocaleLowerCase().includes(searchTerm)
        || String(alias.TmdbId).includes(searchTerm));

    const openForm = (alias?: TmdbPersonAlias) => {
        mutation.reset();
        setSaved(false);
        setEditingAlias(alias);
        setFormOpen(true);
    };

    const deleteAlias = () => {
        if (!deleting || mutation.isPending) return;
        mutation.mutate({ type: 'delete', tmdbId: deleting.TmdbId }, {
            onSuccess: () => {
                setDeleting(undefined);
                setSaved(true);
            }
        });
    };

    return (
        <Page id='personAliases' title={globalize.translate('PersonAliasesTitle')} className='type-interior mainAnimatedPage'>
            <Box className='content-primary'>
                <Stack spacing={3} sx={{ maxWidth: 1000, minWidth: 0 }}>
                    <Typography variant='h1'>{globalize.translate('PersonAliasesTitle')}</Typography>
                    {saved && <Alert severity='success' onClose={() => setSaved(false)}>{globalize.translate('PersonAliasSaved')}</Alert>}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label={globalize.translate('PersonAliasSearch')}
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            size='small'
                            sx={{ flex: 1, minWidth: 0 }}
                        />
                        <Button startIcon={<Add />} onClick={() => openForm()} disabled={!query.data || query.isError || mutation.isPending}>
                            {globalize.translate('PersonAliasFindPeople')}
                        </Button>
                        <Tooltip title={globalize.translate('Refresh')}>
                            <span>
                                <IconButton aria-label={globalize.translate('Refresh')} onClick={() => { void query.refetch(); }} disabled={query.isFetching || mutation.isPending}>
                                    <Refresh />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                    {query.isError && <Alert severity='error'>{getErrorMessage(query.error)}</Alert>}
                    {query.isPending ? <Loading /> : (
                        <TableContainer>
                            <Table size='small' aria-label={globalize.translate('PersonAliasesTitle')} sx={{ tableLayout: 'fixed', minWidth: 360 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: 100 }}>{globalize.translate('PersonAliasTmdbId')}</TableCell>
                                        <TableCell>{globalize.translate('PersonAliasName')}</TableCell>
                                        <TableCell align='right' sx={{ width: 96 }}>{globalize.translate('PersonAliasActions')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtered.map(alias => (
                                        <TableRow key={alias.TmdbId}>
                                            <TableCell>
                                                <Link href={`https://www.themoviedb.org/person/${alias.TmdbId}`} target='_blank' rel='noopener noreferrer'>{alias.TmdbId}</Link>
                                            </TableCell>
                                            <TableCell sx={{ overflowWrap: 'anywhere' }}>{alias.Name}</TableCell>
                                            <TableCell align='right' sx={{ whiteSpace: 'nowrap' }}>
                                                <Tooltip title={globalize.translate('Edit')}>
                                                    <span><IconButton aria-label={globalize.translate('Edit')} onClick={() => openForm(alias)} disabled={mutation.isPending || query.isError}><Edit /></IconButton></span>
                                                </Tooltip>
                                                <Tooltip title={globalize.translate('Delete')}>
                                                    <span><IconButton aria-label={globalize.translate('Delete')} onClick={() => {
                                                        mutation.reset();
                                                        setSaved(false);
                                                        setDeleting(alias);
                                                    }} disabled={mutation.isPending || query.isError}><Delete /></IconButton></span>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!query.isError && filtered.length === 0 && (
                                        <TableRow><TableCell colSpan={3}>{globalize.translate(searchTerm ? 'PersonAliasNoMatches' : 'PersonAliasEmpty')}</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Stack>
            </Box>
            {formOpen && <PersonAliasDialog
                initialAlias={editingAlias}
                onClose={() => setFormOpen(false)}
                onSaved={() => {
                    setFormOpen(false);
                    setSaved(true);
                }}
            />}
            <Dialog open={!!deleting} onClose={() => { if (!mutation.isPending) setDeleting(undefined); }} fullWidth maxWidth='sm'>
                <DialogTitle>{globalize.translate('PersonAliasDelete')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ overflowWrap: 'anywhere' }}>{deleting?.TmdbId}: {deleting?.Name}</DialogContentText>
                    {mutation.isError && <Alert severity='error'>{getErrorMessage(mutation.error)}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleting(undefined)} disabled={mutation.isPending}>{globalize.translate('ButtonCancel')}</Button>
                    <Button color='error' startIcon={<Delete />} onClick={deleteAlias} disabled={mutation.isPending}>{globalize.translate('Delete')}</Button>
                </DialogActions>
            </Dialog>
        </Page>
    );
};

Component.displayName = 'TmdbPersonAliasesPage';
