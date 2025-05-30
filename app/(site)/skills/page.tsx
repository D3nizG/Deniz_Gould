'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import data from '@/public/resume.json';

export default function SkillsPage() {
const svgRef = useRef<SVGSVGElement | null>(null);

useEffect(() => {
if (!svgRef.current) return;
const svg = d3.select(svgRef.current);
const width = 320;
const radius = width / 2;
const skills = data.skills.languages.concat(data.skills.frameworks_tools);
const pie = d3.pie<string>().value(() => 1)(skills);
const arc = d3.arc<d3.PieArcDatum<string>>().innerRadius(radius * 0.6).outerRadius(radius);

svg.attr('viewBox', `0 0 ${width} ${width}`);

const g = svg
  .append('g')
  .attr('transform', `translate(${radius},${radius})`)
  .selectAll('path')
  .data(pie)
  .enter()
  .append('path')
  .attr('d', arc as any)
  .attr('fill', (_, i) => (i % 2 ? '#64FFDA' : '#FFB86B'))
  .attr('opacity', 0.8);
return () => {
  g.remove();
};

}, []);

return (
<section className="flex flex-col items-center py-16 gap-6">
<h1 className="text-3xl font-bold">Skills</h1>
<svg ref={svgRef} width={320} height={320} className="max-w-full" aria-label="Skill distribution chart" />
</section>
);
}