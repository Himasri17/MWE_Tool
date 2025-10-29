// UserLogbook.js
import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Typography, Box, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, TextField, Button,
    Card, CardContent, Grid, useTheme, Alert, Skeleton,
    FormControl, InputLabel, Select, MenuItem, IconButton,
    Tooltip, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
    Person, Schedule, Assignment, Label, Download,
    FilterList, Refresh, Visibility, CalendarToday
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { getAuthHeaders } from '../../components/authUtils';
import Navbar from '../../components/Navbar'; // Add this import


export default function UserLogbook() {
    const { username } = useParams();
    const theme = useTheme();

    // State management
    const [userSessions, setUserSessions] = useState([]);
    const [userStats, setUserStats] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [filteredSessions, setFilteredSessions] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [usersList, setUsersList] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    // Fetch user sessions and statistics
    // In UserLogBook.js - Update the fetchUserLogs function
const fetchUserLogs = async () => {
    setIsLoading(true);
    try {
        const [sessionsResponse, usersResponse] = await Promise.all([
            fetch(`http://127.0.0.1:5001/api/activity-logs/${username}`, {
                headers: getAuthHeaders()
            }),
            // Include ALL users (including reviewers) in the filter
            fetch('http://127.0.0.1:5001/api/users-list', {
                headers: getAuthHeaders()
            })
        ]);

        if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();
            setUserSessions(sessionsData);
            setFilteredSessions(sessionsData);
            
            // Calculate user statistics
            calculateUserStats(sessionsData);
        }

        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            // Include all users (annotators and reviewers)
            setUsersList(usersData);
        }

    } catch (error) {
        console.error('Error fetching user logs:', error);
    } finally {
        setIsLoading(false);
    }
};

    // In UserLogBook.js - Replace the calculateUserStats function
const calculateUserStats = (sessions) => {
    const stats = {
        totalUsers: new Set(sessions.map(s => s.username)).size,
        totalSessions: sessions.length,
        totalAnnotations: 0,
        totalTags: 0,
        averageSessionTime: 0,
        userBreakdown: {}
    };

    const userData = {};

    sessions.forEach(session => {
        // ENHANCED: Include reviewer sessions and sessions with meaningful activities
        const hasRealTasks = session.tasksDone && session.tasksDone.some(task => {
            // Skip placeholder tasks
            if (task === "Session ended with no tasks" || 
                task === "Active session - no tasks recorded") {
                return false;
            }
            
            // Include reviewer activities (review, approve, reject actions)
            if (task.toLowerCase().includes('review') || 
                task.toLowerCase().includes('approve') || 
                task.toLowerCase().includes('reject')) {
                return true;
            }
            
            // Include annotation activities
            if (task.toLowerCase().includes('annotat') || 
                task.toLowerCase().includes('tag') ||
                task.toLowerCase().includes('mwe') ||
                task.toLowerCase().includes('phrase')) {
                return true;
            }
            
            return false;
        });
        
        // If no real tasks found, skip this session for detailed stats but count the user
        if (!hasRealTasks) {
            // Still count the user for total users
            const user = session.username;
            if (!userData[user]) {
                userData[user] = {
                    sessions: 0,
                    totalSessionTime: 0,
                    annotations: 0,
                    tags: 0,
                    tasksCompleted: []
                };
            }
            return; // Skip detailed counting but user is still in totalUsers
        }

        const user = session.username;
        if (!userData[user]) {
            userData[user] = {
                sessions: 0,
                totalSessionTime: 0,
                annotations: 0,
                tags: 0,
                tasksCompleted: []
            };
        }

        userData[user].sessions++;
        
        // Calculate session duration
        if (session.loginTimeIST && session.logoutTimeIST) {
            const loginTime = parseISTDate(session.loginTimeIST);
            const logoutTime = parseISTDate(session.logoutTimeIST);
            const duration = (logoutTime - loginTime) / (1000 * 60); // minutes
            userData[user].totalSessionTime += duration;
        }

        // Enhanced task analysis for both annotators and reviewers
        session.tasksDone?.forEach(task => {
            if (task === "Session ended with no tasks" || 
                task === "Active session - no tasks recorded") {
                return; // Skip placeholder tasks
            }

            // Track reviewer activities
            if (task.toLowerCase().includes('review') || 
                task.toLowerCase().includes('approve') || 
                task.toLowerCase().includes('reject')) {
                // Count these as meaningful activities but not as annotations/tags
                if (!userData[user].tasksCompleted.includes(task)) {
                    userData[user].tasksCompleted.push(task);
                }
                return;
            }

            // Track annotation activities
            if (task.toLowerCase().includes('annotat') || 
                task.toLowerCase().includes('tag') ||
                task.toLowerCase().includes('mwe') ||
                task.toLowerCase().includes('phrase')) {
                
                if (task.toLowerCase().includes('annotat')) {
                    userData[user].annotations++;
                    stats.totalAnnotations++;
                }
                if (task.toLowerCase().includes('tag')) {
                    userData[user].tags++;
                    stats.totalTags++;
                }
                
                // Track unique tasks
                if (!userData[user].tasksCompleted.includes(task)) {
                    userData[user].tasksCompleted.push(task);
                }
            }
        });
    });

    // Calculate averages only for sessions with real tasks
    const sessionsWithRealTasks = Object.values(userData).reduce((sum, user) => sum + user.sessions, 0);
    if (sessionsWithRealTasks > 0) {
        const totalTime = Object.values(userData).reduce((sum, user) => sum + user.totalSessionTime, 0);
        stats.averageSessionTime = totalTime / sessionsWithRealTasks;
    }

    stats.userBreakdown = userData;
    setUserStats(stats);
};

    // Parse IST date string to Date object
    const parseISTDate = (dateString) => {
        if (!dateString) return new Date();
        
        try {
            // Format: "DD/MM/YYYY, HH:MM:SS"
            const [datePart, timePart] = dateString.split(', ');
            const [day, month, year] = datePart.split('/');
            const [hours, minutes, seconds] = timePart.split(':');
            
            return new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hours),
                parseInt(minutes),
                parseInt(seconds)
            );
        } catch (error) {
            console.error('Error parsing date:', error);
            return new Date();
        }
    };

    // Format session duration
    const formatDuration = (loginTime, logoutTime) => {
        if (!loginTime || !logoutTime) return 'N/A';
        
        const login = parseISTDate(loginTime);
        const logout = parseISTDate(logoutTime);
        const duration = (logout - login) / (1000 * 60); // minutes
        
        if (duration < 60) {
            return `${Math.round(duration)} min`;
        } else {
            const hours = Math.floor(duration / 60);
            const minutes = Math.round(duration % 60);
            return `${hours}h ${minutes}m`;
        }
    };

    // Filter sessions based on selected criteria
    const applyFilters = () => {
        let filtered = userSessions;

        if (selectedUser) {
            filtered = filtered.filter(session => session.username === selectedUser);
        }

        if (dateRange.start) {
            const startDate = new Date(dateRange.start);
            filtered = filtered.filter(session => {
                const sessionDate = parseISTDate(session.loginTimeIST);
                return sessionDate >= startDate;
            });
        }

        if (dateRange.end) {
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(session => {
                const sessionDate = parseISTDate(session.loginTimeIST);
                return sessionDate <= endDate;
            });
        }

        setFilteredSessions(filtered);
    };

    // Reset filters
    const resetFilters = () => {
        setSelectedUser('');
        setDateRange({ start: '', end: '' });
        setFilteredSessions(userSessions);
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Username', 'Login Time', 'Logout Time', 'Session Duration', 'Tasks Completed', 'Annotations', 'Tags'];
        const csvData = filteredSessions.map(session => {
            const annotations = session.tasksDone?.filter(task => 
                task.includes('annotated') || task.includes('Annotation')
            ).length || 0;
            
            const tags = session.tasksDone?.filter(task => 
                task.includes('tag') || task.includes('Tag')
            ).length || 0;

            return [
                session.username,
                session.loginTimeIST,
                session.logoutTimeIST || 'Active',
                formatDuration(session.loginTimeIST, session.logoutTimeIST),
                session.tasksDone?.length || 0,
                annotations,
                tags
            ];
        });

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `user_logbook_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    // View session details
    const viewSessionDetails = (session) => {
        setSelectedSession(session);
        setDetailDialogOpen(true);
    };

    useEffect(() => {
        fetchUserLogs();
    }, [username]);

    // Statistics Cards Component
    const StatCard = ({ icon, title, value, subtitle, color }) => (
        <Card sx={{ height: '100%', bgcolor: theme.palette.background.paper }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ 
                        bgcolor: `${color}.light`, 
                        color: `${color}.dark`,
                        borderRadius: 1,
                        p: 1,
                        mr: 2
                    }}>
                        {icon}
                    </Box>
                    <Box>
                        <Typography variant="h4" fontWeight="bold" color="text.primary">
                            {value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ minHeight: '100vh', width: '100vw' }}>
             <Navbar username={username} />
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    User Activity Logbook
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Monitor user activities, session durations, and annotation statistics
                </Typography>
            </Box>

            {/* Statistics Overview */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<Person />}
                        title="Total Users"
                        value={userStats.totalUsers || 0}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<Schedule />}
                        title="Total Sessions"
                        value={userStats.totalSessions || 0}
                        subtitle={`Avg: ${Math.round(userStats.averageSessionTime || 0)} min`}
                        color="secondary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<Assignment />}
                        title="Annotations"
                        value={userStats.totalAnnotations || 0}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<Label />}
                        title="Tags Created"
                        value={userStats.totalTags || 0}
                        color="info"
                    />
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Filter by User</InputLabel>
                            <Select
                                value={selectedUser}
                                label="Filter by User"
                                onChange={(e) => setSelectedUser(e.target.value)}
                                startAdornment={<FilterList color="action" sx={{ mr: 1 }} />}
                            >
                                <MenuItem value="">All Users</MenuItem>
                                {usersList.map(user => (
                                    <MenuItem key={user} value={user}>
                                        {user}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Start Date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="End Date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="contained"
                                onClick={applyFilters}
                                startIcon={<FilterList />}
                                fullWidth
                            >
                                Apply
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={resetFilters}
                                fullWidth
                            >
                                Reset
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Actions Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    User Sessions ({filteredSessions.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={exportToCSV}
                    >
                        Export CSV
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={fetchUserLogs}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {/* Sessions Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>User</strong></TableCell>
                            <TableCell><strong>Login Time</strong></TableCell>
                            <TableCell><strong>Logout Time</strong></TableCell>
                            <TableCell><strong>Duration</strong></TableCell>
                            <TableCell><strong>Tasks Completed</strong></TableCell>
                            <TableCell><strong>Annotations</strong></TableCell>
                            <TableCell><strong>Tags</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            Array.from(new Array(5)).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton variant="text" /></TableCell>
                                    <TableCell><Skeleton variant="text" /></TableCell>
                                    <TableCell><Skeleton variant="text" /></TableCell>
                                    <TableCell><Skeleton variant="text" /></TableCell>
                                    <TableCell><Skeleton variant="text" /></TableCell>
                                    <TableCell><Skeleton variant="text" /></TableCell>
                                    <TableCell><Skeleton variant="text" /></TableCell>
                                    <TableCell><Skeleton variant="text" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredSessions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    <Alert severity="info">
                                        No user sessions found for the selected criteria.
                                    </Alert>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSessions.map((session, index) => {
                                const annotations = session.tasksDone?.filter(task => 
                                    task.includes('annotated') || task.includes('Annotation')
                                ).length || 0;
                                
                                const tags = session.tasksDone?.filter(task => 
                                    task.includes('tag') || task.includes('Tag')
                                ).length || 0;

                                return (
                                    <TableRow key={session.id || index} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Person sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Typography variant="body2" fontWeight="medium">
                                                    {session.username}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <CalendarToday sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                                                {session.loginTimeIST}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {session.logoutTimeIST || (
                                                <Chip label="Active" color="success" size="small" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDuration(session.loginTimeIST, session.logoutTimeIST)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={session.tasksDone?.length || 0} 
                                                size="small" 
                                                variant="outlined" 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={annotations} 
                                                color="success" 
                                                size="small" 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={tags} 
                                                color="info" 
                                                size="small" 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title="View Session Details">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => viewSessionDetails(session)}
                                                    color="primary"
                                                >
                                                    <Visibility />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Session Details Dialog */}
            <Dialog 
                open={detailDialogOpen} 
                onClose={() => setDetailDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Session Details - {selectedSession?.username}
                </DialogTitle>
                <DialogContent>
                    {selectedSession && (
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Login Time
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    {selectedSession.loginTimeIST}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Logout Time
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    {selectedSession.logoutTimeIST || 'Active Session'}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Session Duration
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    {formatDuration(selectedSession.loginTimeIST, selectedSession.logoutTimeIST)}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Total Tasks
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    {selectedSession.tasksDone?.length || 0}
                                </Typography>
                            </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Tasks Completed
                                    </Typography>
                                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                        {selectedSession.tasksDone?.length > 0 ? (
                                            selectedSession.tasksDone.map((task, index) => (
                                                <Box
                                                    key={index}
                                                    sx={{
                                                        p: 1,
                                                        mb: 1,
                                                        bgcolor: 'background.default',
                                                        borderRadius: 1,
                                                        border: '1px solid',
                                                        borderColor: 'divider'
                                                    }}
                                                >
                                                    <Typography variant="body2">
                                                        {task}
                                                    </Typography>
                                                </Box>
                                            ))
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                                No tasks recorded for this session.
                                            </Typography>
                                        )}
                                    </Box>
                                </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialogOpen(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
        </Box>
    );
}