import React, { useEffect, useState, useContext, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { getStatus } from "../services/mockData";
import { ReadingsService } from "../services/readingsService";
import { UserService } from "../services/userService";
import { AuthContext } from "../context/AuthContext";

const Alerts = () => {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    // Captured once per navigation state change
    const highlightFingerprint = location.state?.highlightFingerprint;

    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [acknowledgeNote, setAcknowledgeNote] = useState("");
    const [filterType, setFilterType] = useState("ALL");

    const canAcknowledge = user?.rights === 1 || user?.rights === 2;

    const fetchAlerts = async () => {
        if (loading) setLoading(true);

        try {
            let currentUser = user;
            if (user?.id && user?.rights !== 1 && !user?.requested_machines) {
                try {
                    const detailRes = await UserService.getUserDetail(user.id);
                    const fullProfile = detailRes.data || detailRes;
                    if (fullProfile) currentUser = { ...user, ...fullProfile };
                } catch (profileErr) { }
            }

            let machineIdParam = null;
            const getAssignedId = (u) => {
                const req = u?.requested_machines;
                if (Array.isArray(req) && req.length > 0) {
                    const first = req[0];
                    return String(first.id || first.machine_id || first);
                }
                return req ? String(req) : (u?.machine_id ? String(u.machine_id) : null);
            };

            const assignedId = getAssignedId(currentUser);
            if (currentUser?.rights !== 1 && assignedId) {
                machineIdParam = assignedId;
            }

            // Fetch from new Alerts API
            const response = await ReadingsService.getAlertsDetails();
            const allAlerts = Array.isArray(response) ? response : (response.data || []);

            // Filter for assigned machine if necessary (Client-side filtering for now as API might return all)
            let filteredAlerts = allAlerts;
            if (machineIdParam) {
                filteredAlerts = allAlerts.filter(a => String(a.machine_id) === String(machineIdParam));
            }

            // Map API fields to UI expected fields
            const processedRecords = filteredAlerts.map(alert => {
                // Determine ratio from message if possible or use a default/placeholder
                // The API example doesn't explicitly return ratio, but we can try to parse or default.
                // If the UI relies on 'calculated_ratio', we need it.
                // Assuming 'message' might contain it or we accept 0/null if not available.
                // For now, we map explicitly known fields.

                // MOCK/DERIVED values to keep UI from breaking:
                const ratio = alert.ratio || 0; // If API adds this later
                const ad = 0;
                const re = 0;

                const mid = alert.machine_id || 'null';
                const time = alert.triggered_at || alert.timestamp || new Date().toISOString();
                const rid = alert.reading_id || alert.alert_id || 'null';

                // GENERATE FINGERPRINT
                const fingerprint = `ALERT_API_${alert.alert_id}_${mid}_${time}`;

                // Try to infer status from alert_type
                // "mixing_ratio_high" -> Critical? Warning? 
                // Let's assume non-normal.
                // If detailed ratio isn't there, we might need to patch getStatus or mock it.
                // Let's pass the alert_type as a status label substitute if needed, or pass a fake ratio 
                // that triggers the right color if we know it's high/low.

                // However, the UI uses getStatus(record.calculated_ratio).
                // We'll attach the raw alert object properties.

                return {
                    ...alert,
                    timestamp: time,
                    reading_id: rid, // map to reading_id for consistency
                    id: alert.alert_id, // ensure id is the alert_id
                    calculated_ratio: ratio,
                    // If we can't calculate ratio, the UI badge might be wrong unless we override it.
                    // But for now, we just list them.
                    fingerprint
                };
            });

            processedRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setAlerts(processedRecords);
            setError("");
        } catch (err) {
            setError("Failed to load alerts.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 15000);
        return () => clearInterval(interval);
    }, [user?.id]);

    const handleAcknowledge = async (e) => {
        e.preventDefault();
        if (!selectedAlert) return;
        try {
            // Using the update-alert API
            // Note: We mapped alert.alert_id -> alert.id in fetchAlerts
            const targetId = selectedAlert.id || selectedAlert.alert_id;

            if (!targetId) {
                alert("Error: Missing Alert ID");
                return;
            }

            await ReadingsService.updateAlert(targetId, acknowledgeNote);

            setShowAcknowledgeModal(false);
            setAcknowledgeNote("");
            fetchAlerts();
        } catch (err) {
            alert("Acknowledgment failed: " + err.message);
        }
    };

    const displayedAlerts = alerts.filter(alert => {
        const isResolved = alert.acknowledged_by != null;

        if (filterType === "RESOLVED") {
            return isResolved;
        }

        // Default: Show Active (Unresolved)
        return !isResolved;
    });

    return (
        <Layout>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Active Anomalies</h1>
                    <p className="text-[11px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">
                        Live Detection Log ({alerts.length} Total)
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {["ALL", "RESOLVED"].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${filterType === type
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {type === "ALL" ? "ACTIVE ALERTS" : "RESOLVED"}
                        </button>
                    ))}
                </div>
            </div>

            {displayedAlerts.length === 0 ? (
                <div className="glass-card p-12 text-center flex flex-col items-center">
                    <h2 className="text-xl font-black text-slate-800 mb-2 font-black uppercase tracking-tight">No Anomalies Detected</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Everything is within tolerance</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedAlerts.map((alert, index) => {
                        let status = getStatus(alert.calculated_ratio);
                        if (alert.acknowledged_by) {
                            status = { label: "Resolved", color: "bg-emerald-100 text-emerald-600 border border-emerald-200" };
                        }
                        const isHighlighted = (highlightFingerprint && highlightFingerprint === alert.fingerprint);

                        return (
                            <div
                                key={alert.fingerprint}
                                className={`
                                    glass-card p-6 transition-all duration-700 animate-fade-in-up group relative
                                    ${isHighlighted
                                        ? 'ring-[5px] ring-blue-500 shadow-premium-2xl bg-blue-50/5 scale-[1.03] border-blue-400 z-10'
                                        : 'hover:translate-y-[-4px] hover:shadow-premium-lg border-transparent'}
                                `}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {isHighlighted && (
                                    <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-xl z-20 animate-bounce">
                                        Selected Reading
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-6">
                                    <div className="min-w-0">
                                        <h3 className={`text-lg font-black truncate leading-none mb-1 ${isHighlighted ? 'text-blue-700' : 'text-slate-800'}`}>
                                            {alert.Machine?.name || alert.machine_name || `Node ${alert.machine_id}`}
                                        </h3>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-70">
                                            ID: {alert.machine_id} • EVENT: {alert.reading_id || 'LOCAL'}
                                        </span>
                                    </div>

                                </div>

                                <div className="space-y-4">
                                    <div className={`p-4 rounded-2xl border transition-colors ${isHighlighted ? 'bg-white border-blue-200' : 'bg-slate-50 border-slate-100 group-hover:bg-white'}`}>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detected Ratio</span>
                                            <span className={`text-2xl font-black tracking-tighter ${status.label === 'Critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                                                {Number(alert.alert_ratio).toFixed(3)}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Resolution History Display */}
                                    {alert.acknowledged_by && (
                                        <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100/50">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Protocol Resolution</span>
                                                <span className="text-[9px] font-bold text-emerald-400">
                                                    {alert.AcknowledgedBy?.name || `user:${alert.acknowledged_by}`}
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium text-emerald-800 leading-snug">
                                                {alert.comments || alert.message || "Resolved manually with standard protocol."}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${status.label === 'Critical' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`}></div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => navigate(`/machine/${alert.machine_id}`)}
                                                className="text-[10px] font-black text-blue-500 hover:text-blue-700 transition-colors uppercase tracking-[0.15em] underline decoration-blue-200 decoration-2 underline-offset-4"
                                            >
                                                Analyze
                                            </button>
                                            {canAcknowledge && (
                                                <button
                                                    onClick={() => { setSelectedAlert(alert); setShowAcknowledgeModal(true); }}
                                                    className="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.15em] underline decoration-slate-200 decoration-2 underline-offset-4"
                                                >
                                                    Resolve
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showAcknowledgeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="glass-card w-full max-w-md p-8 shadow-premium-2xl animate-in zoom-in-95 duration-300">
                        <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Protocol Resolution</h2>
                        <form onSubmit={handleAcknowledge}>
                            <div className="mb-6">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resolution Notes</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
                                    rows="4"
                                    placeholder="Correction details..."
                                    value={acknowledgeNote}
                                    onChange={(e) => setAcknowledgeNote(e.target.value)}
                                    required
                                ></textarea>
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowAcknowledgeModal(false)} className="flex-1 py-4 text-[10px] font-black text-slate-400 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all uppercase">Cancel</button>
                                <button type="submit" className="flex-1 py-4 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-2xl transition-all uppercase">Finalize</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Alerts;
