import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Box, Typography, Card, CardContent, Grid, CircularProgress, Alert, Button, Chip,
    List, ListItem, Divider, useTheme, LinearProgress
} from '@mui/material';

import RateReviewIcon from '@mui/icons-material/RateReview';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { getAuthHeaders, removeToken, getToken } from '../../components/authUtils'; 

const PASTEL_BLUE_ACCENT_HEX = '#90CAF9';

// Helper function to get the reviewer's username (email)
const getReviewerUsername = () => { 
    const reviewerEmail = localStorage.getItem('username') || 'reviewer@example.com';
    return reviewerEmail;
} 

// Real function to fetch reviewer-specific stats from backend
const fetchReviewerStats = async (username) => {
    try {
        const response = await fetch('http://127.0.0.1:5001/api/analytics/reviewer-stats', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch reviewer statistics');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching reviewer stats:', error);
        // Return default values if API fails
        return {
            totalProjects: 0,
            totalSentencesReviewed: 0,
            pendingReviews: 0,
            reviewAccuracy: 0
        };
    }
};

const calculatePendingReviews = (projects) => {
    let totalPending = 0;
    console.log("Calculating pending reviews from projects:", projects);
    
    projects.forEach(project => {
        console.log(`Project: ${project.name}, Users:`, project.usersToReview);
        project.usersToReview.forEach(user => {
            // FIXED: Use completed (annotated) minus reviewed
            const annotatedCount = user.completed || 0;
            const reviewedCount = user.reviewed || 0;
            const pendingReview = Math.max(0, annotatedCount - reviewedCount);
            totalPending += pendingReview;
            
            console.log(`User ${user.username}: ${annotatedCount} annotated, ${reviewedCount} reviewed, ${pendingReview} pending`);
        });
    });
    
    console.log(`Total pending reviews calculated: ${totalPending}`);
    return totalPending;
};

export default function ReviewerDashboard() {
    const navigate = useNavigate();
    const reviewerUsername = getReviewerUsername();
    const theme = useTheme(); 
    
    const [projects, setProjects] = useState([]);
    const [reviewerStats, setReviewerStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- Data Fetching Logic ---
    const fetchProjectsAndStats = useCallback(async () => {
        setLoading(true);
        setError('');
        
        try {
            // 1. Fetch Reviewable Projects first
            const response = await fetch(`http://127.0.0.1:5001/api/projects`, {
                headers: getAuthHeaders() 
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to fetch projects');
            
            const reviewableProjects = data.filter(p => p.annotated_count > 0);
            
            const projectsWithUsers = await Promise.all(
                reviewableProjects.map(async (project) => {
                    try {
                        const userResponse = await fetch(
                            `http://127.0.0.1:5001/api/projects/${project.id}/users_and_progress`,
                            { headers: getAuthHeaders() }
                        );
                        const userData = await userResponse.json();
                        
                        // Filter to only show users who have completed *some* annotation (completed > 0)
                        const usersToReview = userData.users.filter(u => u.completed > 0);
                        
                        return { ...project, usersToReview };
                    } catch (err) {
                        console.error(`Error fetching users for project ${project.id}:`, err);
                        return { ...project, usersToReview: [] };
                    }
                })
            );

            const filteredProjects = projectsWithUsers.filter(p => p.usersToReview.length > 0);
            setProjects(filteredProjects);

            // 2. Calculate real statistics based on actual data
            const totalProjects = filteredProjects.length;
            const pendingReviews = calculatePendingReviews(filteredProjects);
            
            // 3. Fetch additional reviewer stats from backend
            const backendStats = await fetchReviewerStats(reviewerUsername);
            
            // Combine calculated stats with backend stats
            const realStats = {
                totalProjects: totalProjects,
                totalSentencesReviewed: backendStats.totalSentencesReviewed || 0,
                pendingReviews: pendingReviews,
                reviewAccuracy: backendStats.reviewAccuracy || 0
            };
            
            setReviewerStats(realStats);

        } catch (err) {
            console.error("Reviewer Dashboard Error:", err);
            if (err.message.includes('401') || err.message.includes('403')) {
                handleUnauthorized();
                return;
            }
            setError('Failed to load reviewable projects. Check API connectivity.');
        } finally {
            setLoading(false);
        }
    }, [reviewerUsername]);

    useEffect(() => {
        fetchProjectsAndStats();

        const interval = setInterval(() => {
            fetchProjectsAndStats();
        }, 30000); 

        return () => clearInterval(interval);
    }, [fetchProjectsAndStats]); 
    
    // --- Handlers ---
    const handleUnauthorized = () => {
        removeToken();
        localStorage.removeItem('username');
        navigate('/login');
    };

    const handleReviewClick = (projectId, targetUsername) => {
        navigate(`/reviewer/${reviewerUsername}/project/${projectId}/user/${targetUsername}`);
    };
    
    const handleLogout = async () => {
        try {
            const token = getToken(); 
            const reviewerEmail = localStorage.getItem('username');
            
            if (token && reviewerEmail) {
                await fetch('http://127.0.0.1:5001/logout', {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ username: reviewerEmail }),
                });
            } 
        } catch (error) {
            console.error('❌ Logout error:', error);
        } finally {
            localStorage.removeItem('username');
            removeToken(); 
            navigate("/login");
        }
    };

    // --- Component Rendering ---
    if (loading) {
        return (
             <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', 
                    bgcolor: theme.palette.primary.main, color: 'white', p: 2, width: '100%', boxSizing: 'border-box'
                }}>
                    <Typography variant="h6" fontWeight={500}>Multiword Expression Workbench</Typography>
                    <CircularProgress size={20} color="inherit" />
                </Box>
                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <CircularProgress />
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', width: '100vw', margin: 0, padding: 0 }}>
            
            {/* TOP NAVIGATION BAR */}
            <Box sx={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', 
                bgcolor: theme.palette.primary.main, color: 'white', p: 2, width: '100%', boxSizing: 'border-box',
                flexShrink: 0
            }}>
                <Typography variant="h6" fontWeight={500}>Multiword Expression Workbench</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> 
                    <Typography variant="body1" sx={{ color: 'white', mr: 2 }}>
                        Welcome, {reviewerUsername}
                    </Typography>
                    <Button 
                        variant="outlined" 
                        size="small" 
                        sx={{ color: 'white', borderColor: 'white' }} 
                        onClick={handleLogout}
                    >
                        LOG OUT
                    </Button>
                </Box>
            </Box>
            {/* END TOP NAVIGATION BAR */}

            <Container component="main" maxWidth="xl" sx={{ mt: 4, flexGrow: 1 }}>
                
                {/* HEADER AND OVERALL STATS (100% Width Focus) */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <RateReviewIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                        <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
                            Reviewer Dashboard
                        </Typography>
                    </Box>
                </Box>

                {/* --- PROFESSIONAL PROGRESS BAR SECTION (100% WIDTH) --- */}
                {reviewerStats && (
                    <Card elevation={2} sx={{ mb: 4, bgcolor: theme.palette.grey[50], borderLeft: `5px solid ${theme.palette.primary.main}` }}>
                        <CardContent>
                            <Grid container spacing={3} alignItems="center">
                                {/* Total Projects */}
                                <Grid item xs={12} sm={3}>
                                    <Typography variant="subtitle2" color="text.secondary">Total Projects</Typography>
                                    <Typography variant="h5" fontWeight="bold" color="primary">
                                        {reviewerStats.totalProjects}
                                    </Typography>
                                </Grid>

                                {/* Total Reviewed */}
                                <Grid item xs={12} sm={3}>
                                    <Typography variant="subtitle2" color="text.secondary">Total Sentences Reviewed</Typography>
                                    <Typography variant="h5" fontWeight="bold" color="success.main">
                                        {reviewerStats.totalSentencesReviewed}
                                    </Typography>
                                </Grid>

                                {/* Pending Reviews */}
                                <Grid item xs={12} sm={3}>
                                    <Typography variant="subtitle2" color="text.secondary">Pending Review Assignments</Typography>
                                    <Typography variant="h5" fontWeight="bold" color="warning.main">
                                        {reviewerStats.pendingReviews}
                                    </Typography>
                                </Grid>

                                {/* Review Accuracy */}
                                <Grid item xs={12} sm={3}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                        <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} /> Review Accuracy
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="primary.dark">
                                        {reviewerStats.reviewAccuracy}%
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                )}
                
                {/* --- PROJECT LIST SECTION --- */}
                <Typography variant="h5" component="h2" fontWeight="bold" sx={{ mb: 2, mt: 3 }}>
                    Projects Requiring Review ({projects.length})
                </Typography>

                {error && (<Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>)}
                
                {projects.length === 0 && !loading && (
                    <Alert severity="success" icon={<AssignmentTurnedInIcon />}>
                        <Typography variant="h6">All set! You have no pending review assignments right now.</Typography>
                        <Typography variant="body2">Check back later or refresh the page to see new annotated data.</Typography>
                    </Alert>
                )}

                <Grid container spacing={3}>
                    {projects.map((project) => {
                        const doneCount = project.annotated_count || 0;
                        const totalCount = project.total_sentences || 0;
                        const overallProgress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
                        
                        return (
                            <Grid item xs={12} xl={6} key={project.id}>
                                <Card elevation={4} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                        
                                        {/* Project Header and Overall Progress Bar */}
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="h5" component="div" fontWeight="bold" color="text.primary" gutterBottom>
                                                {project.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                Language: {project.language} | Total Sentences: {totalCount}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={overallProgress} 
                                                    sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                                                    color={overallProgress === 100 ? 'success' : 'primary'}
                                                />
                                                <Chip 
                                                    label={`${Math.round(overallProgress)}% Done`} 
                                                    color={overallProgress === 100 ? 'success' : 'primary'}
                                                    size="small"
                                                    sx={{ minWidth: 80 }}
                                                />
                                            </Box>
                                        </Box>

                                        <Divider sx={{ mb: 3 }} />

                                        {/* Annotator Review List */}
                                        <Typography variant="subtitle1" fontWeight="bold" color="primary.dark" sx={{ mb: 2 }}>
                                            Annotators with Completed Work ({project.usersToReview.length})
                                        </Typography>
                                        
                                        <List dense disablePadding sx={{ 
                                            border: `1px solid ${theme.palette.grey[200]}`, 
                                            borderRadius: 1,
                                            maxHeight: 400,
                                            overflow: 'auto'
                                        }}>
                                            {project.usersToReview.map((user, index) => {
                                                const reviewedSentences = user.reviewed || 0;
                                                const pendingReview = user.completed - reviewedSentences;
                                                const reviewProgress = user.completed > 0 ? (reviewedSentences / user.completed) * 100 : 0;

                                                return (
                                                    <ListItem
                                                        key={user.username}
                                                        divider={index < project.usersToReview.length - 1}
                                                        sx={{
                                                            bgcolor: pendingReview > 0 ? PASTEL_BLUE_ACCENT_HEX + '20' : 'white',
                                                            py: 2,
                                                            px: 2,
                                                            alignItems: 'flex-start',
                                                            flexWrap: 'wrap', // ensures responsiveness
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                                                            <Typography variant="body1" fontWeight="500" noWrap>
                                                                {user.username}
                                                            </Typography>
                                                            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                                                                {user.completed} Sentences Annotated • {pendingReview} Pending Review
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={reviewProgress}
                                                                    sx={{ flexGrow: 1, height: 8, borderRadius: 5 }}
                                                                    color={reviewProgress === 100 ? 'success' : 'warning'}
                                                                />
                                                                <Typography variant="caption" fontWeight="bold" sx={{ minWidth: 45 }}>
                                                                    {Math.round(reviewProgress)}%
                                                                </Typography>
                                                            </Box>
                                                        </Box>

                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color={pendingReview > 0 ? 'warning' : 'success'}
                                                            onClick={() => handleReviewClick(project.id, user.username)}
                                                            sx={{
                                                                textTransform: 'none',
                                                                minWidth: 140,
                                                                mt: { xs: 2, sm: 0 }, // moves button below text on small screens
                                                                alignSelf: 'center',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                            disabled={pendingReview === 0}
                                                        >
                                                            {pendingReview > 0 ? `Review ${pendingReview}` : 'Fully Reviewed'}
                                                        </Button>
                                                    </ListItem>

                                                );
                                            })}
                                        </List>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            </Container>
        </Box>
    );
}