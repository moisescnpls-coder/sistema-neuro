import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/data';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
    Users, Calendar, CheckCircle, XCircle, RefreshCw, Filter
} from 'lucide-react';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    ChartDataLabels
);

const DashboardAnalitico = () => {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    // Default to 'all' to ensure the user sees SOMETHING if their dates are weird
    const [dateRange, setDateRange] = useState('currentMonth');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const [doctors, setDoctors] = useState([]);

    useEffect(() => {
        dataService.getDoctors().then(setDoctors).catch(console.error);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Helper to format date as YYYY-MM-DD using LOCAL time to avoid timezone shifts
                const formatDate = (date) => {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                };

                const now = new Date();
                let start = '';
                let end = '';
                let period = '';

                if (dateRange === 'currentMonth') {
                    // First to Last day of current month
                    start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
                    end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
                } else if (dateRange === 'last3Months') {
                    // Current month and 2 previous months. Total 3 months.
                    // e.g. If Jan, we want Nov, Dec, Jan.
                    // Start date: 1st of (Month - 2)
                    start = formatDate(new Date(now.getFullYear(), now.getMonth() - 2, 1));
                    end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
                } else if (dateRange === 'year') {
                    start = formatDate(new Date(selectedYear, 0, 1));
                    end = formatDate(new Date(selectedYear, 11, 31));
                }

                const params = { startDate: start, endDate: end, period };
                const data = await dataService.getDashboardAnalytics(params);
                setAnalytics(data);
            } catch (err) {
                console.error("Error loading dashboard:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [dateRange, selectedYear, refetchTrigger]);

    const refresh = () => setRefetchTrigger(prev => prev + 1);

    if (loading && !analytics) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!analytics) return null;

    const { kpis, monthlyTrends, statusDistribution } = analytics;

    // --- Chart.js Configuration ---

    // 1. Bar Chart Data (Trends)
    // 1. Bar Chart Data (Trends)
    // STACKED Logic: Active + Cancelled = Total.
    const barChartData = {
        labels: monthlyTrends.map(item => {
            // Format: YYYY-MM -> "ENE 23"
            const [year, month] = item.label.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', '').toUpperCase();
        }),
        datasets: [
            {
                label: 'Activas',
                data: monthlyTrends.map(item => item.count - item.cancelled),
                backgroundColor: '#6366f1', // Indigo 500
                borderRadius: 4,
                barPercentage: 0.5,
                categoryPercentage: 0.8,
                stack: 'Stack 0',
            },
            {
                label: 'Canceladas',
                data: monthlyTrends.map(item => item.cancelled),
                backgroundColor: '#f43f5e', // Rose 500
                borderRadius: 4,
                barPercentage: 0.5,
                categoryPercentage: 0.8,
                stack: 'Stack 0',
            }
        ]
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { family: "'Inter', sans-serif", size: 12 }
                }
            },
            datalabels: {
                display: true,
                color: '#ffffff',
                font: { size: 10, weight: 'bold' },
                formatter: (value) => value > 0 ? value : '',
                anchor: 'center',
                align: 'center',
            },
            tooltip: {
                backgroundColor: '#fff',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                titleFont: { size: 13, weight: 'bold' },
                bodyFont: { size: 12 },
                displayColors: true,
                usePointStyle: true,
                callbacks: {
                    footer: (tooltipItems) => {
                        let total = 0;
                        tooltipItems.forEach(function (tooltipItem) {
                            total += tooltipItem.raw;
                        });
                        return 'Total: ' + total;
                    }
                }
            }
        },
        scales: {
            x: {
                stacked: true,
                grid: { display: false },
                ticks: {
                    font: { family: "'Inter', sans-serif", size: 11 },
                    color: '#64748b'
                },
                border: { display: false }
            },
            y: {
                stacked: true,
                display: false, // Hide Y axis for cleaner look
                grid: { display: false },
                beginAtZero: true
            }
        },
        layout: {
            padding: { top: 20 }
        }
    };

    const statusColors = {
        'Programado': '#a855f7', // Purple 500
        'Confirmado': '#10b981', // Emerald 500
        'Realizado': '#3b82f6',  // Blue 500
        'Cancelado': '#f43f5e',  // Rose 500
        // Fallbacks for compatibility
        'Completado': '#3b82f6',
        'Confirmada': '#10b981',
        'Atendida': '#3b82f6',
        'Cancelada': '#f43f5e',
        'Pendiente': '#f59e0b'
    };

    const doughnutData = {
        labels: statusDistribution.map(item => item.status),
        datasets: [
            {
                data: statusDistribution.map(item => item.count),
                backgroundColor: statusDistribution.map(item => statusColors[item.status] || '#94a3b8'),
                borderWidth: 0,
                hoverOffset: 4
            }
        ]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 11 }
                }
            },
            datalabels: {
                display: true, // Show values on segments
                color: '#ffffff',
                font: { size: 12, weight: 'bold' },
                formatter: (value) => value > 0 ? value : ''
            },
            tooltip: {
                backgroundColor: '#fff',
                bodyColor: '#1e293b',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: function (context) {
                        return ` ${context.label}: ${context.raw}`;
                    }
                }
            }
        }
    };

    // Plugin for drawing Totals on top of Stacked Bars
    const stackedBarTotalsPlugin = {
        id: 'stackedBarTotals',
        afterDatasetsDraw: (chart, args, options) => {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                // Only draw for the last visible dataset in the stack (which is conceptually on top)
                // But in stacked bar, we want the SUM.
                // Simpler: iterate columns (xs) and sum up the values, then draw at the top y.
            });

            // Better approach: Loop through the scales.x._gridLineItems (or labels)
            // But easier: The plugin 'datalabels' handles per-dataset.
            // For Stacked TOTALS:
            // traverse the x-axis positions.

            const meta = chart.getDatasetMeta(chart.data.datasets.length - 1); // Last dataset (Canceladas)
            // NOTE: If Canceladas is 0, the bar might be hidden, but we still want the total at the position of the stack top.

            ctx.font = 'bold 11px Inter';
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            chart.data.labels.forEach((label, index) => {
                let total = 0;
                let topY = chart.scales.y.bottom;

                // Calculate total and find highest Y point (min Y value)
                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const value = dataset.data[index] || 0;
                    total += value;

                    const meta = chart.getDatasetMeta(datasetIndex);
                    const bar = meta.data[index];
                    if (bar && !bar.hidden && value !== 0) {
                        // For stacked, the 'y' of the bar is the top of that segment?
                        // Actually, chart.js 'y' for bar element is usually the top (if positive).
                        if (bar.y < topY) topY = bar.y;
                    }
                });

                if (total > 0) {
                    // Add a small padding
                    ctx.fillText(total, meta.data[index].x, topY - 5);
                }
            });
        }
    };

    // Add plugin to options is not enough, must register locally or pass in plugins array to component
    // We will pass it in the <Bar plugins={[...]} /> prop.

    const handleCardClick = (reportType, filters = {}) => {
        // Helper to format date as YYYY-MM-DD using LOCAL time
        const formatDate = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        const now = new Date();
        let start = '';
        let end = '';

        if (dateRange === 'currentMonth') {
            start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
            end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        } else if (dateRange === 'last3Months') {
            start = formatDate(new Date(now.getFullYear(), now.getMonth() - 2, 1));
            end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        } else if (dateRange === 'year') {
            start = formatDate(new Date(selectedYear, 0, 1));
            end = formatDate(new Date(selectedYear, 11, 31));
        } else {
            // Default to a reasonable range if 'all' or undefined
            start = '2020-01-01';
            end = formatDate(new Date());
        }

        navigate('/relatorios', {
            state: {
                activeReport: reportType,
                filters: {
                    ...filters,
                    startDate: start,
                    endDate: end
                }
            }
        });
    };

    return (
        <div className="animate-fade-in pb-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                    <h2 className="section-title mb-1">Dashboard</h2>
                    <p className="text-slate-500 text-sm">Resumen general de citas y flujo de pacientes.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white border border-slate-200 rounded-lg flex items-center shadow-sm" style={{ padding: '12px' }}>
                        <Filter size={16} className="ml-2 text-slate-400" />
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none px-3 py-2 cursor-pointer min-w-[160px]"
                        >
                            <option value="currentMonth">Este Mes</option>
                            <option value="last3Months">Últimos 3 Meses</option>
                            <option value="year">Año</option>
                        </select>

                        {/* Specific Year Selector */}
                        {dateRange === 'year' && (
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="bg-slate-50 text-sm font-medium text-slate-700 outline-none px-3 py-2 cursor-pointer border-l border-slate-200 ml-1"
                            >
                                {[0, 1, 2, 3, 4].map(offset => {
                                    const y = new Date().getFullYear() - offset; // Current year back to 4 years ago
                                    return <option key={y} value={y}>{y}</option>;
                                })}
                            </select>
                        )}
                    </div>
                    <button
                        onClick={refresh}
                        className="btn-secondary p-3 flex items-center justify-center shadow-sm rounded-lg hover:bg-slate-100 transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12" style={{ padding: '15px' }}>
                <KPICard
                    title="Total Pacientes"
                    value={kpis.totalPatients}
                    icon={<Users size={24} />}
                    variant="blue"
                    onClick={() => handleCardClick('patients')}
                />
                <KPICard
                    title="Citas (Periodo)"
                    value={kpis.totalAppointments}
                    icon={<Calendar size={24} />}
                    variant="indigo"
                    onClick={() => handleCardClick('appointments')}
                />
                <KPICard
                    title="Realizadas"
                    value={kpis.attended}
                    icon={<CheckCircle size={24} />}
                    variant="emerald"
                    onClick={() => handleCardClick('appointments', { status: 'Realizado' })}
                />
                <KPICard
                    title="Canceladas"
                    value={kpis.cancelled}
                    icon={<XCircle size={24} />}
                    variant="rose"
                    onClick={() => handleCardClick('appointments', { status: 'Cancelado' })}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Trend Chart - CHART.JS */}
                <div className="card lg:col-span-2 shadow-sm border border-slate-100 p-8">
                    <div className="mb-6">
                        <h3 className="font-bold text-lg text-slate-800">Tendencia Mensual</h3>
                        <p className="text-sm text-slate-400 mt-1">Comparativa de citas por mes</p>
                    </div>

                    <div className="h-[350px] w-full relative">
                        {monthlyTrends && monthlyTrends.length > 0 ? (
                            <Bar data={barChartData} options={barChartOptions} plugins={[stackedBarTotalsPlugin]} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 absolute inset-0">
                                <Calendar size={32} className="mb-2 opacity-50" />
                                <span className="text-sm">Sin datos para este periodo</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Chart - CHART.JS */}
                <div className="card shadow-sm border border-slate-100 p-8">
                    <div className="mb-6">
                        <h3 className="font-bold text-lg text-slate-800">Distribución</h3>
                        <p className="text-sm text-slate-400 mt-1">Por estado de cita</p>
                    </div>

                    <div className="h-[350px] w-full relative flex items-center justify-center">
                        {statusDistribution && statusDistribution.length > 0 ? (
                            <>
                                <Doughnut data={doughnutData} options={doughnutOptions} />
                                {/* Center Text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                                    <span className="text-4xl font-bold text-slate-800 tracking-tight">{kpis.totalAppointments}</span>
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">TOTAL</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <span className="text-sm">Sin datos</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Polished KPI Card - Style inspired by Relatorios
const KPICard = ({ title, value, icon, variant, onClick }) => {
    const variants = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-50', gradient: 'from-blue-500 to-cyan-500' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-50', gradient: 'from-indigo-500 to-violet-500' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-50', gradient: 'from-emerald-500 to-teal-500' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-50', gradient: 'from-rose-500 to-pink-500' }
    };

    const style = variants[variant] || variants.blue;

    return (
        <div
            onClick={onClick}
            className={`group relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
        >
            {/* Gradient Background Decoration */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${style.gradient} opacity-[0.08] rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110`}></div>

            <div className="relative" style={{ padding: '15px' }}>
                <div className={`mb-4 inline-flex p-3 rounded-2xl ${style.bg} ${style.text} shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                    {icon}
                </div>

                <div className="flex flex-col">
                    <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">{value}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardAnalitico;
