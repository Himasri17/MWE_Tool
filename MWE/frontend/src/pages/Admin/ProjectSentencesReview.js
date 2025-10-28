import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Box, Typography, Button, Paper, CircularProgress,
    useTheme, IconButton, Tooltip, Divider,
    Chip, Alert, Snackbar, Card, CardContent
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import { getAuthHeaders, removeToken } from '../../components/authUtils';
import Navbar from '../../components/Navbar';


export default function ProjectSentencesReview() {
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
    const sentencesPerPage = 6; 

    const handleUnauthorized = () => {
        removeToken();
        navigate('/login');
    };

    const fetchSentencesForReview = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError(null);
        setDebugInfo(null);
        
        try {
            console.log(`🔄 Fetching sentences for project: ${projectId}, user: ${targetUsername}`);
            
            const response = await fetch(`http://127.0.0.1:5001/api/projects/${projectId}/sentences?username=${targetUsername}`, {
                headers: getAuthHeaders()
            });
            
            console.log(`📡 Response status: ${response.status}`);
            
            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized();
                    return;
                }
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('✅ Fetched data:', data);
            
            // Calculate debug information
            const totalSentences = data.sentences?.length || 0;
            const annotatedSentences = data.sentences?.filter(s => s.is_annotated)?.length || 0;
            const sentencesWithTags = data.sentences?.filter(s => s.tags && s.tags.length > 0)?.length || 0;
            const totalTags = data.sentences?.reduce((sum, s) => sum + (s.tags?.length || 0), 0) || 0;
            
            setDebugInfo({
                totalSentences,
                annotatedSentences,
                sentencesWithTags,
                totalTags,
                projectName: data.project_name,
                apiResponse: data
            });

            setSentences(data.sentences || []);
            setProjectName(data.project_name || `Project ${projectId}`);

            if (!showLoading) {
                showSnackbar(`Refreshed! ${totalSentences} sentences, ${annotatedSentences} annotated`, 'success');
            }

        } catch (error) {
            console.error("❌ Review Load Error:", error);
            setError(error.message);
            setSentences([]);
            showSnackbar(`Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, targetUsername]); 

    const handleRefresh = () => {
        fetchSentencesForReview(false);
    };


    useEffect(() => {
        fetchSentencesForReview();
    }, [fetchSentencesForReview]);

    // --- Handlers ---
    const handleLogout = async () => { 
        removeToken();
        navigate('/login'); 
    };
    const handleBack = () => {
        navigate(`/admin/${username}`);
    };

    const handleSentenceClick = (sentenceData) => {
        setSelectedSentenceData(sentenceData);
    };

    const showSnackbar = (message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };
    
    // --- Pagination Logic ---
    const totalPages = Math.ceil(sentences.length / sentencesPerPage);
    const indexOfLastSentence = currentPage * sentencesPerPage;
    const indexOfFirstSentence = indexOfLastSentence - sentencesPerPage;
    const currentSentences = sentences.slice(indexOfFirstSentence, indexOfLastSentence);
    
    const handleNextPage = () => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); };
    const handlePrevPage = () => { setCurrentPage(prev => Math.max(prev - 1, 1)); };

    // --- Annotation Rendering Function ---
    const renderAnnotationView = (sentenceData) => {
        if (!sentenceData) {
            return <Alert severity="info">No sentence selected.</Alert>;
        }

        const hasTags = sentenceData.tags && sentenceData.tags.length > 0;

        return (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ wordBreak: 'break-word', flex: 1 }}>
                        {sentenceData.textContent || "Sentence Text Missing"}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, ml: 1 }}>
                        <Chip 
                            label={sentenceData.is_annotated ? "Annotated" : "Not Annotated"} 
                            color={sentenceData.is_annotated ? "success" : "default"}
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
                
                {!hasTags ? (
                    <Alert severity="info">
                        No annotations found for this sentence.
                        {sentenceData.is_annotated && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                This sentence is marked as annotated but has no tags. This might indicate a data inconsistency.
                            </Typography>
                        )}
                    </Alert>
                ) : (
                    <Box>
                        <Typography variant="subtitle1" color="primary" gutterBottom>
                            Annotations ({sentenceData.tags.length}):
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {sentenceData.tags.map((tag, index) => (
                                <Tooltip 
                                    key={index} 
                                    title={
                                        <Box>
                                            <div><strong>Text:</strong> {tag.text}</div>
                                            <div><strong>Type:</strong> {tag.tag}</div>
                                            <div><strong>Annotated by:</strong> {tag.annotated_by || 'Unknown'}</div>
                                            <div><strong>Date:</strong> {tag.annotated_on || tag.annotation_date || 'Unknown'}</div>
                                            <div><strong>Tag ID:</strong> {tag._id}</div>
                                        </Box>
                                    } 
                                    arrow
                                >
                                    <Chip 
                                        label={`${tag.text} (${tag.tag})`} 
                                        size="small"
                                        color={tag.mweId ? "secondary" : "primary"}
                                        variant="filled"
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                </Tooltip>
                            ))}
                        </Box>
                    </Box>
                )}
                
                {/* Debug Information */}
                <Card variant="outlined" sx={{ mt: 3, backgroundColor: theme.palette.grey[50] }}>
                    <CardContent>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                            <InfoIcon sx={{ mr: 1, fontSize: 18 }} />
                            Sentence Debug Info
                        </Typography>
                        <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                            <div><strong>Sentence ID:</strong> {sentenceData._id}</div>
                            <div><strong>Is Annotated:</strong> {sentenceData.is_annotated ? 'Yes' : 'No'}</div>
                            <div><strong>Original Index:</strong> {sentenceData.original_index}</div>
                            <div><strong>Project ID:</strong> {sentenceData.project_id}</div>
                            <div><strong>Username:</strong> {sentenceData.username}</div>
                            {sentenceData.annotation_datetime && (
                                <div><strong>Annotation Date:</strong> {new Date(sentenceData.annotation_datetime).toLocaleString()}</div>
                            )}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        );
    };

    const PASTEL_ANNOTATED_GREEN = '#C8E6C9'; 
    const renderSentenceBox = (sentence) => (
    <Paper
        key={sentence._id}
        onClick={() => handleSentenceClick(sentence)} 
        elevation={selectedSentenceData?._id === sentence._id ? 3 : 1}
        sx={{
            p: 2, 
            mb: 2, 
            cursor: 'pointer', 
            backgroundColor: selectedSentenceData?._id === sentence._id 
                ? theme.palette.action.selected 
                // UPDATED COLOR LOGIC HERE: Use the pastel green hex for annotated sentences
                : (sentence.is_annotated ? PASTEL_ANNOTATED_GREEN : theme.palette.common.white),
            border: selectedSentenceData?._id === sentence._id 
                ? `2px solid ${theme.palette.primary.main}` 
                : `1px solid ${theme.palette.grey[300]}`,
            '&:hover': { 
                backgroundColor: theme.palette.action.hover,
                boxShadow: theme.shadows[2] 
            },
            transition: 'all 0.2s ease-in-out'
        }}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography 
                variant="body1" 
                sx={{ 
                    fontWeight: 500, 
                    color: theme.palette.text.primary,
                    wordBreak: 'break-word',
                    flex: 1
                }}
            >
                {sentence.textContent}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                {sentence.is_annotated && (
                    <Chip 
                        label="Annotated" 
                        size="small" 
                        color="success" 
                        variant="filled"
                        sx={{ minWidth: 90 }}
                    />
                )}
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
        {sentence.tags && sentence.tags.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {sentence.tags.slice(0, 3).map((tag, index) => (
                    <Chip 
                        key={index}
                        label={`${tag.text} (${tag.tag})`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 24 }}
                    />
                ))}
                {sentence.tags.length > 3 && (
                    <Chip 
                        label={`+${sentence.tags.length - 3} more`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 24 }}
                    />
                )}
            </Box>
        )}
    </Paper>
);




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
            <Navbar username={username} showFeedbackBadge={false} />
        

            {/* Main Content */}
            <Box sx={{ 
                display: 'flex', 
                width: '100vw', 
                height: 'calc(100vh - 60px)',
                p: 3,
                gap: 3,
                boxSizing: 'border-box',
                margin: 0
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
                                    <Typography variant="body2" color="text.secondary">
                                        Reviewing: {targetUsername}
                                    </Typography>
                                </Box>
                            </Box>
                            <Tooltip title="Refresh Data">
                                <IconButton onClick={handleRefresh} sx={{ color: theme.palette.primary.main }}>
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        {/* Debug Info Card */}
                        {debugInfo && (
                            <Card variant="outlined" sx={{ mb: 2, backgroundColor: theme.palette.info.light }}>
                                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" fontWeight="bold">
                                            📊 Session Overview
                                        </Typography>
                                        
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                                        <Chip label={`Total: ${debugInfo.totalSentences}`} size="small" variant="outlined" />
                                        <Chip 
                                            label={`Annotated: ${debugInfo.annotatedSentences}`} 
                                            size="small" 
                                            color="success" 
                                            variant="outlined" 
                                        />
                                        <Chip 
                                            label={`With Tags: ${debugInfo.sentencesWithTags}`} 
                                            size="small" 
                                            color="primary" 
                                            variant="outlined" 
                                        />
                                        <Chip label={`Tags: ${debugInfo.totalTags}`} size="small" variant="outlined" />
                                    </Box>
                                </CardContent>
                            </Card>
                        )}

                        {/* Error Alert */}
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }} action={
                                <Button color="inherit" size="small" onClick={handleRefresh}>
                                    RETRY
                                </Button>
                            }>
                                {error}
                            </Alert>
                        )}

                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Sentences ({sentences.length})
                        </Typography>
                        
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                            {currentSentences.length > 0 ? (
                                currentSentences.map(renderSentenceBox)
                            ) : (
                                <Box sx={{ textAlign: 'center', mt: 4, p: 3 }}>
                                    <Typography color="text.secondary" gutterBottom variant="h6">
                                        No sentences found
                                    </Typography>
                                    <Typography color="text.secondary" gutterBottom>
                                        No sentences found for user "{targetUsername}" in this project.
                                    </Typography>
                                    <Button variant="contained" onClick={handleRefresh} sx={{ mt: 1 }}>
                                        Refresh Data
                                    </Button>
                                </Box>
                            )}
                        </Box>

                        {/* Pagination */}
                        {sentences.length > 0 && (
                            <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.grey[300]}` }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Button onClick={handlePrevPage} disabled={currentPage === 1}>
                                        Previous
                                    </Button>
                                    <Typography variant="body1">
                                        Page {currentPage} of {totalPages}
                                    </Typography>
                                    <Button onClick={handleNextPage} disabled={currentPage === totalPages}>
                                        Next
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </Paper>
                </Box>

                {/* RIGHT PANEL: ANNOTATION DETAILS */}
                <Box sx={{ width: '50%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Annotation Details
                            {selectedSentenceData && selectedSentenceData.tags && (
                                <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                                    ({selectedSentenceData.tags.length} tags)
                                </Typography>
                            )}
                        </Typography>
                        
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
                            {selectedSentenceData ? (
                                renderAnnotationView(selectedSentenceData)
                            ) : (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
                                    <Typography color="text.secondary" variant="h6" textAlign="center">
                                        Select a sentence to view annotations
                                    </Typography>
                                    <Typography color="text.secondary" variant="body2" textAlign="center">
                                        Click on any sentence from the left panel to see its annotation details here.
                                    </Typography>
                                </Box>
                            )}
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