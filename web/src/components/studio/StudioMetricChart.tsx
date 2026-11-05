import React from 'react';
import type { HealthSample } from './dashboardMetrics';

type Series = 'cpu' | 'memory' | 'incoming' | 'outgoing';

export default function StudioMetricChart({ samples, fields, maximum, label }: Readonly<{
    samples: HealthSample[]
    fields: Series[]
    maximum: number
    label: string
}>) {
    const end = samples.at(-1)?.time || 0;
    const start = end - 300000;
    const height = 120;
    return (
        <div className='studioMetricChart'>
            <svg viewBox='0 0 600 130' preserveAspectRatio='none' role='img' aria-label={label}>
                {[0, 40, 80, 120].map(y => <line key={y} x1='0' x2='600' y1={y} y2={y} className='studioChartGrid' />)}
                {fields.map(field => {
                    const points = samples.filter(sample => sample[field] != null).map(sample => {
                        const x = (sample.time - start) / 300000 * 600;
                        const y = height - Math.min(1, Math.max(0, (sample[field] || 0) / Math.max(1, maximum))) * height;
                        return { x, y };
                    });
                    if (!points.length) return null;
                    const path = points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
                    return (
                        <g key={field} className={`studioChartSeries studioChartSeries-${field}`}>
                            {points.length > 1 && <>
                                <path d={`${path} L${points.at(-1)!.x},${height} L${points[0].x},${height} Z`} className='studioChartArea' />
                                <path d={path} className='studioChartLine' />
                            </>}
                            <circle cx={points.at(-1)!.x} cy={points.at(-1)!.y} r='2.5' />
                        </g>
                    );
                })}
            </svg>
            {!samples.length && <span className='studioChartEmpty'>Recopilando muestras…</span>}
        </div>
    );
}
