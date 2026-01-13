import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ROLES } from "../services/mockData";

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { user } = useContext(AuthContext);

    const navItems = [
        {
            label: "Dashboard", path: "/dashboard", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                </svg>
            )
        },
        {
            label: "Records", path: "/records", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            )
        },
        {
            label: "Alerts", path: "/alerts", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            )
        },
    ];

    if (user?.role === ROLES.ADMIN || user?.role === ROLES.SPECIALIST) {
        navItems.push({
            label: "Threshold", path: "/thresholds", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
            )
        });
    }

    if (user?.role === ROLES.ADMIN) {
        navItems.push({
            label: "Users", path: "/users", icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 15.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        });
    }

    return (
        <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col h-screen z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-10 px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="text-xl font-bold italic text-white">A</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-800 uppercase">Adhesive</span>
                    </div>
                    {/* Close Button Mobile */}
                    <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <nav className="space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsOpen(false)} // Close on navigation in mobile
                            className={({ isActive }) =>
                                `premium-sidebar-item ${isActive ? 'sidebar-active shadow-sm border-l-4 border-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`
                            }
                        >
                            <span className="mr-3">{item.icon}</span>
                            <span className="text-sm font-semibold">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-6 border-t border-slate-100">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">User Account</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">{user?.role}</p>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
