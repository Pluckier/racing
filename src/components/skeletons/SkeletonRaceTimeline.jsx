import React from 'react';
import '../../css/SkeletonRaceTimeline.css';

const SkeletonRaceTimeline = ({ height = 160 }) => {
  return (
    <div className="skeleton-timeline" style={{ height: `${height}px` }}>
      <div className="skeleton-timeline-header"></div>
      <div className="skeleton-timeline-content">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-timeline-row">
            <div className="skeleton-timeline-label"></div>
            <div className="skeleton-timeline-bar"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonRaceTimeline;