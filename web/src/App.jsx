import { Routes, Route } from 'react-router-dom';
import { NavBar } from './components/NavBar.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Home } from './pages/Home.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { Account } from './pages/Account.jsx';
import { Booking } from './pages/Booking.jsx';
import { Appointments } from './pages/Appointments.jsx';

function App() {
  return (
    <>
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/compte"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reserver"
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mes-rendez-vous"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </>
  );
}

export default App;
