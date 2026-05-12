import { useAuth } from '../context/AuthContext';

/**
 * Componente para renderizado condicional basado en permisos.
 * Uso: <Can perform="projects:edit"> <button>Editar</button> </Can>
 */
const Can = ({ perform, children, fallback = null }) => {
  const { hasPermission, loading } = useAuth();

  if (loading) return null;

  return hasPermission(perform) ? children : fallback;
};

export default Can;
