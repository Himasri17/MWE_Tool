import React, { useState, useEffect } from 'react';

import { useNavigate, Link } from 'react-router-dom';

import {

    Container, Box, Typography, Card, CardContent, Grid, CircularProgress, Alert, Button, Chip,

    List // Ensure List is imported

} from '@mui/material';

import RateReviewIcon from '@mui/icons-material/RateReview';

import AssignmentIcon from '@mui/icons-material/Assignment';

import PeopleIcon from '@mui/icons-material/People';



const getReviewerUsername = () => localStorage.getItem('username') || 'reviewer@example.com';



export default function ReviewerDashboard() {

    const navigate = useNavigate();

    const reviewerUsername = getReviewerUsername();

   

    const [projects, setProjects] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState('');



    useEffect(() => {

        fetchProjects();

    }, []);



    const fetchProjects = async () => {

        setLoading(true);

        setError('');

        try {

            // Fetch projects that have any annotated work

            const response = await fetch(`http://127.0.0.1:5001/api/projects`);

            const data = await response.json();



            if (!response.ok) throw new Error(data.error || 'Failed to fetch projects');

           

            const reviewableProjects = data.filter(p => p.annotated_count > 0);

           

            const projectsWithUsers = await Promise.all(

                reviewableProjects.map(async (project) => {

                    const userResponse = await fetch(`http://127.0.0.1:5001/api/projects/${project.id}/users_and_progress`);

                    const userData = await userResponse.json();

                   

                    // Filter to only show users who have completed *some* annotation

                    const usersToReview = userData.users.filter(u => u.completed > 0);

                   

                    return { ...project, usersToReview };

                })

            );



            setProjects(projectsWithUsers);

        } catch (err) {

            console.error("Reviewer Dashboard Error:", err);

            setError('Failed to load reviewable projects. Check API connectivity.');

        } finally {

            setLoading(false);

        }

    };

   

    const handleReviewClick = (projectId, targetUsername) => {

        // Navigate to the detailed review panel

        navigate(`/reviewer/${reviewerUsername}/project/${projectId}/user/${targetUsername}`);

    };



    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    if (error) return <Alert severity="error" sx={{ mt: 5 }}>{error}</Alert>;

    if (projects.length === 0) return <Typography align="center" variant="h6" sx={{ mt: 5 }}>No projects found with annotated work requiring review.</Typography>;



    return (

        <Container component="main" maxWidth="lg" sx={{ mt: 4 }}>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>

                <RateReviewIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />

                <Typography variant="h4" component="h1" fontWeight="bold" color="primary">

                    Reviewer Dashboard

                </Typography>

            </Box>



            <Grid container spacing={4}>

                {projects.map((project) => (

                    <Grid item xs={12} md={6} key={project.id}>

                        <Card elevation={4}>

                            <CardContent>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>

                                    <Typography variant="h5" component="div" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>

                                        <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} /> {project.name}

                                    </Typography>

                                    <Chip label={`${project.annotated_count}/${project.total_sentences} done`} color="success" variant="outlined" size="small" />

                                </Box>

                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>

                                    {project.description || 'No description provided.'} (Language: {project.language})

                                </Typography>



                                <Box sx={{ mt: 2 }}>

                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>

                                        <PeopleIcon sx={{ mr: 1 }} />Annotators Ready for Review ({project.usersToReview.length})

                                    </Typography>

                                   

                                    {project.usersToReview.length === 0 && (

                                        <Typography variant="body2" color="text.secondary" sx={{ ml: 3, mt: 1 }}>No completed work yet.</Typography>

                                    )}



                                    <List dense disablePadding sx={{ mt: 1 }}>

                                        {project.usersToReview.map((user) => (

                                            <Box key={user.username} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px dashed #eee' }}>

                                                <Typography variant="body2">{user.username}</Typography>

                                                <Button

                                                    size="small"

                                                    variant="contained"

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

                ))}

            </Grid>

        </Container>

    );

}