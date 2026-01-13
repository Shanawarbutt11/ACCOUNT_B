import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import MeterGraph from "../components/MeterGraph";
import { ReadingsService } from "../services/readingsService";
import { MachineService } from "../services/machineService";
import { UserService } from "../services/userService";
import { getStatus, calculateRatio } from "../services/mockData";
import { AuthContext } from "../context/AuthContext";
import ThresholdModal from "../components/ThresholdModal";
import Skeleton from "../components/Skeleton";

const MachineDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [records, setRecords] = useState([]);
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [verifying, setVerifying] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const checkAccess = async () => {
            // Check if user is Admin (1)
            if (user?.rights === 1) {
                setIsAuthorized(true);
                setVerifying(false);
                return;
            }

            let currentUser = user;
            if (user?.id && !user?.requested_machines) {
                try {
                    const detailRes = await UserService.getUserDetail(user.id);
                    const fullProfile = detailRes.data || detailRes;
                    if (fullProfile) currentUser = { ...user, ...fullProfile };
                } catch (e) {
                    console.error("Auth verification failed:", e);
                }
            }

            const getAssignedId = (u) => {
                const req = u?.requested_machines;
                if (Array.isArray(req) && req.length > 0) {
                    const first = req[0];
                    return String(first.id || first.machine_id || first);
                }
                return req ? String(req) : (u?.machine_id ? String(u.machine_id) : null);
            };

            const assignedId = getAssignedId(currentUser);
            const authorized = assignedId && String(assignedId) === String(id);
            setIsAuthorized(authorized);
            setVerifying(false);

            if (!authorized) {
                navigate("/dashboard");
            }
        };

        checkAccess();
    }, [user, id, navigate]);

    useEffect(() => {
        if (verifying || !isAuthorized) return;

        const fetchData = async () => {
            try {
                // Fetch last 20 records and full machine list in parallel
                const [historyData, machinesData] = await Promise.all([
                    ReadingsService.getHistory({ machine_id: id, limit: 20 }),
                    MachineService.getMachines()
                ]);

                setRecords(historyData.data || historyData.results || (Array.isArray(historyData) ? historyData : []));
                setMachines(Array.isArray(machinesData) ? machinesData : []);
            } catch (err) {
                console.error("Machine details fetch error:", err);
                setError("Failed to load machine data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000); // ADDED: Auto-refresh
        return () => clearInterval(interval);
    }, [id, isAuthorized, navigate]);

    // Check if user is Admin (1) or Power User (2)
    const canConfigure = user?.rights === 1 || user?.rights === 2;

    if (loading || verifying) {
        return (
            <Layout>
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-12 w-48 rounded-2xl" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-card p-6 h-[180px] flex flex-col justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                        <div className="glass-card p-6 h-[180px] flex flex-col justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        <div className="glass-card p-8 h-[400px]">
                            <div className="flex justify-between mb-8">
                                <Skeleton className="h-6 w-48" />
                                <div className="flex gap-4">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </div>
                            <Skeleton className="h-[250px] w-full rounded-2xl" />
                        </div>
                    </div>
                </div>

                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-slate-100 italic font-black text-[11px] text-slate-400 uppercase tracking-widest">
                        Fetching Historical Telemetry...
                    </div>
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex justify-between items-center py-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || records.length === 0) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{error || "Machine Not Found"}</h2>
                    <p className="text-sm font-medium text-slate-400 mb-8">The requested node is unavailable or has no historical data.</p>
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </Layout>
        );
    }

    const latestRecord = records[0];

    // Robust weight detection for latest record
    const latestAdhesive = Number(latestRecord?.adhesive_weight ?? latestRecord?.adhesive ?? latestRecord?.last_adhesive ?? 0);
    const latestResin = Number(latestRecord?.resin_weight ?? latestRecord?.resin ?? latestRecord?.last_resin ?? 0);

    // Robust ratio calculation for current status
    const currentRatio = latestRecord?.calculated_ratio !== undefined && latestRecord?.calculated_ratio !== null
        ? Number(latestRecord.calculated_ratio)
        : calculateRatio(latestAdhesive, latestResin);

    const status = getStatus(currentRatio);

    // Robust machine name lookup
    const mRef = machines.find(m => String(m.id) === String(id));
    const machineName = mRef?.name || latestRecord?.Machine?.name || `Node ${id}`;

    return (
        <Layout>
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight truncate">{machineName}</h2>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                        <span className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">Machine ID: {id}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] md:text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Live Updates Active</span>
                    </div>
                </div>

                <div className={`status-badge !text-xs md:!text-sm !px-4 md:!px-6 !py-1.5 md:!py-2 ${status.color} shadow-sm border border-slate-100/50 w-fit`}>
                    Status: {status.label}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8">

                {/* Performance Meter */}
                <div className="lg:col-span-2 glass-card p-0 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100/50 bg-slate-50/30 flex justify-between items-center">
                        <div>
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Machine Stats</h3>
                            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Real-time status tracking</p>
                        </div>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-10 min-h-[350px]">
                        <MeterGraph ratio={currentRatio} />
                    </div>
                </div>

                {/* Current Status Sidebar */}
                <div className="glass-card p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-6 px-1">Current Payload</h3>

                        <div className="space-y-6">
                            <div className="p-5 rounded-3xl bg-blue-50/50 border border-blue-100/50 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <span className="text-[11px] font-bold text-blue-500 uppercase tracking-widest">Active Adhesive</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-2xl font-bold text-slate-800">{latestAdhesive}</span>
                                    <span className="text-xs font-semibold text-slate-400 italic">kg</span>
                                </div>
                            </div>

                            <div className="p-5 rounded-3xl bg-indigo-50/50 border border-indigo-100/50 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Current Resin</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-2xl font-bold text-slate-800">{latestResin}</span>
                                    <span className="text-xs font-semibold text-slate-400 italic">kg</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100/50 flex flex-col gap-3">
                        {canConfigure && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                Adjust Thresholds
                            </button>
                        )}
                        <button className="w-full bg-white text-slate-600 border border-slate-200 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
                            Export Log History
                        </button>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-100/50 bg-slate-50/30 flex justify-between items-center">
                    <h3 className="text-[10px] md:text-xs font-bold text-slate-800 uppercase tracking-widest">Cycle Record Stream</h3>
                    <div className="flex items-center gap-2 text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-200 animate-pulse"></span>
                        Last 20 Samples
                    </div>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date & Time</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">Operator</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Payload (kg)</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center hide-on-mobile">Ratio</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Cycle Health</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-50">
                            {records.map((record, index) => {
                                const rowAdhesive = Number(record.adhesive_weight ?? record.adhesive ?? record.last_adhesive ?? 0);
                                const rowResin = Number(record.resin_weight ?? record.resin ?? record.last_resin ?? 0);
                                const rowRatio = record.calculated_ratio !== undefined && record.calculated_ratio !== null
                                    ? Number(record.calculated_ratio)
                                    : calculateRatio(rowAdhesive, rowResin);
                                const rowStatus = getStatus(rowRatio);

                                return (
                                    <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs md:text-sm font-bold text-slate-700">{new Date(record.timestamp).toLocaleDateString()}</span>
                                                <span className="text-[10px] md:text-[11px] font-medium text-slate-400 italic uppercase">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                {/* Robust operator identity detection */}
                                                {(() => {
                                                    const opName = record.User?.name || record.Operator?.name || record.operator?.name || record.operator_name || "System Agent";
                                                    const opInitial = opName[0] || 'S';
                                                    return (
                                                        <>
                                                            <div className="w-6 h-6 md:w-7 md:h-7 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-[9px] md:text-[11px] font-bold text-slate-400 shadow-sm group-hover:border-blue-200 group-hover:text-blue-500 transition-all">
                                                                {opInitial}
                                                            </div>
                                                            <span className="text-[10px] md:text-xs font-bold text-slate-600 truncate max-w-[60px] md:max-w-none">{opName}</span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                            <div className="flex justify-center items-center gap-2 md:gap-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] md:text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Adh</span>
                                                    <span className="text-xs md:text-sm font-bold text-slate-600">{rowAdhesive}</span>
                                                </div>
                                                <div className="w-px h-6 bg-slate-100"></div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] md:text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Res</span>
                                                    <span className="text-xs md:text-sm font-bold text-slate-600">{rowResin}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-center hide-on-mobile">
                                            <span className="text-xs md:text-sm font-bold text-slate-800 bg-slate-50 border border-slate-100 px-3 md:px-4 py-1 md:py-1.5 rounded-full">
                                                {Number(rowRatio).toFixed(3)}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                            <span className={`status-badge !text-[10px] md:!text-xs ${rowStatus.color}`}>
                                                {rowStatus.label}
                                            </span>
                                        </td>
                                    </tr>

                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <ThresholdModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                machineId={id}
                machineName={machineName}
            />
        </Layout>
    );
};

export default MachineDetails;
