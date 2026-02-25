/**
 * Layout — wrapper for all authenticated pages.
 * Renders the persistent Sidebar alongside the page content.
 */

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  );
}