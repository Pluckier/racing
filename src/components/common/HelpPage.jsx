import React from 'react';
import '../../css/HelpPage.css';

const HelpPage = ({ theme: currentTheme }) => {
    // Fallback gracefully if theme is not explicitly passed as a prop
    const activeTheme = currentTheme || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : 'dark');
    const isDark = activeTheme === 'dark';

    return (
        <div className={`help-container ${isDark ? 'dark-mode' : 'light-mode'}`}>
            <p className="help-lead">Welcome to The Racing (from Pluckier). Here is a breakdown of how to read the data, classification icons, and form percentage indicators.</p>

            {/* Section 1: The Live Timeline Line */}
            <section className="help-section">
                <h2>⏱️ Live Race Timeline Indicator</h2>
                <p>The timeline acts as a real-time schedule of today's active race cards across all tracks.</p>
                <ul>
                    <li><strong>Vertical Indicator Line:</strong> Represents the <strong>Current Time (Now)</strong>. It dynamically crawls across the layout minute-by-minute (white in dark mode, black in light mode).</li>
                    <li><strong>Automatic Scaling:</strong> Race blocks scale automatically based on distance. Longer distance races stretch out further horizontally.</li>
                    <li><strong>Double click / Hoover:</strong> Jump directly to a race by double clicking it block.  Hoover to see race details.</li>
                </ul>
            </section>

            <section className="help-section">
                <h2>Annotations</h2>
                <p>Horses can be annotated with an orange square, 🟨 or a Green circle 🟢 or a red triangle 🔺  </p>
                <ul>
                    <li><strong>🟨 Hot:</strong> Trainers, Jockey and Owners you can selected as notable <strong>Even Sires, Dams and Broodmare Sires</strong>.</li>
                    <li><strong>🟢 Performance:</strong> The highest ever best performance and the second best performance.  Its a light blue when the performance was exceptional.</li>
                    <li><strong>🔺Recent:</strong>Judged to have had the best last run, so showing the best form last time out.</li>
                </ul>
            </section>

            {/* Section 2: Race Importance Icons */}
            <section className="help-section">
                <h2>🏷️ Race Classification Icons</h2>
                <p>Each race  displays its classification category metrics:</p>
                <div className="icon-grid">
                    <div className="icon-item"><strong>👑 Premium Grade:</strong> Indicates a prestigious <em>Class 1</em> or <em>Class 2</em> tier stakes event.</div>
                    <div className="icon-item"><strong>⚖️ Handicap/Nursery:</strong> Indicates weights are custom allocated to balance field competitiveness.</div>
                    <div className="icon-item"><strong>🏆 Tricast Race:</strong> Handicaps (usually) containing fields of <strong>8 or more horses</strong>.</div>
                    <div className="icon-item"><strong>🚫 Generic Field:</strong> Stakes, Maidens, Novices or unclassified race type.</div>
                </div>
            </section>

            {/* Section 3: Form Percentage Breakdown */}
            <section className="help-section">
                <h2>📊 Form Percentages & Emojis</h2>
                <p>We calculate the past readiness of fields out of a maximum threshold ceiling (capped at 6 historical runs per runner):</p>
                <div className="help-table-wrapper">
                    <table className="help-table">
                        <thead>
                            <tr>
                                <th>Percentage Range</th>
                                <th>Status Symbol</th>
                                <th>Meaning / Tier Evaluation</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>0% – 33%</td><td>❌ Critical</td><td>Very little past historical run data available for this field.</td></tr>
                            <tr><td>34% – 55%</td><td>⚠️ Warning</td><td>Low baseline track run history reported. Procedural caution.</td></tr>
                            <tr><td>56% – 74%</td><td>👎 Underpar</td><td>Moderate historical data, but missing optimal run depths.</td></tr>
                            <tr><td>75% – 87%</td><td>👍 Strong</td><td>Highly dependable field setup with reliable career runs logged.</td></tr>
                            <tr><td>88% – 99%</td><td>👌 Premium</td><td>Excellent comprehensive race history across the field.</td></tr>
                            <tr><td>100%</td><td>✅💯 Absolute</td><td>Every single horse in the field has met the full 6-run maximum trace record.</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Section 4: Sliders Weight Distance & Going */}
            <section className="help-section">
                <h2>🎚️ Sliders Weight Distance & Going</h2>
                <p>The sliders allow you to emphasis horses based on their weight, distance and going compared to past runs.</p>
                <ul>
                    <li><strong>Weights:</strong>  Tracks horses where the current weight is less than past runs.</li>
                    <li><strong>Distance:</strong>  Tracks horses where the current distance is within 20% of past runs.</li>
                    <li><strong>Going:</strong>  Tracks horses where the current going matches past runs.</li>
                </ul>
            </section>


            {/* Section 5: Sort By */}
            <section className="help-section">
                <h2>🎚️ Sort By - Slider</h2>

            </section>

            {/* Section 6: AI */}
            <section className="help-section">
                <h2>🤖 Artificial Intelligence</h2>


            </section>

            {/* Section 7: Odds and Past Performance Charts */}
            <section className="help-section">
                <h2>📈 Odds & Past Performance Charts</h2>


            </section>

            {/* Section 8: Horse Rwo */}
            <section className="help-section">
                <h2>🏇 Horse Row Rating, Odds and Past</h2>


            </section>


        </div>
    );
};

export default HelpPage;
