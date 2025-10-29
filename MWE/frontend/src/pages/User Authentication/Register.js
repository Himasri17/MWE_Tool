import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container, Box, Typography, TextField, Button, Paper, Link as MuiLink,
    InputAdornment, IconButton, FormControl, InputLabel, Select, MenuItem, useTheme,
    CircularProgress
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import LanguageIcon from '@mui/icons-material/Language';
import GroupIcon from '@mui/icons-material/Group';
import BusinessIcon from '@mui/icons-material/Business';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import TermsDialog from './TermsDialog';

// IMPORT NEW COMPONENT
import ContactUsDialog from '../User/ContactUsDialog'; 

export default function Register() {
    // --- State Management ---
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [organization, setOrganization] = useState('');
    const [termsDialogOpen, setTermsDialogOpen] = useState(false);
    const [languages, setLanguages] = useState(''); 
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false); 
    const navigate = useNavigate();
    
    // RETAIN: Only the 'open' state is needed here to control the dialog
    const [isContactDialogOpen, setIsContactDialogOpen] = useState(false); // <--- ADD DIALOG STATE
    const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false); // <--- ADD DIALOG STATE
    
    const theme = useTheme();

    // --- Dropdown Options (UNCHANGED) ---
    const roleOptions = [{ value: 'user', label: 'Annotator/User' }, { value: 'admin', label: 'Admin' }, { value: 'reviewer', label: 'Reviewer' }];
    const languageOptions = ['English', 'Hindi', 'Marathi', 'Assamese', 'Boro', 'Nepali', 'Manipuri', 'Bangla', 'Maithili', 'Konkani'];
    const organizationOptions = [
        'NBU', 'DU', 'IITM', 'IITB', 'IIT BHU', 'GU', 'IIITH',
        'NIT Manipur', 'NIT Meghalaya', 'JNU', 'CDAC-Pune', 'Goa University'
    ];

    // --- Register Handler (UPDATED WITH LOADING) ---
    const handleRegister = async (event) => {
        event.preventDefault();
        setError(''); // Clear previous errors

        if (!fullName || !email || !password || !role || !organization) {
            setError("Please fill in all required fields.");
            return;
        }

        setIsLoading(true); // START LOADING

        try {
            const response = await fetch('http://127.0.0.1:5001/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName,
                    email,
                    password,
                    // CRITICAL: Ensure the role variable (which holds 'reviewer') is sent
                    role, 
                    organization,
                    // Ensure languages is sent as an array
                    languages: Array.isArray(languages) ? languages : [languages], 
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle HTTP errors (400, 403, etc.) returned by the backend
                const message = data.message || "Registration failed. Please try again.";
                setError(message);
                return;
            }

            // Success: Display success message and navigate to login
            alert(data.message);
            navigate('/login');

        } catch (err) {
            console.error("Network Error during registration:", err);
            setError("Network error. Could not connect to the registration service.");
        } finally {
            setIsLoading(false); // STOP LOADING
        }
    };
    
    // --- Password Visibility Handlers (UNCHANGED) ---
    const handleClickShowPassword = () => { setShowPassword(!showPassword); };
    const handleMouseDownPassword = (event) => { event.preventDefault(); };

    // --- DIALOG HANDLERS ---
    const handleOpenContactDialog = (e) => { 
        e.preventDefault(); // Prevent navigation/default link action
        setIsContactDialogOpen(true); 
    }; // <--- ADD OPEN HANDLER
    const handleCloseContactDialog = () => { setIsContactDialogOpen(false); };
    const handleOpenTermsDialog = (e) => { 
        e.preventDefault(); // Prevent navigation/default link action
        setIsTermsDialogOpen(true); 
    }; // <--- ADD OPEN HANDLER
    const handleCloseTermsDialog = () => { setIsTermsDialogOpen(false); }; 


    // --- JSX Render ---
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: theme.palette.grey[100], }}>
            
            <Container component="main" maxWidth="sm" sx={{ my: 4 }}>
                <Paper elevation={6} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: theme.shape.borderRadius * 2, borderTop: `5px solid ${theme.palette.secondary.main}`, }}>
                    <Typography component="h1" variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>Create an Account</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Please fill in all the required information to get started.</Typography>

                    <Box component="form" onSubmit={handleRegister} noValidate sx={{ width: '100%' }}>
                        {/* ... (All form fields: Full Name, Email, Password, Languages, Role, Organization - UNCHANGED) ... */}
                        
                        <TextField 
                            margin="normal" 
                            required 
                            fullWidth 
                            label="Full Name" 
                            variant="outlined" 
                            value={fullName} 
                            onChange={(e) => setFullName(e.target.value)} 
                            sx={{ mb: 2 }} 
                            InputProps={{ 
                                startAdornment: (<InputAdornment position="start"><PersonIcon color="action" /></InputAdornment>), 
                            }} 
                            disabled={isLoading}
                        />
                        <TextField 
                            margin="normal" 
                            required 
                            fullWidth 
                            label="Email" 
                            type="email" 
                            variant="outlined" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            sx={{ mb: 2 }} 
                            InputProps={{ 
                                startAdornment: (<InputAdornment position="start"><EmailIcon color="action" /></InputAdornment>), 
                            }} 
                            disabled={isLoading}
                        />
                        <TextField
                            margin="normal" 
                            required 
                            fullWidth 
                            label="Password" 
                            type={showPassword ? 'text' : 'password'} 
                            variant="outlined" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            sx={{ mb: 2 }}
                            InputProps={{ 
                                startAdornment: (<InputAdornment position="start"><LockIcon color="action" /></InputAdornment>), 
                                endAdornment: (<InputAdornment position="end"><IconButton onClick={handleClickShowPassword} onMouseDown={handleMouseDownPassword} edge="end" disabled={isLoading}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>), 
                            }}
                            disabled={isLoading}
                        />
                        
                        <FormControl fullWidth margin="normal" required sx={{ mb: 2 }}>
                            <InputLabel id="languages-label">Select Languages</InputLabel>
                            <Select 
                                labelId="languages-label" 
                                value={languages} 
                                onChange={(e) => setLanguages(e.target.value)} 
                                label="Select Languages"
                                startAdornment={<InputAdornment position="start"><LanguageIcon color="action" /></InputAdornment>}
                                disabled={isLoading}
                            >
                                {languageOptions.map((lang) => (<MenuItem key={lang} value={lang}>{lang}</MenuItem>))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth margin="normal" required sx={{ mb: 2 }}>
                            <InputLabel id="role-label">Role</InputLabel>
                            <Select 
                                labelId="role-label" 
                                value={role} 
                                onChange={(e) => setRole(e.target.value)} 
                                label="Role" 
                                startAdornment={<InputAdornment position="start"><GroupIcon color="action" /></InputAdornment>}
                                disabled={isLoading}
                            >
                                {roleOptions.map((option) => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                            </Select>
                        </FormControl>
                        
                        <FormControl fullWidth margin="normal" required sx={{ mb: 1 }}>
                            <InputLabel id="organization-label">Organization</InputLabel>
                            <Select 
                                labelId="organization-label" 
                                value={organization} 
                                onChange={(e) => setOrganization(e.target.value)} 
                                label="Organization" 
                                startAdornment={<InputAdornment position="start"><BusinessIcon color="action" /></InputAdornment>}
                                disabled={isLoading}
                            >
                                {organizationOptions.map((org) => (<MenuItem key={org} value={org}>{org}</MenuItem>))}
                            </Select>
                        </FormControl>

                        {error && (<Typography color="error" variant="body2" sx={{ mt: 1, mb: 2 }}>{error}</Typography>)}

                        <Button 
                            type="submit" 
                            fullWidth 
                            variant="contained" 
                            size="large" 
                            color="secondary" 
                            sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 'bold', letterSpacing: 1 }} 
                            onClick={handleRegister}
                            disabled={isLoading}
                        >
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'CREATE ACCOUNT'}
                        </Button>
                        
                        <Typography align="center" variant="body2" color="text.secondary">
                            Already have an account?{' '}<MuiLink component={Link} to="/login" underline="hover">Sign In</MuiLink>
                        </Typography>
                    </Box>
                </Paper>
            </Container>

            {/* --- FOOTER (UPDATED) --- */}
            <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: theme.palette.grey[200], width: '100%', borderTop: `1px solid ${theme.palette.divider}` }}>
                <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                    <MuiLink component="a" href="#" onClick={handleOpenContactDialog} color="inherit" underline="hover" variant="body2">
                        Contact Us {/* <--- ATTACHED HANDLER */}
                    </MuiLink>
                    <MuiLink  component="a" href="#" onClick={handleOpenTermsDialog} color="inherit" underline="hover" variant="body2">Terms & Conditions</MuiLink>
                </Container>
            </Box>

            {/* --- CONTACT US DIALOG --- */}
            <ContactUsDialog 
                open={isContactDialogOpen} 
                onClose={handleCloseContactDialog} 
            /> 

             <TermsDialog 
                            open={isTermsDialogOpen}
                            onClose={() => handleCloseTermsDialog(false)}
                        />

        </Box>
    );
}
