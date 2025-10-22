import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Box, Typography, Button, Paper, CircularProgress,
    useTheme, IconButton, Tooltip, Divider,
    Chip, Alert, Snackbar, Card, CardContent,
    TextField 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

export default function SentenceReviewPanel() {
    const { username, projectId, targetUsername } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    // --- State Management ---
    const [sentences, setSentences] = useState([]);
    const [projectName, setProjectName] = useState('Loading...');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedSentenceData, setSelectedSentenceData] = useState(null);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [debugInfo, setDebugInfo] = useState(null);
    const [reviewComments, setReviewComments] = useState('');
    const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
    const [tagComments, setTagComments] = useState({});
    
    const sentencesPerPage = 6; 

    // --- Utility: showSnackbar (Correctly defined within scope) ---
    const showSnackbar = (message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    // --- Utility: handleCloseSnackbar ---
    const handleCloseSnackbar = () => { 
        setSnackbar({ ...snackbar, open: false });
    };

    
    
    // --- Data Fetching (Using useCallback) ---
    const fetchSentencesForReview = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError(null);
        setDebugInfo(null);
        
        try {
            // This route should combine FINAL (Approved) and STAGED (Pending) tags
            const response = await fetch(`http://127.0.0.1:5001/api/projects/${projectId}/sentences?username=${targetUsername}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server returned ${response.status} for fetch.`);
            }
            
            const data = await response.json();
            
            const filteredSentences = data.sentences.filter(s => s.username === targetUsername);

            const totalSentences = filteredSentences?.length || 0;
            const annotatedSentences = filteredSentences?.filter(s => s.is_annotated)?.length || 0;
            const totalTags = filteredSentences?.reduce((sum, s) => sum + (s.tags?.length || 0), 0) || 0;
            
            setDebugInfo({
                totalSentences, annotatedSentences, totalTags, projectName: data.project_name,
            });

            setSentences(filteredSentences || []);
            setProjectName(data.project_name || `Project ${projectId}`);

            if (!showLoading) { showSnackbar(`Refreshed! ${totalSentences} sentences for ${targetUsername}`, 'success'); }

        } catch (error) {
            console.error("❌ Review Load Error:", error);
            setError(error.message);
            setSentences([]);
            showSnackbar(`Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, targetUsername]); 

    useEffect(() => {
        fetchSentencesForReview();
    }, [fetchSentencesForReview]);

    // --- NEW/MODIFIED: HANDLE PER-TAG APPROVAL/REJECTION ---
    const handleTagReview = async (tagId, action, tagText, currentComment) => {
    if (!selectedSentenceData) return;
    
    // CRITICAL VALIDATION: Comments required for rejection
    if (action === 'Reject' && !currentComment.trim()) {
        showSnackbar("Comments are required to reject a tag.", 'warning');
        return;
    }

    const url = `http://127.0.0.1:5001/reviewer/tag/${tagId}/${action.toLowerCase()}`;
    
    setIsReviewSubmitting(true);

    try {
        const method = action === 'Approve' ? 'PUT' : 'DELETE'; 
        
        // CRITICAL: Pass the comment in the body for BOTH actions (backend logs it on APPROVE, uses it on REJECT)
        const bodyData = { 
            reviewerUsername: username, 
            comments: currentComment.trim() // Pass the comment from the local state
        }; 
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData), 
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Failed to ${action.toLowerCase()} tag.`);
        }

        showSnackbar(`Tag '${tagText}' successfully ${action}d.`, 'success');
        
        // Update local state: remove the tag from the selected sentence's tag array
        setSentences(prevSentences => prevSentences.map(s => {
            if (s._id === selectedSentenceData._id) {
                const updatedTags = s.tags.filter(t => t._id !== tagId);
                setSelectedSentenceData({ ...s, tags: updatedTags });

                return { ...s, tags: updatedTags };
            }
            return s;
        }));
        
        // Clear the comment field for the tag
        setTagComments(prev => { delete prev[tagId]; return { ...prev }; });

    } catch (error) {
        console.error(`Tag review error (${action}):`, error);
        showSnackbar(`Tag ${action} failed: ${error.message}.`, 'error');
    } finally {
        setIsReviewSubmitting(false);
    }
};
    // --- Handlers ---
    const handleLogout = async () => { navigate('/login'); };
    const handleBack = () => { navigate(`/reviewer/dashboard`); };
    const handleRefresh = () => { fetchSentencesForReview(false); setSelectedSentenceData(null); };

    const handleSentenceClick = (sentenceData) => {
        setSelectedSentenceData(sentenceData);
        // Load existing comments from the SENTENCE if available
        setReviewComments(sentenceData.review_comments || ''); 
    };
    
    // --- Pagination Logic (UNCHANGED) ---
    const totalPages = Math.ceil(sentences.length / sentencesPerPage);
    const indexOfLastSentence = currentPage * sentencesPerPage;
    const indexOfFirstSentence = indexOfLastSentence - sentencesPerPage;
    const currentSentences = sentences.slice(indexOfFirstSentence, indexOfLastSentence);
    
    const handleNextPage = () => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); };
    const handlePrevPage = () => { setCurrentPage(prev => Math.max(prev - 1, 1)); };

    // --- Annotation Rendering Function (UPDATED for per-tag controls) ---
    const renderAnnotationView = (sentenceData) => {
        if (!sentenceData) return <Alert severity="info">No sentence selected.</Alert>;
        
        const hasTags = sentenceData.tags && sentenceData.tags.length > 0;
        const currentStatus = sentenceData.review_status || 'Pending'; 
        const isAnnotated = sentenceData.is_annotated;

        const statusColor = currentStatus === 'Approved' ? 'success' : 
                            currentStatus === 'Rejected' ? 'error' : 'warning';
                            
        return (
            <Box>
                {/* Status and Text (Sentence Level) */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ wordBreak: 'break-word', flex: 1 }}>
                        {sentenceData.textContent || "Sentence Text Missing"}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, ml: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Chip 
                            label={currentStatus} 
                            color={statusColor}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                        />
                        <Chip 
                            label={isAnnotated ? "Annotated" : "Not Annotated"} 
                            color={isAnnotated ? "success" : "default"}
                            size="small"
                        />
                        {hasTags && (
                            <Chip 
                                label={`${sentenceData.tags.length} tags`} 
                                color="primary" 
                                size="small"
                            />
                        )}
                    </Box>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                {/* Tags Section */}
                <Typography variant="subtitle1" color="primary" gutterBottom>
                    Annotations ({sentenceData.tags.length}):
                </Typography>
                
                {
                    !hasTags ? (
                        <Alert severity="info" sx={{mb: 3}}>No tags exist for this sentence (staged or approved).</Alert>
                    ) : (
                        <Box sx={{maxHeight: '30vh', overflowY: 'auto', pr: 1, mb: 2}}>
                            {sentenceData.tags.map((tag, index) => {
    const tagIsPending = tag.review_status === 'Pending';
    const tagId = tag._id;
    const currentComment = tagComments[tagId] || tag.review_comments || ''; // Get current comment

    return (
        <Box key={tagId} sx={{ mb: 2, p: 1.5, border: `1px solid ${tagIsPending ? theme.palette.warning.light : theme.palette.success.light}`, borderRadius: 1 }}>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="body1" fontWeight="bold">
                        {tag.text} 
                        <Chip label={tag.tag} size="small" color={tagIsPending ? 'warning' : 'success'} sx={{ ml: 1, height: 20, fontSize: '0.75rem' }} />
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        By: {tag.username} | Status: <span style={{ color: tagIsPending ? theme.palette.warning.dark : theme.palette.success.dark }}>{tag.review_status}</span>
                    </Typography>
                </Box>
                
                {/* PER-TAG ACTION BUTTONS */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {tagIsPending ? (
                        <>
                            <Button 
                                variant="outlined" 
                                size="small"
                                // CRITICAL: Pass the current comment and use the per-tag handler
                                onClick={() => handleTagReview(tagId, 'Reject', tag.text, currentComment)} 
                                startIcon={isReviewSubmitting ? <CircularProgress size={16} color="error" /> : <CancelIcon />}
                                color="error"
                                disabled={isReviewSubmitting}
                            >
                                Reject
                            </Button>
                            <Button 
                                variant="contained" 
                                size="small"
                                // CRITICAL: Pass the current comment
                                onClick={() => handleTagReview(tagId, 'Approve', tag.text, currentComment)} 
                                startIcon={isReviewSubmitting ? <CircularProgress size={16} color="success" /> : <CheckCircleIcon />}
                                color="success"
                                disabled={isReviewSubmitting}
                            >
                                Approve
                            </Button>
                        </>
                    ) : (
                        <Chip label="Final" color="success" size="small" variant="outlined" />
                    )}
                </Box>
            </Box>

            {/* TAG-SPECIFIC COMMENT FIELD */}
            {(tagIsPending || (tag.review_comments && tag.review_comments.length > 0)) && (
                <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={1}
                    // CRITICAL: Read and write to the tagComments object keyed by tagId
                    value={currentComment}
                    onChange={(e) => setTagComments(prev => ({ ...prev, [tagId]: e.target.value }))}
                    placeholder="Enter comment for this specific tag..."
                    variant="filled"
                    sx={{ mt: 1, backgroundColor: 'white' }}
                    disabled={!tagIsPending || isReviewSubmitting}
                />
            )}
        </Box>
    );
})}
                        </Box>
                    )
                }
                
                <Divider sx={{ my: 3 }} />

                {/* REVIEWER NOTES TEXT FIELD (No buttons, relying on per-tag action) */}
                <Typography variant="h6" gutterBottom>Reviewer Notes</Typography>

                <TextField
                    fullWidth
                    multiline
                    rows={2}
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="General notes on this sentence assignment..."
                    variant="outlined"
                    disabled={isReviewSubmitting}
                />
            </Box>
        );
    };

    const renderSentenceBox = (sentence) => {
        // Determine accent color based on review status
        const pendingTagsCount = sentence.tags.filter(t => t.review_status === 'Pending').length;
        const finalTagsCount = sentence.tags.filter(t => t.review_status === 'Approved').length;

        let accentColor = theme.palette.grey[300]; // Default
        if (pendingTagsCount > 0) {
            accentColor = theme.palette.warning.main; // Yellow if any pending tags
        } else if (finalTagsCount > 0) {
            accentColor = theme.palette.success.main; // Green if all tags are approved
        } else if (sentence.is_annotated) {
            accentColor = theme.palette.error.main; // Red if annotated but no tags (error state)
        }
        
        const isSelected = selectedSentenceData?._id === sentence._id;

        return (
            <Paper
                key={sentence._id}
                onClick={() => handleSentenceClick(sentence)} 
                elevation={isSelected ? 3 : 1}
                sx={{
                    p: 2, mb: 2, cursor: 'pointer', 
                    backgroundColor: isSelected 
                        ? theme.palette.action.selected 
                        : (sentence.is_annotated ? theme.palette.success.light : theme.palette.common.white),
                    borderLeft: `5px solid ${accentColor}`,
                    borderRight: isSelected ? `2px solid ${accentColor}` : 'none',
                    '&:hover': { backgroundColor: theme.palette.action.hover, boxShadow: theme.shadows[2] },
                    transition: 'all 0.2s ease-in-out'
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography 
                        variant="body1" 
                        sx={{ 
                            fontWeight: 500, color: theme.palette.text.primary,
                            wordBreak: 'break-word', flex: 1
                        }}
                    >
                        {sentence.textContent}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, ml: 1 }}>
                        <Chip 
                            label={sentence.review_status || 'Pending'}
                            size="small" 
                            color={sentence.review_status === 'Approved' ? 'success' : sentence.review_status === 'Rejected' ? 'error' : 'warning'} 
                            variant="filled"
                            sx={{ minWidth: 80, fontWeight: 'bold' }}
                        />
                        {sentence.tags && sentence.tags.length > 0 && (
                            <Chip 
                                label={`${sentence.tags.length} tags`} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                            />
                        )}
                    </Box>
                </Box>
            </Paper>
        );
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 2 }}>
                <CircularProgress />
                <Typography variant="body1" color="text.secondary">
                    Loading sentences for review...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', width: '100vw', overflow: 'hidden', margin: 0, padding: 0 }}>
            {/* Header Bar */}
            <Box sx={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', 
                bgcolor: theme.palette.primary.light, color: 'black', p: 2, width: '100vw', boxSizing: 'border-box', margin: 0
            }}>
                <Button variant="text" size="small" sx={{ color: 'black' }}>SHOW USER GUIDELINES</Button>
                <Typography variant="h6" fontWeight={500} sx={{ mx: 1 }}>Multiword Expression Workbench</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> 
                    <Button variant="text" size="small" sx={{ color: 'black' }}>SHOW ANNOTATION GUIDELINES</Button>
                    <Button variant="outlined" size="small" sx={{ color: 'black', borderColor: 'black' }} onClick={handleLogout}>LOG OUT</Button>
                </Box>
            </Box>

            {/* Main Content */}
            <Box sx={{ 
                display: 'flex', width: '100vw', height: 'calc(100vh - 60px)', p: 3, gap: 3, boxSizing: 'border-box', margin: 0
            }}>
                
                {/* LEFT PANEL: SENTENCES */}
                <Box sx={{ width: '50%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconButton onClick={handleBack} sx={{ color: theme.palette.primary.main, mr: 2 }}>
                                    <ArrowBackIcon />
                                </IconButton>
                                <Box>
                                    <Typography variant="h6" fontWeight="bold">{projectName}</Typography>
                                    <Typography variant="body2" color="text.secondary">Reviewing: {targetUsername}</Typography>
                                </Box>
                            </Box>
                            <Tooltip title="Refresh Data">
                                <IconButton onClick={handleRefresh} sx={{ color: theme.palette.primary.main }}><RefreshIcon /></IconButton>
                            </Tooltip>
                        </Box>

                        {/* Debug Info Card */}
                        {debugInfo && (
                            <Card variant="outlined" sx={{ mb: 2, backgroundColor: theme.palette.info.light }}>
                                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" fontWeight="bold">📊 Session Overview</Typography>
                                        <Typography variant="caption" color="text.secondary">{new Date().toLocaleTimeString()}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                                        <Chip label={`Total: ${debugInfo.totalSentences}`} size="small" variant="outlined" />
                                        <Chip label={`Annotated: ${debugInfo.annotatedSentences}`} size="small" color="success" variant="outlined" />
                                        <Chip label={`Tags: ${debugInfo.totalTags}`} size="small" variant="outlined" />
                                    </Box>
                                </CardContent>
                            </Card>
                        )}

                        {/* Error Alert */}
                        {error && (<Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={handleRefresh}>RETRY</Button>}>{error}</Alert>)}

                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Sentences ({sentences.length})</Typography>
                        
                        {/* Sentence List */}
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                            {currentSentences.length > 0 ? (
                                currentSentences.map(renderSentenceBox)
                            ) : (
                                <Box sx={{ textAlign: 'center', mt: 4, p: 3 }}><Typography color="text.secondary" gutterBottom variant="h6">No sentences found</Typography><Typography color="text.secondary" variant="body2" gutterBottom>No sentences found for user "{targetUsername}" in this project.</Typography><Button variant="contained" onClick={handleRefresh} sx={{ mt: 1 }}>Refresh Data</Button></Box>
                            )}
                        </Box>

                        {/* Pagination */}
                        {sentences.length > 0 && (
                            <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.grey[300]}` }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Button onClick={handlePrevPage} disabled={currentPage === 1}>Previous</Button>
                                    <Typography variant="body1">Page {currentPage} of {totalPages}</Typography>
                                    <Button onClick={handleNextPage} disabled={currentPage === totalPages}>Next</Button>
                                </Box>
                            </Box>
                        )}
                    </Paper>
                </Box>

                {/* RIGHT PANEL: ANNOTATION DETAILS */}
                <Box sx={{ width: '50%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Annotation Details{selectedSentenceData && selectedSentenceData.tags && (<Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>({selectedSentenceData.tags.length} tags)</Typography>)}</Typography>
                        
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
                            {selectedSentenceData ? (renderAnnotationView(selectedSentenceData)) : (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 2 }}><Typography color="text.secondary" variant="h6" textAlign="center">Select a sentence to view annotations</Typography><Typography color="text.secondary" variant="body2" textAlign="center">Click on any sentence from the left panel to see its annotation details here.</Typography></Box>)}
                        </Box>
                    </Paper>
                </Box>
            </Box>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}