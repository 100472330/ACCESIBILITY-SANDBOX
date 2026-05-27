import { useState } from "react";

function AuthView({
  role,
  allowSignup,
  onBack,
  onLogin,
  onSignup,
}) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const isSignup = mode === "signup";

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSignup) {
      await onSignup({
        name: form.name,
        email: form.email,
        password: form.password,
        role,
      });
    } else {
      await onLogin({
        email: form.email,
        password: form.password,
      });
    }
  }

  return (
    <section className="card login-card">
      <h1>Acceso {role}</h1>

      <p className="login-subtitle">
        {role === "moderator"
          ? "Acceso reservado a moderadores autorizados."
          : "Inicia sesión o crea una cuenta para acceder a la plataforma."}
      </p>

      <form onSubmit={handleSubmit} className="form auth-form">
        {isSignup && (
          <>
            <label htmlFor={`${role}-name`}>Nombre</label>
            <input
              id={`${role}-name`}
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </>
        )}

        <label htmlFor={`${role}-email`}>Email</label>
        <input
          id={`${role}-email`}
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label htmlFor={`${role}-password`}>Contraseña</label>
        <input
          id={`${role}-password`}
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
        />

        <button type="submit">
          {isSignup ? "Crear cuenta" : "Iniciar sesión"}
        </button>
      </form>

      {allowSignup && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => setMode(isSignup ? "login" : "signup")}
        >
          {isSignup
            ? "Ya tengo cuenta"
            : `Crear cuenta como ${role}`}
        </button>
      )}

      <button
        type="button"
        className="public-back-button"
        onClick={onBack}
      >
        Volver
      </button>
    </section>
  );
}

export default AuthView;