import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Store, Tags, Users, LogOut, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-border flex flex-col shrink-0">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-[8px] flex items-center justify-center text-primary">
            <Store size={24} />
          </div>
          <div>
            <h2 className="font-[800] text-text text-[15px] leading-tight">Sagrada Família</h2>
            <span className="text-muted text-[12px] font-[500]">Painel Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-[8px] text-[14px] font-[600] transition-colors ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:bg-[#F0F2F2] hover:text-text'
              }`
            }
          >
            <Tags size={18} />
            Preços e Estoque
          </NavLink>

          <NavLink
            to="/admin/equipe"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-[8px] text-[14px] font-[600] transition-colors ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:bg-[#F0F2F2] hover:text-text'
              }`
            }
          >
            <Users size={18} />
            Equipe
          </NavLink>

          <NavLink
            to="/admin/produtos"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-[8px] text-[14px] font-[600] transition-colors ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:bg-[#F0F2F2] hover:text-text'
              }`
            }
          >
            <Package size={18} />
            Gerenciar Produtos
          </NavLink>
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-[8px] text-[14px] font-[600] text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
