import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api';
import {
  AnalyticsResponse,
  UserRegistrationAnalyticsData,
  RevenueAnalyticsData,
  SellerAnalyticsData,
  GamePopularityAnalyticsData,
  DashboardSummary,
} from '../api';
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  labels: string[];
  values: number[];
}

// Prepare data for Recharts format
const prepareChartData = (labels: string[], values: number[]) => {
  return labels.map((label, idx) => ({
    name: label,
    value: Number.isFinite(values[idx]) ? values[idx] : 0,
  }));
};

interface BarChartProps {
  title: string;
  data: ChartData;
  color?: string;
  valueLabel?: string;
}

const BarChart: React.FC<BarChartProps> = ({ title, data, color = '#8366ff', valueLabel = 'Value' }) => {
  if (data.labels.length === 0 || data.values.length === 0) {
    return (
      <div className="analytics-chart">
        <h3>{title}</h3>
        <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No data available</p>
      </div>
    );
  }

  const chartData = prepareChartData(data.labels, data.values);
  const total = data.values.reduce((a, b) => a + b, 0);
  const average = data.values.length ? (total / data.values.length).toFixed(0) : '0';
  const peak = data.values.length ? Math.max(...data.values) : 0;

  return (
    <div className="analytics-chart">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', color: color }}
            formatter={(value: any) => (typeof value === 'number' ? value.toLocaleString() : String(value))}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>

      {/* Stats */}
      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ padding: '12px', background: '#1a1a2e', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Total</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color }}>
            {total.toLocaleString()}
          </div>
        </div>
        <div style={{ padding: '12px', background: '#1a1a2e', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Average</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color }}>
            {average}
          </div>
        </div>
        <div style={{ padding: '12px', background: '#1a1a2e', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Peak</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color }}>
            {peak.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

interface LineChartProps {
  title: string;
  data: ChartData;
  color?: string;
  valueLabel?: string;
}

const LineChart: React.FC<LineChartProps> = ({ title, data, color = '#8366ff', valueLabel = 'Value' }) => {
  if (data.labels.length === 0 || data.values.length === 0) {
    return (
      <div className="analytics-chart">
        <h3>{title}</h3>
        <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No data available</p>
      </div>
    );
  }

  const chartData = prepareChartData(data.labels, data.values);
  const total = data.values.reduce((a, b) => a + b, 0);
  const average = data.values.length ? (total / data.values.length).toFixed(0) : '0';
  const peak = data.values.length ? Math.max(...data.values) : 0;

  return (
    <div className="analytics-chart">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', color }}
            formatter={(value: any) => (typeof value === 'number' ? value.toLocaleString() : String(value))}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ fill: color, r: 4 }} activeDot={{ r: 6 }} />
        </RechartsLineChart>
      </ResponsiveContainer>

      {/* Stats */}
      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ padding: '12px', background: '#1a1a2e', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Total</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color }}>
            {total.toLocaleString()}
          </div>
        </div>
        <div style={{ padding: '12px', background: '#1a1a2e', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Average</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color }}>
            {average}
          </div>
        </div>
        <div style={{ padding: '12px', background: '#1a1a2e', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Peak</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color }}>
            {peak.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

interface AdminDashboardProps {
  isAdmin: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isAdmin }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [registrations, setRegistrations] = useState<AnalyticsResponse<UserRegistrationAnalyticsData> | null>(null);
  const [revenue, setRevenue] = useState<AnalyticsResponse<RevenueAnalyticsData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [summaryData, regData, revData] = await Promise.all([
          analyticsApi.getAdminSummary(),
          analyticsApi.getAdminRegistrations(),
          analyticsApi.getAdminRevenue(),
        ]);
        setSummary(summaryData);
        setRegistrations(regData);
        setRevenue(revData);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAdmin]);

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel" style={{ padding: '20px', color: '#ff6b6b' }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  const registrationChart: ChartData = {
    labels: registrations?.months.map((m) => `${m.month}/${m.year}`) || [],
    values: (registrations?.data || []).map((d) => {
      const n = Number(d?.totalRegistrations ?? 0);
      return Number.isFinite(n) ? n : 0;
    }),
  };

  const revenueChart: ChartData = {
    labels: revenue?.months.map((m) => `${m.month}/${m.year}`) || [],
    values: (revenue?.data || []).map((d) => {
      const n = Number(d?.totalRevenue ?? 0);
      return Number.isFinite(n) ? n : 0;
    }),
  };

  const salesChart: ChartData = {
    labels: revenue?.months.map((m) => `${m.month}/${m.year}`) || [],
    values: (revenue?.data || []).map((d) => {
      const n = Number(d?.saleCount ?? 0);
      return Number.isFinite(n) ? n : 0;
    }),
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '24px', color: '#8366ff' }}>📊 Admin Dashboard</h1>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Total Users</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00d4ff' }}>
              {summary.totalUsers.toLocaleString()}
            </div>
          </div>
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Published Games</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8366ff' }}>
              {summary.totalGames.toLocaleString()}
            </div>
          </div>
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Total Sales</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff6b6b' }}>
              {summary.totalSales.toLocaleString()}
            </div>
          </div>
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Current Month</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#00ff88' }}>
              {summary.currentMonth}
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
              {summary.monthlyStats.newRegistrations} new registrations
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              ${summary.monthlyStats.monthlyRevenue.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ width: '100%' }}>
          <LineChart title="User Registrations (Past 12 Months)" data={registrationChart} color="#8366ff" />
        </div>
        <div style={{ width: '100%' }}>
          <LineChart title="Platform Revenue (Past 12 Months)" data={revenueChart} color="#00d4ff" />
        </div>
        <div style={{ width: '100%' }}>
          <LineChart title="Sales Count (Past 12 Months)" data={salesChart} color="#ff6b6b" />
        </div>
      </div>
    </div>
  );
};

interface SellerDashboardProps {
  isSeller: boolean;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ isSeller }) => {
  const [analytics, setAnalytics] = useState<AnalyticsResponse<SellerAnalyticsData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSeller) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await analyticsApi.getSellerAnalytics();
        setAnalytics(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isSeller]);

  if (!isSeller) return null;

  if (loading) {
    return (
      <div className="panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading your sales analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel" style={{ padding: '20px', color: '#ff6b6b' }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  // Create charts with month labels and values
  const salesChart: ChartData = {
    labels: analytics?.months.map((m) => `${m.month}/${m.year}`) || [],
    values: (analytics?.data || []).map((d) => {
      const n = Number(d?.totalSales ?? 0);
      return Number.isFinite(n) ? n : 0;
    }),
  };

  const revenueChart: ChartData = {
    labels: analytics?.months.map((m) => `${m.month}/${m.year}`) || [],
    values: (analytics?.data || []).map((d) => {
      const n = Number(d?.totalRevenue ?? 0);
      return Number.isFinite(n) ? n : 0;
    }),
  };

  // Aggregate game performance across all months
  const gameAggregates = new Map<string, { name: string; totalSales: number; totalRevenue: number }>();
  for (const monthData of analytics?.data || []) {
    for (const game of monthData?.gamesAnalytics || []) {
      const gameId = typeof game.gameId === 'string' ? game.gameId : (game.gameId as any)?._id?.toString() || 'unknown';
      const gameName = typeof game.gameId === 'string' ? 'Game' : (game.gameId as any)?.title || 'Unknown';
      
      if (!gameAggregates.has(gameId)) {
        gameAggregates.set(gameId, { name: gameName, totalSales: 0, totalRevenue: 0 });
      }
      const agg = gameAggregates.get(gameId)!;
      agg.totalSales += Number(game.sales ?? 0);
      agg.totalRevenue += Number(game.revenue ?? 0);
    }
  }

  const gamePerformance = Array.from(gameAggregates.values())
    .sort((a, b) => b.totalSales - a.totalSales);

  const totalSales = (analytics?.data || []).reduce((sum, d) => sum + (Number(d?.totalSales ?? 0) || 0), 0);
  const totalRevenue = (analytics?.data || []).reduce((sum, d) => sum + (Number(d?.totalRevenue ?? 0) || 0), 0);
  const safeAvg = (analytics?.data?.length || 0) ? (analytics!.data.reduce((sum, d) => sum + (Number(d?.averageRating ?? 0) || 0), 0) / analytics!.data.length) : 0;
  const avgRating = safeAvg.toFixed ? safeAvg.toFixed(2) : String(safeAvg);

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '24px', color: '#8366ff' }}>📈 My Sales Dashboard</h1>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Total Sales</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff6b6b' }}>
            {totalSales.toLocaleString()}
          </div>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Total Revenue</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00d4ff' }}>
            ${totalRevenue.toLocaleString()}
          </div>
        </div>
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Average Rating</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00ff88' }}>
            {avgRating}/5.0
          </div>
        </div>
      </div>

      {/* Sales Chart - by Month */}
      <div style={{ marginBottom: '32px' }}>
        <BarChart title="Your Sales (Past 12 Months)" data={salesChart} color="#ff6b6b" />
      </div>

      {/* Revenue Chart - by Month */}
      <div style={{ marginBottom: '32px' }}>
        <BarChart title="Your Revenue (Past 12 Months)" data={revenueChart} color="#00d4ff" />
      </div>

      {/* Game Performance Table */}
      {gamePerformance.length > 0 && (
        <div className="panel" style={{ padding: '20px' }}>
          <h2 style={{ marginBottom: '16px', color: '#8366ff' }}>Your Games Performance</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333' }}>
                  <th style={{ textAlign: 'left', padding: '12px', color: '#888' }}>Game</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: '#888' }}>Total Sales</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: '#888' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {gamePerformance.map((game, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '12px', color: '#ccc' }}>{game.name}</td>
                    <td style={{ textAlign: 'right', padding: '12px', color: '#ff6b6b' }}>
                      {game.totalSales}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px', color: '#00d4ff' }}>
                      ${game.totalRevenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {gamePerformance.length === 0 && (
        <div className="panel" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
          <p>No game performance data available yet</p>
        </div>
      )}
    </div>
  );
};

interface GamePopularityDashboardProps {
  showGamePopularity: boolean;
}

export const GamePopularityDashboard: React.FC<GamePopularityDashboardProps> = ({ showGamePopularity }) => {
  const [analytics, setAnalytics] = useState<AnalyticsResponse<GamePopularityAnalyticsData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showGamePopularity) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await analyticsApi.getGamePopularity();
        setAnalytics(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load game popularity');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [showGamePopularity]);

  if (!showGamePopularity) return null;

  if (loading) {
    return (
      <div className="panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading game popularity data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel" style={{ padding: '20px', color: '#ff6b6b' }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  const ratingChart: ChartData = {
    labels: analytics?.months.map((m) => `${m.month}/${m.year}`) || [],
    values: (analytics?.data || []).map((d) => {
      const n = Number(d?.averageRating ?? 0);
      return Number.isFinite(n) ? n : 0;
    }),
  };

  const downloadsChart: ChartData = {
    labels: analytics?.months.map((m) => `${m.month}/${m.year}`) || [],
    values: (analytics?.data || []).map((d) => {
      const n = Number(d?.totalDownloads ?? 0);
      return Number.isFinite(n) ? n : 0;
    }),
  };

  const topGames = (analytics?.data || [])
    .flatMap((d: any) => d.gamesAnalytics || [])
    .sort((a: any, b: any) => (Number(b?.totalSales ?? 0) - Number(a?.totalSales ?? 0)))
    .slice(0, 10);

  const gameRows = topGames.length ? topGames : (analytics?.data || []).slice(0, 10);

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '24px', color: '#8366ff' }}>🎮 Game Popularity Trends</h1>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <LineChart title="Average Game Ratings (Past 12 Months)" data={ratingChart} color="#00ff88" />
        <LineChart title="Total Game Downloads (Past 12 Months)" data={downloadsChart} color="#8366ff" />
      </div>

      {/* Top Games */}
      {analytics && (
        <div className="panel" style={{ padding: '20px' }}>
          <h2 style={{ marginBottom: '16px', color: '#8366ff' }}>🏆 Top Games This Month</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333' }}>
                  <th style={{ textAlign: 'left', padding: '12px', color: '#888' }}>Game Title</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: '#888' }}>Rating</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: '#888' }}>Reviews</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: '#888' }}>Downloads</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: '#888' }}>Sales</th>
                </tr>
              </thead>
              <tbody>
                {gameRows.map((game: any, idx: number) => {
                  const gameTitle = typeof game?.gameId === 'string' ? 'Game' : (game?.gameId as any)?.title || 'Unknown';
                  const rating = Number(game?.averageRating ?? 0);
                  const reviewCount = Number(game?.reviewCount ?? 0);
                  const downloads = Number(game?.totalDownloads ?? 0);
                  const sales = Number(game?.totalSales ?? 0);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '12px', color: '#ccc' }}>{gameTitle}</td>
                      <td style={{ textAlign: 'right', padding: '12px', color: '#00ff88' }}>
                        {Number.isFinite(rating) ? rating.toFixed(1) : '0.0'} ⭐
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px', color: '#8366ff' }}>
                        {Number.isFinite(reviewCount) ? reviewCount : 0}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px', color: '#00d4ff' }}>
                        {Number.isFinite(downloads) ? downloads : 0}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px', color: '#ff6b6b' }}>
                        {Number.isFinite(sales) ? sales : 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
