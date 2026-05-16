import { db } from "../data.js";
import { sanitizeUser, signUser } from "../middlewares/auth.js";

export function registerAuthRoutes(app) {
  app.post("/api/auth/login", (req, res) => {
        const { email, password, role } = req.body;
        const user = db.users.find(
          (item) =>
            item.email.toLowerCase() === String(email || "").toLowerCase() &&
            item.password === password &&
            (!role || item.role === role)
        );

        if (!user) {
          return res.status(401).json({ error: "Credenciais invalidas" });
        }

        return res.json({
          token: signUser(user),
          user: sanitizeUser(user)
        });
      });
}
