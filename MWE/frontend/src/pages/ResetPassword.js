import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    Container, Box, Typography, TextField, Button, Paper, Link as MuiLink,
    InputAdornment, IconButton, useTheme, Alert
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [tokenValid, setTokenValid] = useState(false);
    const [token, setToken] = useState('');
    const theme = useTheme();

    useEffect(() => {
        const tokenFromUrl = searchParams.get('token');
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
            verifyToken(tokenFromUrl);
        } else {
            setError('Invalid reset link. Please request a new password reset.');
        }
    }, [searchParams]);

    const verifyToken = async (token) => {
        try {
            const response = await fetch('http://127.0.0.1:5001/verify-reset-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            if (response.ok) {
                setTokenValid(true);
            } else {
                setError('Invalid or expired reset token. Please request a new password reset.');
            }
        } catch (err) {
            setError('Network error. Please try again later.');
            console.error('Network error:', err);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:5001/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await response.json();
            
            if (response.ok) {
                setSuccess('Password reset successfully! Redirecting to login...');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError('Network error. Please try again later.');
            console.error('Network error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClickShowPassword = () => setShowPassword(!showPassword);
    const handleClickShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

    if (!tokenValid && error) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: theme.palette.grey[100] }}>
                <Container component="main" maxWidth="sm">
                    <Paper elevation={6} sx={{ padding: 4, textAlign: 'center' }}>
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                        <Button 
                            component={Link} 
                            to="/forgot-password" 
                            variant="contained"
                            sx={{ mt: 2 }}
                        >
                            Request New Reset Link
                        </Button>
                    </Paper>
                </Container>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: theme.palette.grey[100] }}>
            <Container component="main" maxWidth="sm" sx={{ mb: 4 }}>
                <Typography variant="h4" align="center" color="text.primary" gutterBottom sx={{ mb: 4, fontWeight: 600, letterSpacing: 1.5, color: theme.palette.primary.main }}>
                    Set New Password
                </Typography>

                <Paper elevation={6} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: theme.shape.borderRadius * 2, borderTop: `5px solid ${theme.palette.primary.main}` }}>
                    <Typography component="h1" variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>Reset Password</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                        Enter your new password below.
                    </Typography>

                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
                        <TextField
                            fullWidth
                            margin="normal"
                            required
                            name="password"
                            label="New Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            sx={{ mb: 2 }}
                            InputProps={{
                                startAdornment: (<LockIcon color="action" sx={{ mr: 1 }} />),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleClickShowPassword} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            fullWidth
                            margin="normal"
                            required
                            name="confirmPassword"
                            label="Confirm New Password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            sx={{ mb: 2 }}
                            InputProps={{
                                startAdornment: (<LockIcon color="action" sx={{ mr: 1 }} />),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleClickShowConfirmPassword} edge="end">
                                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        
                        {error && (
                            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                        
                        {success && (
                            <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                                {success}
                            </Alert>
                        )}

                        <Button 
                            type="submit" 
                            fullWidth 
                            variant="contained" 
                            size="large" 
                            disabled={loading || !tokenValid}
                            sx={{ mt: 2, mb: 2, py: 1.5, fontWeight: 'bold', letterSpacing: 1 }}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                        
                        <Box sx={{ textAlign: 'center' }}>
                            <MuiLink 
                                component={Link} 
                                to="/login" 
                                underline="hover" 
                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ArrowBackIcon sx={{ fontSize: 18, mr: 1 }} />
                                Back to Sign In
                            </MuiLink>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}