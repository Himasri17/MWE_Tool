import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Typography, Button, IconButton, useTheme,
    Drawer, List, ListItem, ListItemText, ListItemIcon, Divider, Badge
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import FeedbackIcon from '@mui/icons-material/Feedback';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AnalyticsIcon from '@mui/icons-material/Analytics'; // Icon for Analytics
import DashboardIcon from '@mui/icons-material/Dashboard'; // Icon for Dashboard
import BookIcon from '@mui/icons-material/Book'; // Icon for Logbook

// Component props interface based on what AdminDashboard passes
export default function Navbar({
  username = '',
  pendingUsersCount = 0,
  feedbacks = [],
  onOpenFeedbackDialog = () => {}
}) {

    const navigate = useNavigate();
    const location = useLocation(); // Used to determine the active page
    const theme = useTheme();
    
    const [drawerOpen, setDrawerOpen] = useState(false);

    // 1. Define all navigation items, paths, and icons
    const navItems = [
        // Path is set to the base admin route which usually represents the project list/dashboard
        { name: 'DASHBOARD', path: `/admin/${username}`, icon: DashboardIcon }, 
        { name: 'ANALYTICS', path: `/admin/${username}/analytics`, icon: AnalyticsIcon },
        { 
            name: 'FEEDBACKS', 
            path: null, // No direct route, opens a dialog
            action: onOpenFeedbackDialog, 
            badge: feedbacks.filter(f => !f.is_reviewed).length, 
            icon: FeedbackIcon 
        },
        { name: 'LOGBOOK', path: `/admin/${username}/logbook`, icon: BookIcon },
        { 
            name: 'APPROVE USERS', 
            path: `/admin/${username}/approvals`, 
            icon: GroupAddIcon,
            badge: pendingUsersCount,
        },
    ];
    
    // Helper to check if the path is active
    const isPathActive = (path) => {
        // Special handling for the dashboard path (which is the current component's root)
        if (path === `/admin/${username}`) {
            // Match exactly or match the root path if no other segment is present
            return location.pathname === path || location.pathname === `${path}/` || location.pathname === `/admin/${username}/dashboard`;
        }
        
        // For other routes, check if the current path starts with the item's path
        return location.pathname.startsWith(path);
    };

    const handleNavigation = (path, action) => {
        setDrawerOpen(false); // Close drawer first
        if (path) {
            navigate(path);
        } else if (action) {
            action();
        }
    };
    
    // Simple logout that redirects to the login page (as implemented in AdminDashboard.js)
    const handleLogout = () => {
        navigate('/login');
    };

    return (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            height: '60px', 
            bgcolor: theme.palette.primary.main, 
            color: 'white', 
            p: 2, 
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: 0 // Prevent shrinking
        }}>
            
            {/* LEFT SIDE: HAMBURGER ICON AND TITLE */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                    color="inherit" 
                    aria-label="open drawer"
                    onClick={() => setDrawerOpen(true)} // Open the drawer
                    edge="start"
                    sx={{ mr: 2 }}
                >
                    <MenuIcon /> {/* HAMBURGER ICON */}
                </IconButton>
                <Typography variant="h6" fontWeight={500}>
                    Multiword Expression Workbench
                </Typography>
            </Box>
            
            {/* RIGHT SIDE: ADMIN INFO AND LOGOUT (Kept clean) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, flexShrink: 0 }}>
                <Typography variant="body1" sx={{ color: 'white', fontWeight: 'bold', mr: 1 }}>
                    Admin: {username}
                </Typography>
                <Button 
                    variant="outlined" 
                    size="small" 
                    sx={{ color: 'white', borderColor: 'white' }} 
                    onClick={handleLogout}
                >
                    LOG OUT
                </Button>
            </Box>

            {/* --- COLLAPSIBLE DRAWER (SIDEBAR) --- */}
            <Drawer
                anchor="left" 
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{
                    sx: { width: 250, bgcolor: theme.palette.background.paper }
                }}
            >
                <Box sx={{ p: 2, bgcolor: theme.palette.primary.main, color: 'white' }}>
                    <Typography variant="h6" fontWeight="bold">Admin Menu</Typography>
                </Box>
                <Divider />
                <List>
                    {navItems.map((item) => {
                        const isActive = isPathActive(item.path);
                        const ButtonIcon = item.icon;

                        return (
                            <ListItem 
                                key={item.name} 
                                button 
                                onClick={() => handleNavigation(item.path, item.action)}
                                sx={{ 
                                    // Highlight the active tab in the list (Active tab highlight)
                                    bgcolor: isActive ? theme.palette.action.selected : 'transparent',
                                    '&:hover': {
                                        bgcolor: theme.palette.action.hover,
                                    }
                                }}
                            >
                                <ListItemIcon>
                                    <Badge 
                                        badgeContent={item.badge} 
                                        color="error"
                                        overlap="circular"
                                    >
                                        {ButtonIcon && <ButtonIcon sx={{ color: isActive ? theme.palette.primary.main : theme.palette.text.secondary }} />}
                                    </Badge>
                                </ListItemIcon>
                                <ListItemText 
                                    primary={item.name} 
                                    primaryTypographyProps={{ 
                                        fontWeight: isActive ? 'bold' : 'normal',
                                        color: isActive ? theme.palette.primary.main : theme.palette.text.primary
                                    }} 
                                />
                            </ListItem>
                        );
                    })}
                </List>
            </Drawer>
        </Box>
    );
}