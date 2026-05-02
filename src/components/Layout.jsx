import Sidebar from "./Sidebar";

const Layout = ({ children, user, onLogout }) => {
  return (
    <div className="app-layout">
      <Sidebar onLogout={onLogout} />

      <main className="app-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;