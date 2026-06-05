import { useState } from "react";
import { useTranslation } from "react-i18next";

function AuthView({
  role,
  allowSignup,
  onBack,
  onLogin,
  onSignup,
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const isSignup = mode === "signup";
  const roleLabel = t(`common.roles.${role}`);

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
      <h1>{t("auth.accessTitle", { role: roleLabel })}</h1>

      <p className="login-subtitle">
        {role === "moderator"
          ? t("auth.moderatorSubtitle")
          : t("auth.defaultSubtitle")}
      </p>

      <form onSubmit={handleSubmit} className="form auth-form">
        {isSignup && (
          <>
            <label htmlFor={`${role}-name`}>{t("auth.name")}</label>
            <input
              id={`${role}-name`}
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </>
        )}

        <label htmlFor={`${role}-email`}>{t("auth.email")}</label>
        <input
          id={`${role}-email`}
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label htmlFor={`${role}-password`}>{t("auth.password")}</label>
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
          {isSignup ? t("auth.createAccount") : t("auth.login")}
        </button>
      </form>

      {allowSignup && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => setMode(isSignup ? "login" : "signup")}
        >
          {isSignup
            ? t("auth.alreadyHaveAccount")
            : t("auth.createAccountAs", { role: roleLabel })}
        </button>
      )}

      <button
        type="button"
        className="public-back-button"
        onClick={onBack}
      >
        {t("common.back")}
      </button>
    </section>
  );
}

export default AuthView;
