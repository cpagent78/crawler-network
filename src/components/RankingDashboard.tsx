import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Speed,
  DataUsage,
  Timer,
  EmojiEvents,
  Refresh,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CrawlerStats {
  id: string;
  name: string;
  rank: number;
  previousRank: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  throughput: number;
  uptime: number;
  score: number;
  avatar: string;
  trend: 'up' | 'down' | 'stable';
  status: 'active' | 'inactive' | 'maintenance';
}

interface PerformanceData {
  timestamp: string;
  requests: number;
  responseTime: number;
  successRate: number;
}

const RankingDashboard: React.FC = () => {
  const [crawlers, setCrawlers] = useState<CrawlerStats[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [loading, setLoading] = useState<boolean>(true);

  const mockCrawlers: CrawlerStats[] = [
    {
      id: 'crawler-1',
      name: 'WebSpider Pro',
      rank: 1,
      previousRank: 2,
      totalRequests: 15420,
      successfulRequests: 14890,
      failedRequests: 530,
      averageResponseTime: 245,
      throughput: 125.5,
      uptime: 99.2,
      score: 9850,
      avatar: 'WP',
      trend: 'up',
      status: 'active',
    },
    {
      id: 'crawler-2',
      name: 'DataHunter X',
      rank: 2,
      previousRank: 1,
      totalRequests: 14820,
      successfulRequests: 14200,
      failedRequests: 620,
      averageResponseTime: 312,
      throughput: 98.7,
      uptime: 97.8,
      score: 9420,
      avatar: 'DH',
      trend: 'down',
      status: 'active',
    },
    {
      id: 'crawler-3',
      name: 'ScrapeBot Elite',
      rank: 3,
      previousRank: 3,
      totalRequests: 12980,
      successfulRequests: 12450,
      failedRequests: 530,
      averageResponseTime: 189,
      throughput: 110.2,
      uptime: 98.9,
      score: 8950,
      avatar: 'SB',
      trend: 'stable',
      status: 'active',
    },
    {
      id: 'crawler-4',
      name: 'QuickFetch',
      rank: 4,
      previousRank: 5,
      totalRequests: 11200,
      successfulRequests: 10680,
      failedRequests: 520,
      averageResponseTime: 156,
      throughput: 89.3,
      uptime: 96.5,
      score: 8120,
      avatar: 'QF',
      trend: 'up',
      status: 'maintenance',
    },
    {
      id: 'crawler-5',
      name: 'NetCrawl Alpha',
      rank: 5,
      previousRank: 4,
      totalRequests: 9850,
      successfulRequests: 9200,
      failedRequests: 650,
      averageResponseTime: 401,
      throughput: 67.8,
      uptime: 94.2,
      score: 7650,
      avatar: 'NC',
      trend: 'down',
      status: 'active',
    },
  ];

  const mockPerformanceData: PerformanceData[] = Array.from({ length: 24 }, (_, i) => ({
    timestamp: `${23 - i}:00`,
    requests: Math.floor(Math.random() * 500) + 200,
    responseTime: Math.floor(Math.random() * 200) + 150,
    successRate: Math.random() * 10 + 90,
  }));

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCrawlers(mockCrawlers);
      setPerformanceData(mockPerformanceData);
      setLoading(false);
    };

    loadData();
  }, [timeRange]);

  const handleTimeRangeChange = (event: SelectChangeEvent<string>) => {
    setTimeRange(event.target.value);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setCrawlers([...mockCrawlers]);
      setLoading(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const getTrendIcon = (trend: string, rank: number, previousRank: number) => {
    const rankDiff = previousRank - rank;
    if (rankDiff > 0) return <TrendingUp color="success" />;
    if (rankDiff < 0) return <TrendingDown color="error" />;
    return <div style={{ width: 24 }} />;
  };

  const pieData = [
    { name: 'Successful', value: crawlers.reduce((sum, c) => sum + c.successfulRequests, 0), color: '#4caf50' },
    { name: 'Failed', value: crawlers.reduce((sum, c) => sum + c.failedRequests, 0), color: '#f44336' },
  ];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading ranking data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
          <EmojiEvents sx={{ mr: 2, color: '#ffd700' }} />
          Crawler Ranking Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select value={timeRange} onChange={handleTimeRangeChange}>
              <MenuItem value="1h">1 Hour</MenuItem>
              <MenuItem value="24h">24 Hours</MenuItem>
              <MenuItem value="7d">7 Days</MenuItem>
              <MenuItem value="30d">30 Days</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Speed color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {crawlers.reduce((sum, c) => sum + c.totalRequests, 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Requests
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <DataUsage color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {(crawlers.reduce((sum, c) => sum + c.successfulRequests, 0) / 
                      crawlers.reduce((sum, c) => sum + c.totalRequests, 0) * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Success Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Timer color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {(crawlers.reduce((sum, c) => sum + c.averageResponseTime, 0) / crawlers.length).toFixed(0)}ms
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Avg Response Time
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmojiEvents color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{crawlers.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Crawlers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Rankings Table */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Crawler Rankings
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Crawler</TableCell>
                      <TableCell align="right">Score</TableCell>
                      <TableCell align="right">Requests</TableCell>
                      <TableCell align="right">Success Rate</TableCell>
                      <TableCell align="right">Response Time</TableCell>
                      <TableCell align="right">Uptime</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {crawlers.map((crawler) => (
                      <TableRow key={crawler.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="h6" sx={{ mr: 1 }}>
                              #{crawler.rank}
                            </Typography>
                            {getTrendIcon(crawler.trend, crawler.rank, crawler.previousRank)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              {crawler.avatar}
                            </Avatar>
                            <Typography variant="body1" fontWeight="medium">
                              {crawler.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="h6" color="primary">
                            {crawler.score.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {crawler.totalRequests.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            color={crawler.successfulRequests / crawler.totalRequests > 0.95 ? 'success.main' : 'warning.main'}
                          >
                            {((crawler.successfulRequests / crawler.totalRequests) * 100).toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{crawler.averageResponseTime}ms</TableCell>
                        <TableCell align="right">
                          <Typography
                            color={crawler.uptime > 98 ? 'success.main' : 'warning.main'}
                          >
                            {crawler.uptime}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={crawler.status}
                            color={getStatusColor(crawler.status) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Success/Failure Chart */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Request Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value.toLocaleString()}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Trends */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Performance Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="requests"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Requests"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Response Time (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Throughput Comparison */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Throughput Comparison (Requests/min)
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={crawlers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="throughput" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RankingDashboard;