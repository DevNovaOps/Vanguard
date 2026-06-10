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

    if (!roles.includes(req.user.role)) {
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
