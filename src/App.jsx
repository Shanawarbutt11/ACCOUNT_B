import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MachineDetails from "./pages/MachineDetails";
import Records from "./pages/Records";
import Alerts from "./pages/Alerts";
import Users from "./pages/Users";
import Thresholds from "./pages/Thresholds";
import Profile from "./pages/Profile";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/machine/:id"
        element={
          <ProtectedRoute>
            <MachineDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records"
        element={
          <ProtectedRoute>
            <Records />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/thresholds"
        element={
          <ProtectedRoute>
            <Thresholds />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
