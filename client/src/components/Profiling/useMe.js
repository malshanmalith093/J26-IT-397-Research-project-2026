import { useEffect, useState } from 'react';
import { whoAmI, errorMessage } from './adviceApi';

/** Current user from the Python service: { id, name, email, role, is_staff, student_id }. */
export default function useMe() {
    const [me, setMe] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        whoAmI()
            .then((u) => alive && setMe(u))
            .catch((err) => alive && setError(errorMessage(err)));
        return () => {
            alive = false;
        };
    }, []);

    return { me, error, loading: !me && !error };
}
