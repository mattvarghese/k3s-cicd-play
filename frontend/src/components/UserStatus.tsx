import { useAuth } from '../context/AuthContext';

export const UserStatus = () => {
    const { authenticated, username, login, logout, keycloak } = useAuth();

    if (!authenticated) {
        return (
            <div className="flex gap-4 items-center">
                {/* The New Signup Button */}
                <button
                    onClick={() => keycloak?.register()}
                    className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                >
                    Create Account
                </button>

                <button
                    onClick={login}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-md active:scale-95 transition-all"
                >
                    Log In
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">User</p>
                <p className="text-sm font-medium text-slate-900">{username}</p>
            </div>
            <button
                onClick={logout}
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
            >
                Sign Out
            </button>
        </div>
    );
};