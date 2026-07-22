import { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { Layout, Section } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Appointments } from "./components/Appointments";
import { Patients } from "./components/Patients";
import { Doctors } from "./components/Doctors";
import { Expedientes } from "./components/Expedientes";
import { Treatments } from "./components/Treatments";
import { Promotions } from "./components/Promotions";
import { Reports } from "./components/Reports";
import { Schedule } from "./components/Schedule";
import { Settings } from "./components/Settings";
import { UserManagement } from "./components/UserManagement";
import { validateToken } from "../services/api";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null);
  const [section, setSection] = useState<Section>("dashboard");
  const [settingsTab, setSettingsTab] = useState<"clinica" | "perfil" | "notificaciones" | "seguridad">("clinica");
  const [isSettingUp, setIsSettingUp] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      validateToken().then((res) => {
        if (res) {
          setUser(res);
          setLoggedIn(true);
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
        setIsSettingUp(false);
      });
    } else {
      setIsSettingUp(false);
    }
  }, []);

  function navigateTo(s: Section) { setSection(s); }
  function openProfile() { setSettingsTab("perfil"); setSection("settings"); }

  if (isSettingUp) {
    return <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">Cargando...</div>;
  }

  if (!loggedIn || !user) {
    return (
      <div style={{ position: 'relative' }}>
        <Login onLogin={(u) => { setUser(u); setLoggedIn(true); }} />
      </div>
    );
  }

  return (
    <Layout active={section} onNavigate={navigateTo} onLogout={() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setLoggedIn(false);
      setUser(null);
    }} onEditProfile={openProfile} userRole={user.role}>
      {section === "dashboard" && <Dashboard onNavigate={navigateTo} />}
      {section === "appointments" && <Appointments />}
      {section === "patients" && <Patients />}
      {section === "doctores" && <Doctors />}
      {section === "expedientes" && <Expedientes />}
      {section === "treatments" && <Treatments />}
      {section === "promotions" && <Promotions />}
      {section === "reports" && <Reports onNavigate={navigateTo} />}
      {section === "schedule" && <Schedule />}
      {section === "settings" && <Settings defaultTab={settingsTab} />}
      {section === "users" && user.role === "Developer" && <UserManagement />}
    </Layout>
  );
}
