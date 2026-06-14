const normalizeRole = (role) => (role || '').toLowerCase().replace(/_/g, '');

/**
 * Role-based authorization guard.
 * Restricts route access to specified roles (e.g. Admin, SafetyOfficer, Manager, Operator).
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access. Authentication profile not resolved.'
      });
    }

    const userRoleNorm = normalizeRole(req.user.role);
    const authorizedNorm = roles.map(r => normalizeRole(r));

    if (!authorizedNorm.includes(userRoleNorm)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden access. Role '${req.user.role}' is not authorized to perform this operation.`
      });
    }

    next();
  };
};

// Alias for standard naming conventions
export const authorizeRoles = authorize;
