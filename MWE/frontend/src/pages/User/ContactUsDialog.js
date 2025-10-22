import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Link as MuiLink
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';

export default function ContactUsDialog({ open, onClose }) {
    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            aria-labelledby="contact-us-dialog-title"
            maxWidth="xs"
            fullWidth
            sx={{ backdropFilter: 'blur(3px)' }} // Optional: adds a slight blur to the background
        >
            <DialogTitle id="contact-us-dialog-title" sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
                    Contact Us 📞
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ color: (theme) => theme.palette.grey[500], }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            
            <DialogContent dividers>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    For any queries, feedback, or support, please reach out to us using the following contact details:
                </Typography>

                <Box sx={{ my: 2, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
                    <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                        <EmailIcon color="secondary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1" component="span" fontWeight="bold">Email:</Typography>
                    </Box>
                    <MuiLink href="mailto:support@example.com" underline="hover" color="text.primary" sx={{ ml: 3 }}>
                        mwa.iiith@gmail.com
                    </MuiLink>
                </Box>
                
                <Box sx={{ my: 2, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
                    <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                        <PhoneIcon color="secondary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1" component="span" fontWeight="bold">Phone:</Typography>
                    </Box>
                    <MuiLink href="tel:+911234567890" underline="hover" color="text.primary" sx={{ ml: 3 }}>
                        +91 12345 67890
                    </MuiLink>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    We aim to respond to all inquiries within 24-48 hours.
                </Typography>
            </DialogContent>
            
            <DialogActions>
                <Button onClick={onClose} color="primary" variant="contained">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}