import React, { useState, useEffect } from 'react';
import useExecutionStore from '../store/executionStore';
import { connectWS } from '../services/websocket';

export default function ConnectionBanner() {
    const isConnected = useExecutionStore(state => state.isConnected);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isVercel, setIsVercel] = useState(false);

    useEffect(() => {
        if (window.location.hostname.includes('vercel.app')) {
            setIsVercel(true);
        }
    }, []);

    // Try to reconnect if not connected
    useEffect(() => {
        if (!isConnected) {
            const timer = setTimeout(() => {
                connectWS();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isConnected]);

    if (isConnected || (isDismissed && !isVercel)) return null;

    return (
        <div style={{
            background: isVercel ? 'rgba(239, 68, 68, 0.95)' : 'rgba(245, 158, 11, 0.95)',
            color: 'white',
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            zIndex: 1000,
            position: 'sticky',
            top: 0,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
            <span style={{ fontSize: 18 }}>{isVercel ? '⚠️' : '🔌'}</span>
            <div style={{ flex: 1 }}>
                {isVercel ? (
                    <>
                        <b>Deployment Note:</b> This Vercel link is for UI preview only.
                        WebSockets require a persistent backend to visualize code.
                        <span className="hide-sm"> Use <b>localhost:5173</b> or deploy the backend to Render/Railway.</span>
                    </>
                ) : (
                    <>
                        <b>Backend Offline:</b> Ensure your Node.js server is running (`node server/index.js`).
                        <span className="hide-sm"> Reconnecting...</span>
                    </>
                )}
            </div>

            <button
                onClick={() => setIsDismissed(true)}
                style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: 4,
                    color: 'white',
                    padding: '2px 8px',
                    cursor: 'pointer',
                    fontSize: 11
                }}>
                Dismiss
            </button>
        </div>
    );
}
