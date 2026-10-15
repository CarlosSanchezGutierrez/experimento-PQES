const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  DIRECTOR: "DIRECTOR",
  GERENTE: "GERENTE",
  AUDITOR: "AUDITOR",
  JEFATURA: "JEFATURA"
};

const ASSIGNABLE_ROLES = [
  ROLES.DIRECTOR,
  ROLES.GERENTE,
  ROLES.AUDITOR,
  ROLES.JEFATURA
];


const DEFAULT_ROLE = ROLES.JEFATURA;

// Roles que pueden administrar usuarios.
// Director puede consultar el directorio, pero no administrar cuentas.
const USER_VIEW_ROLES = [ROLES.SUPER_ADMIN, ROLES.DIRECTOR];
const USER_ADMIN_ROLES = [ROLES.SUPER_ADMIN];

// El Director tiene acceso de solo lectura al portafolio.
// Se mantiene sin cambios el flujo de propuestas para los demás roles.
const PLANNING_CREATE_ROLES = [ROLES.SUPER_ADMIN, ROLES.GERENTE];
const PLANNING_APPROVE_ROLES = [ROLES.SUPER_ADMIN];

module.exports = {
  ROLES,
  ASSIGNABLE_ROLES,
  DEFAULT_ROLE,
  USER_VIEW_ROLES,
  USER_ADMIN_ROLES,
  PLANNING_CREATE_ROLES,
  PLANNING_APPROVE_ROLES
};
