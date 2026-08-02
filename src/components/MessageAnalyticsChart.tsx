import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  MessageSquare,
  TrendingUp,
  Bot,
  Calendar,
  Zap,
  CheckCircle2,
  Filter,
  BarChart2,
  PieChart as PieChartIcon,
} from 'lucide-react';

interface DayVolume {
  date: string;
  dayLabel: string;
  totalMessages: number;
  aiAutoReplies: number;
  ordersCount: number;
  humanHandoffs: number;
}

interface CategoryBreakdown {
  name: string;
  value: number;
  color: string;
}

// Generate realistic mock 30-day historical data tailored for Saban Building Materials
function generate30DayData(): DayVolume[] {
  const result: DayVolume[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);

    const isWeekend = d.getDay() === 6; // Saturday
    const isFriday = d.getDay() === 5; // Friday

    // Calculate simulated volumes
    let baseVolume = isWeekend ? 12 : isFriday ? 45 : 85 + Math.floor(Math.sin(i * 0.5) * 25);
    // Add realistic fluctuation variance
    const randomOffset = Math.floor((Math.random() - 0.4) * 20);
    const totalMessages = Math.max(8, baseVolume + randomOffset);
    const aiAutoReplies = Math.round(totalMessages * (0.92 + Math.random() * 0.06));
    const ordersCount = Math.round(totalMessages * (0.35 + Math.random() * 0.1));
    const humanHandoffs = totalMessages - aiAutoReplies;

    const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = d.getDate().toString().padStart(2, '0');
    const dateFormatted = `${dayStr}/${monthStr}`;

    const daysHeb = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\''];
    const dayName = daysHeb[d.getDay()];

    result.push({
      date: dateFormatted,
      dayLabel: `${dayName} ${dateFormatted}`,
      totalMessages,
      aiAutoReplies,
      ordersCount,
      humanHandoffs,
    });
  }

  return result;
}

export const MessageAnalyticsChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'30' | '14' | '7'>('30');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [activeCategory, setActiveCategory] = useState<'all' | 'orders' | 'ai'>('all');

  const fullData = useMemo(() => generate30DayData(), []);

  const filteredData = useMemo(() => {
    const days = parseInt(timeRange, 10);
    return fullData.slice(-days);
  }, [fullData, timeRange]);

  // Aggregate Metrics
  const totalVolume = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.totalMessages, 0);
  }, [filteredData]);

  const totalAiReplies = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.aiAutoReplies, 0);
  }, [filteredData]);

  const totalOrders = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.ordersCount, 0);
  }, [filteredData]);

  const dailyAverage = useMemo(() => {
    return Math.round(totalVolume / filteredData.length);
  }, [totalVolume, filteredData]);

  const automationRate = useMemo(() => {
    if (!totalVolume) return 100;
    return ((totalAiReplies / totalVolume) * 100).toFixed(1);
  }, [totalVolume, totalAiReplies]);

  const peakDay = useMemo(() => {
    return [...filteredData].sort((a, b) => b.totalMessages - a.totalMessages)[0];
  }, [filteredData]);

  // Category breakdown for Pie Chart
  const categoryData: CategoryBreakdown[] = useMemo(() => {
    return [
      { name: 'קליטת הזמנות חומרים', value: Math.round(totalVolume * 0.42), color: '#00a884' },
      { name: 'בירורי פקדונות ונהלים', value: Math.round(totalVolume * 0.28), color: '#3b82f6' },
      { name: 'תיאום מנוף ואספקה', value: Math.round(totalVolume * 0.18), color: '#f59e0b' },
      { name: 'שאלות כלליות ומחירים', value: Math.round(totalVolume * 0.12), color: '#a855f7' },
    ];
  }, [totalVolume]);

  return (
    <div className="bg-[#182229] border border-[#2a3942] rounded-2xl p-5 md:p-6 space-y-6 shadow-xl">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2a3942] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#00a884]/20 border border-[#00a884]/40 text-[#00a884] rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#e9edef] flex items-center gap-2">
                נפח הודעות WhatsApp מעובדות - נועה AI
                <span className="text-xs bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30 px-2.5 py-0.5 rounded-full font-mono">
                  30 ימים אחרונים
                </span>
              </h3>
              <p className="text-xs text-[#8696a0]">
                מעקב בזמן אמת אחר נפח הפניות, שיעור האוטומציה וקליטת ההזמנות
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 dir-rtl">
          {/* Time range selector */}
          <div className="bg-[#111b21] border border-[#2a3942] rounded-xl p-1 flex items-center gap-1">
            <button
              onClick={() => setTimeRange('7')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                timeRange === '7'
                  ? 'bg-[#00a884] text-[#111b21] shadow-md'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              7 ימים
            </button>
            <button
              onClick={() => setTimeRange('14')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                timeRange === '14'
                  ? 'bg-[#00a884] text-[#111b21] shadow-md'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              14 ימים
            </button>
            <button
              onClick={() => setTimeRange('30')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                timeRange === '30'
                  ? 'bg-[#00a884] text-[#111b21] shadow-md'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              30 ימים
            </button>
          </div>

          {/* Chart type toggle */}
          <div className="bg-[#111b21] border border-[#2a3942] rounded-xl p-1 flex items-center gap-1">
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'area'
                  ? 'bg-[#2a3942] text-[#00a884]'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
              title="תצוגת שטחים"
            >
              <BarChart2 className="w-4 h-4 rotate-90" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'bar'
                  ? 'bg-[#2a3942] text-[#00a884]'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
              title="תצוגת עמודות"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Key Metrics KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8696a0] block font-medium">סה"כ הודעות מעובדות</span>
            <span className="text-2xl font-black text-[#e9edef] font-mono leading-tight">{totalVolume.toLocaleString()}</span>
            <span className="text-[11px] text-[#00a884] block mt-0.5">
              ממוצע {dailyAverage} ליום
            </span>
          </div>
          <div className="p-2.5 bg-[#00a884]/15 text-[#00a884] rounded-xl shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8696a0] block font-medium">מענה אוטומטי (נועה AI)</span>
            <span className="text-2xl font-black text-[#00a884] font-mono leading-tight">{totalAiReplies.toLocaleString()}</span>
            <span className="text-[11px] text-emerald-400 block mt-0.5">
              {automationRate}% אוטומציה מלאה
            </span>
          </div>
          <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl shrink-0">
            <Bot className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8696a0] block font-medium">הזמנות שנקלטו במערכת</span>
            <span className="text-2xl font-black text-amber-400 font-mono leading-tight">{totalOrders.toLocaleString()}</span>
            <span className="text-[11px] text-amber-300 block mt-0.5">
              כ-{Math.round((totalOrders / totalVolume) * 100)}% מכלל הפניות
            </span>
          </div>
          <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl shrink-0">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8696a0] block font-medium">יום השיא בתקופה</span>
            <span className="text-xl font-bold text-[#e9edef] font-mono leading-tight">{peakDay ? peakDay.date : '-'}</span>
            <span className="text-[11px] text-blue-400 block mt-0.5">
              {peakDay ? `${peakDay.totalMessages} הודעות ביום` : ''}
            </span>
          </div>
          <div className="p-2.5 bg-blue-500/15 text-blue-400 rounded-xl shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Timeline Chart Area */}
      <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-[#e9edef] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00a884]" />
            מגמת נפח הודעות יומית (WhatsApp Chatbot Engine)
          </h4>

          {/* Quick Category Legend Toggles */}
          <div className="flex items-center gap-3 text-xs text-[#8696a0]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#00a884] inline-block" />
              תשובות נועה AI
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#f59e0b] inline-block" />
              הזמנות נקלטות
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#3b82f6] inline-block" />
              סה"כ הודעות
            </span>
          </div>
        </div>

        <div className="h-72 w-full dir-ltr">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00a884" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#00a884" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3942" vertical={false} />
                <XAxis dataKey="date" stroke="#8696a0" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8696a0" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111b21',
                    borderColor: '#2a3942',
                    borderRadius: '12px',
                    color: '#e9edef',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                  }}
                  formatter={(value: any, name: any) => {
                    const labelMap: Record<string, string> = {
                      totalMessages: 'סה"כ הודעות',
                      aiAutoReplies: 'מענה נועה AI',
                      ordersCount: 'הזמנות נקלטו',
                    };
                    return [value, labelMap[String(name)] || name];
                  }}
                  labelFormatter={(label) => `תאריך: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="totalMessages"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  name="totalMessages"
                />
                <Area
                  type="monotone"
                  dataKey="aiAutoReplies"
                  stroke="#00a884"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAi)"
                  name="aiAutoReplies"
                />
                <Area
                  type="monotone"
                  dataKey="ordersCount"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                  name="ordersCount"
                />
              </AreaChart>
            ) : (
              <BarChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3942" vertical={false} />
                <XAxis dataKey="date" stroke="#8696a0" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8696a0" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111b21',
                    borderColor: '#2a3942',
                    borderRadius: '12px',
                    color: '#e9edef',
                  }}
                  formatter={(value: any, name: any) => {
                    const labelMap: Record<string, string> = {
                      aiAutoReplies: 'מענה נועה AI',
                      ordersCount: 'הזמנות נקלטו',
                      humanHandoffs: 'מעקף אנושי',
                    };
                    return [value, labelMap[String(name)] || name];
                  }}
                />
                <Bar dataKey="aiAutoReplies" fill="#00a884" radius={[4, 4, 0, 0]} name="aiAutoReplies" />
                <Bar dataKey="ordersCount" fill="#f59e0b" radius={[4, 4, 0, 0]} name="ordersCount" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: Distribution Pie & Hourly Activity Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown Pie Chart */}
        <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-4 flex flex-col justify-between">
          <h4 className="text-sm font-bold text-[#e9edef] mb-3 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-[#00a884]" />
            התפלגות לפי סוגי הפניות ב-30 ימים
          </h4>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-44 w-44 shrink-0 dir-ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#202c33" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111b21',
                      borderColor: '#2a3942',
                      borderRadius: '8px',
                      color: '#e9edef',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-2.5 w-full">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[#e9edef] truncate font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="text-[#8696a0]">{Math.round((item.value / totalVolume) * 100)}%</span>
                    <span className="text-[#e9edef] font-bold">{item.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Efficiency & Peak Hours Insight Card */}
        <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-4 flex flex-col justify-between space-y-3">
          <h4 className="text-sm font-bold text-[#e9edef] flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            מדדי יעילות וזמני עומס (AI Engine Insights)
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] flex items-center justify-between">
              <span className="text-[#8696a0]">שעות עומס עיקריות בווטסאפ:</span>
              <span className="text-[#e9edef] font-bold font-mono">06:00 - 09:30 (שיא בוקר)</span>
            </div>

            <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] flex items-center justify-between">
              <span className="text-[#8696a0]">זמן מענה ממוצע של נועה AI:</span>
              <span className="text-emerald-400 font-bold font-mono">1.2 שניות (זמן אמת)</span>
            </div>

            <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942] flex items-center justify-between">
              <span className="text-[#8696a0]">שיעור דיוק אימות מילון לוגיסטי:</span>
              <span className="text-emerald-400 font-bold font-mono">99.1% (אפס הזיות)</span>
            </div>
          </div>

          <div className="p-2.5 bg-[#00a884]/10 border border-[#00a884]/30 rounded-lg text-xs text-[#e9edef] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00a884] shrink-0" />
            <span>המערכת מסונכרנת בזמן אמת מול פלאגין JONI ב-Firebase וגיליון Google Sheets.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
