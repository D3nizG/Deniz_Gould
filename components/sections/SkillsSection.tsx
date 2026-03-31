// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import data from '@/public/resume.json';
import { fadeSlideUp } from '@/lib/motion.client';

interface SkillCategory {
  name: string;
  icon: string;
  color: string;
  items: Array<{
    name: string;
    level: number;
    years: string;
  }>;
}

interface HoveredSlice {
  category: SkillCategory;
  position: { x: number; y: number };
  side: 'left' | 'right';
}

export default function SkillsSection() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<HoveredSlice | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<HoveredSlice | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getThemeColors = (originalColor: string) => {
    if (originalColor === '#FFB86B') {
      return {
        legendText: 'rgb(var(--accent-secondary))',
        cardTitle: 'rgb(var(--accent-secondary))',
      };
    }
    return {
      legendText: 'rgb(var(--accent-primary))',
      cardTitle: 'rgb(var(--accent-primary))',
    };
  };

  const getCardBackground = (category: SkillCategory) => {
    if (category.color === '#FFB86B') {
      return 'bg-accent-secondary/5 border border-accent-secondary/20';
    }
    return 'bg-accent-primary/5 border border-accent-primary/20';
  };

  const getLegendBackground = (category: SkillCategory) => {
    if (category.color === '#FFB86B') {
      return 'bg-accent-secondary/5 hover:bg-accent-secondary/10 border border-accent-secondary/20';
    }
    return 'bg-accent-primary/5 hover:bg-accent-primary/10 border border-accent-primary/20';
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    svg.selectAll('*').remove();

    const width = Math.min(containerRect.width, 400);
    const height = width;
    const radius = width / 2 - 40;
    const innerRadius = radius * 0.5;

    const skillCategories: SkillCategory[] = data.skills.categories;

    const pie = d3
      .pie<SkillCategory>()
      .value(() => 1)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<SkillCategory>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    const hoverArc = d3
      .arc<d3.PieArcDatum<SkillCategory>>()
      .innerRadius(innerRadius)
      .outerRadius(radius + 8);

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    const slices = g
      .selectAll('.slice')
      .data(pie(skillCategories))
      .enter()
      .append('g')
      .attr('class', 'slice')
      .style('cursor', 'pointer');

    slices
      .append('path')
      .attr('d', arc as any)
      .style('fill', (d) => d.data.color)
      .style('opacity', 0.8)
      .style('stroke', '#fff')
      .style('stroke-width', 2)
      .style('transition', 'all 0.3s ease')
      .on('mouseenter', function (_event, d) {
        if (isMobile) return;

        d3.select(this).transition().duration(200).attr('d', hoverArc as any).style('opacity', 1);

        const centroid = arc.centroid(d);
        const [x, y] = centroid;
        const side = x >= 0 ? 'right' : 'left';

        setHoveredSlice({
          category: d.data,
          position: {
            x: x + width / 2,
            y: y + height / 2,
          },
          side,
        });
      })
      .on('mouseleave', function () {
        if (isMobile) return;

        d3.select(this).transition().duration(200).attr('d', arc as any).style('opacity', 0.8);
        setHoveredSlice(null);
      })
      .on('click', function (_event, d) {
        if (!isMobile) return;

        const centroid = arc.centroid(d);
        const [x, y] = centroid;
        const side = x >= 0 ? 'right' : 'left';

        const newSelection = {
          category: d.data,
          position: {
            x: x + width / 2,
            y: y + height / 2,
          },
          side,
        };

        setSelectedSlice(selectedSlice?.category.name === d.data.name ? null : newSelection);
      });

    slices
      .append('text')
      .attr('transform', (d) => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('fill', '#fff')
      .style('font-size', '24px')
      .style('pointer-events', 'none')
      .text((d) => d.data.icon);

    return () => {
      svg.selectAll('*').remove();
    };
  }, [isMobile, selectedSlice]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSelectedSlice(null);
        setHoveredSlice(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeSlice = isMobile ? selectedSlice : hoveredSlice;

  const getCardStyle = (slice: HoveredSlice) => {
    const cardWidth = 280;
    const cardHeight = 200;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { left: 0, top: 0 };

    const padding = 20;

    const svgRect = svgRef.current?.getBoundingClientRect();
    const svgOffsetLeft = svgRect ? svgRect.left - containerRect.left : 0;
    const svgOffsetTop = svgRect ? svgRect.top - containerRect.top : 0;

    const baseLeft = svgOffsetLeft + slice.position.x;
    const baseTop = svgOffsetTop + slice.position.y - cardHeight / 2;

    const svgHeight = svgRef.current?.getBoundingClientRect().height ?? 0;
    const isTopOrBottom =
      svgHeight > 0 &&
      (slice.position.y < svgHeight * 0.3 || slice.position.y > svgHeight * 0.7);
    const offsetX = 78 + (isTopOrBottom ? 50 : 10);
    let left = baseLeft + (slice.side === 'right' ? offsetX : -cardWidth - offsetX);
    let top = baseTop;

    left = Math.max(padding, Math.min(left, containerRect.width - cardWidth - padding));
    top = Math.max(padding, Math.min(top, containerRect.height - cardHeight - padding));

    return { left, top };
  };

  return (
    <section id="skills" className="max-w-5xl mx-auto px-4 py-16 min-h-screen scroll-mt-24">
      <motion.h1
        className="text-3xl font-bold mb-8 text-center"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
      >
        Skills
      </motion.h1>

      <div ref={containerRef} className="relative max-w-5xl mx-auto">
        <div className="flex flex-col items-center gap-8">
          <motion.div
            className="flex-1 flex justify-center w-full"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
          >
            <svg ref={svgRef} className="w-full max-w-[400px] h-auto"></svg>
          </motion.div>

          <motion.div
            className="w-full max-w-3xl space-y-4"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-2">Skill Categories</h2>
            <div className="grid grid-cols-2 gap-3">
              {data.skills.categories.map((category) => {
                const themeColors = getThemeColors(category.color);
                return (
                  <div
                    key={category.name}
                    className={`p-4 rounded-lg transition-colors ${getLegendBackground(category)}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <h3 className="font-semibold" style={{ color: themeColors.legendText }}>
                          {category.name}
                        </h3>
                        <p className="text-sm text-fg/60">
                          {category.items.length} skills
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {activeSlice && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`absolute z-20 w-[280px] p-4 rounded-lg shadow-lg ${getCardBackground(
                activeSlice.category
              )}`}
              style={getCardStyle(activeSlice)}
            >
              <h3
                className="font-semibold mb-3"
                style={{ color: getThemeColors(activeSlice.category.color).cardTitle }}
              >
                {activeSlice.category.name}
              </h3>
              <div className="space-y-2">
                {activeSlice.category.items.map((item) => (
                  <div key={item.name} className="flex justify-between items-center text-sm">
                    <span>{item.name}</span>
                    <span className="text-fg/60 font-mono text-xs">{item.years}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
