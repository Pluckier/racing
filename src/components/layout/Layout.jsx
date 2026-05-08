import React from 'react';
import Navigation from './Navigation';
import SearchOverlay from './SearchOverlay';

const Layout = ({ children, navProps, searchRaces = [] }) => (
  <main id="home">
    <Navigation {...navProps}>
      <SearchOverlay races={searchRaces} />
    </Navigation>
    {children}
  </main>
);

export default Layout;