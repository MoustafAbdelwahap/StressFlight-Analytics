import React, { useMemo, useState, useEffect } from 'react';
import { HealthDataPoint, FlightEvent, ChartDataPoint, STRESS_THRESHOLD } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, TooltipProps, ReferenceArea, Label } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface DataVisualizationProps {
    healthData: HealthDataPoint[];
    flightEvents: FlightEvent[];
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
        const relevantPayload = payload.filter(p => p.value !== undefined && p.value !== null);
        if (relevantPayload.length === 0) return null;

        const stressPayload = relevantPayload.find(p => p.dataKey === 'stress');
        const isHighStress = stressPayload && stressPayload.value && (stressPayload.value as number) >= STRESS_THRESHOLD;

        return (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                <p className="label font-semibold text-slate-700 dark:text-slate-300">{`Time: ${label}`}</p>
                {relevantPayload.map((p, i) => (
                    <p key={i} style={{ color: p.color }} className="intro">{`${p.name}: ${p.value}`}</p>
                ))}
                {isHighStress && (
                    <p className="mt-2 text-sm font-bold text-red-500">High Stress Detected</p>
                )}
            </div>
        );
    }
    return null;
};

// Helper to format a timestamp (number) to a 'YYYY-MM-DDTHH:mm' string for datetime-local input
const formatTimestampForInput = (timestamp: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    // To display local time in the input, we need to adjust for the timezone offset.
    const timezoneOffset = date.getTimezoneOffset() * 60000; // in milliseconds
    const localISOTime = new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
    return localISOTime;
};

// Assigns colors to events for better visual distinction on the chart
const getEventColor = (eventName: string): string => {
    const lowerEvent = eventName.toLowerCase();
    
    // Journey framing events
    if (lowerEvent.includes('arrive at airport')) return '#0ea5e9'; // sky-500
    if (lowerEvent.includes('leave airport')) return '#64748b';    // slate-500
    
    // Transit events
    if (lowerEvent.includes('transit start')) return '#a855f7';   // purple-500
    if (lowerEvent.includes('transit end')) return '#d946ef';      // fuchsia-500

    // Leg 2 events (darker shades)
    if (lowerEvent.includes('leg 2')) {
        if (lowerEvent.includes('gate')) return '#0369a1';      // cyan-700
        if (lowerEvent.includes('boarding')) return '#c2410c';  // orange-700
        if (lowerEvent.includes('takeoff')) return '#b91c1c';   // red-700
        if (lowerEvent.includes('landing')) return '#15803d';   // green-700
        if (lowerEvent.includes('deplaning')) return '#4d7c0f'; // lime-700
    }

    // Default Leg 1 events
    if (lowerEvent.includes('gate')) return '#3b82f6';         // blue-500
    if (lowerEvent.includes('boarding')) return '#f97316';     // orange-500
    if (lowerEvent.includes('takeoff')) return '#ef4444';      // red-500
    if (lowerEvent.includes('landing')) return '#22c55e';      // green-500
    if (lowerEvent.includes('deplaning')) return '#84cc16';    // lime-500

    return '#9ca3af'; // gray-400 as a fallback
};


const DataVisualization: React.FC<DataVisualizationProps> = ({ healthData, flightEvents }) => {
    const [timeRange, setTimeRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

    const fullHealthDataTimeRange = useMemo(() => {
        if (healthData.length === 0) return { min: 0, max: 0 };
        const timestamps = healthData.map(d => d.timestamp);
        return { min: Math.min(...timestamps), max: Math.max(...timestamps) };
    }, [healthData]);

    useEffect(() => {
        // Set initial time range based on flight events, adding a 3-hour buffer
        if (flightEvents.length > 0) {
            const flightTimestamps = flightEvents.map(e => e.timestamp);
            const minTimestamp = Math.min(...flightTimestamps);
            const maxTimestamp = Math.max(...flightTimestamps);
            
            const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

            setTimeRange({
                start: minTimestamp - THREE_HOURS_MS,
                end: maxTimestamp + THREE_HOURS_MS
            });
        }
    }, [flightEvents]);

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (!value) return; // Prevent errors on empty input
        const newTimestamp = new Date(value).getTime();
        setTimeRange(prev => ({ ...prev, [name]: newTimestamp }));
    };

    const filteredHealthData = useMemo(() => {
        if (!timeRange.start || !timeRange.end) return healthData;
        return healthData.filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end);
    }, [healthData, timeRange]);

    const chartData = useMemo(() => {
        const dataMap = new Map<string, ChartDataPoint>();
        
        filteredHealthData.forEach(point => {
            const date = new Date(point.timestamp);
            const minuteKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()).toISOString();

            if (!dataMap.has(minuteKey)) {
                dataMap.set(minuteKey, { time: minuteKey });
            }

            const existingPoint = dataMap.get(minuteKey)!;
            if (point.type === 'stress') {
                existingPoint.stress = point.value;
            }
        });

        const sortedData = Array.from(dataMap.values()).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        return sortedData.map(d => ({
            ...d,
            time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

    }, [filteredHealthData]);
    
    const timeToLabel = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const eventTimestamps = useMemo(() => {
        if (chartData.length === 0 || !timeRange.start || !timeRange.end) return [];
        
        return flightEvents
          .filter(event => event.timestamp >= timeRange.start && event.timestamp <= timeRange.end)
          .map(event => ({
            ...event,
            timeLabel: timeToLabel(event.timestamp)
          }));
    }, [flightEvents, chartData, timeRange]);

    const referenceAreas = useMemo(() => {
        const areas: { x1: string; x2: string; label: string; fill: string }[] = [];
        const sortedEvents = [...flightEvents].sort((a, b) => a.timestamp - b.timestamp);

        let currentFlight: { start: number | null } = { start: null };
        let currentTransit: { start: number | null } = { start: null };
        let flightCount = 0;

        sortedEvents.forEach(event => {
            const lowerEvent = event.event.toLowerCase();
            if (lowerEvent.includes('takeoff') && currentFlight.start === null) {
                currentFlight.start = event.timestamp;
            } else if (lowerEvent.includes('landing') && currentFlight.start !== null) {
                flightCount++;
                areas.push({
                    x1: timeToLabel(currentFlight.start),
                    x2: timeToLabel(event.timestamp),
                    label: `In Flight ${flightCount}`,
                    fill: 'rgba(59, 130, 246, 0.15)', // blue-500 with opacity
                });
                currentFlight.start = null;
            } else if (lowerEvent.includes('transit start') && currentTransit.start === null) {
                currentTransit.start = event.timestamp;
            } else if (lowerEvent.includes('transit end') && currentTransit.start !== null) {
                 areas.push({
                    x1: timeToLabel(currentTransit.start),
                    x2: timeToLabel(event.timestamp),
                    label: 'Transit',
                    fill: 'rgba(249, 115, 22, 0.15)', // orange-500 with opacity
                });
                currentTransit.start = null;
            }
        });
        
        return areas.filter(area => {
            const startEvent = flightEvents.find(e => timeToLabel(e.timestamp) === area.x1);
            const endEvent = flightEvents.find(e => timeToLabel(e.timestamp) === area.x2);
            if (!startEvent || !endEvent) return false;
            return startEvent.timestamp >= timeRange.start && endEvent.timestamp <= timeRange.end;
        });

    }, [flightEvents, timeRange]);


    return (
        <div className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="w-full sm:w-auto">
                    <label htmlFor="start-time" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                    <input
                        type="datetime-local"
                        id="start-time"
                        name="start"
                        value={formatTimestampForInput(timeRange.start)}
                        min={formatTimestampForInput(fullHealthDataTimeRange.min)}
                        max={formatTimestampForInput(timeRange.end)}
                        onChange={handleTimeChange}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    />
                </div>
                <div className="w-full sm:w-auto">
                    <label htmlFor="end-time" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                    <input
                        type="datetime-local"
                        id="end-time"
                        name="end"
                        value={formatTimestampForInput(timeRange.end)}
                        min={formatTimestampForInput(timeRange.start)}
                        max={formatTimestampForInput(fullHealthDataTimeRange.max)}
                        onChange={handleTimeChange}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    />
                </div>
            </div>

            <div className="w-full h-[500px]">
                 <h3 className="text-lg font-bold mb-4 text-center text-slate-800 dark:text-slate-100">Stress Level Timeline</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 40, right: 30, left: 10, bottom: 40 }}>
                         <defs>
                            <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="time" angle={-45} textAnchor="end" height={60} tick={{ fill: 'currentColor' }} className="text-xs" />
                        <YAxis stroke="#06b6d4" domain={[0, 100]} label={{ value: 'Stress Level', angle: -90, position: 'insideLeft', fill: 'currentColor' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" height={36} />

                        {referenceAreas.map((area, index) => (
                            <ReferenceArea
                                key={`area-${index}`}
                                x1={area.x1}
                                x2={area.x2}
                                stroke="none"
                                fill={area.fill}
                                ifOverflow="visible"
                            >
                                <Label value={area.label} position="insideTop" fill="#666" fontSize={14} dy={5} />
                            </ReferenceArea>
                        ))}

                        <ReferenceArea
                            y1={STRESS_THRESHOLD}
                            y2={100}
                            label={{ value: "High Stress Zone", position: "insideTopRight", fill: "#ef4444", fontSize: 12, dy: 5, dx: -10 }}
                            fill="rgba(239, 68, 68, 0.1)"
                            stroke="none"
                            ifOverflow="visible"
                        />
                        
                        <Area type="monotone" dataKey="stress" name="Stress" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#stressGradient)" dot={false} connectNulls />

                        {eventTimestamps.map((event, index) => {
                            const color = getEventColor(event.event);
                            const cleanEventName = event.event.replace(/ \(Leg \d+\)/, '');
                            return (
                                <ReferenceLine 
                                  key={`stress-${index}`} 
                                  x={event.timeLabel} 
                                  stroke={color}
                                  strokeWidth={2}
                                  strokeDasharray="4 4"
                                  label={{ value: cleanEventName, position: 'insideTop', fill: color, fontSize: 12, dy: -10, angle: -45 }}
                                />
                            );
                        })}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DataVisualization;