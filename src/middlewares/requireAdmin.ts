import { Response, NextFunction } from "express";

export const requireAdmin = (req: any, res: Response, next: NextFunction): any => {
  const role = req.user?.role;
  
  if(!req.user) {
    return res.status(401).json({ 
      status: "error", 
      message: "Authentication required. Please login." 
    });
  }

  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ status: "error", message: "Access denied. Admin privileges required." });
  }
  return next();
};

export const requireSuperAdmin = (req: any, res: Response, next: NextFunction): any => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ status: "error", message: "Access denied. Super-admin privileges required." });
  }
  return next();
};
