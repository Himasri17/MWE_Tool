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

            const [mweRes, comprehensiveRes, projectsRes] = await Promise.allSettled(endpoints);

            // Process MWE data with better error handling
            if (mweRes.status === 'fulfilled' && mweRes.value.ok) {
                const mweData = await mweRes.value.json();
                console.log("MWE Data:", mweData);
                setAnalyticsData(mweData);
            } else {
                console.error("MWE data fetch failed:", mweRes.reason);
            }

            // Process comprehensive data
            if (comprehensiveRes.status === 'fulfilled' && comprehensiveRes.value.ok) {
                const comprehensiveData = await comprehensiveRes.value.json();
                console.log("Comprehensive Data:", comprehensiveData);
                setComprehensiveData(comprehensiveData);
                
                generateNotifications(comprehensiveData);
            }

            // Process projects
            if (projectsRes.status === 'fulfilled' && projectsRes.value.ok) {
                const projectsData = await projectsRes.value.json();
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
                // Use the comprehensive report data for PDF generation
                const reportRes = await fetch(`${API_BASE_URL}/api/analytics/comprehensive-report?${queryParams}&level=detailed`, {
                    headers: getAuthHeaders()
                });
                
                if (reportRes.ok) {
                    const comprehensiveData = await reportRes.json();
                    console.log("Comprehensive Report Data for PDF:", comprehensiveData);
                    await generateEnhancedPdfReport(comprehensiveData);
                } else {
                    if (reportRes.status === 401) {
                        handleUnauthorized();
                        return;
                    }
                    throw new Error('Failed to fetch comprehensive report data');
                }
            } else if (format === 'csv') {
                // Use the enhanced download endpoint
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

    const generateEnhancedPdfReport = async (reportData) => {
        console.log("Generating Enhanced PDF with data:", reportData);
        
        if (!reportData) {
            console.error("No report data provided");
            setError("No data available for PDF generation");
            return;
        }

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
            doc.setFillColor(41, 128, 185);
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
        doc.setFillColor(52, 152, 219);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica-bold', 'bold');
        doc.text('COMPREHENSIVE ANALYTICS REPORT', pageWidth / 2, 80, { align: 'center' });
        
        doc.setFontSize(16);
        doc.text('Sentence Annotation System', pageWidth / 2, 100, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Generated on: ${reportData.report_metadata?.generated_at || new Date().toISOString()}`, pageWidth / 2, 120, { align: 'center' });
        
        // Check if filters were applied
        const hasFilters = reportData.report_metadata?.filters_applied && 
            Object.values(reportData.report_metadata.filters_applied).some(val => val);
        if (hasFilters) {
            doc.text('Custom Filter Report', pageWidth / 2, 130, { align: 'center' });
        } else {
            doc.text('Complete System Report', pageWidth / 2, 130, { align: 'center' });
        }
        
        doc.addPage();
        y = 15;

        // --- EXECUTIVE SUMMARY ---
        addSectionHeader('EXECUTIVE SUMMARY');
        
        const summary = reportData.executive_summary || reportData.summary || {};
        addText('Comprehensive analytics report with enhanced metrics and insights.', 10, 'normal', margin);
        y += lineHeight * 2;

        // Key Metrics from enhanced data
        addSubSection('SYSTEM OVERVIEW');
        const metrics = [
            { label: 'Total Annotations', value: summary.total_annotations || analyticsData?.summary?.total_annotations || 0 },
            { label: 'Active Users', value: summary.total_users || analyticsData?.summary?.total_users || 0 },
            { label: 'Projects', value: summary.total_projects || analyticsData?.summary?.total_projects || 0 },
            { label: 'MWE Types', value: summary.total_mwe_types || analyticsData?.summary?.total_mwe_types || 0 },
            { label: 'Languages', value: summary.total_languages || analyticsData?.summary?.total_languages || 0 }
        ];
        
        metrics.forEach(metric => {
            addText(`• ${metric.label}: ${metric.value.toLocaleString()}`, 10, 'normal', margin);
            y += lineHeight;
        });

        // Quality Metrics if available
        if (reportData.quality_metrics) {
            y += lineHeight;
            addSubSection('QUALITY METRICS');
            const qualityMetrics = [
                { label: 'User Engagement Score', value: `${reportData.quality_metrics.user_engagement_score?.toFixed(1) || 'N/A'}%` },
                { label: 'Annotation Growth Rate', value: `${reportData.quality_metrics.annotation_growth_rate?.toFixed(1) || 'N/A'}%` },
                { label: 'Overall Quality', value: reportData.quality_metrics.overall_annotation_quality || 'N/A' }
            ];
            
            qualityMetrics.forEach(metric => {
                addText(`• ${metric.label}: ${metric.value}`, 10, 'normal', margin);
                y += lineHeight;
            });
        }

        // Applied Filters
        if (hasFilters) {
            y += lineHeight;
            addSubSection('APPLIED FILTERS');
            Object.entries(reportData.report_metadata.filters_applied).forEach(([key, value]) => {
                if (value) {
                    addText(`- ${key}: ${value}`, 9, 'normal', margin);
                    y += lineHeight;
                }
            });
        }

        // Generate charts from comprehensive data
        doc.addPage();
        y = 15;
        addSectionHeader('DATA VISUALIZATION');

        // Prepare chart data from comprehensive report
        const chartData = {
            mwe_distribution: reportData.mwe_distribution || analyticsData?.mwe_types || [],
            user_distribution: reportData.user_performance || analyticsData?.user_distribution || [],
            project_distribution: reportData.project_progress || analyticsData?.project_distribution || [],
            timeline_data: reportData.timeline_data || timelineData || []
        };

        // Generate charts
        const chartsToGenerate = [
            {
                data: chartData.mwe_distribution,
                type: 'bar',
                title: 'MWE Type Distribution',
                xLabel: 'MWE Types',
                yLabel: 'Annotation Count'
            },
            {
                data: chartData.user_distribution.slice(0, 10),
                type: 'bar',
                title: 'Top 10 Users by Annotations',
                xLabel: 'Users',
                yLabel: 'Annotation Count'
            },
            {
                data: chartData.project_distribution,
                type: 'bar',
                title: 'Project Progress',
                xLabel: 'Projects',
                yLabel: 'Annotation Count'
            }
        ];

        for (const chartConfig of chartsToGenerate) {
            if (chartConfig.data && chartConfig.data.length > 0) {
                const chartImage = await generateChart(
                    chartConfig.data,
                    chartConfig.type,
                    chartConfig.title,
                    chartConfig.xLabel,
                    chartConfig.yLabel
                );
                await addChartImage(chartImage, chartConfig.title);
            }
        }

        // Key Insights Section
        if (reportData.key_insights) {
            doc.addPage();
            y = 15;
            addSectionHeader('KEY INSIGHTS & RECOMMENDATIONS');

            const insights = reportData.key_insights;
            
            if (insights.top_performer) {
                addSubSection('TOP PERFORMER');
                addText(`🏆 ${insights.top_performer.username}: ${insights.top_performer.total_annotations} annotations`, 10, 'bold', margin);
                y += lineHeight;
            }

            if (insights.most_common_mwe) {
                addSubSection('MOST COMMON MWE');
                addText(`📊 ${insights.most_common_mwe.mwe_type}: ${insights.most_common_mwe.count} occurrences`, 10, 'bold', margin);
                y += lineHeight;
            }

            if (reportData.executive_summary?.recommendations) {
                addSubSection('RECOMMENDATIONS');
                reportData.executive_summary.recommendations.forEach((rec, index) => {
                    addText(`${index + 1}. ${rec}`, 10, 'normal', margin);
                    y += lineHeight;
                });
            }
        }

        // --- FOOTER ---
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
            doc.text(`Sentence Annotation System - ${new Date().toISOString().split('T')[0]}`, margin, pageHeight - 10);
        }

        // Save the PDF
        const filename = `comprehensive_analytics_report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
    };


    const renderPerformanceAnalytics = () => {
    const userData = comprehensiveData?.user_performance || analyticsData?.user_distribution || [];
    
    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
                <Paper 
                    sx={{ 
                        p: 3, 
                        borderRadius: 3,
                        height: '100%',
                        minHeight: 520,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    className="chart-container large-chart"
                >
                    <Typography variant="h6" fontWeight="700" gutterBottom>
                        User Performance Distribution
                    </Typography>
                    <Box sx={{ flex: 1, minHeight: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={userData.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                <XAxis 
                                    dataKey="username" 
                                    angle={-45} 
                                    textAnchor="end" 
                                    height={80}
                                    tick={{ fill: theme.palette.text.secondary }}
                                />
                                <YAxis tick={{ fill: theme.palette.text.secondary }} />
                                <RechartsTooltip 
                                    contentStyle={{
                                        background: theme.palette.background.paper,
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 8
                                    }}
                                />
                                <Bar 
                                    dataKey={userData[0]?.total_annotations ? 'total_annotations' : 'count'} 
                                    fill={COLOR_PALETTE.primary}
                                    radius={[4, 4, 0, 0]}
                                    name="Total Annotations"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
                <Paper 
                    sx={{ 
                        p: 3, 
                        borderRadius: 3,
                        height: '100%',
                        minHeight: 520,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    className="chart-container"
                >
                    <Typography variant="h6" fontWeight="700" gutterBottom>
                        Performance Radar
                    </Typography>
                    <Box sx={{ flex: 1, minHeight: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={userData.slice(0, 5).map(user => ({
                                subject: user.username,
                                annotations: user.total_annotations || user.count,
                                types: user.unique_mwe_count || user.mwe_type_count,
                                fullMark: Math.max(...userData.map(u => u.total_annotations || u.count))
                            }))}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" />
                                <PolarRadiusAxis />
                                <Radar 
                                    name="Annotations" 
                                    dataKey="annotations" 
                                    stroke={COLOR_PALETTE.primary} 
                                    fill={COLOR_PALETTE.primary}
                                    fillOpacity={0.6} 
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>
        </Grid>
    );
};

    const renderProjectAnalytics = () => {
    const chartData = projects.map(project => ({
        project_name: project.name,
        total_annotations: project.annotated_count,
        completion_rate: project.progress_percent,
        total_sentences: project.total_sentences,
        status: project.progress_percent === 100 ? 'Completed' : 'In Progress'
    }));

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Paper 
                    sx={{ 
                        p: 3, 
                        borderRadius: 3,
                        height: '100%',
                        minHeight: 500,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    className="chart-container large-chart"
                >
                    <Typography variant="h6" fontWeight="700" gutterBottom>
                        Project Progress Overview
                    </Typography>
                    <Box sx={{ flex: 1, minHeight: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                <XAxis 
                                    dataKey="project_name" 
                                    angle={-45} 
                                    textAnchor="end" 
                                    height={80}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis />
                                <RechartsTooltip 
                                    contentStyle={{
                                        background: theme.palette.background.paper,
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 8
                                    }}
                                />
                                <Bar 
                                    dataKey="total_annotations" 
                                    fill={COLOR_PALETTE.primary}
                                    name="Total Annotations"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar 
                                    dataKey="completion_rate" 
                                    fill={COLOR_PALETTE.success}
                                    name="Completion Rate %"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>
        </Grid>
    );
};

    const renderMWEAnalytics = () => {
    const mweData = analyticsData?.mwe_types || [];
    
    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
                <Paper 
                    sx={{ 
                        p: 3, 
                        borderRadius: 3,
                        height: '100%',
                        minHeight: 480,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    className="chart-container"
                >
                    <Typography variant="h6" fontWeight="700" gutterBottom>
                        MWE Type Distribution
                    </Typography>
                    <Box sx={{ flex: 1, minHeight: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mweData.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                <XAxis 
                                    dataKey="mwe_type" 
                                    angle={-45} 
                                    textAnchor="end" 
                                    height={80}
                                    tick={{ fill: theme.palette.text.secondary }}
                                />
                                <YAxis tick={{ fill: theme.palette.text.secondary }} />
                                <RechartsTooltip 
                                    contentStyle={{
                                        background: theme.palette.background.paper,
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 8
                                    }}
                                />
                                <Bar 
                                    dataKey="count" 
                                    fill={COLOR_PALETTE.secondary}
                                    radius={[4, 4, 0, 0]}
                                    name="Total Count"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>
            
            <Grid item xs={12} md={5}>
                <Paper 
                    sx={{ 
                        p: 3, 
                        borderRadius: 3,
                        height: '100%',
                        minHeight: 480,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    className="chart-container"
                >
                    <Typography variant="h6" fontWeight="700" gutterBottom>
                        MWE Categories
                    </Typography>
                    <Box sx={{ flex: 1, minHeight: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={mweData.slice(0, 6)}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ mwe_type, count }) => `${mwe_type}: ${count}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {mweData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={[
                                            COLOR_PALETTE.primary,
                                            COLOR_PALETTE.secondary,
                                            COLOR_PALETTE.success,
                                            COLOR_PALETTE.warning,
                                            COLOR_PALETTE.info,
                                            COLOR_PALETTE.error
                                        ][index % 6]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>
        </Grid>
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