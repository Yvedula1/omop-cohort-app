import { useState } from "react";
import Dashboard from "./Dashboard";
import AuthPage from "./Authpage";
import { mockAuth } from "./mockAuth";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(mockAuth.isLoggedIn());

  return (
    <>
      {loggedIn ? (
        <Dashboard onLogout={() => {
          mockAuth.logout();
          setLoggedIn(false);
        }} />
      ) : (
        <AuthPage onAuthSuccess={() => setLoggedIn(true)} />
      )}
    </>
  );
}
