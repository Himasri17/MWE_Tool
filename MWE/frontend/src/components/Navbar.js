import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Typography, Button, IconButton, useTheme,
    Drawer, List, ListItem, ListItemText, ListItemIcon, Divider, Badge
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import FeedbackIcon from '@mui/icons-material/Feedback';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BookIcon from '@mui/icons-material/Book';

// Component props interface based on what AdminDashboard passes
export default function Navbar({
    username = '',
    pendingUsersCount = 0,
    feedbacks = [],
    onOpenFeedbackDialog = () => {}
}) {

    const navigate = useNavigate();
    const location = useLocation(); 
    const theme = useTheme();
    
    const [drawerOpen, setDrawerOpen] = useState(false);

    // 1. --- CALCULATE AGGREGATED COUNTS ---
    const unreviewedFeedbacksCount = feedbacks.filter(f => !f.is_reviewed).length;
    // Total count for the main hamburger badge
    const totalNotificationCount = pendingUsersCount + unreviewedFeedbacksCount;

    // 2. Define all navigation items, paths, and icons 
    const navItems = [
        { name: 'DASHBOARD', path: `/admin/${username}`, icon: DashboardIcon, badge: 0 }, 
        { name: 'ANALYTICS', path: `/admin/${username}/analytics`, icon: AnalyticsIcon, badge: 0 },
        { 
            name: 'FEEDBACKS', 
            path: null, 
            action: onOpenFeedbackDialog, 
            badge: unreviewedFeedbacksCount, // Count for the sidebar item
            icon: FeedbackIcon 
        },
        { name: 'LOGBOOK', path: `/admin/${username}/logbook`, icon: BookIcon, badge: 0 },
        { 
            name: 'APPROVE USERS', 
            path: `/admin/${username}/approvals`, 
            icon: GroupAddIcon,
            badge: pendingUsersCount, // Count for the sidebar item
        },
    ];
    
    // Helper to check if the path is active
    const isPathActive = (path) => {
        if (path === `/admin/${username}`) {
            // Checks for /admin/username, /admin/username/, or /admin/username/dashboard
            return location.pathname === path || location.pathname === `${path}/` || location.pathname.startsWith(`${path}/dashboard`);
        }
        return location.pathname.startsWith(path);
    };

    const handleNavigation = (path, action) => {
        setDrawerOpen(false); 
        if (path) {
            navigate(path);
        } else if (action) {
            action();
        }
    };
    
    const handleLogout = () => {
        // Since AdminDashboard calls removeToken() before redirecting, this simply navigates
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
            flexShrink: 0 
        }}>
            
            {/* LEFT SIDE: HAMBURGER ICON AND TITLE */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                    color="inherit" 
                    aria-label="open drawer"
                    onClick={() => setDrawerOpen(true)} 
                    edge="start"
                    sx={{ mr: 2 }}
                >
                    {/* 3. --- BADGE ON HAMBURGER ICON --- */}
                    <Badge 
                        badgeContent={totalNotificationCount} 
                        color="error" // Red color for high visibility
                        overlap="circular" 
                        max={99} 
                    >
                        <MenuIcon /> 
                    </Badge>
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
                                    bgcolor: isActive ? theme.palette.action.selected : 'transparent',
                                    '&:hover': {
                                        bgcolor: theme.palette.action.hover,
                                    }
                                }}
                            >
                                <ListItemIcon>
                                    {/* Sidebar Item Badge */}
                                    <Badge 
                                        badgeContent={item.badge} 
                                        color={item.name === 'APPROVE USERS' ? 'error' : 'warning'} 
                                        overlap="circular"
                                        max={99}
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