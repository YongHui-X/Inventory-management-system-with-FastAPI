import React from "react";
import "./TaglineSection.css";

const TaglineSection = ({ totalProducts = 0 }) => {
  return (
    <section className="tagline-card">
      <div className="tagline-copy">
        <p className="tagline-eyebrow">Inventrack overview</p>
        <h2>Track inventory with less clutter.</h2>
        <p className="tagline-text">
          Keep products, pricing, and stock levels easy to review with a cleaner dashboard
          that works across screen sizes.
        </p>

        <div className="tagline-pills">
          <span>Live search</span>
          <span>Column sorting</span>
          <span>Responsive cards</span>
        </div>
      </div>

      <div className="tagline-metrics">
        <div className="metric-card metric-card--accent">
          <div className="metric-card__value">
            <strong>{totalProducts}</strong>
            <span>Products</span>
          </div>
          <p>Tracked in one place</p>
        </div>
      </div>
    </section>
  );
};

export default TaglineSection;
