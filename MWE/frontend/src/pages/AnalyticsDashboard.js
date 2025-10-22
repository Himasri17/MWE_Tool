import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Button,
  FormControl, InputLabel, Select, MenuItem, TextField,
  Tabs, Tab, Chip, CircularProgress, Alert,
  useTheme, useMediaQuery, IconButton, Tooltip
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, Line
} from 'recharts';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Analytics as AnalyticsIcon,
  People as PeopleIcon,
  Folder as ProjectIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import NetworkGraph from '../pages/NetworkGraph';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const AnalyticsDashboard = () => {

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeTab, setActiveTab] = useState(0);
  const [mweData, setMweData] = useState(null);
  const [networkData, setNetworkData] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [filters, setFilters] = useState({
    language: '',
    project: '',
    username: '',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchInitialData();
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [mweRes, networkRes, timelineRes] = await Promise.all([
        fetch('/api/analytics/mwe-distribution'),
        fetch('/api/analytics/mwe-network'),
        fetch('/api/analytics/annotation-timeline')
      ]);
      
      if (mweRes.ok) setMweData(await mweRes.json());
      else throw new Error('Failed to fetch MWE distribution');
      
      if (networkRes.ok) setNetworkData(await networkRes.json());
      if (timelineRes.ok) setTimelineData(await timelineRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load analytics data. Please try again.');
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users-list');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
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

      const res = await fetch(`/api/analytics/mwe-distribution?${queryParams}`);
      if (res.ok) {
        setMweData(await res.json());
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    }
    setLoading(false);
  };

  const downloadReport = async (format) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('type', format);
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const res = await fetch(`/api/analytics/reports/download?${queryParams}`);
      if (res.ok) {
        if (format === 'csv') {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `annotation_report_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const data = await res.json();
          console.log('PDF data:', data);
          // Implement PDF generation logic here
        }
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const clearFilters = () => {
    setFilters({
      language: '',
      project: '',
      username: '',
      startDate: '',
      endDate: ''
    });
    fetchInitialData();
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color} 0%, ${theme.palette.primary.dark} 100%)` }}>
      <CardContent sx={{ color: 'white', textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          {icon}
        </Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {value || 0}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {title}
        </Typography>
      </CardContent>
    </Card>
  );

  const TabPanel = ({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  const renderOverview = () => (
    <Grid container spacing={3}>
      {/* Stats Cards */}
      <Grid item xs={12}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Annotations"
              value={mweData?.total_annotations}
              icon={<AnalyticsIcon sx={{ fontSize: 40 }} />}
              color={theme.palette.primary.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="MWE Types"
              value={mweData?.mwe_types?.length}
              icon={<TimelineIcon sx={{ fontSize: 40 }} />}
              color={theme.palette.secondary.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Languages"
              value={mweData?.language_distribution?.length}
              icon={<ProjectIcon sx={{ fontSize: 40 }} />}
              color={theme.palette.success.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Annotators"
              value={mweData?.user_distribution?.length}
              icon={<PeopleIcon sx={{ fontSize: 40 }} />}
              color={theme.palette.warning.main}
            />
          </Grid>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            MWE Type Distribution
          </Typography>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={mweData?.mwe_types || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mwe_type" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="count" fill={theme.palette.primary.main} name="Count" />
              <Bar dataKey="unique_word_count" fill={theme.palette.secondary.main} name="Unique Phrases" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Language Distribution
          </Typography>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={mweData?.language_distribution || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ language, count }) => `${language}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="language"
              >
                {mweData?.language_distribution?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 3, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Annotation Timeline
          </Typography>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip />
              <Area type="monotone" dataKey="count" stroke={theme.palette.primary.main} fill={theme.palette.primary.light} />
              <Line type="monotone" dataKey="unique_annotators_count" stroke={theme.palette.secondary.main} />
            </AreaChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderNetworkGraph = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        MWE Relationship Network
      </Typography>
      {networkData ? (
        <>
          <NetworkGraph data={networkData} />
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
            <Chip label={`Nodes: ${networkData.total_nodes}`} variant="outlined" />
            <Chip label={`Links: ${networkData.total_links}`} variant="outlined" />
          </Box>
        </>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      )}
    </Paper>
  );

  const renderUserAnalytics = () => (
    <Paper sx={{ p: 3, height: 500 }}>
      <Typography variant="h6" gutterBottom>
        User Performance
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={mweData?.user_distribution || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="username" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          <Bar dataKey="count" fill={theme.palette.primary.main} name="Total Annotations" />
          <Bar dataKey="mwe_type_count" fill={theme.palette.secondary.main} name="Unique MWE Types" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );

  const renderProjectAnalytics = () => (
    <Paper sx={{ p: 3, height: 500 }}>
      <Typography variant="h6" gutterBottom>
        Project Progress
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={mweData?.project_distribution || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="project_name" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          <Bar dataKey="count" fill={theme.palette.primary.main} name="Annotations" />
          <Bar dataKey="mwe_type_count" fill={theme.palette.secondary.main} name="MWE Types" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );

  return (
    <Box sx={{ flexGrow: 1, p: 3, backgroundColor: theme.palette.background.default, minHeight: '100vh' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive insights into annotation activities and MWE distributions
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Tooltip title="Refresh Data">
              <IconButton onClick={fetchInitialData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Toggle Filters">
              <IconButton onClick={() => setShowFilters(!showFilters)}>
                <FilterIcon />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => downloadReport('csv')}
              disabled={loading}
            >
              CSV Report
            </Button>
            
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => downloadReport('pdf')}
              disabled={loading}
            >
              PDF Report
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        {showFilters && (
          <Box sx={{ mt: 3, p: 2, backgroundColor: theme.palette.background.paper, borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={filters.language}
                    label="Language"
                    onChange={(e) => handleFilterChange('language', e.target.value)}
                  >
                    <MenuItem value="">All Languages</MenuItem>
                    <MenuItem value="Hindi">Hindi</MenuItem>
                    <MenuItem value="English">English</MenuItem>
                    <MenuItem value="Bengali">Bengali</MenuItem>
                    <MenuItem value="Tamil">Tamil</MenuItem>
                    <MenuItem value="Telugu">Telugu</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Project</InputLabel>
                  <Select
                    value={filters.project}
                    label="Project"
                    onChange={(e) => handleFilterChange('project_id', e.target.value)}
                  >
                    <MenuItem value="">All Projects</MenuItem>
                    {projects.map(project => (
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
                    {users.map(user => (
                      <MenuItem key={user} value={user}>{user}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="End Date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <Button fullWidth variant="outlined" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Tabs */}
      <Paper>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
        >
          <Tab icon={<AnalyticsIcon />} label="Overview" />
          <Tab icon={<TimelineIcon />} label="MWE Network" />
          <Tab icon={<PeopleIcon />} label="User Analytics" />
          <Tab icon={<ProjectIcon />} label="Project Analytics" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {renderOverview()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          {renderNetworkGraph()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          {renderUserAnalytics()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={3}>
          {renderProjectAnalytics()}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AnalyticsDashboard;