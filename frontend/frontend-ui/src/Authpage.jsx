import { useState } from "react";
import { mockAuth } from "./mockAuth";

export default function AuthPage({ onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = () => {
    try {
      mockAuth.register(email, password);
      setMessage("Account created (mock)");
      onAuthSuccess();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const handleLogin = () => {
    try {
      mockAuth.login(email, password);
      setMessage("Logged in (mock)");
      onAuthSuccess();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const handleReset = () => {
    try {
      mockAuth.resetPassword(email);
      setMessage("Password reset link sent (mock)");
    } catch (e) {
      setMessage(e.message);
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Mock Authentication</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      <button onClick={handleLogin}>Login</button>{" "}
      <button onClick={handleRegister}>Register</button>{" "}
      <button onClick={handleReset}>Forgot Password</button>

      {message && <p style={{ color: "green" }}>{message}</p>}
    </div>
  );
}
