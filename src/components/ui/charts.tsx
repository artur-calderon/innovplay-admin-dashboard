"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, PieChart, Pie, Cell, Tooltip, Legend, LabelList } from "recharts"

interface BarChartProps {
    data: Array<{
        name: string
        value: number
    }>
    title: string
    subtitle?: string
    color?: string
    yAxisDomain?: [number, number]
    yAxisLabel?: string
    showValues?: boolean // Nova prop para controlar exibição dos valores
}

interface PieChartProps {
    data: Array<{
        name: string
        value: number
    }>
    title: string
    subtitle?: string
    colors?: string[]
    showValues?: boolean // Nova prop para controlar exibição dos valores
}

const defaultColors = [
    "#ef4444", // red-500 - Abaixo do Básico
    "#fbbf24", // yellow-400 - Básico (amarelo mais claro)
    "#4ade80", // green-400 - Adequado (verde claro)
    "#16a34a", // green-600 - Avançado (verde escuro)
]

// Componente para renderizar valores nas barras
const renderCustomBarLabel = (props: { x: number; y: number; width: number; height: number; value: number }) => {
    const { x, y, width, height, value } = props;
    if (value === 0) return null; // Não mostrar 0
    
    // Detectar modo escuro
    const isDarkMode = document.documentElement.classList.contains('dark');
    const fillColor = isDarkMode ? 'hsl(var(--foreground))' : '#374151';
    
    return (
        <text
            x={x + width / 2}
            y={y - 5}
            textAnchor="middle"
            fill={fillColor}
            fontSize={12}
            fontWeight={500}
        >
            {typeof value === 'number' ? value.toFixed(1) : value}
        </text>
    );
};

export function BarChartComponent({
    data,
    title,
    subtitle,
    color = "#22c55e",
    yAxisDomain = [0, 10],
    yAxisLabel = "Valor",
    showValues = true // Valor padrão true
}: BarChartProps) {
    // Detectar modo escuro para ajustar cores
    const isDarkMode = document.documentElement.classList.contains('dark');
    const axisColor = isDarkMode ? 'hsl(var(--muted-foreground))' : '#888888';
    const gridColor = isDarkMode ? 'hsl(var(--border))' : '#e5e7eb';
    
    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="name"
                        stroke={axisColor}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: isDarkMode ? 'hsl(var(--foreground))' : '#374151' }}
                    />
                    <YAxis
                        stroke={axisColor}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={yAxisDomain}
                        label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: isDarkMode ? 'hsl(var(--foreground))' : '#374151' }}
                        tick={{ fill: isDarkMode ? 'hsl(var(--foreground))' : '#374151' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: isDarkMode ? 'hsl(var(--card))' : 'hsl(var(--card))',
                            border: `1px solid ${isDarkMode ? 'hsl(var(--border))' : 'hsl(var(--border))'}`,
                            borderRadius: '0.5rem',
                            boxShadow: isDarkMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                        }}
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="rounded-lg border bg-card p-3 shadow-lg border-border">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-medium uppercase text-muted-foreground">
                                                {label}
                                            </span>
                                            <span className="text-lg font-bold text-foreground">
                                                {typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : payload[0].value}
                                            </span>
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        }}
                    />
                    <Bar
                        dataKey="value"
                        fill={color}
                        radius={[4, 4, 0, 0]}
                        style={{
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            if (e.currentTarget) {
                                e.currentTarget.style.opacity = '0.8';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (e.currentTarget) {
                                e.currentTarget.style.opacity = '1';
                            }
                        }}
                    >
                        {showValues && <LabelList content={renderCustomBarLabel} />}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

// Componente para renderizar valores nos gráficos de pizza/donut
const renderCustomPieLabel = (entry: { name: string; value: number }) => {
    if (entry.value === 0) return null; // Não mostrar 0
    return `${entry.value}`;
};

export function PieChartComponent({
    data,
    title,
    subtitle,
    colors = defaultColors,
    showValues = true // Valor padrão true
}: PieChartProps) {
    // Calcular total uma vez para usar no tooltip
    const total = data.reduce((sum: number, item: { value: number }) => sum + item.value, 0)
    
    // Detectar modo escuro
    const isDarkMode = document.documentElement.classList.contains('dark');

    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={showValues ? renderCustomPieLabel : false}
                        labelLine={false}
                    >
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={colors[index % colors.length]}
                                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                                onMouseEnter={(e) => {
                                    if (e.currentTarget) {
                                        e.currentTarget.style.opacity = '0.8';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (e.currentTarget) {
                                        e.currentTarget.style.opacity = '1';
                                    }
                                }}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: isDarkMode ? 'hsl(var(--card))' : 'hsl(var(--card))',
                            border: `1px solid ${isDarkMode ? 'hsl(var(--border))' : 'hsl(var(--border))'}`,
                            borderRadius: '0.5rem',
                            boxShadow: isDarkMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                        }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const item = payload[0].payload
                                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'

                                return (
                                    <div className="rounded-lg border bg-card p-3 shadow-lg border-border">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-medium uppercase text-muted-foreground">
                                                {item.name}
                                            </span>
                                            <span className="text-lg font-bold text-foreground">
                                                {item.value} ({percentage}%)
                                            </span>
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, entry, index) => (
                            <span className="text-sm text-foreground">{value}</span>
                        )}
                        wrapperStyle={{
                            color: isDarkMode ? 'hsl(var(--foreground))' : '#374151',
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}

export function DonutChartComponent({
    data,
    title,
    subtitle,
    colors = defaultColors,
    showValues = true // Valor padrão true
}: PieChartProps) {
    // Calcular total uma vez para usar no tooltip
    const total = data.reduce((sum: number, item: { value: number }) => sum + item.value, 0)
    
    // Detectar modo escuro
    const isDarkMode = document.documentElement.classList.contains('dark');

    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={showValues ? renderCustomPieLabel : false}
                        labelLine={false}
                    >
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={colors[index % colors.length]}
                                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                                onMouseEnter={(e) => {
                                    if (e.currentTarget) {
                                        e.currentTarget.style.opacity = '0.8';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (e.currentTarget) {
                                        e.currentTarget.style.opacity = '1';
                                    }
                                }}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: isDarkMode ? 'hsl(var(--card))' : 'hsl(var(--card))',
                            border: `1px solid ${isDarkMode ? 'hsl(var(--border))' : 'hsl(var(--border))'}`,
                            borderRadius: '0.5rem',
                            boxShadow: isDarkMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                        }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const item = payload[0].payload
                                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'

                                return (
                                    <div className="rounded-lg border bg-card p-3 shadow-lg border-border">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-medium uppercase text-muted-foreground">
                                                {item.name}
                                            </span>
                                            <span className="text-lg font-bold text-foreground">
                                                {item.value} ({percentage}%)
                                            </span>
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    {data.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: colors[index % colors.length] }}
                            />
                            <span className="text-foreground">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
} 