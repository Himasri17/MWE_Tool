import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, List, ListItem, ListItemIcon, ListItemText, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GroupIcon from '@mui/icons-material/Group';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';

export default function TermsDialog({ open, onClose }) {
    const organizationName = 'MWA.IIITH';

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            aria-labelledby="terms-dialog-title"
            maxWidth="md"
            fullWidth
            scroll="paper"
        >
            <DialogTitle id="terms-dialog-title" sx={{ 
                m: 0, 
                p: 3, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                backgroundColor: (theme) => theme.palette.primary.main, 
                color: 'white' 
            }}>
                <Typography variant="h5" component="span" sx={{ fontWeight: 'bold' }}>
                    Terms and Conditions
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ color: 'white' }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            
            <DialogContent dividers sx={{ py: 3 }}>
                {/* Introduction */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                        1. Agreement to Terms
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Welcome to the MWE (Multiword Expressions) Annotation Tool provided by <strong>{organizationName}</strong>. 
                        By accessing and using this platform, you agree to be bound by these Terms and Conditions, 
                        along with our MWE Annotation Guidelines and User Guidelines.
                    </Typography>
                </Box>
                
                <Divider sx={{ my: 3 }} />

                {/* Annotation Guidelines */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                        2. Annotation Guidelines & Scope
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        This tool is specifically designed for annotating Multiword Expressions (MWEs) in Indian languages. 
                        All users must strictly follow the official MWE Annotation Guidelines (Version 1.1).
                    </Typography>
                    
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
                        Supported MWE Types:
                    </Typography>
                    <List dense sx={{ mb: 2 }}>
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleOutlineIcon fontSize="small" color="success" /></ListItemIcon>
                            <ListItemText 
                                primary="Noun Compound, Reduplicated Expression, and Echo-word" 
                                primaryTypographyProps={{ variant: 'body2' }}
                            />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleOutlineIcon fontSize="small" color="success" /></ListItemIcon>
                            <ListItemText 
                                primary="Opaque and Opaque-Idiom expressions" 
                                primaryTypographyProps={{ variant: 'body2' }}
                            />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}><GavelIcon fontSize="small" color="error" /></ListItemIcon>
                            <ListItemText 
                                primary={
                                    <Typography variant="body2">
                                        <strong>Exclusions:</strong> Complex predicates or compound verbs are generally 
                                        <strong> not to be annotated</strong>, unless they function as opaque or idiomatic expressions.
                                    </Typography>
                                }
                            />
                        </ListItem>
                    </List>
                </Box>
                
                <Divider sx={{ my: 3 }} />

                {/* User Roles */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                        3. User Roles & Responsibilities
                    </Typography>
                    <List dense>
                        <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                            <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}><GroupIcon fontSize="small" color="primary" /></ListItemIcon>
                            <ListItemText 
                                primary={
                                    <Typography variant="body2">
                                        <strong>Annotators:</strong> Must register with the 'Annotator' role and provide accurate 
                                        organization and language information. Required to select at least two consecutive words 
                                        and apply the correct annotation type following the guidelines.
                                    </Typography>
                                }
                            />
                        </ListItem>
                        <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                            <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}><GroupIcon fontSize="small" color="primary" /></ListItemIcon>
                            <ListItemText 
                                primary={
                                    <Typography variant="body2">
                                        <strong>Administrators:</strong> Responsible for project management, including uploading 
                                        text files, assigning tasks to annotators, and monitoring progress. Must ensure proper 
                                        project configuration and user assignments.
                                    </Typography>
                                }
                            />
                        </ListItem>
                        <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                            <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}><GroupIcon fontSize="small" color="primary" /></ListItemIcon>
                            <ListItemText 
                                primary={
                                    <Typography variant="body2">
                                        <strong>Data Submission:</strong> All annotations must be explicitly saved using the 
                                        submission functionality. Unsaved work may be lost upon navigation or session timeout.
                                    </Typography>
                                }
                            />
                        </ListItem>
                    </List>
                </Box>
                
                <Divider sx={{ my: 3 }} />

                {/* Intellectual Property */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                        4. Intellectual Property & Data Usage
                    </Typography>
                    <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                        <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}><SecurityIcon fontSize="small" color="secondary" /></ListItemIcon>
                        <ListItemText 
                            primary={
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    All annotation data created through this platform remains the exclusive intellectual 
                                    property of <strong>{organizationName}</strong>. Users are prohibited from copying, 
                                    redistributing, or using project data outside the scope of authorized annotation tasks.
                                </Typography>
                            }
                        />
                    </ListItem>
                    <Typography variant="body2" sx={{ ml: 6, mb: 1 }}>
                        Completed annotations can be downloaded by authorized users (Admins and assigned Annotators) 
                        from the project management interface for research purposes as permitted by {organizationName}.
                    </Typography>
                </Box>
                
                <Divider sx={{ my: 3 }} />

                {/* Disclaimer & Support */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                        5. Disclaimer & Platform Support
                    </Typography>
                    <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                        <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}><WarningIcon fontSize="small" color="warning" /></ListItemIcon>
                        <ListItemText 
                            primary={
                                <Typography variant="body2">
                                    The MWE Tool is provided "as is" without warranties of any kind. {organizationName} 
                                    reserves the right to terminate access for violations of these terms or annotation guidelines.
                                </Typography>
                            }
                        />
                    </ListItem>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                        We continuously improve the platform based on user feedback. For technical support, 
                        questions about annotation guidelines, or to report issues, please contact our team at{' '}
                        <strong>mwa.iiith@gmail.com</strong>.
                    </Typography>
                </Box>
            </DialogContent>
            
            <DialogActions sx={{ p: 3 }}>
                <Button 
                    onClick={onClose} 
                    color="primary" 
                    variant="contained" 
                    size="large"
                    sx={{ minWidth: 120 }}
                >
                    I Understand
                </Button>
            </DialogActions>
        </Dialog>
    );
}