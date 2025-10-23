import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/User Authentication/Login";
import Register from "./pages/User Authentication/Register";
import Dashboard from "./pages/User/Dashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import ProjectSentencesReview from "./pages/Admin/ProjectSentencesReview"; 
import AdminApprovalList from "./pages/Admin/AdminApprovalList";
import AnalyticsDashboard from "./pages/Admin/AnalyticsDashboard"; 
import ForgotPassword from "./pages/User Authentication/ForgotPassword";
import ResetPassword from "./pages/User Authentication/ResetPassword";
import ReviewerDashboard from './pages/Reviewer/ReviewerDashboard';
import SentenceReviewPanel from './pages/Reviewer/SentenceReviewPanel';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* 1. Root Path Redirect: Redirects the base URL to the /login page for consistency. */}
                <Route path="/" element={<Navigate replace to="/login" />} /> 
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* 2. User Dashboard */}
                <Route path="/dashboard/:username" element={<Dashboard />} />
                <Route path="/admin/:username/approvals" element={<AdminApprovalList />} />
                 <Route path="/admin/:username/analytics" element={<AnalyticsDashboard />} />
                {/* 3. Admin Dashboard Routes */}
                
                {/* Base Admin Dashboard (Use a single, clean route for consistency) */}
                <Route path="/admin/:username" element={<AdminDashboard />} /> 
                
                <Route 
                    path="/admin/:username/project/:projectId/user/:targetUsername/sentences" 
                    element={<ProjectSentencesReview />} 
                />

                {/* REVIEWER ROUTES */}
                <Route path="/reviewer/:username" element={<ReviewerDashboard />} />
                <Route 
                path="/reviewer/:username/project/:projectId/user/:targetUsername" 
                element={<SentenceReviewPanel />} 
                />


            </Routes>
        </BrowserRouter>
    );
}

export default App;