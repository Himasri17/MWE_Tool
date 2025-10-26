// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage"; // Import HomePage
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
import UserLogbook from "./pages/Admin/UserLogBook";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                
                <Route path="/" element={<HomePage />} />
                
                {/* 2. Authentication Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* 3. User Dashboard */}
                <Route path="/dashboard/:username" element={<Dashboard />} />
                <Route path="/admin/:username/approvals" element={<AdminApprovalList />} />
                <Route path="/admin/:username/analytics" element={<AnalyticsDashboard />} />
                
                {/* 4. Admin Dashboard Routes */}
                <Route path="/admin/:username" element={<AdminDashboard />} /> 
                <Route path="/admin/:username/logbook" element={<UserLogbook />} />
                <Route 
                    path="/admin/:username/project/:projectId/user/:targetUsername/sentences" 
                    element={<ProjectSentencesReview />} 
                />

                {/* 5. Reviewer Routes */}
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