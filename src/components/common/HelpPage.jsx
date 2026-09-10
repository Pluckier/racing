import React, { useState, useCallback } from 'react';
import '../../css/HelpPage.css';

/* ─── Collapsible Section wrapper ─── */
const Section = ({ id, emoji, title, defaultOpen = false, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <section id={id} className={`help-section${open ? ' expanded' : ''}`}>
            <div className="help-section-header" onClick={() => setOpen(o => !o)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}>
                <h2>{emoji} {title}</h2>
                <span className="help-section-chevron">▶</span>
            </div>
            <div className="help-section-body">
                <div className="help-section-content">
                    {children}
                </div>
            </div>
        </section>
    );
};

const HelpPage = ({ theme: currentTheme }) => {
    // Fallback gracefully if theme is not explicitly passed as a prop
    const activeTheme = currentTheme || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : 'dark');
    const isDark = activeTheme === 'dark';

    const scrollTo = useCallback((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Auto-expand the section when navigated to
            const section = el.closest('.help-section') || el;
            if (!section.classList.contains('expanded')) {
                section.querySelector('.help-section-header')?.click();
            }
        }
    }, []);

    const tocItems = [
        { id: 'help-toolbar', emoji: '🧭', label: 'Toolbar' },
        { id: 'help-timeline', emoji: '⏱️', label: 'Timeline' },
        { id: 'help-annotations', emoji: '🏷️', label: 'Annotations' },
        { id: 'help-connections', emoji: '🔥', label: 'Hot Connections' },
        { id: 'help-class', emoji: '👑', label: 'Classification' },
        { id: 'help-form', emoji: '📊', label: 'Form %' },
        { id: 'help-sliders', emoji: '🎚️', label: 'Sliders' },
        { id: 'help-sort', emoji: '🔀', label: 'Sort By' },
        { id: 'help-ai', emoji: '🤖', label: 'AI Models' },
        { id: 'help-charts', emoji: '📈', label: 'Charts' },
        { id: 'help-horse', emoji: '🏇', label: 'Horse Row' },
    ];

    return (
        <div className={`help-container ${isDark ? 'dark-mode' : 'light-mode'}`}>

            {/* ─── Hero Banner ─── */}
            <div className="help-hero">
                <h1 className="help-hero-title">The Racing Guide</h1>
                <p className="help-hero-sub">
                    Welcome to The Racing (from Pluckier). Here is a breakdown of how to read the data, classification icons, and form percentage indicators.
                </p>
                <nav className="help-toc">
                    {tocItems.map(t => (
                        <span key={t.id} className="help-toc-chip" onClick={() => scrollTo(t.id)}>
                            {t.emoji} {t.label}
                        </span>
                    ))}
                </nav>
            </div>

            {/* Header Navigation & Toolbar Controls */}
            <Section id="help-toolbar" emoji="🧭" title="Header Bar & Toolbar Controls" defaultOpen={false}>
                <p>The top navigation and expandable toolbar provide instant access to global platform utilities:</p>
                <ul>
                    <li>
                        <strong>🔍 Quick Search:</strong> Fast lookup by horse name, trainer, or jockey. Selecting any search match instantly jumps or scrolls directly to that race.
                    </li>
                    <li>
                        <strong>💡 Help & Guide:</strong> Opens this comprehensive guide, documentation, and visual legend.
                    </li>
                    <li>
                        <strong>🧍 Live Presence Counter:</strong> Displays the live number of active users currently browsing the board.
                    </li>
                    <li>
                        <strong>💬 Community Chat:</strong> Toggles the live racing discussion room and chat drawer.
                    </li>
                    <li>
                        <strong>🔗 Social Share:</strong> Share current cards, tips, and race links directly to X / Twitter, WhatsApp, Facebook, or copy to clipboard.
                    </li>
                    <li>
                        <strong>↻ Auto-Refresh & Non-Runners:</strong> Automatically refreshes latest market odds and race states every 15 minutes. When non-runners are detected, a red badge shows the count (e.g. <code>3</code>); click to review non-runner notifications.
                    </li>
                    <li>
                        <strong>⛶ Fullscreen Mode:</strong> Toggles borderless fullscreen display — ideal for dedicated multi-screen workstations or TV displays.
                    </li>
                    <li>
                        <strong>☕ Donate:</strong> Support Pluckier development, server hosting, and new analytics features via PayPal.
                    </li>
                    <li>
                        <strong>☀️ / 🌙 Theme Toggle:</strong> Instantly switch between clean high-visibility Light Mode and sleek Dark Mode.
                    </li>
                    <li>
                        <strong>📅 Date Selector:</strong> Click the calendar icon (📅) in the header to travel to previous historical race days or browse upcoming scheduled cards.
                    </li>
                </ul>
            </Section>

            {/* Section 1: The Live Timeline Line */}
            <Section id="help-timeline" emoji="⏱️" title="Live Race Timeline Indicator">
                <p>The timeline acts as a real-time schedule of today's active race cards across all tracks.</p>
                <ul>
                    <li><strong>Vertical Indicator Line:</strong> Represents the <strong>Current Time (Now)</strong>. It dynamically crawls across the layout minute-by-minute (white in dark mode, black in light mode).</li>
                    <li><strong>Automatic Scaling:</strong> Race blocks scale automatically based on distance. Longer distance races stretch out further horizontally.</li>
                    <li><strong>Double click / Hover:</strong> Jump directly to a race by double-clicking its block. Hover to preview race details.</li>
                </ul>
            </Section>

            {/* Annotations */}
            <Section id="help-annotations" emoji="🏷️" title="Annotations">
                <p>Horses can be annotated with an orange square 🟨, a green circle 🟢, or a red triangle 🔺:</p>
                <div className="help-annotation-grid">
                    <div className="help-annotation-card">
                        <div className="help-annotation-icon">🟨</div>
                        <div className="help-annotation-text">
                            <strong>Hot</strong>
                            <span>Trainers, Jockeys, Owners, or Lineage (Sires, Dams, Broodmare Sires) marked as notable connections.</span>
                        </div>
                    </div>
                    <div className="help-annotation-card">
                        <div className="help-annotation-icon">🟢</div>
                        <div className="help-annotation-text">
                            <strong>Performance</strong>
                            <span>The highest ever career performance (or 2nd best). Glows light blue when the performance spike was exceptional.</span>
                        </div>
                    </div>
                    <div className="help-annotation-card">
                        <div className="help-annotation-icon">🔺</div>
                        <div className="help-annotation-text">
                            <strong>Recent</strong>
                            <span>Judged to have had the best last run, demonstrating peak current form last time out.</span>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Section: Hot Connections */}
            <Section id="help-connections" emoji="🔥" title="Hot Connections & Pedigree Panel">
                <p>Click the <strong>🔥 Connections</strong> button in the filter bar to open <em>Today's Connections</em> modal. This panel lets you manage exactly which connections and bloodlines are flagged across all racecards.</p>
                <p>We have pre-selected some Trainers and Owners that are notable.  Horses connected to these get the orange square 🟨 annotation on the racecard.</p>
                <ul>
                    <li>
                        <strong>6 Tracked Categories:</strong>
                        <ul>
                            <li><strong>Trainers Today:</strong> Leading stables and in-form yards.</li>
                            <li><strong>Jockeys Today:</strong> Top pilots and claiming riders.</li>
                            <li><strong>Owners Today:</strong> Prominent racing operations and silks.</li>
                            <li><strong>Dams Today:</strong> Maternal parentage of today's runners.</li>
                            <li><strong>Broodmare Sires Today:</strong> Maternal grandsires (stamina and going influence).</li>
                            <li><strong>Sires Today:</strong> Paternal stallion lineage.</li>
                        </ul>
                    </li>
                    <li>
                        <strong>Quick Actions & Search:</strong> Every section has its own instant search filter, a <em>"Show Only Active"</em> checkbox, and quick buttons to <strong>Select All</strong>, <strong>Clear All</strong>, or <strong>Reset to Hot</strong> (restores the default curated in-form shortlist).
                    </li>
                    <li>
                        <strong>Runner Tooltips:</strong> Hover over any trainer, jockey, owner, or sire to see every horse they are connected with today, including race times and tracks.
                    </li>
                    <li>
                        <strong>Pedigree Family Linking (Pink Highlight):</strong> For breeding tracks, if any part of a horse's pedigree (Dam, Broodmare Sire, or Sire) is selected, its relatives automatically highlight in pink to reveal breeding patterns.
                    </li>
                    <li>
                        <strong>Visual Markers on Cards:</strong> When the <strong>🔥 Hot</strong> toggle in the filter bar is active, any runner matching your selected connections displays the <strong>🟨 Hot</strong> square. Selected Jockeys (<strong>J:</strong>) and Trainers (<strong>T:</strong>) appear in bold.
                    </li>
                    <li>
                        <strong>Interactive On-the-Fly Toggling:</strong> Click any Jockey or Trainer name directly on a racecard row to toggle them in or out of your Hot list. Clicking the 🟨 icon directly removes that runner's connection.
                    </li>
                    <li>
                        <strong>OR and AND settings:</strong> By default, all selected connections are combined with OR logic (e.g. Sire A OR Broodmare Sire B). Toggle to <strong>AND</strong> combines selected connections with AND logic (e.g. Sire A AND Broodmare Sire B).  This setting only relates to Dams, Sires and Broodmare Sires.
                    </li>
                </ul>
            </Section>

            {/* Section 2: Race Importance Icons */}
            <Section id="help-class" emoji="👑" title="Race Classification Icons">
                <p>Each race displays its classification category metrics:</p>
                <div className="icon-grid">
                    <div className="icon-item"><strong>👑 Premium Grade:</strong> Indicates a prestigious <em>Class 1</em> or <em>Class 2</em> tier stakes event.</div>
                    <div className="icon-item"><strong>⚖️ Handicap/Nursery:</strong> Indicates weights are custom allocated to balance field competitiveness.</div>
                    <div className="icon-item"><strong>🏆 Tricast Race:</strong> Handicaps (usually) containing fields of <strong>8 or more horses</strong>.</div>
                    <div className="icon-item"><strong>🚫 Generic Field:</strong> Stakes, Maidens, Novices or unclassified race type.</div>
                </div>
            </Section>

            {/* Section 3: Form Percentage Breakdown */}
            <Section id="help-form" emoji="📊" title="Form Percentages & Emojis">
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
            </Section>

            {/* Section 4: Sliders Weight Distance & Going */}
            <Section id="help-sliders" emoji="🎚️" title="Sliders Weight Distance & Going">
                <p>The sliders allow you to emphasis horses based on their weight, distance and going compared to past runs.</p>
                <ul>
                    <li><strong>Weights:</strong>  Tracks horses where the current weight is less than past runs.</li>
                    <li><strong>Distance:</strong>  Tracks horses where the current distance is within 20% of past runs.</li>
                    <li><strong>Going:</strong>  Tracks horses where the current going matches past runs.</li>
                </ul>
            </Section>

            {/* Section 5: Sort By */}
            <Section id="help-sort" emoji="🔀" title="Sort By Slider">
                <p>Each race card features a slider control in the header to instantly re-sort runners by your preferred analytical metric:</p>
                <ul>
                    <li><strong>Avg3:</strong> Sorts by the average adjusted rating of the runner's last 3 career runs (the default, offering a balanced baseline of current form).</li>
                    <li><strong>1Run:</strong> Sorts strictly by the adjusted rating earned on the horse's most recent outing.</li>
                    <li><strong>High:</strong> Sorts by the highest career peak rating recorded across all past runs.</li>
                    <li><strong>All:</strong> Sorts by the overall career average rating across all recorded past runs.</li>
                    <li><strong>Odds:</strong> Sorts by the current live market price with the shortest odds first (non-runners are always placed at the bottom).</li>
                </ul>
            </Section>

            {/* Section 6: AI */}
            <Section id="help-ai" emoji="🤖" title="Artificial Intelligence Models">
                <p>Click the AI model toggle button on any race card or form chart to switch between analytical scoring engines:</p>
                <ul>
                    <li><strong>Off (Grey CPU):</strong> Default mode using official speed and performance handicap ratings.</li>
                    <li><strong>Claude (Amber Icon):</strong> Uses Anthropic Claude's contextual run evaluation and form weighting.</li>
                    <li><strong>ChatGPT (Emerald Icon):</strong> Uses OpenAI ChatGPT's predictive scoring and handicap adjustments.</li>
                </ul>
                <p>Toggling AI dynamically updates all ratings, averages, peak scores, and sort ordering in real time.</p>
            </Section>

            {/* Section 7: Odds and Past Performance Charts */}
            <Section id="help-charts" emoji="📈" title="Odds & Past Performance Charts">
                <p>Deep-dive visual analytics are available via the chart buttons in each race header:</p>
                <ul>
                    <li>
                        <strong>📊 Odds Movement Chart:</strong> Plots price trajectories over time for every runner in the field. Quickly identify market movers, steamers, and drifters.
                    </li>
                    <li>
                        <strong>📈 Form Performance Chart:</strong> Interactive line chart graphing past ratings across dates:
                        <ul>
                            <li><strong>Distance Margin Filter (Dist):</strong> Filter historical runs to those run at today's distance (±0f up to ±4f).</li>
                            <li><strong>Going Filter:</strong> Isolate historical performances on matching track going conditions (Heavy through Firm).</li>
                            <li><strong>Months Filter:</strong> Limit the chart to recent form (from the last 3 months up to 15 months).</li>
                            <li><strong>Interactive Data Points:</strong> Winning runs are marked with a star (★). Click any node on the chart to inspect the horse's silks, breeding, owner, jockey, and official race result links.</li>
                        </ul>
                    </li>
                </ul>
            </Section>

            {/* Section 8: Horse Row */}
            <Section id="help-horse" emoji="🏇" title="Horse Row: Ratings, Odds & Past Form">
                <p>Each runner row displays dense, high-signal information at a glance:</p>
                <ul>
                    <li><strong>Silks, Number & Stall:</strong> Official jockey silks, racecard number, and starting stall draw in brackets (e.g. <code>(4)</code>).</li>
                    <li><strong>Horse Name & Improver Asterisk (*):</strong> An asterisk next to the name indicates an <em>Improver</em> — a horse whose latest run matched or exceeded its career peak rating.</li>
                    <li><strong>Age & Weight:</strong> Horse's age (e.g. <code>4yo</code>) and carrying weight in stones and pounds (e.g. <code>9-7</code>).</li>
                    <li><strong>Connections (Jockey & Trainer):</strong> Displays jockey (<strong>J:</strong>), trainer (<strong>T:</strong>), and sire breeding (<strong>B:</strong>). Click either the jockey or trainer name to toggle highlighting them across all cards.</li>
                    <li><strong>Live Rating:</strong> The large number indicates the active rating (Avg3, 1Run, Peak, or All) including your live Weight, Distance, and Going slider bonuses.</li>
                    <li>
                        <strong>Odds & Movement Arrow:</strong> Current market price with directional movement indicators:
                        <ul>
                            <li><strong style={{ color: '#ef4444' }}>▲ Red Arrow:</strong> Price shortened (backed in the market).</li>
                            <li><strong style={{ color: '#1d4ab3ff' }}>▼ Blue Arrow:</strong> Price lengthened (drifted).</li>
                            <li><strong>~ Tilde:</strong> Stable price with no significant movement.</li>
                        </ul>
                    </li>
                    <li><strong>Past Runs Pill Button:</strong> The number button on the right indicates total past runs recorded. Click it to expand or collapse the full history drawer showing individual track, distance, going, weight, and adjusted rating details for every past race.</li>
                </ul>
            </Section>

            {/* Version footer */}
            <div className="help-version">
                <p>Version: 3.0</p>
                <p>Last Updated: 07 Aug 2026 00:51 BST</p>
            </div>

        </div>
    );
};

export default HelpPage;
