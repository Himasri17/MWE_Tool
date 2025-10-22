import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Container, Box, Typography, TextField, Button, Paper, Link as MuiLink,
    useTheme, Alert, Grid
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PasswordIcon from '@mui/icons-material/Password';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1: Enter email, 2: Enter OTP, 3: Reset password
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [verificationToken, setVerificationToken] = useState('');
    const theme = useTheme();

    const handleSendOtp = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:5001/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            
            if (response.ok) {
                setSuccess('OTP has been sent to your email address.');
                setStep(2);
            } else {
                setError(data.error || 'Failed to send OTP');
            }
        } catch (err) {
            setError('Network error. Please try again later.');
            console.error('Network error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:5001/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });

            const data = await response.json();
            
            if (response.ok) {
                setSuccess('OTP verified successfully!');
                setVerificationToken(data.verification_token);
                setStep(3);
            } else {
                setError(data.error || 'Invalid OTP');
            }
        } catch (err) {
            setError('Network error. Please try again later.');
            console.error('Network error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        const formData = new FormData(event.target);
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:5001/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    verification_token: verificationToken,
                    newPassword: newPassword 
                }),
            });

            const data = await response.json();
            
            if (response.ok) {
                setSuccess('Password reset successfully! Redirecting to login...');
                setTimeout(() => {
                    window.location.href = '/login';
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

    const renderStep1 = () => (
        <Box component="form" onSubmit={handleSendOtp} noValidate sx={{ width: '100%' }}>
            <TextField
                fullWidth
                margin="normal"
                required
                id="email"
                label="Email Address"
                name="email"
                type="email"
                autoFocus
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                    startAdornment: (<EmailIcon color="action" sx={{ mr: 1 }} />),
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
                disabled={loading}
                sx={{ mt: 2, mb: 2, py: 1.5, fontWeight: 'bold', letterSpacing: 1 }}
            >
                {loading ? 'Sending...' : 'Send OTP'}
            </Button>
        </Box>
    );

    const renderStep2 = () => (
        <Box component="form" onSubmit={handleVerifyOtp} noValidate sx={{ width: '100%' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                We sent a 6-digit OTP to {email}
            </Typography>
            
            <TextField
                fullWidth
                margin="normal"
                required
                id="otp"
                label="Enter OTP"
                name="otp"
                type="text"
                autoFocus
                variant="outlined"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                sx={{ mb: 3 }}
                InputProps={{
                    startAdornment: (<PasswordIcon color="action" sx={{ mr: 1 }} />),
                }}
                inputProps={{
                    maxLength: 6,
                    pattern: '[0-9]*'
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

            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <Button 
                        fullWidth 
                        variant="outlined"
                        onClick={() => setStep(1)}
                        sx={{ py: 1.5 }}
                    >
                        Back
                    </Button>
                </Grid>
                <Grid item xs={6}>
                    <Button 
                        type="submit" 
                        fullWidth 
                        variant="contained" 
                        size="large" 
                        disabled={loading || otp.length !== 6}
                        sx={{ py: 1.5, fontWeight: 'bold' }}
                    >
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );

    const renderStep3 = () => (
        <Box component="form" onSubmit={handleResetPassword} noValidate sx={{ width: '100%' }}>
            <TextField
                fullWidth
                margin="normal"
                required
                name="newPassword"
                label="New Password"
                type="password"
                autoFocus
                sx={{ mb: 2 }}
                InputProps={{
                    startAdornment: (<PasswordIcon color="action" sx={{ mr: 1 }} />),
                }}
            />
            <TextField
                fullWidth
                margin="normal"
                required
                name="confirmPassword"
                label="Confirm New Password"
                type="password"
                sx={{ mb: 2 }}
                InputProps={{
                    startAdornment: (<PasswordIcon color="action" sx={{ mr: 1 }} />),
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
                disabled={loading}
                sx={{ mt: 2, mb: 2, py: 1.5, fontWeight: 'bold', letterSpacing: 1 }}
            >
                {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
        </Box>
    );

    const getStepTitle = () => {
        switch (step) {
            case 1: return "Forgot Password";
            case 2: return "Enter OTP";
            case 3: return "Set New Password";
            default: return "Forgot Password";
        }
    };

    const getStepDescription = () => {
        switch (step) {
            case 1: return "Enter your email address to receive a verification OTP";
            case 2: return "Enter the 6-digit OTP sent to your email";
            case 3: return "Enter your new password";
            default: return "Enter your email address to receive a verification OTP";
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: theme.palette.grey[100] }}>
            <Container component="main" maxWidth="sm" sx={{ mb: 4 }}>
                <Typography variant="h4" align="center" color="text.primary" gutterBottom sx={{ mb: 4, fontWeight: 600, letterSpacing: 1.5, color: theme.palette.primary.main }}>
                    Reset Your Password
                </Typography>

                <Paper elevation={6} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: theme.shape.borderRadius * 2, borderTop: `5px solid ${theme.palette.primary.main}` }}>
                    <Typography component="h1" variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>{getStepTitle()}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                        {getStepDescription()}
                    </Typography>

                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
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
                </Paper>
            </Container>
        </Box>
    );
}