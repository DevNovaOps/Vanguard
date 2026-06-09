import { NavLink, Outlet, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';
import VanguardARCIcon from '../../components/common/VanguardARCIcon';

export default function PublicLayout() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="public-layout">
      <header className="public-navbar">
        <Link to="/" className="public-navbar-logo">
          <div className="sidebar-logo-icon">
            <VanguardARCIcon size={38} />
          </div>
          <div className="sidebar-logo-text">
            <span>Vanguard ARC</span>
            <span>Railway Intelligence</span>
          </div>
        </Link>

        <nav className="public-navbar-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/features">Features</NavLink>
          <NavLink to="/documentation">Documentation</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>

        <div className="public-navbar-actions">
          <div className="theme-switcher">
            <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')} title="Light"><Sun size={14} /></button>
            <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')} title="Dark"><Moon size={14} /></button>
            <button className={theme === 'system' ? 'active' : ''} onClick={() => setTheme('system')} title="System"><Monitor size={14} /></button>
          </div>
          <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="public-footer-content">
          <div className="public-footer-col">
            <h4>Platform</h4>
            <Link to="/features">Features</Link>
            <Link to="/documentation">Documentation</Link>
            <Link to="/about">About</Link>
          </div>
          <div className="public-footer-col">
            <h4>Solutions</h4>
            <a>Telemetry Monitoring</a>
            <a>Risk Analysis</a>
            <a>Compliance Engine</a>
          </div>
          <div className="public-footer-col">
            <h4>Resources</h4>
            <a>API Reference</a>
            <a>Integration Guide</a>
            <a>Release Notes</a>
          </div>
          <div className="public-footer-col">
            <h4>Company</h4>
            <Link to="/contact">Contact</Link>
            <a>Privacy Policy</a>
            <a>Terms of Service</a>
          </div>
        </div>
        <div className="public-footer-bottom">
          <span>© 2026 Vanguard ARC. All rights reserved.</span>
          <span>Enterprise Railway Intelligence Platform</span>
        </div>
      </footer>
    </div>
  );
}
