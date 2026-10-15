
const userRepository = require("../repositories/userRepository");
const { logAccessChange } = require("../services/auditLogger");
const {
  ROLES,
  ASSIGNABLE_ROLES,
  DEFAULT_ROLE
} = require("../config/roles");
const { USER_STATUS } = require("../config/accountRules");

const getManageError = (actor, target) => {
  if (String(actor.id) === String(target.id)) {
    return "No puedes modificar tu propia cuenta.";
  }

  if (
    target.role === ROLES.SUPER_ADMIN &&
    actor.role !== ROLES.SUPER_ADMIN
  ) {
    return "Solo un Super Admin puede modificar esta cuenta.";
  }

  if (target.status === USER_STATUS.PENDING) {
    return "Esta cuenta está pendiente. Primero apruébala o recházala.";
  }

  return null;
};

const listUsers = async (req, res) => {
  const allUsers = (await userRepository.getAll())
    .map(userRepository.toPublic);

  const users = req.user.role === ROLES.SUPER_ADMIN
    ? allUsers
    : allUsers.filter(
        (u) =>
          u.role !== ROLES.SUPER_ADMIN &&
          u.status !== USER_STATUS.PENDING
      );

  res.json({ users });
};

const updateUserRole = async (req, res) => {
  const { role } = req.body;

  if (!ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({
      message: "El rol seleccionado no es válido."
    });
  }

  const target = await userRepository.findById(req.params.id);

  if (!target) {
    return res.status(404).json({
      message: "Usuario no encontrado."
    });
  }

  const manageError = getManageError(req.user, target);

  if (manageError) {
    return res.status(403).json({ message: manageError });
  }

  const previousRole = target.role;
  const user = await userRepository.updateRole(target.id, role);

  if (previousRole !== role) {
    logAccessChange({
      actor: req.user,
      action: "ROLE_CHANGED",
      target: user,
      details: { from: previousRole, to: role }
    });
  }

  res.json({ message: "Rol actualizado.", user });
};

const updateUserStatus = async (req, res) => {
  const { active } = req.body;

  if (typeof active !== "boolean") {
    return res.status(400).json({
      message: "El campo active debe ser true o false."
    });
  }

  const target = await userRepository.findById(req.params.id);

  if (!target) {
    return res.status(404).json({
      message: "Usuario no encontrado."
    });
  }

  const manageError = getManageError(req.user, target);

  if (manageError) {
    return res.status(403).json({ message: manageError });
  }

  const user = await userRepository.setStatus(
    target.id,
    active ? USER_STATUS.ACTIVE : USER_STATUS.DISABLED
  );

  logAccessChange({
    actor: req.user,
    action: active ? "USER_ENABLED" : "USER_DISABLED",
    target: user
  });

  res.json({
    message: active ? "Cuenta habilitada." : "Cuenta deshabilitada.",
    user
  });
};

const findPendingOrFail = async (req, res) => {
  const target = await userRepository.findById(req.params.id);

  if (!target) {
    res.status(404).json({ message: "Solicitud no encontrada." });
    return null;
  }

  if (target.status !== USER_STATUS.PENDING) {
    res.status(409).json({
      message: "Esta cuenta ya no está pendiente."
    });
    return null;
  }

  return target;
};

const approveRequest = async (req, res) => {
  const role = req.body.role || DEFAULT_ROLE;

  if (!ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({
      message: "El rol seleccionado no es válido."
    });
  }

  const target = await findPendingOrFail(req, res);
  if (!target) return;

  await userRepository.updateRole(target.id, role);

  const user = await userRepository.setStatus(
    target.id,
    USER_STATUS.ACTIVE
  );

  logAccessChange({
    actor: req.user,
    action: "REQUEST_APPROVED",
    target: user,
    details: { role }
  });

  res.json({ message: "Solicitud aprobada.", user });
};

const rejectRequest = async (req, res) => {
  const target = await findPendingOrFail(req, res);
  if (!target) return;

  const user = await userRepository.remove(target.id);

  logAccessChange({
    actor: req.user,
    action: "REQUEST_REJECTED",
    target: user,
    details: { email: user.email }
  });

  res.json({ message: "Solicitud rechazada.", user });
};

module.exports = {
  listUsers,
  updateUserRole,
  updateUserStatus,
  approveRequest,
  rejectRequest
};