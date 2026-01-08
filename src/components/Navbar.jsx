import { useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ReadingsService } from "../services/readingsService";
import { UserService } from "../services/userService";
import { getStatus } from "../services/mockData";
import Toast from "./Toast";

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]);

    const notifiedIds = useRef(new Set());
    const latestAnomaliesRef = useRef([]);
    const isFirstLoad = useRef(true);
    const navigate = useNavigate();

    // Helper for Storage
    const getSeenIdsFromStorage = () => {
        try {
            const seen = localStorage.getItem(`seen_alerts_${user?.id}`);
            return seen ? new Set(JSON.parse(seen)) : new Set();
        } catch (e) {
            return new Set();
        }
    };

    const saveSeenIdsToStorage = (idsSet) => {
        try {
            const idsArray = Array.from(idsSet).slice(-1000);
            localStorage.setItem(`seen_alerts_${user?.id}`, JSON.stringify(idsArray));
        } catch (e) {
            console.error("Navbar: Persistence failure", e);
        }
    };

    const addToast = (msg, type) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev.slice(-9), { id, msg, type }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // ULTRA-PRECISE FINGERPRINT (V3)
    const getRecordFingerprint = (alert) => {
        return `ALERT_DB_${alert.alert_id}_${alert.machine_id}`;
    };

    const fetchAlerts = async () => {
        if (!user) return;

        try {
            let currentUser = user;
            if (user?.id && !user?.requested_machines) {
                try {
                    const detailRes = await UserService.getUserDetail(user.id);
                    const fullProfile = detailRes.data || detailRes;
                    if (fullProfile) currentUser = { ...user, ...fullProfile };
                } catch (e) { }
            }

            // Fetch specific user's assigned machine ID if applicable
            const getAssignedId = (u) => {
                const req = u?.requested_machines;
                if (Array.isArray(req) && req.length > 0) {
                    const first = req[0];
                    return String(first.id || first.machine_id || first);
                }
                return req ? String(req) : (u?.machine_id ? String(u.machine_id) : null);
            };
            const assignedId = getAssignedId(currentUser);

            // Fetch from Alerts DB
            const response = await ReadingsService.getAlertsDetails();
            const allAlerts = Array.isArray(response) ? response : (response.data || []);

            const seenIdsInStorage = getSeenIdsFromStorage();

            // Filter and Map
            const validAlerts = allAlerts.filter(alert => {
                // Filter by assigned machine if not admin
                if (currentUser?.rights !== 1 && assignedId) {
                    if (String(alert.machine_id) !== String(assignedId)) return false;
                }
                // Only show unresolved alerts in navbar
                return !alert.acknowledged_by;
            }).map(alert => {
                // Determine status/color from alert data
                // API might return 'alert_type' like 'mixing_ratio_high'
                // We need to map this to "Critical" or "Warning" or use getStatus if we have ratio

                let ratio = alert.ratio || alert.calculated_ratio || 0;
                if (!ratio && alert.message) {
                    // Try to match ratio from message "Mixing ratio Critical: 1.234"
                    const match = alert.message.match(/:\s*([\d.]+)/);
                    if (match) ratio = parseFloat(match[1]);
                }

                // If we have a ratio, use getStatus, otherwise derive from type
                let status = getStatus(ratio);

                // Fallback if ratio is 0 or missing but it is an alert
                if (status.label === "Normal") {
                    if (String(alert.alert_type).includes("high") || String(alert.alert_type).includes("low")) {
                        // Assume it's at least a warning if it exists in DB
                        status = { label: "Warning", color: "bg-amber-500 text-white" };
                    }
                }

                return {
                    ...alert,
                    status: status,
                    ratioVal: Number(ratio).toFixed(3),
                    fingerprint: getRecordFingerprint(alert),
                    timestamp: alert.triggered_at || alert.timestamp
                };
            });

            // Sort by newest
            validAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            latestAnomaliesRef.current = validAlerts;

            const unreadRecords = validAlerts.filter(a => !seenIdsInStorage.has(a.fingerprint));
            setUnreadCount(unreadRecords.length);

            // Show latest 15
            setActiveAlerts(validAlerts.slice(0, 15));

            if (!isFirstLoad.current) {
                let toastsAdded = 0;
                for (const alert of validAlerts) {
                    if (!notifiedIds.current.has(alert.fingerprint)) {
                        notifiedIds.current.add(alert.fingerprint);

                        if (!seenIdsInStorage.has(alert.fingerprint)) {
                            if (toastsAdded < 5) {
                                addToast(`ALERT: ${alert.Machine?.name || `Node ${alert.machine_id}`} - ${alert.status.label}`, alert.status.label === "Critical" ? "critical" : "warning");
                                toastsAdded++;
                            }
                        }
                    }
                }
            } else {
                validAlerts.forEach(a => notifiedIds.current.add(a.fingerprint));
            }

            isFirstLoad.current = false;

        } catch (err) {
            console.error("Navbar Sync Err:", err);
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 15000);
        return () => clearInterval(interval);
    }, [user?.id]);

    const handleBellClick = () => {
        const newState = !isDropdownOpen;
        setIsDropdownOpen(newState);
        if (newState) {
            const currentSeen = getSeenIdsFromStorage();
            latestAnomaliesRef.current.forEach(alert => currentSeen.add(alert.fingerprint));
            saveSeenIdsToStorage(currentSeen);
            setUnreadCount(0);
        }
    };

    const handleAlertEventClick = (fingerprint) => {
        setIsDropdownOpen(false);
        // FORCE navigation with the specific unique fingerprint in state
        navigate("/alerts", {
            state: {
                highlightFingerprint: fingerprint,
                timestamp: Date.now() // Ensure state is "new" even if navigating from /alerts back to /alerts
            }
        });
    };

    return (
        <>
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none select-none w-full max-w-sm">
                {toasts.map(t => (
                    <div key={t.id} className="pointer-events-auto">
                        <Toast
                            message={t.msg}
                            type={t.type}
                            onClose={() => removeToast(t.id)}
                            duration={6000}
                        />
                    </div>
                ))}
            </div>

            <div className="bg-white/70 backdrop-blur-md border-b border-slate-200/50 p-4 px-8 flex justify-between items-center sticky top-0 z-40">
                <div className="flex flex-col">
                    <h1 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Live Intelligence</h1>
                    <p className="text-xl font-black text-slate-800 leading-none">Command Center</p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="relative">
                        <button
                            onClick={handleBellClick}
                            className={`p-2.5 rounded-xl transition-all duration-300 ${isDropdownOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadCount > 0 && (
                                <div className="absolute top-1 right-1">
                                    <span className="relative flex h-5 w-5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-2 border-white flex items-center justify-center text-[10px] font-black text-white leading-none">
                                            {unreadCount}
                                        </span>
                                    </span>
                                </div>
                            )}
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-4 w-80 glass-card p-2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-slate-200 shadow-premium-xl border border-slate-200/50">
                                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Active Stream</span>
                                    <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">{activeAlerts.length} Events</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {activeAlerts.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-slate-400 font-bold italic">No unresolved anomalies</div>
                                    ) : (
                                        activeAlerts.map((alert, index) => (
                                            <div
                                                key={`${alert.fingerprint}_${index}`}
                                                onClick={() => handleAlertEventClick(alert.fingerprint)}
                                                className="p-3 mx-1 my-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-100"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className="text-sm font-bold text-slate-800">{alert.Machine?.name || alert.machine_name || `Node ${alert.machine_id}`}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                                                    Ratio: <span className="text-slate-900 font-black">{alert.alert_ratio}</span>
                                                    <span className="ml-2 text-[10px] opacity-60">
                                                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
                        <div className="flex flex-col items-end">
                            <p className="text-sm font-bold text-slate-800 leading-none mb-1">{user?.name}</p>
                            <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase leading-none">{user?.role}</p>
                        </div>
                        <button onClick={logout} className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all border border-slate-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Navbar;
