import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { MachineService } from "../services/machineService";
import ThresholdModal from "../components/ThresholdModal";
import Skeleton from "../components/Skeleton";

const Thresholds = () => {
    const [machines, setMachines] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState("desc"); // Default to latest first
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const itemsPerPage = 9; // Grid of 3x3 works best for cards

    useEffect(() => {
        fetchMachines();
    }, []);

    const fetchMachines = async () => {
        try {
            setLoading(true);
            const data = await MachineService.getMachines();
            setMachines(Array.isArray(data) ? data : []);
        } catch (err) {
            setError("Failed to fetch machines");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (machine) => {
        setSelectedMachine(machine);
        setIsModalOpen(true);
    };

    useEffect(() => {
        setPage(1);
    }, [searchTerm, sortOrder]);

    const filteredMachines = machines
        .filter(m =>
            m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(m.id).includes(searchTerm)
        )
        .sort((a, b) => {
            if (sortOrder === "asc") {
                return Number(a.id) - Number(b.id);
            } else {
                return Number(b.id) - Number(a.id);
            }
        });

    const totalPages = Math.ceil(filteredMachines.length / itemsPerPage);
    const paginatedMachines = filteredMachines.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <Layout>
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Machine Thresholds</h1>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Configure operating standards</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center text-slate-600 group"
                        title={sortOrder === "asc" ? "Sort Oldest First" : "Sort Latest First"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${sortOrder === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                    </button>

                    <div className="relative w-full md:w-48 text-left">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-bold">{error}</span>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="glass-card p-6 h-[200px] flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <Skeleton className="h-10 w-10 rounded-xl" />
                            </div>
                            <Skeleton className="mt-auto h-12 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedMachines.map((machine) => (
                            <div key={machine.id} className="glass-card p-6 group hover:border-blue-200 transition-all duration-300 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{machine.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">System ID: {machine.id}</span>
                                        </div>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                        </svg>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleEdit(machine)}
                                    className="mt-auto w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 hover:bg-blue-600 hover:shadow-blue-500/20 active:scale-95 transition-all duration-300"
                                >
                                    Set Standards
                                </button>
                            </div>
                        ))}
                        {paginatedMachines.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No machines found matching "{searchTerm}"</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="mt-10 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100">
                            <div className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                Showing <span className="text-slate-800">{(page - 1) * itemsPerPage + 1} - {Math.min(page * itemsPerPage, filteredMachines.length)}</span> of {filteredMachines.length} Machines
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Prev
                                </button>
                                <div className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Page <span className="text-blue-600">{page}</span> / {totalPages}
                                </div>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm flex items-center gap-2"
                                >
                                    Next
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <ThresholdModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                machineId={selectedMachine?.id}
                machineName={selectedMachine?.name}
            />
        </Layout>
    );
};

export default Thresholds;
