'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import data from '@/public/resume.json';

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

export default function SkillsPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<HoveredSlice | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<HoveredSlice | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get theme-appropriate colors
  const getThemeColors = (originalColor: string) => {
    // Use CSS custom properties for automatic theme adaptation
    if (originalColor === '#FFB86B') {
      return {
        legendText: 'rgb(var(--accent-secondary))',
        cardTitle: 'rgb(var(--accent-secondary))',
      };
    } else {
      return {
        legendText: 'rgb(var(--accent-primary))',
        cardTitle: 'rgb(var(--accent-primary))',
      };
    }
  };

  // Get card background with education page styling
  const getCardBackground = (category: SkillCategory) => {
    // Use the same styling as education page cards
    if (category.color === '#FFB86B') {
      return 'bg-accent-secondary/5 border border-accent-secondary/20';
    } else {
      return 'bg-accent-primary/5 border border-accent-primary/20';
    }
  };

  // Get legend card background with education page styling
  const getLegendBackground = (category: SkillCategory) => {
    if (category.color === '#FFB86B') {
      return 'bg-accent-secondary/5 hover:bg-accent-secondary/10 border border-accent-secondary/20';
    } else {
      return 'bg-accent-primary/5 hover:bg-accent-primary/10 border border-accent-primary/20';
    }
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Clear previous content
    svg.selectAll('*').remove();
    
    const width = Math.min(containerRect.width, 400);
    const height = width;
    const radius = width / 2 - 40;
    const innerRadius = radius * 0.5;
    
    const skillCategories: SkillCategory[] = data.skills.categories;
    
    // Create pie layout
    const pie = d3.pie<SkillCategory>()
      .value(() => 1) // Equal slices
      .sort(null);
    
    const arc = d3.arc<d3.PieArcDatum<SkillCategory>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);
    
    const hoverArc = d3.arc<d3.PieArcDatum<SkillCategory>>()
      .innerRadius(innerRadius)
      .outerRadius(radius + 8);

    // Set up SVG
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create slices
    const slices = g
      .selectAll('.slice')
      .data(pie(skillCategories))
      .enter()
      .append('g')
      .attr('class', 'slice')
      .style('cursor', 'pointer');

    // Add slice paths
    slices
      .append('path')
      .attr('d', arc as any)
      .style('fill', (d) => d.data.color)
      .style('opacity', 0.8)
      .style('stroke', '#fff')
      .style('stroke-width', 2)
      .style('transition', 'all 0.3s ease')
      .on('mouseenter', function (event, d) {
        if (isMobile) return;
        
        // Grow slice on hover
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', hoverArc as any)
          .style('opacity', 1);
        
        // Calculate position for card
        const centroid = arc.centroid(d);
        const [x, y] = centroid;
        
        // Determine which side of the circle we're on - simple x-coordinate check
        const side = x >= 0 ? 'right' : 'left';
        
        setHoveredSlice({
          category: d.data,
          position: { 
            x: x + width / 2, 
            y: y + height / 2 
          },
          side
        });
      })
      .on('mouseleave', function (event, d) {
        if (isMobile) return;
        
        // Shrink slice back
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc as any)
          .style('opacity', 0.8);
        
        setHoveredSlice(null);
      })
      .on('click', function (event, d) {
        if (!isMobile) return;
        
        // For mobile, toggle selection
        const centroid = arc.centroid(d);
        const [x, y] = centroid;
        const side = x >= 0 ? 'right' : 'left';
        
        const newSelection = {
          category: d.data,
          position: { 
            x: x + width / 2, 
            y: y + height / 2 
          },
          side
        };
        
        setSelectedSlice(
          selectedSlice?.category.name === d.data.name 
            ? null 
            : newSelection
        );
      });

    // Add category labels
    slices
      .append('text')
      .attr('transform', (d) => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('fill', '#fff')
      .style('font-size', '24px')
      .style('pointer-events', 'none')
      .text((d) => d.data.icon);

    // Cleanup function
    return () => {
      svg.selectAll('*').remove();
    };
  }, [isMobile, selectedSlice]);

  // Close cards when clicking outside
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

  // Calculate card position based on side with proper bounds checking
  const getCardStyle = (slice: HoveredSlice) => {
    const cardWidth = 280;
    const cardHeight = 200;
    
    // Get container dimensions
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { left: 0, top: 0 };
    
    // Container is 1040px wide with 40px padding (20px each side)
    const containerWidth = 1040;
    const padding = 20;
    const usableWidth = containerWidth - (padding * 2);
    const containerCenterX = containerWidth / 2;
    
    let left: number;
    let top: number;
    
    if (slice.side === 'right') {
      // Position cards on right side, keeping within bounds
      left = containerCenterX + 180;
      // Ensure card doesn't exceed right boundary
      left = Math.min(left, containerWidth - cardWidth - padding);
    } else {
      // Position cards on left side, keeping within bounds  
      left = containerCenterX - cardWidth - 180;
      // Ensure card doesn't exceed left boundary
      left = Math.max(left, padding);
    }
    
    // Improved vertical positioning - distribute cards evenly within container bounds
    const containerHeight = 500; // min-h-[500px]
    const containerTop = 40; // account for padding
    const containerBottom = containerHeight - 40; // account for padding
    const usableHeight = containerBottom - containerTop;
    
    // Center vertically around slice position but keep within bounds
    top = slice.position.y - cardHeight / 2 - 35; // Move up 35px
    
    // Ensure card stays within vertical bounds
    const minTop = containerTop;
    const maxTop = containerBottom - cardHeight;
    top = Math.max(minTop, Math.min(top, maxTop));
    
    return {
      left,
      top,
    };
  };

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <motion.h1 
        className="text-3xl font-bold mb-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Skills & Expertise
      </motion.h1>
      
      <div 
        ref={containerRef}
        className="relative flex justify-center items-center min-h-[500px] px-5 bg-accent-primary/5 border border-accent-primary/20 rounded-lg mx-auto"
        style={{ width: '1040px', overflow: 'visible' }}
      >
        <svg 
          ref={svgRef} 
          className="max-w-full"
          aria-label="Skills distribution chart"
          role="img"
        />
        
        {/* Skill Detail Cards */}
        <AnimatePresence>
          {activeSlice && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              transition={{ duration: 0.2 }}
              className={`absolute z-20 rounded-lg shadow-xl pointer-events-none ${getCardBackground(activeSlice.category)}`}
              style={{
                ...getCardStyle(activeSlice),
                width: '280px',
                minHeight: '200px',
                padding: '20px',
              }}
            >
              {/* Card Header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-accent-primary/20">
                <span className="text-xl">{activeSlice.category.icon}</span>
                <h3 
                  className="font-semibold text-lg"
                  style={{ color: getThemeColors(activeSlice.category.color).cardTitle }}
                >
                  {activeSlice.category.name}
                </h3>
              </div>
              
              {/* Skills List */}
              <div className="space-y-4">
                {activeSlice.category.items.map((skill, index) => (
                  <div key={skill.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-fg">
                        {skill.name}
                      </span>
                      <span className="text-xs text-accent-secondary font-mono px-2 py-1 bg-accent-secondary/10 rounded">
                        {skill.years}
                      </span>
                    </div>
                    
                    {/* Skill Level Bar */}
                    <div className="w-full bg-accent-primary/10 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(skill.level / 5) * 100}%` }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: getThemeColors(activeSlice.category.color).cardTitle }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {isMobile && (
                <button
                  onClick={() => setSelectedSlice(null)}
                  className="mt-4 pt-3 border-t border-accent-primary/20 text-xs text-accent-secondary hover:text-accent-primary transition-colors w-full text-center pointer-events-auto"
                >
                  Tap to close
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Instructions */}
      <div className="text-center mt-8 text-sm text-fg/60">
        {isMobile ? (
          <p>Tap a section to view detailed skills</p>
        ) : (
          <p>Hover over sections to explore my skills in detail</p>
        )}
      </div>
      
      {/* Category Legend */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 mx-auto" style={{ width: '1040px' }}>
        {data.skills.categories.map((category) => {
          const themeColors = getThemeColors(category.color);
          return (
            <div 
              key={category.name}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${getLegendBackground(category)}`}
            >
              <span className="text-lg">{category.icon}</span>
              <span 
                className="text-sm font-medium"
                style={{ color: themeColors.legendText }}
              >
                {category.name}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}