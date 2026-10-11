import {
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react';

import {
    me,
    verifyCode,
    logout as logoutApi,
    verifyOtp
} from '../api.js';
import { useNavigate } from 'react-router-dom';

const Ctx = createContext(null);

export const useAuth = () => {
    const context = useContext(Ctx);

    if (!context) {
        throw new Error(
            'useAuth must be used inside <AuthProvider>'
        );
    }

    return context;
};

export function AuthProvider({ children }) {
    const [status, setStatus] = useState('loading');
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    /*
     * Check authentication once when the application starts.
     */
    useEffect(() => {
        let mounted = true;

        const checkAuth = async () => {
            try {
                const response = await me();

                if (!mounted) return;

                setUser(response.data.user);
                setStatus('authed');
            } catch (error) {
                if (!mounted) return;

                setUser(null);
                setStatus('guest');
            }
        };

        checkAuth();

        /*
         * Backend/API tells us that the JWT has expired
         * or is no longer valid.
         */
        const handleExpired = () => {
            if (!mounted) return;

            setUser(null);
            setStatus('guest');
        };

        window.addEventListener(
            'auth:expired',
            handleExpired
        );

        return () => {
            mounted = false;

            window.removeEventListener(
                'auth:expired',
                handleExpired
            );
        };
    }, []);

    /*
     * Login
     *
     * The JWT is NOT returned to React.
     * Backend sets it as an HttpOnly cookie.
     */
    const login = async (code) => {
        const response = await verifyCode(code);

        // console.log(response.data.user.id)

        setUser(response.data.user);
        setStatus('authed');

        return response.data;
    };

    /*
     * Logout
     */
    const logout = async () => {
        try {
            await logoutApi();
        } finally {
            setUser(null);
            setStatus(null);
            navigate('/');

        }
    };

    const verifyOTP = async (email , otp) => {
        const response = await verifyOtp(email , otp);

        // console.log(response.data.user.id)

        setUser(response.data.user);
        setStatus('authed');

        return response.data;
    }

    const value = {
        status,
        user,
        isAuthenticated: status === 'authed',
        isLoading: status === 'loading',
        login,
        logout,
        verifyOTP
    };

    return (
        <Ctx.Provider value={value}>
            {children}
        </Ctx.Provider>
    );
}