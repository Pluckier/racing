import React, { useState, useEffect, useRef } from 'react';
import {
    RedditShareButton,
    FacebookShareButton,
    TwitterShareButton,
    LinkedinShareButton,
    TelegramShareButton,
    WhatsappShareButton,
    RedditIcon,
    FacebookIcon,
    TwitterIcon,
    LinkedinIcon,
    TelegramIcon,
    WhatsappIcon
} from 'react-share';

const GridDarkSocialShareDropdown = ({ url, title }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef(null);

    // Closes menu if clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset the "Copied!" text status after 2 seconds
    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => setCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copied]);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleCloseMenu = () => setIsOpen(false);

    const styles = {
        wrapper: {
            position: 'relative',
            display: 'inline-block',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        triggerBtn: {
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#ffffff',
            backgroundColor: '#3b82f6',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'background-color 0.2s ease'
        },
        menu: {
            position: 'absolute',
            top: '110%',
            left: '0',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '340px', // Widened to comfortably support 2 columns
        },
        gridContainer: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr', // Creates exactly 2 equal columns
            gap: '6px',
        },
        row: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '8px',
            background: 'none',
            border: 'none',
            borderRadius: '6px',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#f1f5f9',
            transition: 'background-color 0.15s ease'
        },
        copyButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '10px',
            background: '#0f172a',
            border: '1px dashed #475569',
            borderRadius: '6px',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#f8fafc',
            marginTop: '4px'
        },
        copyIcon: {
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '12px'
        }
    };

    return (
        <div style={styles.wrapper} ref={dropdownRef}>
            <button
                style={styles.triggerBtn}
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
                {isOpen ? 'Close' : 'Share'}
            </button>

            {isOpen && (
                <div style={styles.menu}>
                    {/* 2-Column Grid Layout for Socials */}
                    <div style={styles.gridContainer}>
                        {/* Reddit */}
                        <RedditShareButton url={url} title={title} style={{ width: '100%' }} onClick={handleCloseMenu}>
                            <div
                                style={styles.row}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <RedditIcon size={24} round />
                                <span>Reddit</span>
                            </div>
                        </RedditShareButton>

                        {/* Facebook */}
                        <FacebookShareButton url={url} style={{ width: '100%' }} onClick={handleCloseMenu}>
                            <div
                                style={styles.row}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <FacebookIcon size={24} round />
                                <span>Facebook</span>
                            </div>
                        </FacebookShareButton>

                        {/* Twitter / X */}
                        <TwitterShareButton url={url} title={title} style={{ width: '100%' }} onClick={handleCloseMenu}>
                            <div
                                style={styles.row}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <TwitterIcon size={24} round />
                                <span>Twitter / X</span>
                            </div>
                        </TwitterShareButton>

                        {/* LinkedIn */}
                        <LinkedinShareButton url={url} title={title} style={{ width: '100%' }} onClick={handleCloseMenu}>
                            <div
                                style={styles.row}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <LinkedinIcon size={24} round />
                                <span>LinkedIn</span>
                            </div>
                        </LinkedinShareButton>

                        {/* Telegram */}
                        <TelegramShareButton url={url} title={title} style={{ width: '100%' }} onClick={handleCloseMenu}>
                            <div
                                style={styles.row}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <TelegramIcon size={24} round />
                                <span>Telegram</span>
                            </div>
                        </TelegramShareButton>

                        {/* WhatsApp */}
                        <WhatsappShareButton url={url} title={title} separator=" - " style={{ width: '100%' }} onClick={handleCloseMenu}>
                            <div
                                style={styles.row}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <WhatsappIcon size={24} round />
                                <span>WhatsApp</span>
                            </div>
                        </WhatsappShareButton>
                    </div>

                    {/* Instagram Option Spans the Full Width Below the Grid */}
                    <button
                        style={styles.copyButton}
                        onClick={handleCopyLink}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f172a'}
                    >
                        <div style={styles.copyIcon}>📋</div>
                        <span>{copied ? 'Copied Link!' : 'Copy Link (Instagram)'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default GridDarkSocialShareDropdown;
