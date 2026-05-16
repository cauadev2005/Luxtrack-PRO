import jwt from "jsonwebtoken";
import { ROLE_LABELS, db } from "../data.js";

const JWT_SECRET = process.env.JWT_SECRET || "luxtrack-dev-secret";

export function signUser(user) {
  return jwt.sign(
    {
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      driverId: user.driverId
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

export function sanitizeUser(user) {
  return {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    driverId: user.driverId
  };
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.query.token;

  if (!token) {
    return res.status(401).json({ error: "Token ausente" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.users.find((item) => item.id === payload.sub);
    if (!user) {
      return res.status(401).json({ error: "Usuario nao encontrado" });
    }
    req.user = sanitizeUser(user);
    return next();
  } catch {
    return res.status(401).json({ error: "Token invalido" });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Perfil sem permissao para esta acao" });
    }
    return next();
  };
}
