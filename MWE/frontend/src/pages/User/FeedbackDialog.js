import React, { useState } from 'react';
import {
    Typography, TextField, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Box, useTheme, IconButton, Tooltip, Chip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Visually Hidden Input for file upload
const VisuallyHiddenInput = (props) => (
    <input
        type="file"
        style={{
            clip: 'rect(0 0 0 0)',
            clipPath: 'inset(50%)',
            height: 1,
            overflow: 'hidden',
            position: 'absolute',
            bottom: 0,
            left: 0,
            whiteSpace: 'nowrap',
            width: 1
        }}
        {...props}
    />
);

/**
 * Reusable dialog component for reporting issues or sending feedback.
 * The submission uses FormData to handle both text and optional file upload.
 * @param {object} props
 * @param {boolean} props.open - Controls the visibility of the dialog.
 * @param {function} props.onClose - Function to close the dialog.
 * @param {string} props.userEmail - The email of the logged-in user submitting feedback.
 */
export default function FeedbackDialog({ open, onClose, userEmail }) {
    const [feedbackText, setFeedbackText] = useState('');
    const [issueImage, setIssueImage] = useState(null);
    const [feedbackError, setFeedbackError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const theme = useTheme();

    // Clears the form state
    const resetForm = () => {
        setFeedbackText('');
        setIssueImage(null);
        setFeedbackError('');
        setIsSubmitting(false);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        // Clear previous error
        setFeedbackError('');
        
        if (file && file.size > 5 * 1024 * 1024) { // Limit to 5MB
            setFeedbackError('File size must be less than 5MB.');
            setIssueImage(null);
        } else {
            setIssueImage(file);
        }
    };

    // NEW: Handle image preview
    const handleImagePreview = (file) => {
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setImagePreviewUrl(imageUrl);
            setImagePreviewOpen(true);
        }
    };

    // NEW: Close image preview
    const handleCloseImagePreview = () => {
        setImagePreviewOpen(false);
        // Revoke the object URL to avoid memory leaks
        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
        }
    };

    const handleFeedbackSubmit = async () => {
        if (!feedbackText.trim() && !issueImage) {
            setFeedbackError("Please enter feedback or upload a screenshot.");
            return;
        }

        setIsSubmitting(true);
        setFeedbackError('');

        // Use FormData to send text, file data, and user email
        const formData = new FormData();
        formData.append('feedbackText', feedbackText);
        // CRITICAL: Ensure userEmail is sent to be recorded by the backend
        formData.append('userEmail', userEmail || 'anonymous@app.com'); 
        if (issueImage) {
            formData.append('screenshot', issueImage);
        }

        try {
            const res = await fetch("http://127.0.0.1:5001/feedback", {
                method: "POST",
                // IMPORTANT: Do NOT set Content-Type header when sending FormData
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: `Server error ${res.status}` }));
                throw new Error(errorData.message || 'Failed to submit feedback.');
            }

            alert("Thank you! Your feedback has been submitted successfully.");
            onClose(true); // Close the dialog and signal success
            resetForm();

        } catch (err) {
            console.error("Feedback submission error:", err);
            setFeedbackError(err.message || "Network error. Could not submit feedback.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // NEW: Image Preview Dialog Component
    const ImagePreviewDialog = () => (
        <Dialog 
            open={imagePreviewOpen} 
            onClose={handleCloseImagePreview}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
            }}>
                <Typography variant="h6">Image Preview</Typography>
                <IconButton onClick={handleCloseImagePreview}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                minHeight: '400px'
            }}>
                {imagePreviewUrl && (
                    <img 
                        src={imagePreviewUrl} 
                        alt="Preview" 
                        style={{ 
                            maxWidth: '100%', 
                            maxHeight: '70vh', 
                            objectFit: 'contain' 
                        }} 
                    />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseImagePreview}>Close</Button>
            </DialogActions>
        </Dialog>
    );

    return (
        <>
            <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2 }}>
                    Report Issue or Send Feedback
                    <IconButton
                        aria-label="close"
                        onClick={() => onClose(false)}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: theme.palette.grey[500],
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Submitting as: **{userEmail || 'Loading user...'}**.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Issue Description / Feedback"
                        variant="outlined"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        sx={{ mb: 2 }}
                        disabled={isSubmitting}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Button 
                            component="label" 
                            variant="outlined" 
                            startIcon={<CloudUploadIcon />} 
                            disabled={isSubmitting}
                        >
                            Upload Screenshot (Optional)
                            <VisuallyHiddenInput 
                                type="file" 
                                onChange={handleFileChange} 
                                accept="image/*" 
                            />
                        </Button>
                        {issueImage && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Tooltip title="Click to preview image">
                                    <Chip 
                                        label={`File: ${issueImage.name.substring(0, 15)}...`} 
                                        onClick={() => handleImagePreview(issueImage)}
                                        onDelete={() => setIssueImage(null)}
                                        deleteIcon={<DeleteIcon />}
                                        clickable
                                        variant="outlined"
                                        size="small"
                                        color="primary"
                                        icon={<VisibilityIcon fontSize="small" />}
                                    />
                                </Tooltip>
                            </Box>
                        )}
                    </Box>
                    {feedbackError && (
                        <Typography color="error" variant="body2" sx={{ mt: 1, mb: 2 }}>
                            {feedbackError}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => { onClose(false); resetForm(); }} 
                        color="secondary" 
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleFeedbackSubmit}
                        color="primary"
                        variant="contained"
                        disabled={(!feedbackText.trim() && !issueImage) || isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Image Preview Dialog */}
            <ImagePreviewDialog />
        </>
    );
}