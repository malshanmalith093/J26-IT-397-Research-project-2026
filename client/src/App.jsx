/**
 * Main Application Component
 * Sets up routing, protected routes, and the overall layout structure.
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import OptimalPath from './pages/OptimalPath';
import RiskAssessment from './pages/RiskAssessment';
import Resources from './pages/Resources';
import Profiling from './pages/Profiling';
import GroupDetails from './pages/GroupDetails';
import Example from './pages/Example';



/**
 * ProtectedRoute Component
 * Redirects unauthenticated users to the login page.
 */
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Auth />} />

                {/* Protected Routes inside DashboardLayout */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout title="Dashboard" />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                </Route>

                <Route
                    path="/Example"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout title="my experiments" />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Example />} />
                    
                </Route>

                <Route
                    path="/groups"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout title="Groups" />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Groups />} />
                    <Route path=":id" element={<GroupDetails />} />
                </Route>

                <Route
                    path="/OptimalPath"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout title="Personalized Learning Path Optimization" />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<OptimalPath />} />
                    
                </Route>

                  <Route
                    path="/RiskAssessment"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout title="Predictive academic Risk Assessment" />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<RiskAssessment />} />
                    
                </Route>

                <Route
                    path="/Profiling"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout title="Adaptive Learning Behavior Profiling" />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Profiling />} />
                    
                </Route>

                <Route
                    path="/Resources"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout title="Educational Resource Recommendation" />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Resources />} />
                    
                </Route>

                

                


                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
