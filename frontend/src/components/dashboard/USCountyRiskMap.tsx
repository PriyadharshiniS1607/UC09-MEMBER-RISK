import React, { useMemo, useState, useRef } from 'react';
import * as topojson from 'topojson-client';
import { geoPath } from 'd3-geo';
import usAtlas from 'us-atlas/counties-albers-10m.json';
import { Member } from '../../types';
import { MapPin, ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';

interface USCountyRiskMapProps {
  members: Member[];
  onSelectCounty?: (countyFips: string) => void;
}

export interface CountyAggregatedRisk {
  fips: string;
  countyName: string;
  memberCount: number;
  avgRiskScore: number;
  veryHighCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  memberIds: string[];
}

export const USCountyRiskMap: React.FC<USCountyRiskMapProps> = ({ members, onSelectCounty }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCounty, setHoveredCounty] = useState<{
    data: CountyAggregatedRisk | null;
    fips: string;
    countyName: string;
    x: number;
    y: number;
  } | null>(null);

  const [selectedFips, setSelectedFips] = useState<string | null>(null);

  // Zoom / Pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // 1. Precompute county aggregations from real members
  const countyDataMap = useMemo(() => {
    const map = new Map<string, CountyAggregatedRisk>();

    members.forEach((m) => {
      const rawFips = m.countyFips || m.rawBackendData?.county_fips || '';
      if (!rawFips) return;
      const fips = String(rawFips).trim().padStart(5, '0');
      const score = Number(m.riskSummary?.overallRiskScore ?? m.rawBackendData?.risk_score ?? 0);
      const level = m.riskSummary?.riskLevel || (score >= 75 ? 'Very High' : score >= 55 ? 'High' : score >= 30 ? 'Medium' : 'Low');

      const existing = map.get(fips);
      if (existing) {
        existing.memberCount += 1;
        existing.avgRiskScore = (existing.avgRiskScore * (existing.memberCount - 1) + score) / existing.memberCount;
        existing.memberIds.push(m.id);
        if (level === 'Very High' || score >= 75) existing.veryHighCount += 1;
        else if (level === 'High' || score >= 55) existing.highCount += 1;
        else if (level === 'Medium' || score >= 30) existing.mediumCount += 1;
        else existing.lowCount += 1;
      } else {
        map.set(fips, {
          fips,
          countyName: m.sdohData?.countyName ? `${m.sdohData.countyName}, ${m.sdohData.state || ''}` : `County ${fips}`,
          memberCount: 1,
          avgRiskScore: score,
          veryHighCount: (level === 'Very High' || score >= 75) ? 1 : 0,
          highCount: (level === 'High' || (score >= 55 && score < 75)) ? 1 : 0,
          mediumCount: (level === 'Medium' || (score >= 30 && score < 55)) ? 1 : 0,
          lowCount: (level === 'Low' || score < 30) ? 1 : 0,
          memberIds: [m.id],
        });
      }
    });

    return map;
  }, [members]);

  // 2. Prepare TopoJSON Geometries
  const { countyFeatures, stateMeshPath, nationMeshPath, pathGenerator } = useMemo(() => {
    const path = geoPath(null); // null projection for pre-projected Albers 960x600
    const rawCounties = (topojson.feature(usAtlas as any, (usAtlas as any).objects.counties) as any).features;
    const states = topojson.mesh(usAtlas as any, (usAtlas as any).objects.states, (a: any, b: any) => a !== b);
    const nation = topojson.mesh(usAtlas as any, (usAtlas as any).objects.nation);

    return {
      countyFeatures: rawCounties,
      stateMeshPath: path(states) || '',
      nationMeshPath: path(nation) || '',
      pathGenerator: path,
    };
  }, []);

  // Helper to determine fill color based on aggregated average risk score
  const getCountyFill = (fips: string, isHovered: boolean, isSelected: boolean) => {
    const data = countyDataMap.get(fips);
    if (!data) {
      return isHovered ? '#334155' : '#1e293b'; // Unrepresented county (slate-800)
    }

    const score = data.avgRiskScore;
    if (score >= 75) {
      return isSelected ? '#c084fc' : isHovered ? '#a855f7' : '#9333ea'; // Very High - Purple
    } else if (score >= 55) {
      return isSelected ? '#fb7185' : isHovered ? '#f43f5e' : '#e11d48'; // High - Rose
    } else if (score >= 30) {
      return isSelected ? '#fcd34d' : isHovered ? '#f59e0b' : '#d97706'; // Medium - Amber
    } else {
      return isSelected ? '#6ee7b7' : isHovered ? '#10b981' : '#059669'; // Low - Emerald
    }
  };

  const handleMouseMove = (e: React.MouseEvent, feature: any) => {
    const fips = String(feature.id).padStart(5, '0');
    const data = countyDataMap.get(fips);
    const name = feature.properties?.name ? `${feature.properties.name} (${fips})` : `FIPS ${fips}`;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setHoveredCounty({
        data: data || null,
        fips,
        countyName: data?.countyName || name,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCounty(null);
  };

  const handleCountyClick = (fips: string) => {
    setSelectedFips(fips === selectedFips ? null : fips);
    if (onSelectCounty) {
      onSelectCounty(fips);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((z) => Math.min(z * 1.3, 5));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z / 1.3, 0.8));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedFips(null);
  };

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const representedCountiesCount = countyDataMap.size;
  const activeSelectedData = selectedFips ? countyDataMap.get(selectedFips) : null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 lg:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
      {/* Header with Title & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-400" />
              <span>US County Risk Intelligence Map</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] font-mono font-bold">
              {representedCountiesCount} Active Counties
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Geographic distribution of cohort risk aggregated by 5-digit county FIPS codes.
          </p>
        </div>

        {/* Zoom & Reset Toolbar */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[960/540] my-2 select-none overflow-hidden rounded-xl bg-slate-950/70 border border-slate-800/60 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={() => {
          handlePanEnd();
          handleMouseLeave();
        }}
      >
        <svg
          viewBox="0 0 960 600"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <g
            transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}
            style={{ transformOrigin: '480px 300px', transition: isPanning ? 'none' : 'transform 0.15s ease-out' }}
          >
            {/* County Paths */}
            <g className="counties">
              {countyFeatures.map((f: any) => {
                const fips = String(f.id).padStart(5, '0');
                const hasData = countyDataMap.has(fips);
                const isHovered = hoveredCounty?.fips === fips;
                const isSelected = selectedFips === fips;
                const d = pathGenerator(f);

                if (!d) return null;

                return (
                  <path
                    key={fips}
                    d={d}
                    fill={getCountyFill(fips, isHovered, isSelected)}
                    stroke={
                      isSelected
                        ? '#2dd4bf'
                        : isHovered && hasData
                        ? '#2dd4bf'
                        : hasData
                        ? 'rgba(255, 255, 255, 0.4)'
                        : '#0f172a'
                    }
                    strokeWidth={isSelected ? 2 : isHovered && hasData ? 1.5 : hasData ? 0.75 : 0.25}
                    className={`transition-colors duration-100 ${
                      hasData ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    onMouseMove={(e) => handleMouseMove(e, f)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasData) handleCountyClick(fips);
                    }}
                  />
                );
              })}
            </g>

            {/* State Boundaries Mesh Overlay */}
            {stateMeshPath && (
              <path
                d={stateMeshPath}
                fill="none"
                stroke="#475569"
                strokeWidth={0.8}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            )}

            {/* National Outer Border */}
            {nationMeshPath && (
              <path
                d={nationMeshPath}
                fill="none"
                stroke="#64748b"
                strokeWidth={1.2}
                pointerEvents="none"
              />
            )}
          </g>
        </svg>

        {/* Floating Tooltip */}
        {hoveredCounty && (
          <div
            className="absolute pointer-events-none z-30 transition-transform duration-75"
            style={{
              left: Math.min(Math.max(hoveredCounty.x + 12, 10), (containerRef.current?.clientWidth || 600) - 240),
              top: Math.min(Math.max(hoveredCounty.y - 40, 10), (containerRef.current?.clientHeight || 400) - 180),
            }}
          >
            <div className="bg-slate-900/95 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md w-56 text-xs text-white space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="truncate font-bold text-teal-300">
                  {hoveredCounty.countyName}
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  FIPS: {hoveredCounty.fips}
                </span>
              </div>

              {hoveredCounty.data ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Cohort Members:</span>
                    <span className="font-mono font-bold text-white">
                      {hoveredCounty.data.memberCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Avg Risk Score:</span>
                    <span className="font-mono font-bold text-teal-300">
                      {hoveredCounty.data.avgRiskScore.toFixed(1)} / 100
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[10px]">
                    <div className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                      Risk Tier Breakdown:
                    </div>
                    <div className="grid grid-cols-2 gap-1 font-mono">
                      <span className="text-purple-400">
                        V.High: {hoveredCounty.data.veryHighCount}
                      </span>
                      <span className="text-rose-400">
                        High: {hoveredCounty.data.highCount}
                      </span>
                      <span className="text-amber-400">
                        Med: {hoveredCounty.data.mediumCount}
                      </span>
                      <span className="text-emerald-400">
                        Low: {hoveredCounty.data.lowCount}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  No cohort members in this county.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Selected County Active Badge overlay */}
        {activeSelectedData && (
          <div className="absolute top-3 left-3 z-20 bg-slate-900/90 border border-teal-500/40 rounded-xl p-2.5 shadow-xl backdrop-blur-md text-xs text-white max-w-xs space-y-1 animate-in fade-in">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-teal-300 truncate">
                {activeSelectedData.countyName}
              </span>
              <button
                onClick={() => setSelectedFips(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                &times;
              </button>
            </div>
            <div className="text-[11px] text-slate-300">
              Avg Risk: <strong className="text-white">{activeSelectedData.avgRiskScore.toFixed(1)}</strong> ({activeSelectedData.memberCount} member{activeSelectedData.memberCount > 1 ? 's' : ''})
            </div>
          </div>
        )}
      </div>

      {/* Footer Legend & Cohort Aggregation Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
        {/* Risk Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Risk Tier Legend:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
            <span className="text-[11px] text-slate-300">Very High (&ge;75)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span className="text-[11px] text-slate-300">High (55-74)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-[11px] text-slate-300">Medium (30-54)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-[11px] text-slate-300">Low (&lt;30)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600" />
            <span className="text-[11px] text-slate-500">Unrepresented</span>
          </div>
        </div>

        {/* Mandated Note */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400 italic">
          <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>County values represent aggregated member risk within the current cohort.</span>
        </div>
      </div>
    </div>
  );
};
