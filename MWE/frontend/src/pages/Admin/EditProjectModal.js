import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Typography, FormControl, FormLabel, 
    RadioGroup, FormControlLabel, Radio, Grid, IconButton, 
    useTheme, CircularProgress, MenuItem, Select, InputLabel,
    Chip, Box, Alert, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { getAuthHeaders } from '../../components/authUtils';

const LANGUAGE_OPTIONS = [
    'Bangla', 'Maithili', 'Konkani',
    'Marathi', 'Nepali', 'Bodo',
    'Hindi', 'Manipuri', 'Assamese'
];

export default function EditProjectModal({ 
    isOpen, 
    onClose, 
    project, 
    adminUsername, 
    onProjectUpdated 
}) {
    const theme = useTheme();
    
    // Form State
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [language, setLanguage] = useState('');
    const [availableUsers, setAvailableUsers] = useState([]);
    const [currentAssignedUsers, setCurrentAssignedUsers] = useState([]);
    const [selectedNewUsers, setSelectedNewUsers] = useState([]);
    const [usersToRemove, setUsersToRemove] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize form with project data
    useEffect(() => {
        if (project && isOpen) {
            setProjectName(project.name || '');
            setProjectDescription(project.description || '');
            setLanguage(project.language || '');
            setCurrentAssignedUsers(project.assigned_users || [project.assigned_user].filter(Boolean));
            setSelectedNewUsers([]);
            setUsersToRemove([]);
            fetchAvailableUsers();
            fetchCurrentAssignedUsers(project.id);
        }
    }, [project, isOpen]);

    const fetchAvailableUsers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://127.0.0.1:5001/api/users-list', {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const users = await response.json();
                setAvailableUsers(users);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCurrentAssignedUsers = async (projectId) => {
        try {
            const response = await fetch(`http://127.0.0.1:5001/api/projects/${projectId}/users_and_progress`, {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setCurrentAssignedUsers(data.users.map(user => user.username));
            }
        } catch (error) {
            console.error('Error fetching assigned users:', error);
        }
    };

    const handleClose = () => {
        setProjectName('');
        setProjectDescription('');
        setLanguage('');
        setSelectedNewUsers([]);
        setUsersToRemove([]);
        setError('');
        setIsSubmitting(false);
        onClose();
    };

    const handleUserRemove = (username) => {
        setUsersToRemove(prev => [...prev, username]);
        setCurrentAssignedUsers(prev => prev.filter(user => user !== username));
    };

    const handleUserAdd = (username) => {
        setSelectedNewUsers(prev => [...prev, username]);
        setAvailableUsers(prev => prev.filter(user => user !== username));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!projectName.trim()) {
            setError('Project name is required.');
            return;
        }

        setIsSubmitting(true);

        try {
            const updateData = {
                name: projectName.trim(),
                description: projectDescription.trim(),
                language: language,
                adminUsername: adminUsername,
                assigned_users: selectedNewUsers,
                users_to_remove: usersToRemove
            };

            const response = await fetch(`http://127.0.0.1:5001/api/projects/${project.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(updateData),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Project update failed.');
                return;
            }

            onProjectUpdated();
            handleClose();
        } catch (err) {
            console.error("Network Error:", err);
            setError('Network failed. Could not reach the server.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const availableUsersForAssignment = availableUsers.filter(
        user => !currentAssignedUsers.includes(user) && !selectedNewUsers.includes(user)
    );

    return (
        <Dialog 
            open={isOpen} 
            onClose={handleClose} 
            maxWidth="md" 
            fullWidth
            PaperProps={{ component: 'form', onSubmit: handleSubmit }}
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                bgcolor: theme.palette.primary.main, 
                color: 'white' 
            }}>
                Edit Project
                <IconButton onClick={handleClose} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            
            <DialogContent dividers sx={{ p: 4 }}>
                <Grid container spacing={3}>
                    {/* Project Details */}
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            Project Details
                        </Typography>
                        <TextField
                            required
                            fullWidth
                            label="Project Name"
                            variant="outlined"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            sx={{ mb: 2 }}
                            disabled={isSubmitting}
                        />
                        <TextField
                            fullWidth
                            label="Project Description"
                            variant="outlined"
                            multiline
                            rows={3}
                            value={projectDescription}
                            onChange={(e) => setProjectDescription(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </Grid>

                    {/* Language Selection */}
                    <Grid item xs={12}>
                        <FormControl component="fieldset" required fullWidth>
                            <FormLabel component="legend" sx={{ mb: 1 }}>Language</FormLabel>
                            <RadioGroup row name="language-selection" value={language} onChange={(e) => setLanguage(e.target.value)}>
                                <Grid container spacing={1}>
                                    {LANGUAGE_OPTIONS.map((lang) => (
                                        <Grid item xs={4} key={lang}>
                                            <FormControlLabel 
                                                value={lang} 
                                                control={<Radio size="small" />} 
                                                label={<Typography variant="body2">{lang}</Typography>} 
                                                disabled={isSubmitting} 
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </RadioGroup>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                    </Grid>

                    {/* User Management */}
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            User Assignment
                        </Typography>
                        
                        {/* Current Assigned Users */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Currently Assigned Users
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {currentAssignedUsers.map((user) => (
                                    <Chip
                                        key={user}
                                        label={user}
                                        onDelete={() => handleUserRemove(user)}
                                        color="primary"
                                        variant="outlined"
                                    />
                                ))}
                                {currentAssignedUsers.length === 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                        No users currently assigned
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        {/* Add New Users */}
                        <Box>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel id="add-user-label">Add Users</InputLabel>
                                <Select
                                    labelId="add-user-label"
                                    value=""
                                    label="Add Users"
                                    onChange={(e) => handleUserAdd(e.target.value)}
                                    disabled={isSubmitting || isLoading || availableUsersForAssignment.length === 0}
                                >
                                    {availableUsersForAssignment.map((user) => (
                                        <MenuItem key={user} value={user}>
                                            {user}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            
                            {/* Newly Selected Users */}
                            {selectedNewUsers.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Users to be added:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {selectedNewUsers.map((user) => (
                                            <Chip
                                                key={user}
                                                label={user}
                                                onDelete={() => {
                                                    setSelectedNewUsers(prev => prev.filter(u => u !== user));
                                                    setAvailableUsers(prev => [...prev, user]);
                                                }}
                                                color="success"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Grid>
                    
                    {error && (
                        <Grid item xs={12}>
                            <Alert severity="error" sx={{ mt: 1 }}>
                                {error}
                            </Alert>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
                <Button onClick={handleClose} variant="outlined" color="error" disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary" 
                    endIcon={<SaveIcon />} 
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}