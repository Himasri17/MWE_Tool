import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProjectSentencesReview from "./pages/ProjectSentencesReview"; 
import AdminApprovalList from "./pages/AdminApprovalList";
import AnalyticsDashboard from "./pages/AnalyticsDashboard"; 
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ReviewerDashboard from './pages/ReviewerDashboard';
import SentenceReviewPanel from './pages/SentenceReviewPanel';

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

                {/* NEW REVIEWER ROUTES */}
                <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
                <Route 
                path="/reviewer/:username/project/:projectId/user/:targetUsername" 
                element={<SentenceReviewPanel />} 
                />


            </Routes>
        </BrowserRouter>
    );
}

export default App;