import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Link as MuiLink
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import EmailIcon from '@mui/icons-material/Email';

export default function SupportDialog({ open, onClose }) {
    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            aria-labelledby="support-dialog-title"
            maxWidth="xs"
            fullWidth
            sx={{ backdropFilter: 'blur(3px)' }}
        >
            <DialogTitle id="support-dialog-title" sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
                    Support & Help Desk <HelpCenterIcon sx={{ ml: 1, color: 'primary.main' }} />
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
                    Need assistance accessing the platform or forgot your credentials? Contact our support team.
                </Typography>

                <Box sx={{ my: 2, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
                    <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                        <EmailIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1" component="span" fontWeight="bold">Primary Support Email:</Typography>
                    </Box>
                    <MuiLink href="mailto:support@annotationplatform.com" underline="hover" color="text.primary" sx={{ ml: 3 }}>
                        mwa.iiith@gmail.com

                    </MuiLink>
                </Box>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Please allow up to 24 hours for a response to email inquiries. For technical issues, please include your username/email address.
                </Typography>
            </DialogContent>
            
            <DialogActions>
                <Button onClick={onClose} color="primary" variant="contained">
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
}