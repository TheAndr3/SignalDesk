import React from 'react';
import { Shield, LogOut, Building2, User } from 'lucide-react';
import { WorkspaceMemberRole } from '@signaldesk/shared';
import { useAuth } from '../context/AuthContext';
import { useMe } from '../hooks/useMe';

export const Header: React.FC = () => {
  const { signOut } = useAuth();
  const { data: me, isLoading } = useMe();

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <Shield size={20} />
        </div>
        <div className="brand-text">
          <span className="brand-name">SignalDesk</span>
        </div>
        {me?.workspace && (
          <div className="workspace-badge">
            <Building2 size={13} />
            <span>{me.workspace.name}</span>
          </div>
        )}
      </div>

      <div className="header-actions">
        {isLoading ? (
          <div className="user-skeleton" />
        ) : (
          me && (
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">
                  <User size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  {me.displayName}
                </span>
                <span
                  className={`role-badge ${
                    me.role === WorkspaceMemberRole.MANAGER
                      ? 'role-manager'
                      : 'role-agent'
                  }`}
                >
                  {me.role.toUpperCase()}
                </span>
              </div>
            </div>
          )
        )}

        <button
          onClick={() => signOut()}
          className="logout-button"
          title="Sign Out"
          aria-label="Sign out"
        >
          <LogOut size={16} />
          <span className="logout-text">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
