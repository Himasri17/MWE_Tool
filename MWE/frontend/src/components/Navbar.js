// components/Navbar.js
import React from 'react';
import { 
    Box, Typography, Button, Badge
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom'; 
import {
    Feedback,
    Analytics,
    Book,
    GroupAdd,
    Logout,
    Dashboard
} from '@mui/icons-material';
import { removeToken } from './authUtils';

export default function Navbar({ 
    username, 
    pendingUsersCount = 0, 
    feedbacks = [],
    onOpenFeedbackDialog,
    showFeedbackBadge = true 
}) {
    const navigate = useNavigate();
    const { username: paramUsername } = useParams();

    // Use username from props or params
    const currentUsername = username || paramUsername;

    const handleLogout = () => {
        removeToken();
        navigate('/');
    };

    const handleNavigate = (path) => {
        navigate(path);
    };

    const unreadFeedbacksCount = feedbacks.filter(f => !f.is_reviewed).length;

    return (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            height: '60px', 
            bgcolor: 'primary.light', 
            color: 'black', 
            p: 2, 
            width: '100vw',
            boxSizing: 'border-box',
            margin: 0,
            position: 'relative',
            left: '50%',
            right: '50%',
            marginLeft: '-50vw',
            marginRight: '-50vw'
        }}>
            
            {/* Left Side - Logo/Title */}
            <Typography variant="h6" fontWeight={500} sx={{ mx: 1 }}>
                Multiword Expression Workbench
            </Typography>
            
            {/* Right Side - Navigation Items */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> 

                 {/* Admin Dashboard Button */}
                <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<Dashboard />}
                    onClick={() => handleNavigate(`/admin/${currentUsername}`)}
                    sx={{ 
                        color: 'black', 
                        borderColor: 'black',
                        minWidth: 'auto', 
                        p: '4px 8px',
                        '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white'
                        }
                    }}
                >
                    DASHBOARD
                </Button>
                
                {/* Feedbacks Button */}
                {showFeedbackBadge && onOpenFeedbackDialog && (
                    <Badge 
                        badgeContent={unreadFeedbacksCount} 
                        color="error" 
                        sx={{ mr: 1 }}
                    >
                        <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<Feedback />}
                            onClick={onOpenFeedbackDialog}
                            sx={{ 
                                color: 'black', 
                                borderColor: 'black',
                                minWidth: 'auto', 
                                p: '4px 8px',
                                '&:hover': {
                                    backgroundColor: 'primary.main',
                                    color: 'white'
                                }
                            }}
                        >
                            FEEDBACKS
                        </Button>
                    </Badge>
                )}

                {/* Analytics Dashboard Button */}
                <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<Analytics />}
                    onClick={() => handleNavigate(`/admin/${currentUsername}/analytics`)}
                    sx={{ 
                        color: 'black', 
                        borderColor: 'black',
                        minWidth: 'auto', 
                        p: '4px 8px',
                        '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white'
                        }
                    }}
                >
                    ANALYTICS
                </Button>

                {/* Logbook Button */}
                <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<Book />}
                    onClick={() => handleNavigate(`/admin/${currentUsername}/logbook`)}
                    sx={{ 
                        color: 'black', 
                        borderColor: 'black',
                        minWidth: 'auto', 
                        p: '4px 8px',
                        '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white'
                        }
                    }}
                >
                    LOGBOOK
                </Button>
                
                {/* Approve Users Button with Badge */}
                <Badge 
                    badgeContent={pendingUsersCount} 
                    color="error" 
                    sx={{ mr: 1 }}
                >
                    <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<GroupAdd />}
                        onClick={() => handleNavigate(`/admin/${currentUsername}/approvals`)}
                        sx={{ 
                            color: 'black', 
                            borderColor: 'black',
                            minWidth: 'auto', 
                            p: '4px 8px',
                            '&:hover': {
                                backgroundColor: 'primary.main',
                                color: 'white'
                            }
                        }}
                    >
                        APPROVE USERS
                    </Button>
                </Badge>

                
                {/* User Info and Logout */}
                <Typography variant="body1" sx={{ mx: 1 }}>
                    Admin: {currentUsername}
                </Typography>
                <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<Logout />}
                    sx={{ 
                        color: 'black', 
                        borderColor: 'black', 
                        minWidth: 'auto', 
                        p: '4px 8px',
                        '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white'
                        }
                    }} 
                    onClick={handleLogout}
                >
                    LOG OUT
                </Button>
            </Box>
        </Box>
    );
}