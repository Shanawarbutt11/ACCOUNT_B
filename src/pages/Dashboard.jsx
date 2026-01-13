import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ReadingsService } from "../services/readingsService";
import { MachineService } from "../services/machineService";
import { UserService } from "../services/userService";
import { calculateRatio, getStatus } from "../services/mockData";
import { AuthContext } from "../context/AuthContext";
import Skeleton from "../components/Skeleton";

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [machineData, setMachineData] = useState([]);
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchSummary = async () => {
        try {
            setLoading(true);

            // 1. Fetch Full User Details if machine information is missing (for non-admins)
            let currentUser = user;
            if (user?.id && user?.rights !== 1) {
                try {
                    console.log("Dashboard: Fetching full user details for ID:", user.id);
                    const detailRes = await UserService.getUserDetail(user.id);
                    const fullProfile = detailRes.data || detailRes;
                    if (fullProfile) {
                        currentUser = { ...user, ...fullProfile };
                        window.fullProfileDebug = fullProfile;
                    } else {
                        window.fullProfileDebug = "EMPTY_RESPONSE";
                    }
                } catch (profileErr) {
                    console.error("Failed to fetch full user profile:", profileErr);
                    window.fullProfileDebug = "ERROR: " + profileErr.message;
                }
            }

            // 2. Parallel fetch machines and latest records
            const [historyRes, machinesData] = await Promise.all([
                ReadingsService.getHistory({ limit: 100 }),
                MachineService.getMachines()
            ]);

            // Process History and Machines
            const historyArray = historyRes.data || historyRes.results || (Array.isArray(historyRes) ? historyRes : []);
            let machinesArray = Array.isArray(machinesData) ? machinesData : [];

            // 3. Role-based filtering using the most complete user data
            const getAssignedId = (u) => {
                const req = u?.requested_machines;
                if (Array.isArray(req) && req.length > 0) {
                    // It might be an array of objects: [{id: 1, name: '...'}, ...]
                    const first = req[0];
                    return String(first.id || first.machine_id || first);
                }
                return req ? String(req) : (u?.machine_id ? String(u.machine_id) : null);
            };

            const assignedId = getAssignedId(currentUser);
            window.debugAssignedId = assignedId; // Update global for overlay

            if (currentUser?.rights !== 1 && assignedId) {
                console.log("Dashboard: Filtering for machine:", assignedId);
                machinesArray = machinesArray.filter(m => String(m.id) === assignedId);
            }

            setMachines(machinesArray);

            // 4. Merge Data for display (Summaries)
            const summaryRes = await ReadingsService.getSummary();
            const summaryArray = summaryRes.data || summaryRes.results || (Array.isArray(summaryRes) ? summaryRes : []);

            const mergedPlusFiltered = machinesArray
                .map(m => {
                    const summary = summaryArray.find(s => String(s.machine_id || s.id) === String(m.id)) || {};
                    const latestFromHistory = historyArray.find(h => String(h.machine_id) === String(m.id)) || {};
                    return {
                        ...summary,
                        ...latestFromHistory,
                        machine_id: m.id,
                        machine_name: m.name
                    };
                })
                .filter(m => m.timestamp)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            setMachineData(mergedPlusFiltered);
            setError("");
        } catch (err) {
            console.error("Dashboard fetch error:", err);
            setError("Failed to load dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
        const interval = setInterval(fetchSummary, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, [user]);

    if (loading && machineData.length === 0) {
        return (
            <Layout>
                <div className="mb-6 md:mb-8">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="glass-card p-6 h-[250px] flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                            <div className="mt-auto space-y-4">
                                <div className="flex justify-between">
                                    <div className="space-y-2">
                                        <Skeleton className="h-3 w-12" />
                                        <Skeleton className="h-5 w-16" />
                                    </div>
                                    <div className="space-y-2 flex flex-col items-end">
                                        <Skeleton className="h-3 w-12" />
                                        <Skeleton className="h-5 w-16" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-6 w-12" />
                                    </div>
                                    <Skeleton className="h-1.5 w-full rounded-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Machine Overview</h1>
                    <p className="text-[10px] md:text-xs font-semibold text-slate-400 mt-0.5 md:mt-1 uppercase tracking-widest">Real-time status of all nodes</p>
                </div>
                {error && <span className="text-red-500 text-xs md:text-sm font-bold bg-red-50 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-red-100 w-fit">{error}</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">

                {machineData.map((machine) => {
                    // 1. Robust weight detection
                    const adhesive = Number(machine.adhesive_weight ?? machine.adhesive ?? machine.last_adhesive ?? machine.latest_adhesive ?? machine.total_adhesive ?? 0);
                    const resin = Number(machine.resin_weight ?? machine.resin ?? machine.last_resin ?? machine.latest_resin ?? machine.total_resin ?? 0);

                    // 2. Prioritize API-calculated ratio (if valid number)
                    let ratio;
                    if (machine.calculated_ratio !== undefined && machine.calculated_ratio !== null) {
                        ratio = machine.calculated_ratio;
                    } else {
                        ratio = calculateRatio(adhesive, resin);
                    }

                    const status = getStatus(ratio);

                    // 3. Robust machine ID/Name logic
                    const machineId = machine.machine_id || machine.id;
                    const mRef = machines.find(m => String(m.id) === String(machineId));
                    const machineName = mRef?.name || machine.Machine?.name || machine.machine_name || `ID: ${machineId}`;

                    return (
                        <div
                            key={machineId}
                            onClick={() => navigate(`/machine/${machineId}`)}
                            className="glass-card p-6 cursor-pointer group transition-all duration-500 hover:-translate-y-2 hover:shadow-premium-lg border-t-0 relative overflow-hidden flex flex-col h-full"
                        >
                            {/* Accent Glow */}
                            <div
                                className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 transition-opacity group-hover:opacity-20 pointer-events-none ${status.label === "Normal" ? "bg-emerald-500" :
                                    status.label === "Warning" ? "bg-amber-500" :
                                        "bg-rose-500"
                                    }`}
                            ></div>

                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                        {machineName}
                                    </h3>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Live Updates</p>
                                </div>
                                <span
                                    className={`status-badge ${status.color}`}
                                >
                                    {status.label}
                                </span>
                            </div>

                            <div className="space-y-4 relative z-10 mt-auto">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Adhesive</span>
                                        <span className="text-lg font-bold text-slate-700">{adhesive} <span className="text-xs font-bold text-slate-400">kg</span></span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Resin</span>
                                        <span className="text-lg font-bold text-slate-700">{resin} <span className="text-xs font-bold text-slate-400">kg</span></span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100/50">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">Mix Ratio</span>
                                        <span className="text-xl font-bold text-gradient">
                                            {ratio}
                                        </span>
                                    </div>
                                    {/* Small micro-progress bar for ratio visualization */}
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000"
                                            style={{ width: `${Math.min(Math.max(parseFloat(ratio) * 100 - 50, 0), 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Layout>
    );
};

export default Dashboard;
