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
import UndoIcon from '@mui/icons-material/Undo';    
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { removeToken ,getToken} from '../../components/authUtils'; 

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

    // --- Utility: showSnackbar ---
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

   

    const updateSentenceStatus = useCallback((sentenceId) => {
        // This function is less critical now that we rely on full refresh, 
        // but it maintains local state consistency if needed.
        setSentences(prevSentences => prevSentences.map(s => {
            if (s._id === sentenceId) {
                const hasPendingTags = s.tags.some(tag => tag.review_status === 'Pending');
                const hasApprovedTags = s.tags.some(tag => tag.review_status === 'Approved');
                
                let newReviewStatus = s.review_status || 'Pending';
                let newIsAnnotated = s.is_annotated;
                
                if (hasPendingTags) {
                    newReviewStatus = 'Pending';
                    newIsAnnotated = true;
                } else if (hasApprovedTags) {
                    newReviewStatus = 'Approved';
                    newIsAnnotated = true;
                } else if (newIsAnnotated) {
                    newReviewStatus = (newReviewStatus === 'Approved') ? 'Approved' : 'Rejected';
                } else {
                    newReviewStatus = 'Pending';
                    newIsAnnotated = false;
                }
                
                const updatedSentence = { 
                    ...s, 
                    review_status: newReviewStatus,
                    is_annotated: newIsAnnotated
                };
                
                if (selectedSentenceData && selectedSentenceData._id === sentenceId) {
                    setSelectedSentenceData(updatedSentence);
                }
                
                return updatedSentence;
            }
            return s;
        }));
    }, [selectedSentenceData]);

    const handleUndoApproval = async (tagId, tagText) => {
        if (!selectedSentenceData) return;
        
        const url = `http://127.0.0.1:5001/reviewer/tag/${tagId}/undo-approval`;
        
        setIsReviewSubmitting(true);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reviewerUsername: username 
                }), 
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to undo tag approval.');
            }

            showSnackbar(`Tag '${tagText}' approval undone successfully.`, 'success');
            
            // Refresh the data
            setSelectedSentenceData(null);
            await fetchSentencesForReview(false);
            
        } catch (error) {
            console.error('Undo approval error:', error);
            showSnackbar(`Undo failed: ${error.message}.`, 'error');
        } finally {
            setIsReviewSubmitting(false);
        }
    };

    const handleUndoRejection = async (tagId, tagText) => {
        if (!selectedSentenceData) return;
        
        const url = `http://127.0.0.1:5001/reviewer/tag/${tagId}/undo-rejection`;
        
        setIsReviewSubmitting(true);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reviewerUsername: username 
                }), 
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to undo tag rejection.');
            }

            showSnackbar(`Tag '${tagText}' rejection undone successfully.`, 'success');
            
            // Refresh the data
            setSelectedSentenceData(null);
            await fetchSentencesForReview(false);
            
        } catch (error) {
            console.error('Undo rejection error:', error);
            showSnackbar(`Undo failed: ${error.message}.`, 'error');
        } finally {
            setIsReviewSubmitting(false);
        }
    };

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
            
            const bodyData = { 
                reviewerUsername: username, 
                comments: currentComment.trim()
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
            
            // --- AUTO-REFRESH INTEGRATION START (for tag review) ---
            // 1. Clear selected sentence data
            setSelectedSentenceData(null); 

            // 2. Fetch the entire sentence list again (false for no loading spinner)
            await fetchSentencesForReview(false);
            // --- AUTO-REFRESH INTEGRATION END ---
            
            // Clear the comment field for the tag
            setTagComments(prev => { delete prev[tagId]; return { ...prev }; });

        } catch (error) {
            console.error(`Tag review error (${action}):`, error);
            showSnackbar(`Tag ${action} failed: ${error.message}.`, 'error');
        } finally {
            setIsReviewSubmitting(false);
        }
    };

        // Add these new handler functions after your existing handlers

    const handleSentenceApprove = async () => {
        if (!selectedSentenceData) return;
        
        const url = `http://127.0.0.1:5001/reviewer/sentence/${selectedSentenceData._id}/approve`;
        
        setIsReviewSubmitting(true);

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reviewerUsername: username,
                    comments: reviewComments.trim()
                }), 
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to approve sentence.');
            }

            showSnackbar(`Sentence approved successfully. ${data.approved_tags_count || 0} tags auto-approved.`, 'success');
            
            // Refresh the data
            setSelectedSentenceData(null);
            setReviewComments('');
            await fetchSentencesForReview(false);
            
        } catch (error) {
            console.error('Sentence approval error:', error);
            showSnackbar(`Sentence approval failed: ${error.message}.`, 'error');
        } finally {
            setIsReviewSubmitting(false);
        }
    };

    const handleSentenceReject = async () => {
        if (!selectedSentenceData) return;
        
        // CRITICAL VALIDATION: Comments required for rejection
        if (!reviewComments.trim()) {
            showSnackbar("Comments are required to reject a sentence.", 'warning');
            return;
        }

        const url = `http://127.0.0.1:5001/reviewer/sentence/${selectedSentenceData._id}/reject`;
        
        setIsReviewSubmitting(true);

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reviewerUsername: username,
                    comments: reviewComments.trim()
                }), 
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reject sentence.');
            }

            showSnackbar(`Sentence rejected successfully. ${data.rejected_tags_count || 0} tags auto-rejected.`, 'success');
            
            // Refresh the data
            setSelectedSentenceData(null);
            setReviewComments('');
            await fetchSentencesForReview(false);
            
        } catch (error) {
            console.error('Sentence rejection error:', error);
            showSnackbar(`Sentence rejection failed: ${error.message}.`, 'error');
        } finally {
            setIsReviewSubmitting(false);
        }
    };

    const handleUndoSentenceReview = async () => {
        if (!selectedSentenceData) return;
        
        const url = `http://127.0.0.1:5001/reviewer/sentence/${selectedSentenceData._id}/undo-review`;
        
        setIsReviewSubmitting(true);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reviewerUsername: username 
                }), 
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to undo sentence review.');
            }

            showSnackbar(`Sentence review undone successfully. ${data.reset_tags_count || 0} tags reset to pending.`, 'success');
            
            // Refresh the data
            setSelectedSentenceData(null);
            setReviewComments('');
            await fetchSentencesForReview(false);
            
        } catch (error) {
            console.error('Undo sentence review error:', error);
            showSnackbar(`Undo failed: ${error.message}.`, 'error');
        } finally {
            setIsReviewSubmitting(false);
        }
    };
    // --- Handlers ---
    const handleLogout = async () => { 
        try {
            const token = getToken(); // Use getToken from authUtils
            const reviewerEmail = localStorage.getItem('username');
            
            console.log('🔐 Logout Debug - Before API call:', { 
                token: token ? 'Present' : 'Missing', 
                reviewerEmail 
            });

            if (token && reviewerEmail) {
                const response = await fetch('http://127.0.0.1:5001/logout', {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        username: reviewerEmail
                    }),
                });

                console.log('🔐 Logout API Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('🔐 Logout API Success:', data);
                } else {
                    console.error('🔐 Logout API Failed:', await response.text());
                }
            } else {
                console.warn('🔐 Missing token or username for logout');
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
        } finally {
            localStorage.removeItem('username');
            removeToken(); // Use the function from authUtils
            navigate("/login");
        }
    };
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

    const renderAnnotationView = (sentenceData) => {
        if (!sentenceData) return <Alert severity="info">No sentence selected.</Alert>;
        
        const hasTags = sentenceData.tags && sentenceData.tags.length > 0;
        const currentStatus = sentenceData.review_status || 'Pending'; 
        const isAnnotated = sentenceData.is_annotated;
        
        // Calculate tag statistics
        const pendingTagsCount = sentenceData.tags.filter(t => t.review_status === 'Pending').length;
        const approvedTagsCount = sentenceData.tags.filter(t => t.review_status === 'Approved').length;
        const rejectedTagsCount = sentenceData.tags.filter(t => t.review_status === 'Rejected').length;
        
        const hasMixedStatus = approvedTagsCount > 0 && rejectedTagsCount > 0;
      
        const statusColor = currentStatus === 'Approved' ? 'success' : 
                            currentStatus === 'Rejected' ? 'error' : 
                            currentStatus === 'Partially Approved' ? 'warning' : 'warning';
                                    
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
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {approvedTagsCount > 0 && (
                                    <Chip 
                                        label={`${approvedTagsCount} approved`} 
                                        size="small" 
                                        color="success" 
                                        variant="outlined"
                                    />
                                )}
                                {rejectedTagsCount > 0 && (
                                    <Chip 
                                        label={`${rejectedTagsCount} rejected`} 
                                        size="small" 
                                        color="error" 
                                        variant="outlined"
                                    />
                                )}
                                {pendingTagsCount > 0 && (
                                    <Chip 
                                        label={`${pendingTagsCount} pending`} 
                                        size="small" 
                                        color="warning" 
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        )}
                    </Box>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                {/* Mixed Status Alert */}
                {hasMixedStatus && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        This sentence has both approved and rejected tags. Review individual tags carefully.
                    </Alert>
                )}
                
                {/* Tags Section */}
                <Typography variant="subtitle1" color="primary" gutterBottom>
                    Annotations ({sentenceData.tags.length}):
                </Typography>
                
                {
                    !hasTags ? (
                        <Box>
                            <Alert severity="info" sx={{mb: 3}}>
                                No tags exist for this sentence (staged or approved).
                            </Alert>
                        </Box>
                ) : (
                        <Box sx={{maxHeight: '30vh', overflowY: 'auto', pr: 1, mb: 2}}>
                            {sentenceData.tags.map((tag, index) => {
                                const tagIsPending = tag.review_status === 'Pending';
                                const tagIsApproved = tag.review_status === 'Approved';
                                const tagIsRejected = tag.review_status === 'Rejected';
                                const tagId = tag._id;
                                const currentComment = tagComments[tagId] || tag.review_comments || '';

                                return (
                                    <Box key={tagId} sx={{ 
                                        mb: 2, 
                                        p: 1.5, 
                                        border: `1px solid ${
                                            tagIsPending ? theme.palette.warning.light : 
                                            tagIsApproved ? theme.palette.success.light :
                                            theme.palette.error.light
                                        }`, 
                                        borderRadius: 1,
                                        backgroundColor: tagIsRejected ? theme.palette.error.light + '20' : 'transparent'
                                    }}>
                                        
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {tag.text} 
                                                    <Chip 
                                                        label={tag.tag} 
                                                        size="small" 
                                                        color={
                                                            tagIsPending ? 'warning' : 
                                                            tagIsApproved ? 'success' : 'error'
                                                        } 
                                                        sx={{ ml: 1, height: 20, fontSize: '0.75rem' }} 
                                                    />
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    By: {tag.username} | Status: <span style={{ 
                                                        color: tagIsPending ? theme.palette.warning.dark : 
                                                            tagIsApproved ? theme.palette.success.dark :
                                                            theme.palette.error.dark 
                                                    }}>{tag.review_status}</span>
                                                </Typography>
                                                {tagIsRejected && tag.review_comments && (
                                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                                                        Rejection reason: {tag.review_comments}
                                                    </Typography>
                                                )}
                                            </Box>
                                            
                                            {/* PER-TAG ACTION BUTTONS */}
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                {tagIsPending ? (
                                                    <>
                                                        <Button 
                                                            variant="outlined" 
                                                            size="small"
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
                                                            onClick={() => handleTagReview(tagId, 'Approve', tag.text, currentComment)} 
                                                            startIcon={isReviewSubmitting ? <CircularProgress size={16} color="success" /> : <CheckCircleIcon />}
                                                            color="success"
                                                            disabled={isReviewSubmitting}
                                                        >
                                                            Approve
                                                        </Button>
                                                    </>
                                                ) : tagIsApproved ? (
                                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                        <Chip 
                                                            label="Approved" 
                                                            color="success" 
                                                            size="small" 
                                                            variant="outlined" 
                                                        />
                                                        <Button 
                                                            variant="outlined" 
                                                            size="small"
                                                            onClick={() => handleUndoApproval(tagId, tag.text)} 
                                                            startIcon={isReviewSubmitting ? <CircularProgress size={16} /> : <UndoIcon />}
                                                            color="warning"
                                                            disabled={isReviewSubmitting}
                                                            sx={{ 
                                                                borderColor: theme.palette.warning.main,
                                                                color: theme.palette.warning.dark,
                                                                '&:hover': {
                                                                    backgroundColor: theme.palette.warning.light,
                                                                }
                                                            }}
                                                        >
                                                            Undo
                                                        </Button>
                                                    </Box>
                                                ) : tagIsRejected ? (
                                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                        <Chip 
                                                            label="Rejected" 
                                                            color="error" 
                                                            size="small" 
                                                            variant="outlined" 
                                                        />
                                                        <Button 
                                                            variant="outlined" 
                                                            size="small"
                                                            onClick={() => handleUndoRejection(tagId, tag.text)} 
                                                            startIcon={isReviewSubmitting ? <CircularProgress size={16} /> : <UndoIcon />}
                                                            color="warning"
                                                            disabled={isReviewSubmitting}
                                                            sx={{ 
                                                                borderColor: theme.palette.warning.main,
                                                                color: theme.palette.warning.dark,
                                                                '&:hover': {
                                                                    backgroundColor: theme.palette.warning.light,
                                                                }
                                                            }}
                                                        >
                                                            Undo
                                                        </Button>
                                                    </Box>
                                                ) : null}
                                            </Box>
                                        </Box>

                                        {/* TAG-SPECIFIC COMMENT FIELD - Show for pending tags or rejected tags with comments */}
                                        {(tagIsPending || tagIsRejected) && (
                                            <TextField
                                                fullWidth
                                                size="small"
                                                multiline
                                                rows={1}
                                                value={currentComment}
                                                onChange={(e) => setTagComments(prev => ({ ...prev, [tagId]: e.target.value }))}
                                                placeholder={
                                                    tagIsPending ? "Enter comment for this specific tag..." :
                                                    "Rejection reason (required for rejection)..."
                                                }
                                                variant="filled"
                                                sx={{ mt: 1, backgroundColor: 'white' }}
                                                disabled={!tagIsPending || isReviewSubmitting}
                                                error={tagIsRejected && !currentComment.trim()}
                                                helperText={tagIsRejected && !currentComment.trim() ? "Comment is required for rejection" : ""}
                                            />
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>
                    )
                }
                
                <Divider sx={{ my: 3 }} />

                {/* SENTENCE-LEVEL ACTIONS */}
                <Typography variant="subtitle1" color="primary" gutterBottom>
                    Sentence-Level Review Actions:
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    {currentStatus === 'Pending' && (
                        <>
                            <Button 
                                variant="outlined" 
                                color="error"
                                onClick={handleSentenceReject}
                                disabled={isReviewSubmitting}
                                startIcon={isReviewSubmitting ? <CircularProgress size={16} /> : <CancelIcon />}
                            >
                                Reject Entire Sentence
                            </Button>
                            <Button 
                                variant="contained" 
                                color="success"
                                onClick={handleSentenceApprove}
                                disabled={isReviewSubmitting}
                                startIcon={isReviewSubmitting ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                            >
                                Approve Entire Sentence
                            </Button>
                        </>
                    )}
                    
                    {currentStatus === 'Partially Approved' && (
                        <Alert severity="warning" sx={{ width: '100%' }}>
                            This sentence has mixed tag status. Use individual tag actions or sentence-level actions below.
                        </Alert>
                    )}
                    
                    {(currentStatus === 'Approved' || currentStatus === 'Rejected' || currentStatus === 'Partially Approved') && (
                        <>
                            <Chip 
                                label={`Sentence ${currentStatus}`} 
                                color={
                                    currentStatus === 'Approved' ? 'success' : 
                                    currentStatus === 'Rejected' ? 'error' : 'warning'
                                }
                                variant="outlined"
                                sx={{ fontWeight: 'bold' }}
                            />
                            <Button 
                                variant="outlined" 
                                color="warning"
                                onClick={handleUndoSentenceReview}
                                disabled={isReviewSubmitting}
                                startIcon={isReviewSubmitting ? <CircularProgress size={16} /> : <UndoIcon />}
                            >
                                Reset to Pending
                            </Button>
                        </>
                    )}
                </Box>

                {/* SENTENCE-LEVEL COMMENTS */}
                <TextField
                    fullWidth
                    multiline
                    rows={2}
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder={
                        currentStatus === 'Pending' ? "Enter comments for sentence review (required for rejection)..." :
                        currentStatus === 'Rejected' ? `Rejection reason: ${sentenceData.review_comments || 'No reason provided'}` :
                        currentStatus === 'Approved' ? `Approval comments: ${sentenceData.review_comments || 'No comments provided'}` :
                        "Enter review comments..."
                    }
                    variant="outlined"
                    sx={{ mb: 2 }}
                    disabled={isReviewSubmitting || (currentStatus !== 'Pending')}
                    error={currentStatus === 'Rejected' && !reviewComments.trim()}
                    helperText={
                        currentStatus === 'Rejected' && !reviewComments.trim() ? 
                        "Comment is required for rejection" : 
                        "Comments will be applied to all tags in the sentence"
                    }
                />
            </Box>
        );
    };

    const renderSentenceBox = (sentence) => {
        // --- Custom Pastel Color Definition ---
        const PASTEL_GREEN_HEX = '#E8F5E9'; 
        const PASTEL_ACCENT_HEX = '#C8E6C9'; 

        const PASTEL_BLUE_HEX = '#E3F2FD'; 
        const PASTEL_BLUE_ACCENT_HEX = '#90CAF9'; 

        const PASTEL_YELLOW_HEX = '#FFF9C4'; 
        const PASTEL_YELLOW_ACCENT_HEX = '#FFEB3B'; 

        // --- UPDATED LOGIC FOR MIXED STATUS VISUALIZATION ---
        const pendingTagsCount = sentence.tags.filter(t => t.review_status === 'Pending').length;
        const approvedTagsCount = sentence.tags.filter(t => t.review_status === 'Approved').length;
        const rejectedTagsCount = sentence.tags.filter(t => t.review_status === 'Rejected').length;

        // Determine the effective status for display on the list
        let effectiveReviewStatus = sentence.review_status || 'Pending';
        
        // 1. If pending tags exist, it must be 'Pending'.
        if (pendingTagsCount > 0) {
            effectiveReviewStatus = 'Pending'; 
        } 
        // 2. If all tags are approved, it's 'Approved'.
        else if (approvedTagsCount > 0 && pendingTagsCount === 0 && rejectedTagsCount === 0) {
            effectiveReviewStatus = 'Approved'; 
        }
        // 3. If all tags are rejected, it's 'Rejected'.
        else if (rejectedTagsCount > 0 && pendingTagsCount === 0 && approvedTagsCount === 0) {
            effectiveReviewStatus = 'Rejected';
        }
        // 4. If mixed approved and rejected tags, it's 'Partially Approved'.
        else if (approvedTagsCount > 0 && rejectedTagsCount > 0 && pendingTagsCount === 0) {
            effectiveReviewStatus = 'Partially Approved';
        }
        // 5. Otherwise, use the DB status
        else {
            effectiveReviewStatus = sentence.review_status || 'Pending';
        }

        // --- ENHANCED COLOR ASSIGNMENT LOGIC ---
        let accentColor = theme.palette.grey[300]; 
        let backgroundColor = theme.palette.common.white;
        
        // Determine if the sentence is in the special Annotated & Pending state
        const isAnnotatedAndPending = sentence.is_annotated && effectiveReviewStatus === 'Pending';

        // Condition 1: Approved (Pastel Green)
        if (effectiveReviewStatus === 'Approved') {
            accentColor = PASTEL_ACCENT_HEX; 
            backgroundColor = PASTEL_GREEN_HEX;
        } 
        // Condition 2: Partially Approved (Pastel Yellow)
        else if (effectiveReviewStatus === 'Partially Approved') {
            accentColor = PASTEL_YELLOW_ACCENT_HEX; 
            backgroundColor = PASTEL_YELLOW_HEX;
        }
        // Condition 3: Annotated but Still Pending (Pastel Blue)
        else if (isAnnotatedAndPending) {
            accentColor = PASTEL_BLUE_ACCENT_HEX; 
            backgroundColor = PASTEL_BLUE_HEX;
        }
        // Condition 4: Pending/Non-Annotated (Orange/Warning Color)
        else if (effectiveReviewStatus === 'Pending') {
            accentColor = theme.palette.warning.main; 
            backgroundColor = theme.palette.common.white;
        } 
        // Condition 5: Rejected (Error Color, White Background)
        else if (effectiveReviewStatus === 'Rejected') {
            accentColor = theme.palette.error.main; 
            backgroundColor = theme.palette.common.white;
        }
        
        const isSelected = selectedSentenceData?._id === sentence._id;

        // --- ENHANCED CHIP COLOR LOGIC ---
        let chipColor;
        if (isAnnotatedAndPending) {
            chipColor = 'primary';
        } else if (effectiveReviewStatus === 'Approved') {
            chipColor = 'success';
        } else if (effectiveReviewStatus === 'Partially Approved') {
            chipColor = 'warning';
        } else if (effectiveReviewStatus === 'Rejected') {
            chipColor = 'error';
        } else {
            chipColor = 'warning';
        }

        return (
            <Paper
                key={sentence._id}
                onClick={() => handleSentenceClick(sentence)} 
                elevation={isSelected ? 3 : 1}
                sx={{
                    p: 2, mb: 2, cursor: 'pointer', 
                    backgroundColor: isSelected 
                        ? theme.palette.action.selected 
                        : backgroundColor,
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
                            label={effectiveReviewStatus}
                            size="small" 
                            color={chipColor} 
                            variant="filled"
                            sx={{ minWidth: 80, fontWeight: 'bold' }}
                        />
                        {sentence.tags && sentence.tags.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {approvedTagsCount > 0 && (
                                    <Chip 
                                        label={`${approvedTagsCount}✓`} 
                                        size="small" 
                                        color="success" 
                                        variant="outlined"
                                    />
                                )}
                                {rejectedTagsCount > 0 && (
                                    <Chip 
                                        label={`${rejectedTagsCount}✗`} 
                                        size="small" 
                                        color="error" 
                                        variant="outlined"
                                    />
                                )}
                                {pendingTagsCount > 0 && (
                                    <Chip 
                                        label={`${pendingTagsCount}?`} 
                                        size="small" 
                                        color="warning" 
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        )}
                    </Box>
                </Box>
            </Paper>
        );
    };
    // --- END UPDATED LOGIC ---

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
                <Typography variant="h6" fontWeight={500} sx={{ mx: 1 }}>Multiword Expression Workbench</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> 
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

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}