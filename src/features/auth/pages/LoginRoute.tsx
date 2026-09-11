import { Navigate, useParams } from 'react-router-dom';
import RoleLogin from './RoleLogin';
import { isLoginRole } from '../../../app/layout/AuthProviders';

export default function LoginRoute() {
  const { role } = useParams<{ role: string }>();
  if (!isLoginRole(role)) {
    return <Navigate to="/account-type" replace />;
  }
  return <RoleLogin role={role} />;
}
