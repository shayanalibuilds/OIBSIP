const KeepAuth = (() => {
  const USERS = "keep-users";
  const SESSION = "keep-session";

  function users() {
    try {
      return JSON.parse(localStorage.getItem(USERS)) ?? [];
    } catch {
      return [];
    }
  }

  function saveUsers(list) {
    localStorage.setItem(USERS, JSON.stringify(list));
  }

  async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function validPassword(password) {
    return password.length >= 8 && /\d/.test(password);
  }

  async function register(email, password) {
    if (!email || !password) {
      return { ok: false, message: "Fill in every field." };
    }
    if (!validPassword(password)) {
      return { ok: false, message: "Use 8+ characters and at least one number." };
    }
    const list = users();
    if (list.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, message: "That email is already registered." };
    }
    const passwordHash = await hashPassword(password);
    list.push({ email, passwordHash });
    saveUsers(list);
    localStorage.setItem(SESSION, JSON.stringify({ email }));
    return { ok: true };
  }

  async function login(email, password) {
    if (!email || !password) {
      return { ok: false, message: "Fill in every field." };
    }
    const passwordHash = await hashPassword(password);
    const user = users().find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (!user || user.passwordHash !== passwordHash) {
      return { ok: false, message: "Those details do not match our records." };
    }
    localStorage.setItem(SESSION, JSON.stringify({ email: user.email }));
    return { ok: true };
  }

  function session() {
    try {
      return JSON.parse(localStorage.getItem(SESSION));
    } catch {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem(SESSION);
  }

  return { register, login, session, logout };
})();
