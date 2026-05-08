import React from 'react';
import '../../css/SkeletonRaceCard.css';

const SkeletonRaceCard = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line detail"></div>
      </div>
      <div className="skeleton-rows">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-circle"></div>
            <div className="skeleton-line horse-name"></div>
            <div className="skeleton-line horse-meta"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonRaceCard;
