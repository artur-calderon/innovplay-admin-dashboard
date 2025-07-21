"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, PieChart, Pie, Cell, Tooltip, Legend } from "recharts"

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
}

interface PieChartProps {
    data: Array<{
        name: string
        value: number
    }>
    title: string
    subtitle?: string
    colors?: string[]
}

const defaultColors = [
    "#ef4444", // red-500 - Abaixo do Básico
    "#f97316", // orange-500 - Básico
    "#22c55e", // green-500 - Adequado
    "#15803d", // green-700 - Avançado
]

export function BarChartComponent({
    data,
    title,
    subtitle,
    color = "#22c55e",
    yAxisDomain = [0, 10],
    yAxisLabel = "Valor"
}: BarChartProps) {
    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold">{title}</h3>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <XAxis
                        dataKey="name"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={yAxisDomain}
                        label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                    {label}
                                                </span>
                                                <span className="font-bold text-muted-foreground">
                                                    {typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : payload[0].value}
                                                </span>
                                            </div>
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
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

export function PieChartComponent({
    data,
    title,
    subtitle,
    colors = defaultColors
}: PieChartProps) {
    // Calcular total uma vez para usar no tooltip
    const total = data.reduce((sum: number, item: any) => sum + item.value, 0)

    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold">{title}</h3>
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
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const item = payload[0].payload
                                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'

                                return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                    {item.name}
                                                </span>
                                                <span className="font-bold text-muted-foreground">
                                                    {item.value} ({percentage}%)
                                                </span>
                                            </div>
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
                            <span className="text-sm">{value}</span>
                        )}
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
    colors = defaultColors
}: PieChartProps) {
    // Calcular total uma vez para usar no tooltip
    const total = data.reduce((sum: number, item: any) => sum + item.value, 0)

    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold">{title}</h3>
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
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const item = payload[0].payload
                                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'

                                return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                    {item.name}
                                                </span>
                                                <span className="font-bold text-muted-foreground">
                                                    {item.value} ({percentage}%)
                                                </span>
                                            </div>
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
                            <span>{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
} 