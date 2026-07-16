import { useState } from "react";
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


export default function App() {
  const [loggedIn, setLoggedIn]       = useState(false);
  const [section, setSection]         = useState<Section>("dashboard");
  const [settingsTab, setSettingsTab] = useState<"clinica"|"perfil"|"notificaciones"|"seguridad">("clinica");
  const [isSettingUp, setIsSettingUp] = useState(false);

  function navigateTo(s: Section) { setSection(s); }
  function openProfile() { setSettingsTab("perfil"); setSection("settings"); }



  if (!loggedIn) {
    return (
      <div style={{ position: 'relative' }}>
        <Login onLogin={() => setLoggedIn(true)} />
      </div>
    );
  }

  return (
    <Layout active={section} onNavigate={navigateTo} onLogout={() => setLoggedIn(false)} onEditProfile={openProfile}>
      {section === "dashboard"    && <Dashboard onNavigate={navigateTo} />}
      {section === "appointments" && <Appointments />}
      {section === "patients"     && <Patients />}
      {section === "doctores"     && <Doctors />}
      {section === "expedientes"  && <Expedientes />}
      {section === "treatments"   && <Treatments />}
      {section === "promotions"   && <Promotions />}
      {section === "reports"      && <Reports onNavigate={navigateTo} />}
      {section === "schedule"     && <Schedule />}
      {section === "settings"     && <Settings defaultTab={settingsTab} />}
    </Layout>
  );
}
