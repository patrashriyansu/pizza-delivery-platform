import {createContext,useContext,useMemo,useState} from 'react';
const AuthContext=createContext(null);
export function AuthProvider({children}){const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('slice_user'))}catch{return null}}); const login=(data)=>{localStorage.setItem('slice_token',data.token);localStorage.setItem('slice_user',JSON.stringify(data.user));setUser(data.user)}; const logout=()=>{localStorage.removeItem('slice_token');localStorage.removeItem('slice_user');setUser(null)}; const value=useMemo(()=>({user,login,logout}),[user]);return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>}
export const useAuth=()=>useContext(AuthContext);
