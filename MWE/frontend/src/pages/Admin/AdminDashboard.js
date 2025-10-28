// Update AdminDashboard.js - Fix the fetchData initialization issue
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Container, Typography, Box, Paper, Button, Chip, Divider,
    List, ListItem, ListItemText, TextField, useTheme,
    IconButton, Menu, MenuItem, Tooltip,
    Skeleton, Dialog, DialogTitle, 
    DialogContent, DialogActions, Alert, Snackbar,Table, TableBody, TableCell, TableContainer, TableHead, TableRow 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'; 
import CloseIcon from '@mui/icons-material/Close';
import CreateProjectModal from './Createprojectmodal';
import AssignUsersDialog from './AssignUsersDialog';
import EditProjectModal from './EditProjectModal';
import ContactUsDialog from '../User/ContactUsDialog';
import TermsDialog from '../User Authentication/TermsDialog';
import { getAuthHeaders, removeToken ,validateToken} from '../../components/authUtils'; 
import Navbar from '../../components/Navbar';

export default function AdminDashboard() {
    const { username } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    // --- State Management ---
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingUsersCount, setPendingUsersCount] = useState(0);
    const [feedbacks, setFeedbacks] = useState([]);
    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [termsDialogOpen, setTermsDialogOpen] = useState(false);

    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [projectsPerPage] = useState(5); // 5 projects per page
    
    // NEW STATES for Assign Users Dialog and Delete Confirmation
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedProjectForEdit, setSelectedProjectForEdit] = useState(null);
    
    // NEW STATE for Feedback Dialog
    const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

    // NEW STATES for Image Preview
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Check if token exists
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                console.error('No token found');
                handleUnauthorized();
                return;
            }

            console.log('Making requests with token:', token);

            const [projectsResponse, pendingUsersResponse, feedbacksResponse] = await Promise.all([
                fetch("http://127.0.0.1:5001/api/projects", {
                    headers: getAuthHeaders()
                }),
                fetch("http://127.0.0.1:5001/admin/pending-users", {
                    headers: getAuthHeaders()
                }),
                fetch("http://127.0.0.1:5001/admin/feedbacks", {
                    headers: getAuthHeaders()
                })
            ]);
            
            console.log('Projects response status:', projectsResponse.status);
            console.log('Pending users response status:', pendingUsersResponse.status);
            console.log('Feedbacks response status:', feedbacksResponse.status);
            
            if (!projectsResponse.ok) {
                console.error(`Projects API Error: Status ${projectsResponse.status}`);
                if (projectsResponse.status === 401 || projectsResponse.status === 403) { 
                    handleUnauthorized();
                    return; 
                }
                setProjects([]);
            } else {
                const projectsData = await projectsResponse.json();
                setProjects(projectsData);
            }

            if (pendingUsersResponse.ok) {
                const pendingUsersData = await pendingUsersResponse.json();
                setPendingUsersCount(pendingUsersData.length);
            } else {
                console.error('Failed to fetch pending users count');
                setPendingUsersCount(0);
            }
            
            if (feedbacksResponse.ok) {
                const feedbacksData = await feedbacksResponse.json();
                setFeedbacks(feedbacksData);
            } else {
                console.error('Failed to fetch feedbacks');
                setFeedbacks([]);
            }
            
        } catch (error) {
            console.error("Dashboard Load Error:", error);
            setProjects([]);
            setPendingUsersCount(0);
            setFeedbacks([]);
        } finally {
            setIsLoading(false); 
        }
    }, []);

    useEffect(() => {
        console.log('Current token:', localStorage.getItem('jwt_token'));
        console.log('Auth headers:', getAuthHeaders());
        }, []);

        useEffect(() => {
        const validateAdminAccess = async () => {
            // First validate token
            if (!validateToken()) {
                handleUnauthorized();
                return;
            }

            try {
                const token = localStorage.getItem('jwt_token');
                const payload = JSON.parse(atob(token.split('.')[1]));
                
                console.log('User role from token:', payload.role);
                
                if (payload.role !== 'admin') {
                    showSnackbar('Admin access required. Please log in as admin.', 'error');
                    setTimeout(() => {
                        removeToken();
                        navigate('/login');
                    }, 2000);
                    return;
                }

                // Token is valid and user is admin, proceed with data fetch
                fetchData();
            } catch (error) {
                console.error('Token validation error:', error);
                handleUnauthorized();
            }
        };

        validateAdminAccess();
    }, [navigate, fetchData]);

  
    // --- Initial data load ---
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Pagination Calculations ---
    const filteredProjects = projects.filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate pagination
    const indexOfLastProject = currentPage * projectsPerPage;
    const indexOfFirstProject = indexOfLastProject - projectsPerPage;
    const currentProjects = filteredProjects.slice(indexOfFirstProject, indexOfLastProject);
    const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);

    // Pagination handlers
    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handlePageClick = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Reset to page 1 when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // --- Handlers ---
    const handleUnauthorized = () => {
        removeToken();
        navigate('/login');
    };

    const handleAddProject = () => { setIsModalOpen(true); };
    const handleProjectCreated = () => { 
        fetchData(); 
        setIsModalOpen(false);
        showSnackbar('Project created successfully!', 'success');
    };
    
    const handleProjectReview = (project) => {
        const targetUsername = project.assigned_user || username; 
        navigate(`/admin/${username}/project/${project.id}/user/${targetUsername}/sentences`);
    };

    // UPDATED: Delete project handler with proper refresh
    const handleDeleteProject = async (projectId, projectName) => {
        setProjectToDelete({ id: projectId, name: projectName });
        setDeleteDialogOpen(true);
    };

    // NEW: Actual delete confirmation with proper state update
    const confirmDeleteProject = async () => {
        if (!projectToDelete) return;

        try {
            const response = await fetch(`http://127.0.0.1:5001/api/projects/${projectToDelete.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                // Remove the project from local state immediately
                setProjects(prev => prev.filter(project => project.id !== projectToDelete.id));
                showSnackbar(result.message || 'Project deleted successfully!', 'success');
            } else {
                if (response.status === 401) {
                    handleUnauthorized();
                    return;
                }
                const errorData = await response.json();
                showSnackbar(errorData.error || 'Delete failed', 'error');
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            showSnackbar('Network error while deleting project', 'error');
        } finally {
            setDeleteDialogOpen(false);
            setProjectToDelete(null);
        }
    };

    // UPDATED: Assign user handler
    const handleAssignUser = (projectId, projectName) => {
        setSelectedProject({ id: projectId, name: projectName });
        setAssignDialogOpen(true);
    };

    // NEW: Handle assign dialog close with refresh
    const handleAssignDialogClose = (success = false) => {
        setAssignDialogOpen(false);
        setSelectedProject(null);
        if (success) {
            fetchData(); // Refresh data if assignment was successful
            showSnackbar('Users assigned successfully!', 'success');
        }
    };

    const handleDownload = (projectId, projectName) => { 
        const token = localStorage.getItem('jwt_token');
        window.open(`http://127.0.0.1:5001/api/projects/${projectId}/download?format=XML&token=${token}`, '_blank'); 
    };

    const handleEditProject = (project) => {
        setSelectedProjectForEdit(project);
        setEditDialogOpen(true);
    };

    const handleProjectUpdated = () => {
        fetchData();
        setEditDialogOpen(false);
        showSnackbar('Project updated successfully!', 'success');
    };

    const handleMarkReviewed = async (feedbackId) => {
        try {
            const response = await fetch(`http://127.0.0.1:5001/admin/feedbacks/${feedbackId}/review`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ adminUsername: username }) 
            });

            if (response.ok) {
                fetchData(); // Refresh data to show the updated status
                showSnackbar(`Feedback ID ${feedbackId} marked as reviewed.`, 'success');
            } else {
                if (response.status === 401) {
                    handleUnauthorized();
                    return;
                }
                const errorData = await response.json();
                showSnackbar(errorData.message || 'Failed to mark as reviewed.', 'error');
            }
        } catch (error) {
            console.error('Error marking feedback reviewed:', error);
            showSnackbar('Network error marking feedback reviewed.', 'error');
        }
    };

    const handleDeleteFeedback = async (feedbackId) => {
        try {
            const response = await fetch(`http://127.0.0.1:5001/admin/feedbacks/${feedbackId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                fetchData(); // Refresh data
                showSnackbar('Feedback deleted successfully!', 'success');
            } else {
                if (response.status === 401) {
                    handleUnauthorized();
                    return;
                }
                const errorData = await response.json();
                showSnackbar(errorData.error || 'Failed to delete feedback', 'error');
            }
        } catch (error) {
            console.error('Error deleting feedback:', error);
            showSnackbar('Network error while deleting feedback', 'error');
        }
    };

    // NEW: Handle image preview
    const handleImagePreview = (filename) => {
        if (filename && filename !== 'None') {
            const imageUrl = `http://127.0.0.1:5001/feedback_uploads/${filename}`;
            setSelectedImage(imageUrl);
            setImagePreviewOpen(true);
        }
    };

    // NEW: Close image preview
    const handleCloseImagePreview = () => {
        setImagePreviewOpen(false);
        setSelectedImage(null);
    };

    // NEW: Open feedback dialog
    const handleOpenFeedbackDialog = () => {
        setFeedbackDialogOpen(true);
    };

    // NEW: Close feedback dialog
    const handleCloseFeedbackDialog = () => {
        setFeedbackDialogOpen(false);
    };

    // NEW: Snackbar helper
    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    // --- Sub-Components ---
    const ProjectItemSkeleton = () => (
        <ListItem sx={{ 
            bgcolor: theme.palette.background.paper, 
            mb: 2, 
            borderRadius: theme.shape.borderRadius, 
            boxShadow: theme.shadows[1], 
            borderLeft: `5px solid ${theme.palette.grey[300]}` 
        }}>
            <ListItemText 
                primary={<Skeleton variant="text" width="60%" height={25} />} 
                secondary={
                    <Typography component="div" variant="body2" color="text.secondary">
                        <Box sx={{ pt: 0.5 }}>
                            <Skeleton variant="text" width="40%"/>
                            <Skeleton variant="text" width="80%"/>
                        </Box>
                    </Typography>
                }
            />
            <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Skeleton variant="circular" width={24} height={24}/>
                <Skeleton variant="circular" width={24} height={24}/>
            </Box>
        </ListItem>
    );

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
                <Typography variant="h6" component="span" fontWeight={600}>
                    Feedback Image
                </Typography>
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
                {selectedImage ? (
                    <img 
                        src={selectedImage} 
                        alt="Feedback attachment" 
                        style={{ 
                            maxWidth: '100%', 
                            maxHeight: '70vh', 
                            objectFit: 'contain' 
                        }} 
                    />
                ) : (
                    <Typography color="text.secondary">No image available</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseImagePreview}>Close</Button>
            </DialogActions>
        </Dialog>
    );

    const ProjectListItem = ({ project }) => {
        const [anchorEl, setAnchorEl] = useState(null);
        const open = Boolean(anchorEl);
        const progressChip = `${project.done}/${project.total}`;
        
        // FIXED: Show assigned users properly
        const assignedUsersDisplay = project.assigned_users && project.assigned_users.length > 0 
            ? project.assigned_users.join(', ')
            : project.assigned_user || 'No users assigned';

        const handleMenuClick = (event) => { 
            setAnchorEl(event.currentTarget); 
            event.stopPropagation(); 
        };
        
        const handleMenuClose = () => { 
            setAnchorEl(null); 
        };

        return (
            <ListItem
                secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip 
                            label={progressChip} 
                            color={project.done === project.total ? "success" : "primary"} 
                            variant="outlined" 
                            size="small" 
                            sx={{ fontWeight: 'bold', mr: 1 }} 
                        />
                        <Tooltip title="Project Actions">
                            <IconButton edge="end" aria-label="more" onClick={handleMenuClick}>
                                <MoreVertIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Project">
                            <IconButton 
                                edge="end" 
                                aria-label="delete" 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleDeleteProject(project.id, project.name); 
                                }} 
                                sx={{ color: theme.palette.error.main, ml: 1 }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                        <Menu 
                            anchorEl={anchorEl} 
                            open={open} 
                            onClose={handleMenuClose}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MenuItem 
                                onClick={() => { 
                                    handleMenuClose(); 
                                    handleAssignUser(project.id, project.name); 
                                }}
                            >
                                <PersonAddIcon fontSize="small" sx={{ mr: 1 }} /> 
                                Assign User
                            </MenuItem>
                            <MenuItem 
                                onClick={() => { 
                                    handleMenuClose(); 
                                    handleDownload(project.id, project.name);
                                }}
                            >
                                <FileDownloadIcon fontSize="small" sx={{ mr: 1 }} /> 
                                Download File
                            </MenuItem>
                            <MenuItem 
                                onClick={() => { 
                                    handleMenuClose(); 
                                    handleEditProject(project); 
                                }}
                            >
                                <EditIcon fontSize="small" sx={{ mr: 1 }} /> 
                                Edit Project
                            </MenuItem>
                            <Divider />
                            <MenuItem 
                                onClick={() => { 
                                    handleMenuClose(); 
                                    handleProjectReview(project); 
                                }}
                            >
                                View Sentences
                            </MenuItem>
                        </Menu>
                    </Box>
                }
                onClick={() => handleProjectReview(project)} 
                sx={{ 
                    bgcolor: theme.palette.background.paper, 
                    mb: 2, 
                    borderRadius: theme.shape.borderRadius,
                    boxShadow: theme.shadows[1], 
                    cursor: 'pointer', 
                    '&:hover': { 
                        boxShadow: theme.shadows[3],
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease-in-out'
                    },
                    borderLeft: `5px solid ${theme.palette.primary.main}`,
                    transition: 'all 0.2s ease-in-out'
                }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                        {project.name}
                    </Typography>
                    <Box component="div" sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" component="div">
                            Language: {project.language || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" component="div">
                            Description: {project.description || 'No description provided'}
                        </Typography>
                        {/* FIXED: Show assigned users properly */}
                        <Typography variant="body2" color="text.secondary" component="div">
                            Assigned to: {assignedUsersDisplay}
                        </Typography>
                    </Box>
                </Box>
            </ListItem>
        );
    };

    // --- FEEDBACK DIALOG COMPONENT ---
    const FeedbackDialog = () => (
        <Dialog 
            open={feedbackDialogOpen} 
            onClose={handleCloseFeedbackDialog}
            maxWidth="lg"
            fullWidth
            scroll="paper"
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                bgcolor: theme.palette.primary.light,
                color: 'text.primary'
            }}>
                <Typography variant="h6" component="span" fontWeight={600}>
                    User Feedbacks ({feedbacks.length})
                </Typography>
                <IconButton onClick={handleCloseFeedbackDialog} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                <TableContainer component={Paper} elevation={0}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: theme.palette.grey[200] }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Feedback</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>File</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '10%', textAlign: 'center' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '10%', textAlign: 'center' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                Array.from(new Array(5)).map((_, index) => (
                                    <TableRow key={index}><TableCell colSpan={6}><Skeleton height={40} /></TableCell></TableRow>
                                ))
                            ) : feedbacks.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center">No user feedback submitted yet.</TableCell></TableRow>
                            ) : (
                                feedbacks.map((fb) => (
                                    <TableRow key={fb.id} hover sx={{ bgcolor: fb.is_reviewed ? theme.palette.success.light + '10' : 'inherit' }}>
                                        <TableCell>{fb.time.split(' ')[0]}</TableCell>
                                        <TableCell>{fb.email}</TableCell>
                                        <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <Tooltip title={fb.feedback} placement="bottom-start">
                                                <span>{fb.feedback}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            {fb.file && fb.file !== 'None' ? (
                                                <Tooltip title={`Click to view: ${fb.file}`} placement="top">
                                                    <IconButton 
                                                        size="small"
                                                        onClick={() => handleImagePreview(fb.file)}
                                                        color="primary"
                                                    >
                                                        <CloudDownloadIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            ) : (
                                                <Typography variant="body2" color="text.disabled">N/A</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={fb.is_reviewed ? "Reviewed" : "Pending"} 
                                                color={fb.is_reviewed ? "success" : "warning"} 
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            {!fb.is_reviewed && (
                                                <Tooltip title="Mark as Reviewed">
                                                    <IconButton 
                                                        size="small" 
                                                        color="success" 
                                                        onClick={() => handleMarkReviewed(fb.id)}
                                                    >
                                                        <MarkEmailReadIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Delete Feedback">
                                                <IconButton 
                                                    size="small" 
                                                    color="error" 
                                                    onClick={() => handleDeleteFeedback(fb.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleCloseFeedbackDialog} variant="contained">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );

    // --- FIXED: Header Bar with Full Width ---
    const renderHeaderBar = () => (
        <Navbar 
            username={username}
            pendingUsersCount={pendingUsersCount}
            feedbacks={feedbacks}
            onOpenFeedbackDialog={handleOpenFeedbackDialog}
        />
    );

    // --- Main Render ---
    return (
        <Box sx={{ 
            minHeight: '100vh', 
            width: '100vw', 
            display: 'flex', 
            flexDirection: 'column', 
            overflowX: 'hidden',
            margin: 0,
            padding: 0
        }}>
            {renderHeaderBar()}

            <Box sx={{ 
                flexGrow: 1, 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'center', 
                pt: 3, 
                pb: 3,
                px: 2
            }}> 
                <Paper elevation={3} sx={{ 
                    p: 4, 
                    width: '100%', 
                    maxWidth: 1280, 
                    my: 0,
                    borderRadius: 2
                }}> 
                    
                    {/* --- TOP SEARCH/ADD CONTROLS --- */}
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        mb: 3,
                        flexWrap: 'wrap',
                        gap: 2
                    }}>
                        
                        {/* Search Bar & MWE Type */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <TextField 
                                variant="outlined" 
                                size="small" 
                                placeholder="Search Projects..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                InputProps={{ endAdornment: <SearchIcon color="action" /> }} 
                                sx={{ minWidth: '250px' }} 
                            />
                            
                        </Box>

                        {/* ADD PROJECT BUTTON */}
                        <Button 
                            variant="contained" 
                            color="success" 
                            startIcon={<AddIcon />} 
                            onClick={handleAddProject} 
                            disabled={isLoading}
                            sx={{
                                '&:hover': {
                                    backgroundColor: theme.palette.success.dark,
                                    transform: 'translateY(-1px)',
                                    boxShadow: theme.shadows[4]
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            ADD PROJECT
                        </Button>
                    </Box>

                    {/* --- PROJECTS SECTION HEADER --- */}
                    <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mb: 2 }}>
                        Projects ({filteredProjects.length}) - Page {currentPage} of {totalPages}
                    </Typography>
                    
                    {/* --- CONDITIONAL RENDERING (PROJECT LIST) --- */}
                    <List disablePadding sx={{ '& > div:last-child': { mb: 0 } }}>
                        {isLoading ? (
                            Array.from(new Array(3)).map((_, index) => <ProjectItemSkeleton key={index} />)
                        ) : currentProjects.length > 0 ? (
                            currentProjects.map(project => (
                                <ProjectListItem key={project.id} project={project} />
                            ))
                        ) : (
                            <ListItem>
                                <ListItemText 
                                    primary="No projects found." 
                                    sx={{ p: 2, textAlign: 'center', fontStyle: 'italic' }} 
                                />
                            </ListItem>
                        )}
                    </List>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, alignItems: 'center', gap: 1 }}>
                            <Button 
                                size="small" 
                                variant="outlined" 
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                            >
                                PREVIOUS
                            </Button>
                            
                            {/* Page Numbers */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <Button
                                    key={page}
                                    size="small"
                                    variant={currentPage === page ? "contained" : "outlined"}
                                    onClick={() => handlePageClick(page)}
                                    sx={{ mx: 0.5 }}
                                >
                                    {page}
                                </Button>
                            ))}
                            
                            <Button 
                                size="small" 
                                variant="outlined" 
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                            >
                                NEXT
                            </Button>
                        </Box>
                    )}
                </Paper>
            </Box>

            {/* --- FOOTER --- */}
            <Box component="footer" sx={{ 
                py: 3, 
                px: 2, 
                backgroundColor: theme.palette.grey[200], 
                width: '100%', 
                borderTop: `1px solid ${theme.palette.divider}`,
                mt: 'auto'
            }}>
                <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <Button 
                        onClick={() => setContactDialogOpen(true)}
                        sx={{ 
                            color: theme.palette.text.secondary,
                            textTransform: 'none',
                            fontSize: '0.875rem',
                            '&:hover': {
                                backgroundColor: 'transparent',
                                color: theme.palette.text.primary,
                                textDecoration: 'underline'
                            }
                        }}
                    >
                        Contact Us
                    </Button>
                    <Button 
                        onClick={() => setTermsDialogOpen(true)}
                        sx={{ 
                            color: theme.palette.text.secondary,
                            textTransform: 'none',
                            fontSize: '0.875rem',
                            '&:hover': {
                                backgroundColor: 'transparent',
                                color: theme.palette.text.primary,
                                textDecoration: 'underline'
                            }
                        }}
                    >
                        Terms & Conditions
                    </Button>
                </Container>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                    © {new Date().getFullYear()} MWE Annotation Platform. All rights reserved.
                </Typography>
            </Box>

            {/* --- Project Creation Modal --- */}
            <CreateProjectModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                adminUsername={username}
                onProjectCreated={handleProjectCreated}
            />

            {/* --- NEW: Assign Users Dialog --- */}
            <AssignUsersDialog
                open={assignDialogOpen}
                onClose={handleAssignDialogClose}
                projectId={selectedProject?.id}
                projectName={selectedProject?.name}
                adminUsername={username}
            />

            <EditProjectModal
                isOpen={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                project={selectedProjectForEdit}
                adminUsername={username}
                onProjectUpdated={handleProjectUpdated}
            />

            {/* --- Contact Us Dialog --- */}
            <ContactUsDialog 
                open={contactDialogOpen}
                onClose={() => setContactDialogOpen(false)}
            />

            {/* --- Terms Dialog --- */}
            <TermsDialog 
                open={termsDialogOpen}
                onClose={() => setTermsDialogOpen(false)}
            />

            {/* --- NEW: Delete Confirmation Dialog --- */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Are you sure you want to delete the project "{projectToDelete?.name}"?
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        This action cannot be undone. All sentences and annotations associated with this project will be permanently deleted.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={confirmDeleteProject} 
                        color="error" 
                        variant="contained"
                    >
                        Delete Project
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- NEW: Feedback Dialog --- */}
            <FeedbackDialog />

            {/* --- NEW: Image Preview Dialog --- */}
            <ImagePreviewDialog />

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
        
    );
}