import { useState, useEffect, useContext } from "react";
import Layout from "../components/Layout";
import Skeleton from "../components/Skeleton";
import { ReadingsService } from "../services/readingsService";
import { getStatus, calculateRatio } from "../services/mockData";
import { MachineService } from "../services/machineService";
import { UserService } from "../services/userService";
import { AuthContext } from "../context/AuthContext";

const Records = () => {
    const { user } = useContext(AuthContext);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        machine_id: "",
        status: "",
        start_date: "",
        end_date: ""
    });
    const [machines, setMachines] = useState([]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            // 1. Fetch Full User Details if machine information is missing
            let currentUser = user;
            if (user?.id && user?.rights !== 1 && !user?.requested_machines) {
                try {
                    console.log("Records: Fetching full user details...");
                    const detailRes = await UserService.getUserDetail(user.id);
                    const fullProfile = detailRes.data || detailRes;
                    if (fullProfile) currentUser = { ...user, ...fullProfile };
                } catch (profileErr) {
                    console.error("Failed to fetch full user profile:", profileErr);
                }
            }

            // 2. Determine applied filtering
            const getAssignedId = (u) => {
                const req = u?.requested_machines;
                if (Array.isArray(req) && req.length > 0) {
                    const first = req[0];
                    return String(first.id || first.machine_id || first);
                }
                return req ? String(req) : (u?.machine_id ? String(u.machine_id) : null);
            };

            const assignedId = getAssignedId(currentUser);
            const appliedMachineId = (currentUser?.rights !== 1 && assignedId) ? assignedId : filters.machine_id;

            console.log("Records.jsx: Fetching records with filters:", filters);

            // Fetch a larger batch (500) to allow reliable client-side filtering and pagination
            const response = await ReadingsService.getHistory({
                ...filters,
                status: "", // Backend filter is unreliable
                machine_id: appliedMachineId,
                page: 1, // Fetch all for local pagination
                limit: 500
            });

            console.log("Records.jsx: Raw history response:", response);
            let data = response.data || response.results || (Array.isArray(response) ? response : []);

            // 3. Client-Side Filter by machine (if redundant) and status
            if (filters.status) {
                data = data.filter(record => {
                    const rowAdhesive = Number(record.adhesive_weight ?? record.adhesive ?? 0);
                    const rowResin = Number(record.resin_weight ?? record.resin ?? 0);
                    const rowRatio = record.calculated_ratio !== undefined && record.calculated_ratio !== null
                        ? record.calculated_ratio
                        : calculateRatio(rowAdhesive, rowResin);

                    const status = getStatus(rowRatio);
                    return status.label === filters.status;
                });
            }

            console.log("Records.jsx: Total records after filtering:", data.length);
            setRecords(data);
            setTotalPages(Math.ceil(data.length / 10) || 1);
            setError("");
        } catch (err) {
            console.error("Fetch records error:", err);
            setError("Failed to load records from API.");
        } finally {
            setLoading(false);
        }
    };

    const fetchMachines = async () => {
        try {
            console.log("Records.jsx: Calling MachineService.getMachines()...");
            const data = await MachineService.getMachines();
            console.log("Records.jsx: Machine data received:", data);
            let machineList = Array.isArray(data) ? data : [];

            // 1. Fetch Full User Details if missing (defensive)
            let currentUser = user;
            if (user?.id && user?.rights !== 1 && !user?.requested_machines) {
                try {
                    const detailRes = await UserService.getUserDetail(user.id);
                    const fullProfile = detailRes.data || detailRes;
                    if (fullProfile) currentUser = { ...user, ...fullProfile };
                } catch (e) { }
            }

            // 2. Filter machine list for dropdown if not admin
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
                machineList = machineList.filter(m => String(m.id) === assignedId);
            }
            setMachines(machineList);
        } catch (err) {
            console.error("Records.jsx: Fetch machines error:", err);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [filters]);

    useEffect(() => {
        fetchMachines();
    }, []);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setPage(1);
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString();
    };

    return (

        <Layout>
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Machine Records</h1>
                    <p className="text-[10px] md:text-xs font-semibold text-slate-400 mt-0.5 md:mt-1 uppercase tracking-widest">History of all machine readings</p>
                </div>
                <button
                    onClick={fetchRecords}
                    disabled={loading}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                >
                    {loading ? "Refreshing..." : "Refresh Records"}
                </button>
            </div>

            {/* Filters Section */}
            <div className="glass-card p-4 md:p-6 mb-6 md:mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-end">
                <div className="sm:col-span-2">
                    <label className="block text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 md:mb-2 px-1">Select Machine</label>
                    <select
                        name="machine_id"
                        value={filters.machine_id}
                        onChange={handleFilterChange}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 md:py-3 text-xs md:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none"
                    >
                        <option value="">All Machines</option>
                        {machines.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 md:mb-2 px-1">Status</label>
                    <select
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 md:py-3 text-xs md:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none"
                    >
                        <option value="">All Statuses</option>
                        <option value="Normal">Normal</option>
                        <option value="Warning">Warning</option>
                        <option value="Critical">Critical</option>
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 md:mb-2 px-1">Page</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 p-2.5 md:p-3 rounded-xl transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex-[2] bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-xs md:text-sm font-bold text-slate-600">
                            Page {page}
                        </div>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= totalPages}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 p-2.5 md:p-3 rounded-xl transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>


            {/* Records Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date & Time</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">Machine</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest hide-on-mobile">Operator</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Reading (kg)</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Ratio</th>
                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                [...Array(10)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-20" />
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 hide-on-mobile">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="w-8 h-8 rounded-lg" />
                                                <Skeleton className="h-4 w-24" />
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="flex justify-center gap-4">
                                                <Skeleton className="h-4 w-8" />
                                                <Skeleton className="h-4 w-8" />
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-center">
                                            <Skeleton className="h-8 w-16 rounded-full mx-auto" />
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-right">
                                            <Skeleton className="h-6 w-20 rounded-full ml-auto" />
                                        </td>
                                    </tr>
                                ))
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold italic">No records found matching filters.</td>
                                </tr>
                            ) : (
                                records.slice((page - 1) * 10, page * 10).map((record) => {
                                    // 1. Robust weight and ratio detection
                                    const rowAdhesive = Number(record.adhesive_weight ?? record.adhesive ?? 0);
                                    const rowResin = Number(record.resin_weight ?? record.resin ?? 0);
                                    const rowRatio = record.calculated_ratio !== undefined && record.calculated_ratio !== null
                                        ? record.calculated_ratio
                                        : calculateRatio(rowAdhesive, rowResin);

                                    const status = getStatus(rowRatio);

                                    // 2. Robust machine lookup
                                    const mRef = machines.find(m => String(m.id) === String(record.machine_id));
                                    const machineName = mRef?.name || record.Machine?.name || `ID: ${record.machine_id}`;

                                    // 3. Robust operator identity detection
                                    const operatorName = record.User?.name || record.Operator?.name || record.operator?.name || record.operator_name || "System Agent";
                                    const operatorInitial = operatorName[0] || 'S';

                                    return (
                                        <tr key={record.id || Math.random()} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs md:text-sm font-bold text-slate-700">{new Date(record.timestamp).toLocaleDateString()}</span>
                                                    <span className="text-[10px] md:text-[11px] font-medium text-slate-400 italic">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs md:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{machineName}</span>
                                                    <span className="text-[10px] md:text-[11px] font-bold text-slate-300 uppercase">ID: {record.machine_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4 hide-on-mobile">
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center text-[10px] md:text-[11px] font-bold text-slate-500 border border-white shadow-sm">
                                                        {operatorInitial}
                                                    </div>
                                                    <span className="text-[10px] md:text-xs font-bold text-slate-600 truncate max-w-[80px] md:max-w-none">{operatorName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <div className="flex justify-center items-center gap-2 md:gap-4">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[8px] md:text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Adh</span>
                                                        <span className="text-xs md:text-sm font-bold text-slate-600 text-center">{rowAdhesive}</span>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-100"></div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[8px] md:text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Res</span>
                                                        <span className="text-xs md:text-sm font-bold text-slate-600 text-center">{rowResin}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                                <span className="text-xs md:text-sm font-bold text-blue-600 bg-blue-50/50 border border-blue-100/50 px-3 md:px-4 py-1 md:py-1.5 rounded-full shadow-sm">
                                                    {Number(rowRatio).toFixed(3)}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                                                <span className={`status-badge !text-[10px] md:!text-xs ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                        </tr>

                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Showing page {page} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= totalPages}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Records;
