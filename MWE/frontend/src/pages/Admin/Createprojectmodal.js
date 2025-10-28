import React, { useState, useEffect} from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Typography,
    FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
    Grid, IconButton, useTheme, CircularProgress, MenuItem, Select, InputLabel
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { getAuthHeadersMultipart, getAuthHeaders } from '../../components/authUtils'; 

// Visually hidden input for file upload
const VisuallyHiddenInput = (props) => (
    <input type="file" style={{ clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', height: 1, overflow: 'hidden', position: 'absolute', bottom: 0, left: 0, whiteSpace: 'nowrap', width: 1 }} {...props} />
);

// Define the available languages (Based on previous context)
const LANGUAGE_OPTIONS = [
    'Bangla', 'Maithili', 'Konkani',
    'Marathi', 'Nepali', 'Bodo',
    'Hindi', 'Manipuri', 'Assamese'
];

export default function CreateProjectModal({ isOpen, onClose, adminUsername, onProjectCreated }) {
    const theme = useTheme();
    
    // --- Form State ---
    const [projectTitle, setProjectTitle] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [language, setLanguage] = useState('');
    const [assignedUser, setAssignedUser] = useState('');
    const [availableUsers, setAvailableUsers] = useState([]); 
    const [textFile, setTextFile] = useState(null);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false); 

    useEffect(() => {
        if (isOpen) {
            fetchAvailableUsers();
        }
    }, [isOpen]);

    // NEW: Function to fetch available users
    const fetchAvailableUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await fetch('http://127.0.0.1:5001/api/users-list', {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const users = await response.json();
                setAvailableUsers(users);
            } else {
                console.error('Failed to fetch users');
                setAvailableUsers([]);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setAvailableUsers([]);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleClose = () => {
        setProjectTitle('');
        setProjectDescription('');
        setLanguage('');
        setAssignedUser(''); 
        setTextFile(null);
        setError('');
        setIsSubmitting(false);
        onClose();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        
        if (!projectTitle.trim() || !projectDescription.trim() || !language || !textFile) {
            setError('All fields (Title, Description, Language, and File) are required.');
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('file', textFile);
        formData.append('projectName', projectTitle.trim());
        formData.append('projectDescription', projectDescription.trim()); 
        formData.append('language', language);
        formData.append('assignedUser', assignedUser); 
        formData.append('adminUsername', adminUsername);

        // Debug: Log what we're sending
        console.log('📤 Sending FormData with fields:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value);
        }
        console.log('🔐 Token being sent:', localStorage.getItem('jwt_token'));

        try {
            const response = await fetch('http://127.0.0.1:5001/api/projects', {
                method: 'POST',
                headers: getAuthHeadersMultipart(),
                body: formData,
            });

            console.log('📦 Response status:', response.status, response.statusText);

            // Check if it's an auth error first
            if (response.status === 401 || response.status === 403) {
                const errorText = await response.text();
                console.error('🔒 Auth error details:', errorText);
                setError('Authentication failed. Please try logging in again.');
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Project creation failed due to a server error.');
                console.error("Backend Error:", data.error);
                return;
            }

            // Success feedback
            alert(data.message);
            onProjectCreated(); // Trigger dashboard refresh and close modal
        } catch (err) {
            console.error("Network Error:", err);
            setError('Network failed. Could not reach the server.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog 
            open={isOpen} 
            onClose={handleClose} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{ component: 'form', onSubmit: handleSubmit }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: theme.palette.primary.main, color: 'white' }}>
                Add Project
                <IconButton onClick={handleClose} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            
            <DialogContent dividers sx={{ p: 4 }}>
                <Grid container spacing={3}>
                    {/* --- TEXT INPUTS --- */}
                    <Grid xs={12}>
                        <TextField
                            required fullWidth label="Project Title" variant="outlined"
                            value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} sx={{ mb: 2 }} disabled={isSubmitting}
                        />
                        <TextField
                            required fullWidth label="Project Description" variant="outlined" multiline rows={2}
                            value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} disabled={isSubmitting}
                        />
                    </Grid>

                    {/* --- LANGUAGE SELECTION --- */}
                    <Grid xs={12}>
                        <FormControl component="fieldset" required fullWidth>
                            <FormLabel component="legend" sx={{ mb: 1 }}>Language</FormLabel>
                            <RadioGroup row name="language-selection" value={language} onChange={(e) => setLanguage(e.target.value)}>
                                <Grid container spacing={1}>
                                    {LANGUAGE_OPTIONS.map((lang) => (
                                        <Grid xs={4} key={lang}>
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
                        <FormControl fullWidth required>
                            <InputLabel id="assigned-user-label">Assign To User</InputLabel>
                            <Select
                                labelId="assigned-user-label"
                                value={assignedUser}
                                label="Assign To User"
                                onChange={(e) => setAssignedUser(e.target.value)}
                                disabled={isSubmitting || isLoadingUsers}
                            >
                                {isLoadingUsers ? (
                                    <MenuItem value="" disabled>Loading users...</MenuItem>
                                ) : availableUsers.length > 0 ? (
                                    availableUsers.map((user) => (
                                        <MenuItem key={user} value={user}>
                                            {user}
                                        </MenuItem>
                                    ))
                                ) : (
                                    <MenuItem value="" disabled>No users available</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    
                    {/* --- FILE UPLOAD --- */}
                    <Grid xs={12}>
                        <Button
                            component="label" variant="contained" color={textFile ? "secondary" : "primary"}
                            startIcon={<UploadFileIcon />} sx={{ mt: 1, py: 1.5, width: '100%' }} disabled={isSubmitting}
                        >
                            {textFile ? `File Selected: ${textFile.name}` : 'Upload Text File'}
                            <VisuallyHiddenInput type="file" onChange={(e) => setTextFile(e.target.files[0])} accept=".txt, .xml, .csv, .docx, .doc, .pdf" />
                        </Button>
                    </Grid>
                    
                    {error && (
                        <Grid xs={12}>
                            <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
                <Button onClick={handleClose} variant="outlined" color="error" disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="contained" color="success" endIcon={<SendIcon />} disabled={isSubmitting || !projectTitle}>
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}