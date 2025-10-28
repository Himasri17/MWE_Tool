import React, { useState, useEffect, useCallback } from 'react';
import {  useParams } from 'react-router-dom';
import {
    Box, Typography, Paper, Grid, Card, CardContent, Button,
    FormControl, InputLabel, Select, MenuItem, TextField,
    Tabs, Tab, Chip, CircularProgress, Alert, Avatar,
    useTheme, useMediaQuery, IconButton, Tooltip, alpha,
    LinearProgress, List, ListItem, ListItemText, ListItemIcon,
} from '@mui/material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import Navbar from '../../components/Navbar';
import jsPDF from 'jspdf';
import {
    Download as DownloadIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    Analytics as AnalyticsIcon,
    People as PeopleIcon,
    Folder as FolderIcon,
    Timeline as TimelineIcon,
    TrendingUp as TrendingUpIcon,
    Speed as SpeedIcon,
    Assessment as AssessmentIcon,
    Notifications as NotificationsIcon,
    Language as LanguageIcon,
    EmojiEvents as TrophyIcon,
    WorkspacePremium as PremiumIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthHeaders, removeToken } from '../../components/authUtils';
import './AnalyticsDashboard.css'; 



// Color palette for the new design
const COLOR_PALETTE = {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    gradient: {
        primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        success: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        warning: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
        premium: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
    }
};

const API_BASE_URL = 'http://127.0.0.1:5001';

const AnalyticsDashboard = () => {
    const theme = useTheme();
    const { username } = useParams();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // State management
    const [activeTab, setActiveTab] = useState(0);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [networkData, setNetworkData] = useState(null);
    const [timelineData, setTimelineData] = useState([]);
    const [comprehensiveData, setComprehensiveData] = useState(null);
    const [filters, setFilters] = useState({
        language: '',
        project_id: '',
        username: '',
        start_date: '',
        end_date: '',
        timeframe: '30d'
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [notifications, setNotifications] = useState([]);

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        }
    };

    const handleUnauthorized = () => {
        removeToken();
        window.location.href = '/login';
    };

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            console.log("🔄 Fetching enhanced analytics data...");
            
            const endpoints = [
                fetch(`${API_BASE_URL}/api/analytics/mwe-distribution`, {
                    headers: getAuthHeaders()
                }),
                fetch(`${API_BASE_URL}/api/analytics/comprehensive-report?level=standard`, {
                    headers: getAuthHeaders()
                }),
                fetch(`${API_BASE_URL}/api/projects`, {
                    headers: getAuthHeaders()
                })
            ];

            const responses = await Promise.allSettled(endpoints);

            // Process each response with better error handling
            responses.forEach((response, index) => {
                if (response.status === 'fulfilled') {
                    const res = response.value;
                    if (res.status === 401 || res.status === 403) {
                        console.error(`Authentication failed for endpoint ${index}`);
                        handleUnauthorized();
                        return;
                    }
                    if (!res.ok) {
                        console.error(`Request failed for endpoint ${index}:`, res.status);
                        return;
                    }
                } else {
                    console.error(`Request rejected for endpoint ${index}:`, response.reason);
                }
            });

            // Process MWE data
            if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
                const mweData = await responses[0].value.json();
                console.log("MWE Data:", mweData);
                setAnalyticsData(mweData);
            }

            // Process comprehensive data
            if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
                const comprehensiveData = await responses[1].value.json();
                console.log("Comprehensive Data:", comprehensiveData);
                setComprehensiveData(comprehensiveData);
                generateNotifications(comprehensiveData);
            }

            // Process projects
            if (responses[2].status === 'fulfilled' && responses[2].value.ok) {
                const projectsData = await responses[2].value.json();
                setProjects(projectsData);
            }

        } catch (error) {
            console.error('❌ Error fetching data:', error);
            setError('Failed to load analytics data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    const generateNotifications = (data) => {
        const newNotifications = [];
        const insights = data?.key_insights || {};

        if (insights.top_performer) {
            newNotifications.push({
                id: 1,
                type: 'success',
                message: `Top performer: ${insights.top_performer.username} with ${insights.top_performer.total_annotations} annotations`,
                icon: <TrophyIcon />
            });
        }

        if (insights.most_common_mwe) {
            newNotifications.push({
                id: 2,
                type: 'info',
                message: `Most common MWE: ${insights.most_common_mwe.mwe_type} (${insights.most_common_mwe.count} occurrences)`,
                icon: <TrendingUpIcon />
            });
        }

        if (data?.executive_summary?.recommendations) {
            newNotifications.push({
                id: 3,
                type: 'warning',
                message: `${data.executive_summary.recommendations.length} recommendations available`,
                icon: <NotificationsIcon />
            });
        }

        setNotifications(newNotifications);
    };

    useEffect(() => {
        fetchInitialData();
        fetchUsers();
    }, [fetchInitialData]);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/users-list`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else if (res.status === 401) {
                handleUnauthorized();
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchInitialData();
        setTimeout(() => setRefreshing(false), 1000);
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        applyFilters(newFilters);
    };

    const applyFilters = async (filterParams) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            Object.entries(filterParams).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });

            const [mweRes, comprehensiveRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/analytics/mwe-distribution?${queryParams}`, {
                    headers: getAuthHeaders()
                }),
                fetch(`${API_BASE_URL}/api/analytics/comprehensive-report?${queryParams}&level=standard`, {
                    headers: getAuthHeaders()
                })
            ]);

            if (mweRes.ok) {
                const data = await mweRes.json();
                setAnalyticsData(data);
            }

            if (comprehensiveRes.ok) {
                const comprehensiveData = await comprehensiveRes.json();
                setComprehensiveData(comprehensiveData);
            }
        } catch (error) {
            console.error('Error applying filters:', error);
        }
        setLoading(false);
    };

    const clearFilters = () => {
        setFilters({
            language: '',
            project_id: '',
            username: '',
            start_date: '',
            end_date: '',
            timeframe: '30d'
        });
        fetchInitialData();
    };

    const EnhancedStatCard = ({ title, value, change, icon, color, subtitle, loading }) => (
        <motion.div variants={itemVariants}>
            <Card className="stat-card"
                sx={{ 
                    height: '100%',
                    background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
                    border: `1px solid ${color}30`,
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'visible',
                    backdropFilter: 'blur(20px)',
                }}
            >
                <CardContent sx={{ p: 3, position: 'relative' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
                            <CircularProgress size={30} />
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                    <Typography 
                                        variant="h3" 
                                        fontWeight="800" 
                                        sx={{ 
                                            background: COLOR_PALETTE.gradient.primary,
                                            backgroundClip: 'text',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            mb: 0.5
                                        }}
                                    >
                                        {value !== undefined && value !== null ? value.toLocaleString() : '0'}
                                    </Typography>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            color: 'text.secondary',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            fontSize: '0.75rem',
                                            letterSpacing: '0.5px'
                                        }}
                                    >
                                        {title}
                                    </Typography>
                                </Box>
                                <Avatar 
                                    sx={{ 
                                        background: COLOR_PALETTE.gradient.primary,
                                        width: 48,
                                        height: 48
                                    }}
                                >
                                    {icon}
                                </Avatar>
                            </Box>
                            
                            {subtitle && (
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        color: 'text.secondary',
                                        display: 'block',
                                        mt: 1
                                    }}
                                >
                                    {subtitle}
                                </Typography>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );

    // New Metric Card for detailed metrics
    const MetricCard = ({ title, value, max, color, icon }) => (
        <Card sx={{ p: 2, background: 'transparent', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {title}
                </Typography>
                {icon}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" fontWeight="700">
                    {value}
                </Typography>
                {max && (
                    <LinearProgress 
                        variant="determinate" 
                        value={(value / max) * 100} 
                        sx={{ 
                            flexGrow: 1,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: `${color}20`,
                            '& .MuiLinearProgress-bar': {
                                backgroundColor: color,
                                borderRadius: 3
                            }
                        }}
                    />
                )}
            </Box>
        </Card>
    );

    const renderOverview = () => {
        // Fix data extraction to match your backend response structure
        const summary = comprehensiveData?.executive_summary || analyticsData?.summary || {};
        const userPerformance = comprehensiveData?.user_performance || analyticsData?.user_distribution || [];
        const topPerformers = userPerformance.slice(0, 5);

        // Debug logging to see what data you're actually getting
        console.log("Comprehensive Data:", comprehensiveData);
        console.log("Analytics Data:", analyticsData);
        console.log("Summary:", summary);

        // Extract actual values with proper fallbacks
        const totalAnnotations = summary.total_annotations || 
                            analyticsData?.summary?.total_annotations || 
                            comprehensiveData?.quality_metrics?.total_annotations || 0;
        
        const totalUsers = summary.total_users || 
                        analyticsData?.summary?.total_users || 
                        (comprehensiveData?.user_performance ? comprehensiveData.user_performance.length : 0) || 0;
        
        const totalProjects = summary.total_projects || 
                            analyticsData?.summary?.total_projects || 
                            (comprehensiveData?.project_progress ? comprehensiveData.project_progress.length : 0) || 0;
        
        const totalMweTypes = summary.total_mwe_types || 
                            analyticsData?.summary?.total_mwe_types || 
                            (analyticsData?.mwe_types ? analyticsData.mwe_types.length : 0) || 0;

        const avgAnnotationsPerUser = summary.avg_annotations_per_user || 
                                    analyticsData?.summary?.avg_annotations_per_user || 
                                    (totalAnnotations / Math.max(totalUsers, 1)).toFixed(1);

        const completedProjects = summary.completed_projects || 
                                (comprehensiveData?.project_progress ? 
                                comprehensiveData.project_progress.filter(p => p.status === 'Completed').length : 0) || 0;

        return (
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <Grid container spacing={3}>
                    {/* Enhanced Stats Row */}
                    <Grid item xs={12}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6} md={3}>
                                <EnhancedStatCard
                                    title="Total Annotations"
                                    value={totalAnnotations}
                                    change={12.5}
                                    icon={<AssessmentIcon />}
                                    color={COLOR_PALETTE.primary}
                                    subtitle={`${avgAnnotationsPerUser} avg per user`}
                                    loading={loading}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <EnhancedStatCard
                                    title="Active Users"
                                    value={totalUsers}
                                    change={8.2}
                                    icon={<PeopleIcon />}
                                    color={COLOR_PALETTE.success}
                                    subtitle="Currently annotating"
                                    loading={loading}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <EnhancedStatCard
                                    title="Projects"
                                    value={totalProjects}
                                    change={15.7}
                                    icon={<FolderIcon />}
                                    color={COLOR_PALETTE.warning}
                                    subtitle={`${completedProjects} completed`}
                                    loading={loading}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <EnhancedStatCard
                                    title="MWE Types"
                                    value={totalMweTypes}
                                    change={5.3}
                                    icon={<LanguageIcon />}
                                    color={COLOR_PALETTE.secondary}
                                    subtitle="Unique categories"
                                    loading={loading}
                                />
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Rest of your overview component remains the same */}
                    {/* Charts and Metrics Row */}
                    <Grid item xs={12} lg={8}>
                        <Grid container spacing={3}>
                            {/* Main Chart */}
                            <Grid item xs={12}>
                                <Paper 
                                    sx={{ 
                                        p: 3, 
                                        borderRadius: 3,
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                        border: `1px solid ${theme.palette.divider}`,
                                        position: 'relative'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                        <Typography variant="h6" fontWeight="700">
                                            Annotation Activity Timeline
                                        </Typography>
                                        <Chip 
                                            label="Last 30 days" 
                                            size="small"
                                            sx={{ background: COLOR_PALETTE.gradient.primary, color: 'white' }}
                                        />
                                    </Box>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={timelineData}>
                                            <defs>
                                                <linearGradient id="colorAnnotations" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLOR_PALETTE.primary} stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor={COLOR_PALETTE.primary} stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                            <XAxis 
                                                dataKey="date" 
                                                tick={{ fill: theme.palette.text.secondary }}
                                                axisLine={{ stroke: theme.palette.divider }}
                                            />
                                            <YAxis 
                                                tick={{ fill: theme.palette.text.secondary }}
                                                axisLine={{ stroke: theme.palette.divider }}
                                            />
                                            <RechartsTooltip 
                                                contentStyle={{
                                                    background: theme.palette.background.paper,
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    borderRadius: 8,
                                                    boxShadow: theme.shadows[3]
                                                }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="count" 
                                                stroke={COLOR_PALETTE.primary} 
                                                fill="url(#colorAnnotations)"
                                                strokeWidth={3}
                                                name="Daily Annotations"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </Paper>
                            </Grid>

                            {/* Additional Metrics */}
                            <Grid item xs={12}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={4}>
                                        <MetricCard
                                            title="Completion Rate"
                                            value="68%"
                                            max={100}
                                            color={COLOR_PALETTE.success}
                                            icon={<SpeedIcon sx={{ color: COLOR_PALETTE.success }} />}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <MetricCard
                                            title="Quality Score"
                                            value="92%"
                                            max={100}
                                            color={COLOR_PALETTE.primary}
                                            icon={<PremiumIcon sx={{ color: COLOR_PALETTE.primary }} />}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <MetricCard
                                            title="Active Sessions"
                                            value="24"
                                            max={50}
                                            color={COLOR_PALETTE.warning}
                                            icon={<PeopleIcon sx={{ color: COLOR_PALETTE.warning }} />}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Sidebar - Top Performers & Notifications */}
                    <Grid item xs={12} lg={4}>
                        <Grid container spacing={3}>
                            {/* Top Performers */}
                            <Grid item xs={12}>
                                <Paper 
                                    sx={{ 
                                        p: 3, 
                                        borderRadius: 3,
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                        border: `1px solid ${theme.palette.divider}`
                                    }}
                                >
                                    <Typography variant="h6" fontWeight="700" gutterBottom>
                                        🏆 Top Performers
                                    </Typography>
                                    <List dense>
                                        {topPerformers.map((user, index) => (
                                            <ListItem key={user.username || user._id} sx={{ px: 0 }}>
                                                <ListItemIcon sx={{ minWidth: 40 }}>
                                                    <Avatar 
                                                        sx={{ 
                                                            width: 32, 
                                                            height: 32,
                                                            background: COLOR_PALETTE.gradient.primary,
                                                            fontSize: '0.875rem'
                                                        }}
                                                    >
                                                        {index + 1}
                                                    </Avatar>
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={user.username || user._id}
                                                    secondary={`${user.total_annotations || user.count || 0} annotations`}
                                                />
                                                <Chip 
                                                    label={`${user.unique_mwe_count || user.mwe_type_count || 0} types`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </ListItem>
                                        ))}
                                        {topPerformers.length === 0 && (
                                            <ListItem>
                                                <ListItemText 
                                                    primary="No performance data available"
                                                    sx={{ textAlign: 'center', color: 'text.secondary' }}
                                                />
                                            </ListItem>
                                        )}
                                    </List>
                                </Paper>
                            </Grid>

                            {/* Notifications */}
                            <Grid item xs={12}>
                                <Paper 
                                    sx={{ 
                                        p: 3, 
                                        borderRadius: 3,
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                        border: `1px solid ${theme.palette.divider}`
                                    }}
                                >
                                    <Typography variant="h6" fontWeight="700" gutterBottom>
                                        📢 Insights
                                    </Typography>
                                    <List dense>
                                        {notifications.map((notification) => (
                                            <ListItem key={notification.id} sx={{ px: 0 }}>
                                                <ListItemIcon sx={{ minWidth: 40 }}>
                                                    {notification.icon}
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                                            {notification.message}
                                                        </Typography>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                        {notifications.length === 0 && (
                                            <ListItem>
                                                <ListItemText 
                                                    primary="No insights available"
                                                    sx={{ textAlign: 'center', color: 'text.secondary' }}
                                                />
                                            </ListItem>
                                        )}
                                    </List>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </motion.div>
        );
    };
    
    const downloadReport = async (format) => {
    setLoading(true);
    setError('');
    try {
        const queryParams = new URLSearchParams();
        queryParams.append('type', format);
        Object.entries(filters).forEach(([key, value]) => {
            if (value) queryParams.append(key, value);
        });

        if (format === 'pdf') {
            // Get comprehensive data for all charts
            const [comprehensiveRes, mweRes, timelineRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/analytics/comprehensive-report?${queryParams}&level=detailed`, {
                    headers: getAuthHeaders()
                }),
                fetch(`${API_BASE_URL}/api/analytics/mwe-distribution?${queryParams}`, {
                    headers: getAuthHeaders()
                }),
                fetch(`${API_BASE_URL}/api/analytics/annotation-timeline?${queryParams}`, {
                    headers: getAuthHeaders()
                })
            ]);

            if (comprehensiveRes.ok && mweRes.ok) {
                const comprehensiveData = await comprehensiveRes.json();
                const mweData = await mweRes.json();
                const timelineData = timelineRes.ok ? await timelineRes.json() : [];
                
                console.log("All data for PDF:", { comprehensiveData, mweData, timelineData });
                await generateEnhancedPdfReport(comprehensiveData, mweData, timelineData, projects);
            } else {
                if (comprehensiveRes.status === 401 || mweRes.status === 401) {
                    handleUnauthorized();
                    return;
                }
                throw new Error('Failed to fetch report data');
            }
        } else if (format === 'csv') {
            // CSV download remains the same
            const res = await fetch(`${API_BASE_URL}/api/analytics/reports/download?${queryParams}`, {
                headers: getAuthHeaders()
            });
            
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comprehensive_annotation_report_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                if (res.status === 401) {
                    handleUnauthorized();
                    return;
                }
                throw new Error('Failed to download CSV report');
            }
        }
    } catch (error) {
        console.error('Error during download:', error);
        setError(`Download failed: ${error.message}`);
    } finally {
        setLoading(false);
    }
};

const generateEnhancedPdfReport = async (comprehensiveData, mweData, timelineData, projects) => {
    console.log("Generating Enhanced PDF with all charts...");
    
    const doc = new jsPDF();
    let y = 15;
    const margin = 10;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    // Helper functions
    const addText = (text, size = 10, style = 'normal', x = margin, align = 'left', color = '#000000') => {
        if (!text) return;
        
        doc.setFontSize(size);
        doc.setFont(style === 'bold' ? 'helvetica-bold' : 'helvetica', style);
        doc.setTextColor(color);
        
        const splitText = doc.splitTextToSize(String(text), pageWidth - margin * 2);
        
        for (const line of splitText) {
            if (y > pageHeight - margin) {
                doc.addPage();
                y = 15;
            }
            
            let xPos = x;
            if (align === 'center') {
                const textWidth = doc.getStringUnitWidth(line) * doc.getFontSize() / doc.internal.scaleFactor;
                xPos = (pageWidth - textWidth) / 2;
            } else if (align === 'right') {
                const textWidth = doc.getStringUnitWidth(line) * doc.getFontSize() / doc.internal.scaleFactor;
                xPos = pageWidth - margin - textWidth;
            }
            
            doc.text(line, xPos, y);
            y += lineHeight;
        }
        doc.setTextColor('#000000');
    };

    const addSectionHeader = (text) => {
        y += lineHeight;
        doc.setFillColor(99, 102, 241); // Using your primary color
        doc.rect(margin, y - 2, pageWidth - margin * 2, 8, 'F');
        addText(text, 12, 'bold', margin + 5, 'left', '#ffffff');
        y += lineHeight;
    };

    const addSubSection = (text) => {
        y += lineHeight / 2;
        addText(text, 11, 'bold', margin, 'left', '#2c3e50');
        y += lineHeight / 2;
    };

    // Generate chart images
    const generateChart = async (chartData, chartType, title, xLabel = '', yLabel = 'Count') => {
        if (!chartData || chartData.length === 0) {
            console.warn(`No data available for chart: ${title}`);
            return null;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/analytics/generate-chart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    type: chartType,
                    data: chartData,
                    title: title,
                    x_label: xLabel,
                    y_label: yLabel
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    return result.image_data;
                }
            }
            return null;
        } catch (error) {
            console.error('Error generating chart:', error);
            return null;
        }
    };

    const addChartImage = async (imageData, title, description = '') => {
        if (y > pageHeight - 150) {
            doc.addPage();
            y = 15;
        }
        
        if (!imageData) {
            addText(`Chart unavailable: ${title}`, 10, 'italic', margin, 'center', '#e74c3c');
            y += lineHeight;
            return;
        }

        try {
            addSubSection(title);
            
            const chartWidth = pageWidth - margin * 2;
            const chartHeight = 120;
            
            doc.addImage(imageData, 'PNG', margin, y, chartWidth, chartHeight);
            y += chartHeight + 10;
            
            if (description) {
                addText(description, 9, 'normal', margin, 'left', '#7f8c8d');
                y += lineHeight;
            }
            
        } catch (error) {
            console.error('Error adding chart image:', error);
            addText(`Chart display failed: ${title}`, 10, 'italic', margin, 'center', '#e74c3c');
            y += lineHeight;
        }
    };

    // --- COVER PAGE ---
    doc.setFillColor(99, 102, 241); // Primary color
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica-bold', 'bold');
    doc.text('ANALYTICS DASHBOARD REPORT', pageWidth / 2, 80, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('Sentence Annotation System', pageWidth / 2, 100, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${comprehensiveData?.report_metadata?.generated_at || new Date().toISOString()}`, pageWidth / 2, 120, { align: 'center' });
    
    doc.addPage();
    y = 15;

    // --- EXECUTIVE SUMMARY ---
    addSectionHeader('EXECUTIVE SUMMARY');
    
    const summary = comprehensiveData?.executive_summary || comprehensiveData?.summary || {};
    
    // Key Metrics
    const metrics = [
        { label: 'Total Annotations', value: summary.total_annotations || mweData?.summary?.total_annotations || 0 },
        { label: 'Active Users', value: summary.total_users || mweData?.summary?.total_users || 0 },
        { label: 'Total Projects', value: projects?.length || 0 },
        { label: 'MWE Types', value: summary.total_mwe_types || mweData?.summary?.total_mwe_types || 0 }
    ];
    
    metrics.forEach(metric => {
        addText(`• ${metric.label}: ${metric.value.toLocaleString()}`, 10, 'normal', margin);
        y += lineHeight;
    });

    // --- OVERVIEW CHARTS ---
    doc.addPage();
    y = 15;
    addSectionHeader('OVERVIEW CHARTS');

    // 1. MWE Distribution Pie Chart
    const mweChartData = mweData?.mwe_types?.slice(0, 8) || [];
    const mwePieChart = await generateChart(
        mweChartData,
        'pie',
        'MWE Type Distribution',
        'MWE Types',
        'Count'
    );
    await addChartImage(mwePieChart, 'MWE Type Distribution', 'Distribution of Multi-Word Expression types across all annotations');

    // 2. User Performance Bar Chart
    const userPerformanceData = comprehensiveData?.user_performance?.slice(0, 10) || mweData?.user_distribution?.slice(0, 10) || [];
    const userBarChart = await generateChart(
        userPerformanceData,
        'bar',
        'Top Users by Annotations',
        'Users',
        'Annotation Count'
    );
    await addChartImage(userBarChart, 'User Performance', 'Top 10 users by total annotation count');

    // 3. Timeline Area Chart
    const timelineChart = await generateChart(
        timelineData,
        'line',
        'Annotation Timeline',
        'Date',
        'Daily Annotations'
    );
    await addChartImage(timelineChart, 'Annotation Activity Timeline', 'Daily annotation activity over time');

    // --- PROJECT ANALYTICS ---
    doc.addPage();
    y = 15;
    addSectionHeader('PROJECT ANALYTICS');

    // Project Progress Data
    const projectData = projects.map(project => ({
        name: project.name,
        progress: project.progress_percent || 0,
        total_sentences: project.total_sentences || 0,
        annotated_count: project.annotated_count || 0
    }));

    // 4. Project Progress Bar Chart
    const projectProgressChart = await generateChart(
        projectData,
        'bar',
        'Project Progress Overview',
        'Projects',
        'Completion %'
    );
    await addChartImage(projectProgressChart, 'Project Progress', 'Completion percentage for each project');

    // Project Statistics
    addSubSection('Project Statistics');
    const completedProjects = projectData.filter(p => p.progress === 100).length;
    const inProgressProjects = projectData.filter(p => p.progress > 0 && p.progress < 100).length;
    const notStartedProjects = projectData.filter(p => p.progress === 0).length;

    addText(`• Total Projects: ${projectData.length}`, 10, 'normal', margin);
    y += lineHeight;
    addText(`• Completed: ${completedProjects}`, 10, 'normal', margin);
    y += lineHeight;
    addText(`• In Progress: ${inProgressProjects}`, 10, 'normal', margin);
    y += lineHeight;
    addText(`• Not Started: ${notStartedProjects}`, 10, 'normal', margin);
    y += lineHeight;

    // --- PERFORMANCE ANALYTICS ---
    doc.addPage();
    y = 15;
    addSectionHeader('PERFORMANCE ANALYTICS');

    // 5. Language Distribution
    const languageData = mweData?.language_distribution?.slice(0, 10) || [];
    const languageChart = await generateChart(
        languageData,
        'bar',
        'Language Distribution',
        'Languages',
        'Annotation Count'
    );
    await addChartImage(languageChart, 'Language Distribution', 'Annotations distributed by language');

    // Performance Metrics
    addSubSection('Performance Metrics');
    
    const qualityMetrics = comprehensiveData?.quality_metrics || {};
    if (Object.keys(qualityMetrics).length > 0) {
        addText(`• User Engagement: ${qualityMetrics.user_engagement_score?.toFixed(1) || 'N/A'}%`, 10, 'normal', margin);
        y += lineHeight;
        addText(`• Growth Rate: ${qualityMetrics.annotation_growth_rate?.toFixed(1) || 'N/A'}%`, 10, 'normal', margin);
        y += lineHeight;
        addText(`• Quality Rating: ${qualityMetrics.overall_annotation_quality || 'N/A'}`, 10, 'normal', margin);
        y += lineHeight;
    }

    // --- KEY INSIGHTS ---
    doc.addPage();
    y = 15;
    addSectionHeader('KEY INSIGHTS & RECOMMENDATIONS');

    const insights = comprehensiveData?.key_insights || {};

    if (insights.top_performer) {
        addSubSection('🏆 Top Performer');
        addText(`${insights.top_performer.username}: ${insights.top_performer.total_annotations} annotations`, 10, 'bold', margin);
        y += lineHeight;
    }

    if (insights.most_common_mwe) {
        addSubSection('📊 Most Common MWE');
        addText(`${insights.most_common_mwe.mwe_type}: ${insights.most_common_mwe.count} occurrences`, 10, 'bold', margin);
        y += lineHeight;
    }

    if (insights.busiest_day) {
        addSubSection('📈 Peak Activity');
        addText(`Busiest day: ${insights.busiest_day.date} with ${insights.busiest_day.daily_annotations} annotations`, 10, 'bold', margin);
        y += lineHeight;
    }

    // Recommendations
    if (comprehensiveData?.executive_summary?.recommendations) {
        addSubSection('💡 Recommendations');
        comprehensiveData.executive_summary.recommendations.forEach((rec, index) => {
            addText(`${index + 1}. ${rec}`, 10, 'normal', margin);
            y += lineHeight;
        });
    }

    // --- FOOTER ---
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
        doc.text(`Analytics Dashboard - ${new Date().toISOString().split('T')[0]}`, margin, pageHeight - 10);
    }

    // Save the PDF
    const filename = `analytics_dashboard_report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
};


  const renderPerformanceAnalytics = () => {
  // CORRECTED: Use the right data structure from backend
  const userData = comprehensiveData?.user_performance || analyticsData?.user_distribution || [];
  
  console.log("User Performance Data:", userData);
  
  // Prepare data for charts with proper fallbacks
  const chartData = userData.slice(0, 10).map(user => ({
    username: user.username || user._id || 'Unknown User',
    total_annotations: user.total_annotations || user.count || 0,
    unique_mwe_count: user.unique_mwe_count || user.mwe_type_count || 0,
    productivity_score: user.productivity_score || 0,
    completion_rate: user.approval_rate || 0
  }));

  // Prepare radar chart data
  const radarData = userData.slice(0, 5).map(user => ({
    subject: (user.username || user._id || 'User').substring(0, 12), // Truncate long names
    annotations: user.total_annotations || user.count || 0,
    diversity: user.unique_mwe_count || user.mwe_type_count || 0,
    productivity: user.productivity_score || 0,
    quality: user.approval_rate || 0
  }));

  // Calculate max values for radar chart
  const maxAnnotations = Math.max(...radarData.map(d => d.annotations), 1);
  const maxDiversity = Math.max(...radarData.map(d => d.diversity), 1);
  const maxProductivity = Math.max(...radarData.map(d => d.productivity), 1);
  const maxQuality = Math.max(...radarData.map(d => d.quality), 1);

  const radarChartData = radarData.map(user => ({
    ...user,
    annotations: (user.annotations / maxAnnotations) * 100,
    diversity: (user.diversity / maxDiversity) * 100,
    productivity: (user.productivity / maxProductivity) * 100,
    quality: user.quality // Already a percentage
  }));

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 3,
        width: "100%",
      }}
    >
      {/* Left – User Performance Distribution */}
      <Box
        sx={{
          flex: { xs: "1 1 100%", md: "1 1 48%" },
          minWidth: { xs: "100%", md: "48%" },
        }}
      >
        <Paper
          className="chart-container"
          sx={{
            width: "100%",
            height: 520,
            display: "flex",
            flexDirection: "column",
            p: 2,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" fontWeight="700" gutterBottom sx={{ mb: 2 }}>
            📊 User Performance Distribution
          </Typography>
          <Box sx={{ flex: 1, minHeight: 400, width: '100%' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={theme.palette.divider}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="username"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ 
                      fontSize: 11, 
                      fill: theme.palette.text.secondary,
                      fontWeight: 500 
                    }}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ 
                      fill: theme.palette.text.secondary,
                      fontSize: 12 
                    }}
                    axisLine={{ stroke: theme.palette.divider }}
                    tickLine={{ stroke: theme.palette.divider }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                      boxShadow: theme.shadows[3],
                      fontSize: '14px'
                    }}
                    formatter={(value, name) => {
                      const formattedName = name === 'total_annotations' ? 'Total Annotations' : name;
                      return [value, formattedName];
                    }}
                    labelFormatter={(label) => `User: ${label}`}
                  />
                  <Bar
                    dataKey="total_annotations"
                    fill={COLOR_PALETTE.primary}
                    radius={[4, 4, 0, 0]}
                    name="Total Annotations"
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                flexDirection: 'column',
                color: 'text.secondary'
              }}>
                <PeopleIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1" align="center">
                  No user performance data available
                </Typography>
                <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                  User annotations will appear here once available
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Right – Performance Radar */}
      <Box
        sx={{
          flex: { xs: "1 1 100%", md: "1 1 48%" },
          minWidth: { xs: "100%", md: "48%" },
        }}
      >
        <Paper
          className="chart-container"
          sx={{
            width: "100%",
            height: 520,
            display: "flex",
            flexDirection: "column",
            p: 2,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" fontWeight="700" gutterBottom sx={{ mb: 2 }}>
            📈 Performance Radar
          </Typography>
          <Box sx={{ flex: 1, minHeight: 400, width: '100%' }}>
            {radarChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={radarChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <PolarGrid 
                    stroke={theme.palette.divider}
                    strokeOpacity={0.6}
                  />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ 
                      fill: theme.palette.text.secondary,
                      fontSize: 11,
                      fontWeight: 500 
                    }}
                  />
                  <PolarRadiusAxis 
                    angle={90}
                    domain={[0, 100]}
                    tick={{ 
                      fill: theme.palette.text.secondary,
                      fontSize: 10 
                    }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                      boxShadow: theme.shadows[3],
                      fontSize: '14px'
                    }}
                    formatter={(value, name) => {
                      const metricNames = {
                        annotations: 'Annotations',
                        diversity: 'MWE Diversity',
                        productivity: 'Productivity',
                        quality: 'Quality Score'
                      };
                      return [`${Number(value).toFixed(1)}%`, metricNames[name] || name];
                    }}
                  />
                  {radarChartData.map((user, index) => (
                    <Radar
                      key={user.subject}
                      name={user.subject}
                      dataKey="annotations"
                      stroke={[
                        COLOR_PALETTE.primary,
                        COLOR_PALETTE.secondary,
                        COLOR_PALETTE.success,
                        COLOR_PALETTE.warning,
                        COLOR_PALETTE.error
                      ][index % 5]}
                      fill={[
                        COLOR_PALETTE.primary,
                        COLOR_PALETTE.secondary,
                        COLOR_PALETTE.success,
                        COLOR_PALETTE.warning,
                        COLOR_PALETTE.error
                      ][index % 5]}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                flexDirection: 'column',
                color: 'text.secondary'
              }}>
                <TrendingUpIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1" align="center">
                  No radar chart data available
                </Typography>
                <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                  Need at least 2 users with annotations
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Performance Metrics Summary */}
      <Box
        sx={{
          flex: "1 1 100%",
          minWidth: "100%",
        }}
      >
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" fontWeight="700" gutterBottom>
            🎯 Performance Metrics Summary
          </Typography>
          <Grid container spacing={2}>
            {chartData.slice(0, 6).map((user, index) => (
              <Grid item xs={12} sm={6} md={4} key={user.username}>
                <Card 
                  sx={{ 
                    p: 2.5,
                    background: `linear-gradient(135deg, ${
                      [
                        COLOR_PALETTE.primary, 
                        COLOR_PALETTE.secondary, 
                        COLOR_PALETTE.success,
                        COLOR_PALETTE.warning, 
                        COLOR_PALETTE.error, 
                        COLOR_PALETTE.info
                      ][index % 6]
                    }08 0%, transparent 100%)`,
                    border: `1px solid ${
                      [
                        COLOR_PALETTE.primary, 
                        COLOR_PALETTE.secondary, 
                        COLOR_PALETTE.success,
                        COLOR_PALETTE.warning, 
                        COLOR_PALETTE.error, 
                        COLOR_PALETTE.info
                      ][index % 6]
                    }20`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4],
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32,
                        background: `linear-gradient(135deg, ${
                          [
                            COLOR_PALETTE.primary, 
                            COLOR_PALETTE.secondary, 
                            COLOR_PALETTE.success,
                            COLOR_PALETTE.warning, 
                            COLOR_PALETTE.error, 
                            COLOR_PALETTE.info
                          ][index % 6]
                        } 0%, ${
                          [
                            COLOR_PALETTE.secondary, 
                            COLOR_PALETTE.primary, 
                            COLOR_PALETTE.info,
                            COLOR_PALETTE.success, 
                            COLOR_PALETTE.warning, 
                            COLOR_PALETTE.error
                          ][index % 6]
                        } 100%)`,
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        mr: 1.5
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight="600" noWrap>
                      {user.username}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Annotations:
                    </Typography>
                    <Typography variant="body1" fontWeight="700">
                      {user.total_annotations}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      MWE Types:
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {user.unique_mwe_count}
                    </Typography>
                  </Box>
                  
                  {user.completion_rate > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Completion:
                      </Typography>
                      <Chip 
                        label={`${user.completion_rate}%`}
                        size="small"
                        sx={{
                          background: user.completion_rate >= 80 
                            ? `${COLOR_PALETTE.success}20` 
                            : user.completion_rate >= 50 
                            ? `${COLOR_PALETTE.warning}20`
                            : `${COLOR_PALETTE.error}20`,
                          color: user.completion_rate >= 80 
                            ? COLOR_PALETTE.success 
                            : user.completion_rate >= 50 
                            ? COLOR_PALETTE.warning
                            : COLOR_PALETTE.error,
                          fontWeight: '600',
                          fontSize: '0.75rem'
                        }}
                      />
                    </Box>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {chartData.length === 0 && (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              color: 'text.secondary'
            }}>
              <PeopleIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="body1">
                No user performance metrics available
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};



const renderProjectAnalytics = () => {
    const projectData = projects.map(project => ({
        name: project.name,
        progress: project.progress_percent || 0,
        completed: project.annotated_count || 0,
        total: project.total_sentences || 0,
        status: project.progress_percent === 100 ? 'Completed' : 'In Progress'
    }));

    // Calculate summary stats
    const completedProjects = projectData.filter(p => p.progress === 100).length;
    const avgProgress = projectData.reduce((sum, p) => sum + p.progress, 0) / Math.max(projectData.length, 1);

    return (
        <Grid container spacing={3}>
            {/* Quick Stats */}
            <Grid item xs={12}>
                <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight="800" color={COLOR_PALETTE.primary}>
                                {projectData.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Projects
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight="800" color={COLOR_PALETTE.success}>
                                {completedProjects}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Completed
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight="800" color={COLOR_PALETTE.warning}>
                                {projectData.length - completedProjects}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                In Progress
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight="800" color={COLOR_PALETTE.secondary}>
                                {Math.round(avgProgress)}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Avg Progress
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>
            </Grid>

            {/* Progress Chart */}
            <Grid item xs={12} lg={8}>
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight="700">
                            Project Progress
                        </Typography>
                        <Chip 
                            label={`${projectData.length} projects`}
                            size="small"
                            variant="outlined"
                        />
                    </Box>
                    <Box sx={{ height: 300 }}>
                        {projectData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={projectData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                    <XAxis 
                                        dataKey="name" 
                                        angle={-45} 
                                        textAnchor="end" 
                                        height={60}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis />
                                    <RechartsTooltip 
                                        formatter={(value) => [`${value}%`, 'Progress']}
                                    />
                                    <Bar 
                                        dataKey="progress" 
                                        fill={COLOR_PALETTE.primary}
                                        radius={[4, 4, 0, 0]}
                                    >
                                        {projectData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`}
                                                fill={
                                                    entry.progress === 100 ? COLOR_PALETTE.success :
                                                    entry.progress >= 50 ? COLOR_PALETTE.primary :
                                                    COLOR_PALETTE.warning
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                height: '100%',
                                color: 'text.secondary'
                            }}>
                                <Typography>No projects to display</Typography>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Grid>

            {/* Project List */}
            <Grid item xs={12} lg={4}>
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="700" gutterBottom>
                        Recent Projects
                    </Typography>
                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {projectData.slice(0, 8).map((project, index) => (
                            <Box key={index} sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="body2" fontWeight="600" noWrap sx={{ flex: 1 }}>
                                        {project.name}
                                    </Typography>
                                    <Typography variant="body2" fontWeight="700" color={
                                        project.progress === 100 ? COLOR_PALETTE.success :
                                        project.progress >= 50 ? COLOR_PALETTE.primary :
                                        COLOR_PALETTE.warning
                                    }>
                                        {project.progress}%
                                    </Typography>
                                </Box>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={project.progress}
                                    sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        backgroundColor: `${theme.palette.divider}30`,
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: 
                                                project.progress === 100 ? COLOR_PALETTE.success :
                                                project.progress >= 50 ? COLOR_PALETTE.primary :
                                                COLOR_PALETTE.warning,
                                            borderRadius: 3
                                        }
                                    }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    {project.completed}/{project.total} sentences
                                </Typography>
                            </Box>
                        ))}
                        {projectData.length === 0 && (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                                No projects available
                            </Typography>
                        )}
                    </Box>
                </Paper>
            </Grid>
        </Grid>
    );
};

 const renderMWEAnalytics = () => {
  // CORRECTED: Use the right data structure from backend
  const mweData = analyticsData?.mwe_types || [];
  const languageData = analyticsData?.language_distribution || [];
  
  console.log("MWE Data for charts:", mweData);
  console.log("Language Data for charts:", languageData);

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 3,
        width: "100%",
      }}
    >
      {/* Left – MWE Type Distribution */}
      <Box
        sx={{
          flex: { xs: "1 1 100%", md: "1 1 48%" },
          minWidth: { xs: "100%", md: "48%" },
        }}
      >
        <Paper
          className="chart-container"
          sx={{
            width: "100%",
            height: 520,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h6" fontWeight="700" gutterBottom>
            MWE Type Distribution
          </Typography>
          <Box sx={{ width: "100%", height: 400 }}>
            {mweData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mweData.slice(0, 8)} // Show top 8 MWE types
                    dataKey="count"
                    nameKey="mwe_type"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    label={({ mwe_type, percent }) =>
                      `${mwe_type} ${(percent * 100).toFixed(1)}%`
                    }
                    labelLine={true}
                  >
                    {mweData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={[
                          "#6366F1",
                          "#8B5CF6",
                          "#10B981",
                          "#F59E0B",
                          "#EF4444",
                          "#3B82F6",
                          "#8B5CF6",
                          "#06B6D4",
                        ][i % 8]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value, name) => [`${value} annotations`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                flexDirection: 'column',
                color: 'text.secondary'
              }}>
                <AssessmentIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1">
                  No MWE data available
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Right – Language Distribution */}
      <Box
        sx={{
          flex: { xs: "1 1 100%", md: "1 1 48%" },
          minWidth: { xs: "100%", md: "48%" },
        }}
      >
        <Paper
          className="chart-container"
          sx={{
            width: "100%",
            height: 520,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" fontWeight="700" gutterBottom>
            Language Distribution
          </Typography>
          <Box sx={{ flex: 1, minHeight: 400 }}>
            {languageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={languageData.slice(0, 10)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis 
                    dataKey="language" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                  />
                  <YAxis 
                    tick={{ fill: theme.palette.text.secondary }}
                  />
                  <RechartsTooltip 
                    formatter={(value) => [`${value} annotations`, 'Count']}
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill={COLOR_PALETTE.secondary}
                    radius={[4, 4, 0, 0]}
                    name="Annotations"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                flexDirection: 'column',
                color: 'text.secondary'
              }}>
                <LanguageIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1">
                  No language data available
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Additional MWE Statistics */}
      <Box
        sx={{
          flex: "1 1 100%",
          minWidth: "100%",
        }}
      >
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" fontWeight="700" gutterBottom>
            MWE Statistics Summary
          </Typography>
          <Grid container spacing={2}>
            {mweData.slice(0, 6).map((mwe, index) => (
              <Grid item xs={12} sm={6} md={4} key={mwe.mwe_type}>
                <Card 
                  sx={{ 
                    p: 2, 
                    background: `linear-gradient(135deg, ${[
                      "#6366F1", "#8B5CF6", "#10B981", 
                      "#F59E0B", "#EF4444", "#3B82F6"
                    ][index % 6]}20 0%, transparent 100%)`,
                    border: `1px solid ${[
                      "#6366F1", "#8B5CF6", "#10B981", 
                      "#F59E0B", "#EF4444", "#3B82F6"
                    ][index % 6]}30`
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                    {mwe.mwe_type}
                  </Typography>
                  <Typography variant="h6" fontWeight="700">
                    {mwe.count} annotations
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {mwe.unique_word_count || 0} unique phrases
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
          {mweData.length === 0 && (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              color: 'text.secondary'
            }}>
              <Typography variant="body1">
                No MWE statistics available
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};


    return (
        <Box className="analytics-dashboard" 
            sx={{ 
                flexGrow: 1, 
                pt: 0,
                px: 3,
                pb: 3,
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                minHeight: '100vh',
                position: 'relative'
            }}
        >

             <Navbar  username={username}/>
            {/* Animated background elements */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `radial-gradient(circle at 20% 80%, ${alpha(COLOR_PALETTE.primary, 0.1)} 0%, transparent 50%),
                                radial-gradient(circle at 80% 20%, ${alpha(COLOR_PALETTE.secondary, 0.1)} 0%, transparent 50%)`,
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />

            <Box sx={{ position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <Paper className="dashboard-header"
                    sx={{ 
                        p: 4, 
                        mb: 3, 
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Header background accent */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: COLOR_PALETTE.gradient.primary
                        }}
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography 
                                variant="h4" 
                                fontWeight="800" 
                                gutterBottom
                                sx={{
                                    background: COLOR_PALETTE.gradient.primary,
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                Analytics Dashboard
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                                Comprehensive insights and performance metrics for your annotation ecosystem
                            </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Tooltip title="Refresh Data">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <IconButton 
                                        onClick={handleRefresh} 
                                        disabled={refreshing}
                                        sx={{
                                            background: COLOR_PALETTE.gradient.primary,
                                            color: 'white',
                                            '&:hover': {
                                                background: COLOR_PALETTE.primary
                                            }
                                        }}
                                    >
                                        <RefreshIcon />
                                    </IconButton>
                                </motion.div>
                            </Tooltip>
                            
                            <Tooltip title="Toggle Filters">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <IconButton 
                                        onClick={() => setShowFilters(!showFilters)}
                                        sx={{
                                            border: `2px solid ${showFilters ? COLOR_PALETTE.primary : theme.palette.divider}`,
                                            color: showFilters ? COLOR_PALETTE.primary : 'text.secondary'
                                        }}
                                    >
                                        <FilterIcon />
                                    </IconButton>
                                </motion.div>
                            </Tooltip>
                            
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<DownloadIcon />}
                                        onClick={() => downloadReport('csv')}
                                        disabled={loading}
                                        sx={{
                                            borderColor: COLOR_PALETTE.primary,
                                            color: COLOR_PALETTE.primary,
                                            '&:hover': {
                                                borderColor: COLOR_PALETTE.primary,
                                                background: alpha(COLOR_PALETTE.primary, 0.04)
                                            }
                                        }}
                                    >
                                        Export CSV
                                    </Button>
                                </motion.div>
                                
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<DownloadIcon />}
                                        onClick={() => downloadReport('pdf')}
                                        disabled={loading}
                                        sx={{
                                            background: COLOR_PALETTE.gradient.primary,
                                            '&:hover': {
                                                background: COLOR_PALETTE.primary
                                            }
                                        }}
                                    >
                                        Download PDF
                                    </Button>
                                </motion.div>
                            </Box>
                        </Box>
                    </Box>

                    {/* Enhanced Filters */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Box sx={{ mt: 3, p: 3, backgroundColor: alpha(theme.palette.background.paper, 0.5), borderRadius: 2 }}>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <FilterIcon /> Advanced Filters
                                    </Typography>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} sm={6} md={2}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Timeframe</InputLabel>
                                                <Select
                                                    value={filters.timeframe}
                                                    label="Timeframe"
                                                    onChange={(e) => handleFilterChange('timeframe', e.target.value)}
                                                >
                                                    <MenuItem value="7d">Last 7 days</MenuItem>
                                                    <MenuItem value="30d">Last 30 days</MenuItem>
                                                    <MenuItem value="90d">Last 90 days</MenuItem>
                                                    <MenuItem value="1y">Last year</MenuItem>
                                                    <MenuItem value="all">All time</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6} md={2}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Language</InputLabel>
                                                <Select
                                                    value={filters.language}
                                                    label="Language"
                                                    onChange={(e) => handleFilterChange('language', e.target.value)}
                                                >
                                                    <MenuItem value="">All</MenuItem>
                                                    <MenuItem value="en">English</MenuItem>
                                                    <MenuItem value="es">Spanish</MenuItem>
                                                    <MenuItem value="fr">French</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6} md={2}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Project</InputLabel>
                                                <Select
                                                    value={filters.project_id}
                                                    label="Project"
                                                    onChange={(e) => handleFilterChange('project_id', e.target.value)}
                                                >
                                                    <MenuItem value="">All Projects</MenuItem>
                                                    {projects.map((project) => (
                                                        <MenuItem key={project.id} value={project.id}>
                                                            {project.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6} md={2}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>User</InputLabel>
                                                <Select
                                                    value={filters.username}
                                                    label="User"
                                                    onChange={(e) => handleFilterChange('username', e.target.value)}
                                                >
                                                    <MenuItem value="">All Users</MenuItem>
                                                    {users.map((user) => (
                                                        <MenuItem key={user.username} value={user.username}>
                                                            {user.username}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6} md={2}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Start Date"
                                                type="date"
                                                value={filters.start_date}
                                                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6} md={2}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="End Date"
                                                type="date"
                                                value={filters.end_date}
                                                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        </Grid>
                                        
                                        <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                <Button 
                                                    onClick={clearFilters}
                                                    variant="text"
                                                    color="inherit"
                                                >
                                                    Clear All
                                                </Button>
                                                <Button 
                                                    onClick={() => applyFilters(filters)}
                                                    variant="contained"
                                                    sx={{
                                                        background: COLOR_PALETTE.gradient.primary,
                                                        '&:hover': {
                                                            background: COLOR_PALETTE.primary
                                                        }
                                                    }}
                                                >
                                                    Apply Filters
                                                </Button>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Paper>

                {/* Error Alert */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Alert 
                            severity="error" 
                            sx={{ mb: 3, borderRadius: 2 }}
                            action={
                                <Button color="inherit" size="small" onClick={() => setError('')}>
                                    Dismiss
                                </Button>
                            }
                        >
                            {error}
                        </Alert>
                    </motion.div>
                )}

                {/* Loading State */}
                {loading && !refreshing && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <CircularProgress size={60} sx={{ color: COLOR_PALETTE.primary, mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                Loading Analytics Dashboard...
                            </Typography>
                        </Box>
                    </Box>
                )}

                {/* Main Content */}
                {!loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Navigation Tabs */}
                        <Paper className="analytics-tabs" 
                            sx={{ 
                                mb: 3, 
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                border: `1px solid ${theme.palette.divider}`
                            }}
                        >
                            <Tabs
                                value={activeTab}
                                onChange={(e, newValue) => setActiveTab(newValue)}
                                variant={isMobile ? "scrollable" : "fullWidth"}
                                scrollButtons="auto"
                                sx={{
                                    '& .MuiTab-root': {
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        fontSize: '0.95rem',
                                        minHeight: 60,
                                        color: 'text.secondary',
                                        '&.Mui-selected': {
                                            color: COLOR_PALETTE.primary,
                                        }
                                    },
                                    '& .MuiTabs-indicator': {
                                        backgroundColor: COLOR_PALETTE.primary,
                                        height: 3
                                    }
                                }}
                            >
                                <Tab 
                                    icon={<AnalyticsIcon sx={{ fontSize: 20 }} />} 
                                    iconPosition="start" 
                                    label="Overview" 
                                />
                                <Tab 
                                    icon={<TimelineIcon sx={{ fontSize: 20 }} />} 
                                    iconPosition="start" 
                                    label="Performance" 
                                />
                                <Tab 
                                    icon={<FolderIcon sx={{ fontSize: 20 }} />} 
                                    iconPosition="start" 
                                    label="Projects" 
                                />
                                <Tab 
                                    icon={<LanguageIcon sx={{ fontSize: 20 }} />} 
                                    iconPosition="start" 
                                    label="MWE Analytics" 
                                />
                            </Tabs>
                        </Paper>

                        {/* Tab Content */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {activeTab === 0 && renderOverview()}
                                {activeTab === 1 && renderPerformanceAnalytics()}
                                {activeTab === 2 && renderProjectAnalytics()}
                                {activeTab === 3 && renderMWEAnalytics()}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                )}
            </Box>
        </Box>
    );
};

export default AnalyticsDashboard;