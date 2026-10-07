module.exports = function (roles = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No user. Authorization denied.' });
        }

        const reqRole = req.user.role ? req.user.role.toLowerCase() : '';
        const allowedRoles = roles.map(r => r.toLowerCase());

        // Also check if they might have a globalRole in the token, just in case
        const reqGlobalRole = req.user.globalRole ? req.user.globalRole.toLowerCase() : '';

        if (roles.length && !allowedRoles.includes(reqRole) && !allowedRoles.includes(reqGlobalRole)) {
            return res.status(403).json({ message: 'Forbidden. You do not have the required role to perform this action.' });
        }

        next();
    };
};
