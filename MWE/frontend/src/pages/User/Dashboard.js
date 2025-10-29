import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Container, Typography, TextField, Button, Box, List, ListItem, ListItemText,
    Paper, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, Chip, CircularProgress, 
    Grid, LinearProgress, Card, CardContent ,FormControl, InputLabel, Select, MenuItem, useTheme
} from "@mui/material";
import FeedbackIcon from '@mui/icons-material/Feedback'; 
import {  getToken, removeToken } from '../../components/authUtils'; 


import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FeedbackDialog from './FeedbackDialog'; 

export default function Dashboard() {
    const { username } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    // --- State Management ---
    const [userData, setUserData] = useState(null);
    const [projectTasks, setProjectTasks] = useState([]);
    const [allSentences, setAllSentences] = useState([]);
    const [visibleSentences, setVisibleSentences] = useState([]);
    const [tags, setTags] = useState([]);
    const [selectedSentence, setSelectedSentence] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [autoTags, setAutoTags] = useState([]);
    const [newSelection, setNewSelection] = useState({ isActive: false, text: '', tag: '' });
    const [editingSentence, setEditingSentence] = useState({ isActive: false, _id: null, textContent: '' });
    const [editingTag, setEditingTag] = useState({ isActive: false, _id: null, text: '', tag: '' });
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, sentenceId: null });
    const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
    const [file, setFile] = useState(null);
    const [bulkTag, setBulkTag] = useState('');
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [tagRecommendations, setTagRecommendations] = useState([]);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [statsDialogOpen, setStatsDialogOpen] = useState(false);
    const [tagStats, setTagStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    
    // FIXED: Use state for currentSentenceTags instead of derived value
    const [currentSentenceTags, setCurrentSentenceTags] = useState([]);

    // --- SEARCH & TAG MATCH STATES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [matchedTag, setMatchedTag] = useState(null);
    const PREDEFINED_TAGS = [
        "Noun Compound",
        "Reduplicated", 
        "Echo",
        "Opaque",
        "Opaque-Idiom"
    ];

    // --- PROJECT STATES ---
    const [selectedProject, setSelectedProject] = useState(null); 
    const [projectName, setProjectName] = useState(""); 

    // --- Ref for scroll control ---
    const listRef = useRef(null);
    const isInitialLoad = useRef(true);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            navigate("/");
            return;
        }
    }, [navigate]);

    const fetchWithAuth = async (url, options = {}) => {
        const token = getToken();
        
        // For logout endpoint, always try to send the request even with expired token
        const isLogoutEndpoint = url.includes('/logout');
        
        if (!token && !isLogoutEndpoint) {
            navigate("/");
            return null;
        }

        const headers = {
            ...options.headers,
        };
        
        // Only add Authorization header if we have a token
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            // For logout, we don't care about 401 responses
            if (response.status === 401 && !isLogoutEndpoint) {
                removeToken();
                navigate("/");
                return null;
            }

            return response;
        } catch (error) {
            // For logout endpoint, don't navigate away on network errors
            if (!isLogoutEndpoint) {
                removeToken();
                navigate("/");
            }
            return null;
        }
    };

    const fetchTags = useCallback(async () => {
        try {
            console.log("DEBUG: Starting to fetch tags for user:", username);
            const res = await fetchWithAuth(`http://127.0.0.1:5001/tags/${username}`);
            if (!res) return; // Authentication failed
            
            if (!res.ok) throw new Error("Failed to fetch tags");
            
            const tagsData = await res.json();
            console.log("DEBUG: Tags fetched from server:", tagsData);
            console.log("DEBUG: Number of tags received:", tagsData.length);
            
            setTags(tagsData);
        } catch (err) { 
            console.error("Error fetching tags:", err); 
        }
    }, [username]);

    useEffect(() => {
        if (selectedSentence && tags.length > 0) {
            const filteredTags = tags.filter(tag => {
                const matches = tag.source_sentence_id === selectedSentence._id;
                console.log(`Filtering tag ${tag._id} for sentence ${selectedSentence._id}: ${matches}`);
                return matches;
            });
            console.log("Setting currentSentenceTags to:", filteredTags);
            setCurrentSentenceTags(filteredTags);
        } else {
            console.log("Clearing currentSentenceTags");
            setCurrentSentenceTags([]);
        }
    }, [selectedSentence, tags]);

    const loadAllUserTasks = useCallback(async (setLoading = true) => {
        if (setLoading) setIsLoading(true);
        try {
            const res = await fetchWithAuth(`http://127.0.0.1:5001/sentences/${username}`);
            if (!res) return; // Authentication failed
            
            if (!res.ok) throw new Error("Failed to fetch all user tasks.");
            const data = await res.json();
            
            const projects = data.project_tasks || [];
            setProjectTasks(projects);
            
            // Determine initial view (Project is prioritized)
            let initialProject = null;
            if (projects.length > 0) {
                initialProject = projects.find(p => p.completed < p.total);
                if (!initialProject) {
                    initialProject = projects[0]; 
                }
            }

            // Set initial visibility based on selection
            if (initialProject) {
                setSelectedProject(initialProject);
                setProjectName(initialProject.project_name);
                setAllSentences(initialProject.sentences || []);
            } else {
                setSelectedProject(null);
                setProjectName(projects.length > 0 ? "No Unfinished Tasks Selected" : "No Assigned Projects");
                setAllSentences([]); 
                setVisibleSentences([]); 
            }
            
            setSelectedSentence(null); 
            setSearchTerm(''); 
            
        } catch (err) { 
            console.error("Error loading user tasks:", err); 
            setProjectTasks([]);
            setAllSentences([]);
            setVisibleSentences([]);
        } finally {
            if (setLoading) setIsLoading(false);
        }
    }, [username]);


    useEffect(() => {
        const loadData = async () => {
            await fetchTags();
            await loadAllUserTasks();
        };
        loadData();
    }, [fetchTags, loadAllUserTasks]);

    useEffect(() => {
        // Close recommendations when selecting a different sentence
        if (!selectedSentence) {
            setShowRecommendations(false);
            setTagRecommendations([]);
        }
    }, [selectedSentence]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:5001/api/user/${username}`);
                if (res.ok) {
                    const data = await res.json();
                    setUserData(data);
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
            }
        };
        
        if (username) {
            fetchUserData();
        }
    }, [username]);

    // --- UPDATED: Search Filtering Effect (Handles Sentence and Tag Match) ---
    useEffect(() => {
        const normalizedSearchTerm = searchTerm.toLowerCase().trim();

        if (normalizedSearchTerm === '') {
            setVisibleSentences(allSentences);
            setMatchedTag(null); 
            return;
        }

        // 1. Find if the search term matches any tag (text or label) globally
        const foundTag = tags.find(tag => 
            tag.text.toLowerCase() === normalizedSearchTerm || 
            tag.tag.toLowerCase() === normalizedSearchTerm
        );
        
        setMatchedTag(foundTag || null);
        setSelectedSentence(null); // Clear selected sentence when a search is active

        // 2. Filter sentences based on content or associated tag
        const filtered = allSentences.filter(sentence => {
            const textMatch = sentence.textContent.toLowerCase().includes(normalizedSearchTerm);

            const sentenceTags = tags.filter(t => t.source_sentence_id === sentence._id);
            const tagMatch = sentenceTags.some(tag => 
                tag.text.toLowerCase().includes(normalizedSearchTerm) || 
                tag.tag.toLowerCase().includes(normalizedSearchTerm)
            );
            
            return textMatch || tagMatch;
        });

        setVisibleSentences(filtered);
    }, [searchTerm, allSentences, tags]);
    
    // Scroll to first unannotated sentence only on initial load
    useEffect(() => {
        if (isLoading || visibleSentences.length === 0 || !listRef.current || !isInitialLoad.current || searchTerm.length > 0) return;

        const firstUnannotatedIndex = visibleSentences.findIndex(s => !s.is_annotated);
        if (firstUnannotatedIndex !== -1) {
            const targetElement = listRef.current.children[firstUnannotatedIndex];
            if (targetElement) {
                const listContainer = listRef.current;
                const offsetTop = targetElement.offsetTop;
                listContainer.scrollTop = offsetTop;
            }
        }
        isInitialLoad.current = false;
    }, [isLoading, visibleSentences, searchTerm]);
    
    useEffect(() => {
        console.log("DEBUG: Auto-tag detection running", {
            selectedSentence: selectedSentence?.textContent,
            currentSentenceTags: currentSentenceTags,
            newSelectionActive: newSelection.isActive
        });

        if (!selectedSentence || currentSentenceTags.length === 0) {
            console.log("DEBUG: No selected sentence or no current tags");
            setAutoTags([]);
            return;
        }
        
        const uniqueTagTexts = [...new Set(currentSentenceTags.map(t => t.text.toLowerCase()))];
        const foundTags = [];
        
        console.log("DEBUG: Unique tag texts to check:", uniqueTagTexts);
        
        uniqueTagTexts.forEach(tagText => {
            const regex = new RegExp(`\\b${tagText}\\b`, 'i');
            if (regex.test(selectedSentence.textContent)) {
                console.log("DEBUG: Found matching tag in sentence:", tagText);
                const originalTag = currentSentenceTags.find(t => t.text.toLowerCase() === tagText);
                if (originalTag) {
                    foundTags.push({ 
                        phrase: originalTag.text,
                        recommended_tag: originalTag.tag,
                        confidence: 0.95,
                        occurrence_count: 1,
                        is_auto_detected: true
                    });
                }
            }
        });
        
        console.log("DEBUG: Found auto-detected tags:", foundTags);
        
        // ONLY set as recommendations, don't auto-apply
        if (foundTags.length > 0) {
            console.log("DEBUG: Setting auto-detected tags as recommendations only");
            setTagRecommendations(prev => {
                // Keep API recommendations and add auto-detected ones
                const apiRecs = prev.filter(rec => !rec.is_auto_detected);
                return [...foundTags, ...apiRecs];
            });
        }
    }, [selectedSentence, currentSentenceTags]);

    const logUserAction = async (description) => {
    try {
        await fetchWithAuth('http://127.0.0.1:5001/api/log-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                description: description
            })
        });
    } catch (error) {
        console.error('Failed to log action:', error);
    }
};

    const fetchTagRecommendations = async (text) => {
        if (!text || text.trim().length < 2) {
            // Don't clear auto-detected tags, only clear API recommendations
            setTagRecommendations(prev => prev.filter(rec => rec.is_auto_detected));
            return;
        }

        setIsLoadingRecommendations(true);
        try {
            const response = await fetchWithAuth('http://127.0.0.1:5001/api/recommend-tags/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });

            if (!response) return;

            if (response.ok) {
                const data = await response.json();
                // Merge API recommendations with existing auto-detected tags
                const apiRecommendations = data.recommendations || [];
                setTagRecommendations(prev => {
                    const autoDetected = prev.filter(rec => rec.is_auto_detected);
                    return [...autoDetected, ...apiRecommendations];
                });
                setShowRecommendations(true);
            } else {
                console.error('Failed to fetch recommendations');
                // Keep auto-detected tags even if API fails
                setTagRecommendations(prev => prev.filter(rec => rec.is_auto_detected));
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            // Keep auto-detected tags even if API fails
            setTagRecommendations(prev => prev.filter(rec => rec.is_auto_detected));
        } finally {
            setIsLoadingRecommendations(false);
        }
    };


    // --- Event Handlers ---
    
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

     const handleOpenStats = async () => {
        setIsLoadingStats(true);
        setStatsDialogOpen(true);
        
        try {
            const response = await fetchWithAuth('http://127.0.0.1:5001/api/recommendation-stats');
            if (!response) return; // Authentication failed
            
            if (response.ok) {
                const stats = await response.json();
                setTagStats(stats);
            } else {
                console.error('Failed to fetch tag stats');
                setTagStats(null);
            }
        } catch (error) {
            console.error('Error fetching tag stats:', error);
            setTagStats(null);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSelectedSentence(null);
    setNewSelection({ isActive: false, text: '', tag: '' });
    setEditingTag({ isActive: false, _id: null, text: '', tag: '' });
    setSearchTerm(''); // Clear search on project switch
    setMatchedTag(null); // Clear tag match on project switch
    isInitialLoad.current = true;
    
    // Log project selection
    if (project) {
        logUserAction(`Selected project: "${project.project_name}"`);
    } else {
        logUserAction('Deselected project');
    }
    
    if (project === null) {
        setAllSentences([]);
        setVisibleSentences([]);
        setProjectName("No Project Selected");
    } else {
        const fullProject = projectTasks.find(p => p.project_name === project.project_name);
        if (fullProject) {
            setAllSentences(fullProject.sentences);
            setVisibleSentences(fullProject.sentences);
            setProjectName(fullProject.project_name);
        }
    }
};

    const handleSelectionEvent = (sentence) => {
    const highlightedText = window.getSelection().toString().trim();
    setSelectedSentence(sentence);
    setEditingTag({ isActive: false, _id: null, text: '', tag: '' });

    // Log sentence selection
    logUserAction(`Selected sentence for annotation`);

    if (highlightedText.length > 0 && !editingSentence.isActive) {
        let suggestion = "Noun Compound";
        const lowerCaseText = highlightedText.toLowerCase();
        const existingTag = tags.find(t => t.text.toLowerCase() === lowerCaseText);

        if (existingTag) {
            suggestion = existingTag.tag;
        }
        
        setNewSelection({ isActive: true, text: highlightedText, tag: suggestion });
        
        // Immediately check for auto-detected tags from current sentence
        const autoDetectedTags = findAutoDetectedTags(sentence, highlightedText);
        if (autoDetectedTags.length > 0) {
            setTagRecommendations(autoDetectedTags);
            setShowRecommendations(true);
        }
        
        // Then fetch API recommendations
        fetchTagRecommendations(highlightedText);
    } else {
        setNewSelection({ isActive: false, text: '', tag: '' });
        setTagRecommendations([]);
        setShowRecommendations(false);
    }
};

    // Add this helper function
    const findAutoDetectedTags = (sentence, highlightedText) => {
        if (!sentence || !currentSentenceTags.length) return [];
        
        const uniqueTagTexts = [...new Set(currentSentenceTags.map(t => t.text.toLowerCase()))];
        const foundTags = [];
        
        uniqueTagTexts.forEach(tagText => {
            const regex = new RegExp(`\\b${tagText}\\b`, 'i');
            if (regex.test(sentence.textContent)) {
                const originalTag = currentSentenceTags.find(t => t.text.toLowerCase() === tagText);
                if (originalTag) {
                    foundTags.push({ 
                        phrase: originalTag.text,
                        recommended_tag: originalTag.tag,
                        confidence: 0.95,
                        occurrence_count: 1,
                        is_auto_detected: true
                    });
                }
            }
        });
        
        return foundTags;
    };

    const handleSelectRecommendation = (recommendation) => {
    setNewSelection(prev => ({
        ...prev,
        tag: recommendation.recommended_tag
    }));
    setShowRecommendations(false);
    
    // Log recommendation selection
    logUserAction(`Selected recommended tag: "${recommendation.recommended_tag}" for phrase: "${recommendation.phrase}"`);
};


   const handleSaveNewTag = async () => {
    if (!selectedSentence || !newSelection.text.trim() || !newSelection.tag.trim()) {
        return alert("Please provide both text and a tag label.");
    }
    
    const response = await fetchWithAuth(`http://127.0.0.1:5001/tags`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username,
            text: newSelection.text.trim(),
            tag: newSelection.tag.trim(),
            sentenceId: selectedSentence._id
        }),
    });
    
    if (!response) return; // Authentication failed
    
    // Log the tag creation action
    await logUserAction(`Added tag: "${newSelection.text.trim()}" as "${newSelection.tag.trim()}" for sentence`);
    
    await fetchTags();
    setNewSelection({ isActive: false, text: '', tag: '' });
};
    const handleRemoveTag = async (tagId) => {
    if (!selectedSentence) return;
    
    // Get tag info before deletion for logging
    const tagToRemove = currentSentenceTags.find(tag => tag._id === tagId);
    
    const response = await fetchWithAuth(`http://127.0.0.1:5001/api/tags/${tagId}`, { 
        method: 'DELETE' 
    });
    
    if (!response) return; // Authentication failed
    
    if (response.ok) {
        // Log the tag removal action
        if (tagToRemove) {
            await logUserAction(`Removed tag: "${tagToRemove.text}" (${tagToRemove.tag}) from sentence`);
        }
        
        await fetchTags();
    } else {
        console.error('Failed to remove tag');
        alert('Failed to remove tag. Please try again.');
    }
};


    const handleStartEditTag = (tag) => {
        setEditingTag({ isActive: true, _id: tag._id, text: tag.text, tag: tag.tag });
        setNewSelection({ isActive: false, text: '', tag: '' });
    };

    

     // Update the handleUpdateTag function
const handleUpdateTag = async () => {
    if (!editingTag._id) return;

    // Local update for snappier UI
    setTags(prevTags =>
        prevTags.map(tag =>
            tag._id === editingTag._id
                ? { ...tag, text: editingTag.text, tag: editingTag.tag }
                : tag
        )
    );

    try {
        const response = await fetchWithAuth(`http://127.0.0.1:5001/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                text: editingTag.text.trim(),
                tag: editingTag.tag.trim(),
                sentenceId: selectedSentence._id 
            })
        });
        
        if (!response) return; // Authentication failed
        
        // Log the tag update action
        await logUserAction(`Updated tag to: "${editingTag.text.trim()}" as "${editingTag.tag.trim()}"`);
        
    } catch (err) {
        console.error("Error updating tag:", err);
    }

    setEditingTag({ isActive: false, _id: null, text: '', tag: '' });
};


    const handleStatusChange = async (isAnnotated) => {
    if (!selectedSentence) return;

    // Optimistic UI Update
    const updatedAllSentences = allSentences.map(s =>
        s._id === selectedSentence._id ? { ...s, is_annotated: isAnnotated } : s
    );
    setAllSentences(updatedAllSentences);
    setSelectedSentence({ ...selectedSentence, is_annotated: isAnnotated });

    try {
        const response = await fetchWithAuth(`http://127.0.0.1:5001/sentences/${selectedSentence._id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_annotated: isAnnotated, username }),
        });

        if (!response) return; // Authentication failed

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: 'No JSON body available' }));
            console.error(`Status Update Failed: ${response.status}`, errorBody);
            throw new Error(errorBody.error || `Server Error (${response.status})`);
        }
        
        // Log the status change action
        await logUserAction(`Marked sentence as ${isAnnotated ? 'annotated' : 'not annotated'}`);
        
        // Success: reload tasks to update metrics
        await loadAllUserTasks(false); 

    } catch (err) {
        console.error("Final Error in Status Update:", err);
        alert(`Failed to update status. Reason: ${err.message}. Check console.`);
        
        // Revert UI changes and fetch correct data state if update failed
        await loadAllUserTasks(false);
    }
};


    const handleLogout = async () => {
        try {
            // Try to call logout API, but don't fail if it doesn't work
            await fetchWithAuth('http://127.0.0.1:5001/logout', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            }).catch(error => {
                console.warn("Logout API call failed, continuing with client-side logout:", error);
            });
        } catch (error) {
            console.warn("Logout API error, continuing with client-side logout:", error);
        } finally {
            // Always remove token and navigate to login
            removeToken();
            isInitialLoad.current = true;
            navigate("/");
        }
    };

    const handleFeedbackClose = (success = false) => {
        setIsFeedbackOpen(false);
        if (success) {
            console.log("Feedback submission acknowledged.");
        }
    };

    // --- Counters ---
    const totalSentences = allSentences.length;
    const annotatedCount = allSentences.filter(s => s.is_annotated).length;
    const remainingCount = totalSentences - annotatedCount;
    const progressPercent = totalSentences > 0 ? Math.round((annotatedCount / totalSentences) * 100) : 0;
    
    const getProjectCardColor = (isPending) => isPending ? '#ffcdd2' : '#c8e6c9';

    const renderHeaderBar = () => (
        <Box 
            sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                height: '60px', 
                bgcolor: theme.palette.primary.main, 
                color: 'white', 
                p: 2, 
                width: '100%',
                boxSizing: 'border-box',
                flexShrink: 0 
            }}
        >
            <Typography variant="h6" fontWeight={500}>
                MWE Annotator - {userData?.full_name || username || "User"}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {/* User Guidelines Button */}
                <Button 
                    variant="text" 
                    onClick={() => window.open('/MWE Tool - User Guidelines.pdf', '_blank')}
                    sx={{ color: 'white' }}
                >
                    SHOW USER GUIDELINES
                </Button>
                
                {/* Annotation Guidelines Button */}
                <Button 
                    variant="text"
                    onClick={() => window.open('/MWE_Guidelines.pdf', '_blank')}
                    sx={{ color: 'white' }}
                >
                    SHOW ANNOTATION GUIDELINES
                </Button>
                
                {/* Give Feedback Button */}
                <Button 
                    variant="text" 
                    startIcon={<FeedbackIcon />}
                    onClick={() => setIsFeedbackOpen(true)}
                    sx={{ color: 'white' }}
                >
                    Give Feedback
                </Button>
                
                {/* Tag Stats Button */}
                <Button 
                    variant="text" 
                    onClick={handleOpenStats}
                    sx={{ color: 'white' }}
                >
                    TAG STATS
                </Button>
                
                {/* Logout Button (Theme usage fixed here too) */}
                <Button 
                    variant="outlined" 
                    size="small"
                    sx={{ 
                        color: 'white', 
                        borderColor: 'white', 
                        '&:hover': { 
                            backgroundColor: theme.palette.primary.light, // Using theme
                            borderColor: 'white'
                        } 
                    }} 
                    onClick={handleLogout}
                >
                    LOGOUT
                </Button>
            </Box>
        </Box>
    );

    // --- Main Render ---

    return (
        
        <Container maxWidth="l" sx={{ overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {renderHeaderBar()}
            <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4, maxHeight: '90vh', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>Welcome, {userData?.full_name || username || "User"}</Typography>
                </Box>
                
                {/* --- Project Selector --- */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>Assigned Tasks</Typography>
                    <Grid container spacing={2}>
                        {projectTasks.length === 0 ? (
                             <Grid item xs={12}>
                                 <Typography color="text.secondary" sx={{ p: 2 }}>
                                     You have no assigned projects. Please contact your administrator.
                                 </Typography>
                             </Grid>
                        ) : (
                            projectTasks.map(project => {
                                const isPending = project.completed < project.total;
                                const progress = project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0;

                                return (
                                    <Grid item xs={12} sm={6} md={3} key={project.project_name}>
                                        <Card 
                                            onClick={() => handleSelectProject(project)} 
                                            sx={{ 
                                                cursor: 'pointer', 
                                                border: selectedProject?.project_name === project.project_name ? '2px solid #1976d2' : '1px solid #ddd',
                                                backgroundColor: getProjectCardColor(isPending),
                                                height: '100%',
                                            }}
                                        >
                                            <CardContent sx={{ p: 1.5 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                    <FolderOpenIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                                    {project.project_name}
                                                </Typography>
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    {project.completed}/{project.total} done
                                                </Typography>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={progress} 
                                                    sx={{ height: 6, borderRadius: 5, mt: 0.5 }} 
                                                    color={progress === 100 ? 'success' : 'primary'}
                                                />
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                )
                            })
                        )}
                    </Grid>
                </Box>

                {/* --- SEARCH BAR INTEGRATION --- */}
                <Box sx={{ mb: 3 }}>
                    <TextField
                        fullWidth
                        label="Search Sentence Content or Tags (e.g., 'heart', 'Action/Verb')"
                        variant="outlined"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </Box>
    
                <Box sx={{ display: 'flex', gap: 3, mt: 2, maxHeight: '60vh', overflow: 'hidden' }}>
                    <Box sx={{ width: '45%', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
                        <Typography variant="h6" gutterBottom>Subject knowledge Sentences</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2">Total: {totalSentences}</Typography>
                            <Typography variant="subtitle2" color="success.main">Annotated: {annotatedCount}</Typography>
                            <Typography variant="subtitle2" color="error.main">Remaining: {remainingCount}</Typography>
                            <Typography variant="subtitle2">Progress: {progressPercent}%</Typography>
                        </Box>
                        <List
                            ref={listRef}
                            sx={{
                                maxHeight: '50vh',
                                overflowY: 'auto',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                p: 1
                            }}
                        >
                            {isLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                    <CircularProgress />
                                </Box>
                            ) : visibleSentences.length === 0 && totalSentences > 0 ? (
                                <Box sx={{ p: 2 }}>
                                    <Typography color="text.secondary">No sentences match your search term.</Typography>
                                </Box>
                            ) : totalSentences === 0 ? (
                                <Box sx={{ p: 2 }}>
                                    <Typography color="text.secondary">Select a project to view tasks, or contact your admin if no projects are shown above.</Typography>
                                </Box>
                            ) : (
                                visibleSentences.map((s) => (
                                    <ListItem
                                        key={s._id} divider button
                                        selected={selectedSentence && selectedSentence._id === s._id}
                                        onMouseUp={() => handleSelectionEvent(s)}
                                        sx={{
                                            opacity: s.is_annotated ? 0.6 : 1,
                                            borderRadius: '4px', mb: 0.5,
                                            '&:hover .sentence-actions': { visibility: 'visible' }
                                        }}
                                    >
                                        <ListItemText
                                            primary={`${allSentences.findIndex(item => item._id === s._id) + 1}. ${s.textContent}`}
                                            primaryTypographyProps={{ sx: { fontStyle: s.is_annotated ? 'italic' : 'normal' } }}
                                        />
                                        <Box className="sentence-actions" sx={{ visibility: 'hidden', ml: 1, flexShrink: 0 }}>
                                            {/* Delete button removed */}
                                        </Box>
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </Box>
                    <Box sx={{ width: '55%', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
                        <Typography variant="h6" gutterBottom>Editor</Typography>
                        <Box sx={{ flexGrow: 1, border: '1px solid #ddd', borderRadius: '4px', p: 2, overflowY: 'auto' }}>
                            
                            {/* --- MODIFIED: SIMPLIFIED TAG DETAILS (Search Match) --- */}
                            {matchedTag && !selectedSentence ? (
                                <Box>
                                    <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#e3f2fd' }}> 
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Text: {matchedTag.text}</Typography>
                                        <Typography variant="subtitle2" color="primary">Label: {matchedTag.tag}</Typography>
                                    </Box>
                                </Box>
                            ) :
                            /* --- Default message when nothing is selected --- */
                            !selectedSentence ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <Typography color="text.secondary">Select a sentence to begin.</Typography>
                                </Box>
                            ) : editingTag.isActive ? (
                              <Box>
                                <Typography variant="overline">EDIT TAG</Typography>
                                <TextField 
                                label="Editable Tag Text" 
                                fullWidth 
                                variant="outlined" 
                                sx={{ my: 2 }} 
                                value={editingTag.text} 
                                onChange={(e) => setEditingTag(prev => ({ ...prev, text: e.target.value }))} 
                                />
                                
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Tag Label</InputLabel>
                                <Select
                                    value={editingTag.tag}
                                    label="Tag Label"
                                    onChange={(e) => setEditingTag(prev => ({ ...prev, tag: e.target.value }))}
                                >
                                    {PREDEFINED_TAGS.map((tag) => (
                                    <MenuItem key={tag} value={tag}>
                                        {tag}
                                    </MenuItem>
                                    ))}
                                </Select>
                                </FormControl>
                                
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button onClick={handleUpdateTag} variant="contained">Save Changes</Button>
                                <Button onClick={() => setEditingTag({ isActive: false, _id: null, text: '', tag: '' })} variant="outlined">Cancel</Button>
                                </Box>
                            </Box>
                            ) : newSelection.isActive ? (
                                <Box>
                                    <Typography variant="overline">CREATE NEW TAG</Typography>
                                    <TextField 
                                        label="Selected Text" 
                                        fullWidth 
                                        variant="outlined" 
                                        value={newSelection.text} 
                                        onChange={(e) => {
                                            setNewSelection(s => ({ ...s, text: e.target.value }));
                                            fetchTagRecommendations(e.target.value);
                                        }} 
                                        sx={{ my: 2 }} 
                                    />
                                    
                                    {showRecommendations && tagRecommendations.length > 0 && (
                                        <Box sx={{ mb: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f5f5f5' }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                                Recommended Tags:
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {tagRecommendations.slice(0, 5).map((rec, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={`${rec.recommended_tag} (${Math.round(rec.confidence * 100)}%)`}
                                                        onClick={() => handleSelectRecommendation(rec)}
                                                        color={rec.is_auto_detected ? "secondary" : "primary"}
                                                        variant={newSelection.tag === rec.recommended_tag ? "filled" : "outlined"}
                                                        sx={{ cursor: 'pointer' }}
                                                        title={
                                                            rec.is_auto_detected 
                                                                ? `Auto-detected: "${rec.phrase}"` 
                                                                : `Phrase: "${rec.phrase}" - Used ${rec.occurrence_count} times`
                                                        }
                                                    />
                                                ))}
                                            </Box>
                                            {tagRecommendations.some(rec => rec.is_auto_detected) && (
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                    * Purple chips are auto-detected from existing annotations
                                                </Typography>
                                            )}
                                        </Box>
                                    )}

                                    
                                    {isLoadingRecommendations && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <CircularProgress size={20} sx={{ mr: 1 }} />
                                            <Typography variant="body2" color="text.secondary">
                                                Loading recommendations...
                                            </Typography>
                                        </Box>
                                    )}
                                    
                                    <FormControl fullWidth sx={{ mb: 2 }}>
                                        <InputLabel>Tag Label</InputLabel>
                                        <Select
                                            value={newSelection.tag}
                                            label="Tag Label"
                                            onChange={(e) => setNewSelection(s => ({ ...s, tag: e.target.value }))}
                                        >
                                            {PREDEFINED_TAGS.map((tag) => (
                                                <MenuItem key={tag} value={tag}>
                                                    {tag}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button onClick={handleSaveNewTag} variant="contained">Save Tag</Button>
                                        <Button onClick={() => {
                                            setNewSelection({ isActive: false, text: '', tag: '' });
                                            setShowRecommendations(false);
                                            setTagRecommendations([]);
                                        }} variant="outlined">Cancel</Button>
                                    </Box>
                                </Box>
                            ) : (
                                <Box>
                                    <Typography variant="overline">TAGS FOR THIS SENTENCE</Typography>  
                                    <Box sx={{ my: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {currentSentenceTags.map(tag => (
                                            <Chip 
                                                key={tag._id} 
                                                label={
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        {tag.text} ({tag.tag})
                                                        {tag.status === 'pending' && (
                                                            <Box 
                                                                sx={{ 
                                                                    ml: 1,
                                                                    width: 8, 
                                                                    height: 8, 
                                                                    borderRadius: '50%', 
                                                                    backgroundColor: '#ff9800',
                                                                    animation: 'pulse 1.5s infinite'
                                                                }} 
                                                                title="Pending Review"
                                                            />
                                                        )}
                                                    </Box>
                                                }
                                                onDelete={() => handleRemoveTag(tag._id)} // Remove the condition - always show delete
                                                onClick={() => handleStartEditTag(tag)} 
                                                color={tag.status === 'pending' ? "default" : "primary"}
                                                variant={tag.status === 'pending' ? "outlined" : "filled"}
                                                sx={{ 
                                                    cursor: "pointer",
                                                    border: tag.status === 'pending' ? '2px dashed #ff9800' : 'none',
                                                    position: 'relative',
                                                    opacity: tag.status === 'pending' ? 0.8 : 1
                                                }}
                                                title={
                                                    tag.status === 'pending' 
                                                        ? `Pending review - ${tag.review_comments || 'No comments'} - Click to edit, X to delete`
                                                        : `Approved - Annotated by: ${tag.username} - Click to edit, X to delete`
                                                }
                                            />
                                        ))}
                                        
                                        {currentSentenceTags.length === 0 && (
                                            <Typography color="text.secondary">No tags yet. Highlight text to add one.</Typography>
                                        )}
                                    </Box>

                                    <Typography variant="overline" sx={{ mt: 3, display: 'block' }}>SENTENCE ACTIONS</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                        <Button 
                                            variant="contained" 
                                            color="success" 
                                            onClick={() => handleStatusChange(true)} 
                                            disabled={selectedSentence.is_annotated}
                                        >
                                            Mark as Annotated
                                        </Button>
                                        <Button 
                                            variant="outlined" 
                                            color="secondary" 
                                            onClick={() => handleStatusChange(false)} 
                                            disabled={!selectedSentence.is_annotated}
                                        >
                                            Mark as Not Annotated
                                        </Button>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Paper>

            <Dialog open={deleteConfirmation.isOpen} onClose={() => setDeleteConfirmation({ isOpen: false, sentenceId: null })}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>Are you sure you want to delete this sentence? This action cannot be undone.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmation({ isOpen: false, sentenceId: null })} color="secondary">Cancel</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={bulkUploadDialog} onClose={() => setBulkUploadDialog(false)}>
                <DialogTitle>Bulk Upload Sentences</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Upload a .txt, .pdf, .doc, .docx, or .csv file with one sentence per line/paragraph/row.
                        Optionally, add a tag to apply to all sentences.
                    </DialogContentText>
                    <input
                        type="file"
                        accept=".txt,.pdf,.doc,.docx,.csv"
                        onChange={(e) => setFile(e.target.files[0])}
                        style={{ marginTop: '16px', marginBottom: '16px' }}
                    />
                    <TextField
                        fullWidth
                        label="Optional Tag (e.g., Concept/Noun)"
                        value={bulkTag}
                        onChange={(e) => setBulkTag(e.target.value)}
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkUploadDialog(false)} color="secondary">Cancel</Button>
                </DialogActions>
            </Dialog>

             <FeedbackDialog 
                open={isFeedbackOpen} 
                onClose={handleFeedbackClose} 
                userEmail={userData?.email || `${username}@placeholder.com`} 
            />

            <Dialog 
                open={statsDialogOpen} 
                onClose={() => setStatsDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Typography variant="h6" component="div">
                        Tag Database Statistics
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {isLoadingStats ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : tagStats ? (
                        <Box>
                            {/* Summary Section */}
                            <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
                                <Typography variant="h6" gutterBottom>
                                    Summary
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="body2">
                                            <strong>Total Annotated Phrases:</strong> {tagStats.total_annotated_phrases}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2">
                                            <strong>Tag Types:</strong> {tagStats.tag_statistics?.length || 0}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Paper>

                            {/* Tag Type Statistics */}
                            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                Tag Type Distribution
                            </Typography>
                            {tagStats.tag_statistics && tagStats.tag_statistics.length > 0 ? (
                                <Box sx={{ mb: 3 }}>
                                    {tagStats.tag_statistics.map((stat, index) => (
                                        <Paper 
                                            key={stat.tag_type || index} 
                                            elevation={1} 
                                            sx={{ p: 2, mb: 1 }}
                                        >
                                            <Grid container spacing={2} alignItems="center">
                                                <Grid item xs={4}>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {stat.tag_type || 'Unknown'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={3}>
                                                    <Typography variant="body2">
                                                        Total: {stat.total_annotations}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={3}>
                                                    <Typography variant="body2">
                                                        Unique Phrases: {stat.unique_phrases_count}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={2}>
                                                    <Chip 
                                                        label={stat.total_annotations} 
                                                        color="primary" 
                                                        size="small" 
                                                    />
                                                </Grid>
                                            </Grid>
                                            {stat.unique_phrases_count > 0 && (
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                    Sample phrases: {stat.unique_phrases?.slice(0, 3).join(', ')}
                                                    {stat.unique_phrases_count > 3 && '...'}
                                                </Typography>
                                            )}
                                        </Paper>
                                    ))}
                                </Box>
                            ) : (
                                <Typography color="text.secondary" sx={{ mb: 2 }}>
                                    No tag statistics available.
                                </Typography>
                            )}

                            {/* Most Common Phrases */}
                            {tagStats.most_common_phrases && tagStats.most_common_phrases.length > 0 && (
                                <>
                                    <Typography variant="h6" gutterBottom>
                                        Most Common Phrases
                                    </Typography>
                                    <Paper elevation={1} sx={{ p: 2 }}>
                                        <Box sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                                            {tagStats.most_common_phrases.map((phrase, index) => (
                                                <Box 
                                                    key={index} 
                                                    sx={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        alignItems: 'center',
                                                        py: 1,
                                                        borderBottom: index < tagStats.most_common_phrases.length - 1 ? '1px solid #e0e0e0' : 'none'
                                                    }}
                                                >
                                                    <Typography variant="body2">
                                                        "{phrase.phrase}"
                                                    </Typography>
                                                    <Chip 
                                                        label={`${phrase.occurrence_count} times`} 
                                                        size="small" 
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            ))}
                                        </Box>
                                    </Paper>
                                </>
                            )}

                            {/* Additional Statistics */}
                            {tagStats.summary && (
                                <Paper elevation={1} sx={{ p: 2, mt: 2, backgroundColor: '#e8f5e8' }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Database Overview
                                    </Typography>
                                    <Grid container spacing={1}>
                                        <Grid item xs={12}>
                                            <Typography variant="body2">
                                                <strong>Report Generated:</strong> {tagStats.summary.report_generated}
                                            </Typography>
                                        </Grid>
                                        {tagStats.summary.total_sentences && (
                                            <Grid item xs={6}>
                                                <Typography variant="body2">
                                                    <strong>Total Sentences:</strong> {tagStats.summary.total_sentences}
                                                </Typography>
                                            </Grid>
                                        )}
                                        {tagStats.summary.annotated_sentences && (
                                            <Grid item xs={6}>
                                                <Typography variant="body2">
                                                    <strong>Annotated Sentences:</strong> {tagStats.summary.annotated_sentences}
                                                </Typography>
                                            </Grid>
                                        )}
                                        {tagStats.summary.annotation_rate && (
                                            <Grid item xs={6}>
                                                <Typography variant="body2">
                                                    <strong>Annotation Rate:</strong> {tagStats.summary.annotation_rate.toFixed(1)}%
                                                </Typography>
                                            </Grid>
                                        )}
                                        {tagStats.summary.total_annotations && (
                                            <Grid item xs={6}>
                                                <Typography variant="body2">
                                                    <strong>Total Annotations:</strong> {tagStats.summary.total_annotations}
                                                </Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Paper>
                            )}
                        </Box>
                    ) : (
                        <Typography color="error" sx={{ p: 2, textAlign: 'center' }}>
                            Failed to load tag statistics.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStatsDialogOpen(false)} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}