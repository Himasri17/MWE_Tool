import React, { useState, useEffect ,useCallback} from 'react';

import { useNavigate,  } from 'react-router-dom';

import {
    Container, Box, Typography, Card, CardContent, Grid, CircularProgress, Alert, Button, Chip,
    List, // Ensure List is imported
    // Import for clean layout/design elements
    Divider,
    useTheme,
} from '@mui/material';

import RateReviewIcon from '@mui/icons-material/RateReview';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {  getAuthHeaders, removeToken ,getToken} from '../../components/authUtils'; 



const getReviewerUsername = () => { 
    // Return the full email as that's what's used as username in the backend
    const reviewerEmail = localStorage.getItem('username') || 'reviewer@example.com';
    console.log('Reviewer email from localStorage:', reviewerEmail);
    return reviewerEmail; // Return the full email, not just the username part
}   

export default function ReviewerDashboard() {
    const navigate = useNavigate();
    const reviewerUsername = getReviewerUsername();
    const theme = useTheme(); 
    
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`http://127.0.0.1:5001/api/projects`, {
                headers: getAuthHeaders() // Add auth headers
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to fetch projects');
            
            // Filter to include only projects with annotated sentences
            const reviewableProjects = data.filter(p => p.annotated_count > 0);
            
            const projectsWithUsers = await Promise.all(
                reviewableProjects.map(async (project) => {
                    const userResponse = await fetch(
                        `http://127.0.0.1:5001/api/projects/${project.id}/users_and_progress`,
                        { headers: getAuthHeaders() }
                    );
                    const userData = await userResponse.json();
                    
                    // Filter to only show users who have completed *some* annotation (progress > 0)
                    const usersToReview = userData.users.filter(u => u.completed > 0);
                    
                    return { ...project, usersToReview };
                })
            );

            // Filter out projects that have no users with completed work
            setProjects(projectsWithUsers.filter(p => p.usersToReview.length > 0));

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
    }, []);

    const handleUnauthorized = () => {
        removeToken();
        localStorage.removeItem('username');
        navigate('/login');
    };

    useEffect(() => {
        // Initial load
        fetchProjects();

        const interval = setInterval(() => {
            fetchProjects();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [fetchProjects]); 

    
    const handleReviewClick = (projectId, targetUsername) => {
        // Navigate to the detailed review panel
        navigate(`/reviewer/${reviewerUsername}/project/${projectId}/user/${targetUsername}`);
    };
    
    const handleLogout = async () => {
        try {
            const token = getToken(); // Use getToken from authUtils
            const reviewerEmail = localStorage.getItem('username');
            
            console.log('🔐 Logout Debug - Before API call:', { 
                token: token ? 'Present' : 'Missing', 
                reviewerEmail 
            });

            if (token && reviewerEmail) {
                // Call logout API to record the logout action
                const response = await fetch('http://127.0.0.1:5001/logout', {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        username: reviewerEmail
                    }),
                });

                console.log('🔐 Logout API Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('🔐 Logout API Success:', data);
                } else {
                    console.error('🔐 Logout API Failed:', await response.text());
                }
            } else {
                console.warn('🔐 Missing token or username for logout');
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
        } finally {
            // Always cleanup and redirect - USE removeToken from authUtils
            console.log('🧹 Cleaning up localStorage...');
            localStorage.removeItem('username');
            removeToken(); // Use the function from authUtils
            navigate("/login");
        }
    };

    // --- Loading, Error, Empty State Rendering ---
    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                {/* Placeholder Nav Bar while loading */}
                <Box sx={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', 
                    bgcolor: theme.palette.primary.main, color: 'white', p: 2, width: '100%', boxSizing: 'border-box'
                }}>
                    <Typography variant="h6" fontWeight={500}>Multiword Expression Workbench</Typography>
                    <CircularProgress size={20} color="inherit" />
                </Box>
                {/* Loading Indicator */}
                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <CircularProgress />
                </Box>
            </Box>
        );
    }

    if (error) return <Alert severity="error" sx={{ mt: 5 }}>{error}</Alert>;
    

    // --- Main Component Rendering ---
    return (
        <Box sx={{ minHeight: '100vh', width: '100vw', margin: 0, padding: 0 }}>
            
            {/* TOP NAVIGATION BAR (INTEGRATED) */}
            <Box sx={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', 
                bgcolor: theme.palette.primary.main, color: 'white', p: 2, width: '100%', boxSizing: 'border-box',
                flexShrink: 0 // Prevents the header from shrinking
            }}>
                <Typography variant="h6" fontWeight={500}>Multiword Expression Workbench</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> 
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

            <Container component="main" maxWidth="lg" sx={{ mt: 4, flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                    <RateReviewIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                    <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
                        Reviewer Dashboard
                    </Typography>
                </Box>
                
                {projects.length === 0 && (
                    <Alert severity="info">
                        <Typography variant="h6">No reviewable projects found.</Typography>
                        <Typography variant="body2">All projects are either unannotated or all annotated assignments have been reviewed.</Typography>
                    </Alert>
                )}


                <Grid container spacing={4}>
                    {projects.map((project) => {
                        const doneCount = project.annotated_count || 0;
                        const totalCount = project.total_sentences || 0;
                     
                        return (
                            <Grid item xs={12} md={6} key={project.id}>
                                <Card elevation={4} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        
                                        {/* Project Header (Cleaner look, inspired by Admin UI) */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                            <Typography variant="h5" component="div" fontWeight="bold" color="text.primary">
                                                {project.name}
                                            </Typography>
                                            <Chip 
                                                label={`${doneCount}/${totalCount} done`} 
                                                color="success" 
                                                variant="outlined" 
                                                size="small"
                                                icon={<CheckCircleOutlineIcon fontSize="small" />}
                                            />
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Language: {project.language} | Description: {project.description || 'N/A'}
                                        </Typography>
                                        
                                        <Divider sx={{ mb: 2 }} />

                                        {/* Annotator Review Section */}
                                        <Box sx={{ mt: 2 }}>
                                            
                                            
                                            <List dense disablePadding sx={{ mt: 1 }}>
                                                {project.usersToReview.map((user) => (
                                                    <Box 
                                                        key={user.username} 
                                                        sx={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center', 
                                                            p: 1, 
                                                            borderBottom: '1px dashed #eee',
                                                            '&:last-child': { borderBottom: 'none' }
                                                        }}
                                                    >
                                                        <Typography variant="body2" fontWeight="500">{user.username}</Typography>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="primary"
                                                            onClick={() => handleReviewClick(project.id, user.username)}
                                                            sx={{ textTransform: 'none' }}
                                                        >
                                                            Review {user.completed} Sentences
                                                        </Button>
                                                    </Box>
                                                ))}
                                            </List>
                                        </Box>
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