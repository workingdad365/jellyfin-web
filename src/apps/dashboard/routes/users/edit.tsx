import React, { useCallback } from 'react';
import { useUser } from 'hooks/api/useUser';
import Loading from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import globalize from 'lib/globalize';
import Stack from '@mui/material/Stack';
import { UserTab } from 'apps/dashboard/features/users/constants/userTab';
import Profile from 'apps/dashboard/features/users/components/Profile';
import Access from 'apps/dashboard/features/users/components/Access';
import ParentalControl from 'apps/dashboard/features/users/components/ParentalControl';
import Password from 'apps/dashboard/features/users/components/Password';
import Alert from '@mui/material/Alert';
import { useApi } from 'hooks/useApi';

export const Component = () => {
    const navigate = useNavigate();
    const { userId, tab } = useParams();
    const { data: user, isPending, isError } = useUser({ userId });
    const { user: loggedInUser } = useApi();

    // 비밀번호 탭은 관리자에게만 노출한다
    const isPasswordTabVisible = Boolean(loggedInUser?.Policy?.IsAdministrator);
    // 숨긴 탭이 선택된 상태로 진입하면 MUI 가 매칭 실패 경고를 내므로 false 로 낮춘다
    const activeTab = !isPasswordTabVisible && tab === UserTab.Password ? false : tab;

    const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: UserTab) => {
        navigate(`/dashboard/users/${userId}/${newValue}`);
    }, [ navigate ]);

    if (isPending) return <Loading />;

    return (
        <Page
            id='usersEditPage'
            className='mainAnimatedPage type-interior'
        >
            <Box className='content-primary'>
                {isError ? (
                    <Alert
                        severity='error'
                        sx={{ marginBottom: 2 }}
                    >
                        {globalize.translate('UsersEditPageError')}
                    </Alert>
                ) : (
                    <Stack spacing={2}>
                        <Typography variant='h1'>{user.Name}</Typography>
                        <Tabs value={activeTab} onChange={handleTabChange}>
                            <Tab label={globalize.translate('Profile')} value={UserTab.Profile} />
                            <Tab label={globalize.translate('TabAccess')} value={UserTab.Access} />
                            <Tab label={globalize.translate('TabParentalControl')} value={UserTab.ParentalControl} />
                            {isPasswordTabVisible && (
                                <Tab label={globalize.translate('HeaderPassword')} value={UserTab.Password} />
                            )}
                        </Tabs>

                        {tab == UserTab.Profile && (
                            <Profile userDto={user} />
                        )}
                        {tab == UserTab.Access && (
                            <Access userId={user.Id || ''} />
                        )}
                        {tab == UserTab.ParentalControl && (
                            <ParentalControl userId={user.Id || ''} />
                        )}
                        {tab == UserTab.Password && isPasswordTabVisible && (
                            <Password user={user} />
                        )}
                    </Stack>
                )}
            </Box>
        </Page>
    );
};

Component.displayName = 'UsersEditPage';
