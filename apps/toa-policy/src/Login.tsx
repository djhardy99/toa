import { Navigate } from "react-router";
import { useAuth } from "./auth.js";
import { Logo } from "./Logo.js";

export function Login() {
  const { user, login } = useAuth();
  if (user) return <Navigate to="/" replace />;

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        // ponytail: fake check, any non-empty username and password signs in. Call the API here.
        const name = String(data.get("username")).trim();
        if (name && data.get("password")) login(name);
      }}
    >
      <h1 className="brand">
        <Logo />
        Sign in to toa-policy
      </h1>
      <label>
        Username
        <input name="username" autoComplete="username" required autoFocus />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="button button-primary">Sign in</button>
    </form>
  );
}
