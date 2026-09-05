import React, { useEffect, useState } from 'react';

const REFRESH_THRESHOLD_MS = 10000; // Time window to consider a refresh "rapid" (10 seconds)
const MAX_RAPID_REFRESHES = 3;     // How many times they can refresh rapidly before getting banned
const BAN_DURATION_MS = 600000;   // How long the ban lasts (e.g., 10 minutes in milliseconds)

export default function AntiSpamWrapper({ children }) {
    const [isBanned, setIsBanned] = useState(false);

    useEffect(() => {
        const now = Date.now();

        // 1. Check if they are already serving an active ban duration
        const banUntil = localStorage.getItem('spam_ban_until');
        if (banUntil && now < parseInt(banUntil, 10)) {
            setIsBanned(true);
            return;
        } else if (banUntil) {
            // Ban has expired, clean up local storage
            localStorage.removeItem('spam_ban_until');
        }

        // 2. Read previous session tracking data
        const lastLoadTime = sessionStorage.getItem('last_load_time');
        let rapidCount = parseInt(sessionStorage.getItem('rapid_refresh_count') || '0', 10);

        if (lastLoadTime) {
            const timeDifference = now - parseInt(lastLoadTime, 10);

            if (timeDifference < REFRESH_THRESHOLD_MS) {
                rapidCount += 1;
                sessionStorage.setItem('rapid_refresh_count', rapidCount.toString());
            } else {
                // Reset count if they behaved normally and waited long enough
                rapidCount = 0;
                sessionStorage.setItem('rapid_refresh_count', '0');
            }
        }

        // 3. Trigger ban if they cross the threshold
        if (rapidCount >= MAX_RAPID_REFRESHES) {
            const banExpiry = now + BAN_DURATION_MS;
            localStorage.setItem('spam_ban_until', banExpiry.toString());
            setIsBanned(true);
            return;
        }

        // 4. Update the timestamp for the next refresh check
        sessionStorage.setItem('last_load_time', now.toString());
    }, []);

    // Render a locked screen if banned, otherwise show the app normally
    if (isBanned) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                fontFamily: 'sans-serif',
                textAlign: 'center',
                padding: '20px'
            }}>
                <h2>Temporary Access Restricted</h2>
                <p>Too many rapid page refreshes detected. Please try again later.</p>
            </div>
        );
    }

    return <>{children}</>;
}
