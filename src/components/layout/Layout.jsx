import React from 'react';
import Navigation from './Navigation';

const Layout = ({ children, navProps }) => (
  <main id="home">
    <Navigation {...navProps} />
    {children}
  </main>
);

export default Layout;