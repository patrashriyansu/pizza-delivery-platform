import jwt from 'jsonwebtoken';
import User from '../models/User.js';
export async function protect(req,res,next){
  try { const h=req.headers.authorization||''; const token=h.startsWith('Bearer ')?h.slice(7):null; if(!token) return res.status(401).json({message:'Authentication required'});
    const decoded=jwt.verify(token,process.env.JWT_SECRET); const user=await User.findById(decoded.sub); if(!user) return res.status(401).json({message:'Session is invalid'}); req.user=user; next();
  } catch { return res.status(401).json({message:'Session is invalid or expired'}); }
}
export const adminOnly=(req,res,next)=>req.user?.role==='admin'?next():res.status(403).json({message:'Admin access required'});
