import React, { useEffect, useState } from 'react';

const REFRESH_THRESHOLD_MS = 10000; // Time window to consider a refresh "rapid" (10 seconds)
const MAX_RAPID_REFRESHES = 3;     // How many times they can refresh rapidly before getting banned
const BAN_DURATION_MS = 600000;    // How long the ban lasts (e.g., 10 minutes in milliseconds)

export default function AntiSpamWrapper({ children }) {
    const [isBanned, setIsBanned] = useState(false);
    const [timeLeft, setTimeLeft] = useState(''); // Stores the formatted "MM:SS" remaining string

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

    // New Effect: Handles the ticking countdown timer if the user is banned
    useEffect(() => {
        if (!isBanned) return;

        const calculateTimeLeft = () => {
            const now = Date.now();
            const banUntil = parseInt(localStorage.getItem('spam_ban_until') || '0', 10);
            const difference = banUntil - now;

            if (difference <= 0) {
                // Ban is over! Clean up and unlock the app automatically
                localStorage.removeItem('spam_ban_until');
                setIsBanned(false);
                return;
            }

            // Convert remaining milliseconds to minutes and seconds
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            // Pad numbers with leading zeros (e.g., "09:05")
            const formattedMinutes = minutes.toString().padStart(2, '0');
            const formattedSeconds = seconds.toString().padStart(2, '0');

            setTimeLeft(`${formattedMinutes}:${formattedSeconds}`);
        };

        // Run immediately on mount so there is no 1-second blank delay
        calculateTimeLeft();

        // Run the calculation every second
        const timer = setInterval(calculateTimeLeft, 1000);

        // Clean up the interval loop if the component unmounts
        return () => clearInterval(timer);
    }, [isBanned]);

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
                padding: '20px',
                backgroundColor: '#1a1a1a', // Optional dark mode styling to match analytic apps
                color: '#ffffff'
            }}>
                <h2 style={{ color: '#ff4d4d' }}>Temporary Access Restricted</h2>
                <p>Too many rapid page refreshes detected.</p>
                <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    marginTop: '15px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #444',
                    fontFamily: 'monospace',
                    letterSpacing: '2px'
                }}>
                    {timeLeft || '00:00'}
                </div>
                <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '10px' }}>
                    Access will restore automatically when the timer hits zero.
                </p>
            </div>
        );
    }

    return <>{children}</>;
}
